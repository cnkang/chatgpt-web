<script setup lang='ts'>
import { NInput, NPopconfirm, NScrollbar } from 'naive-ui'
import { computed } from 'vue'
import { SvgIcon } from '@/components/common'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { useAppStore, useChatStore } from '@/store'
import { debounce } from '@/utils/functions/debounce'

const { isMobile } = useBasicLayout()

const appStore = useAppStore()
const chatStore = useChatStore()

const dataSources = computed(() => chatStore.history)

async function handleSelect({ uuid }: Chat.History) {
  if (isActive(uuid))
    return

  if (chatStore.active)
    chatStore.updateHistory(chatStore.active, { isEdit: false })
  await chatStore.setActive(uuid)

  if (isMobile.value)
    appStore.setSiderCollapsed(true)
}

function handleEdit({ uuid }: Chat.History, isEdit: boolean, event?: MouseEvent) {
  event?.stopPropagation()
  chatStore.updateHistory(uuid, { isEdit })
}

function handleDelete(index: number, event?: MouseEvent | TouchEvent) {
  event?.stopPropagation()
  chatStore.deleteHistory(index)
  if (isMobile.value)
    appStore.setSiderCollapsed(true)
}

const handleDeleteDebounce = debounce(handleDelete, 600)

function handleEnter({ uuid }: Chat.History, isEdit: boolean, event: KeyboardEvent) {
  event?.stopPropagation()
  if (event.key === 'Enter')
    chatStore.updateHistory(uuid, { isEdit })
}

function isActive(uuid: number) {
  return chatStore.active === uuid
}
</script>

<template>
  <NScrollbar class="chat-history-scroll">
    <div class="chat-history-list">
      <template v-if="!dataSources.length">
        <div class="chat-history-empty">
          <SvgIcon icon="ri:inbox-line" class="chat-history-empty__icon" />
          <span>{{ $t('common.noData') }}</span>
        </div>
      </template>
      <template v-else>
        <div v-for="(item, index) of dataSources" :key="index">
          <a
            class="chat-history-item group"
            :class="{ 'chat-history-item--active': isActive(item.uuid) }"
            @click="handleSelect(item)"
          >
            <span class="chat-history-item__icon">
              <SvgIcon icon="ri:message-3-line" />
            </span>
            <div class="chat-history-item__title">
              <NInput
                v-if="item.isEdit"
                v-model:value="item.title"
                size="tiny"
                @keypress="handleEnter(item, false, $event)"
              />
              <span v-else class="chat-history-item__title-text">{{ item.title }}</span>
            </div>
            <div v-if="isActive(item.uuid)" class="chat-history-item__actions">
              <template v-if="item.isEdit">
                <button class="chat-history-item__action" @click="handleEdit(item, false, $event)">
                  <SvgIcon icon="ri:save-line" />
                </button>
              </template>
              <template v-else>
                <button class="chat-history-item__action" @click="handleEdit(item, true, $event)">
                  <SvgIcon icon="ri:edit-line" />
                </button>
                <NPopconfirm placement="bottom" @positive-click="handleDeleteDebounce(index, $event)">
                  <template #trigger>
                    <button class="chat-history-item__action">
                      <SvgIcon icon="ri:delete-bin-line" />
                    </button>
                  </template>
                  {{ $t('chat.deleteHistoryConfirm') }}
                </NPopconfirm>
              </template>
            </div>
          </a>
        </div>
      </template>
    </div>
  </NScrollbar>
</template>

<style scoped lang="less">
.chat-history-scroll {
  height: 100%;
  padding: 0 1rem;
}

.chat-history-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.chat-history-empty {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  color: var(--chat-text-muted);
}

.chat-history-empty__icon {
  margin-bottom: 0.375rem;
  font-size: 1.55rem;
}

.chat-history-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.625rem;
  border: 1px solid transparent;
  border-radius: 0.875rem;
  padding: 0.7rem 0.75rem;
  color: var(--chat-text-primary);
  background: color-mix(in oklab, var(--chat-panel-bg-soft) 86%, transparent);
  transition: all 0.2s ease;
}

.chat-history-item:hover {
  border-color: var(--chat-border-color);
  background: color-mix(in oklab, var(--chat-panel-bg) 90%, transparent);
}

.chat-history-item--active {
  border-color: color-mix(in oklab, var(--chat-accent) 55%, var(--chat-border-color));
  background: color-mix(in oklab, var(--chat-accent-soft) 38%, var(--chat-panel-bg-soft));
  padding-right: 5rem;
}

.chat-history-item__icon {
  color: var(--chat-text-muted);
}

.chat-history-item__title {
  position: relative;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.chat-history-item__title-text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-history-item__actions {
  position: absolute;
  right: 0.35rem;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 0.125rem;
}

.chat-history-item__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.9rem;
  height: 1.9rem;
  border-radius: 0.5rem;
  color: var(--chat-text-secondary);
  transition: all 0.2s ease;
}

.chat-history-item__action:hover {
  color: var(--chat-text-primary);
  background: color-mix(in oklab, var(--chat-panel-bg-strong) 88%, transparent);
}

@supports not (color: color-mix(in oklab, white 50%, black)) {
  .chat-history-item {
    background: var(--chat-panel-bg-soft);
  }

  .chat-history-item:hover {
    background: var(--chat-panel-bg);
  }

  .chat-history-item--active {
    background: var(--chat-accent-soft);
  }
}
</style>
