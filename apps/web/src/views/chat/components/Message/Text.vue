<script lang="ts" setup>
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { computed, defineAsyncComponent } from 'vue'

interface Props {
  inversion?: boolean
  error?: boolean
  text?: string
  loading?: boolean
  asRawText?: boolean
  groupedWithPrevious?: boolean
  groupedWithNext?: boolean
}

const props = defineProps<Props>()
const { isMobile } = useBasicLayout()
const MarkdownContent = defineAsyncComponent({
  loader: async () => await import('./MarkdownContent.vue'),
  suspensible: false,
})

const wrapClass = computed(() => {
  return [
    'message-bubble',
    'text-wrap',
    'min-w-[20px]',
    'max-w-full',
    isMobile.value ? 'message-bubble-mobile' : 'message-bubble-desktop',
    props.inversion ? 'message-bubble-user' : 'message-bubble-assistant',
    props.inversion ? 'message-request' : 'message-reply',
    {
      'message-bubble-grouped-top': props.groupedWithPrevious,
      'message-bubble-grouped-bottom': props.groupedWithNext,
    },
    { 'text-red-500': props.error },
  ]
})
</script>

<template>
  <div class="text-black" :class="wrapClass">
    <div class="message-copy break-words">
      <div v-if="asRawText" class="whitespace-pre-wrap" v-text="text" />
      <MarkdownContent v-else :content="text || ''" :final="!loading" :loading="loading" />
    </div>
  </div>
</template>

<style lang="less">
@import url(./style.less);
</style>

<style scoped>
.message-bubble {
  display: inline-flex;
  align-items: flex-start;
  width: fit-content;
  max-width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 1.4rem;
  box-shadow:
    0 14px 30px rgba(15, 23, 42, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
  transition:
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.message-bubble-desktop {
  padding: 0.95rem 1.15rem;
}

.message-bubble-mobile {
  padding: 0.9rem 1rem;
}

.message-copy {
  min-width: 0;
  max-width: 100%;
  max-inline-size: 36rem;
  font-size: 0.95rem;
  line-height: 1.74;
  word-break: break-word;
}

.message-copy :deep(.markdown-body) {
  display: inline-block;
  width: auto;
  max-width: 100%;
}

.message-copy :deep(.markdown-body > :first-child) {
  margin-top: 0;
}

.message-copy :deep(.markdown-body > :last-child) {
  margin-bottom: 0;
}

.message-bubble-user {
  padding-inline: 1rem 1rem;
  border-top-right-radius: 0.7rem;
  background: linear-gradient(135deg, rgba(212, 245, 207, 0.98), rgba(170, 229, 160, 0.96));
}

.message-bubble-assistant {
  padding-inline: 1.1rem 1rem;
  border-top-left-radius: 0.7rem;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(241, 245, 249, 0.95));
}

.message-bubble-user.message-bubble-grouped-top {
  border-top-right-radius: 0.45rem;
  background: linear-gradient(135deg, rgba(214, 246, 210, 0.98), rgba(177, 232, 168, 0.95));
}

.message-bubble-user.message-bubble-grouped-bottom {
  border-bottom-right-radius: 0.45rem;
}

.message-bubble-assistant.message-bubble-grouped-top {
  border-top-left-radius: 0.45rem;
  background: linear-gradient(180deg, rgba(252, 253, 255, 0.98), rgba(244, 247, 251, 0.95));
}

.message-bubble-assistant.message-bubble-grouped-bottom {
  border-bottom-left-radius: 0.45rem;
}

.message-bubble-grouped-top {
  box-shadow:
    0 8px 18px rgba(15, 23, 42, 0.045),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
}

.message-bubble-user .message-copy {
  max-inline-size: 30rem;
}

.message-bubble-assistant .message-copy {
  max-inline-size: 35rem;
}

:global(.dark) .message-bubble {
  border-color: rgba(100, 116, 139, 0.28);
  box-shadow:
    0 16px 36px rgba(2, 6, 23, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

:global(.dark) .message-bubble-grouped-top {
  box-shadow:
    0 10px 22px rgba(2, 6, 23, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

:global(.dark) .message-bubble-user {
  background: linear-gradient(135deg, rgba(64, 106, 66, 0.96), rgba(92, 145, 93, 0.92));
}

:global(.dark) .message-bubble-assistant {
  background: linear-gradient(180deg, rgba(28, 32, 39, 0.96), rgba(17, 24, 39, 0.94));
}

@media (max-width: 640px) {
  .message-bubble-mobile.message-bubble-user {
    padding-inline: 1rem 1rem;
  }

  .message-bubble-mobile.message-bubble-assistant {
    padding-inline: 1.05rem 0.95rem;
  }

  .message-copy,
  .message-bubble-user .message-copy,
  .message-bubble-assistant .message-copy {
    max-inline-size: 100%;
  }
}
</style>
