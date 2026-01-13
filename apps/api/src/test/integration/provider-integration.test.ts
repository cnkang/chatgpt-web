/**
 * Integration tests for AI Provider functionality
 * Tests provider switching, reasoning model integration, and security measures
 * Validates Requirements: 7.3, 4.1, 6.1-6.8
 */

import type { ChatCompletionRequest } from '../../providers/base.js'
import type { AIConfig } from '../../providers/config.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AzureOpenAIProvider } from '../../providers/azure.js'
import { AIProviderFactory, ProviderRegistry, registerProvider } from '../../providers/factory.js'
import { OpenAIProvider } from '../../providers/openai.js'

const { MockOpenAI, MockAzureOpenAI } = vi.hoisted(() => {
  const mockOpenAICreate = vi.fn()
  const mockOpenAIList = vi.fn()
  const mockAzureCreate = vi.fn()

  class MockOpenAI {
    chat = {
      completions: {
        create: mockOpenAICreate,
      },
    }

    models = {
      list: mockOpenAIList,
    }
  }

  class MockAzureOpenAI {
    chat = {
      completions: {
        create: mockAzureCreate,
      },
    }
  }

  return { mockOpenAICreate, mockOpenAIList, mockAzureCreate, MockOpenAI, MockAzureOpenAI }
})

// Mock the OpenAI SDK to avoid real API calls during testing
vi.mock('openai', () => ({
  __esModule: true,
  default: MockOpenAI,
  AzureOpenAI: MockAzureOpenAI,
}))

// Mock utility modules
vi.mock('../../utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    logPerformance: vi.fn(),
  },
}))

vi.mock('../../utils/retry.js', () => ({
  retryWithBackoff: vi.fn().mockImplementation(async (fn: () => Promise<unknown>) => await fn()),
}))

vi.mock('../../utils/error-handler.js', () => ({
  createExternalApiError: vi.fn().mockImplementation((message: string) => new Error(message)),
  createNetworkError: vi.fn().mockImplementation((message: string) => new Error(message)),
  createTimeoutError: vi.fn().mockImplementation((message: string) => new Error(message)),
  ErrorType: {
    NETWORK: 'NETWORK',
    TIMEOUT: 'TIMEOUT',
    EXTERNAL_API: 'EXTERNAL_API',
    AUTHENTICATION: 'AUTHENTICATION',
    AUTHORIZATION: 'AUTHORIZATION',
    RATE_LIMIT: 'RATE_LIMIT',
    CONFIGURATION: 'CONFIGURATION',
  },
}))

