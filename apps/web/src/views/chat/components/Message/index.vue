<script setup lang="ts">
import { SvgIcon } from '@/components/common'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { useIconRender } from '@/hooks/useIconRender'
import { t } from '@/locales'
import { copyToClip } from '@/utils/copy'
import { NDropdown, useMessage } from 'naive-ui'
import { computed, ref, useTemplateRef } from 'vue'
import AvatarComponent from './Avatar.vue'
import TextComponent from './Text.vue'

interface Props {
  dateTime?: string
  text?: string
  inversion?: boolean
  error?: boolean
  loading?: boolean
  groupedWithPrevious?: boolean
  groupedWithNext?: boolean
  replyingToPrevious?: boolean
  followedByReply?: boolean
  beforeNextTurn?: boolean
}

const {
  dateTime,
  text,
  inversion,
  error,
  loading,
  groupedWithPrevious,
  groupedWithNext,
  replyingToPrevious,
  followedByReply,
  beforeNextTurn,
} = defineProps<Props>()

const emit = defineEmits<{
  regenerate: []
  delete: []
}>()

const { isMobile } = useBasicLayout()

const { iconRender } = useIconRender()

const message = useMessage()

const asRawText = ref(Boolean(inversion))

const messageRef = useTemplateRef<HTMLElement>('messageRef')

const options = computed(() => {
  const common = [
    ...(!inversion && isMobile.value
      ? [
          {
            label: t('chat.regenerate'),
            key: 'regenerate',
            icon: iconRender({ icon: 'ri:restart-line' }),
          },
        ]
      : []),
    {
      label: t('chat.copy'),
      key: 'copyText',
      icon: iconRender({ icon: 'ri:file-copy-2-line' }),
    },
    {
      label: t('common.delete'),
      key: 'delete',
      icon: iconRender({ icon: 'ri:delete-bin-line' }),
    },
  ]

  if (!inversion) {
    common.unshift({
      label: asRawText.value ? t('chat.preview') : t('chat.showRawText'),
      key: 'toggleRenderType',
      icon: iconRender({
        icon: asRawText.value ? 'ic:outline-code-off' : 'ic:outline-code',
      }),
    })
  }

  return common
})

function handleSelect(key: 'copyText' | 'delete' | 'toggleRenderType' | 'regenerate') {
  switch (key) {
    case 'copyText':
      handleCopy()
      return
    case 'regenerate':
      handleRegenerate()
      return
    case 'toggleRenderType':
      asRawText.value = !asRawText.value
      return
    case 'delete':
      emit('delete')
  }
}

function handleRegenerate() {
  messageRef.value?.scrollIntoView()
  emit('regenerate')
}

async function handleCopy() {
  try {
    await copyToClip(text || '')
    message.success(t('chat.copied'))
  } catch {
    message.error(t('chat.copyFailed'))
  }
}
</script>

<template>
  <div
    ref="messageRef"
    class="message-row group"
    :class="{
      'message-row-user': inversion,
      'message-row-grouped-top': groupedWithPrevious,
      'message-row-grouped-bottom': groupedWithNext,
      'message-row-replying': replyingToPrevious,
      'message-row-followed-by-reply': followedByReply,
      'message-row-before-next-turn': beforeNextTurn,
    }"
  >
    <div class="message-avatar" :class="{ 'message-avatar-grouped': groupedWithPrevious }">
      <div
        class="message-avatar__content"
        :class="{ 'message-avatar__content-hidden': groupedWithPrevious }"
      >
        <AvatarComponent :image="inversion" />
      </div>
    </div>
    <div
      class="message-shell"
      :class="{
        'message-shell-user': inversion,
        'message-shell-grouped': groupedWithPrevious,
      }"
    >
      <p
        v-if="!groupedWithPrevious"
        class="message-time"
        :class="{ 'message-time-user': inversion }"
      >
        <span class="message-time-pill">{{ dateTime }}</span>
      </p>
      <div class="message-content" :class="{ 'message-content-user': inversion }">
        <TextComponent
          :inversion="inversion"
          :error="error"
          :text="text"
          :loading="loading"
          :as-raw-text="asRawText"
          :grouped-with-previous="groupedWithPrevious"
          :grouped-with-next="groupedWithNext"
        />
        <div class="message-actions" :class="{ 'message-actions-user': inversion }">
          <button
            v-if="!inversion && !isMobile"
            type="button"
            aria-label="Regenerate response"
            class="message-action-btn"
            @click="handleRegenerate"
          >
            <SvgIcon icon="ri:restart-line" />
          </button>
          <NDropdown
            :trigger="isMobile ? 'click' : 'hover'"
            :placement="!inversion ? 'right' : 'left'"
            :options="options"
            @select="handleSelect"
          >
            <button type="button" aria-label="Open message actions" class="message-action-btn">
              <SvgIcon icon="ri:more-2-fill" />
            </button>
          </NDropdown>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.message-row {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  width: 100%;
  margin-bottom: 1.65rem;
}

