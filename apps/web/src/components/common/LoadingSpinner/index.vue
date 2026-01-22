<script setup lang="ts">
interface Props {
	size?: 'small' | 'medium' | 'large';
	text?: string;
}

// Use reactive props destructuring (Vue 3.5+ feature)
const { size = 'medium', text = 'Loading...' } = defineProps<Props>()

const sizeClasses = {
	small: 'h-4 w-4',
	medium: 'h-6 w-6',
	large: 'h-8 w-8',
}
</script>

<template>
	<div class="flex items-center justify-center h-full">
		<div class="flex flex-col items-center space-y-4">
			<div
				class="animate-spin rounded-full border-b-2 border-blue-500"
				:class="sizeClasses[size]"
			/>
			<p class="text-sm text-gray-500 dark:text-gray-400">
				{{ text }}
			</p>
		</div>
	</div>
</template>
