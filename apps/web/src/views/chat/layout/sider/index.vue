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
        <div class="flex items-center justify-center p-4">
          <HoverButton
            :tooltip="t('chat.clearHistoryTooltip')"
            class="clear-history-btn"
            @click="handleClearAll"
          >
            <div class="flex items-center space-x-1.5">
              <SvgIcon
                icon="ri:delete-bin-line"
                class="w-4 h-4 text-gray-400 hover:text-red-400 transition-colors duration-200"
              />
              <span
                v-if="!isMobile && !collapsed"
                class="text-xs text-gray-500 hover:text-red-500 transition-colors duration-200 font-normal"
              >
                {{ t('chat.clearHistory') }}
              </span>
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
  background: linear-gradient(180deg, rgba(247, 250, 252, 0.95), rgba(255, 255, 255, 0.92));
}

.chat-sider::after {
  content: '';
  position: absolute;
  top: 1rem;
  right: 0;
  bottom: 1rem;
  width: 1px;
  background: linear-gradient(
    180deg,
    rgba(226, 232, 240, 0),
    rgba(203, 213, 225, 0.95),
    rgba(226, 232, 240, 0)
  );
  pointer-events: none;
}

.chat-sider-panel-desktop {
  box-shadow: inset -1px 0 0 rgba(255, 255, 255, 0.35);
}

.new-chat-button {
  height: 3rem;
  border: 0;
  border-radius: 1rem;
  background: linear-gradient(135deg, rgb(32 90 60), rgb(78 159 106));
  box-shadow: 0 16px 28px rgba(75, 158, 95, 0.22);
}

.new-chat-button :deep(.n-button__content) {
  font-weight: 600;
  letter-spacing: 0.01em;
  color: white;
}

.clear-history-btn {
  opacity: 0.74;
  transition:
    opacity 0.2s ease,
    background-color 0.2s ease,
    border-color 0.2s ease;
  padding: 0.45rem 0.7rem;
  border: 1px solid rgba(226, 232, 240, 0.85);
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.72);
}

.clear-history-btn:hover {
  opacity: 1;
  border-color: rgba(248, 113, 113, 0.22);
  background-color: rgba(255, 255, 255, 0.94);
}

.dark .clear-history-btn:hover {
  background-color: rgba(31, 41, 55, 0.82);
}

:global(.dark) .chat-sider {
  background: linear-gradient(180deg, rgba(9, 14, 24, 0.96), rgba(15, 23, 42, 0.92));
}

:global(.dark) .chat-sider::after {
  background: linear-gradient(
    180deg,
    rgba(51, 65, 85, 0),
    rgba(71, 85, 105, 0.95),
    rgba(51, 65, 85, 0)
  );
}

:global(.dark) .new-chat-button {
  background: linear-gradient(135deg, rgb(26 74 48), rgb(45 125 82));
  box-shadow: 0 16px 28px rgba(16, 185, 129, 0.16);
}

:global(.dark) .clear-history-btn {
  border-color: rgba(51, 65, 85, 0.84);
  background: rgba(15, 23, 42, 0.76);
}
</style>