.message-row-user {
  flex-direction: row-reverse;
}

.message-row-grouped-bottom {
  margin-bottom: 0.72rem;
}

.message-row-followed-by-reply {
  margin-bottom: 0.9rem;
}

.message-row-replying {
  margin-top: -0.08rem;
}

.message-row-before-next-turn {
  margin-bottom: 2rem;
}

.message-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  position: relative;
  width: 2.9rem;
  padding-top: 1.45rem;
}

.message-row-grouped-top .message-avatar::before,
.message-row-grouped-bottom .message-avatar::after {
  content: '';
  position: absolute;
  left: 50%;
  width: 1px;
  border-radius: 9999px;
  background: linear-gradient(180deg, rgba(148, 163, 184, 0.08), rgba(148, 163, 184, 0.32));
  transform: translateX(-50%);
}

.message-row-grouped-top .message-avatar::before {
  top: -0.8rem;
  bottom: 50%;
}

.message-row-grouped-bottom .message-avatar::after {
  top: calc(50% + 0.4rem);
  bottom: -0.92rem;
}

.message-row-user.message-row-grouped-top .message-avatar::before,
.message-row-user.message-row-grouped-bottom .message-avatar::after {
  background: linear-gradient(180deg, rgba(110, 231, 183, 0.08), rgba(52, 211, 153, 0.3));
}

.message-avatar-grouped {
  padding-top: 0.35rem;
}

.message-avatar__content {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.message-avatar__content-hidden {
  visibility: hidden;
}

.message-shell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex: 1 1 auto;
  min-width: 0;
  gap: 0.05rem;
  padding-inline-end: 0.4rem;
}

.message-shell-user {
  align-items: flex-end;
  padding-inline-start: 0.4rem;
  padding-inline-end: 0;
}

.message-shell-grouped {
  gap: 0;
}

.message-time {
  margin-bottom: 0.5rem;
  padding-inline: 0.2rem;
  font-size: 0.75rem;
  line-height: 1rem;
  color: rgb(148 163 184);
  width: fit-content;
  max-width: 100%;
}

.message-time-user {
  text-align: right;
  align-self: flex-end;
}

.message-row-replying .message-time {
  margin-bottom: 0.42rem;
}

.message-time-pill {
  display: inline-flex;
  align-items: center;
  min-height: 1.45rem;
  padding: 0.16rem 0.55rem;
  border-radius: 9999px;
  background: rgba(248, 250, 252, 0.92);
  border: 1px solid rgba(226, 232, 240, 0.92);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.85);
}

.message-content {
  display: flex;
  align-items: flex-start;
  gap: 0;
  width: min(100%, 44rem);
  position: relative;
}

.message-row-replying .message-content {
  width: min(100%, 46rem);
}

.message-content-user {
  flex-direction: row-reverse;
}

