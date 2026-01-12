# AI Providers Guide

This guide covers the AI provider system in ChatGPT Web, including OpenAI and Azure OpenAI integration, provider switching, and extensibility.

## Provider Architecture

### Provider Interface

```typescript
// service/src/providers/base.ts
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ChatResponse {
  message: ChatMessage
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  model?: string
  finish_reason?: string
}

export interface ProviderConfig {
  apiKey: string
  model?: string
  baseURL?: string
  timeout?: number
  maxRetries?: number
}

export abstract class BaseProvider {
  protected config: ProviderConfig

  constructor(config: ProviderConfig) {
    this.config = config
  }

  abstract sendMessage(messages: ChatMessage[]): Promise<ChatResponse>
  abstract validateConfig(): boolean
  abstract getAvailableModels(): Promise<string[]>
  abstract getName(): string
}
```

### Provider Factory

```typescript
// service/src/providers/factory.ts
import { OpenAIProvider } from './openai'
import { AzureOpenAIProvider } from './azure'
import { BaseProvider } from './base'

export type ProviderType = 'openai' | 'azure'

export class ProviderFactory {
  static createProvider(type: ProviderType, config: any): BaseProvider {
    switch (type) {
      case 'openai':
        return new OpenAIProvider({
          apiKey: config.OPENAI_API_KEY,
          model: config.OPENAI_API_MODEL || 'gpt-4o',
          baseURL: config.OPENAI_API_BASE_URL || 'https://api.openai.com',
          timeout: parseInt(config.TIMEOUT_MS || '30000'),
          maxRetries: parseInt(config.RETRY_MAX_ATTEMPTS || '3'),
        })

      case 'azure':
        return new AzureOpenAIProvider({
          apiKey: config.AZURE_OPENAI_API_KEY,
          endpoint: config.AZURE_OPENAI_ENDPOINT,
          deployment: config.AZURE_OPENAI_DEPLOYMENT,
          apiVersion: config.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
          timeout: parseInt(config.TIMEOUT_MS || '30000'),
          maxRetries: parseInt(config.RETRY_MAX_ATTEMPTS || '3'),
        })

      default:
        throw new Error(`Unsupported provider type: ${type}`)
    }
  }

  static getProviderFromEnv(): BaseProvider {
    const providerType = (process.env.AI_PROVIDER as ProviderType) || 'openai'
    return this.createProvider(providerType, process.env)
  }
}
```

## OpenAI Provider

### Implementation

