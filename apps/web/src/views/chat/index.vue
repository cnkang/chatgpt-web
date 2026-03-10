<script setup lang="ts">
import { HoverButton, SvgIcon } from '@/components/common'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { t } from '@/locales'
import type { InputInst } from 'naive-ui'
import { NButton, NInput, useDialog, useMessage } from 'naive-ui'
import { computed, onMounted, onUnmounted, useTemplateRef } from 'vue'
import { useRoute } from 'vue-router'
import { Message } from './components'
import HeaderComponent from './components/Header/index.vue'
import { useAiSdkChatConversationFlow } from './hooks/useAiSdkChatConversationFlow'
import { useScroll } from './hooks/useScroll'
import { useUsingContext } from './hooks/useUsingContext'
import { parseChatRouteUuid } from './layout/routeSync'

const route = useRoute()
const dialog = useDialog()
const ms = useMessage()

const { isMobile } = useBasicLayout()
const { scrollToBottom, scrollToBottomIfAtBottom } = useScroll()
const { usingContext, toggleUsingContext } = useUsingContext()

const routeUuid = computed(() => parseChatRouteUuid(route.params.uuid) ?? 0)

const inputRef = useTemplateRef<InputInst>('inputRef')
const {
  prompt,
  loading,
  messages,
  handleSubmit,
  onRegenerate,
  deleteMessage,
  clearMessages,
  handleEnter,
  handleStop,
  cleanup,
} = useAiSdkChatConversationFlow({
  uuid: routeUuid,
  isMobile,
  usingContext,
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
        if (!ele) throw new Error('image-wrapper not found')
        const { toPng } = await import('html-to-image')
        const imgUrl = await toPng(ele as HTMLDivElement)
        const tempLink = document.createElement('a')
        tempLink.style.display = 'none'
        tempLink.href = imgUrl
        tempLink.setAttribute('download', 'chat-shot.png')
        if (tempLink.download === undefined) tempLink.setAttribute('target', '_blank')
        document.body.appendChild(tempLink)
        tempLink.click()
        tempLink.remove()
        globalThis.URL.revokeObjectURL(imgUrl)
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
      void deleteMessage(index)
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
      void clearMessages()
    },
  })
}

// 可优化部分
// 搜索选项计算，这里使用value作为索引项，所以当出现重复value时渲染异常(多项同时出现选中效果)

const placeholder = computed(() =>
  isMobile.value ? t('chat.placeholderMobile') : t('chat.placeholder'),
)

const buttonDisabled = computed(() => loading.value || prompt.value.trim() === '')
const contextLabel = computed(() =>
  usingContext.value ? t('chat.contextOn') : t('chat.contextOff'),
)

const footerClass = computed(() =>
  isMobile.value
    ? ['sticky', 'left-0', 'bottom-0', 'right-0', 'px-5', 'pb-5', 'pt-2', 'overflow-hidden']
    : ['px-5', 'pb-5', 'pt-3'],
)

onMounted(() => {
  scrollToBottom()
  if (!isMobile.value) inputRef.value?.focus()
})

function applyStarterPrompt(text: string) {
  prompt.value = text
  inputRef.value?.focus()
}

onUnmounted(() => {
  cleanup()
})
</script>