describe('provider integration tests', () => {
  let factory: AIProviderFactory

  beforeEach(() => {
    // Clear registry and register providers fresh for each test
    ProviderRegistry.clear()
    registerProvider('openai', OpenAIProvider)
    registerProvider('azure', AzureOpenAIProvider)
    factory = AIProviderFactory.getInstance()

    // Reset all mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    ProviderRegistry.clear()
  })

  describe('provider switching integration', () => {
    it('should switch between OpenAI and Azure providers seamlessly', async () => {
      // Test OpenAI provider creation
      const openAIConfig: AIConfig = {
        provider: 'openai',
        defaultModel: 'gpt-3.5-turbo',
        enableReasoning: false,
        openai: {
          apiKey: 'sk-test-openai-key-1234567890abcdef1234567890abcdef1234567890',
          baseUrl: 'https://api.openai.com/v1',
          organization: 'test-org',
        },
      }

      const openAIProvider = factory.create(openAIConfig)
      expect(openAIProvider.name).toBe('openai')
      expect(openAIProvider.supportsStreaming).toBe(true)
      expect(openAIProvider.supportsReasoning).toBe(true)

      // Test Azure provider creation
      const azureConfig: AIConfig = {
        provider: 'azure',
        defaultModel: 'gpt-4o',
        enableReasoning: false,
        azure: {
          apiKey: 'test-azure-key-1234567890abcdef1234567890abcdef',
          endpoint: 'https://test-resource.openai.azure.com',
          deployment: 'gpt-4o-deployment',
          apiVersion: '2024-02-15-preview',
        },
      }

      const azureProvider = factory.create(azureConfig)
      expect(azureProvider.name).toBe('azure')
      expect(azureProvider.supportsStreaming).toBe(true)
      expect(azureProvider.supportsReasoning).toBe(true)

      // Verify both providers maintain consistent interface
      expect(openAIProvider.supportsStreaming).toBe(azureProvider.supportsStreaming)
      expect(openAIProvider.supportsReasoning).toBe(azureProvider.supportsReasoning)
    })

    it('should handle provider errors consistently', async () => {
      // Test OpenAI error handling
      const openAIProvider = factory.create({
        provider: 'openai',
        defaultModel: 'gpt-3.5-turbo',
        enableReasoning: false,
        openai: { apiKey: 'sk-test-key' },
      })

      // Test Azure error handling
      const azureProvider = factory.create({
        provider: 'azure',
        defaultModel: 'gpt-4o',
        enableReasoning: false,
        azure: {
          apiKey: 'azure-key',
          endpoint: 'https://test.openai.azure.com',
          deployment: 'gpt-4o',
          apiVersion: '2024-02-15-preview',
        },
      })

      // Both providers should exist and be ready for error testing
      expect(openAIProvider).toBeDefined()
      expect(azureProvider).toBeDefined()
    })
  })

  describe('reasoning model integration', () => {
    it('should support reasoning models across providers', async () => {
      const provider = factory.create({
        provider: 'openai',
        defaultModel: 'gpt-3.5-turbo',
        enableReasoning: true,
        openai: {
          apiKey: 'sk-test-key',
          baseUrl: 'https://api.openai.com/v1',
        },
      })

      // Test reasoning model capabilities
      const o1Capabilities = provider.getModelCapabilities('o1-preview')
      expect(o1Capabilities.supportsReasoning).toBe(true)
      expect(o1Capabilities.supportsStreaming).toBe(false) // Reasoning models don't support streaming

      const o1MiniCapabilities = provider.getModelCapabilities('o1-mini')
      expect(o1MiniCapabilities.supportsReasoning).toBe(true)
    })

    it('should handle reasoning model limitations correctly', async () => {
      const provider = factory.create({
        provider: 'openai',
        defaultModel: 'o1-preview',
        enableReasoning: true,
        openai: { apiKey: 'sk-test-key' },
      })

      // Test that reasoning models are identified correctly
      expect(provider.isModelSupported('o1-preview')).toBe(true)
      expect(provider.isModelSupported('o1-mini')).toBe(true)
      expect(provider.isModelSupported('o1')).toBe(true)

      // Test model capabilities
      const capabilities = provider.getModelCapabilities('o1-preview')
      expect(capabilities.supportsReasoning).toBe(true)
      expect(capabilities.supportsStreaming).toBe(false)
      expect(capabilities.maxTokens).toBe(128000)
    })
  })

  describe('security measures integration', () => {
    it('should validate input parameters across all providers', async () => {
      const provider = factory.create({
        provider: 'openai',
        defaultModel: 'gpt-4o',
        enableReasoning: false,
        openai: { apiKey: 'sk-test-key' },
      })

      // Test empty messages validation
      const emptyRequest: ChatCompletionRequest = {
        messages: [],
        model: 'gpt-4o',
      }

      await expect(provider.createChatCompletion(emptyRequest)).rejects.toThrow(
        'Messages array cannot be empty',
      )

      // Test invalid temperature validation
      const invalidTempRequest: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'test' }],
        model: 'gpt-4o',
        temperature: 3.0, // Invalid: > 2.0
      }

      await expect(provider.createChatCompletion(invalidTempRequest)).rejects.toThrow(
        'Temperature must be between 0 and 2',
      )

      // Test invalid max tokens validation
      const invalidTokensRequest: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'test' }],
        model: 'gpt-4o',
        maxTokens: -1, // Invalid: <= 0
      }

      await expect(provider.createChatCompletion(invalidTokensRequest)).rejects.toThrow(
        'Max tokens must be greater than 0',
      )

      // Test unsupported model validation
      const unsupportedModelRequest: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'test' }],
        model: 'unsupported-model',
      }

      await expect(provider.createChatCompletion(unsupportedModelRequest)).rejects.toThrow(
        'Model unsupported-model is not supported by openai',
      )
    })

    it('should implement consistent error handling across providers', async () => {
      const openAIProvider = factory.create({
        provider: 'openai',
        defaultModel: 'gpt-3.5-turbo',
        enableReasoning: false,
        openai: { apiKey: 'sk-test-key' },
      })

      const azureProvider = factory.create({
        provider: 'azure',
        defaultModel: 'gpt-4o',
        enableReasoning: false,
        azure: {
          apiKey: 'azure-key',
          endpoint: 'https://test.openai.azure.com',
          deployment: 'gpt-4o',
          apiVersion: '2024-02-15-preview',
        },
      })

      // Both providers should handle validation consistently
      const request: ChatCompletionRequest = {
        messages: [],
        model: 'gpt-4o',
      }

      await expect(openAIProvider.createChatCompletion(request)).rejects.toThrow(
        'Messages array cannot be empty',
      )
      await expect(azureProvider.createChatCompletion(request)).rejects.toThrow(
        'Messages array cannot be empty',
      )
    })
  })

  describe('provider factory integration', () => {
    it('should create providers with consistent interfaces', async () => {
      const openAIProvider = factory.create({
        provider: 'openai',
        defaultModel: 'gpt-3.5-turbo',
        enableReasoning: false,
        openai: { apiKey: 'sk-test-key' },
      })

      const azureProvider = factory.create({
        provider: 'azure',
        defaultModel: 'gpt-4o',
        enableReasoning: false,
        azure: {
          apiKey: 'azure-key',
          endpoint: 'https://test.openai.azure.com',
          deployment: 'gpt-4o',
          apiVersion: '2024-02-15-preview',
        },
      })

      // Both providers should implement the same interface
      expect(typeof openAIProvider.createChatCompletion).toBe('function')
      expect(typeof openAIProvider.createStreamingChatCompletion).toBe('function')
      expect(typeof openAIProvider.validateConfiguration).toBe('function')
      expect(typeof openAIProvider.getUsageInfo).toBe('function')

      expect(typeof azureProvider.createChatCompletion).toBe('function')
      expect(typeof azureProvider.createStreamingChatCompletion).toBe('function')
      expect(typeof azureProvider.validateConfiguration).toBe('function')
      expect(typeof azureProvider.getUsageInfo).toBe('function')
    })

    it('should handle unsupported provider gracefully', async () => {
      const invalidConfig: AIConfig = {
        provider: 'unsupported' as unknown as AIConfig['provider'],
        defaultModel: 'gpt-3.5-turbo',
        enableReasoning: false,
      }

      expect(() => factory.create(invalidConfig)).toThrow('Unsupported provider: unsupported')
    })
  })

  describe('model capabilities integration', () => {
    it('should provide accurate model capabilities across providers', async () => {
      const openAIProvider = factory.create({
        provider: 'openai',
        defaultModel: 'gpt-3.5-turbo',
        enableReasoning: false,
        openai: { apiKey: 'sk-test-key' },
      })

      const azureProvider = factory.create({
        provider: 'azure',
        defaultModel: 'gpt-4o',
        enableReasoning: false,
        azure: {
          apiKey: 'azure-key',
          endpoint: 'https://test.openai.azure.com',
          deployment: 'gpt-4o',
          apiVersion: '2024-02-15-preview',
        },
      })

      // Test GPT-4o capabilities
      const openAIGpt4oCapabilities = openAIProvider.getModelCapabilities('gpt-4o')
      const azureGpt4oCapabilities = azureProvider.getModelCapabilities('gpt-4o')

      expect(openAIGpt4oCapabilities.maxTokens).toBe(128000)
      expect(azureGpt4oCapabilities.maxTokens).toBe(128000)
      expect(openAIGpt4oCapabilities.supportsStreaming).toBe(true)
      expect(azureGpt4oCapabilities.supportsStreaming).toBe(true)

      // Test reasoning model capabilities
      const reasoningCapabilities = openAIProvider.getModelCapabilities('o1-preview')
      expect(reasoningCapabilities.supportsReasoning).toBe(true)
      expect(reasoningCapabilities.supportsStreaming).toBe(false)
      expect(reasoningCapabilities.maxTokens).toBe(128000)
    })

    it('should support model validation across providers', async () => {
      const openAIProvider = factory.create({
        provider: 'openai',
        defaultModel: 'gpt-3.5-turbo',
        enableReasoning: false,
        openai: { apiKey: 'sk-test-key' },
      })

      const azureProvider = factory.create({
        provider: 'azure',
        defaultModel: 'gpt-4o',
        enableReasoning: false,
        azure: {
          apiKey: 'azure-key',
          endpoint: 'https://test.openai.azure.com',
          deployment: 'gpt-4o',
          apiVersion: '2024-02-15-preview',
        },
      })

      // Test model support validation
      expect(openAIProvider.isModelSupported('gpt-4o')).toBe(true)
      expect(openAIProvider.isModelSupported('gpt-3.5-turbo')).toBe(true)
      expect(openAIProvider.isModelSupported('o1-preview')).toBe(true)
      expect(openAIProvider.isModelSupported('unsupported-model')).toBe(false)

      expect(azureProvider.isModelSupported('gpt-4o')).toBe(true)
      expect(azureProvider.isModelSupported('gpt-35-turbo')).toBe(true) // Azure naming
      expect(azureProvider.isModelSupported('o1-preview')).toBe(true)
      expect(azureProvider.isModelSupported('unsupported-model')).toBe(false)
    })
  })
})
