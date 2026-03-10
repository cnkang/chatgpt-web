/**
 * Provider Adapter
 * Provides provider-backed configuration helpers for non-chat endpoints.
 */

import type { ApiModel, ModelConfig } from '@chatgpt-web/shared'
import { AzureOpenAIProvider } from '../providers/azure.js'
import type { AIProvider } from '../providers/base.js'
import { getConfig } from '../providers/config.js'
import { createProviderWithValidation, registerProvider } from '../providers/factory.js'
import { OpenAIProvider } from '../providers/openai.js'
import { sendResponse } from '../utils'

// Register providers
registerProvider('openai', OpenAIProvider)
registerProvider('azure', AzureOpenAIProvider)

let provider: AIProvider | null = null
let apiModel: ApiModel
let initPromise: Promise<void> | null = null
const isTestEnv =
  process.env.NODE_ENV === 'test' ||
  process.env.VITEST === 'true' ||
  Boolean(process.env.VITEST_WORKER_ID)

// Initialize provider based on configuration
async function initializeProvider(): Promise<void> {
  const config = getConfig()

  provider = await createProviderWithValidation(config.ai)
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
  if (!isTestEnv) {
    console.error('Provider initialization failed (will retry on first request):', initError)
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
  if (apiModel) {
    return apiModel
  }

  return getConfig().ai.provider === 'azure' ? 'AzureOpenAI' : 'ChatGPTAPI'
}

export { chatConfig, currentModel }