```typescript
// service/src/providers/openai.ts
import { BaseProvider, ChatMessage, ChatResponse, ProviderConfig } from './base'
import { ProviderError, TimeoutError } from '../utils/errors'
import { logger } from '../utils/logger'

interface OpenAIConfig extends ProviderConfig {
  baseURL?: string
  organization?: string
}

export class OpenAIProvider extends BaseProvider {
  private baseURL: string
  private organization?: string

  constructor(config: OpenAIConfig) {
    super(config)
    this.baseURL = config.baseURL || 'https://api.openai.com'
    this.organization = config.organization
  }

  getName(): string {
    return 'OpenAI'
  }

  validateConfig(): boolean {
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key is required')
    }

    if (!this.config.apiKey.startsWith('sk-')) {
      throw new Error('Invalid OpenAI API key format')
    }

    return true
  }

  async sendMessage(messages: ChatMessage[]): Promise<ChatResponse> {
    this.validateConfig()

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      logger.info('Sending request to OpenAI', {
        model: this.config.model,
        messageCount: messages.length,
      })

      const response = await fetch(`${this.baseURL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          ...(this.organization && { 'OpenAI-Organization': this.organization }),
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          temperature: 0.7,
          max_tokens: 4000,
          stream: false,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        await this.handleAPIError(response)
      }

      const data = await response.json()

      logger.info('Received response from OpenAI', {
        model: data.model,
        usage: data.usage,
      })

      return {
        message: {
          role: 'assistant',
          content: data.choices[0].message.content,
        },
        usage: data.usage,
        model: data.model,
        finish_reason: data.choices[0].finish_reason,
      }
    } catch (error) {
      clearTimeout(timeoutId)

      if (error.name === 'AbortError') {
        throw new TimeoutError('OpenAI API request timeout')
      }

      if (error instanceof ProviderError) {
        throw error
      }

      logger.error('OpenAI API error', {
        error: error.message,
        stack: error.stack,
      })

      throw new ProviderError(`OpenAI API error: ${error.message}`, 'openai')
    }
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseURL}/v1/models`, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          ...(this.organization && { 'OpenAI-Organization': this.organization }),
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data.data
        .filter((model: any) => model.id.includes('gpt'))
        .map((model: any) => model.id)
        .sort()
    } catch (error) {
      logger.error('Failed to fetch OpenAI models', { error: error.message })
      return ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'] // Fallback models
    }
  }

  private async handleAPIError(response: Response): Promise<never> {
    let errorData: any = {}

    try {
      errorData = await response.json()
    } catch {
      // Ignore JSON parsing errors
    }

    const errorMessage =
      errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`

    switch (response.status) {
      case 400:
        throw new ProviderError(`Invalid request: ${errorMessage}`, 'openai', 400)
      case 401:
        throw new ProviderError('Invalid API key or authentication failed', 'openai', 401)
      case 403:
        throw new ProviderError('Access forbidden - check your API key permissions', 'openai', 403)
      case 429:
        const retryAfter = response.headers.get('retry-after')
        throw new ProviderError(
          `Rate limit exceeded${retryAfter ? ` - retry after ${retryAfter}s` : ''}`,
          'openai',
          429,
        )
      case 500:
      case 502:
      case 503:
        throw new ProviderError('OpenAI service temporarily unavailable', 'openai', response.status)
      default:
        throw new ProviderError(`OpenAI API error: ${errorMessage}`, 'openai', response.status)
    }
  }
}
```

### Reasoning Models Support

```typescript
// service/src/providers/openai-reasoning.ts
import { OpenAIProvider } from './openai'
import { ChatMessage, ChatResponse } from './base'

export class OpenAIReasoningProvider extends OpenAIProvider {
  private readonly reasoningModels = ['o1-preview', 'o1-mini']

  async sendMessage(messages: ChatMessage[]): Promise<ChatResponse> {
    const isReasoningModel = this.reasoningModels.includes(this.config.model || '')

    if (isReasoningModel) {
      return this.sendReasoningMessage(messages)
    }

    return super.sendMessage(messages)
  }

