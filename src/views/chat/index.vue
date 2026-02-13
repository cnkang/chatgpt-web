<script setup lang='ts'>
import { toPng } from 'html-to-image'
import { NAutoComplete, NButton, NInput, useDialog, useMessage, type InputInst } from 'naive-ui'
import { storeToRefs } from 'pinia'
import { computed, onMounted, onUnmounted, ref, useTemplateRef } from 'vue'
import { useRoute } from 'vue-router'
import { fetchChatAPIProcess } from '@/api'
import { HoverButton, SvgIcon } from '@/components/common'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { t } from '@/locales'
import type { PromptItem } from '@/store/modules/prompt/helper'
import { useChatStore, usePromptStore } from '@/store'
import { Message } from './components'
import HeaderComponent from './components/Header/index.vue'
import { useChat } from './hooks/useChat'
import { useScroll } from './hooks/useScroll'
import { useUsingContext } from './hooks/useUsingContext'

let controller = new AbortController()

const openLongReply = import.meta.env.VITE_GLOB_OPEN_LONG_REPLY === 'true'

const route = useRoute()
const dialog = useDialog()
const ms = useMessage()

const chatStore = useChatStore()

const { isMobile } = useBasicLayout()
const { addChat, updateChat, updateChatSome, getChatByUuidAndIndex } = useChat()
const { scrollRef, scrollToBottom, scrollToBottomIfAtBottom } = useScroll()
const { usingContext, toggleUsingContext } = useUsingContext()

const { uuid } = route.params as { uuid: string }
const currentUuid = Number(uuid)

const dataSources = computed(() => chatStore.getChatByUuid(currentUuid))
const conversationList = computed(() => dataSources.value.filter(item => (!item.inversion && !!item.conversationOptions)))

const prompt = ref<string>('')
const loading = ref<boolean>(false)
const inputRef = useTemplateRef<InputInst>('inputRef')

