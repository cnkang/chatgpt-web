/**
 * Provider Adapter
 * Adapts the new AI provider system to the legacy chatgpt interface
 */

import type {
  ApiModel,
  ChatContext,
  ChatMessage,
  ModelConfig,
  RequestOptions,
} from '@chatgpt-web/shared'
import { isNotEmptyString } from '@chatgpt-web/shared'
import { AzureOpenAIProvider } from '../providers/azure.js'
import type { AIProvider, ChatCompletionRequest } from '../providers/base.js'
import { getConfig } from '../providers/config.js'
import { AIProviderFactory, registerProvider } from '../providers/factory.js'
import { OpenAIProvider } from '../providers/openai.js'
import { sendResponse } from '../utils'

// Register providers
registerProvider('openai', OpenAIProvider)
registerProvider('azure', AzureOpenAIProvider)

let provider: AIProvider | null = null
let apiModel: ApiModel
let initError: Error | null = null

// Initialize provider based on configuration
async function initializeProvider(): Promise<void> {
  const config = getConfig()
  const factory = AIProviderFactory.getInstance()

  provider = await factory.createWithValidation(config.ai)
  apiModel = config.ai.provider === 'azure' ? 'AzureOpenAI' : 'ChatGPTAPI'

  console.warn(`✓ AI Provider initialized: ${config.ai.provider}`)
}

/**
 * Ensure provider is initialized before use.
 * Lazy initialization avoids process.exit at module load time,
 * making the module testable and allowing graceful error propagation.
 */
async function ensureProvider(): Promise<AIProvider> {
  if (provider) return provider

  try {
    await initializeProvider()
    initError = null
    if (!provider) throw new Error('Provider initialization completed but provider is null')
    return provider
  } catch (error) {
    initError = error instanceof Error ? error : new Error(String(error))
    console.error('Provider initialization failed:', initError)
    throw initError
  }
}

// Eagerly start initialization but don't kill the process on failure
initializeProvider().catch(error => {
  initError = error instanceof Error ? error : new Error(String(error))
  console.error('Provider initialization failed (will retry on first request):', initError)
})

/**
 * Chat reply process using the new provider system
 */
async function chatReplyProcess(options: RequestOptions) {
  const { message, lastContext, process: onProgress, systemMessage, temperature, top_p } = options

  try {
    const activeProvider = await ensureProvider()

    // Build messages array
    const messages: ChatMessage[] = []

    if (isNotEmptyString(systemMessage)) {
      messages.push({ role: 'system', content: systemMessage })
    }

    // Add context messages if available
    if (lastContext?.conversationId) {
      // In a real implementation, you'd retrieve conversation history
      // For now, we'll just add the current message
    }

    messages.push({ role: 'user', content: message })

    // Create request
    const request: ChatCompletionRequest = {
      model: getConfig().ai.defaultModel,
      messages,
      temperature,
      topP: top_p,
      maxTokens: undefined, // Let provider decide
    }

    if (onProgress) {
      // Use streaming for progress updates
      let fullContent = ''
      const responseId = `msg-${Date.now()}`

      for await (const chunk of activeProvider.createStreamingChatCompletion(request)) {
        const choice = chunk.choices[0]
        if (choice?.delta?.content) {
          fullContent += choice.delta.content

          // Call progress callback with accumulated content
          onProgress({
            id: responseId,
            text: fullContent,
            content: fullContent,
            delta: choice.delta.content,
            detail: {
              id: responseId,
              object: 'chat.completion.chunk',
              created: chunk.created,
              model: chunk.model,
              usage: null,
              choices: [
                {
                  delta: choice.delta,
                  index: choice.index,
                  finish_reason: choice.finishReason,
                },
              ],
            },
            role: 'assistant',
            parentMessageId: lastContext?.parentMessageId,
          })
        }
      }

      // Return final response
      return sendResponse({
        type: 'Success',
        data: {
          id: responseId,
          text: fullContent,
          content: fullContent,
          delta: '',
          detail: {
            id: responseId,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: request.model,
            usage: null,
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: fullContent,
                },
                index: 0,
                finish_reason: 'stop',
              },
            ],
          },
          role: 'assistant',
          parentMessageId: lastContext?.parentMessageId,
          conversationId: lastContext?.conversationId || `conv-${Date.now()}`,
        },
      })
    } else {
      // Use non-streaming for simple responses
      const response = await activeProvider.createChatCompletion(request)
      const choice = response.choices[0]

      if (!choice?.message?.content) {
        throw new Error('No response content received')
      }

      return sendResponse({
        type: 'Success',
        data: {
          id: response.id,
          text: choice.message.content,
          content: choice.message.content,
          delta: '',
          detail: response,
          role: 'assistant',
          parentMessageId: lastContext?.parentMessageId,
          conversationId: lastContext?.conversationId || `conv-${Date.now()}`,
        },
      })
    }
  } catch (error: unknown) {
    console.error('Chat reply process error:', error)

    // Map provider errors to legacy format
    if (error instanceof Error) {
      const message = error.message

      if (message.includes('401') || message.includes('authentication')) {
        return sendResponse({
          type: 'Fail',
          message: '[AI Provider] Authentication failed - please check your API key',
        })
      }

      if (message.includes('429') || message.includes('rate limit')) {
        return sendResponse({
          type: 'Fail',
          message: '[AI Provider] Rate limit exceeded - please try again later',
        })
      }

      if (message.includes('timeout')) {
        return sendResponse({
          type: 'Fail',
          message: '[AI Provider] Request timeout - please try again',
        })
      }

      return sendResponse({
        type: 'Fail',
        message: `[AI Provider] ${message}`,
      })
    }

    return sendResponse({
      type: 'Fail',
      message: 'An unexpected error occurred',
    })
  }
}

/**
 * Fetch usage information (placeholder for compatibility)
 */
async function fetchUsage(): Promise<string> {
  try {
    const activeProvider = await ensureProvider()
    const usage = await activeProvider.getUsageInfo()
    return usage.totalTokens > 0 ? `${usage.totalTokens}` : '-'
  } catch {
    return '-'
  }
}

/**
 * Chat configuration
 */
async function chatConfig(): Promise<Awaited<ReturnType<typeof sendResponse<ModelConfig>>>> {
  const usage = await fetchUsage()
  const config = getConfig()

  const httpsProxy = (process.env.HTTPS_PROXY || process.env.ALL_PROXY) ?? '-'
  const socksProxy =
    process.env.SOCKS_PROXY_HOST && process.env.SOCKS_PROXY_PORT
      ? `${process.env.SOCKS_PROXY_HOST}:${process.env.SOCKS_PROXY_PORT}`
      : '-'

  return sendResponse<ModelConfig>({
    type: 'Success',
    data: {
      apiModel,
      timeoutMs: config.ai.timeout || 100000,
      socksProxy,
      httpsProxy,
      usage,
    },
  })
}

/**
 * Get current model
 */
function currentModel(): ApiModel {
  return apiModel
}

export { chatConfig, chatReplyProcess, currentModel }
export type { ChatContext, ChatMessage }
