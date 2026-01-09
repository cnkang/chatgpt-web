/**
 * AI Provider Factory
 * Creates provider instances based on configuration
 */

import type { AIProvider } from './base.js'
import type { AIConfig, AzureOpenAIConfig, OpenAIConfig } from './config.js'

type ProviderConstructor<TConfig, T extends AIProvider = AIProvider> = new (config: TConfig) => T

/**
 * Provider factory interface with TypeScript generics
 */
export interface ProviderFactory<T extends AIProvider = AIProvider> {
  create: (config: AIConfig) => T
  createOpenAI: (config: OpenAIConfig) => T
  createAzure: (config: AzureOpenAIConfig) => T
  getSupportedProviders: () => string[]
}

/**
 * Provider registry for managing available providers
 */
export class ProviderRegistry {
  private static providers = new Map<string, ProviderConstructor<unknown, AIProvider>>()

  /**
   * Register a provider class
   */
  static register<TConfig, T extends AIProvider>(
    name: string,
    providerClass: ProviderConstructor<TConfig, T>,
  ): void {
    this.providers.set(name, providerClass as ProviderConstructor<unknown, AIProvider>)
  }

  /**
   * Get a provider class by name
   */
  static get<TConfig, T extends AIProvider>(
    name: string,
  ): ProviderConstructor<TConfig, T> | undefined {
    return this.providers.get(name) as ProviderConstructor<TConfig, T> | undefined
  }

  /**
   * Get all registered provider names
   */
  static getRegisteredProviders(): string[] {
    return Array.from(this.providers.keys())
  }

  /**
   * Check if a provider is registered
   */
  static isRegistered(name: string): boolean {
    return this.providers.has(name)
  }

  /**
   * Clear all registered providers (mainly for testing)
   */
  static clear(): void {
    this.providers.clear()
  }
}

/**
 * Generic AI Provider Factory
 * Creates provider instances with type safety
 */
export class AIProviderFactory<T extends AIProvider = AIProvider> implements ProviderFactory<T> {
  private static instance: AIProviderFactory

  /**
   * Get singleton instance
   */
  public static getInstance<T extends AIProvider = AIProvider>(): AIProviderFactory<T> {
    if (!AIProviderFactory.instance) {
      AIProviderFactory.instance = new AIProviderFactory()
    }
    return AIProviderFactory.instance as AIProviderFactory<T>
  }

  /**
   * Create provider based on configuration
   */
  create(config: AIConfig): T {
    switch (config.provider) {
      case 'openai':
        if (!config.openai) {
          throw new Error('OpenAI configuration is required when using OpenAI provider')
        }
        return this.createOpenAI(config.openai)

      case 'azure':
        if (!config.azure) {
          throw new Error('Azure configuration is required when using Azure provider')
        }
        return this.createAzure(config.azure)

      default:
        throw new Error(`Unsupported provider: ${config.provider}`)
    }
  }

  /**
   * Create OpenAI provider instance
   */
  createOpenAI(config: OpenAIConfig): T {
    const ProviderClass = ProviderRegistry.get<OpenAIConfig, T>('openai')
    if (!ProviderClass) {
      throw new Error('OpenAI provider is not registered. Make sure to register it first.')
    }
    return new ProviderClass(config)
  }

  /**
   * Create Azure OpenAI provider instance
   */
  createAzure(config: AzureOpenAIConfig): T {
    const ProviderClass = ProviderRegistry.get<AzureOpenAIConfig, T>('azure')
    if (!ProviderClass) {
      throw new Error('Azure OpenAI provider is not registered. Make sure to register it first.')
    }
    return new ProviderClass(config)
  }

  /**
   * Get list of supported providers
   */
  getSupportedProviders(): string[] {
    return ProviderRegistry.getRegisteredProviders()
  }

  /**
   * Create provider with validation
   */
  createWithValidation(config: AIConfig): Promise<T> {
    const provider = this.create(config)
    return provider.validateConfiguration().then((isValid) => {
      if (!isValid) {
        throw new Error(`Provider ${config.provider} configuration validation failed`)
      }
      return provider
    })
  }

  /**
   * Create provider with retry logic
   */
  async createWithRetry(
    config: AIConfig,
    maxRetries: number = 3,
    retryDelay: number = 1000,
  ): Promise<T> {
    let lastError: Error | undefined
    const attemptCreate = async (attempt: number): Promise<T> => {
      try {
        return await this.createWithValidation(config)
      }
      catch (error) {
        lastError = error as Error
        if (attempt >= maxRetries) {
          throw error
        }
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt))
        return attemptCreate(attempt + 1)
      }
    }

    try {
      return await attemptCreate(1)
    }
    catch {
      throw new Error(
        `Failed to create provider after ${maxRetries} attempts. Last error: ${lastError?.message || 'Unknown error'}`,
      )
    }
  }
}

/**
 * Convenience function to create a provider
 */
export function createProvider<T extends AIProvider = AIProvider>(config: AIConfig): T {
  const factory = AIProviderFactory.getInstance<T>()
  return factory.create(config)
}

/**
 * Convenience function to create a provider with validation
 */
export async function createProviderWithValidation<T extends AIProvider = AIProvider>(
  config: AIConfig,
): Promise<T> {
  const factory = AIProviderFactory.getInstance<T>()
  return factory.createWithValidation(config)
}

/**
 * Register a provider for use with the factory
 */
export function registerProvider<TConfig, T extends AIProvider>(
  name: string,
  providerClass: ProviderConstructor<TConfig, T>,
): void {
  ProviderRegistry.register(name, providerClass)
}

/**
 * Get available provider names
 */
export function getAvailableProviders(): string[] {
  return ProviderRegistry.getRegisteredProviders()
}
