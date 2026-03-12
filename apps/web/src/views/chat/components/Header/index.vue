<script lang="ts" setup>
import { SvgIcon } from '@/components/common'
import { t } from '@/locales'
import { useAppStore, useChatStore } from '@/store'
import { NDropdown } from 'naive-ui'
import { computed, nextTick } from 'vue'

interface Props {
  usingContext: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  export: []
  handleClear: []
}>()

const appStore = useAppStore()
const chatStore = useChatStore()

const collapsed = computed(() => appStore.siderCollapsed)
const currentChatHistory = computed(() => chatStore.getChatHistoryByCurrentActive)

const actionOptions = computed(() => [
  {
    label: t('chat.exportImageTooltip'),
    key: 'export',
  },
  {
    label: t('chat.clearChatTooltip'),
    key: 'clear',
  },
])

function handleUpdateCollapsed() {
  appStore.setSiderCollapsed(!collapsed.value)
}

function onScrollToTop() {
  const scrollRef = document.querySelector('#scrollRef')
  if (scrollRef) nextTick(() => (scrollRef.scrollTop = 0))
}

function handleExport() {
  emit('export')
}

function handleClear() {
  emit('handleClear')
}

function handleActionSelect(key: string | number) {
  if (key === 'export') {
    handleExport()
    return
  }

  if (key === 'clear') {
    handleClear()
  }
}
</script>

<template>
  <header
    class="mobile-chat-header sticky top-0 left-0 right-0 z-30 border-b dark:border-neutral-800"
  >
    <div
      class="mobile-chat-header__inner relative flex items-center justify-between min-w-0 overflow-hidden h-14"
    >
      <div class="flex items-center">
        <button
          class="mobile-chat-header__toggle"
          type="button"
          :aria-label="collapsed ? t('common.openSidebar') : t('common.closeSidebar')"
          @click="handleUpdateCollapsed"
        >
          <SvgIcon v-if="collapsed" class="text-2xl" icon="ri:align-justify" />
          <SvgIcon v-else class="text-2xl" icon="ri:align-right" />
        </button>
      </div>
      <h1
        class="mobile-chat-header__title flex-1 min-w-0 px-3 overflow-hidden cursor-pointer select-none text-ellipsis whitespace-nowrap"
        @dblclick="onScrollToTop"
      >
        <span
          class="mobile-chat-header__status"
          :class="{ 'mobile-chat-header__status-active': usingContext }"
        />
        {{ currentChatHistory?.title ?? '' }}
      </h1>
      <div class="mobile-chat-header__actions">
        <NDropdown trigger="click" :options="actionOptions" @select="handleActionSelect">
          <button
            class="mobile-chat-header__action-btn"
            type="button"
            :aria-label="t('chat.mobileMenuActions')"
          >
            <SvgIcon icon="ri:more-2-fill" class="text-xl" />
          </button>
        </NDropdown>
      </div>
    </div>
  </header>
</template>

<style scoped>
.mobile-chat-header {
  background: linear-gradient(180deg, var(--app-header-bg-start), var(--app-header-bg-end));
  backdrop-filter: blur(18px);
}

.mobile-chat-header__inner {
  height: 3.38rem;
  padding-inline: 0.58rem;
}

.mobile-chat-header__toggle,
.mobile-chat-header__action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.58rem;
  height: 2.58rem;
  border: 1px solid var(--app-interactive-border);
  border-radius: 0.9rem;
  background: var(--app-interactive-bg);
  box-shadow: var(--app-interactive-shadow);
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.mobile-chat-header__toggle,
.mobile-chat-header__action-btn,
.mobile-chat-header__title {
  color: var(--app-text-1);
}

.mobile-chat-header__toggle:hover,
.mobile-chat-header__action-btn:hover {
  transform: translateY(-0.5px);
  border-color: var(--app-interactive-border-hover);
  background: var(--app-interactive-bg-hover);
  color: var(--app-interactive-text-hover);
  box-shadow: var(--app-interactive-shadow-hover);
}

.mobile-chat-header__toggle:active,
.mobile-chat-header__action-btn:active {
  transform: translateY(0);
  background: var(--app-interactive-bg-active);
  box-shadow: var(--app-interactive-shadow);
}

.mobile-chat-header__title {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  margin: 0;
  font-weight: 650;
  font-size: 0.96rem;
  line-height: 1.2rem;
}

.mobile-chat-header__status {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 9999px;
  background: var(--app-text-3);
  box-shadow: 0 0 0 4px var(--app-status-ring);
  flex: 0 0 auto;
}

.mobile-chat-header__status-active {
  background: var(--app-accent);
  box-shadow: 0 0 0 4px var(--app-status-active-ring);
}
</style>
