<script setup lang="ts">
import { SvgIcon } from '@/components/common'
import { computed, onMounted, onUnmounted, ref } from 'vue'

interface Props {
	isVisible?: boolean;
	estimatedTime?: number; // in seconds
	currentStep?: string;
}

// Use reactive props destructuring (Vue 3.5+ feature)
const {
	isVisible = false,
	estimatedTime = 30,
	currentStep = 'Analyzing your question...',
} = defineProps<Props>()

const elapsedTime = ref(0)
const intervalId = ref<number | null>(null)

const progress = computed(() => {
	if (estimatedTime <= 0) return 0
	return Math.min((elapsedTime.value / estimatedTime) * 100, 95) // Cap at 95% until complete
})

const formattedElapsedTime = computed(() => {
	const minutes = Math.floor(elapsedTime.value / 60)
	const seconds = elapsedTime.value % 60
	if (minutes > 0) {
		return `${minutes}:${seconds.toString().padStart(2, '0')}`
	}
	return `${seconds}s`
})

const formattedEstimatedTime = computed(() => {
	const minutes = Math.floor(estimatedTime / 60)
	const seconds = estimatedTime % 60
	if (minutes > 0) {
		return `~${minutes}:${seconds.toString().padStart(2, '0')}`
	}
	return `~${estimatedTime}s`
})

const reasoningSteps = [
	'Analyzing your question...',
	'Breaking down the problem...',
	'Considering multiple approaches...',
	'Evaluating potential solutions...',
	'Refining the reasoning...',
	'Finalizing the response...',
]

const currentStepIndex = computed(() => {
	const stepIndex = Math.floor(
		(elapsedTime.value / estimatedTime) * reasoningSteps.length,
	)
	return Math.min(stepIndex, reasoningSteps.length - 1)
})

const displayStep = computed(() => {
	return currentStep || reasoningSteps[currentStepIndex.value]
})

function startTimer() {
	if (intervalId.value) return

	intervalId.value = window.setInterval(() => {
		elapsedTime.value += 1
	}, 1000)
}

function stopTimer() {
	if (intervalId.value) {
		clearInterval(intervalId.value)
		intervalId.value = null
	}
}

function resetTimer() {
	elapsedTime.value = 0
	stopTimer()
}

// Watch for visibility changes
onMounted(() => {
	if (isVisible) {
		startTimer()
	}
})

onUnmounted(() => {
	stopTimer()
})

// Expose methods for parent component control
defineExpose({
	startTimer,
	stopTimer,
	resetTimer,
})
</script>

<template>
	<Transition
		name="reasoning-loader"
		enter-active-class="transition-all duration-300 ease-out"
		leave-active-class="transition-all duration-300 ease-in"
		enter-from-class="opacity-0 transform scale-95"
		enter-to-class="opacity-100 transform scale-100"
		leave-from-class="opacity-100 transform scale-100"
		leave-to-class="opacity-0 transform scale-95"
	>
		<div
			v-if="isVisible"
			class="reasoning-loader bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
		>
			<!-- Header -->
			<div class="flex items-center space-x-3 mb-3">
				<div class="relative">
					<SvgIcon
						icon="ri:brain-line"
						class="text-blue-500 dark:text-blue-400 text-xl animate-pulse"
					/>
					<div
						class="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-ping"
					/>
				</div>
				<div>
					<h4 class="font-medium text-blue-900 dark:text-blue-100">
						Reasoning Model Processing
					</h4>
					<p class="text-xs text-blue-600 dark:text-blue-300">
						This may take longer than usual responses
					</p>
				</div>
			</div>

			<!-- Current Step -->
			<div class="mb-3">
				<div
					class="text-sm text-blue-800 dark:text-blue-200 flex items-center space-x-2"
				>
					<div
						class="animate-spin rounded-full h-3 w-3 border-b border-blue-500"
					/>
					<span>{{ displayStep }}</span>
				</div>
			</div>

			<!-- Progress Bar -->
			<div class="mb-3">
				<div
					class="flex justify-between text-xs text-blue-600 dark:text-blue-300 mb-1"
				>
					<span>Progress</span>
					<span>{{ Math.round(progress) }}%</span>
				</div>
				<div class="w-full bg-blue-100 dark:bg-blue-800 rounded-full h-2">
					<div
						class="bg-blue-500 dark:bg-blue-400 h-2 rounded-full transition-all duration-1000 ease-out"
						:style="{ width: `${progress}%` }"
					/>
				</div>
			</div>

			<!-- Time Information -->
			<div
				class="flex justify-between items-center text-xs text-blue-600 dark:text-blue-300"
			>
				<div class="flex items-center space-x-1">
					<SvgIcon icon="ri:time-line" class="text-xs" />
					<span>Elapsed: {{ formattedElapsedTime }}</span>
				</div>
				<div class="flex items-center space-x-1">
					<SvgIcon icon="ri:timer-line" class="text-xs" />
					<span>Expected: {{ formattedEstimatedTime }}</span>
				</div>
			</div>

			<!-- Reasoning Steps Indicator -->
			<div class="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
				<div class="flex items-center justify-between">
					<span class="text-xs text-blue-600 dark:text-blue-300">Reasoning Steps:</span>
					<div class="flex space-x-1">
						<div
							v-for="(step, index) in reasoningSteps"
							:key="index"
							class="w-2 h-2 rounded-full transition-colors duration-300"
							:class="{
								'bg-blue-500 dark:bg-blue-400': index <= currentStepIndex,
								'bg-blue-200 dark:bg-blue-700': index > currentStepIndex,
							}"
							:title="step"
						/>
					</div>
				</div>
			</div>
		</div>
	</Transition>
</template>

<style scoped>
.reasoning-loader {
  animation: gentle-pulse 2s ease-in-out infinite;
}

@keyframes gentle-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.1);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.05);
  }
}
</style>
