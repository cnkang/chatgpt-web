<script setup lang="ts">
import { SvgIcon } from '@/components/common'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { useAppStore, useChatStore } from '@/store'
import { debounce } from '@/utils/functions/debounce'
import type { History } from '@chatgpt-web/shared'
import { NInput, NPopconfirm, NScrollbar } from 'naive-ui'
import { computed } from 'vue'

const { isMobile } = useBasicLayout()

const appStore = useAppStore()
const chatStore = useChatStore()

const dataSources = computed(() => chatStore.history)

async function handleSelect({ uuid }: History) {
  if (isActive(uuid)) return

  if (chatStore.active) chatStore.updateHistory(chatStore.active, { isEdit: false })
  await chatStore.setActive(uuid)

  if (isMobile.value) appStore.setSiderCollapsed(true)
}

function handleEdit({ uuid }: History, isEdit: boolean, event?: MouseEvent) {
  event?.stopPropagation()
  chatStore.updateHistory(uuid, { isEdit })
}

function handleDelete(index: number, event?: MouseEvent | TouchEvent) {
  event?.stopPropagation()
  chatStore.deleteHistory(index)
  if (isMobile.value) appStore.setSiderCollapsed(true)
}

const handleDeleteDebounce = debounce(handleDelete, 600)

function handleEnter({ uuid }: History, isEdit: boolean, event: KeyboardEvent) {
  if (event.isComposing) return
  event?.stopPropagation()
  if (event.key === 'Enter') chatStore.updateHistory(uuid, { isEdit })
}

function isActive(uuid: number) {
  return chatStore.active === uuid
}
</script>

<template>
  <NScrollbar class="px-4">
    <div class="flex flex-col gap-2 text-sm">
      <template v-if="!dataSources.length">
        <div class="flex flex-col items-center mt-4 text-center text-neutral-300">
          <SvgIcon icon="ri:inbox-line" class="mb-2 text-3xl" />
          <span>{{ $t('common.noData') }}</span>
        </div>
      </template>
      <template v-else>
        <div v-for="(item, index) of dataSources" :key="item.uuid">
          <a
            class="history-item group"
            :class="isActive(item.uuid) && ['history-item-active']"
            @click="handleSelect(item)"
          >
            <span class="history-item-icon">
              <SvgIcon icon="ri:message-3-line" />
            </span>
            <div class="history-item-title">
              <NInput
                v-if="item.isEdit"
                v-model:value="item.title"
                size="tiny"
                @keydown="handleEnter(item, false, $event)"
              />
              <span v-else>{{ item.title }}</span>
            </div>
            <div
              class="history-item-actions"
              :class="{ 'history-item-actions-visible': isActive(item.uuid) }"
            >
              <template v-if="item.isEdit">
                <button
                  type="button"
                  class="history-action-btn"
                  :aria-label="$t('common.saveChatTitle')"
                  @click="handleEdit(item, false, $event)"
                >
                  <SvgIcon icon="ri:save-line" />
                </button>
              </template>
              <template v-else>
                <button
                  type="button"
                  class="history-action-btn"
                  :aria-label="$t('common.editChatTitle')"
                  @click="handleEdit(item, true, $event)"
                >
                  <SvgIcon icon="ri:edit-line" />
                </button>
                <NPopconfirm
                  placement="bottom"
                  @positive-click="handleDeleteDebounce(index, $event)"
                >
                  <template #trigger>
                    <button
                      type="button"
                      class="history-action-btn"
                      :aria-label="$t('common.deleteChat')"
                      @click.stop
                    >
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

<style scoped>
.history-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 0.9rem;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 1rem;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(248, 250, 252, 0.92));
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.04);
}

.history-item:hover {
  transform: translateY(-1px);
  border-color: rgba(75, 158, 95, 0.24);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(241, 245, 249, 0.98));
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
}

.history-item-active {
  color: rgb(58 121 72);
  border-color: rgba(75, 158, 95, 0.48);
  background: linear-gradient(135deg, rgba(237, 247, 233, 0.98), rgba(227, 244, 221, 0.94));
  box-shadow: 0 16px 34px rgba(75, 158, 95, 0.12);
}

.history-item-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 1.9rem;
  height: 1.9rem;
  border-radius: 0.8rem;
  background: rgba(255, 255, 255, 0.76);
  color: rgb(100 116 139);
}

.history-item-title {
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-item-actions {
  z-index: 10;
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding-left: 0.5rem;
  flex: 0 0 4.4rem;
  justify-content: flex-end;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition:
    opacity 0.2s ease,
    visibility 0s linear 0.2s;
}

.group:hover .history-item-actions,
.group:focus-within .history-item-actions,
.history-item-actions-visible {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transition-delay: 0s;
}

.history-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.875rem;
  height: 1.875rem;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 0.65rem;
  background: rgba(255, 255, 255, 0.72);
  color: rgb(100 116 139);
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease;
}

.history-action-btn:hover {
  transform: translateY(-1px);
  background-color: rgb(255 255 255);
  border-color: rgba(75, 158, 95, 0.25);
  color: rgb(15 23 42);
}

:global(.dark) .history-item {
  border-color: rgba(71, 85, 105, 0.34);
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.94), rgba(17, 24, 39, 0.9));
  box-shadow: 0 16px 30px rgba(2, 6, 23, 0.24);
}

:global(.dark) .history-item:hover {
  border-color: rgba(94, 234, 212, 0.18);
  background: linear-gradient(180deg, rgba(30, 41, 59, 0.96), rgba(15, 23, 42, 0.94));
}

:global(.dark) .history-item-active {
  color: rgb(167 243 208);
  border-color: rgba(94, 234, 212, 0.34);
  background: linear-gradient(135deg, rgba(20, 83, 45, 0.72), rgba(15, 23, 42, 0.94));
}

:global(.dark) .history-item-icon,
:global(.dark) .history-action-btn {
  background: rgba(30, 41, 59, 0.88);
  border-color: rgba(71, 85, 105, 0.44);
  color: rgb(203 213 225);
}

:global(.dark) .history-action-btn:hover {
  background-color: rgba(51, 65, 85, 0.96);
  color: rgb(248 250 252);
}

@media (max-width: 640px) {
  .history-item {
    padding: 0.75rem;
    gap: 0.65rem;
  }

  .history-item-actions {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    flex-basis: 4rem;
  }
}
</style>