interface StreamConversationPayload {
  id?: string
  text?: string
  conversationId?: string
  detail?: {
    choices?: Array<{
      finish_reason?: string
    }>
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseLatestStreamPayload(responseText: string): StreamConversationPayload | null {
  const lines = responseText
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try {
      const parsed = JSON.parse(lines[index]) as unknown
      if (isRecord(parsed))
        return parsed as StreamConversationPayload
    }
    catch {
      // ignore invalid partial chunks and keep scanning backwards
    }
  }

  return null
}

function now() {
  return new Date().toLocaleString()
}

function isCanceledError(error: unknown): boolean {
  return error instanceof Error && error.message === 'canceled'
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : t('common.wrong')
}

async function streamReply(index: number, initialMessage: string, options: Chat.ConversationRequest, autoScroll: boolean) {
  let message = initialMessage
  let lastText = ''

  while (true) {
    let continuationParentMessageId: string | undefined
    let continuationText: string | undefined

    await fetchChatAPIProcess<Chat.ConversationResponse>({
      prompt: message,
      options,
      signal: controller.signal,
      onDownloadProgress: ({ event }) => {
        const data = parseLatestStreamPayload(event.target.responseText)
        if (!data)
          return

        updateChat(
          currentUuid,
          index,
          {
            dateTime: now(),
            text: lastText + (data.text ?? ''),
            inversion: false,
            error: false,
            loading: true,
            conversationOptions: { conversationId: data.conversationId, parentMessageId: data.id },
            requestOptions: { prompt: message, options: { ...options } },
          },
        )

        const finishReason = data.detail?.choices?.[0]?.finish_reason
        if (openLongReply && finishReason === 'length' && data.id) {
          continuationParentMessageId = data.id
          continuationText = data.text
        }

        if (autoScroll)
          scrollToBottomIfAtBottom()
      },
    })

    if (!openLongReply || !continuationParentMessageId)
      break

    options.parentMessageId = continuationParentMessageId
    lastText = continuationText ?? lastText
    message = ''
  }

  updateChatSome(currentUuid, index, { loading: false })
}

// 添加PromptStore
const promptStore = usePromptStore()

// 使用storeToRefs，保证store修改后，联想部分能够重新渲染
const { promptList: promptTemplate } = storeToRefs(promptStore)

// 未知原因刷新页面，loading 状态不会重置，手动重置
dataSources.value.forEach((item, index) => {
  if (item.loading)
    updateChatSome(currentUuid, index, { loading: false })
})

function handleSubmit() {
  onConversation()
}

async function onConversation() {
  let message = prompt.value

  if (loading.value)
    return

  if (!message || message.trim() === '')
    return

  controller = new AbortController()

  addChat(
    currentUuid,
    {
      dateTime: now(),
      text: message,
      inversion: true,
      error: false,
      conversationOptions: null,
      requestOptions: { prompt: message, options: null },
    },
  )
  scrollToBottom()

  loading.value = true
  prompt.value = ''

  let options: Chat.ConversationRequest = {}
  const lastContext = conversationList.value.at(-1)?.conversationOptions

  if (lastContext && usingContext.value)
    options = { ...lastContext }

  addChat(
    currentUuid,
    {
      dateTime: now(),
      text: t('chat.thinking'),
      loading: true,
      inversion: false,
      error: false,
      conversationOptions: null,
      requestOptions: { prompt: message, options: { ...options } },
    },
  )
  scrollToBottom()

  try {
    await streamReply(dataSources.value.length - 1, message, options, true)
  }
  catch (error: unknown) {
    const errorMessage = getErrorMessage(error)

    if (isCanceledError(error)) {
      updateChatSome(
        currentUuid,
        dataSources.value.length - 1,
        {
          loading: false,
        },
      )
      scrollToBottomIfAtBottom()
      return
    }

    const currentChat = getChatByUuidAndIndex(currentUuid, dataSources.value.length - 1)

    if (currentChat?.text && currentChat.text !== '') {
      updateChatSome(
        currentUuid,
        dataSources.value.length - 1,
        {
          text: `${currentChat.text}\n[${errorMessage}]`,
          error: false,
          loading: false,
        },
      )
      return
    }

    updateChat(
      currentUuid,
      dataSources.value.length - 1,
      {
        dateTime: now(),
        text: errorMessage,
        inversion: false,
        error: true,
        loading: false,
        conversationOptions: null,
        requestOptions: { prompt: message, options: { ...options } },
      },
    )
    scrollToBottomIfAtBottom()
  }
  finally {
    loading.value = false
  }
}

async function onRegenerate(index: number) {
  if (loading.value)
    return

  controller = new AbortController()

  const { requestOptions } = dataSources.value[index]

  let message = requestOptions?.prompt ?? ''

  let options: Chat.ConversationRequest = {}

  if (requestOptions.options)
    options = { ...requestOptions.options }

  loading.value = true

  updateChat(
    currentUuid,
    index,
    {
      dateTime: now(),
      text: '',
      inversion: false,
      error: false,
      loading: true,
      conversationOptions: null,
      requestOptions: { prompt: message, options: { ...options } },
    },
  )

  try {
    await streamReply(index, message, options, false)
  }
  catch (error: unknown) {
    if (isCanceledError(error)) {
      updateChatSome(
        currentUuid,
        index,
        {
          loading: false,
        },
      )
      return
    }

    const errorMessage = getErrorMessage(error)

    updateChat(
      currentUuid,
      index,
      {
        dateTime: now(),
        text: errorMessage,
        inversion: false,
        error: true,
        loading: false,
        conversationOptions: null,
        requestOptions: { prompt: message, options: { ...options } },
      },
    )
  }
  finally {
    loading.value = false
  }
}

function handleExport() {
  if (loading.value)
    return

  const d = dialog.warning({
    title: t('chat.exportImage'),
    content: t('chat.exportImageConfirm'),
    positiveText: t('common.yes'),
    negativeText: t('common.no'),
    onPositiveClick: async () => {
      try {
        d.loading = true
        const ele = document.getElementById('image-wrapper')
        if (!(ele instanceof HTMLDivElement)) {
          ms.error(t('chat.exportFailed'))
          return
        }
        const imgUrl = await toPng(ele)
        const tempLink = document.createElement('a')
        tempLink.style.display = 'none'
        tempLink.href = imgUrl
        tempLink.setAttribute('download', 'chat-shot.png')
        if (typeof tempLink.download === 'undefined')
          tempLink.setAttribute('target', '_blank')
        document.body.appendChild(tempLink)
        tempLink.click()
        document.body.removeChild(tempLink)
        window.URL.revokeObjectURL(imgUrl)
        d.loading = false
        ms.success(t('chat.exportSuccess'))
      }
      catch {
        ms.error(t('chat.exportFailed'))
      }
      finally {
        d.loading = false
      }
    },
  })
}

function handleDelete(index: number) {
  if (loading.value)
    return

  dialog.warning({
    title: t('chat.deleteMessage'),
    content: t('chat.deleteMessageConfirm'),
    positiveText: t('common.yes'),
    negativeText: t('common.no'),
    onPositiveClick: () => {
      chatStore.deleteChatByUuid(currentUuid, index)
    },
  })
}

function handleClear() {
  if (loading.value)
    return

  dialog.warning({
    title: t('chat.clearChat'),
    content: t('chat.clearChatConfirm'),
    positiveText: t('common.yes'),
    negativeText: t('common.no'),
    onPositiveClick: () => {
      chatStore.clearChatByUuid(currentUuid)
    },
  })
}

function handleEnter(event: KeyboardEvent) {
  if (!isMobile.value) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSubmit()
    }
  }
  else {
    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault()
      handleSubmit()
    }
  }
}