  private async sendReasoningMessage(messages: ChatMessage[]): Promise<ChatResponse> {
    // Reasoning models have different parameters
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minutes for reasoning

    try {
      const response = await fetch(`${this.baseURL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: messages.filter(m => m.role !== 'system'), // Reasoning models don't support system messages
          // No temperature, max_tokens for reasoning models
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        await this.handleAPIError(response)
      }

      const data = await response.json()

      return {
        message: {
          role: 'assistant',
          content: data.choices[0].message.content,
        },
        usage: data.usage,
        model: data.model,
        finish_reason: data.choices[0].finish_reason,
        reasoning: data.choices[0].message.reasoning, // Reasoning steps if available
      }
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }
}
```

## Azure OpenAI Provider

### Implementation

```typescript
// service/src/providers/azure.ts
import { BaseProvider, ChatMessage, ChatResponse } from './base'
import { ProviderError, TimeoutError } from '../utils/errors'
import { logger } from '../utils/logger'

interface AzureConfig {
  apiKey: string
  endpoint: string
  deployment: string
  apiVersion: string
  timeout?: number
  maxRetries?: number
}

export class AzureOpenAIProvider extends BaseProvider {
  private endpoint: string
  private deployment: string
  private apiVersion: string

  constructor(config: AzureConfig) {
    super({
      apiKey: config.apiKey,
      timeout: config.timeout,
      maxRetries: config.maxRetries,
    })
    this.endpoint = config.endpoint.replace(/\/$/, '') // Remove trailing slash
    this.deployment = config.deployment
    this.apiVersion = config.apiVersion
  }

  getName(): string {
    return 'Azure OpenAI'
  }

  validateConfig(): boolean {
    if (!this.config.apiKey) {
      throw new Error('Azure OpenAI API key is required')
    }

    if (!this.endpoint) {
      throw new Error('Azure OpenAI endpoint is required')
    }

    if (!this.deployment) {
      throw new Error('Azure OpenAI deployment is required')
    }

    if (!this.apiVersion) {
      throw new Error('Azure OpenAI API version is required')
    }

    return true
  }

  async sendMessage(messages: ChatMessage[]): Promise<ChatResponse> {
    this.validateConfig()

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    const url = `${this.endpoint}/openai/deployments/${this.deployment}/chat/completions?api-version=${this.apiVersion}`

    try {
      logger.info('Sending request to Azure OpenAI', {
        deployment: this.deployment,
        messageCount: messages.length,
      })

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'api-key': this.config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          temperature: 0.7,
          max_tokens: 4000,
          stream: false,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        await this.handleAPIError(response)
      }

      const data = await response.json()

      logger.info('Received response from Azure OpenAI', {
        model: data.model,
        usage: data.usage,
      })

      return {
        message: {
          role: 'assistant',
          content: data.choices[0].message.content,
        },
        usage: data.usage,
        model: data.model,
        finish_reason: data.choices[0].finish_reason,
      }
    } catch (error) {
      clearTimeout(timeoutId)

      if (error.name === 'AbortError') {
        throw new TimeoutError('Azure OpenAI API request timeout')
      }

      if (error instanceof ProviderError) {
        throw error
      }

      logger.error('Azure OpenAI API error', {
        error: error.message,
        stack: error.stack,
      })

      throw new ProviderError(`Azure OpenAI API error: ${error.message}`, 'azure')
    }
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const url = `${this.endpoint}/openai/models?api-version=${this.apiVersion}`

      const response = await fetch(url, {
        headers: {
          'api-key': this.config.apiKey,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data.data.map((model: any) => model.id).sort()
    } catch (error) {
      logger.error('Failed to fetch Azure OpenAI models', { error: error.message })
      return ['gpt-4', 'gpt-35-turbo'] // Fallback models
    }
  }

  private async handleAPIError(response: Response): Promise<never> {
    let errorData: any = {}

    try {
      errorData = await response.json()
    } catch {
      // Ignore JSON parsing errors
    }

    const errorMessage =
      errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`

    switch (response.status) {
      case 400:
        throw new ProviderError(`Invalid request: ${errorMessage}`, 'azure', 400)
      case 401:
        throw new ProviderError('Invalid API key or authentication failed', 'azure', 401)
      case 403:
        throw new ProviderError(
          'Access forbidden - check your API key and deployment',
          'azure',
          403,
        )
      case 429:
        throw new ProviderError('Rate limit exceeded', 'azure', 429)
      case 500:
      case 502:
      case 503:
        throw new ProviderError(
          'Azure OpenAI service temporarily unavailable',
          'azure',
          response.status,
        )
      default:
        throw new ProviderError(`Azure OpenAI API error: ${errorMessage}`, 'azure', response.status)
    }
  }
}
```

## Provider Management

### Provider Service

```typescript
// service/src/services/provider-service.ts
import { BaseProvider } from '../providers/base'
import { ProviderFactory } from '../providers/factory'
import { logger } from '../utils/logger'

export class ProviderService {
  private primaryProvider: BaseProvider
  private fallbackProvider?: BaseProvider
  private healthStatus = new Map<string, boolean>()

  constructor() {
    this.primaryProvider = ProviderFactory.getProviderFromEnv()

    // Setup fallback provider if configured
    if (process.env.ENABLE_PROVIDER_FALLBACK === 'true') {
      this.setupFallbackProvider()
    }

    // Start health monitoring
    this.startHealthMonitoring()
  }

  private setupFallbackProvider() {
    const fallbackType = process.env.FALLBACK_PROVIDER
    if (!fallbackType) return

    try {
      this.fallbackProvider = ProviderFactory.createProvider(fallbackType as any, {
        ...process.env,
        // Use fallback-specific environment variables
        OPENAI_API_KEY: process.env.FALLBACK_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
        AZURE_OPENAI_API_KEY: process.env.FALLBACK_AZURE_OPENAI_API_KEY,
        AZURE_OPENAI_ENDPOINT: process.env.FALLBACK_AZURE_OPENAI_ENDPOINT,
        AZURE_OPENAI_DEPLOYMENT: process.env.FALLBACK_AZURE_OPENAI_DEPLOYMENT,
      })

      logger.info('Fallback provider configured', {
        primary: this.primaryProvider.getName(),
        fallback: this.fallbackProvider.getName(),
      })
    } catch (error) {
      logger.error('Failed to setup fallback provider', { error: error.message })
    }
  }

  async sendMessage(messages: ChatMessage[]): Promise<ChatResponse> {
    try {
      const response = await this.primaryProvider.sendMessage(messages)
      this.healthStatus.set(this.primaryProvider.getName(), true)
      return response
    } catch (error) {
      this.healthStatus.set(this.primaryProvider.getName(), false)

      logger.warn('Primary provider failed, trying fallback', {
        primary: this.primaryProvider.getName(),
        error: error.message,
      })

      if (this.fallbackProvider) {
        try {
          const response = await this.fallbackProvider.sendMessage(messages)
          this.healthStatus.set(this.fallbackProvider.getName(), true)
          return response
        } catch (fallbackError) {
          this.healthStatus.set(this.fallbackProvider.getName(), false)
          logger.error('Both providers failed', {
            primaryError: error.message,
            fallbackError: fallbackError.message,
          })
        }
      }

      throw error
    }
  }

  async getProviderStatus() {
    return {
      primary: {
        name: this.primaryProvider.getName(),
        healthy: this.healthStatus.get(this.primaryProvider.getName()) ?? true,
      },
      fallback: this.fallbackProvider
        ? {
            name: this.fallbackProvider.getName(),
            healthy: this.healthStatus.get(this.fallbackProvider.getName()) ?? true,
          }
        : null,
    }
  }

  private startHealthMonitoring() {
    const interval = parseInt(process.env.HEALTH_CHECK_INTERVAL || '300000') // 5 minutes

    setInterval(async () => {
      await this.checkProviderHealth(this.primaryProvider)

      if (this.fallbackProvider) {
        await this.checkProviderHealth(this.fallbackProvider)
      }
    }, interval)
  }

  private async checkProviderHealth(provider: BaseProvider) {
    try {
      // Simple health check with a basic message
      await provider.sendMessage([
        {
          role: 'user',
          content: 'Health check',
        },
      ])

      this.healthStatus.set(provider.getName(), true)
    } catch (error) {
      this.healthStatus.set(provider.getName(), false)
      logger.warn('Provider health check failed', {
        provider: provider.getName(),
        error: error.message,
      })
    }
  }
}
```

### Provider Configuration Validation

```typescript
// service/src/utils/provider-validator.ts
export class ProviderValidator {
  static validateOpenAIConfig(config: any): string[] {
    const errors: string[] = []

    if (!config.OPENAI_API_KEY) {
      errors.push('OPENAI_API_KEY is required')
    } else if (!config.OPENAI_API_KEY.startsWith('sk-')) {
      errors.push('OPENAI_API_KEY must start with "sk-"')
    }

    if (config.OPENAI_API_MODEL && !this.isValidOpenAIModel(config.OPENAI_API_MODEL)) {
      errors.push(`Invalid OpenAI model: ${config.OPENAI_API_MODEL}`)
    }

    if (config.OPENAI_API_BASE_URL && !this.isValidURL(config.OPENAI_API_BASE_URL)) {
      errors.push('OPENAI_API_BASE_URL must be a valid URL')
    }

    return errors
  }

  static validateAzureConfig(config: any): string[] {
    const errors: string[] = []

    if (!config.AZURE_OPENAI_API_KEY) {
      errors.push('AZURE_OPENAI_API_KEY is required')
    }

    if (!config.AZURE_OPENAI_ENDPOINT) {
      errors.push('AZURE_OPENAI_ENDPOINT is required')
    } else if (!this.isValidURL(config.AZURE_OPENAI_ENDPOINT)) {
      errors.push('AZURE_OPENAI_ENDPOINT must be a valid URL')
    }

    if (!config.AZURE_OPENAI_DEPLOYMENT) {
      errors.push('AZURE_OPENAI_DEPLOYMENT is required')
    }

    if (!config.AZURE_OPENAI_API_VERSION) {
      errors.push('AZURE_OPENAI_API_VERSION is required')
    }

    return errors
  }

  static validateProviderConfig(): string[] {
    const providerType = process.env.AI_PROVIDER || 'openai'

    switch (providerType) {
      case 'openai':
        return this.validateOpenAIConfig(process.env)
      case 'azure':
        return this.validateAzureConfig(process.env)
      default:
        return [`Unsupported provider type: ${providerType}`]
    }
  }

  private static isValidOpenAIModel(model: string): boolean {
    const validModels = [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4',
      'gpt-4-turbo',
      'gpt-3.5-turbo',
      'o1-preview',
      'o1-mini',
    ]
    return validModels.includes(model)
  }

  private static isValidURL(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }
}
```

## Frontend Provider Integration

### Provider Store

```typescript
// src/store/modules/provider.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface ProviderInfo {
  name: string
  healthy: boolean
  models?: string[]
}

interface ProviderStatus {
  primary: ProviderInfo
  fallback: ProviderInfo | null
}

export const useProviderStore = defineStore('provider', () => {
  const status = ref<ProviderStatus | null>(null)
  const availableModels = ref<string[]>([])
  const selectedModel = ref<string>('')

  const isHealthy = computed(() => {
    return status.value?.primary.healthy ?? true
  })

  const hasFallback = computed(() => {
    return status.value?.fallback !== null
  })

  async function fetchProviderStatus() {
    try {
      const response = await fetch('/api/provider/status')
      status.value = await response.json()
    } catch (error) {
      console.error('Failed to fetch provider status:', error)
    }
  }

  async function fetchAvailableModels() {
    try {
      const response = await fetch('/api/provider/models')
      const data = await response.json()
      availableModels.value = data.models

      if (!selectedModel.value && data.models.length > 0) {
        selectedModel.value = data.models[0]
      }
    } catch (error) {
      console.error('Failed to fetch available models:', error)
    }
  }

  function setSelectedModel(model: string) {
    selectedModel.value = model
    localStorage.setItem('selected_model', model)
  }

  // Load selected model from localStorage
  const savedModel = localStorage.getItem('selected_model')
  if (savedModel) {
    selectedModel.value = savedModel
  }

  return {
    status: readonly(status),
    availableModels: readonly(availableModels),
    selectedModel: readonly(selectedModel),
    isHealthy,
    hasFallback,
    fetchProviderStatus,
    fetchAvailableModels,
    setSelectedModel,
  }
})
```

### Provider Status Component

```vue
<!-- src/components/ProviderStatus.vue -->
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useProviderStore } from '@/store/modules/provider'
import { NCard, NTag, NSelect, NSpace, NIcon } from 'naive-ui'
import { CheckCircle, XCircle, AlertCircle } from '@vicons/tabler'

