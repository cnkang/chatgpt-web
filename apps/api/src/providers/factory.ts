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
 * Register or replace a provider constructor under the given name.
 *
 * @param name - The identifier used to look up the provider when creating instances
 * @param providerClass - The provider constructor to register for `name`
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
 * List names of all registered providers.
 *
 * @returns An array of registered provider names
 */
export function getAvailableProviders(): string[] {
  return Array.from(providers.keys())
}

/**
 * Instantiate a registered AI provider based on the given configuration.
 *
 * Creates and returns a provider instance corresponding to `config.provider` using the provider-specific
 * configuration present on `config` (for example, `config.openai` for `"openai"` or `config.azure` for `"azure"`).
 *
 * @param config - Configuration object that specifies `provider` and the provider-specific settings
 * @returns An instance of the provider corresponding to `config.provider`
 * @throws If the named provider is not registered, if the provider-specific configuration is missing, or if the provider value is unsupported
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
 * Creates a provider instance for the given config and ensures its configuration is valid.
 *
 * @param config - The AI provider configuration, including the provider name and provider-specific settings.
 * @returns The validated provider instance.
 * @throws Error if the provider's configuration validation fails.
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
