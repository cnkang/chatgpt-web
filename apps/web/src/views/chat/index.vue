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
    ? ['sticky', 'left-0', 'bottom-0', 'right-0', 'z-20', 'px-4', 'pb-3', 'pt-2']
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
        <div class="chat-stage h-full" :class="[isMobile ? 'p-3' : 'px-5 pt-5 pb-4']">
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
      <div class="chat-footer-inner">
        <div class="composer-shell" :class="{ 'composer-shell-mobile': isMobile }">
          <template v-if="isMobile">
            <div class="composer-primary composer-primary-mobile">
              <div class="composer-input-wrap composer-input-wrap-mobile">
                <NInput
                  ref="inputRef"
                  v-model:value="prompt"
                  class="composer-input composer-input-mobile"
                  type="textarea"
                  :placeholder="placeholder"
                  :autosize="{ minRows: 1, maxRows: 5 }"
                  @keydown="handleEnter"
                />
              </div>
              <NButton
                class="composer-send composer-send-mobile"
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
            <div class="composer-primary composer-primary-desktop">
              <div class="composer-input-wrap composer-input-wrap-desktop">
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
              <NButton
                class="composer-send composer-send-desktop"
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
            <div class="composer-footer">
              <div class="composer-meta">
                <button
                  type="button"
                  class="composer-context-pill"
                  :class="{ 'composer-context-pill-active': usingContext }"
                  :title="t('chat.contextModeTooltip')"
                  @click="toggleUsingContext"
                >
                  <span class="composer-context-pill__dot" />
                  {{ contextLabel }}
                </button>
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
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.chat-page {
  --chat-layout-max-width: 100%;
  --chat-message-row-max: 52rem;
  --chat-message-row-reply-max: 54rem;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(125, 177, 153, 0.1), transparent 24%),
    radial-gradient(circle at top right, rgba(131, 170, 165, 0.08), transparent 24%),
    linear-gradient(180deg, rgba(252, 253, 251, 0.32), rgba(255, 255, 255, 0));
}

.chat-main {
  flex: 1 1 0%;
  min-height: 0;
  overscroll-behavior: contain;
}

.chat-footer {
  flex: 0 0 auto;
  margin-top: auto;
  padding-left: max(env(safe-area-inset-left), 0px);
  padding-right: max(env(safe-area-inset-right), 0px);
  padding-bottom: max(env(safe-area-inset-bottom), 0px);
}

.chat-stage,
.chat-footer-inner {
  width: min(100%, var(--chat-layout-max-width));
  max-width: 100%;
  margin-inline: auto;
  box-sizing: border-box;
  min-width: 0;
}

.chat-surface {
  height: 100%;
  min-height: 100%;
  padding: clamp(1.15rem, 2.2vw, 1.8rem);
  border: 1px solid var(--app-border-soft);
  border-radius: 1.75rem;
  background: linear-gradient(180deg, var(--app-panel), var(--app-panel-strong));
  box-shadow: var(--app-shadow-md);
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
  justify-content: flex-end;
  gap: 0.55rem;
  min-height: 100%;
  width: 100%;
  margin-inline: auto;
  padding: 0.75rem clamp(0.9rem, 2.2vw, 1.8rem) 1.85rem;
}

.chat-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.45rem;
  width: min(100%, 42rem);
  margin-inline: auto;
  padding: clamp(1.45rem, 4vw, 2.45rem);
  border: 1px solid var(--app-border-soft);
  border-radius: 1.6rem;
  color: var(--app-text-2);
  background:
    linear-gradient(180deg, rgba(255, 255, 253, 0.58), rgba(247, 249, 246, 0.9)),
    radial-gradient(circle at top right, rgba(125, 177, 153, 0.12), transparent 34%);
  text-align: center;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
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
  background: linear-gradient(135deg, rgba(239, 245, 240, 0.98), rgba(227, 236, 232, 0.96));
  color: var(--app-accent-strong);
  box-shadow: 0 12px 24px rgba(36, 50, 43, 0.06);
}

.chat-empty-kicker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem 0.75rem;
  border-radius: 9999px;
  background: var(--app-accent-soft);
  color: var(--app-accent-strong);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.chat-empty-title {
  margin: 0;
  font-size: clamp(1.35rem, 2.2vw, 1.9rem);
  line-height: 1.15;
  font-weight: 650;
  color: var(--app-text-1);
}

