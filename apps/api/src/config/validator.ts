import { isNotEmptyString } from '../utils/is'

/**
 * Configuration validation result
 */
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Migration guidance information
 */
export interface MigrationInfo {
  hasDeprecatedConfig: boolean
  deprecatedVars: string[]
  migrationSteps: string[]
}

/**
 * Validated configuration for the application
 */
export interface ValidatedConfig {
  apiKey: string
  baseUrl?: string
  model: string
  timeout: number
  disableDebug: boolean
}

/**
 * Migration step information
 */
export interface MigrationStep {
  action: string
  description: string
  example?: string
}

/**
 * Resource information for migration guidance
 */
export interface Resource {
  title: string
  url: string
  description: string
}

/**
 * Migration guidance with detailed steps and resources
 */
export interface MigrationGuidance {
  title: string
  description: string
  steps: readonly MigrationStep[]
  resources: readonly Resource[]
}

/**
 * Configuration error types
 */
export type ConfigurationErrorType = 'DEPRECATED_CONFIG' | 'MISSING_CONFIG' | 'INVALID_CONFIG'

/**
 * Configuration error with migration guidance
 */
export interface ConfigurationError {
  type: ConfigurationErrorType
  message: string
  deprecatedVars?: string[]
  migrationSteps?: string[]
  helpUrl?: string
}

/**
 * Migration error messages and guidance
 */
const MIGRATION_MESSAGES = {
  DEPRECATED_ACCESS_TOKEN: {
    title: 'Deprecated Configuration Detected',
    description:
      'The OPENAI_ACCESS_TOKEN variable is no longer supported. Please migrate to the official OpenAI API.',
    message:
      'OPENAI_ACCESS_TOKEN is no longer supported. Please migrate to the official OpenAI API.',
    steps: [
      {
        action: 'Remove OPENAI_ACCESS_TOKEN',
        description: 'Delete the OPENAI_ACCESS_TOKEN environment variable',
      },
      {
        action: 'Set OPENAI_API_KEY',
        description: 'Add your official OpenAI API key',
        example: 'OPENAI_API_KEY=sk-...',
      },
      {
        action: 'Remove API_REVERSE_PROXY',
        description: 'Delete the API_REVERSE_PROXY environment variable if present',
      },
    ],
    resources: [
      {
        title: 'Get OpenAI API Key',
        url: 'https://platform.openai.com/api-keys',
        description: 'Create and manage your OpenAI API keys',
      },
    ],
  },
  DEPRECATED_REVERSE_PROXY: {
    title: 'Deprecated Reverse Proxy Configuration Detected',
    description:
      'The API_REVERSE_PROXY variable is no longer supported. Please migrate to the official OpenAI API.',
    message: 'API_REVERSE_PROXY is no longer supported. Please migrate to the official OpenAI API.',
    steps: [
      {
        action: 'Remove API_REVERSE_PROXY',
        description: 'Delete the API_REVERSE_PROXY environment variable',
      },
      {
        action: 'Set OPENAI_API_KEY',
        description: 'Add your official OpenAI API key',
        example: 'OPENAI_API_KEY=sk-...',
      },
      {
        action: 'Optional: Set OPENAI_API_BASE_URL',
        description: 'Set custom API base URL if needed',
        example: 'OPENAI_API_BASE_URL=https://api.openai.com',
      },
    ],
    resources: [
      {
        title: 'Get OpenAI API Key',
        url: 'https://platform.openai.com/api-keys',
        description: 'Create and manage your OpenAI API keys',
      },
      {
        title: 'OpenAI API Documentation',
        url: 'https://platform.openai.com/docs/api-reference',
        description: 'Official OpenAI API documentation',
      },
    ],
  },
} as const

/**
 * Configuration validator for detecting deprecated variables and validating official API configuration
 */
export class ConfigurationValidator {
  /**
   * List of deprecated environment variables that are no longer supported
   */
  private static readonly DEPRECATED_VARIABLES = [
    'OPENAI_ACCESS_TOKEN',
    'API_REVERSE_PROXY',
    'CHATGPT_ACCESS_TOKEN',
    'REVERSE_PROXY_URL',
  ] as const

