/**
 * Configuration management for AI providers
 */

import type {
    AIConfig,
    AppConfiguration,
    AzureOpenAIConfig,
    BaseProviderConfig,
    DevelopmentConfig,
    OpenAIConfig,
    SecurityConfig,
    ServerConfig,
} from '@chatgpt-web/shared'

// Re-export types for convenience
export type {
    AIConfig,
    AppConfiguration,
    AzureOpenAIConfig,
    BaseProviderConfig,
    DevelopmentConfig,
    OpenAIConfig,
    SecurityConfig,
    ServerConfig
}

/**
 * Configuration manager class
 * Handles loading and validation of application configuration
 */
export class ConfigurationManager {
  private static instance: ConfigurationManager
  private config: AppConfiguration

  private constructor() {
    this.config = this.loadConfiguration()
  }

  public static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager()
    }
    return ConfigurationManager.instance
  }

  public getConfig(): AppConfiguration {
    return this.config
  }

  public getAIConfig(): AIConfig {
    return this.config.ai
  }

  public getServerConfig(): ServerConfig {
    return this.config.server
  }

  public getSecurityConfig(): SecurityConfig {
    return this.config.security
  }

  public getDevelopmentConfig(): DevelopmentConfig {
    return this.config.development
  }

  /**
   * Reload configuration from environment variables
   */
  public reloadConfiguration(): void {
    this.config = this.loadConfiguration()
  }

  /**
   * Validate configuration
   */
  public validateConfiguration(): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Validate AI configuration
    if (!this.config.ai.provider) {
      errors.push('AI provider is required')
    }

    if (this.config.ai.provider === 'openai') {
      if (!this.config.ai.openai?.apiKey) {
        errors.push('OpenAI API key is required when using OpenAI provider')
      }
    }

    if (this.config.ai.provider === 'azure') {
      const azure = this.config.ai.azure
      if (!azure?.apiKey) {
        errors.push('Azure API key is required when using Azure provider')
      }
      if (!azure?.endpoint) {
        errors.push('Azure endpoint is required when using Azure provider')
      }
      if (!azure?.deployment) {
        errors.push('Azure deployment is required when using Azure provider')
      }
      if (!azure?.apiVersion) {
        errors.push('Azure API version is required when using Azure provider')
      }
    }

    if (!this.config.ai.defaultModel) {
      errors.push('Default model is required')
    }

    // Validate server configuration
    if (!this.config.server.port || this.config.server.port <= 0) {
      errors.push('Valid server port is required')
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Load configuration from environment variables
   */
  private loadConfiguration(): AppConfiguration {
    return {
      server: {
        port: Number.parseInt(process.env.PORT || '3002', 10),
        host: process.env.HOST || '0.0.0.0',
        cors: {
          origin: process.env.CORS_ORIGIN?.split(',') || '*',
          credentials: process.env.CORS_CREDENTIALS === 'true',
        },
      },
      ai: {
        provider: (process.env.AI_PROVIDER as 'openai' | 'azure') || 'openai',
        defaultModel: process.env.DEFAULT_MODEL || 'gpt-4o',
        enableReasoning: process.env.ENABLE_REASONING === 'true',
        timeout: Number.parseInt(process.env.TIMEOUT_MS || '100000', 10),
        openai: {
          apiKey: process.env.OPENAI_API_KEY || '',
          baseUrl: process.env.OPENAI_API_BASE_URL,
          organization: process.env.OPENAI_ORGANIZATION,
        },
        azure: {
          apiKey: process.env.AZURE_OPENAI_API_KEY || '',
          endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
          deployment: process.env.AZURE_OPENAI_DEPLOYMENT || '',
          apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
          useResponsesAPI: process.env.AZURE_OPENAI_USE_RESPONSES_API === 'true',
        },
      },
      security: {
        enableRateLimit: process.env.ENABLE_RATE_LIMIT !== 'false',
        rateLimitWindowMs: Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
        rateLimitMaxRequests: Number.parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
        enableCSP: process.env.ENABLE_CSP !== 'false',
        enableHSTS: process.env.ENABLE_HSTS !== 'false',
        apiKeyHeader: process.env.API_KEY_HEADER || 'authorization',
      },
      development: {
        debug: process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true',
        logLevel: (process.env.LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug') || 'info',
        hotReload: process.env.HOT_RELOAD === 'true',
      },
    }
  }
}

/**
 * Get configuration instance
 */
export function getConfig(): AppConfiguration {
  return ConfigurationManager.getInstance().getConfig()
}

/**
 * Get AI configuration
 */
export function getAIConfig(): AIConfig {
  return ConfigurationManager.getInstance().getAIConfig()
}

/**
 * Validate current configuration
 */
export function validateConfig(): { isValid: boolean; errors: string[] } {
  return ConfigurationManager.getInstance().validateConfiguration()
}
