/**
 * OpenAI v1 API Provider Implementation
 * Implements the AIProvider interface using the official OpenAI SDK
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
import type { OpenAIConfig } from './config.js'
import OpenAI from 'openai'
import {
	createExternalApiError,
	createNetworkError,
	createTimeoutError,
	ErrorType,
} from '../utils/error-handler.js'
import { logger } from '../utils/logger.js'
import { retryWithBackoff } from '../utils/retry.js'
import { BaseAIProvider } from './base.js'

/**
 * OpenAI Provider Implementation
 * Uses the official OpenAI SDK for v1 API compatibility
 */
export class OpenAIProvider extends BaseAIProvider implements AIProvider {
	readonly name = 'openai'
	readonly supportsStreaming = true
	readonly supportsReasoning = true

	// OpenAI supported models including reasoning models
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
		'gpt-4-turbo-preview',
		'gpt-4-0125-preview',
		'gpt-4-1106-preview',

		// GPT-4 models
		'gpt-4',
		'gpt-4-0613',
		'gpt-4-32k',
		'gpt-4-32k-0613',

		// GPT-3.5 Turbo models
		'gpt-3.5-turbo',
		'gpt-3.5-turbo-0125',
		'gpt-3.5-turbo-1106',
		'gpt-3.5-turbo-16k',

