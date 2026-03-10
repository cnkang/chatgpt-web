/**
 * Unit tests for AI Provider Factory
 * Tests provider factory implementation according to task 7.2
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { isOfficialAzureOpenAIEndpoint } from '../utils/url-security.js'
import type { AIProvider, ChatCompletionChunk, ChatCompletionResponse, UsageInfo } from './base.js'
import type { AIConfig, AzureOpenAIConfig, OpenAIConfig } from './config.js'
import {
  clearProviders,
  createProvider,
  createProviderWithValidation,
  getAvailableProviders,
  isProviderRegistered,
  registerProvider,
} from './factory.js'

// Mock provider classes
class MockOpenAIProvider implements AIProvider {
  readonly name = 'openai'
  readonly supportedModels = ['gpt-4o', 'gpt-5.2']
  readonly supportsStreaming = true
  readonly supportsReasoning = true

  constructor(public config: OpenAIConfig) {}

  async createChatCompletion(): Promise<ChatCompletionResponse> {
    return {
      id: 'test',
      object: 'chat.completion',
      created: 0,
      model: 'gpt-4o',
      choices: [],
    }
  }

  async *createStreamingChatCompletion(): AsyncIterable<ChatCompletionChunk> {
    yield {
      id: 'test',
      object: 'chat.completion.chunk',
      created: 0,
      model: 'gpt-4o',
      choices: [],
    }
  }

  async validateConfiguration(): Promise<boolean> {
    return this.config.apiKey.startsWith('sk-')
  }

  async getUsageInfo(): Promise<UsageInfo> {
    return { totalTokens: 0, promptTokens: 0, completionTokens: 0 }
  }

  isModelSupported(model: string): boolean {
    return this.supportedModels.includes(model)
  }

  getModelCapabilities(): ReturnType<AIProvider['getModelCapabilities']> {
    return { maxTokens: 4096, supportsReasoning: false, supportsStreaming: true }
  }
}

class MockAzureProvider implements AIProvider {
  readonly name = 'azure'
  readonly supportedModels = ['gpt-4o', 'gpt-5.2']
  readonly supportsStreaming = true
  readonly supportsReasoning = true

  constructor(public config: AzureOpenAIConfig) {}

  async createChatCompletion(): Promise<ChatCompletionResponse> {
    return {
      id: 'test-azure',
      object: 'chat.completion',
      created: 0,
      model: 'gpt-4o',
      choices: [],
    }
  }

  async *createStreamingChatCompletion(): AsyncIterable<ChatCompletionChunk> {
    yield {
      id: 'test-azure',
      object: 'chat.completion.chunk',
      created: 0,
      model: 'gpt-4o',
      choices: [],
    }
  }

  async validateConfiguration(): Promise<boolean> {
    return isOfficialAzureOpenAIEndpoint(this.config.endpoint)
  }

  async getUsageInfo(): Promise<UsageInfo> {
    return { totalTokens: 0, promptTokens: 0, completionTokens: 0 }
  }

  isModelSupported(model: string): boolean {
    return this.supportedModels.includes(model)
  }

  getModelCapabilities(): ReturnType<AIProvider['getModelCapabilities']> {
    return { maxTokens: 4096, supportsReasoning: false, supportsStreaming: true }
  }
}

describe('provider registry', () => {
  beforeEach(() => {
    clearProviders()
  })

  afterEach(() => {
    clearProviders()
  })

  describe('provider registration', () => {
    it('should register providers correctly', () => {
      registerProvider('openai', MockOpenAIProvider)
      registerProvider('azure', MockAzureProvider)

      expect(isProviderRegistered('openai')).toBe(true)
      expect(isProviderRegistered('azure')).toBe(true)
      expect(isProviderRegistered('unknown')).toBe(false)
    })

    it('should get registered providers', () => {
      registerProvider('openai', MockOpenAIProvider)
      registerProvider('azure', MockAzureProvider)

      const providers = getAvailableProviders()
      expect(providers).toContain('openai')
      expect(providers).toContain('azure')
      expect(providers).toHaveLength(2)
    })

    it('should clear all providers', () => {
      registerProvider('openai', MockOpenAIProvider)
      registerProvider('azure', MockAzureProvider)

      expect(getAvailableProviders()).toHaveLength(2)

      clearProviders()

      expect(getAvailableProviders()).toHaveLength(0)
    })
  })
})

describe('ai provider factory', () => {
  beforeEach(() => {
    clearProviders()
    registerProvider('openai', MockOpenAIProvider)
    registerProvider('azure', MockAzureProvider)
  })

  afterEach(() => {
    clearProviders()
  })

  describe('provider creation', () => {
    it('should create OpenAI provider', () => {
      const config: AIConfig = {
        provider: 'openai',
        defaultModel: 'gpt-5.2',
        enableReasoning: false,
        openai: {
          apiKey: 'sk-test-key',
          baseUrl: 'https://api.openai.com/v1',
        },
      }

      const provider = createProvider(config)
      expect(provider).toBeInstanceOf(MockOpenAIProvider)
      expect(provider.name).toBe('openai')
    })

    it('should create Azure provider', () => {
      const config: AIConfig = {
        provider: 'azure',
        defaultModel: 'gpt-4o',
        enableReasoning: false,
        azure: {
          apiKey: 'azure-key',
          endpoint: 'https://test.openai.azure.com',
          deployment: 'gpt-4o',
          apiVersion: '2024-02-15-preview',
        },
      }

      const provider = createProvider(config)
      expect(provider).toBeInstanceOf(MockAzureProvider)
      expect(provider.name).toBe('azure')
    })

    it('should throw error for unsupported provider', () => {
      const config: AIConfig = {
        provider: 'unsupported' as unknown as AIConfig['provider'],
        defaultModel: 'gpt-5.2',
        enableReasoning: false,
      }

      expect(() => createProvider(config)).toThrow('Provider "unsupported" is not registered')
    })

    it('should throw error for missing OpenAI config', () => {
      const config: AIConfig = {
        provider: 'openai',
        defaultModel: 'gpt-5.2',
        enableReasoning: false,
        // Missing openai config
      }

      expect(() => createProvider(config)).toThrow(
        'OpenAI configuration is required when using OpenAI provider',
      )
    })

    it('should throw error for missing Azure config', () => {
      const config: AIConfig = {
        provider: 'azure',
        defaultModel: 'gpt-4o',
        enableReasoning: false,
        // Missing azure config
      }

      expect(() => createProvider(config)).toThrow(
        'Azure configuration is required when using Azure provider',
      )
    })

    it('should throw error for unregistered provider', () => {
      clearProviders() // Remove registered providers

      const config: AIConfig = {
        provider: 'openai',
        defaultModel: 'gpt-5.2',
        enableReasoning: false,
        openai: {
          apiKey: 'sk-test-key',
        },
      }

      expect(() => createProvider(config)).toThrow('Provider "openai" is not registered')
    })
  })

  describe('provider creation with validation', () => {
    it('should create provider with successful validation', async () => {
      const config: AIConfig = {
        provider: 'openai',
        defaultModel: 'gpt-5.2',
        enableReasoning: false,
        openai: {
          apiKey: 'sk-valid-key', // Valid key format
        },
      }

      const provider = await createProviderWithValidation(config)
      expect(provider).toBeInstanceOf(MockOpenAIProvider)
    })

    it('should reject provider with failed validation', async () => {
      const config: AIConfig = {
        provider: 'openai',
        defaultModel: 'gpt-5.2',
        enableReasoning: false,
        openai: {
          apiKey: 'invalid-key', // Invalid key format
        },
      }

      await expect(createProviderWithValidation(config)).rejects.toThrow(
        'Provider openai configuration validation failed',
      )
    })
  })
})

describe('convenience functions', () => {
  beforeEach(() => {
    clearProviders()
    registerProvider('openai', MockOpenAIProvider)
    registerProvider('azure', MockAzureProvider)
  })

  afterEach(() => {
    clearProviders()
  })

  describe('createProvider', () => {
    it('should create provider using convenience function', () => {
      const config: AIConfig = {
        provider: 'openai',
        defaultModel: 'gpt-5.2',
        enableReasoning: false,
        openai: {
          apiKey: 'sk-test-key',
        },
      }

      const provider = createProvider(config)
      expect(provider).toBeInstanceOf(MockOpenAIProvider)
    })
  })

  describe('createProviderWithValidation', () => {
    it('should create provider with validation using convenience function', async () => {
      const config: AIConfig = {
        provider: 'openai',
        defaultModel: 'gpt-5.2',
        enableReasoning: false,
        openai: {
          apiKey: 'sk-valid-key',
        },
      }

      const provider = await createProviderWithValidation(config)
      expect(provider).toBeInstanceOf(MockOpenAIProvider)
    })
  })

  describe('registerProvider', () => {
    it('should register provider using convenience function', () => {
      clearProviders()

      registerProvider('test', MockOpenAIProvider)

      expect(isProviderRegistered('test')).toBe(true)
    })
  })

  describe('getAvailableProviders', () => {
    it('should get available providers using convenience function', () => {
      const providers = getAvailableProviders()
      expect(providers).toContain('openai')
      expect(providers).toContain('azure')
    })
  })
})
