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
  <div :class="wrapClass">
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
  border: 1px solid var(--app-border-soft);
  border-radius: 1.4rem;
  box-shadow: 0 14px 30px rgba(36, 50, 43, 0.06);
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
  max-inline-size: min(36rem, var(--app-reading-max-width));
  font-size: 0.95rem;
  line-height: var(--app-reading-line-height);
  letter-spacing: var(--app-reading-letter-spacing);
  word-break: break-word;
  text-wrap: pretty;
  color: var(--app-text-1);
}

.message-copy :deep(.markdown-body) {
  display: inline-block;
  width: auto;
  max-width: 100%;
  color: inherit;
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
  background: linear-gradient(135deg, var(--app-bubble-user-start), var(--app-bubble-user-end));
  color: var(--app-bubble-user-text);
}

.message-bubble-assistant {
  padding-inline: 1.1rem 1rem;
  border-top-left-radius: 0.7rem;
  background: linear-gradient(
    180deg,
    var(--app-bubble-assistant-start),
    var(--app-bubble-assistant-end)
  );
  color: var(--app-bubble-assistant-text);
}

.message-bubble-user.message-bubble-grouped-top {
  border-top-right-radius: 0.45rem;
  background: linear-gradient(135deg, var(--app-bubble-user-start), var(--app-bubble-user-end));
}

.message-bubble-user.message-bubble-grouped-bottom {
  border-bottom-right-radius: 0.45rem;
}

.message-bubble-assistant.message-bubble-grouped-top {
  border-top-left-radius: 0.45rem;
  background: linear-gradient(
    180deg,
    var(--app-bubble-assistant-start),
    var(--app-bubble-assistant-end)
  );
}

.message-bubble-assistant.message-bubble-grouped-bottom {
  border-bottom-left-radius: 0.45rem;
}

.message-bubble-grouped-top {
  box-shadow: 0 8px 18px rgba(36, 50, 43, 0.045);
}

.message-bubble-user .message-copy {
  max-inline-size: 30rem;
}

.message-bubble-assistant .message-copy {
  max-inline-size: 35rem;
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
