/**
 * OpenAI v1 API Provider Implementation
 * Implements the AIProvider interface using the official OpenAI SDK
 */

import OpenAI from 'openai'
import {
  ErrorType,
  createExternalApiError,
  createNetworkError,
  createRateLimitError,
  createTimeoutError,
} from '../utils/error-handler.js'
import { logger } from '../utils/logger.js'
import type { RetryConfig } from '../utils/retry.js'
import { retryWithBackoff } from '../utils/retry.js'
import { shouldSkipApiDomainCheck } from '../utils/url-security.js'
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
import type { OpenAIConfig } from './config.js'

const isTestEnv =
  process.env.NODE_ENV === 'test' ||
  process.env.VITEST === 'true' ||
  Boolean(process.env.VITEST_WORKER_ID)

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
    // GPT-5.x models - Latest generation
    'gpt-5.2',
    'gpt-5.1',
    'gpt-5',

    // GPT-4o models
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4o-2024-11-20',
    'gpt-4o-2024-08-06',
    'gpt-4o-2024-05-13',
    'gpt-4o-mini-2024-07-18',

    // Reasoning models (o3/o4 series)
    'o3',
    'o3-mini',
    'o4-mini',
    'o4-mini-2025-04-16',
  ]

  private readonly client: OpenAI
  private readonly retryConfig: RetryConfig

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
          top_p: request.topP,
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
  async *createStreamingChatCompletion(
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
          top_p: request.topP,
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
   * Only checks API key format to avoid consuming quota at startup.
   */
  async validateConfiguration(): Promise<boolean> {
    try {
      if (!this.client.apiKey) {
        return false
      }

      // Only validate key format when not skipping domain check
      if (!shouldSkipApiDomainCheck() && !this.client.apiKey.startsWith('sk-')) {
        return false
      }

      return true
    } catch (error) {
      if (!isTestEnv) {
        console.error('OpenAI configuration validation failed:', error)
      }
      return false
    }
  }

  /**
   * Get usage information from OpenAI
   */
  async getUsageInfo(): Promise<UsageInfo> {
    // Note: OpenAI doesn't provide usage info in the same API call
    // This would typically require a separate billing API call
    // For now, return default values
    return {
      totalTokens: 0,
      promptTokens: 0,
      completionTokens: 0,
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
    const reasoningModels = ['o3', 'o3-mini', 'o4-mini', 'o4-mini-2025-04-16']
    const isReasoningModel = reasoningModels.some(rm => model.includes(rm))

    // Model-specific token limits
    let maxTokens = 128000 // default for modern models

    if (model.includes('gpt-5.2')) {
      maxTokens = 262144 // GPT-5.2: 256k context window
    }

    return {
      maxTokens,
      supportsReasoning: isReasoningModel,
      supportsStreaming: true, // All models support streaming via the OpenAI SDK
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
      content: message.content ?? message.text ?? '',
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
        confidence: 0.85, // Default confidence (0–1 range) - would be provided by the model
      })
    }

    return steps.length > 0 ? steps : undefined
  }

  /**
   * Handle OpenAI-specific errors
   */
  private handleOpenAIError(error: unknown): Error {
    if (error instanceof OpenAI.APIError) {
      const { status: statusCode, message: apiMessage } = error
      const code = error.code || 'OPENAI_API_ERROR'
      const mapping = this.mapOpenAIStatusToError(statusCode, apiMessage, error.message)
      const { message, errorType } = mapping
      const details = { provider: 'openai', statusCode, code }

      // Use appropriate error creator based on type
      if (errorType === ErrorType.NETWORK) {
        return createNetworkError(message, details)
      }
      if (errorType === ErrorType.TIMEOUT) {
        return createTimeoutError(message)
      }
      if (errorType === ErrorType.RATE_LIMIT) {
        return createRateLimitError(message)
      }
      return createExternalApiError(message, details)
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

  private mapOpenAIStatusToError(
    statusCode: number,
    apiMessage: string,
    fallbackMessage: string,
  ): { message: string; errorType: ErrorType } {
    const mappedByStatus: Record<number, { message: string; errorType: ErrorType }> = {
      401: {
        message: '[OpenAI] Invalid API key provided',
        errorType: ErrorType.AUTHENTICATION,
      },
      403: {
        message: '[OpenAI] Access denied. Please check your API key permissions',
        errorType: ErrorType.AUTHORIZATION,
      },
      429: {
        message: '[OpenAI] Rate limit exceeded. Please try again later',
        errorType: ErrorType.RATE_LIMIT,
      },
      500: {
        message: '[OpenAI] Internal server error. Please try again later',
        errorType: ErrorType.EXTERNAL_API,
      },
      502: {
        message: '[OpenAI] Bad gateway. Please try again later',
        errorType: ErrorType.NETWORK,
      },
      503: {
        message: '[OpenAI] Service unavailable. Please try again later',
        errorType: ErrorType.EXTERNAL_API,
      },
      504: {
        message: '[OpenAI] Gateway timeout. Please try again later',
        errorType: ErrorType.TIMEOUT,
      },
    }

    return (
      mappedByStatus[statusCode] ?? {
        message: `[OpenAI] HTTP ${statusCode}: ${fallbackMessage || apiMessage}`,
        errorType: ErrorType.EXTERNAL_API,
      }
    )
  }
}
