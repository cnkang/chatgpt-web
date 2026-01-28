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
    const reasoningModels = ['o1-preview', 'o1-mini', 'o1']
    isReasoningModel.value = reasoningModels.some(model => modelName.toLowerCase().includes(model))
  }

  function toggleReasoningStepsVisibility() {
    showReasoningSteps.value = !showReasoningSteps.value
  }

  function getEstimatedTimeForModel(modelName: string): number {
    // Return estimated reasoning time based on model
    if (modelName.includes('o1-preview')) return 45
    if (modelName.includes('o1-mini')) return 25
    if (modelName.includes('o1')) return 35
    return 30
  }

  // Parse reasoning steps from API response
  function parseReasoningFromResponse(response: unknown): ReasoningStep[] {
    // This would parse the actual API response format
    // For now, return empty array as the format depends on the API
    const steps = (response as { reasoning_steps?: ReasoningStepInput[] })?.reasoning_steps
    if (Array.isArray(steps)) {
      return steps.map((step, index) => ({
        step: index + 1,
        thought: step.content || step.thought || '',
        confidence: step.confidence || 75,
        duration: step.duration || undefined,
      }))
    }
    return []
  }

  // Simulate reasoning steps for demo purposes
  function simulateReasoningSteps() {
    const demoSteps = [
      {
        thought:
          "Let me break down this problem into its core components to understand what's being asked.",
        confidence: 85,
        duration: 2000,
      },
      {
        thought:
          'I need to consider multiple approaches and evaluate which would be most effective for this specific case.',
        confidence: 78,
        duration: 3500,
      },
      {
        thought:
          'Looking at the constraints and requirements, I can narrow down the solution space significantly.',
        confidence: 92,
        duration: 2800,
      },
      {
        thought:
          'Let me verify this approach by checking it against edge cases and potential issues.',
        confidence: 88,
        duration: 4200,
      },
    ]

    demoSteps.forEach((step, index) => {
      setTimeout(() => {
        addReasoningStep(step)
        updateCurrentStep(`Processing step ${index + 2}...`)
      }, index * 3000)
    })

    setTimeout(() => {
      stopReasoning()
    }, demoSteps.length * 3000)
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
    simulateReasoningSteps,
  }
}
