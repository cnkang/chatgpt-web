<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, useAttrs } from 'vue'

interface Props {
	icon?: string;
}

// Use reactive props destructuring (Vue 3.5+ feature)
const { icon } = defineProps<Props>()

const attrs = useAttrs()

const bindAttrs = computed<{ class: string; style: string }>(() => ({
	class: (attrs.class as string) || '',
	style: (attrs.style as string) || '',
}))
</script>

<template>
	<Icon :icon="icon || ''" v-bind="bindAttrs" />
</template>
