<script setup lang="ts">
import { HoverButton, SvgIcon } from '@/components/common'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { t } from '@/locales'
import { useChatStore } from '@/store'
import type { Chat } from '@chatgpt-web/shared'
import { toPng } from 'html-to-image'
import { NButton, NInput, useDialog, useMessage } from 'naive-ui'
import type { InputInst } from 'naive-ui'
import { computed, onMounted, onUnmounted, useTemplateRef } from 'vue'
import { useRoute } from 'vue-router'
import { Message } from './components'
import HeaderComponent from './components/Header/index.vue'
import { useChat } from './hooks/useChat'
import { useChatConversationFlow } from './hooks/useChatConversationFlow'
import { useScroll } from './hooks/useScroll'
import { useUsingContext } from './hooks/useUsingContext'

const route = useRoute()
const dialog = useDialog()
const ms = useMessage()

const chatStore = useChatStore()

const { isMobile } = useBasicLayout()
const { addChat, updateChat, updateChatSome, getChatByUuidAndIndex } = useChat()
const { scrollRef, scrollToBottom, scrollToBottomIfAtBottom } = useScroll()
const { usingContext, toggleUsingContext } = useUsingContext()
void scrollRef

const { uuid } = route.params as { uuid: string }

const dataSources = computed(() => chatStore.getChatByUuid(+uuid))
const conversationList = computed(() =>
  dataSources.value.filter((item: Chat) => !item.inversion && !!item.conversationOptions),
)

const inputRef = useTemplateRef<InputInst>('inputRef')
const { prompt, loading, handleSubmit, onRegenerate, handleEnter, handleStop, cleanup } =
  useChatConversationFlow({
    uuid: +uuid,
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
  })

function handleExport() {
  if (loading.value) return

  const d = dialog.warning({
    title: t('chat.exportImage'),
    content: t('chat.exportImageConfirm'),
    positiveText: t('common.yes'),
    negativeText: t('common.no'),
    onPositiveClick: async () => {
      try {
        d.loading = true
        const ele = document.getElementById('image-wrapper')
        const imgUrl = await toPng(ele as HTMLDivElement)
        const tempLink = document.createElement('a')
        tempLink.style.display = 'none'
        tempLink.href = imgUrl
        tempLink.setAttribute('download', 'chat-shot.png')
        if (typeof tempLink.download === 'undefined') tempLink.setAttribute('target', '_blank')
        document.body.appendChild(tempLink)
        tempLink.click()
        document.body.removeChild(tempLink)
        window.URL.revokeObjectURL(imgUrl)
        d.loading = false
        ms.success(t('chat.exportSuccess'))
      } catch {
        ms.error(t('chat.exportFailed'))
      } finally {
        d.loading = false
      }
    },
  })
}

function handleDelete(index: number) {
  if (loading.value) return

  dialog.warning({
    title: t('chat.deleteMessage'),
    content: t('chat.deleteMessageConfirm'),
    positiveText: t('common.yes'),
    negativeText: t('common.no'),
    onPositiveClick: () => {
      chatStore.deleteChatByUuid(+uuid, index)
    },
  })
}

function handleClear() {
  if (loading.value) return

  dialog.warning({
    title: t('chat.clearChat'),
    content: t('chat.clearChatConfirm'),
    positiveText: t('common.yes'),
    negativeText: t('common.no'),
    onPositiveClick: () => {
      chatStore.clearChatByUuid(+uuid)
    },
  })
}

function getMessageKey(item: Chat, index: number) {
  return item.id ?? `${item.dateTime}:${item.requestOptions?.prompt ?? ''}:${index}`
}

// 可优化部分
// 搜索选项计算，这里使用value作为索引项，所以当出现重复value时渲染异常(多项同时出现选中效果)

const placeholder = computed(() =>
  isMobile.value ? t('chat.placeholderMobile') : t('chat.placeholder'),
)

const buttonDisabled = computed(() => loading.value || prompt.value.trim() === '')

const footerClass = computed(() =>
  isMobile.value
    ? ['sticky', 'left-0', 'bottom-0', 'right-0', 'p-2', 'pr-3', 'overflow-hidden']
    : ['p-4'],
)

onMounted(() => {
  scrollToBottom()
  if (!isMobile.value) inputRef.value?.focus()
})

onUnmounted(() => {
  cleanup()
})
</script>

<template>
  <div class="flex flex-col w-full h-full">
    <HeaderComponent
      v-if="isMobile"
      :using-context="usingContext"
      @export="handleExport"
      @handle-clear="handleClear"
    />
    <main class="flex-1 overflow-hidden">
      <div id="scrollRef" ref="scrollRef" class="h-full overflow-hidden overflow-y-auto">
        <div
          class="w-full max-w-screen-xl m-auto dark:bg-[#101014]"
          :class="[isMobile ? 'p-2' : 'p-4']"
        >
          <div id="image-wrapper" class="relative">
            <template v-if="!dataSources.length">
              <div class="flex items-center justify-center mt-4 text-center text-neutral-300">
                <SvgIcon icon="ri:bubble-chart-fill" class="mr-2 text-3xl" />
                <span>{{ t('chat.newChatTitle') }}</span>
              </div>
            </template>
            <template v-else>
              <div>
                <Message
                  v-for="(item, index) of dataSources"
                  :key="getMessageKey(item, index)"
                  :date-time="item.dateTime"
                  :text="item.text"
                  :inversion="item.inversion"
                  :error="item.error"
                  :loading="item.loading"
                  @regenerate="onRegenerate(index)"
                  @delete="handleDelete(index)"
                />
                <div class="sticky bottom-0 left-0 flex justify-center">
                  <NButton v-if="loading" type="warning" @click="handleStop">
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
    <footer :class="footerClass">
      <div class="w-full max-w-screen-xl m-auto">
        <div class="flex items-center justify-between space-x-2">
          <HoverButton v-if="!isMobile" :tooltip="t('chat.clearChatTooltip')" @click="handleClear">
            <span class="text-xl text-[#4f555e] dark:text-white">
              <SvgIcon icon="ri:delete-bin-line" />
            </span>
          </HoverButton>
          <HoverButton
            v-if="!isMobile"
            :tooltip="t('chat.exportImageTooltip')"
            @click="handleExport"
          >
            <span class="text-xl text-[#4f555e] dark:text-white">
              <SvgIcon icon="ri:download-2-line" />
            </span>
          </HoverButton>
          <HoverButton :tooltip="t('chat.contextModeTooltip')" @click="toggleUsingContext">
            <span
              class="text-xl"
              :class="{
                'text-[#4b9e5f]': usingContext,
                'text-[#a8071a]': !usingContext,
              }"
            >
              <SvgIcon icon="ri:chat-history-line" />
            </span>
          </HoverButton>
          <NInput
            ref="inputRef"
            v-model:value="prompt"
            type="textarea"
            :placeholder="placeholder"
            :autosize="{ minRows: 1, maxRows: isMobile ? 4 : 8 }"
            @keydown="handleEnter"
          />
          <NButton type="primary" :disabled="buttonDisabled" @click="handleSubmit">
            <template #icon>
              <span class="dark:text-black">
                <SvgIcon icon="ri:send-plane-fill" />
              </span>
            </template>
            <span v-if="!isMobile" class="ml-1">{{ t('chat.send') }}</span>
          </NButton>
        </div>
      </div>
    </footer>
  </div>
</template>