.chat-empty-subtitle {
  max-width: 32rem;
  font-size: 0.96rem;
  line-height: var(--app-reading-line-height);
  letter-spacing: var(--app-reading-letter-spacing);
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
  border: 1px solid var(--app-interactive-border);
  border-radius: 1rem;
  background: var(--app-interactive-bg);
  color: var(--app-interactive-text);
  box-shadow: var(--app-interactive-shadow);
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
  transform: translateY(-0.5px);
  border-color: var(--app-interactive-border-hover);
  background: var(--app-interactive-bg-hover);
  color: var(--app-interactive-text-hover);
  box-shadow: var(--app-interactive-shadow-hover);
}

.chat-empty-action:active {
  transform: translateY(0);
  background: var(--app-interactive-bg-active);
  box-shadow: var(--app-interactive-shadow);
}

.composer-shell {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  width: 100%;
  max-width: 100%;
  margin-inline: auto;
  padding: 0.95rem 1rem 0.9rem;
  border: 1px solid var(--app-border-soft);
  border-radius: 1.6rem;
  background: linear-gradient(180deg, var(--app-panel), var(--app-panel-strong));
  box-shadow: var(--app-shadow-md);
  backdrop-filter: blur(18px);
}

.composer-shell-mobile {
  gap: 0.68rem;
  padding: 0.78rem 0.82rem 0.82rem;
}

.composer-primary {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
  min-width: 0;
}

.composer-primary-mobile {
  align-items: flex-end;
}

.composer-primary-desktop {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  column-gap: 0.75rem;
  width: 100%;
  align-items: flex-end;
}

.composer-footer {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 1rem;
  padding-top: 0.08rem;
}

.composer-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.composer-tools {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.28rem;
  border: 1px solid var(--app-border-soft);
  border-radius: 9999px;
  background: var(--app-chip-bg);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.65);
}

.composer-tools :deep(button) {
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 0.9rem;
  color: var(--app-interactive-text);
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.composer-tools :deep(button:hover) {
  color: var(--app-interactive-text-hover);
  box-shadow: var(--app-interactive-shadow-hover);
}

.composer-tool-icon {
  font-size: 1.15rem;
  color: var(--app-text-2);
}

.composer-input-wrap {
  flex: 1 1 auto;
  min-width: 0;
}

.composer-shell-mobile .composer-input-wrap {
  padding: 0;
}

.composer-input-wrap-mobile {
  flex: 1 1 auto;
  min-width: 0;
}

.composer-input-wrap-desktop {
  width: 100%;
  min-width: 0;
}

.composer-input :deep(.n-input) {
  border-radius: 1.25rem;
  background: var(--app-chip-bg);
  box-shadow: inset 0 1px 2px rgba(36, 50, 43, 0.04);
}

.composer-input :deep(.n-input-wrapper) {
  border-radius: 1.25rem;
  padding-inline: 0.15rem;
}

.composer-input :deep(.n-input__border),
.composer-input :deep(.n-input__state-border) {
  border-radius: 1.25rem !important;
}

.composer-input :deep(.n-input__textarea-el),
.composer-input :deep(.n-input__textarea-mirror) {
  padding-inline: 0.8rem;
  padding-block: 0.55rem;
  font-size: 0.97rem;
  line-height: var(--app-reading-line-height);
  letter-spacing: var(--app-reading-letter-spacing);
  color: var(--app-text-1);
}

.composer-input :deep(.n-input__placeholder) {
  color: var(--app-text-3);
}

.composer-input-mobile :deep(.n-input__textarea-el),
.composer-input-mobile :deep(.n-input__textarea-mirror) {
  padding-left: 0.9rem;
  padding-right: 0.9rem;
  padding-block: 0.78rem;
  font-size: 1rem;
}

.composer-input-mobile :deep(.n-input) {
  min-height: 3.2rem;
}

.composer-send {
  flex: 0 0 auto;
  min-width: 7rem;
  height: 2.9rem;
  border: 1px solid var(--app-interactive-border);
  border-radius: 9999px;
  background: var(--app-interactive-bg);
  color: var(--app-interactive-text);
  box-shadow: var(--app-interactive-shadow);
}

.composer-send-icon {
  color: currentColor;
}

.composer-send-mobile {
  min-width: 3.2rem;
  width: 3.2rem;
  height: 3.2rem;
  padding-inline: 0;
  border-radius: 1.05rem;
  flex: 0 0 auto;
}

.composer-send-desktop {
  min-width: 8rem;
  height: 3.05rem;
  border-radius: 1.05rem;
  padding-inline: 1rem;
  justify-self: end;
}

.composer-mobile-meta {
  display: flex;
  justify-content: flex-start;
}

.composer-context-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.48rem;
  min-height: 2.45rem;
  padding: 0.55rem 0.88rem;
  border: 1px solid var(--app-interactive-border);
  border-radius: 9999px;
  background: var(--app-interactive-bg);
  color: var(--app-interactive-text);
  box-shadow: var(--app-interactive-shadow);
  font-size: 0.88rem;
  font-weight: 600;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease;
}

