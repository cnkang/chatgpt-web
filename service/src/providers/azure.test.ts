/**
 * Unit tests for Azure OpenAI Provider
 * Tests Azure-specific provider implementation according to task 7.2
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AzureOpenAIProvider } from './azure.js'
import type { ChatCompletionRequest } from './base.js'

interface MockAzureOpenAIClient {
	chat: {
		completions: {
			create: ReturnType<typeof vi.fn>
		}
	}
}

const { MockAzureOpenAI } = vi.hoisted(() => {
	const mockCreate = vi.fn()

	class MockAzureOpenAI {
		chat = {
			completions: {
				create: mockCreate,
			},
		}
	}

	return { mockCreate, MockAzureOpenAI }
})

// Mock the OpenAI SDK (AzureOpenAI)
vi.mock('openai', () => ({
	__esModule: true,
	AzureOpenAI: MockAzureOpenAI,
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
	retryWithBackoff: vi.fn().mockImplementation(async fn => await fn()),
}))

vi.mock('../utils/error-handler.js', () => ({
	createExternalApiError: vi.fn().mockImplementation(message => new Error(message)),
	createNetworkError: vi.fn().mockImplementation(message => new Error(message)),
	createTimeoutError: vi.fn().mockImplementation(message => new Error(message)),
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

describe('azure openai provider', () => {
	let provider: AzureOpenAIProvider
	let mockAzureOpenAI: MockAzureOpenAIClient

	beforeEach(async () => {
		// Reset all mocks
		vi.clearAllMocks()

		// Set required environment variables for AzureOpenAI
		process.env.OPENAI_API_VERSION = '2024-02-15-preview'

		// Get the mocked AzureOpenAI constructor
		const { AzureOpenAI } = await import('openai')
		mockAzureOpenAI = new AzureOpenAI({
			apiKey: 'test-key',
			endpoint: 'https://test.openai.azure.com',
			apiVersion: '2024-02-15-preview',
		}) as unknown as AzureOpenAI

		// Create provider instance
		provider = new AzureOpenAIProvider({
			apiKey: 'test-azure-key-1234567890abcdef1234567890abcdef',
			endpoint: 'https://test-resource.openai.azure.com',
			deployment: 'gpt-4o-deployment',
			apiVersion: '2024-02-15-preview',
		})
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	describe('provider properties', () => {
		it('should have correct provider name', () => {
			expect(provider.name).toBe('azure')
		})

		it('should support streaming', () => {
			expect(provider.supportsStreaming).toBe(true)
		})

		it('should support reasoning', () => {
			expect(provider.supportsReasoning).toBe(true)
		})

		it('should have Azure-specific supported models', () => {
			expect(provider.supportedModels).toContain('gpt-4o')
			expect(provider.supportedModels).toContain('gpt-35-turbo') // Azure naming
			expect(provider.supportedModels).toContain('o1-preview')
			expect(provider.supportedModels).toContain('o1-mini')
		})
	})

	describe('model support and capabilities', () => {
		it('should correctly identify supported models', () => {
			expect(provider.isModelSupported('gpt-4o')).toBe(true)
			expect(provider.isModelSupported('gpt-35-turbo')).toBe(true)
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

		it('should return correct capabilities for GPT-35 models', () => {
			const capabilities = provider.getModelCapabilities('gpt-35-turbo')
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
				'Model unsupported-model is not supported by azure',
			)
		})
	})

	describe('chat completion', () => {
		it('should create successful chat completion', async () => {
			const mockResponse = {
				id: 'chatcmpl-azure-test',
				created: 1234567890,
				model: 'gpt-4o-deployment',
				choices: [
					{
						message: {
							content: 'Hello from Azure!',
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

			mockAzureOpenAI.chat.completions.create.mockResolvedValue(mockResponse)

			const request: ChatCompletionRequest = {
				messages: [{ role: 'user', content: 'Hello' }],
				model: 'gpt-4o',
				temperature: 0.7,
				maxTokens: 100,
			}

			const result = await provider.createChatCompletion(request)

			expect(result.id).toBe('chatcmpl-azure-test')
			expect(result.model).toBe('gpt-4o-deployment')
			expect(result.choices[0].message.content).toBe('Hello from Azure!')
			expect(result.usage?.totalTokens).toBe(25)

			// Verify Azure OpenAI API was called correctly
			expect(mockAzureOpenAI.chat.completions.create).toHaveBeenCalledWith({
				model: 'gpt-4o', // This becomes the deployment name
				messages: [{ role: 'user', content: 'Hello' }],
				temperature: 0.7,
				max_tokens: 100,
				stream: false,
			})
		})

		it('should handle missing response fields gracefully', async () => {
			const mockResponse = {
				// Missing id, created, model
				choices: [
					{
						message: {
							content: 'Response without metadata',
						},
						finish_reason: 'stop',
					},
				],
			}

			mockAzureOpenAI.chat.completions.create.mockResolvedValue(mockResponse)

			const request: ChatCompletionRequest = {
				messages: [{ role: 'user', content: 'Hello' }],
				model: 'gpt-4o',
			}

			const result = await provider.createChatCompletion(request)

			// Should generate default values
			expect(result.id).toMatch(/^azure-\d+$/)
			expect(result.model).toBe('gpt-4o-deployment') // Uses deployment name
			expect(result.choices[0].message.content).toBe('Response without metadata')
		})

		it('should handle Azure-specific API errors', async () => {
			const azureError = {
				status: 404,
				message: 'Deployment not found',
			}

			mockAzureOpenAI.chat.completions.create.mockRejectedValue(azureError)

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
					id: 'chatcmpl-azure-test',
					created: 1234567890,
					model: 'gpt-4o-deployment',
					choices: [
						{
							delta: { role: 'assistant', content: 'Hello' },
							finish_reason: null,
						},
					],
				},
				{
					id: 'chatcmpl-azure-test',
					created: 1234567890,
					model: 'gpt-4o-deployment',
					choices: [
						{
							delta: { content: ' from Azure!' },
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

			mockAzureOpenAI.chat.completions.create.mockResolvedValue(mockStream)

			const request: ChatCompletionRequest = {
				messages: [{ role: 'user', content: 'Hello' }],
				model: 'gpt-4o',
				stream: true,
			}

			const chunks: unknown[] = []
			for await (const chunk of provider.createStreamingChatCompletion(request)) {
				chunks.push(chunk)
			}

			expect(chunks).toHaveLength(2)
			expect(chunks[0].choices[0].delta.content).toBe('Hello')
			expect(chunks[1].choices[0].delta.content).toBe(' from Azure!')

			// Verify streaming API was called correctly
			expect(mockAzureOpenAI.chat.completions.create).toHaveBeenCalledWith({
				model: 'gpt-4o',
				messages: [{ role: 'user', content: 'Hello' }],
				temperature: undefined,
				max_tokens: undefined,
				stream: true,
			})
		})

		it('should handle missing chunk fields gracefully', async () => {
			const mockChunks = [
				{
					// Missing id, created, model
					choices: [
						{
							delta: { content: 'Chunk without metadata' },
						},
					],
				},
			]

			const mockStream = {
				async* [Symbol.asyncIterator]() {
					for (const chunk of mockChunks) {
						yield chunk
					}
				},
			}

			mockAzureOpenAI.chat.completions.create.mockResolvedValue(mockStream)

			const request: ChatCompletionRequest = {
				messages: [{ role: 'user', content: 'Hello' }],
				model: 'gpt-4o',
			}

			const chunks: unknown[] = []
			for await (const chunk of provider.createStreamingChatCompletion(request)) {
				chunks.push(chunk)
			}

			expect(chunks).toHaveLength(1)
			expect(chunks[0].id).toMatch(/^azure-chunk-\d+$/)
			expect(chunks[0].model).toBe('gpt-4o-deployment')
		})
	})

	describe('configuration validation', () => {
		it('should validate configuration successfully', async () => {
			mockAzureOpenAI.chat.completions.create.mockResolvedValue({
				choices: [{ message: { content: 'test' } }],
			})

			const isValid = await provider.validateConfiguration()
			expect(isValid).toBe(true)

			// Should make a test API call
			expect(mockAzureOpenAI.chat.completions.create).toHaveBeenCalledWith({
				model: 'gpt-4o-deployment',
				messages: [{ role: 'user', content: 'test' }],
				max_tokens: 1,
			})
		})

		it('should handle configuration validation failure', async () => {
			mockAzureOpenAI.chat.completions.create.mockRejectedValue(new Error('Invalid deployment'))

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

	describe('azure-specific error handling', () => {
		it('should handle deployment not found error', async () => {
			const azureError = {
				status: 404,
				message: 'The specified deployment does not exist',
			}

			mockAzureOpenAI.chat.completions.create.mockRejectedValue(azureError)

			const request: ChatCompletionRequest = {
				messages: [{ role: 'user', content: 'Hello' }],
				model: 'gpt-4o',
			}

			await expect(provider.createChatCompletion(request)).rejects.toThrow()
		})

		it('should handle Azure authentication errors', async () => {
			const azureError = {
				status: 401,
				message: 'Access denied due to invalid subscription key',
			}

			mockAzureOpenAI.chat.completions.create.mockRejectedValue(azureError)

			const request: ChatCompletionRequest = {
				messages: [{ role: 'user', content: 'Hello' }],
				model: 'gpt-4o',
			}

			await expect(provider.createChatCompletion(request)).rejects.toThrow()
		})

		it('should handle Azure rate limiting', async () => {
			const azureError = {
				status: 429,
				message: 'Rate limit exceeded for deployment',
			}

			mockAzureOpenAI.chat.completions.create.mockRejectedValue(azureError)

			const request: ChatCompletionRequest = {
				messages: [{ role: 'user', content: 'Hello' }],
				model: 'gpt-4o',
			}

			await expect(provider.createChatCompletion(request)).rejects.toThrow()
		})
	})

	describe('message conversion', () => {
		it('should convert internal messages to Azure format correctly', async () => {
			const mockResponse = {
				id: 'test',
				choices: [{ message: { content: 'response' }, finish_reason: 'stop' }],
			}

			mockAzureOpenAI.chat.completions.create.mockResolvedValue(mockResponse)

			const request: ChatCompletionRequest = {
				messages: [
					{ role: 'system', content: 'You are a helpful assistant' },
					{ role: 'user', content: 'Hello' },
					{ role: 'assistant', content: 'Hi there!' },
				],
				model: 'gpt-4o',
			}

			await provider.createChatCompletion(request)

			// Verify messages were converted correctly
			expect(mockAzureOpenAI.chat.completions.create).toHaveBeenCalledWith(
				expect.objectContaining({
					messages: [
						{ role: 'system', content: 'You are a helpful assistant' },
						{ role: 'user', content: 'Hello' },
						{ role: 'assistant', content: 'Hi there!' },
					],
				}),
			)
		})
	})
})