<template>
  <div class="chat-page flex flex-col w-full h-full">
    <HeaderComponent
      v-if="isMobile"
      :using-context="usingContext"
      @export="handleExport"
      @handle-clear="handleClear"
    />
    <main class="chat-main flex-1 overflow-hidden">
      <div id="scrollRef" ref="scrollRef" class="h-full overflow-hidden overflow-y-auto">
        <div class="w-full max-w-screen-xl m-auto" :class="[isMobile ? 'p-3' : 'px-5 pt-5 pb-4']">
          <div
            id="image-wrapper"
            class="chat-surface relative"
            :class="{ 'chat-surface-empty': !messages.length }"
          >
            <template v-if="!messages.length">
              <div class="chat-empty-state">
                <div class="chat-empty-hero">
                  <div class="chat-empty-icon">
                    <SvgIcon icon="ri:bubble-chart-fill" class="text-3xl" />
                  </div>
                  <span class="chat-empty-kicker">{{ t('chat.newChatTitle') }}</span>
                  <span class="chat-empty-title">{{ t('chat.emptyStateTitle') }}</span>
                  <span class="chat-empty-subtitle">
                    {{ t('chat.emptyStateDescription') }}
                  </span>
                </div>
                <div class="chat-empty-actions">
                  <button
                    v-for="starter in [
                      t('chat.starterSummarize'),
                      t('chat.starterPlan'),
                      t('chat.starterBrainstorm'),
                    ]"
                    :key="starter"
                    type="button"
                    class="chat-empty-action"
                    @click="applyStarterPrompt(starter)"
                  >
                    {{ starter }}
                  </button>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="chat-thread">
                <Message
                  v-for="(item, index) of messages"
                  :key="item.id"
                  :date-time="item.dateTime"
                  :text="item.text"
                  :inversion="item.inversion"
                  :error="item.error"
                  :loading="item.loading"
                  :grouped-with-previous="messages[index - 1]?.inversion === item.inversion"
                  :grouped-with-next="messages[index + 1]?.inversion === item.inversion"
                  :replying-to-previous="Boolean(!item.inversion && messages[index - 1]?.inversion)"
                  :followed-by-reply="
                    Boolean(item.inversion && messages[index + 1] && !messages[index + 1].inversion)
                  "
                  :before-next-turn="Boolean(!item.inversion && messages[index + 1]?.inversion)"
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
    <footer :class="['chat-footer', footerClass]">
      <div class="w-full max-w-screen-xl m-auto">
        <div class="composer-shell" :class="{ 'composer-shell-mobile': isMobile }">
          <template v-if="isMobile">
            <div class="composer-primary composer-primary-mobile">
              <div class="composer-input-wrap">
                <NInput
                  ref="inputRef"
                  v-model:value="prompt"
                  class="composer-input composer-input-mobile"
                  type="textarea"
                  :placeholder="placeholder"
                  :autosize="{ minRows: 1, maxRows: 5 }"
                  @keydown="handleEnter"
                />
                <NButton
                  class="composer-send composer-send-mobile composer-send-mobile-embedded"
                  type="primary"
                  :disabled="buttonDisabled"
                  :aria-label="t('chat.send')"
                  @click="handleSubmit"
                >
                  <template #icon>
                    <span class="composer-send-icon">
                      <SvgIcon icon="ri:send-plane-fill" />
                    </span>
                  </template>
                </NButton>
              </div>
            </div>
            <div class="composer-mobile-meta">
              <button
                type="button"
                class="composer-context-pill"
                :class="{ 'composer-context-pill-active': usingContext }"
                @click="toggleUsingContext"
              >
                <span class="composer-context-pill__dot" />
                {{ contextLabel }}
              </button>
            </div>
          </template>
          <template v-else>
            <div class="composer-input-wrap">
              <NInput
                ref="inputRef"
                v-model:value="prompt"
                class="composer-input"
                type="textarea"
                :placeholder="placeholder"
                :autosize="{ minRows: 1, maxRows: 8 }"
                @keydown="handleEnter"
              />
            </div>
            <div class="composer-footer">
              <div class="composer-tools">
                <HoverButton :tooltip="t('chat.clearChatTooltip')" @click="handleClear">
                  <span class="composer-tool-icon">
                    <SvgIcon icon="ri:delete-bin-line" />
                  </span>
                </HoverButton>
                <HoverButton :tooltip="t('chat.exportImageTooltip')" @click="handleExport">
                  <span class="composer-tool-icon">
                    <SvgIcon icon="ri:download-2-line" />
                  </span>
                </HoverButton>
                <HoverButton :tooltip="t('chat.contextModeTooltip')" @click="toggleUsingContext">
                  <span
                    class="composer-tool-icon"
                    :class="{
                      'composer-tool-icon-active': usingContext,
                      'composer-tool-icon-muted': !usingContext,
                    }"
                  >
                    <SvgIcon icon="ri:chat-history-line" />
                  </span>
                </HoverButton>
              </div>
              <NButton
                class="composer-send"
                type="primary"
                :disabled="buttonDisabled"
                @click="handleSubmit"
              >
                <template #icon>
                  <span class="composer-send-icon">
                    <SvgIcon icon="ri:send-plane-fill" />
                  </span>
                </template>
                <span class="ml-1">{{ t('chat.send') }}</span>
              </NButton>
            </div>
          </template>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.chat-page {
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(167, 243, 208, 0.18), transparent 28%),
    radial-gradient(circle at top right, rgba(191, 219, 254, 0.16), transparent 24%),
    linear-gradient(180deg, #f6f8fb 0%, #f3f6f4 100%);
}