function handleStop() {
  if (loading.value) {
    controller.abort()
    loading.value = false
  }
}

// 可优化部分
// 搜索选项计算，这里使用value作为索引项，所以当出现重复value时渲染异常(多项同时出现选中效果)
// 理想状态下其实应该是key作为索引项,但官方的renderOption会出现问题，所以就需要value反renderLabel实现
const searchOptions = computed(() => {
  if (!prompt.value.startsWith('/'))
    return []

  const keyword = prompt.value.slice(1).toLowerCase()

  return promptTemplate.value
    .filter(item => item.key.toLowerCase().includes(keyword))
    .map(item => ({
      label: item.value,
      value: item.value,
    }))
})

// value反渲染key
function renderOption(option: { label: string }) {
  const item = promptTemplate.value.find((promptItem: PromptItem) => promptItem.value === option.label)
  return item ? [item.key] : []
}

const placeholder = computed(() => {
  if (isMobile.value)
    return t('chat.placeholderMobile')
  return t('chat.placeholder')
})

const buttonDisabled = computed(() => {
  return loading.value || !prompt.value || prompt.value.trim() === ''
})

onMounted(() => {
  if (!scrollRef.value)
    return

  scrollToBottom()
  if (!isMobile.value)
    inputRef.value?.focus()
})

onUnmounted(() => {
  if (loading.value)
    controller.abort()
})
</script>

<template>
  <div class="chat-page">
    <HeaderComponent
      v-if="isMobile"
      :using-context="usingContext"
      @export="handleExport"
      @handle-clear="handleClear"
    />
    <main class="chat-page__main">
      <div id="scrollRef" ref="scrollRef" class="chat-page__scroll">
        <div class="chat-page__scroll-inner">
          <div id="image-wrapper" class="chat-stream">
            <template v-if="!dataSources.length">
              <div class="chat-empty">
                <SvgIcon icon="ri:bubble-chart-fill" class="chat-empty__icon" />
                <span>{{ t('chat.newChatTitle') }}</span>
              </div>
            </template>
            <template v-else>
              <div class="chat-stream__content">
                <Message
                  v-for="(item, index) of dataSources"
                  :key="index"
                  :date-time="item.dateTime"
                  :text="item.text"
                  :inversion="item.inversion"
                  :error="item.error"
                  :loading="item.loading"
                  @regenerate="onRegenerate(index)"
                  @delete="handleDelete(index)"
                />
                <div class="chat-stream__stop-row">
                  <NButton v-if="loading" type="warning" class="chat-stream__stop-btn" @click="handleStop">
                    <template #icon>
                      <SvgIcon icon="ri:stop-circle-line" />
                    </template>
                    {{ t('common.stopResponding') }}
                  </NButton>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </main>
    <footer class="chat-composer-wrap" :class="{ 'chat-composer-wrap--mobile': isMobile }">
      <div class="chat-composer-shell">
        <div class="chat-composer">
          <div class="chat-composer__tools">
            <HoverButton v-if="!isMobile" @click="handleClear">
              <span class="chat-tool-icon">
                <SvgIcon icon="ri:delete-bin-line" />
              </span>
            </HoverButton>
            <HoverButton v-if="!isMobile" @click="handleExport">
              <span class="chat-tool-icon">
                <SvgIcon icon="ri:download-2-line" />
              </span>
            </HoverButton>
            <HoverButton @click="toggleUsingContext">
              <span
                class="chat-tool-icon"
                :class="{ 'chat-tool-icon--active': usingContext, 'chat-tool-icon--inactive': !usingContext }"
              >
                <SvgIcon icon="ri:chat-history-line" />
              </span>
            </HoverButton>
          </div>
          <div class="chat-composer__input">
            <NAutoComplete v-model:value="prompt" :options="searchOptions" :render-label="renderOption">
              <template #default="{ handleInput, handleBlur, handleFocus }">
                <NInput
                  ref="inputRef"
                  v-model:value="prompt"
                  type="textarea"
                  :placeholder="placeholder"
                  :autosize="{ minRows: 1, maxRows: isMobile ? 4 : 8 }"
                  @input="handleInput"
                  @focus="handleFocus"
                  @blur="handleBlur"
                  @keydown="handleEnter"
                />
              </template>
            </NAutoComplete>
          </div>
          <NButton type="primary" class="chat-composer__send" :disabled="buttonDisabled" @click="handleSubmit">
            <template #icon>
              <span class="chat-composer__send-icon">
                <SvgIcon icon="ri:send-plane-fill" />
              </span>
            </template>
          </NButton>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped lang="less">