.message-actions {
  --message-action-shift: -0.38rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  justify-content: flex-start;
  align-items: center;
  position: absolute;
  top: 0.18rem;
  right: -2.65rem;
  width: auto;
  padding-top: 0;
  opacity: 0;
  pointer-events: none;
  transform: translateX(var(--message-action-shift));
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.message-actions-user {
  --message-action-shift: 0.38rem;
  right: auto;
  left: -2.65rem;
}

.group:hover .message-actions,
.message-actions:focus-within {
  opacity: 1;
  pointer-events: auto;
  transform: translateX(0);
}

.message-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.82);
  color: rgb(100 116 139);
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.08);
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease;
}

.message-action-btn:hover {
  transform: translateY(-1px);
  background-color: rgb(255 255 255);
  border-color: rgba(75, 158, 95, 0.28);
  color: rgb(29 78 216);
}

.message-row-user .message-action-btn {
  background: rgba(245, 247, 250, 0.92);
}

:global(.dark) .message-action-btn {
  border-color: rgba(71, 85, 105, 0.4);
  background: rgba(15, 23, 42, 0.86);
  color: rgb(148 163 184);
  box-shadow: 0 12px 24px rgba(2, 6, 23, 0.24);
}

:global(.dark) .message-action-btn:hover {
  background-color: rgba(30, 41, 59, 0.96);
  border-color: rgba(94, 234, 212, 0.25);
  color: rgb(226 232 240);
}

:global(.dark) .message-time-pill {
  background: rgba(15, 23, 42, 0.84);
  border-color: rgba(51, 65, 85, 0.92);
  box-shadow: inset 0 1px 0 rgba(148, 163, 184, 0.04);
}

:global(.dark) .message-row-grouped-top .message-avatar::before,
:global(.dark) .message-row-grouped-bottom .message-avatar::after {
  background: linear-gradient(180deg, rgba(71, 85, 105, 0.16), rgba(148, 163, 184, 0.28));
}

:global(.dark) .message-row-user.message-row-grouped-top .message-avatar::before,
:global(.dark) .message-row-user.message-row-grouped-bottom .message-avatar::after {
  background: linear-gradient(180deg, rgba(20, 83, 45, 0.14), rgba(52, 211, 153, 0.28));
}

@media (max-width: 640px) {
  .message-row {
    gap: 0.65rem;
    margin-bottom: 1.15rem;
  }

  .message-row-grouped-bottom {
    margin-bottom: 0.48rem;
  }

  .message-row-followed-by-reply {
    margin-bottom: 0.68rem;
  }

  .message-row-replying {
    margin-top: -0.04rem;
  }

  .message-row-before-next-turn {
    margin-bottom: 1.4rem;
  }

  .message-avatar {
    width: 2.2rem;
    padding-top: 1.25rem;
  }

  .message-avatar-grouped {
    padding-top: 0.2rem;
  }

  .message-row-grouped-top .message-avatar::before {
    top: -0.6rem;
  }

  .message-row-grouped-bottom .message-avatar::after {
    bottom: -0.62rem;
  }

  .message-time {
    margin-bottom: 0.35rem;
    font-size: 0.72rem;
  }

  .message-time-pill {
    min-height: 1.3rem;
    padding-inline: 0.48rem;
  }

  .message-content {
    width: 100%;
    gap: 0;
    padding-inline-end: 2.3rem;
    min-height: 2rem;
  }

  .message-content-user {
    padding-inline-start: 2.3rem;
    padding-inline-end: 0;
  }

  .message-actions {
    position: absolute;
    top: 0.1rem;
    right: 0;
    width: auto;
    padding-bottom: 0;
    opacity: 1;
    pointer-events: auto;
    transform: none;
  }

  .message-actions-user {
    right: auto;
    left: 0;
  }

  .message-action-btn {
    width: 1.8rem;
    height: 1.8rem;
    opacity: 1;
    box-shadow: 0 8px 16px rgba(15, 23, 42, 0.08);
  }
}
</style>
