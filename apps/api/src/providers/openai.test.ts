/**
 * Unit tests for OpenAI Provider
 * Tests API provider implementations according to task 7.2
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChatCompletionChunk, ChatCompletionRequest } from './base.js'
import { OpenAIProvider } from './openai.js'

interface MockOpenAIClient {
  chat: {
    completions: {
      create: ReturnType<typeof vi.fn>
    }
  }
  models: {
    list: ReturnType<typeof vi.fn>
  }
}

const { MockOpenAI } = vi.hoisted(() => {
  const mockCreate = vi.fn()
  const mockList = vi.fn()

  class MockOpenAI {
    apiKey: string

    constructor(config: { apiKey: string }) {
      this.apiKey = config.apiKey
    }

    chat = {
      completions: {
        create: mockCreate,
      },
    }

    models = {
      list: mockList,
    }
  }

  return { mockCreate, mockList, MockOpenAI }
})

// Mock the OpenAI SDK
vi.mock('openai', () => ({
  __esModule: true,
  default: MockOpenAI,
}))

// Mock the utility modules
vi.mock('../utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    logPerformance: vi.fn(),
  },
}))

vi.mock('../utils/retry.js', () => ({
  retryWithBackoff: vi.fn().mockImplementation(async (fn: () => Promise<unknown>) => await fn()),
}))

vi.mock('../utils/error-handler.js', () => ({
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
  },
}))

describe('openai provider', () => {
  let provider: OpenAIProvider
  let mockOpenAI: MockOpenAIClient

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks()

    // Set required environment variable for OpenAI
    process.env.OPENAI_API_KEY = 'sk-test-key'

    // Get the mocked OpenAI constructor
    const { default: OpenAI } = await import('openai')
    mockOpenAI = new OpenAI({
      apiKey: 'sk-test-key',
    }) as unknown as MockOpenAIClient

    // Create provider instance
    provider = new OpenAIProvider({
      apiKey: 'sk-test-key-1234567890abcdef1234567890abcdef1234567890',
      baseUrl: 'https://api.openai.com/v1',
      organization: 'test-org',
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('provider properties', () => {
    it('should have correct provider name', () => {
      expect(provider.name).toBe('openai')
    })

    it('should support streaming', () => {
      expect(provider.supportsStreaming).toBe(true)
    })

    it('should support reasoning', () => {
      expect(provider.supportsReasoning).toBe(true)
    })

    it('should have supported models list', () => {
      expect(provider.supportedModels).toContain('gpt-4o')
      expect(provider.supportedModels).toContain('gpt-3.5-turbo')
      expect(provider.supportedModels).toContain('o1-preview')
      expect(provider.supportedModels).toContain('o1-mini')
    })
  })

  describe('model support and capabilities', () => {
    it('should correctly identify supported models', () => {
      expect(provider.isModelSupported('gpt-4o')).toBe(true)
      expect(provider.isModelSupported('gpt-3.5-turbo')).toBe(true)
      expect(provider.isModelSupported('o1-preview')).toBe(true)
      expect(provider.isModelSupported('unsupported-model')).toBe(false)
    })

    it('should return correct capabilities for GPT-4o models', () => {
      const capabilities = provider.getModelCapabilities('gpt-4o')
      expect(capabilities.maxTokens).toBe(128000)
      expect(capabilities.supportsReasoning).toBe(false)
      expect(capabilities.supportsStreaming).toBe(true)
    })

    it('should return correct capabilities for reasoning models', () => {
      const capabilities = provider.getModelCapabilities('o1-preview')
      expect(capabilities.maxTokens).toBe(128000)
      expect(capabilities.supportsReasoning).toBe(true)
      expect(capabilities.supportsStreaming).toBe(false)
    })

    it('should return correct capabilities for GPT-3.5 models', () => {
      const capabilities = provider.getModelCapabilities('gpt-3.5-turbo')
      expect(capabilities.maxTokens).toBe(4096)
      expect(capabilities.supportsReasoning).toBe(false)
      expect(capabilities.supportsStreaming).toBe(true)
    })
  })

  describe('request validation', () => {
    it('should reject empty messages array', async () => {
      const request: ChatCompletionRequest = {
        messages: [],
        model: 'gpt-4o',
      }

      await expect(provider.createChatCompletion(request)).rejects.toThrow(
        'Messages array cannot be empty',
      )
    })

    it('should reject missing model', async () => {
      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: '',
      }

      await expect(provider.createChatCompletion(request)).rejects.toThrow('Model is required')
    })

    it('should reject unsupported model', async () => {
      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'unsupported-model',
      }

      await expect(provider.createChatCompletion(request)).rejects.toThrow(
        'Model unsupported-model is not supported by openai',
      )
    })

    it('should reject invalid temperature', async () => {
      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'gpt-4o',
        temperature: 3.0, // Invalid: > 2.0
      }

      await expect(provider.createChatCompletion(request)).rejects.toThrow(
        'Temperature must be between 0 and 2',
      )
    })

    it('should reject invalid max tokens', async () => {
      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'gpt-4o',
        maxTokens: -1, // Invalid: <= 0
      }

      await expect(provider.createChatCompletion(request)).rejects.toThrow(
        'Max tokens must be greater than 0',
      )
    })
  })

  describe('chat completion', () => {
    it('should create successful chat completion', async () => {
      const mockResponse = {
        id: 'chatcmpl-test',
        object: 'chat.completion',
        created: 1234567890,
        model: 'gpt-4o',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Hello! How can I help you?',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 15,
          total_tokens: 25,
        },
      }

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse)

      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 100,
      }

      const result = await provider.createChatCompletion(request)

      expect(result.id).toBe('chatcmpl-test')
      expect(result.model).toBe('gpt-4o')
      expect(result.choices[0].message.content).toBe('Hello! How can I help you?')
      expect(result.usage?.totalTokens).toBe(25)

      // Verify OpenAI API was called correctly
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
        max_tokens: 100,
        stream: false,
      })
    })

    it('should handle API errors correctly', async () => {
      const apiError = {
        status: 401,
        message: 'Invalid API key',
        code: 'invalid_api_key',
      }

      mockOpenAI.chat.completions.create.mockRejectedValue(apiError)

      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'gpt-4o',
      }

      await expect(provider.createChatCompletion(request)).rejects.toThrow()
    })
  })

  describe('streaming chat completion', () => {
    it('should create successful streaming chat completion', async () => {
      const mockChunks = [
        {
          id: 'chatcmpl-test',
          object: 'chat.completion.chunk',
          created: 1234567890,
          model: 'gpt-4o',
          choices: [
            {
              index: 0,
              delta: { role: 'assistant', content: 'Hello' },
              finish_reason: null,
            },
          ],
        },
        {
          id: 'chatcmpl-test',
          object: 'chat.completion.chunk',
          created: 1234567890,
          model: 'gpt-4o',
          choices: [
            {
              index: 0,
              delta: { content: '!' },
              finish_reason: 'stop',
            },
          ],
        },
      ]

      // Mock async iterator
      const mockStream = {
        async* [Symbol.asyncIterator]() {
          for (const chunk of mockChunks) {
            yield chunk
          }
        },
      }

      mockOpenAI.chat.completions.create.mockResolvedValue(mockStream)

      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'gpt-4o',
        stream: true,
      }

      const chunks: ChatCompletionChunk[] = []
      for await (const chunk of provider.createStreamingChatCompletion(request)) {
        chunks.push(chunk)
      }

      expect(chunks).toHaveLength(2)
      expect(chunks[0].choices[0].delta.content).toBe('Hello')
      expect(chunks[1].choices[0].delta.content).toBe('!')

      // Verify streaming API was called correctly
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: undefined,
        max_tokens: undefined,
        stream: true,
      })
    })
  })

  describe('configuration validation', () => {
    it('should validate configuration successfully', async () => {
      mockOpenAI.models.list.mockResolvedValue({ data: [] })

      const isValid = await provider.validateConfiguration()
      expect(isValid).toBe(true)
      expect(mockOpenAI.models.list).toHaveBeenCalled()
    })

    it('should handle configuration validation failure', async () => {
      mockOpenAI.models.list.mockRejectedValue(new Error('Invalid API key'))

      const isValid = await provider.validateConfiguration()
      expect(isValid).toBe(false)
    })
  })

  describe('usage information', () => {
    it('should return default usage info', async () => {
      const usage = await provider.getUsageInfo()

      expect(usage).toEqual({
        totalTokens: 0,
        promptTokens: 0,
        completionTokens: 0,
      })
    })
  })

  describe('reasoning steps extraction', () => {
    it('should extract reasoning steps from content', async () => {
      const mockResponse = {
        id: 'chatcmpl-test',
        object: 'chat.completion',
        created: 1234567890,
        model: 'o1-preview',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content:
                'Step 1: First I need to understand the problem. Step 2: Then I will solve it.',
            },
            finish_reason: 'stop',
          },
        ],
      }

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse)

      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Solve this problem' }],
        model: 'o1-preview',
      }

      const result = await provider.createChatCompletion(request)
      const reasoning = result.choices[0].message.reasoning

      expect(reasoning).toBeDefined()
      expect(reasoning).toHaveLength(2)
      expect(reasoning![0].step).toBe(1)
      expect(reasoning![0].thought).toContain('First I need to understand')
      expect(reasoning![1].step).toBe(2)
      expect(reasoning![1].thought).toContain('Then I will solve')
    })

    it('should return undefined for content without reasoning steps', async () => {
      const mockResponse = {
        id: 'chatcmpl-test',
        object: 'chat.completion',
        created: 1234567890,
        model: 'gpt-4o',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'This is a regular response without steps.',
            },
            finish_reason: 'stop',
          },
        ],
      }

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse)

      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'gpt-4o',
      }

      const result = await provider.createChatCompletion(request)
      const reasoning = result.choices[0].message.reasoning

      expect(reasoning).toBeUndefined()
    })
  })
})
