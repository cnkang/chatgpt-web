import { Chat as AIChat } from '@ai-sdk/vue'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { t } from '@/locales'
import { useAuthStore, useChatStore, useSettingStore } from '@/store'
import type { Chat as StoredChat } from '@chatgpt-web/shared'
import {
  computed,
  markRaw,
  onUnmounted,
  ref,
  shallowRef,
  watch,
  type ComputedRef,
  type Ref,
} from 'vue'

export interface DisplayChatMessage {
  dateTime: string
  error: boolean
  id: string
  inversion: boolean
  loading: boolean
  messageId?: string
  text: string
}

interface UseAiSdkChatConversationFlowOptions {
  uuid: ComputedRef<number>
  isMobile: Ref<boolean>
  scrollToBottom: () => Promise<void>
  scrollToBottomIfAtBottom: () => Promise<void>
  usingContext: Ref<boolean>
}

function createMessageId(index: number) {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  return `restored-message-${Date.now()}-${index}`
}

function nowString() {
  return new Date().toLocaleString()
}

function buildApiUrl(path: string) {
  const baseUrl = import.meta.env.VITE_GLOB_API_URL || ''
  if (!baseUrl) return path
  return `${baseUrl.replace(/\/+$/, '')}${path}`
}

function isTextPart(
  part: UIMessage['parts'][number],
): part is Extract<UIMessage['parts'][number], { type: 'text' }> {
  return part.type === 'text'
}

function getMessageText(message: UIMessage) {
  return message.parts
    .filter(isTextPart)
    .map(part => part.text)
    .join('')
}

function getMessageDateTime(message: UIMessage, fallback?: StoredChat) {
  const metadata = message.metadata
  if (
    metadata &&
    typeof metadata === 'object' &&
    'dateTime' in metadata &&
    typeof metadata.dateTime === 'string' &&
    metadata.dateTime.trim()
  ) {
    return metadata.dateTime
  }

  return fallback?.dateTime ?? nowString()
}

function findPrompt(messages: UIMessage[], index: number, fallback?: StoredChat) {
  if (fallback?.requestOptions.prompt) return fallback.requestOptions.prompt

  for (let currentIndex = index; currentIndex >= 0; currentIndex -= 1) {
    const message = messages[currentIndex]
    if (message?.role === 'user') return getMessageText(message)
  }

  return ''
}

function toStoredChats(messages: UIMessage[], loading: boolean, existing: StoredChat[]) {
  const existingById = new Map(existing.map(message => [message.id, message] as const))
  const lastAssistantId = [...messages].reverse().find(message => message.role === 'assistant')?.id

  return messages.map((message, index) => {
    const current = existingById.get(message.id)
    const text = getMessageText(message)
    const inversion = message.role === 'user'

    return {
      id: message.id,
      dateTime: getMessageDateTime(message, current),
      text,
      inversion,
      error: false,
      loading: !inversion && loading && message.id === lastAssistantId,
      conversationOptions: null,
      requestOptions: {
        prompt: inversion ? text : findPrompt(messages, index, current),
        options: null,
      },
    } satisfies StoredChat
  })
}

function toUIMessages(messages: StoredChat[]): UIMessage[] {
  return messages.map((message, index) => ({
    id: message.id ?? createMessageId(index),
    role: message.inversion ? 'user' : 'assistant',
    metadata: { dateTime: message.dateTime },
    parts: [{ type: 'text', text: message.text }],
  }))
}

function createTransport(
  authStore: ReturnType<typeof useAuthStore>,
  settingStore: ReturnType<typeof useSettingStore>,
  usingContext: Ref<boolean>,
) {
  return new DefaultChatTransport({
    api: buildApiUrl('/chat-process'),
    headers: () =>
      authStore.token
        ? {
            Authorization: `Bearer ${authStore.token}`,
          }
        : ({} as Record<string, string>),
    body: () => ({
      systemMessage: settingStore.systemMessage,
      temperature: settingStore.temperature,
      top_p: settingStore.top_p,
      usingContext: usingContext.value,
    }),
    fetch: async (input, init) => {
      const response = await fetch(input, init)

      if (response.status === 401 || response.status === 403) {
        authStore.removeToken()
        globalThis.location.reload()
      }

      return response
    },
  })
}

