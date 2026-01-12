<script setup lang="ts">
import { SvgIcon } from '@/components/common'
import { NSelect, NTag, NTooltip } from 'naive-ui'
import type { SelectGroupOption, SelectOption } from 'naive-ui'
import { computed } from 'vue'

interface ModelOption {
	value: string
	label: string
	description: string
	supportsReasoning: boolean
	maxTokens: number
	costMultiplier: number
	speed: 'fast' | 'medium' | 'slow'
}

interface Props {
	modelValue: string
	disabled?: boolean
	showReasoningInfo?: boolean
}

// Use reactive props destructuring (Vue 3.5+ feature)
const { modelValue, disabled = false, showReasoningInfo = true } = defineProps<Props>()

// Use defineEmits with modern syntax
const emit = defineEmits<{
	'update:modelValue': [value: string]
}>()

const modelOptions: ModelOption[] = [
	{
		value: 'gpt-4o',
		label: 'GPT-4o',
		description: 'Latest GPT-4 optimized model with multimodal capabilities',
		supportsReasoning: false,
		maxTokens: 128000,
		costMultiplier: 1,
		speed: 'fast',
	},
	{
		value: 'gpt-4o-mini',
		label: 'GPT-4o Mini',
		description: 'Smaller, faster version of GPT-4o',
		supportsReasoning: false,
		maxTokens: 128000,
		costMultiplier: 0.1,
		speed: 'fast',
	},
	{
		value: 'o1-preview',
		label: 'o1-preview',
		description: 'Advanced reasoning model for complex problem-solving',
		supportsReasoning: true,
		maxTokens: 32768,
		costMultiplier: 15,
		speed: 'slow',
	},
	{
		value: 'o1-mini',
		label: 'o1-mini',
		description: 'Faster reasoning model for coding and math',
		supportsReasoning: true,
		maxTokens: 65536,
		costMultiplier: 3,
		speed: 'medium',
	},
]

const selectedModel = computed(() => modelOptions.find(model => model.value === modelValue))

const reasoningModels = computed(() => modelOptions.filter(model => model.supportsReasoning))

const standardModels = computed(() => modelOptions.filter(model => !model.supportsReasoning))

const selectOptions = computed(() => {
	const options: Array<SelectOption | SelectGroupOption> = []

	// Standard Models Group
	if (standardModels.value.length > 0) {
		options.push({
			type: 'group',
			label: 'Standard Models',
			key: 'standard',
			children: standardModels.value.map(model => ({
				label: model.label,
				value: model.value,
				disabled,
			})),
		})
	}

	// Reasoning Models Group
	if (reasoningModels.value.length > 0) {
		options.push({
			type: 'group',
			label: 'Reasoning Models',
			key: 'reasoning',
			children: reasoningModels.value.map(model => ({
				label: model.label,
				value: model.value,
				disabled,
			})),
		})
	}

	return options
})

function handleModelChange(value: string) {
	emit('update:modelValue', value)
}

function getSpeedIcon(speed: string): string {
	switch (speed) {
		case 'fast':
			return 'ri:flashlight-line'
		case 'medium':
			return 'ri:timer-line'
		case 'slow':
			return 'ri:hourglass-line'
		default:
			return 'ri:timer-line'
	}
}

function getSpeedColor(speed: string): string {
	switch (speed) {
		case 'fast':
			return 'text-green-500 dark:text-green-400'
		case 'medium':
			return 'text-yellow-500 dark:text-yellow-400'
		case 'slow':
			return 'text-red-500 dark:text-red-400'
		default:
			return 'text-gray-500 dark:text-gray-400'
	}
}

function formatCost(multiplier: number): string {
	if (multiplier === 1) return 'Standard'
	if (multiplier < 1) return `${Math.round(multiplier * 100)}% of standard`
	return `${multiplier}x standard cost`
}
</script>