.chat-main {
  flex: 1 1 0%;
  min-height: 0;
  overscroll-behavior: contain;
}

.chat-footer {
  flex: 0 0 auto;
  margin-top: auto;
}

.chat-surface {
  min-height: 100%;
  padding: clamp(1.1rem, 2.4vw, 1.75rem);
  border: 1px solid rgba(226, 232, 240, 0.84);
  border-radius: 1.75rem;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(248, 250, 252, 0.9));
  box-shadow:
    0 24px 70px rgba(15, 23, 42, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(16px);
}

.chat-surface-empty {
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-thread {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  width: min(100%, 58rem);
  margin-inline: auto;
  padding: 0.82rem clamp(0.7rem, 1.6vw, 1.3rem) 1.55rem;
}

.chat-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  width: min(100%, 44rem);
  margin-inline: auto;
  padding: clamp(1.4rem, 4vw, 2.2rem);
  border: 1px dashed rgba(148, 163, 184, 0.35);
  border-radius: 1.6rem;
  color: rgb(100 116 139);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.8), rgba(248, 250, 252, 0.92)),
    radial-gradient(circle at top right, rgba(167, 243, 208, 0.18), transparent 35%);
  text-align: center;
}

.chat-empty-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8rem;
}

.chat-empty-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3.35rem;
  height: 3.35rem;
  border-radius: 1.05rem;
  background: linear-gradient(135deg, rgba(32, 90, 60, 0.12), rgba(59, 130, 246, 0.12));
  color: rgb(32 90 60);
}

.chat-empty-kicker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem 0.75rem;
  border-radius: 9999px;
  background: rgba(240, 253, 244, 0.92);
  color: rgb(21 128 61);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.chat-empty-title {
  margin: 0;
  font-size: clamp(1.35rem, 2.2vw, 1.9rem);
  line-height: 1.15;
  font-weight: 600;
  color: rgb(30 41 59);
}

.chat-empty-subtitle {
  max-width: 32rem;
  font-size: 0.96rem;
  line-height: 1.6;
}

.chat-empty-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
}

.chat-empty-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.8rem;
  padding: 0.8rem 1rem;
  border: 1px solid rgba(187, 247, 208, 0.9);
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.88);
  color: rgb(51 65 85);
  font-size: 0.92rem;
  line-height: 1.4;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.chat-empty-action:hover {
  transform: translateY(-1px);
  border-color: rgba(34, 197, 94, 0.65);
  background: rgba(240, 253, 244, 0.98);
  color: rgb(21 128 61);
  box-shadow: 0 12px 24px rgba(34, 197, 94, 0.08);
}

.composer-shell {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  width: min(100%, 56rem);
  margin-inline: auto;
  padding: 0.92rem 0.96rem 0.84rem;
  border: 1px solid rgba(226, 232, 240, 0.88);
  border-radius: 1.6rem;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(248, 250, 252, 0.96));
  box-shadow:
    0 18px 48px rgba(15, 23, 42, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(18px);
}

.composer-shell-mobile {
  gap: 0.62rem;
  padding: 0.72rem 0.78rem 0.76rem;
}

.composer-primary {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
}

.composer-primary-mobile {
  display: block;
}

.composer-footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.9rem;
  padding-top: 0.12rem;
}

.composer-tools {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.28rem;
  border: 1px solid rgba(226, 232, 240, 0.85);
  border-radius: 9999px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(248, 250, 252, 0.96));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.85),
    0 10px 24px rgba(15, 23, 42, 0.05);
}