const providerStore = useProviderStore()
const loading = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([providerStore.fetchProviderStatus(), providerStore.fetchAvailableModels()])
  } finally {
    loading.value = false
  }
})

function getStatusIcon(healthy: boolean) {
  return healthy ? CheckCircle : XCircle
}

function getStatusColor(healthy: boolean) {
  return healthy ? 'success' : 'error'
}

function handleModelChange(model: string) {
  providerStore.setSelectedModel(model)
}
</script>

<template>
  <NCard title="AI Provider Status" size="small">
    <template v-if="loading">
      <div class="loading">Loading provider status...</div>
    </template>

    <template v-else-if="providerStore.status">
      <NSpace vertical>
        <!-- Primary Provider -->
        <div class="provider-info">
          <NSpace align="center">
            <NIcon :component="getStatusIcon(providerStore.status.primary.healthy)" />
            <span class="provider-name">{{ providerStore.status.primary.name }}</span>
            <NTag :type="getStatusColor(providerStore.status.primary.healthy)" size="small">
              {{ providerStore.status.primary.healthy ? 'Healthy' : 'Unhealthy' }}
            </NTag>
          </NSpace>
        </div>

        <!-- Fallback Provider -->
        <div v-if="providerStore.status.fallback" class="provider-info">
          <NSpace align="center">
            <NIcon :component="getStatusIcon(providerStore.status.fallback.healthy)" />
            <span class="provider-name">{{ providerStore.status.fallback.name }} (Fallback)</span>
            <NTag :type="getStatusColor(providerStore.status.fallback.healthy)" size="small">
              {{ providerStore.status.fallback.healthy ? 'Healthy' : 'Unhealthy' }}
            </NTag>
          </NSpace>
        </div>

        <!-- Model Selection -->
        <div v-if="providerStore.availableModels.length > 0" class="model-selection">
          <label>Model:</label>
          <NSelect
            :value="providerStore.selectedModel"
            :options="providerStore.availableModels.map(model => ({ label: model, value: model }))"
            @update:value="handleModelChange"
            style="width: 200px"
          />
        </div>

        <!-- Health Warning -->
        <div v-if="!providerStore.isHealthy" class="health-warning">
          <NSpace align="center">
            <NIcon :component="AlertCircle" color="orange" />
            <span>
              Primary provider is unhealthy.
              {{
                providerStore.hasFallback ? 'Using fallback provider.' : 'Service may be degraded.'
              }}
            </span>
          </NSpace>
        </div>
      </NSpace>
    </template>
  </NCard>