function createConversationChat(
  uuid: number,
  initialMessages: UIMessage[],
  transport: DefaultChatTransport<UIMessage>,
) {
  return markRaw(
    new AIChat<UIMessage>({
      id: String(uuid),
      messages: initialMessages,
      transport,
    }),
  )
}

export function useAiSdkChatConversationFlow(options: UseAiSdkChatConversationFlowOptions) {
  const { uuid, isMobile, scrollToBottom, scrollToBottomIfAtBottom, usingContext } = options

  const authStore = useAuthStore()
  const chatStore = useChatStore()
  const settingStore = useSettingStore()

  const prompt = ref('')
  const transport = createTransport(authStore, settingStore, usingContext)
  const chat = shallowRef(
    createConversationChat(
      uuid.value,
      toUIMessages(chatStore.getChatByUuid(uuid.value)),
      transport,
    ),
  )

  const loading = computed(() => {
    const status = chat.value.status
    return status === 'submitted' || status === 'streaming'
  })

  const displayMessages = computed<DisplayChatMessage[]>(() => {
    const messages = chat.value.messages
    const items: DisplayChatMessage[] = messages.map(message => ({
      id: message.id,
      messageId: message.id,
      dateTime: getMessageDateTime(message),
      text: getMessageText(message),
      inversion: message.role === 'user',
      error: false,
      loading: loading.value && message.role === 'assistant' && message.id === messages.at(-1)?.id,
    }))

    if (loading.value && messages.at(-1)?.role !== 'assistant') {
      items.push({
        id: `thinking-${uuid.value}`,
        dateTime: nowString(),
        text: t('chat.thinking'),
        inversion: false,
        error: false,
        loading: true,
      })
    }

    if (!loading.value && chat.value.status === 'error' && chat.value.error) {
      items.push({
        id: `error-${uuid.value}`,
        dateTime: nowString(),
        text: chat.value.error.message || t('common.wrong'),
        inversion: false,
        error: true,
        loading: false,
      })
    }

    return items
  })

  async function syncStore() {
    const nextMessages = toStoredChats(
      chat.value.messages,
      loading.value,
      chatStore.getChatByUuid(uuid.value),
    )
    chatStore.setChatByUuid(uuid.value, nextMessages)
  }

  async function handleSubmit() {
    const message = prompt.value.trim()
    if (!message || loading.value) return

    prompt.value = ''
    await chat.value.sendMessage({ text: message })
  }

  async function onRegenerate(index: number) {
    if (loading.value) return

    const message = displayMessages.value[index]
    if (!message?.messageId) {
      await chat.value.regenerate()
      return
    }

    await chat.value.regenerate({ messageId: message.messageId })
  }

  async function deleteMessage(index: number) {
    const message = displayMessages.value[index]
    if (!message) return

    if (!message.messageId) {
      chat.value.clearError()
      return
    }

    chat.value.messages = chat.value.messages.filter(item => item.id !== message.messageId)
    chat.value.clearError()
    await syncStore()
  }

  async function clearMessages() {
    chat.value.stop()
    chat.value.clearError()
    chat.value.messages = []
    await syncStore()
  }

  function handleEnter(event: KeyboardEvent) {
    if (event.isComposing) return

    if (!isMobile.value) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        void handleSubmit()
      }
      return
    }

    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault()
      void handleSubmit()
    }
  }

  function handleStop() {
    chat.value.stop()
  }

  function cleanup() {
    chat.value.stop()
  }

  watch(
    () => [chat.value.messages, chat.value.status] as const,
    async () => {
      await syncStore()
      await scrollToBottomIfAtBottom()
    },
    { deep: true, immediate: true },
  )

  watch(uuid, async nextUuid => {
    chat.value.stop()
    chat.value = createConversationChat(
      nextUuid,
      toUIMessages(chatStore.getChatByUuid(nextUuid)),
      transport,
    )
    prompt.value = ''
    await scrollToBottom()
  })

  onUnmounted(() => {
    cleanup()
  })

  return {
    prompt,
    loading,
    messages: displayMessages,
    handleSubmit,
    onRegenerate,
    deleteMessage,
    clearMessages,
    handleEnter,
    handleStop,
    cleanup,
  }
}
