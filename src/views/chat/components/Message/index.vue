<script setup lang='ts'>
import { NDropdown, useMessage } from 'naive-ui'
import { computed, ref } from 'vue'
import { SvgIcon } from '@/components/common'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { useIconRender } from '@/hooks/useIconRender'
import { t } from '@/locales'
import { copyToClip } from '@/utils/copy'
import AvatarComponent from './Avatar.vue'
import TextComponent from './Text.vue'

interface Props {
  dateTime?: string
  text?: string
  inversion?: boolean
  error?: boolean
  loading?: boolean
}

interface Emit {
  (ev: 'regenerate'): void
  (ev: 'delete'): void
}

const props = defineProps<Props>()

const emit = defineEmits<Emit>()

const { isMobile } = useBasicLayout()

const { iconRender } = useIconRender()

const message = useMessage()

const asRawText = ref(props.inversion)

const messageRef = ref<HTMLElement>()

const options = computed(() => {
  const common = [
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

  if (!props.inversion) {
    common.unshift({
      label: asRawText.value ? t('chat.preview') : t('chat.showRawText'),
      key: 'toggleRenderType',
      icon: iconRender({ icon: asRawText.value ? 'ic:outline-code-off' : 'ic:outline-code' }),
    })
  }

  return common
})

function handleSelect(key: 'copyText' | 'delete' | 'toggleRenderType') {
  switch (key) {
    case 'copyText':
      handleCopy()
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
    await copyToClip(props.text || '')
    message.success(t('chat.copied'))
  }
  catch {
    message.error(t('chat.copyFailed'))
  }
}
</script>

<template>
  <div
    ref="messageRef"
    class="chat-message"
    :class="{ 'chat-message--user': inversion }"
  >
    <div
      class="chat-message__avatar"
      :class="{ 'chat-message__avatar--user': inversion }"
    >
      <AvatarComponent :image="inversion" />
    </div>
    <div class="chat-message__body">
      <p class="chat-message__time" :class="{ 'chat-message__time--user': inversion }">
        {{ dateTime }}
      </p>
      <div
        class="chat-message__content-row"
        :class="{ 'chat-message__content-row--user': inversion }"
      >
        <TextComponent
          class="chat-message__bubble"
          ref="textRef"
          :inversion="inversion"
          :error="error"
          :text="text"
          :loading="loading"
          :as-raw-text="asRawText"
        />
        <div class="chat-message__actions">
          <button
            v-if="!inversion"
            class="chat-message__action-btn chat-message__action-btn--refresh"
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
            <button class="chat-message__action-btn">
              <SvgIcon icon="ri:more-2-fill" />
            </button>
          </NDropdown>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.chat-message {
  display: flex;
  width: 100%;
  margin-bottom: 1.35rem;
  overflow: hidden;
  animation: message-slide-in 0.24s ease;
}

.chat-message--user {
  flex-direction: row-reverse;
}

.chat-message__avatar {
  display: flex;
  width: 2.25rem;
  height: 2.25rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 999px;
  margin-right: 0.55rem;
  border: 1px solid var(--chat-border-color);
}

.chat-message__avatar--user {
  margin-right: 0;
  margin-left: 0.55rem;
}

.chat-message__body {
  min-width: 0;
  overflow: hidden;
  font-size: 0.875rem;
}

.chat-message__time {
  text-align: left;
  font-size: 0.72rem;
  color: var(--chat-text-muted);
  letter-spacing: 0.015em;
}

.chat-message__time--user {
  text-align: right;
}

.chat-message__content-row {
  display: flex;
  margin-top: 0.45rem;
  align-items: flex-end;
  gap: 0.35rem;
}

.chat-message__content-row--user {
  flex-direction: row-reverse;
}

.chat-message__bubble {
  max-width: min(100%, 78ch);
}

.chat-message__actions {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  opacity: 0.66;
  transition: opacity 0.2s ease;
}

.chat-message__action-btn {
  display: inline-flex;
  width: 1.75rem;
  height: 1.75rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  color: var(--chat-text-muted);
  transition: all 0.2s ease;
}

.chat-message__action-btn:hover {
  color: var(--chat-text-primary);
  background: color-mix(in oklab, var(--chat-panel-bg-strong) 86%, transparent);
}

.chat-message__action-btn--refresh {
  margin-bottom: 0.1rem;
}

.chat-message:hover .chat-message__actions {
  opacity: 1;
}

@media (max-width: 639.98px) {
  .chat-message {
    margin-bottom: 1rem;
  }

  .chat-message__avatar {
    width: 2rem;
    height: 2rem;
  }

  .chat-message__bubble {
    max-width: 100%;
  }

  .chat-message__actions {
    opacity: 1;
  }
}

@supports not (color: color-mix(in oklab, white 50%, black)) {
  .chat-message__action-btn:hover {
    background: var(--chat-panel-bg-strong);
  }
}

@keyframes message-slide-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