		// Reasoning models (o1 series)
		'o1',
		'o1-preview',
		'o1-mini',
		'o1-2024-12-17',
		'o1-preview-2024-09-12',
		'o1-mini-2024-09-12',
	]

	private client: OpenAI
	private retryConfig: RetryConfig

	constructor(config: OpenAIConfig) {
		super()
		this.client = new OpenAI({
			apiKey: config.apiKey,
			baseURL: config.baseUrl,
			organization: config.organization,
		})

		// Configure retry settings for OpenAI API calls
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
				'OPENAI_RATE_LIMIT',
				'OPENAI_SERVER_ERROR',
			],
			timeoutMs: 60000, // 60 second timeout
		}
	}

	/**
	 * Create a chat completion using OpenAI v1 API
	 */
	async createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
		this.validateRequest(request)

		const startTime = Date.now()

		try {
			const result = await retryWithBackoff(async () => {
				const openAIMessages = this.convertToOpenAIMessages(request.messages)

				logger.debug('OpenAI API request', {
					model: request.model,
					messageCount: request.messages.length,
					temperature: request.temperature,
					maxTokens: request.maxTokens,
				})

				const completion = await this.client.chat.completions.create({
					model: request.model,
					messages: openAIMessages,
					temperature: request.temperature,
					max_tokens: request.maxTokens,
					stream: false,
				})

				return this.convertFromOpenAIResponse(completion)
			}, this.retryConfig)

			const duration = Date.now() - startTime
			logger.logPerformance('OpenAI Chat Completion', duration, {
				model: request.model,
				messageCount: request.messages.length,
				success: true,
			})

			return result
		} catch (error) {
			const duration = Date.now() - startTime
			logger.error('OpenAI chat completion failed', {
				model: request.model,
				messageCount: request.messages.length,
				duration,
				error: error instanceof Error ? error.message : String(error),
			})

			throw this.handleOpenAIError(error)
		}
	}

	/**
	 * Create a streaming chat completion
	 */
	async* createStreamingChatCompletion(
		request: ChatCompletionRequest,
	): AsyncIterable<ChatCompletionChunk> {
		this.validateRequest(request)

		const startTime = Date.now()

		try {
			const openAIMessages = this.convertToOpenAIMessages(request.messages)

			logger.debug('OpenAI streaming API request', {
				model: request.model,
				messageCount: request.messages.length,
				temperature: request.temperature,
				maxTokens: request.maxTokens,
			})

			// Note: Streaming requests are harder to retry, so we use a simpler retry config
			const streamRetryConfig = {
				...this.retryConfig,
				maxAttempts: 2, // Fewer retries for streaming
			}

			const stream = await retryWithBackoff(async () => {
				return await this.client.chat.completions.create({
					model: request.model,
					messages: openAIMessages,
					temperature: request.temperature,
					max_tokens: request.maxTokens,
					stream: true,
				})
			}, streamRetryConfig)

			let chunkCount = 0
			for await (const chunk of stream) {
				chunkCount++
				yield this.convertFromOpenAIChunk(chunk)
			}

			const duration = Date.now() - startTime
			logger.logPerformance('OpenAI Streaming Chat Completion', duration, {
				model: request.model,
				messageCount: request.messages.length,
				chunkCount,
				success: true,
			})
		} catch (error) {
			const duration = Date.now() - startTime
			logger.error('OpenAI streaming chat completion failed', {
				model: request.model,
				messageCount: request.messages.length,
				duration,
				error: error instanceof Error ? error.message : String(error),
			})

			throw this.handleOpenAIError(error)
		}
	}

	/**
	 * Validate OpenAI configuration
	 */
	async validateConfiguration(): Promise<boolean> {
		try {
			// Test the configuration by making a simple API call
			await this.client.models.list()
			return true
		} catch (error) {
			console.error('OpenAI configuration validation failed:', error)
			return false
		}
	}

	/**
	 * Get usage information from OpenAI
	 */
	async getUsageInfo(): Promise<UsageInfo> {
		try {
			// Note: OpenAI doesn't provide usage info in the same API call
			// This would typically require a separate billing API call
			// For now, return default values
			return {
				totalTokens: 0,
				promptTokens: 0,
				completionTokens: 0,
			}
		} catch (error) {
			throw this.handleOpenAIError(error)
		}
	}

	/**
	 * Get model capabilities for OpenAI models
	 */
	getModelCapabilities(model: string): {
		maxTokens: number
		supportsReasoning: boolean
		supportsStreaming: boolean
	} {
		const reasoningModels = [
			'o1',
			'o1-preview',
			'o1-mini',
			'o1-2024-12-17',
			'o1-preview-2024-09-12',
			'o1-mini-2024-09-12',
		]
		const isReasoningModel = reasoningModels.some(rm => model.includes(rm))

		// Model-specific token limits
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
		} else if (model.includes('gpt-3.5-turbo-16k')) {
			maxTokens = 16384
		} else if (model.includes('gpt-3.5-turbo')) {
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
	 * Convert internal messages to OpenAI format
	 */
	private convertToOpenAIMessages(
		messages: ChatMessage[],
	): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
		return messages.map(message => ({
			role: message.role,
			content: message.content,
		}))
	}

	/**
	 * Convert OpenAI response to internal format
	 */
	private convertFromOpenAIResponse(
		response: OpenAI.Chat.Completions.ChatCompletion,
	): ChatCompletionResponse {
		return {
			id: response.id,
			object: response.object,
			created: response.created,
			model: response.model,
			choices: response.choices.map(choice => ({
				index: choice.index,
				message: {
					role: choice.message.role as 'assistant',
					content: choice.message.content || '',
					reasoning: this.extractReasoningSteps(choice.message.content),
				},
				finishReason: choice.finish_reason || 'stop',
			})),
			usage: response.usage
				? {
						promptTokens: response.usage.prompt_tokens,
						completionTokens: response.usage.completion_tokens,
						totalTokens: response.usage.total_tokens,
					}
				: undefined,
		}
	}

	/**
	 * Convert OpenAI streaming chunk to internal format
	 */
	private convertFromOpenAIChunk(
		chunk: OpenAI.Chat.Completions.ChatCompletionChunk,
	): ChatCompletionChunk {
		return {
			id: chunk.id,
			object: chunk.object,
			created: chunk.created,
			model: chunk.model,
			choices: chunk.choices.map(choice => ({
				index: choice.index,
				delta: {
					role: choice.delta.role as 'assistant' | undefined,
					content: choice.delta.content || '',
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
	private extractReasoningSteps(content: string | null): ReasoningStep[] | undefined {
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
	 * Handle OpenAI-specific errors
	 */
	private handleOpenAIError(error: unknown): Error {
		if (error instanceof OpenAI.APIError) {
			const statusCode = error.status
			const code = error.code || 'OPENAI_API_ERROR'

			let message = error.message
			let errorType = ErrorType.EXTERNAL_API

			// Map common OpenAI errors to user-friendly messages and appropriate error types
			switch (statusCode) {
				case 401:
					message = '[OpenAI] Invalid API key provided'
					errorType = ErrorType.AUTHENTICATION
					break
				case 403:
					message = '[OpenAI] Access denied. Please check your API key permissions'
					errorType = ErrorType.AUTHORIZATION
					break
				case 429:
					message = '[OpenAI] Rate limit exceeded. Please try again later'
					errorType = ErrorType.RATE_LIMIT
					break
				case 500:
					message = '[OpenAI] Internal server error. Please try again later'
					errorType = ErrorType.EXTERNAL_API
					break
				case 502:
					message = '[OpenAI] Bad gateway. Please try again later'
					errorType = ErrorType.NETWORK
					break
				case 503:
					message = '[OpenAI] Service unavailable. Please try again later'
					errorType = ErrorType.EXTERNAL_API
					break
				case 504:
					message = '[OpenAI] Gateway timeout. Please try again later'
					errorType = ErrorType.TIMEOUT
					break
				default:
					message = `[OpenAI] HTTP ${statusCode}: ${error.message}`
					errorType = ErrorType.EXTERNAL_API
			}

			// Create appropriate error based on type
			switch (errorType) {
				case ErrorType.AUTHENTICATION:
					return createExternalApiError(message, { provider: 'openai', statusCode, code })
				case ErrorType.AUTHORIZATION:
					return createExternalApiError(message, { provider: 'openai', statusCode, code })
				case ErrorType.RATE_LIMIT:
					return createExternalApiError(message, { provider: 'openai', statusCode, code })
				case ErrorType.NETWORK:
					return createNetworkError(message, { provider: 'openai', statusCode, code })
				case ErrorType.TIMEOUT:
					return createTimeoutError(message)
				default:
					return createExternalApiError(message, { provider: 'openai', statusCode, code })
			}
		}

		// Handle network-related errors
		if (error instanceof Error) {
			const errorMessage = error.message.toLowerCase()

			if (errorMessage.includes('timeout') || errorMessage.includes('etimedout')) {
				return createTimeoutError(`OpenAI API timeout: ${error.message}`)
			}

			if (
				errorMessage.includes('network') ||
				errorMessage.includes('econnreset') ||
				errorMessage.includes('enotfound') ||
				errorMessage.includes('econnrefused')
			) {
				return createNetworkError(`OpenAI network error: ${error.message}`, { provider: 'openai' })
			}

			return createExternalApiError(`OpenAI API Error: ${error.message}`, { provider: 'openai' })
		}

		return createExternalApiError('Unknown OpenAI API error', { provider: 'openai' })
	}
}