  /**
   * Validate environment configuration and fail on deprecated configurations
   * @throws {Error} If deprecated configuration is detected or required configuration is missing
   */
  static validateEnvironment(): void {
    const deprecatedVars = this.getDeprecatedVariables()

    if (deprecatedVars.length > 0) {
      const errorMessage = this.buildDeprecationErrorMessage(deprecatedVars)
      throw new Error(errorMessage)
    }

    // Check AI provider and validate appropriate environment variables
    const aiProvider = process.env.AI_PROVIDER || 'openai'

    if (aiProvider === 'azure') {
      // Validate Azure OpenAI configuration
      const azureApiKey = process.env.AZURE_OPENAI_API_KEY
      const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT
      const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT

      if (!isNotEmptyString(azureApiKey)) {
        const errorMessage = this.buildMissingConfigErrorMessage()
        throw new Error(errorMessage)
      }
      if (!isNotEmptyString(azureEndpoint)) {
        const errorMessage = this.buildMissingConfigErrorMessage()
        throw new Error(errorMessage)
      }
      if (!isNotEmptyString(azureDeployment)) {
        const errorMessage = this.buildMissingConfigErrorMessage()
        throw new Error(errorMessage)
      }
    } else {
      // Validate OpenAI configuration
      if (!isNotEmptyString(process.env.OPENAI_API_KEY) || !process.env.OPENAI_API_KEY.trim()) {
        const errorMessage = this.buildMissingConfigErrorMessage()
        throw new Error(errorMessage)
      }
    }
  }

  /**
   * Get validated configuration after environment validation
   * @returns {ValidatedConfig} Validated configuration object
   * @throws {Error} If validation fails
   */
  static getValidatedConfig(): ValidatedConfig {
    this.validateEnvironment()

    return {
      apiKey: process.env.OPENAI_API_KEY!,
      baseUrl: process.env.OPENAI_API_BASE_URL,
      model: process.env.OPENAI_API_MODEL || 'gpt-3.5-turbo',
      timeout: Number(process.env.TIMEOUT_MS) || 100000,
      disableDebug: process.env.OPENAI_API_DISABLE_DEBUG === 'true',
    }
  }

  /**
   * Check for deprecated environment variables
   * @returns {string[]} Array of deprecated variables found in environment
   */
  static getDeprecatedVariables(): string[] {
    return this.DEPRECATED_VARIABLES.filter(
      varName => process.env[varName] !== undefined && process.env[varName] !== '',
    )
  }

  /**
   * Get migration information for current configuration
   * @returns {MigrationInfo} Migration information object
   */
  static getMigrationInfo(): MigrationInfo {
    const deprecatedVars = this.getDeprecatedVariables()

    return {
      hasDeprecatedConfig: deprecatedVars.length > 0,
      deprecatedVars,
      migrationSteps: this.buildMigrationSteps(deprecatedVars),
    }
  }

  /**
   * Validate configuration without throwing errors
   * @returns {ValidationResult} Validation result with errors and warnings
   */
  static validateSafely(): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    const deprecatedVars = this.getDeprecatedVariables()

    if (deprecatedVars.length > 0) {
      errors.push(`Deprecated configuration detected: ${deprecatedVars.join(', ')}`)
    }

    // Check AI provider and validate appropriate environment variables
    const aiProvider = process.env.AI_PROVIDER || 'openai'