<template>
	<div class="model-selector space-y-3">
		<!-- Model Selection -->
		<div class="space-y-2">
			<label class="block text-sm font-medium text-gray-700 dark:text-gray-300">AI Model</label>
			<NSelect
				:value="modelValue"
				:options="selectOptions"
				:disabled="disabled"
				placeholder="Select a model"
				@update:value="handleModelChange"
			/>
		</div>

		<!-- Selected Model Info -->
		<div v-if="selectedModel" class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-3">
			<!-- Model Header -->
			<div class="flex items-center justify-between">
				<div class="flex items-center space-x-2">
					<h4 class="font-medium text-gray-900 dark:text-gray-100">
						{{ selectedModel.label }}
					</h4>
					<NTag v-if="selectedModel.supportsReasoning" type="info" size="small" :bordered="false">
						<template #icon>
							<SvgIcon icon="ri:brain-line" />
						</template>
						Reasoning
					</NTag>
				</div>

				<!-- Speed Indicator -->
				<div class="flex items-center space-x-1">
					<SvgIcon
						:icon="getSpeedIcon(selectedModel.speed)"
						:class="getSpeedColor(selectedModel.speed)"
						class="text-sm"
					/>
					<span class="text-xs capitalize" :class="getSpeedColor(selectedModel.speed)">
						{{ selectedModel.speed }}
					</span>
				</div>
			</div>

			<!-- Model Description -->
			<p class="text-sm text-gray-600 dark:text-gray-400">
				{{ selectedModel.description }}
			</p>

			<!-- Model Specifications -->
			<div class="grid grid-cols-2 gap-3 text-xs">
				<div class="space-y-1">
					<div class="flex items-center space-x-1">
						<SvgIcon icon="ri:file-text-line" class="text-gray-400" />
						<span class="text-gray-500 dark:text-gray-400">Max Tokens:</span>
					</div>
					<span class="font-medium text-gray-900 dark:text-gray-100">
						{{ selectedModel.maxTokens.toLocaleString() }}
					</span>
				</div>

				<div class="space-y-1">
					<div class="flex items-center space-x-1">
						<SvgIcon icon="ri:money-dollar-circle-line" class="text-gray-400" />
						<span class="text-gray-500 dark:text-gray-400">Cost:</span>
					</div>
					<span class="font-medium text-gray-900 dark:text-gray-100">
						{{ formatCost(selectedModel.costMultiplier) }}
					</span>
				</div>
			</div>

			<!-- Reasoning Model Warning -->
			<div
				v-if="selectedModel.supportsReasoning && showReasoningInfo"
				class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3"
			>
				<div class="flex items-start space-x-2">
					<SvgIcon
						icon="ri:information-line"
						class="text-blue-500 dark:text-blue-400 text-sm mt-0.5 flex-shrink-0"
					/>
					<div class="space-y-1">
						<h5 class="text-sm font-medium text-blue-900 dark:text-blue-100">
							Reasoning Model Selected
						</h5>
						<p class="text-xs text-blue-700 dark:text-blue-300">
							This model uses advanced reasoning and may take significantly longer to respond.
							You'll see the reasoning process as it works through your question.
						</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Reasoning Models Info -->
		<div
			v-if="!selectedModel?.supportsReasoning && showReasoningInfo && reasoningModels.length > 0"
			class="text-xs text-gray-500 dark:text-gray-400"
		>
			<NTooltip>
				<template #trigger>
					<div class="flex items-center space-x-1 cursor-help">
						<SvgIcon icon="ri:brain-line" />
						<span>
							{{ reasoningModels.length }} reasoning model{{
								reasoningModels.length > 1 ? 's' : ''
							}}
							available
						</span>
					</div>
				</template>
				<div class="space-y-1">
					<div v-for="model in reasoningModels" :key="model.value">
						<strong>{{ model.label }}:</strong>
						{{ model.description }}
					</div>
				</div>
			</NTooltip>
		</div>
	</div>
</template>