.composer-context-pill:hover {
  transform: translateY(-0.5px);
  border-color: var(--app-interactive-border-hover);
  color: var(--app-interactive-text-hover);
  background: var(--app-interactive-bg-hover);
  box-shadow: var(--app-interactive-shadow-hover);
}

.composer-context-pill:active {
  transform: translateY(0);
  background: var(--app-interactive-bg-active);
  box-shadow: var(--app-interactive-shadow);
}

.composer-context-pill-active {
  border-color: rgba(76, 139, 114, 0.26);
  color: var(--app-accent-strong);
  background: var(--app-chip-active-bg);
  box-shadow: var(--app-interactive-shadow);
}

.composer-context-pill__dot {
  width: 0.52rem;
  height: 0.52rem;
  border-radius: 9999px;
  background: var(--app-text-3);
  box-shadow: 0 0 0 4px rgba(128, 144, 136, 0.12);
  flex: 0 0 auto;
}

.composer-context-pill-active .composer-context-pill__dot {
  background: var(--app-accent);
  box-shadow: 0 0 0 4px rgba(76, 139, 114, 0.14);
}

:global(html.dark) .chat-page {
  background:
    radial-gradient(circle at top left, rgba(125, 177, 153, 0.08), transparent 24%),
    radial-gradient(circle at top right, rgba(131, 170, 165, 0.08), transparent 24%),
    linear-gradient(180deg, rgba(14, 20, 18, 0.22), rgba(14, 20, 18, 0));
}

:global(html.dark) .chat-empty-state {
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

:global(html.dark) .chat-empty-icon {
  background: linear-gradient(135deg, rgba(39, 50, 45, 0.98), rgba(32, 42, 38, 0.94));
  color: var(--app-accent);
}

:global(html.dark) .chat-empty-action {
  background: var(--app-interactive-bg);
  color: var(--app-interactive-text);
}

:global(html.dark) .chat-empty-action:hover {
  background: var(--app-interactive-bg-hover);
  color: var(--app-interactive-text-hover);
}

@media (max-width: 900px) {
  .composer-primary-desktop {
    display: flex;
    align-items: stretch;
    flex-direction: column;
  }

  .composer-meta {
    width: 100%;
    justify-content: space-between;
  }

  .composer-send-desktop {
    width: 100%;
    min-width: 0;
  }
}

@media (max-width: 640px) {
  .chat-page {
    --chat-message-row-max: 100%;
    --chat-message-row-reply-max: 100%;
  }

  .chat-surface {
    border-radius: 1.35rem;
    padding: 0.95rem;
  }

  .chat-thread {
    min-height: 0;
    justify-content: flex-start;
    padding: 0.45rem 0.1rem 0.9rem;
  }

  .chat-empty-state {
    width: 100%;
    padding: 1.35rem 1rem;
    border-radius: 1.35rem;
    text-align: left;
  }

  .chat-empty-hero {
    align-items: flex-start;
  }

  .chat-empty-actions {
    justify-content: flex-start;
    gap: 0.6rem;
  }

  .chat-empty-action {
    width: 100%;
    justify-content: flex-start;
    padding-inline: 0.95rem;
    text-align: left;
  }

  .composer-shell {
    gap: 0.5rem;
    padding: 0.7rem;
    border-radius: 1.05rem;
  }

  .composer-primary-mobile {
    gap: 0.55rem;
  }

  .composer-context-pill {
    min-height: 2.55rem;
    font-size: 0.9rem;
  }
}

@media (min-width: 1600px) {
  .chat-page {
    --chat-message-row-max: 58rem;
    --chat-message-row-reply-max: 60rem;
  }

  .composer-tools :deep(button) {
    width: 2.5rem;
    height: 2.5rem;
  }

  .composer-send {
    min-width: 7.6rem;
    height: 3rem;
  }
}

@media (min-width: 2200px) {
  .chat-page {
    --chat-message-row-max: 66rem;
    --chat-message-row-reply-max: 68rem;
  }

  .chat-thread {
    padding-inline: clamp(1.2rem, 2.6vw, 2.6rem);
  }

  .composer-shell {
    padding: 1rem 1.1rem 0.95rem;
  }
}

@media (min-width: 3200px) {
  .chat-page {
    --chat-message-row-max: 72rem;
    --chat-message-row-reply-max: 74rem;
  }
}
</style>