    if (aiProvider === 'azure') {
      // Validate Azure OpenAI configuration
      if (!isNotEmptyString(process.env.AZURE_OPENAI_API_KEY)) {
        errors.push('Missing required configuration: AZURE_OPENAI_API_KEY')
      }
      if (!isNotEmptyString(process.env.AZURE_OPENAI_ENDPOINT)) {
        errors.push('Missing required configuration: AZURE_OPENAI_ENDPOINT')
      }
      if (!isNotEmptyString(process.env.AZURE_OPENAI_DEPLOYMENT)) {
        errors.push('Missing required configuration: AZURE_OPENAI_DEPLOYMENT')
      }

      // Check for potential Azure configuration issues
      if (
        process.env.AZURE_OPENAI_ENDPOINT &&
        !process.env.AZURE_OPENAI_ENDPOINT.startsWith('https://')
      ) {
        warnings.push('AZURE_OPENAI_ENDPOINT should use HTTPS protocol')
      }
    } else {
      // Validate OpenAI configuration
      if (!isNotEmptyString(process.env.OPENAI_API_KEY) || !process.env.OPENAI_API_KEY.trim()) {
        errors.push('Missing required configuration: OPENAI_API_KEY')
      }

      // Check for potential OpenAI configuration issues
      if (
        process.env.OPENAI_API_BASE_URL &&
        !process.env.OPENAI_API_BASE_URL.startsWith('https://')
      ) {
        warnings.push('OPENAI_API_BASE_URL should use HTTPS protocol')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }

  /**
   * Build deprecation error message with migration guidance
   * @param {string[]} deprecatedVars - Array of deprecated variables found
   * @returns {string} Formatted error message with migration steps
   */
  private static buildDeprecationErrorMessage(deprecatedVars: string[]): string {
    const hasAccessToken =
      deprecatedVars.includes('OPENAI_ACCESS_TOKEN') ||
      deprecatedVars.includes('CHATGPT_ACCESS_TOKEN')
    const hasReverseProxy =
      deprecatedVars.includes('API_REVERSE_PROXY') || deprecatedVars.includes('REVERSE_PROXY_URL')

    let guidance: MigrationGuidance

    if (hasAccessToken) {
      guidance = MIGRATION_MESSAGES.DEPRECATED_ACCESS_TOKEN
    } else if (hasReverseProxy) {
      guidance = MIGRATION_MESSAGES.DEPRECATED_REVERSE_PROXY
    } else {
      // Generic deprecation message
      guidance = {
        title: 'Deprecated Configuration Detected',
        description: 'The following configuration variables are no longer supported.',
        steps: [
          {
            action: `Remove deprecated variables: ${deprecatedVars.join(', ')}`,
            description: 'Delete the deprecated environment variables',
          },
          {
            action: 'Set OPENAI_API_KEY',
            description: 'Add your official OpenAI API key',
            example: 'OPENAI_API_KEY=sk-...',
          },
        ],
        resources: [
          {
            title: 'Get OpenAI API Key',
            url: 'https://platform.openai.com/api-keys',
            description: 'Create and manage your OpenAI API keys',
          },
        ],
      }
    }

    return `
${guidance.title}

${guidance.description}

Deprecated variables found: ${deprecatedVars.join(', ')}

Migration Steps:
${guidance.steps
  .map(
    (step, index) =>
      `${index + 1}. ${step.action}
   ${step.description}${
     step.example
       ? `
   Example: ${step.example}`
       : ''
   }`,
  )
  .join('\n\n')}

Resources:
${guidance.resources
  .map(
    resource =>
      `• ${resource.title}: ${resource.url}
  ${resource.description}`,
  )
  .join('\n')}

Please update your configuration and restart the application.
    `.trim()
  }

  /**
   * Build missing configuration error message
   * @returns {string} Formatted error message for missing required configuration
   */
  private static buildMissingConfigErrorMessage(): string {
    const aiProvider = process.env.AI_PROVIDER || 'openai'

    if (aiProvider === 'azure') {
      return `
Missing Required Azure OpenAI Configuration

The application is configured to use Azure OpenAI but required environment variables are missing.

Required Azure OpenAI Environment Variables:
- AZURE_OPENAI_API_KEY: Your Azure OpenAI API key
- AZURE_OPENAI_ENDPOINT: Your Azure OpenAI endpoint (e.g., https://your-resource.openai.azure.com)
- AZURE_OPENAI_DEPLOYMENT: Your Azure OpenAI deployment name
- AZURE_OPENAI_API_VERSION: API version (optional, defaults to 2024-02-15-preview)

Setup Steps:
1. Get your Azure OpenAI credentials from the Azure Portal
2. Set the required environment variables
3. Restart the application

Example configuration:
AI_PROVIDER=azure
AZURE_OPENAI_API_KEY=your_azure_api_key_here
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=your_deployment_name
AZURE_OPENAI_API_VERSION=2024-02-15-preview

Please set your Azure OpenAI configuration and restart the application.
      `.trim()
    } else {
      return `
Missing Required Configuration: OPENAI_API_KEY

The application requires a valid OpenAI API key to function.

Setup Steps:
1. Get your API key from: https://platform.openai.com/api-keys
2. Set the environment variable: OPENAI_API_KEY=sk-your-api-key-here
3. Optionally set: OPENAI_API_BASE_URL=https://api.openai.com (if using a custom endpoint)

Example configuration:
OPENAI_API_KEY=sk-proj-...
OPENAI_API_MODEL=gpt-4o
OPENAI_API_BASE_URL=https://api.openai.com

Please set your API key and restart the application.
      `.trim()
    }
  }

  /**
   * Build migration steps based on deprecated variables found
   * @param {string[]} deprecatedVars - Array of deprecated variables
   * @returns {string[]} Array of migration step descriptions
   */
  private static buildMigrationSteps(deprecatedVars: string[]): string[] {
    const steps: string[] = []

    if (deprecatedVars.length > 0) {
      steps.push(`Remove deprecated variables: ${deprecatedVars.join(', ')}`)
    }

    // Check AI provider and provide appropriate migration steps
    const aiProvider = process.env.AI_PROVIDER || 'openai'

    if (aiProvider === 'azure') {
      if (!isNotEmptyString(process.env.AZURE_OPENAI_API_KEY)) {
        steps.push('Set AZURE_OPENAI_API_KEY with your Azure OpenAI API key')
      }
      if (!isNotEmptyString(process.env.AZURE_OPENAI_ENDPOINT)) {
        steps.push('Set AZURE_OPENAI_ENDPOINT with your Azure OpenAI endpoint')
      }
      if (!isNotEmptyString(process.env.AZURE_OPENAI_DEPLOYMENT)) {
        steps.push('Set AZURE_OPENAI_DEPLOYMENT with your Azure OpenAI deployment name')
      }
    } else {
      if (!isNotEmptyString(process.env.OPENAI_API_KEY) || !process.env.OPENAI_API_KEY.trim()) {
        steps.push('Set OPENAI_API_KEY with your official OpenAI API key')
      }
    }

    steps.push('Restart the application')

    return steps
  }
}