</template>

<style scoped>
.loading {
  text-align: center;
  padding: 1rem;
  color: var(--color-text-secondary);
}

.provider-info {
  padding: 0.5rem 0;
}

.provider-name {
  font-weight: 500;
  min-width: 120px;
}

.model-selection {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0;
}

.model-selection label {
  font-weight: 500;
  min-width: 60px;
}

.health-warning {
  padding: 0.5rem;
  background: var(--color-warning-light);
  border-radius: 4px;
  font-size: 0.875rem;
}
</style>
```

## Testing Providers

### Unit Tests

```typescript
// service/src/__tests__/providers.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OpenAIProvider } from '../providers/openai'
import { AzureOpenAIProvider } from '../providers/azure'

// Mock fetch globally
global.fetch = vi.fn()

describe('OpenAI Provider', () => {
  let provider: OpenAIProvider

  beforeEach(() => {
    provider = new OpenAIProvider({
      apiKey: 'sk-test-key',
      model: 'gpt-4o',
    })
    vi.clearAllMocks()
  })

  it('should validate configuration', () => {
    expect(() => provider.validateConfig()).not.toThrow()

    const invalidProvider = new OpenAIProvider({ apiKey: '' })
    expect(() => invalidProvider.validateConfig()).toThrow('OpenAI API key is required')
  })

  it('should send message successfully', async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            role: 'assistant',
            content: 'Hello! How can I help you?',
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
      },
      model: 'gpt-4o',
    }

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response)

    const result = await provider.sendMessage([
      {
        role: 'user',
        content: 'Hello',
      },
    ])

    expect(result.message.content).toBe('Hello! How can I help you?')
    expect(result.usage?.total_tokens).toBe(30)
  })

  it('should handle API errors', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: () =>
        Promise.resolve({
          error: { message: 'Invalid API key' },
        }),
    } as Response)

    await expect(
      provider.sendMessage([
        {
          role: 'user',
          content: 'Hello',
        },
      ]),
    ).rejects.toThrow('Invalid API key or authentication failed')
  })
})