.composer-tools :deep(button) {
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 0.9rem;
  color: rgb(71 85 105);
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.composer-tools :deep(button:hover) {
  background: rgba(240, 253, 244, 0.95);
  color: rgb(30 86 58);
  transform: translateY(-1px);
  box-shadow: 0 8px 16px rgba(30, 86, 58, 0.1);
}

.composer-tool-icon {
  font-size: 1.15rem;
  color: rgb(79 85 94);
}

.composer-tool-icon-active {
  color: rgb(58 121 72);
}

.composer-tool-icon-muted {
  color: rgb(100 116 139);
}

.composer-input-wrap {
  flex: 1 1 auto;
  min-width: 0;
}

.composer-shell-mobile .composer-input-wrap {
  position: relative;
  padding: 0.08rem;
  border-radius: 1.25rem;
}

.composer-input :deep(.n-input) {
  border-radius: 1.25rem;
  background: rgba(255, 255, 255, 0.72);
  box-shadow:
    inset 0 1px 2px rgba(15, 23, 42, 0.04),
    0 8px 20px rgba(15, 23, 42, 0.03);
}

.composer-input :deep(.n-input-wrapper) {
  padding-inline: 0.15rem;
}

.composer-input :deep(.n-input__textarea-el),
.composer-input :deep(.n-input__textarea-mirror) {
  padding-inline: 0.8rem;
  padding-block: 0.55rem;
  line-height: 1.6;
}

.composer-input-mobile :deep(.n-input__textarea-el),
.composer-input-mobile :deep(.n-input__textarea-mirror) {
  padding-left: 0.9rem;
  padding-right: 4.65rem;
}

.composer-input-mobile :deep(.n-input) {
  min-height: 3.55rem;
}

.composer-input-mobile :deep(.n-input__textarea-el),
.composer-input-mobile :deep(.n-input__textarea-mirror) {
  padding-block: 0.85rem;
}

.composer-send {
  flex: 0 0 auto;
  min-width: 7rem;
  height: 2.9rem;
  border: 0;
  border-radius: 9999px;
  background: linear-gradient(135deg, rgb(30 86 58), rgb(78 159 106));
  box-shadow: 0 18px 32px rgba(75, 158, 95, 0.24);
}

.composer-send-icon {
  color: rgb(255 255 255);
}

.composer-send-mobile {
  min-width: 2.95rem;
  width: 2.95rem;
  height: 2.95rem;
  padding-inline: 0;
  border-radius: 1rem;
  box-shadow:
    0 14px 24px rgba(75, 158, 95, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.22);
}

.composer-send-mobile-embedded {
  position: absolute;
  right: 0.42rem;
  top: 50%;
  bottom: auto;
  transform: translateY(-50%);
  z-index: 2;
}

.composer-shell-mobile .composer-input-wrap::after {
  content: '';
  position: absolute;
  top: 50%;
  right: 0.28rem;
  width: 3.15rem;
  height: 3.15rem;
  border-radius: 1.18rem;
  background: linear-gradient(180deg, rgba(240, 253, 244, 0.96), rgba(220, 252, 231, 0.88));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.95),
    0 10px 24px rgba(75, 158, 95, 0.12);
  transform: translateY(-50%);
  pointer-events: none;
  z-index: 1;
}

.composer-mobile-meta {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.composer-context-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  min-height: 2.05rem;
  padding: 0.38rem 0.72rem;
  border: 1px solid rgba(203, 213, 225, 0.95);
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.9);
  color: rgb(71 85 105);
  font-size: 0.78rem;
  font-weight: 600;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    color 0.2s ease;
}

.composer-context-pill__dot {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 9999px;
  background: rgb(148 163 184);
  flex: 0 0 auto;
}

.composer-context-pill-active {
  border-color: rgba(110, 231, 183, 0.95);
  background: rgba(240, 253, 244, 0.96);
  color: rgb(21 128 61);
}

.composer-context-pill-active .composer-context-pill__dot {
  background: rgb(16 185 129);
}

