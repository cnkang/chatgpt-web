<script lang="ts" setup>
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { computed, defineAsyncComponent } from 'vue'

interface Props {
  inversion?: boolean
  error?: boolean
  text?: string
  loading?: boolean
  asRawText?: boolean
}

const props = defineProps<Props>()
const { isMobile } = useBasicLayout()
const MarkdownContent = defineAsyncComponent({
  loader: async () => await import('./MarkdownContent.vue'),
  suspensible: false,
})

const wrapClass = computed(() => {
  return [
    'text-wrap',
    'min-w-[20px]',
    'rounded-md',
    isMobile.value ? 'p-2' : 'px-3 py-2',
    props.inversion ? 'bg-[#d2f9d1]' : 'bg-[#f4f6f8]',
    props.inversion ? 'dark:bg-[#a1dc95]' : 'dark:bg-[#1e1e20]',
    props.inversion ? 'message-request' : 'message-reply',
    { 'text-red-500': props.error },
  ]
})
</script>

<template>
  <div class="text-black" :class="wrapClass">
    <div class="leading-relaxed break-words">
      <div v-if="asRawText" class="whitespace-pre-wrap" v-text="text" />
      <MarkdownContent v-else :content="text || ''" :final="!loading" :loading="loading" />
    </div>
  </div>
</template>

<style lang="less">
@import url(./style.less);
</style>
