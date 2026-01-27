<script setup lang="ts">
import { SvgIcon } from '@/components/common'
import { computed } from 'vue'

interface ReasoningStep {
  step: number
  thought: string
  confidence: number
  duration?: number
}

interface Props {
  steps: ReasoningStep[]
  isVisible?: boolean
  isLoading?: boolean
}

// Use reactive props destructuring (Vue 3.5+ feature)
const { steps, isVisible = true, isLoading = false } = defineProps<Props>()

// Use defineEmits with modern syntax
const emit = defineEmits<{
  toggleVisibility: []
}>()

const sortedSteps = computed(() => [...steps].sort((a, b) => a.step - b.step))

const averageConfidence = computed(() => {
  if (steps.length === 0) return 0
  const total = steps.reduce((sum, step) => sum + step.confidence, 0)
  return Math.round(total / steps.length)
})

const totalDuration = computed(() => {
  return steps.reduce((sum, step) => sum + (step.duration || 0), 0)
})

function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return 'text-green-600 dark:text-green-400'
  if (confidence >= 60) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function handleToggle() {
  emit('toggleVisibility')
}
</script>

<template>
  <div
    class="reasoning-steps-container border rounded-lg bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
  >
    <!-- Header -->
    <div
      class="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      @click="handleToggle"
    >
      <div class="flex items-center space-x-2">
        <SvgIcon icon="ri:brain-line" class="text-blue-500 dark:text-blue-400 text-lg" />
        <h4 class="font-medium text-gray-900 dark:text-gray-100">
Reasoning Process
</h4>
        <span class="text-sm text-gray-500 dark:text-gray-400">({{ steps.length }} steps)</span>
      </div>

      <div class="flex items-center space-x-3">
        <!-- Average Confidence -->
        <div class="flex items-center space-x-1">
          <SvgIcon icon="ri:pulse-line" class="text-xs" />
          <span class="text-xs" :class="getConfidenceColor(averageConfidence)">
            {{ averageConfidence }}%
          </span>
        </div>

        <!-- Total Duration -->
        <div v-if="totalDuration > 0" class="flex items-center space-x-1">
          <SvgIcon icon="ri:time-line" class="text-xs" />
          <span class="text-xs text-gray-500 dark:text-gray-400">
            {{ formatDuration(totalDuration) }}
          </span>
        </div>

        <!-- Toggle Icon -->
        <SvgIcon
          :icon="isVisible ? 'ri:arrow-up-s-line' : 'ri:arrow-down-s-line'"
          class="text-gray-400 transition-transform"
        />
      </div>
    </div>

    <!-- Steps Content -->
    <Transition
      name="reasoning-steps"
      enter-active-class="transition-all duration-300 ease-out"
      leave-active-class="transition-all duration-300 ease-in"
      enter-from-class="opacity-0 max-h-0"
      enter-to-class="opacity-100 max-h-96"
      leave-from-class="opacity-100 max-h-96"
      leave-to-class="opacity-0 max-h-0"
    >
      <div v-if="isVisible" class="border-t border-gray-200 dark:border-gray-700">
        <!-- Loading State -->
        <div v-if="isLoading" class="p-4">
          <div class="flex items-center space-x-2 text-blue-500 dark:text-blue-400">
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
            <span class="text-sm">Processing reasoning steps...</span>
          </div>
        </div>

        <!-- Steps List -->
        <div v-else class="max-h-96 overflow-y-auto">
          <div
            v-for="step in sortedSteps"
            :key="step.step"
            class="p-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
          >
            <div class="flex items-start space-x-3">
              <!-- Step Number -->
              <div
                class="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-medium"
              >
                {{ step.step }}
              </div>

              <!-- Step Content -->
              <div class="flex-1 min-w-0">
                <p class="text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
                  {{ step.thought }}
                </p>

                <!-- Step Metadata -->
                <div class="flex items-center space-x-4 mt-2">
                  <!-- Confidence -->
                  <div class="flex items-center space-x-1">
                    <SvgIcon icon="ri:pulse-line" class="text-xs" />
                    <span class="text-xs" :class="getConfidenceColor(step.confidence)">
                      {{ step.confidence }}% confidence
                    </span>
                  </div>

                  <!-- Duration -->
                  <div v-if="step.duration" class="flex items-center space-x-1">
                    <SvgIcon icon="ri:time-line" class="text-xs text-gray-400" />
                    <span class="text-xs text-gray-500 dark:text-gray-400">
                      {{ formatDuration(step.duration) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="!isLoading && steps.length === 0" class="p-4 text-center">
          <SvgIcon
            icon="ri:brain-line"
            class="text-gray-300 dark:text-gray-600 text-2xl mx-auto mb-2"
          />
          <p class="text-sm text-gray-500 dark:text-gray-400">
No reasoning steps available
</p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.reasoning-steps-container {
  overflow: hidden;
}

.reasoning-steps-enter-active,
.reasoning-steps-leave-active {
  overflow: hidden;
}
</style>
