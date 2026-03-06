import { fetchChatAPIProcess } from '@/api'
import { t } from '@/locales'
import type { Chat, ConversationRequest, ConversationResponse } from '@chatgpt-web/shared'
import { computed, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'

type FlowPhase = 'idle' | 'submitting' | 'regenerating'

interface UseChatConversationFlowOptions {
  uuid: number
  isMobile: Ref<boolean>
  usingContext: Ref<boolean>
  dataSources: ComputedRef<Chat[]>
  conversationList: ComputedRef<Chat[]>
  addChat: (uuid: number, chat: Chat) => void
  updateChat: (uuid: number, index: number, chat: Chat) => void
  updateChatSome: (uuid: number, index: number, chat: Partial<Chat>) => void
  getChatByUuidAndIndex: (uuid: number, index: number) => Chat | null
  scrollToBottom: () => Promise<void>
  scrollToBottomIfAtBottom: () => Promise<void>
}

interface StreamReplyState {
  prompt: string
  message: string
  options: ConversationRequest
  lastText: string
}

const openLongReply = import.meta.env.VITE_GLOB_OPEN_LONG_REPLY === 'true'

function nowString() {
  return new Date().toLocaleString()
}

function isAbortError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  return (
    error.name === 'AbortError' ||
    error.message === 'canceled' ||
    error.message.toLowerCase().includes('aborted')
  )
}

function parseConversationProgress(responseText?: string): ConversationResponse | null {
  if (responseText === undefined || responseText === '') return null

  const lastIndex = responseText.lastIndexOf('\n', responseText.length - 2)
  const chunk = lastIndex !== -1 ? responseText.substring(lastIndex) : responseText

  try {
    return JSON.parse(chunk) as ConversationResponse
  } catch {
    return null
  }
}

export function useChatConversationFlow(options: UseChatConversationFlowOptions) {
  const {
    uuid,
    isMobile,
    usingContext,
    dataSources,
    conversationList,
    addChat,
    updateChat,
    updateChatSome,
    getChatByUuidAndIndex,
    scrollToBottom,
    scrollToBottomIfAtBottom,
  } = options

  let controller = new AbortController()
  const phase = ref<FlowPhase>('idle')
  const prompt = ref('')
  const loading = computed(() => phase.value !== 'idle')

  // Reset stale loading flags left by refresh/reload.
  dataSources.value.forEach((item, index) => {
    if (item.loading) updateChatSome(uuid, index, { loading: false })
  })

  async function streamAssistantReply(
    index: number,
    state: StreamReplyState,
    onChunk?: () => void,
  ) {
    while (true) {
      let shouldContinue = false

      await fetchChatAPIProcess<ConversationResponse>({
        prompt: state.message,
        options: state.options,
        signal: controller.signal,
        onDownloadProgress: progressEvent => {
          const data = parseConversationProgress(progressEvent.responseText)
          if (!data) return
          const nextText = state.lastText + (data.text ?? '')

          updateChat(uuid, index, {
            dateTime: nowString(),
            text: nextText,
            inversion: false,
            error: false,
            loading: true,
            conversationOptions: {
              conversationId: data.conversationId,
              parentMessageId: data.id,
            },
            requestOptions: { prompt: state.prompt, options: { ...state.options } },
          })

          if (openLongReply && data.detail.choices[0].finish_reason === 'length') {
            state.options.parentMessageId = data.id
            state.lastText = nextText
            state.message = ''
            shouldContinue = true
            return
          }

          onChunk?.()
        },
      })

      if (!shouldContinue) break
    }

    updateChatSome(uuid, index, { loading: false })
  }

  function handleSubmit() {
    void onConversation()
  }

  async function onConversation() {
    let message = prompt.value

    if (loading.value) return
    if (!message.trim()) return

    phase.value = 'submitting'
    controller = new AbortController()
    const requestController = controller

    addChat(uuid, {
      dateTime: nowString(),
      text: message,
      inversion: true,
      error: false,
      conversationOptions: null,
      requestOptions: { prompt: message, options: null },
    })
    void scrollToBottom()

    prompt.value = ''

    const lastContext =
      conversationList.value[conversationList.value.length - 1]?.conversationOptions
    let requestOptions: ConversationRequest =
      lastContext && usingContext.value ? { ...lastContext } : {}

    addChat(uuid, {
      dateTime: nowString(),
      text: t('chat.thinking'),
      loading: true,
      inversion: false,
      error: false,
      conversationOptions: null,
      requestOptions: { prompt: message, options: { ...requestOptions } },
    })
    void scrollToBottom()

    const replyIndex = dataSources.value.length - 1

    try {
      const state: StreamReplyState = {
        prompt: message,
        message,
        options: requestOptions,
        lastText: '',
      }

      await streamAssistantReply(replyIndex, state, scrollToBottomIfAtBottom)
      message = state.message
      requestOptions = state.options
    } catch (error: unknown) {
      const errorMessage = (error as Error)?.message ?? t('common.wrong')

      if (isAbortError(error)) {
        updateChatSome(uuid, replyIndex, { loading: false })
        void scrollToBottomIfAtBottom()
        return
      }

      const currentChat = getChatByUuidAndIndex(uuid, replyIndex)
      if (currentChat?.text) {
        updateChatSome(uuid, replyIndex, {
          text: `${currentChat.text}\n[${errorMessage}]`,
          error: false,
          loading: false,
        })
        return
      }

      updateChat(uuid, replyIndex, {
        dateTime: nowString(),
        text: errorMessage,
        inversion: false,
        error: true,
        loading: false,
        conversationOptions: null,
        requestOptions: { prompt: message, options: { ...requestOptions } },
      })
      void scrollToBottomIfAtBottom()
    } finally {
      if (controller === requestController) phase.value = 'idle'
    }
  }

  async function onRegenerate(index: number) {
    if (loading.value) return

    phase.value = 'regenerating'
    controller = new AbortController()
    const requestController = controller

    const { requestOptions } = dataSources.value[index]
    let message = requestOptions?.prompt ?? ''
    let optionsValue: ConversationRequest = requestOptions.options
      ? { ...requestOptions.options }
      : {}

    updateChat(uuid, index, {
      dateTime: nowString(),
      text: '',
      inversion: false,
      error: false,
      loading: true,
      conversationOptions: null,
      requestOptions: { prompt: message, options: { ...optionsValue } },
    })

    try {
      const state: StreamReplyState = {
        prompt: message,
        message,
        options: optionsValue,
        lastText: '',
      }

      await streamAssistantReply(index, state)
      message = state.message
      optionsValue = state.options
    } catch (error: unknown) {
      if (isAbortError(error)) {
        updateChatSome(uuid, index, { loading: false })
        return
      }

      const errorMessage = (error as Error)?.message ?? t('common.wrong')
      updateChat(uuid, index, {
        dateTime: nowString(),
        text: errorMessage,
        inversion: false,
        error: true,
        loading: false,
        conversationOptions: null,
        requestOptions: { prompt: message, options: { ...optionsValue } },
      })
    } finally {
      if (controller === requestController) phase.value = 'idle'
    }
  }

  function handleEnter(event: KeyboardEvent) {
    if (event.isComposing) return

    if (!isMobile.value) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        handleSubmit()
      }
      return
    }

    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault()
      handleSubmit()
    }
  }

  function handleStop() {
    if (!loading.value) return
    controller.abort()
    phase.value = 'idle'
  }

  function cleanup() {
    if (!loading.value) return
    controller.abort()
  }

  return {
    prompt,
    loading,
    phase,
    handleSubmit,
    onRegenerate,
    handleEnter,
    handleStop,
    cleanup,
  }
}