describe('Azure OpenAI Provider', () => {
  let provider: AzureOpenAIProvider

  beforeEach(() => {
    provider = new AzureOpenAIProvider({
      apiKey: 'test-key',
      endpoint: 'https://test.openai.azure.com',
      deployment: 'test-deployment',
      apiVersion: '2024-02-15-preview',
    })
    vi.clearAllMocks()
  })

  it('should validate configuration', () => {
    expect(() => provider.validateConfig()).not.toThrow()

    const invalidProvider = new AzureOpenAIProvider({
      apiKey: '',
      endpoint: '',
      deployment: '',
      apiVersion: '',
    })
    expect(() => invalidProvider.validateConfig()).toThrow()
  })

  it('should construct correct API URL', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { role: 'assistant', content: 'Test' } }],
        }),
    } as Response)

    await provider.sendMessage([{ role: 'user', content: 'Hello' }])

    expect(fetch).toHaveBeenCalledWith(
      'https://test.openai.azure.com/openai/deployments/test-deployment/chat/completions?api-version=2024-02-15-preview',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'api-key': 'test-key',
        }),
      }),
    )
  })
})
```

### Integration Tests

```typescript
// service/src/__tests__/provider-integration.test.ts
import { describe, it, expect } from 'vitest'
import { ProviderService } from '../services/provider-service'

