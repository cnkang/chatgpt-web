/**
 * Azure OpenAI Provider Implementation
 * Implements the AIProvider interface using the official OpenAI SDK's AzureOpenAI class
 */

import type { RetryConfig } from '../utils/retry.js'
import type {
	AIProvider,
	ChatCompletionChunk,
	ChatCompletionRequest,
	ChatCompletionResponse,
	ChatMessage,
	ReasoningStep,
	UsageInfo,
} from './base.js'
import type { AzureOpenAIConfig } from './config.js'
import { AzureOpenAI } from 'openai'
import {
	createExternalApiError,
	createNetworkError,
	createTimeoutError,
	ErrorType,
} from '../utils/error-handler.js'
import { logger } from '../utils/logger.js'
import { retryWithBackoff } from '../utils/retry.js'
import { BaseAIProvider } from './base.js'

interface AzureChatCompletionUsage {
	prompt_tokens?: number
	completion_tokens?: number
	total_tokens?: number
}

interface AzureChatCompletionChoice {
	message?: {
		content?: string | null
	}
	finish_reason?: string | null
}

interface AzureChatCompletionResponse {
	id?: string
	created?: number
	model?: string
	choices: AzureChatCompletionChoice[]
	usage?: AzureChatCompletionUsage
}

interface AzureChatCompletionChunkChoice {
	delta?: {
		role?: 'assistant' | 'user' | 'system' | 'developer' | 'tool'
		content?: string | null
	}
	finish_reason?: string | null
}

interface AzureChatCompletionChunkResponse {
	id?: string
	created?: number
	model?: string
	choices: AzureChatCompletionChunkChoice[]
}

/**
 * Azure OpenAI Provider Implementation
 * Uses the official OpenAI SDK's AzureOpenAI class for native Azure integration
 */
export class AzureOpenAIProvider extends BaseAIProvider implements AIProvider {
	readonly name = 'azure'
	readonly supportsStreaming = true
	readonly supportsReasoning = true

	// Azure OpenAI supported models (deployment names)
	readonly supportedModels = [
		// GPT-4o models
		'gpt-4o',
		'gpt-4o-mini',
		'gpt-4o-2024-11-20',
		'gpt-4o-2024-08-06',
		'gpt-4o-2024-05-13',
		'gpt-4o-mini-2024-07-18',

		// GPT-4 Turbo models
		'gpt-4-turbo',
		'gpt-4-turbo-2024-04-09',
		'gpt-4-0125-preview',
		'gpt-4-1106-preview',

		// GPT-4 models
		'gpt-4',
		'gpt-4-0613',
		'gpt-4-32k',
		'gpt-4-32k-0613',

		// GPT-3.5 Turbo models
		'gpt-35-turbo', // Note: Azure uses gpt-35-turbo instead of gpt-3.5-turbo
		'gpt-35-turbo-0125',
		'gpt-35-turbo-1106',
		'gpt-35-turbo-16k',

		// Reasoning models (when available on Azure)
		'o1-preview',
		'o1-mini',
	]

	private client: AzureOpenAI
	private config: AzureOpenAIConfig
	private retryConfig: RetryConfig

	constructor(config: AzureOpenAIConfig) {
		super()
		this.config = config

		// Initialize Azure OpenAI client using the official OpenAI SDK
		this.client = new AzureOpenAI({
			apiKey: config.apiKey,
			endpoint: config.endpoint,
			apiVersion: config.apiVersion,
			deployment: config.deployment,
		})

		// Configure retry settings for Azure OpenAI API calls
		this.retryConfig = {
			maxAttempts: 3,
			baseDelay: 1000,
			maxDelay: 30000,
			backoffMultiplier: 2,
			jitter: true,
			retryableErrors: [
				ErrorType.NETWORK,
				ErrorType.TIMEOUT,
				ErrorType.EXTERNAL_API,
				'ECONNRESET',
				'ENOTFOUND',
				'ECONNREFUSED',
				'ETIMEDOUT',
				'AZURE_RATE_LIMIT',
				'AZURE_SERVER_ERROR',
			],
			timeoutMs: 60000, // 60 second timeout
		}
	}

	/**
	 * Create a chat completion using Azure OpenAI
	 */
	async createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
		this.validateRequest(request)

		const startTime = Date.now()

