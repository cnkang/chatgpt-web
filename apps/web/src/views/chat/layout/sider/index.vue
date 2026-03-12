<script setup lang="ts">
import type { CSSProperties } from 'vue'

import { HoverButton, SvgIcon } from '@/components/common'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { t } from '@/locales'
import { useAppStore, useChatStore } from '@/store'
import { NButton, NLayoutSider, useDialog } from 'naive-ui'
import { computed, watch } from 'vue'
import Footer from './Footer.vue'
import List from './List.vue'

const appStore = useAppStore()
const chatStore = useChatStore()

const dialog = useDialog()

const { isMobile } = useBasicLayout()

const collapsed = computed(() => appStore.siderCollapsed)

function handleAdd() {
  chatStore.addHistory({
    title: t('chat.newChatTitle'),
    uuid: Date.now(),
    isEdit: false,
  })
  if (isMobile.value) appStore.setSiderCollapsed(true)
}

function handleUpdateCollapsed() {
  appStore.setSiderCollapsed(!collapsed.value)
}

function handleClearAll() {
  dialog.warning({
    title: t('chat.deleteMessage'),
    content: t('chat.clearHistoryConfirm'),
    positiveText: t('common.yes'),
    negativeText: t('common.no'),
    onPositiveClick: () => {
      chatStore.clearHistory()
      if (isMobile.value) appStore.setSiderCollapsed(true)
    },
  })
}

const getMobileClass = computed(
  (): CSSProperties =>
    isMobile.value
      ? {
          position: 'fixed',
          zIndex: 50,
        }
      : {},
)

const mobileSafeArea = computed(() => {
  if (isMobile.value) {
    return {
      paddingBottom: 'env(safe-area-inset-bottom)',
    }
  }
  return {}
})

watch(
  isMobile,
  val => {
    appStore.setSiderCollapsed(val)
  },
  {
    immediate: true,
    flush: 'post',
  },
)
</script>

<template>
  <NLayoutSider
    class="chat-sider-panel"
    :class="{
      'chat-sider-panel-mobile': isMobile,
      'chat-sider-panel-desktop': !isMobile,
      'chat-sider-panel-open': isMobile && !collapsed,
    }"
    :collapsed="collapsed"
    :collapsed-width="0"
    :width="260"
    :show-trigger="isMobile ? false : 'arrow-circle'"
    collapse-mode="transform"
    position="absolute"
    bordered
    :style="getMobileClass"
    @update-collapsed="handleUpdateCollapsed"
  >
    <div class="chat-sider flex flex-col h-full" :style="mobileSafeArea">
      <main class="flex flex-col flex-1 min-h-0">
        <div class="p-4 pb-3">
          <NButton class="new-chat-button" block @click="handleAdd">
            {{ $t('chat.newChatButton') }}
          </NButton>
        </div>
        <div class="flex-1 min-h-0 pb-4 overflow-hidden">
          <List />
        </div>
        <div class="sider-clear-wrap px-4 pb-4">
          <HoverButton
            :tooltip="t('chat.clearHistoryTooltip')"
            class="clear-history-btn w-full"
            @click="handleClearAll"
          >
            <div class="clear-history-btn__content">
              <SvgIcon icon="ri:eraser-line" class="clear-history-btn__icon" />
              <span class="clear-history-btn__text">{{ t('chat.clearHistory') }}</span>
            </div>
          </HoverButton>
        </div>
      </main>
      <Footer />
    </div>
  </NLayoutSider>
  <template v-if="isMobile">
    <div
      v-show="!collapsed"
      class="fixed inset-0 z-40 w-full h-full bg-black/40"
      @click="handleUpdateCollapsed"
    />
  </template>
</template>

<style scoped>
.chat-sider-panel-mobile {
  transition:
    transform 0.24s ease,
    opacity 0.24s ease !important;
}

.chat-sider-panel-mobile:not(.chat-sider-panel-open) {
  transform: translateX(calc(-100% - 0.85rem)) !important;
  opacity: 0;
  pointer-events: none;
  visibility: hidden;
}

.chat-sider-panel-mobile.chat-sider-panel-open {
  transform: translateX(0) !important;
  opacity: 1;
  pointer-events: auto;
  visibility: visible;
}

.chat-sider {
  position: relative;
  background: linear-gradient(180deg, var(--app-sidebar), var(--app-panel-strong));
}

.chat-sider::after {
  content: '';
  position: absolute;
  top: 1rem;
  right: 0;
  bottom: 1rem;
  width: 1px;
  background: linear-gradient(180deg, transparent, var(--app-border-strong), transparent);
  pointer-events: none;
}

.chat-sider-panel-desktop {
  box-shadow: inset -1px 0 0 rgba(255, 255, 255, 0.22);
}

.new-chat-button {
  height: 3rem;
  border: 1px solid var(--app-interactive-border);
  border-radius: 1rem;
  background: var(--app-interactive-bg);
  color: var(--app-interactive-text);
  box-shadow: var(--app-interactive-shadow);
  --n-text-color: var(--app-text-1);
  --n-text-color-hover: var(--app-text-1);
  --n-text-color-pressed: var(--app-text-1);
  --n-text-color-focus: var(--app-text-1);
}

.new-chat-button :deep(.n-button__content) {
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--app-text-1) !important;
}

.sider-clear-wrap {
  border-top: 1px solid var(--app-border-soft);
}

.clear-history-btn :deep(button) {
  width: 100%;
  border: 1px solid var(--app-interactive-border);
  border-radius: 0.85rem;
  background: var(--app-interactive-bg);
  box-shadow: var(--app-interactive-shadow);
  padding: 0.58rem 0.72rem;
  color: var(--app-interactive-text);
}

.clear-history-btn__content {
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
}

.clear-history-btn__icon {
  color: var(--app-interactive-text);
}

.clear-history-btn__text {
  color: var(--app-text-2);
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.clear-history-btn :deep(button):hover {
  border-color: var(--app-interactive-border-hover);
  background: var(--app-interactive-bg-hover);
  color: var(--app-interactive-text-hover);
  box-shadow: var(--app-interactive-shadow-hover);
}

.clear-history-btn :deep(button):active {
  transform: translateY(0);
  background: var(--app-interactive-bg-active);
  box-shadow: var(--app-interactive-shadow);
}

:global(html.dark) .chat-sider {
  background: linear-gradient(180deg, var(--app-sidebar), var(--app-panel-strong));
}

:global(html.dark) .chat-sider::after {
  background: linear-gradient(180deg, transparent, var(--app-border-strong), transparent);
}

:global(html.dark) .sider-clear-wrap {
  border-top-color: var(--app-border-soft);
}

:global(html.dark) .clear-history-btn :deep(button) {
  border-color: var(--app-interactive-border);
  background: var(--app-interactive-bg);
  color: var(--app-interactive-text);
}

:global(html.dark) .clear-history-btn__icon {
  color: var(--app-interactive-text);
}

:global(html.dark) .clear-history-btn :deep(button):hover {
  border-color: var(--app-interactive-border-hover);
  background: var(--app-interactive-bg-hover);
  color: var(--app-interactive-text-hover);
  box-shadow: var(--app-interactive-shadow-hover);
}
</style>
