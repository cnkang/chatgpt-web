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

const getMobileClass = computed<CSSProperties>(() => {
  if (isMobile.value) {
    return {
      position: 'fixed',
      zIndex: 50,
    }
  }
  return {}
})

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
    <div class="flex flex-col h-full" :style="mobileSafeArea">
      <main class="flex flex-col flex-1 min-h-0">
        <div class="p-4">
          <NButton dashed block @click="handleAdd">
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
.clear-history-btn {
  opacity: 0.6;
  transition: all 0.2s ease;
  padding: 0.25rem;
  border-radius: 0.375rem;
}

.clear-history-btn:hover {
  opacity: 1;
  background-color: rgba(243, 244, 246, 0.5);
}

.dark .clear-history-btn:hover {
  background-color: rgba(31, 41, 55, 0.5);
}
</style>