describe('Provider Integration', () => {
  it('should handle provider failover', async () => {
    // This would require setting up test environment with both providers
    const service = new ProviderService()

    const result = await service.sendMessage([
      {
        role: 'user',
        content: 'Test message',
      },
    ])

    expect(result.message.role).toBe('assistant')
    expect(result.message.content).toBeTruthy()
  })

  it('should report provider status', async () => {
    const service = new ProviderService()
    const status = await service.getProviderStatus()

    expect(status.primary).toBeDefined()
    expect(status.primary.name).toBeTruthy()
    expect(typeof status.primary.healthy).toBe('boolean')
  })
})
```

## Best Practices

### Configuration Best Practices

1. **Environment Variables**: Use environment variables for all provider configuration
2. **Validation**: Validate configuration on startup
3. **Fallback Providers**: Configure fallback providers for high availability
4. **Health Monitoring**: Implement health checks for all providers
5. **Error Handling**: Provide clear error messages for configuration issues

### Implementation Best Practices

1. **Abstract Interface**: Use abstract base class for consistent provider interface
2. **Factory Pattern**: Use factory pattern for provider instantiation
3. **Error Handling**: Implement comprehensive error handling for each provider
4. **Timeout Handling**: Set appropriate timeouts for API calls
5. **Retry Logic**: Implement retry logic with exponential backoff

### Security Best Practices

1. **API Key Protection**: Never log or expose API keys
2. **Environment Separation**: Use different API keys for different environments
3. **Rate Limiting**: Respect provider rate limits
4. **Input Validation**: Validate all inputs before sending to providers
5. **Error Sanitization**: Sanitize error messages to avoid information leakage

This comprehensive providers guide ensures robust AI provider integration with proper error handling, fallback mechanisms, and extensibility for future providers.
