/**
 * AI Provider Factory
 * Creates provider instances based on configuration
 */

import type { AIProvider } from './base.js'
import type { AIConfig } from './config.js'

type ProviderConstructor<TConfig, T extends AIProvider = AIProvider> = new (config: TConfig) => T

// Provider Registry
const providers = new Map<string, ProviderConstructor<unknown, AIProvider>>()

/**
 * Register a provider class
 */
export function registerProvider<TConfig, T extends AIProvider>(
  name: string,
  providerClass: ProviderConstructor<TConfig, T>,
): void {
  providers.set(name, providerClass as ProviderConstructor<unknown, AIProvider>)
}

/**
 * Check if a provider is registered
 */
export function isProviderRegistered(name: string): boolean {
  return providers.has(name)
}

/**
 * Clear all registered providers (mainly for testing)
 */
export function clearProviders(): void {
  providers.clear()
}

/**
 * Get available provider names
 */
export function getAvailableProviders(): string[] {
  return Array.from(providers.keys())
}

/**
 * Create provider based on configuration
 */
export function createProvider<T extends AIProvider = AIProvider>(config: AIConfig): T {
  const ProviderClass = providers.get(config.provider) as
    | ProviderConstructor<unknown, T>
    | undefined

  if (!ProviderClass) {
    throw new Error(
      `Provider "${config.provider}" is not registered. Available providers: ${getAvailableProviders().join(', ')}`,
    )
  }

  switch (config.provider) {
    case 'openai':
      if (!config.openai) {
        throw new Error('OpenAI configuration is required when using OpenAI provider')
      }
      return new ProviderClass(config.openai) as T

    case 'azure':
      if (!config.azure) {
        throw new Error('Azure configuration is required when using Azure provider')
      }
      return new ProviderClass(config.azure) as T

    default:
      throw new Error(`Unsupported provider: ${config.provider}`)
  }
}

/**
 * Create provider with validation
 */
export async function createProviderWithValidation<T extends AIProvider = AIProvider>(
  config: AIConfig,
): Promise<T> {
  const provider = createProvider<T>(config)
  const isValid = await provider.validateConfiguration()

  if (!isValid) {
    throw new Error(`Provider ${config.provider} configuration validation failed`)
  }

  return provider
}
