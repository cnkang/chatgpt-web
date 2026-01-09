/**
 * Azure OpenAI Provider Implementation
 * Implements the AIProvider interface using the official OpenAI SDK's AzureOpenAI class
 * Supports both traditional chat completions and the new v1 responses API
 */

import { AzureOpenAI } from 'openai'
import {
  ErrorType,
  createExternalApiError,
  createNetworkError,
  createTimeoutError,
} from '../utils/error-handler.js'
import { logger } from '../utils/logger.js'
import type { RetryConfig } from '../utils/retry.js'
import { retryWithBackoff } from '../utils/retry.js'
import type {
  AIProvider,
  ChatCompletionChunk,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatMessage,
  ReasoningStep,
  UsageInfo,
} from './base.js'
import { BaseAIProvider } from './base.js'
import type { AzureOpenAIConfig } from './config.js'

// Azure v1 Responses API interfaces
interface AzureResponsesRequest {
  model: string
  input: string | ChatMessage[]
  modalities?: string[]
  instructions?: string
  temperature?: number
  max_tokens?: number
  stream?: boolean
  previous_response_id?: string
}

interface AzureResponsesResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
      reasoning?: string
    }
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

interface AzureResponsesStreamChunk {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    delta: {
      role?: string
      content?: string
      reasoning?: string
    }
    finish_reason?: string
  }>
}

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
    // GPT-5.x models - Latest generation
    'gpt-5.2',
    'gpt-5.1',
    'gpt-5',

    // Model router - Let Azure backend choose optimal model
    'model-router',

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
   * Automatically uses v1 responses API if enabled for enhanced features
   */
  async createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    this.validateRequest(request)

    // Use v1 responses API if enabled, otherwise fall back to traditional chat completions
    if (this.config.useResponsesAPI) {
      return this.createResponsesCompletion(request)
    } else {
      return this.createTraditionalChatCompletion(request)
    }
  }

  /**
   * Create a chat completion using the new v1 responses API
   */
  private async createResponsesCompletion(
    request: ChatCompletionRequest,
  ): Promise<ChatCompletionResponse> {
    const startTime = Date.now()

    try {
      const result = await retryWithBackoff(async () => {
        const responsesRequest: AzureResponsesRequest = {
          model: request.model,
          input: request.messages,
          temperature: request.temperature,
          max_tokens: request.maxTokens,
          stream: false,
        }

        logger.debug('Azure OpenAI v1 Responses API request', {
          model: request.model,
          deployment: this.config.deployment,
          messageCount: request.messages.length,
          temperature: request.temperature,
          maxTokens: request.maxTokens,
        })

        // Make direct HTTP request to v1/responses endpoint
        const response = await this.makeResponsesAPICall(responsesRequest)
        return this.convertFromResponsesResponse(response)
      }, this.retryConfig)

      const duration = Date.now() - startTime
      logger.logPerformance('Azure OpenAI v1 Responses Completion', duration, {
        model: request.model,
        deployment: this.config.deployment,
        messageCount: request.messages.length,
        success: true,
      })

      return result
    } catch (error) {
      const duration = Date.now() - startTime
      logger.error('Azure OpenAI v1 responses completion failed', {
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
   * Create a chat completion using traditional chat completions API
   */
  private async createTraditionalChatCompletion(
    request: ChatCompletionRequest,
  ): Promise<ChatCompletionResponse> {
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
   * Automatically uses v1 responses API if enabled for enhanced features
   */
  async *createStreamingChatCompletion(
    request: ChatCompletionRequest,
  ): AsyncIterable<ChatCompletionChunk> {
    this.validateRequest(request)

    // Use v1 responses API if enabled, otherwise fall back to traditional streaming
    if (this.config.useResponsesAPI) {
      yield* this.createStreamingResponsesCompletion(request)
    } else {
      yield* this.createTraditionalStreamingCompletion(request)
    }
  }

  /**
   * Create a streaming completion using the v1 responses API
   */
  private async *createStreamingResponsesCompletion(
    request: ChatCompletionRequest,
  ): AsyncIterable<ChatCompletionChunk> {
    try {
      const responsesRequest: AzureResponsesRequest = {
        model: request.model,
        input: request.messages,
        temperature: request.temperature,
        max_tokens: request.maxTokens,
        stream: true,
      }

      const url = `${this.config.endpoint}/openai/v1/responses?api-version=${this.config.apiVersion}`

      const headers = {
        'Content-Type': 'application/json',
        'api-key': this.config.apiKey,
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(responsesRequest),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          `Azure OpenAI v1 Responses API streaming error: ${response.status} ${errorText}`,
        )
      }

      if (!response.body) {
        throw new Error('No response body for streaming')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      try {
        let buffer = ''

        // eslint-disable-next-line no-await-in-loop
        while (true) {
          // eslint-disable-next-line no-await-in-loop
          const { done, value } = await reader.read()

          if (done) {
            // Process any remaining data in buffer
            if (buffer.trim()) {
              const lines = buffer.split('\n')
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6).trim()
                  if (data && data !== '[DONE]') {
                    try {
                      const parsed: AzureResponsesStreamChunk = JSON.parse(data)
                      yield this.convertFromResponsesStreamChunk(parsed)
                    } catch {
                      // Skip invalid JSON lines
                    }
                  }
                }
              }
            }
            break
          }

          if (value) {
            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')

            // Keep the last incomplete line in buffer
            buffer = lines.pop() || ''

            // Process complete lines
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim()
                if (data === '[DONE]') break

                try {
                  const parsed: AzureResponsesStreamChunk = JSON.parse(data)
                  yield this.convertFromResponsesStreamChunk(parsed)
                } catch {
                  // Skip invalid JSON lines
                }
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }
    } catch (error) {
      throw this.handleAzureError(error)
    }
  }

  /**
   * Create a streaming completion using traditional chat completions API
   */
  private async *createTraditionalStreamingCompletion(
    request: ChatCompletionRequest,
  ): AsyncIterable<ChatCompletionChunk> {
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
   * Convert Azure v1 responses API streaming chunk to internal format
   */
  private convertFromResponsesStreamChunk(chunk: AzureResponsesStreamChunk): ChatCompletionChunk {
    return {
      id: chunk.id,
      object: 'chat.completion.chunk',
      created: chunk.created,
      model: chunk.model,
      choices: chunk.choices.map((choice, index) => ({
        index,
        delta: {
          role: choice.delta?.role as 'assistant' | undefined,
          content: choice.delta?.content || '',
          reasoning: choice.delta?.reasoning
            ? this.parseReasoningFromText(choice.delta.reasoning)
            : undefined,
        },
        finishReason: choice.finish_reason || undefined,
      })),
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
   * Make a direct HTTP request to Azure OpenAI v1/responses endpoint
   */
  private async makeResponsesAPICall(
    request: AzureResponsesRequest,
  ): Promise<AzureResponsesResponse> {
    const url = `${this.config.endpoint}/openai/v1/responses?api-version=${this.config.apiVersion}`

    const headers = {
      'Content-Type': 'application/json',
      'api-key': this.config.apiKey,
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Azure OpenAI v1 Responses API error: ${response.status} ${errorText}`)
    }

    return response.json() as Promise<AzureResponsesResponse>
  }

  /**
   * Convert Azure v1 responses API response to internal format
   */
  private convertFromResponsesResponse(response: AzureResponsesResponse): ChatCompletionResponse {
    return {
      id: response.id,
      object: 'chat.completion',
      created: response.created,
      model: response.model,
      choices: response.choices.map((choice, index) => ({
        index,
        message: {
          role: 'assistant' as const,
          content: choice.message.content || '',
          reasoning: choice.message.reasoning
            ? this.parseReasoningFromText(choice.message.reasoning)
            : undefined,
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
   * Parse reasoning text into structured reasoning steps
   */
  private parseReasoningFromText(reasoningText: string): ReasoningStep[] | undefined {
    if (!reasoningText) return undefined

    // Simple parsing - split by common reasoning patterns
    const stepPattern = /Step \d+:|Thought \d+:|Reasoning:|Analysis:/gi
    const parts = reasoningText.split(stepPattern).filter(part => part.trim())

    if (parts.length === 0) return undefined

    return parts.map((thought, index) => ({
      step: index + 1,
      thought: thought.trim(),
      confidence: 85, // Default confidence
    }))
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

    // Model-specific token limits
    let maxTokens = 128000 // default for modern models

    if (model.includes('gpt-5')) {
      // GPT-5.x models - latest generation with enhanced capabilities
      if (model.includes('gpt-5.2')) {
        maxTokens = 200000 // GPT-5.2 has larger context window
      } else {
        maxTokens = 128000 // Other GPT-5.x models
      }
    } else if (model === 'model-router' || model.includes('router')) {
      // Model router - conservative estimate since backend chooses model
      maxTokens = 128000
    } else if (model.includes('gpt-4o')) {
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
