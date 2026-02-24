<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, useAttrs } from 'vue'

interface Props {
  icon?: string
}

const { icon } = defineProps<Props>()

const attrs = useAttrs()

const bindAttrs = computed(() => ({
  class: typeof attrs.class === 'string' ? attrs.class : '',
  style: typeof attrs.style === 'string' ? attrs.style : '',
}))
</script>

<template>
  <Icon :icon="icon || ''" v-bind="bindAttrs" />
</template>