		try {
			const result = await retryWithBackoff(async () => {
				const azureMessages = this.convertToAzureMessages(request.messages)

				logger.debug('Azure OpenAI API request', {
					model: request.model,
					deployment: this.config.deployment,
					messageCount: request.messages.length,
					temperature: request.temperature,
					maxTokens: request.maxTokens,
				})

				const response = await this.client.chat.completions.create({
					model: request.model, // This will be the deployment name
					messages: azureMessages,
					temperature: request.temperature,
					max_tokens: request.maxTokens,
					stream: false,
				})

				return this.convertFromAzureResponse(response)
			}, this.retryConfig)

			const duration = Date.now() - startTime
			logger.logPerformance('Azure OpenAI Chat Completion', duration, {
				model: request.model,
				deployment: this.config.deployment,
				messageCount: request.messages.length,
				success: true,
			})

			return result
		} catch (error) {
			const duration = Date.now() - startTime
			logger.error('Azure OpenAI chat completion failed', {
				model: request.model,
				deployment: this.config.deployment,
				messageCount: request.messages.length,
				duration,
				error: error instanceof Error ? error.message : String(error),
			})

			throw this.handleAzureError(error)
		}
	}

	/**
	 * Create a streaming chat completion
	 */
	async* createStreamingChatCompletion(
		request: ChatCompletionRequest,
	): AsyncIterable<ChatCompletionChunk> {
		this.validateRequest(request)

		try {
			const azureMessages = this.convertToAzureMessages(request.messages)

			const stream = await this.client.chat.completions.create({
				model: request.model, // This will be the deployment name
				messages: azureMessages,
				temperature: request.temperature,
				max_tokens: request.maxTokens,
				stream: true,
			})

			for await (const chunk of stream) {
				yield this.convertFromAzureChunk(chunk)
			}
		} catch (error) {
			throw this.handleAzureError(error)
		}
	}

	/**
	 * Validate Azure OpenAI configuration
	 */
	async validateConfiguration(): Promise<boolean> {
		try {
			// Test the configuration by making a simple API call
			const testMessages = [{ role: 'user' as const, content: 'test' }]

			await this.client.chat.completions.create({
				model: this.config.deployment,
				messages: testMessages,
				max_tokens: 1,
			})

			return true
		} catch (error) {
			console.error('Azure OpenAI configuration validation failed:', error)
			return false
		}
	}

	/**
	 * Get usage information from Azure OpenAI
	 */
	async getUsageInfo(): Promise<UsageInfo> {
		try {
			// Azure OpenAI doesn't provide usage info in the same way as OpenAI
			// This would typically require Azure billing/monitoring APIs
			// For now, return default values
			return {
				totalTokens: 0,
				promptTokens: 0,
				completionTokens: 0,
			}
		} catch (error) {
			throw this.handleAzureError(error)
		}
	}

	/**
	 * Get model capabilities for Azure OpenAI models
	 */
	getModelCapabilities(model: string): {
		maxTokens: number
		supportsReasoning: boolean
		supportsStreaming: boolean
	} {
		const reasoningModels = ['o1-preview', 'o1-mini']
		const isReasoningModel = reasoningModels.some(rm => model.includes(rm))

		// Model-specific token limits (similar to OpenAI but adjusted for Azure naming)
		let maxTokens = 4096 // default

		if (model.includes('gpt-4o')) {
			maxTokens = model.includes('mini') ? 128000 : 128000
		} else if (
			model.includes('gpt-4-turbo') ||
			model.includes('gpt-4-0125') ||
			model.includes('gpt-4-1106')
		) {
			maxTokens = 128000
		} else if (model.includes('gpt-4-32k')) {
			maxTokens = 32768
		} else if (model.includes('gpt-4')) {
			maxTokens = 8192
		} else if (model.includes('gpt-35-turbo-16k')) {
			maxTokens = 16384
		} else if (model.includes('gpt-35-turbo')) {
			maxTokens = 4096
		} else if (isReasoningModel) {
			maxTokens = 128000
		}

		return {
			maxTokens,
			supportsReasoning: isReasoningModel,
			supportsStreaming: !isReasoningModel, // Reasoning models typically don't support streaming
		}
	}

	/**
	 * Convert internal messages to Azure OpenAI format
	 */
	private convertToAzureMessages(messages: ChatMessage[]): Array<{
		role: 'system' | 'user' | 'assistant'
		content: string
	}> {
		return messages.map(message => ({
			role: message.role,
			content: message.content,
		}))
	}

	/**
	 * Convert Azure OpenAI response to internal format
	 */
	private convertFromAzureResponse(response: AzureChatCompletionResponse): ChatCompletionResponse {
		return {
			id: response.id || `azure-${Date.now()}`,
			object: 'chat.completion',
			created: response.created || Math.floor(Date.now() / 1000),
			model: response.model || this.config.deployment,
			choices: response.choices.map((choice, index) => ({
				index,
				message: {
					role: 'assistant' as const,
					content: choice.message?.content || '',
					reasoning: this.extractReasoningSteps(choice.message?.content),
				},
				finishReason: choice.finish_reason || 'stop',
			})),
			usage: response.usage
				? {
						promptTokens: response.usage.prompt_tokens ?? 0,
						completionTokens: response.usage.completion_tokens ?? 0,
						totalTokens: response.usage.total_tokens ?? 0,
					}
				: undefined,
		}
	}

	/**
	 * Convert Azure OpenAI streaming chunk to internal format
	 */
	private convertFromAzureChunk(chunk: AzureChatCompletionChunkResponse): ChatCompletionChunk {
		return {
			id: chunk.id || `azure-chunk-${Date.now()}`,
			object: 'chat.completion.chunk',
			created: chunk.created || Math.floor(Date.now() / 1000),
			model: chunk.model || this.config.deployment,
			choices: chunk.choices.map((choice, index) => ({
				index,
				delta: {
					role: choice.delta?.role as 'assistant' | undefined,
					content: choice.delta?.content || '',
				},
				finishReason: choice.finish_reason || undefined,
			})),
		}
	}

	/**
	 * Extract reasoning steps from response content
	 * This is a placeholder implementation - actual reasoning extraction
	 * would depend on the specific format returned by reasoning models
	 */
	private extractReasoningSteps(content: string | null | undefined): ReasoningStep[] | undefined {
		if (!content) return undefined

		const stepPattern = /Step (\d+):/g
		const matches = Array.from(content.matchAll(stepPattern))
		if (matches.length === 0) return undefined

		const steps: ReasoningStep[] = []

		for (let index = 0; index < matches.length; index++) {
			const match = matches[index]
			const startIndex = (match.index ?? 0) + match[0].length
			const endIndex =
				index + 1 < matches.length ? (matches[index + 1].index ?? content.length) : content.length
			const thought = content.slice(startIndex, endIndex).trim()

			if (!thought) continue

			steps.push({
				step: Number.parseInt(match[1], 10),
				thought,
				confidence: 85, // Default confidence - would be provided by the model
			})
		}

		return steps.length > 0 ? steps : undefined
	}

	/**
	 * Handle Azure OpenAI-specific errors
	 */
	private handleAzureError(error: unknown): Error {
		let message = 'Azure OpenAI API Error'
		let code = 'AZURE_API_ERROR'
		let statusCode: number | undefined
		let errorType = ErrorType.EXTERNAL_API

		// Handle OpenAI SDK errors (which now includes Azure errors)
		const errorValue = error as { status?: number; message?: string }
		if (typeof errorValue?.status === 'number') {
			statusCode = errorValue.status

			// Map common Azure OpenAI errors to user-friendly messages and error types
			switch (statusCode) {
				case 401:
					message = '[Azure OpenAI] Invalid API key or authentication failed'
					code = 'AZURE_AUTH_ERROR'
					errorType = ErrorType.AUTHENTICATION
					break
				case 403:
					message =
						'[Azure OpenAI] Access denied. Please check your API key permissions and deployment access'
					code = 'AZURE_ACCESS_DENIED'
					errorType = ErrorType.AUTHORIZATION
					break
				case 404:
					message = '[Azure OpenAI] Deployment not found. Please check your deployment name'
					code = 'AZURE_DEPLOYMENT_NOT_FOUND'
					errorType = ErrorType.CONFIGURATION
					break
				case 429:
					message = '[Azure OpenAI] Rate limit exceeded. Please try again later'
					code = 'AZURE_RATE_LIMIT'
					errorType = ErrorType.RATE_LIMIT
					break
				case 500:
					message = '[Azure OpenAI] Internal server error. Please try again later'
					code = 'AZURE_SERVER_ERROR'
					errorType = ErrorType.EXTERNAL_API
					break
				case 502:
					message = '[Azure OpenAI] Bad gateway. Please try again later'
					code = 'AZURE_BAD_GATEWAY'
					errorType = ErrorType.NETWORK
					break
				case 503:
					message = '[Azure OpenAI] Service unavailable. Please try again later'
					code = 'AZURE_SERVICE_UNAVAILABLE'
					errorType = ErrorType.EXTERNAL_API
					break
				case 504:
					message = '[Azure OpenAI] Gateway timeout. Please try again later'
					code = 'AZURE_TIMEOUT'
					errorType = ErrorType.TIMEOUT
					break
				default:
					message = `[Azure OpenAI] HTTP ${statusCode}: ${errorValue.message || 'Unknown error'}`
					errorType = ErrorType.EXTERNAL_API
			}
		} else if (errorValue?.message) {
			message = `[Azure OpenAI] ${errorValue.message}`
		}

		// Handle network-related errors
		if (error instanceof Error) {
			const errorMessage = error.message.toLowerCase()

			if (errorMessage.includes('timeout') || errorMessage.includes('etimedout')) {
				return createTimeoutError(`Azure OpenAI timeout: ${error.message}`)
			}

			if (
				errorMessage.includes('network') ||
				errorMessage.includes('econnreset') ||
				errorMessage.includes('enotfound') ||
				errorMessage.includes('econnrefused')
			) {
				return createNetworkError(`Azure OpenAI network error: ${error.message}`, {
					provider: 'azure',
				})
			}
		}

		// Create appropriate error based on type
		switch (errorType) {
			case ErrorType.AUTHENTICATION:
			case ErrorType.AUTHORIZATION:
			case ErrorType.CONFIGURATION:
			case ErrorType.RATE_LIMIT:
			case ErrorType.EXTERNAL_API:
				return createExternalApiError(message, { provider: 'azure', statusCode, code })
			case ErrorType.NETWORK:
				return createNetworkError(message, { provider: 'azure', statusCode, code })
			case ErrorType.TIMEOUT:
				return createTimeoutError(message)
			default:
				return createExternalApiError(message, { provider: 'azure', statusCode, code })
		}
	}
}
