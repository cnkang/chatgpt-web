<script setup lang='ts'>
import { NButton, NLayoutSider, useDialog } from 'naive-ui'
import { computed, ref, watch, type CSSProperties } from 'vue'
import { PromptStore, SvgIcon } from '@/components/common'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { t } from '@/locales'
import { useAppStore, useChatStore } from '@/store'
import Footer from './Footer.vue'
import List from './List.vue'

const appStore = useAppStore()
const chatStore = useChatStore()

const dialog = useDialog()

const { isMobile, isTablet } = useBasicLayout()
const show = ref(false)

const collapsed = computed(() => appStore.siderCollapsed)
const siderWidth = computed(() => (isTablet.value ? 264 : 292))

function handleAdd() {
  chatStore.addHistory({ title: t('chat.newChatTitle'), uuid: Date.now(), isEdit: false })
  if (isMobile.value)
    appStore.setSiderCollapsed(true)
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
      if (isMobile.value)
        appStore.setSiderCollapsed(true)
    },
  })
}

const getMobileClass = computed<CSSProperties>(() => {
  if (isMobile.value) {
    return {
      position: 'fixed',
      zIndex: 50,
      left: '0',
      top: '0',
      bottom: '0',
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
  (val) => {
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
    class="chat-sider"
    :collapsed="collapsed"
    :collapsed-width="0"
    :width="siderWidth"
    :show-trigger="isMobile ? false : 'arrow-circle'"
    collapse-mode="transform"
    position="absolute"
    bordered
    :style="getMobileClass"
    @update-collapsed="handleUpdateCollapsed"
  >
    <div class="chat-sider__panel" :style="mobileSafeArea">
      <main class="chat-sider__main">
        <div class="chat-sider__toolbar">
          <NButton type="primary" strong block class="chat-sider__new-btn" @click="handleAdd">
            {{ $t('chat.newChatButton') }}
          </NButton>
        </div>
        <div class="chat-sider__list">
          <List />
        </div>
        <div class="chat-sider__actions">
          <div class="chat-sider__actions-main">
            <NButton quaternary block class="chat-sider__prompt-btn" @click="show = true">
              {{ $t('store.siderButton') }}
            </NButton>
          </div>
          <NButton quaternary circle class="chat-sider__clear-btn" @click="handleClearAll">
            <SvgIcon icon="ri:close-circle-line" />
          </NButton>
        </div>
      </main>
      <Footer />
    </div>
  </NLayoutSider>
  <template v-if="isMobile">
    <div v-show="!collapsed" class="chat-sider__overlay" @click="handleUpdateCollapsed" />
  </template>
  <PromptStore v-model:visible="show" />
</template>

<style scoped lang="less">
.chat-sider {
  border: none !important;
}

.chat-sider :deep(.n-layout-sider-scroll-container) {
  background: transparent;
}

.chat-sider :deep(.n-layout-toggle-button) {
  border: 1px solid var(--chat-border-color);
  border-left: 0;
  background: var(--chat-panel-bg-strong);
  backdrop-filter: blur(8px);
}

.chat-sider__panel {
  display: flex;
  height: 100%;
  flex-direction: column;
  background:
    linear-gradient(180deg, var(--chat-panel-bg-strong) 0%, var(--chat-panel-bg) 56%, var(--chat-panel-bg-soft) 100%);
  border-right: 1px solid var(--chat-border-color);
}

.chat-sider__main {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
}

.chat-sider__toolbar {
  padding: 1.125rem 1rem 0.75rem;
}

.chat-sider__new-btn {
  height: 2.75rem;
  border-radius: 0.875rem;
  font-weight: 600;
}

.chat-sider__list {
  flex: 1;
  min-height: 0;
  padding-bottom: 0.75rem;
  overflow: hidden;
}

.chat-sider__actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem 1rem;
}

.chat-sider__actions-main {
  flex: 1;
}

.chat-sider__prompt-btn {
  border-radius: 0.875rem;
  border: 1px solid var(--chat-border-color);
}

.chat-sider__clear-btn {
  border: 1px solid var(--chat-border-color);
}

.chat-sider__overlay {
  position: fixed;
  inset: 0;
  z-index: 40;
  width: 100%;
  height: 100%;
  background: rgba(13, 18, 27, 0.4);
  backdrop-filter: blur(2px);
}
</style>
