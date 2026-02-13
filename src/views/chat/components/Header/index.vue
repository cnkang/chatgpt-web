<script lang="ts" setup>
import { computed, nextTick } from 'vue'
import { HoverButton, SvgIcon } from '@/components/common'
import { useAppStore, useChatStore } from '@/store'

interface Props {
  usingContext: boolean
}

interface Emit {
  (ev: 'export'): void
  (ev: 'handleClear'): void
}

defineProps<Props>()

const emit = defineEmits<Emit>()

const appStore = useAppStore()
const chatStore = useChatStore()

const collapsed = computed(() => appStore.siderCollapsed)
const currentChatHistory = computed(() => chatStore.getChatHistoryByCurrentActive)

function handleUpdateCollapsed() {
  appStore.setSiderCollapsed(!collapsed.value)
}

function onScrollToTop() {
  const scrollRef = document.querySelector('#scrollRef')
  if (scrollRef)
    nextTick(() => scrollRef.scrollTop = 0)
}

function handleExport() {
  emit('export')
}

function handleClear() {
  emit('handleClear')
}
</script>

<template>
  <header class="chat-mobile-header">
    <div class="chat-mobile-header__inner">
      <div class="chat-mobile-header__leading">
        <button
          class="chat-mobile-header__toggle"
          @click="handleUpdateCollapsed"
        >
          <SvgIcon v-if="collapsed" class="chat-mobile-header__toggle-icon" icon="ri:align-justify" />
          <SvgIcon v-else class="chat-mobile-header__toggle-icon" icon="ri:align-right" />
        </button>
      </div>
      <h1 class="chat-mobile-header__title" @dblclick="onScrollToTop">
        {{ currentChatHistory?.title ?? '' }}
      </h1>
      <div class="chat-mobile-header__actions">
        <HoverButton @click="handleExport">
          <span class="chat-mobile-header__icon">
            <SvgIcon icon="ri:download-2-line" />
          </span>
        </HoverButton>
        <HoverButton @click="handleClear">
          <span class="chat-mobile-header__icon">
            <SvgIcon icon="ri:delete-bin-line" />
          </span>
        </HoverButton>
      </div>
    </div>
  </header>
</template>

<style scoped lang="less">
.chat-mobile-header {
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  z-index: 30;
  border-bottom: 1px solid var(--chat-border-color);
  background: color-mix(in oklab, var(--chat-panel-bg-strong) 72%, transparent);
  backdrop-filter: blur(14px);
}

.chat-mobile-header__inner {
  position: relative;
  display: flex;
  min-width: 0;
  height: 3.5rem;
  align-items: center;
  justify-content: space-between;
  overflow: hidden;
  padding: 0 0.4rem;
}

.chat-mobile-header__leading {
  display: flex;
  align-items: center;
}

.chat-mobile-header__toggle {
  display: inline-flex;
  width: 2.65rem;
  height: 2.65rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.8rem;
  color: var(--chat-text-secondary);
}

.chat-mobile-header__toggle-icon {
  font-size: 1.35rem;
}

.chat-mobile-header__title {
  flex: 1;
  padding: 0 0.85rem 0 0.95rem;
  overflow: hidden;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--chat-text-primary);
}

.chat-mobile-header__actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.chat-mobile-header__icon {
  font-size: 1.05rem;
  color: var(--chat-text-secondary);
}

@supports not (color: color-mix(in oklab, white 50%, black)) {
  .chat-mobile-header {
    background: var(--chat-panel-bg-strong);
  }
}
</style>
