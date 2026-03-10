import { computed, ref } from 'vue'

interface ReasoningStep {
  step: number
  thought: string
  confidence: number
  duration?: number
}

interface ReasoningState {
  isReasoning: boolean
  steps: ReasoningStep[]
  currentStep: string
  estimatedTime: number
  startTime: number | null
}

interface ReasoningStepInput {
  content?: string
  thought?: string
  confidence?: number
  duration?: number
}

function getEstimatedTimeForModel(modelName: string): number {
  if (modelName.includes('o3') && !modelName.includes('mini')) return 45
  if (modelName.includes('o4-mini')) return 20
  if (modelName.includes('o3-mini')) return 25
  return 30
}

function parseReasoningFromResponse(response: unknown): ReasoningStep[] {
  const steps = (response as { reasoning_steps?: ReasoningStepInput[] })?.reasoning_steps
  if (!Array.isArray(steps)) return []

  return steps.map((step, index) => ({
    step: index + 1,
    thought: step.content || step.thought || '',
    confidence: step.confidence || 75,
    duration: step.duration || undefined,
  }))
}

/**
 * Provides reactive state, computed properties, and methods for tracking and managing a step-by-step reasoning session.
 *
 * The returned API includes:
 * - state: computed ReasoningState containing session flags, steps, currentStep, estimatedTime, and startTime
 * - isReasoningModel: computed boolean indicating whether the selected model supports reasoning
 * - showReasoningSteps: computed boolean controlling visibility of the step list
 * - hasReasoningSteps: computed boolean true when there are recorded steps
 * - averageConfidence: computed average confidence across recorded steps (0 when no steps)
 * - totalReasoningTime: computed elapsed time in milliseconds since reasoning started (0 when not started)
 * - startReasoning(estimatedTime?): begins a reasoning session and initializes timing and state
 * - stopReasoning(): ends the reasoning session and clears the current step
 * - addReasoningStep(step): appends a new numbered reasoning step
 * - updateCurrentStep(step): updates the transient current step text
 * - clearReasoningSteps(): removes all recorded steps
 * - setReasoningModel(modelName): marks whether a model supports reasoning based on its name
 * - toggleReasoningStepsVisibility(): toggles visibility of the step list
 * - getEstimatedTimeForModel: helper to get a default estimated time for a model name
 * - parseReasoningFromResponse: helper to extract reasoning steps from an API response
 *
 * @returns An object exposing the reactive state, computed properties, control methods, and helper functions for reasoning session management
 */
export function useReasoning() {
  const state = ref<ReasoningState>({
    isReasoning: false,
    steps: [],
    currentStep: '',
    estimatedTime: 30,
    startTime: null,
  })

  const isReasoningModel = ref(false)
  const showReasoningSteps = ref(true)

  // Computed properties
  const hasReasoningSteps = computed(() => state.value.steps.length > 0)

  const averageConfidence = computed(() => {
    if (state.value.steps.length === 0) return 0
    const total = state.value.steps.reduce((sum, step) => sum + step.confidence, 0)
    return Math.round(total / state.value.steps.length)
  })

  const totalReasoningTime = computed(() => {
    if (!state.value.startTime) return 0
    return Date.now() - state.value.startTime
  })

  // Methods
  function startReasoning(estimatedTime = 30) {
    state.value.isReasoning = true
    state.value.steps = []
    state.value.estimatedTime = estimatedTime
    state.value.startTime = Date.now()
    state.value.currentStep = 'Initializing reasoning process...'
  }

  function stopReasoning() {
    state.value.isReasoning = false
    state.value.currentStep = ''
  }

  function addReasoningStep(step: Omit<ReasoningStep, 'step'>) {
    const newStep: ReasoningStep = {
      step: state.value.steps.length + 1,
      ...step,
    }
    state.value.steps.push(newStep)
  }

  function updateCurrentStep(step: string) {
    state.value.currentStep = step
  }

  function clearReasoningSteps() {
    state.value.steps = []
  }

  function setReasoningModel(modelName: string) {
    // Check if the model supports reasoning
    const reasoningModels = ['o3', 'o3-mini', 'o4-mini']
    isReasoningModel.value = reasoningModels.some(model => modelName.toLowerCase().includes(model))
  }

  function toggleReasoningStepsVisibility() {
    showReasoningSteps.value = !showReasoningSteps.value
  }

  return {
    // State
    state: computed(() => state.value),
    isReasoningModel: computed(() => isReasoningModel.value),
    showReasoningSteps: computed(() => showReasoningSteps.value),

    // Computed
    hasReasoningSteps,
    averageConfidence,
    totalReasoningTime,

    // Methods
    startReasoning,
    stopReasoning,
    addReasoningStep,
    updateCurrentStep,
    clearReasoningSteps,
    setReasoningModel,
    toggleReasoningStepsVisibility,
    getEstimatedTimeForModel,
    parseReasoningFromResponse,
  }
}
