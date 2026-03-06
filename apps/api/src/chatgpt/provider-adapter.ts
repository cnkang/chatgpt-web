/**
 * Provider Adapter
 * Adapts the new AI provider system to the legacy chatgpt interface
 */

import type { ApiModel, ChatMessage, ModelConfig, RequestOptions } from '@chatgpt-web/shared'
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
let initPromise: Promise<void> | null = null

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
 * Uses a shared promise to prevent concurrent initialization races.
 * If a previous attempt failed, a new attempt is started.
 */
async function ensureProvider(): Promise<AIProvider> {
  if (provider) return provider

  initPromise ??= initializeProvider().catch(error => {
    // Reset so the next call retries
    initPromise = null
    throw error
  })

  await initPromise

  if (!provider) throw new Error('Provider initialization completed but provider is null')
  return provider
}

// Eagerly start initialization but don't kill the process on failure.
// ensureProvider deduplicates via the shared initPromise.
try {
  await ensureProvider()
} catch (error) {
  const initError = error instanceof Error ? error : new Error(String(error))
  console.error('Provider initialization failed (will retry on first request):', initError)
}

/**
 * Chat reply process using the new provider system
 */
function buildRequestMessages(message: string, systemMessage?: string): ChatMessage[] {
  const messages: ChatMessage[] = []
  if (isNotEmptyString(systemMessage)) {
    messages.push({ role: 'system', content: systemMessage })
  }
  messages.push({ role: 'user', content: message })
  return messages
}

function createChatRequest(
  message: string,
  systemMessage: string | undefined,
  temperature: number | undefined,
  topP: number | undefined,
): ChatCompletionRequest {
  return {
    model: getConfig().ai.defaultModel,
    messages: buildRequestMessages(message, systemMessage),
    temperature,
    topP,
    maxTokens: undefined,
  }
}

function resolveConversationId(lastContext?: RequestOptions['lastContext']) {
  return lastContext?.conversationId || `conv-${Date.now()}`
}

function mapProviderErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return 'An unexpected error occurred'
  const errorMessage = error.message

  if (errorMessage.includes('401') || errorMessage.includes('authentication')) {
    return '[AI Provider] Authentication failed - please check your API key'
  }
  if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
    return '[AI Provider] Rate limit exceeded - please try again later'
  }
  if (errorMessage.includes('timeout')) {
    return '[AI Provider] Request timeout - please try again'
  }

  return `[AI Provider] ${errorMessage}`
}

async function streamReply(
  activeProvider: AIProvider,
  request: ChatCompletionRequest,
  onProgress: NonNullable<RequestOptions['process']>,
  lastContext?: RequestOptions['lastContext'],
) {
  let fullContent = ''
  const responseId = `msg-${Date.now()}`

  for await (const chunk of activeProvider.createStreamingChatCompletion(request)) {
    const choice = chunk.choices[0]
    if (!choice?.delta?.content) continue

    fullContent += choice.delta.content
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
      conversationId: resolveConversationId(lastContext),
    },
  })
}

async function nonStreamingReply(
  activeProvider: AIProvider,
  request: ChatCompletionRequest,
  lastContext?: RequestOptions['lastContext'],
) {
  const response = await activeProvider.createChatCompletion(request)
  const choice = response.choices[0]
  const content = choice?.message?.content
  if (!content) throw new Error('No response content received')

  return sendResponse({
    type: 'Success',
    data: {
      id: response.id,
      text: content,
      content,
      delta: '',
      detail: response,
      role: 'assistant',
      parentMessageId: lastContext?.parentMessageId,
      conversationId: resolveConversationId(lastContext),
    },
  })
}

async function chatReplyProcess(options: RequestOptions) {
  const { message, lastContext, process: onProgress, systemMessage, temperature, top_p } = options

  try {
    const activeProvider = await ensureProvider()
    const request = createChatRequest(message, systemMessage, temperature, top_p)
    if (onProgress) return streamReply(activeProvider, request, onProgress, lastContext)
    return nonStreamingReply(activeProvider, request, lastContext)
  } catch (error: unknown) {
    console.error('Chat reply process error:', error)
    return sendResponse({
      type: 'Fail',
      message: mapProviderErrorMessage(error),
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
export type { ChatContext, ChatMessage } from '@chatgpt-web/shared'