:global(.dark) .chat-page {
  background:
    radial-gradient(circle at top left, rgba(20, 83, 45, 0.2), transparent 28%),
    radial-gradient(circle at top right, rgba(30, 64, 175, 0.16), transparent 26%),
    linear-gradient(180deg, #090d16 0%, #0f172a 100%);
}

:global(.dark) .chat-surface,
:global(.dark) .composer-shell {
  border-color: rgba(51, 65, 85, 0.74);
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.86), rgba(15, 23, 42, 0.94));
  box-shadow:
    0 24px 70px rgba(2, 6, 23, 0.28),
    inset 0 1px 0 rgba(148, 163, 184, 0.05);
}

:global(.dark) .chat-empty-state {
  border-color: rgba(71, 85, 105, 0.5);
  color: rgb(148 163 184);
  background: rgba(15, 23, 42, 0.6);
}

:global(.dark) .chat-empty-kicker {
  background: rgba(20, 83, 45, 0.42);
  color: rgb(187 247 208);
}

:global(.dark) .chat-empty-title {
  color: rgb(226 232 240);
}

:global(.dark) .chat-empty-icon {
  color: rgb(167 243 208);
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(59, 130, 246, 0.14));
}

:global(.dark) .composer-tool-icon {
  color: rgb(226 232 240);
}

:global(.dark) .composer-tool-icon-muted {
  color: rgb(148 163 184);
}

:global(.dark) .composer-tools {
  border-color: rgba(51, 65, 85, 0.84);
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.82), rgba(15, 23, 42, 0.9));
}

:global(.dark) .chat-empty-action {
  border-color: rgba(51, 65, 85, 0.9);
  background: rgba(15, 23, 42, 0.82);
  color: rgb(226 232 240);
}

:global(.dark) .chat-empty-action:hover {
  border-color: rgba(52, 211, 153, 0.42);
  background: rgba(20, 83, 45, 0.28);
  color: rgb(187 247 208);
}

:global(.dark) .composer-tools :deep(button:hover) {
  background: rgba(30, 41, 59, 0.96);
  color: rgb(167 243 208);
  box-shadow: 0 10px 18px rgba(2, 6, 23, 0.28);
}

:global(.dark) .composer-input :deep(.n-input) {
  background: rgba(15, 23, 42, 0.72);
}

:global(.dark) .composer-shell-mobile .composer-input-wrap::after {
  background: linear-gradient(180deg, rgba(20, 83, 45, 0.32), rgba(15, 118, 110, 0.2));
  box-shadow:
    inset 0 1px 0 rgba(167, 243, 208, 0.08),
    0 12px 24px rgba(2, 6, 23, 0.22);
}

:global(.dark) .composer-context-pill {
  border-color: rgba(51, 65, 85, 0.92);
  background: rgba(15, 23, 42, 0.82);
  color: rgb(148 163 184);
}

:global(.dark) .composer-context-pill__dot {
  background: rgb(100 116 139);
}

:global(.dark) .composer-context-pill-active {
  border-color: rgba(52, 211, 153, 0.42);
  background: rgba(20, 83, 45, 0.26);
  color: rgb(187 247 208);
}

:global(.dark) .composer-context-pill-active .composer-context-pill__dot {
  background: rgb(52 211 153);
}

@media (max-width: 640px) {
  .chat-surface {
    min-height: 100%;
    padding: 0.92rem;
    border-radius: 1.15rem;
  }

  .chat-thread {
    padding-top: 0.35rem;
    padding-bottom: 5.8rem;
  }

  .chat-empty-state {
    gap: 1.1rem;
    width: 100%;
    padding: 1.15rem;
    text-align: left;
  }

  .chat-empty-hero {
    align-items: flex-start;
  }

  .chat-empty-actions {
    justify-content: flex-start;
  }

  .chat-empty-action {
    width: 100%;
    justify-content: flex-start;
  }

  .composer-shell {
    gap: 0.5rem;
    padding: 0.7rem;
    border-radius: 1.05rem;
  }

  .composer-footer {
    gap: 0.55rem;
  }

  .composer-tools {
    gap: 0.08rem;
    padding: 0.16rem;
  }

  .composer-tools :deep(button) {
    width: 2.15rem;
    height: 2.15rem;
  }

  .composer-send {
    min-width: auto;
    width: 3.25rem;
  }
}
</style>