.chat-page {
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
}

.chat-page__main {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.chat-page__scroll {
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  padding: clamp(0.75rem, 1.5vw, 1.25rem);
}

.chat-page__scroll-inner {
  width: min(100%, 1120px);
  margin: 0 auto;
}

.chat-stream {
  position: relative;
  border: 1px solid var(--chat-border-color);
  border-radius: 1.1rem;
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--chat-panel-bg-strong) 76%, transparent) 0%, var(--chat-panel-bg) 100%);
  box-shadow: var(--chat-shadow-soft);
  padding: clamp(0.9rem, 1.5vw, 1.35rem);
}

.chat-stream__content {
  display: flex;
  flex-direction: column;
}

.chat-empty {
  min-height: 11rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  text-align: center;
  color: var(--chat-text-muted);
}

.chat-empty__icon {
  font-size: 1.6rem;
}

.chat-stream__stop-row {
  position: sticky;
  left: 0;
  bottom: 0.45rem;
  display: flex;
  justify-content: center;
  padding-top: 0.4rem;
}

.chat-stream__stop-btn {
  border-radius: 999px;
  box-shadow: var(--chat-shadow-soft);
}

.chat-composer-wrap {
  position: sticky;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  padding: 0 1rem calc(0.8rem + env(safe-area-inset-bottom));
  background: linear-gradient(to top, color-mix(in oklab, var(--chat-app-bg) 80%, transparent), transparent);
}

.chat-composer-wrap--mobile {
  padding: 0 0.65rem calc(0.55rem + env(safe-area-inset-bottom));
}

.chat-composer-shell {
  width: min(100%, 1120px);
  margin: 0 auto;
}

.chat-composer {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: flex-end;
  gap: 0.6rem;
  border: 1px solid var(--chat-border-color);
  border-radius: 1rem;
  background: color-mix(in oklab, var(--chat-panel-bg-strong) 82%, transparent);
  box-shadow: var(--chat-shadow-soft);
  padding: 0.55rem;
  backdrop-filter: blur(10px);
}

.chat-composer__tools {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.chat-tool-icon {
  font-size: 1.05rem;
  color: var(--chat-text-secondary);
}

.chat-tool-icon--active {
  color: var(--chat-accent);
}

.chat-tool-icon--inactive {
  color: #cb5f6f;
}

.chat-composer__input {
  min-width: 0;
}

.chat-composer__input :deep(.n-auto-complete) {
  width: 100%;
}

.chat-composer__input :deep(.n-input) {
  border-radius: 0.8rem;
}

.chat-composer__input :deep(.n-input__textarea-el) {
  max-height: 40vh;
}

.chat-composer__send {
  width: 2.8rem;
  height: 2.8rem;
  border-radius: 0.8rem;
}

.chat-composer__send-icon {
  font-size: 1rem;
}

@media (min-width: 640px) and (max-width: 1023.98px) {
  .chat-page__scroll {
    padding: 0.8rem;
  }

  .chat-stream {
    border-radius: 1rem;
  }
}

@media (max-width: 639.98px) {
  .chat-page__scroll {
    padding: 0.55rem;
  }

  .chat-stream {
    padding: 0.75rem;
    border-radius: 0.95rem;
  }

  .chat-empty {
    min-height: 8rem;
  }

  .chat-composer {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      'tools tools'
      'input send';
    gap: 0.5rem;
    padding: 0.5rem;
  }

  .chat-composer__tools {
    grid-area: tools;
  }

  .chat-composer__input {
    grid-area: input;
  }

  .chat-composer__send {
    grid-area: send;
    width: 2.65rem;
    height: 2.65rem;
  }
}

@supports not (color: color-mix(in oklab, white 50%, black)) {
  .chat-stream {
    background: var(--chat-panel-bg);
  }

  .chat-composer {
    background: var(--chat-panel-bg-strong);
  }
}
</style>
