/**
 * AI Provider Abstraction Layer
 * Exports all provider-related interfaces, classes, and utilities
 */

import { AzureOpenAIProvider } from './azure.js'
import { registerProvider } from './factory.js'
import { OpenAIProvider } from './openai.js'

// Provider implementations
export { AzureOpenAIProvider } from './azure.js'

// Base interfaces and classes
export type {
	AIProvider,
	ChatCompletionChunk,
	ChatCompletionRequest,
	ChatCompletionResponse,
	ChatMessage,
	ProviderError,
	ReasoningStep,
	UsageInfo,
} from './base.js'

export { BaseAIProvider } from './base.js'

// Configuration management
export type {
	AIConfig,
	AppConfiguration,
	AzureOpenAIConfig,
	BaseProviderConfig,
	DevelopmentConfig,
	OpenAIConfig,
	SecurityConfig,
	ServerConfig,
} from './config.js'

export { ConfigurationManager, getAIConfig, getConfig, validateConfig } from './config.js'

// Provider factory
export type { ProviderFactory } from './factory.js'

export {
	AIProviderFactory,
	createProvider,
	createProviderWithValidation,
	getAvailableProviders,
	ProviderRegistry,
	registerProvider,
} from './factory.js'

export { OpenAIProvider } from './openai.js'

// Register providers with the factory
registerProvider('openai', OpenAIProvider)
registerProvider('azure', AzureOpenAIProvider)
