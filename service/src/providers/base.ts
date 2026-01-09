/**
 * Base AI Provider Interface
 * Defines the contract that all AI providers must implement
 */

export interface ChatMessage {
	role: 'system' | 'user' | 'assistant'
	content: string
	reasoning?: ReasoningStep[]
}

export interface ReasoningStep {
	step: number
	thought: string
	confidence: number
	duration?: number
}

export interface ChatCompletionRequest {
	messages: ChatMessage[]
	model: string
	temperature?: number
	maxTokens?: number
	stream?: boolean
	reasoningMode?: boolean
}

export interface ChatCompletionResponse {
	id: string
	object: string
	created: number
	model: string
	choices: Array<{
		index: number
		message: ChatMessage
		finishReason: string
	}>
	usage?: {
		promptTokens: number
		completionTokens: number
		totalTokens: number
	}
}

export interface ChatCompletionChunk {
	id: string
	object: string
	created: number
	model: string
	choices: Array<{
		index: number
		delta: Partial<ChatMessage>
		finishReason?: string
	}>
}

export interface UsageInfo {
	totalTokens: number
	promptTokens: number
	completionTokens: number
	cost?: number
}

export interface ProviderError extends Error {
	code?: string
	statusCode?: number
	provider: string
}

/**
 * Base AI Provider Interface
 * All AI providers must implement this interface
 */
export interface AIProvider {
	readonly name: string
	readonly supportedModels: string[]
	readonly supportsStreaming: boolean
	readonly supportsReasoning: boolean

	/**
	 * Create a chat completion
	 */
	createChatCompletion: (request: ChatCompletionRequest) => Promise<ChatCompletionResponse>

	/**
	 * Create a streaming chat completion
	 */
	createStreamingChatCompletion: (
		request: ChatCompletionRequest,
	) => AsyncIterable<ChatCompletionChunk>

	/**
	 * Validate provider configuration
	 */
	validateConfiguration: () => Promise<boolean>

	/**
	 * Get usage information
	 */
	getUsageInfo: () => Promise<UsageInfo>

	/**
	 * Check if model is supported
	 */
	isModelSupported: (model: string) => boolean

	/**
	 * Get model capabilities
	 */
	getModelCapabilities: (model: string) => {
		maxTokens: number
		supportsReasoning: boolean
		supportsStreaming: boolean
	}
}

/**
 * Abstract base class for AI providers
 * Provides common functionality and enforces interface implementation
 */
export abstract class BaseAIProvider implements AIProvider {
	abstract readonly name: string
	abstract readonly supportedModels: string[]
	abstract readonly supportsStreaming: boolean
	abstract readonly supportsReasoning: boolean

	abstract createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse>
	abstract createStreamingChatCompletion(
		request: ChatCompletionRequest,
	): AsyncIterable<ChatCompletionChunk>
	abstract validateConfiguration(): Promise<boolean>
	abstract getUsageInfo(): Promise<UsageInfo>

	/**
	 * Default implementation for model support check
	 */
	isModelSupported(model: string): boolean {
		return this.supportedModels.includes(model)
	}

	/**
	 * Default implementation for model capabilities
	 * Should be overridden by specific providers for accurate information
	 */
	getModelCapabilities(_model: string): {
		maxTokens: number
		supportsReasoning: boolean
		supportsStreaming: boolean
	} {
		// Default capabilities - should be overridden
		return {
			maxTokens: 4096,
			supportsReasoning: false,
			supportsStreaming: this.supportsStreaming,
		}
	}

	/**
	 * Create a provider-specific error
	 */
	protected createError(message: string, code?: string, statusCode?: number): ProviderError {
		const error = new Error(message) as ProviderError
		error.provider = this.name
		error.code = code
		error.statusCode = statusCode
		return error
	}

	/**
	 * Validate common request parameters
	 */
	protected validateRequest(request: ChatCompletionRequest): void {
		if (!request.messages || request.messages.length === 0) {
			throw this.createError('Messages array cannot be empty', 'INVALID_REQUEST')
		}

		if (!request.model) {
			throw this.createError('Model is required', 'INVALID_REQUEST')
		}

		if (!this.isModelSupported(request.model)) {
			throw this.createError(
				`Model ${request.model} is not supported by ${this.name}`,
				'UNSUPPORTED_MODEL',
			)
		}

		if (request.temperature !== undefined && (request.temperature < 0 || request.temperature > 2)) {
			throw this.createError('Temperature must be between 0 and 2', 'INVALID_REQUEST')
		}

		if (request.maxTokens !== undefined && request.maxTokens <= 0) {
			throw this.createError('Max tokens must be greater than 0', 'INVALID_REQUEST')
		}
	}
}
