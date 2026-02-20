/**
 * Security validation utilities for ensuring unofficial API code removal
 * This module provides functions to validate that no security risks remain
 * from the unofficial proxy API implementation.
 */

import { isNotEmptyString } from '../utils/is'
import { isOfficialAzureOpenAIEndpoint, isOfficialOpenAIEndpoint } from '../utils/url-security'

/**
 * Security risk patterns that should not exist in the codebase
 */
const SECURITY_RISK_PATTERNS = [
  // Unofficial API patterns
  /ChatGPTUnofficialProxyAPI/gi,
  /accessToken/gi,
  /API_REVERSE_PROXY/gi,
  /OPENAI_ACCESS_TOKEN/gi,
  /reverseProxy/gi,

  // Web scraping patterns
  /puppeteer/gi,
  /playwright/gi,
  /selenium/gi,
  /webdriver/gi,
  /cheerio/gi,
  /jsdom/gi,

  // Browser automation patterns
  /headless.*browser/gi,
  /browser.*automation/gi,
  /web.*scraping/gi,
  /page\.goto/gi,
  /page\.click/gi,
  /page\.type/gi,
]

/**
 * Deprecated environment variables that pose security risks
 */
const DEPRECATED_ENV_VARS = [
  'OPENAI_ACCESS_TOKEN',
  'API_REVERSE_PROXY',
  'CHATGPT_ACCESS_TOKEN',
  'REVERSE_PROXY_URL',
]

/**
 * Validates that no deprecated environment variables are present
 */
export function validateEnvironmentSecurity(): SecurityValidationResult {
  const foundDeprecated = DEPRECATED_ENV_VARS.filter(varName => process.env[varName] !== undefined)

  if (foundDeprecated.length > 0) {
    return {
      isSecure: false,
      risks: foundDeprecated.map(varName => ({
        type: 'DEPRECATED_ENV_VAR',
        description: `Deprecated environment variable: ${varName}`,
        severity: 'HIGH',
        mitigation: `Remove ${varName} and use OPENAI_API_KEY instead`,
      })),
    }
  }

  return { isSecure: true, risks: [] }
}

/**
 * Validates that only official API authentication methods are used
 */
export function validateAuthenticationMethods(): SecurityValidationResult {
  const risks: SecurityRisk[] = []
  const aiProvider = process.env.AI_PROVIDER || 'openai'

  // Check for required official API key based on provider
  if (aiProvider === 'azure') {
    // Validate Azure OpenAI configuration
    if (!isNotEmptyString(process.env.AZURE_OPENAI_API_KEY)) {
      risks.push({
        type: 'MISSING_OFFICIAL_AUTH',
        description: 'Missing Azure OpenAI API key',
        severity: 'HIGH',
        mitigation: 'Set AZURE_OPENAI_API_KEY environment variable with your Azure OpenAI API key',
      })
    }
    if (!isNotEmptyString(process.env.AZURE_OPENAI_ENDPOINT)) {
      risks.push({
        type: 'MISSING_OFFICIAL_AUTH',
        description: 'Missing Azure OpenAI endpoint',
        severity: 'HIGH',
        mitigation:
          'Set AZURE_OPENAI_ENDPOINT environment variable with your Azure OpenAI endpoint',
      })
    }
    if (!isNotEmptyString(process.env.AZURE_OPENAI_DEPLOYMENT)) {
      risks.push({
        type: 'MISSING_OFFICIAL_AUTH',
        description: 'Missing Azure OpenAI deployment',
        severity: 'HIGH',
        mitigation:
          'Set AZURE_OPENAI_DEPLOYMENT environment variable with your Azure OpenAI deployment name',
      })
    }
  } else if (!isNotEmptyString(process.env.OPENAI_API_KEY)) {
    risks.push({
      type: 'MISSING_OFFICIAL_AUTH',
      description: 'Missing official OpenAI API key',
      severity: 'HIGH',
      mitigation: 'Set OPENAI_API_KEY environment variable with your official OpenAI API key',
    })
  }

  // Check for any unofficial authentication remnants
  const unofficialAuthVars = [
    'OPENAI_ACCESS_TOKEN',
    'API_REVERSE_PROXY',
    'CHATGPT_ACCESS_TOKEN',
    'REVERSE_PROXY_URL',
  ]
  const foundUnofficial = unofficialAuthVars.filter(varName => process.env[varName] !== undefined)

  foundUnofficial.forEach(varName => {
    risks.push({
      type: 'UNOFFICIAL_AUTH',
      description: `Unofficial authentication method detected: ${varName}`,
      severity: 'HIGH',
      mitigation: `Remove ${varName} and use official API configuration instead`,
    })
  })

  // Validate API key format if present based on provider
  if (aiProvider === 'azure') {
    // Skip API key format validation for Azure as formats may change
    // Azure API key validation will be handled by the actual API call
  } else {
    const apiKey = process.env.OPENAI_API_KEY
    if (isNotEmptyString(apiKey)) {
      const officialPatterns = [
        /^sk-[a-zA-Z0-9]{48}$/,
        /^sk-proj-[a-zA-Z0-9]{48}$/,
        /^sk_[\w-]{48,}$/,
      ]

      const isValidFormat = officialPatterns.some(pattern => pattern.test(apiKey))
      if (!isValidFormat) {
        risks.push({
          type: 'INVALID_API_KEY_FORMAT',
          description: 'API key format does not match standard OpenAI patterns',
          severity: 'MEDIUM',
          mitigation:
            'Ensure API key is from the official OpenAI platform (https://platform.openai.com/api-keys)',
        })
      }
    }
  }

  return {
    isSecure: risks.length === 0,
    risks,
  }
}

/**
 * Validates that code content doesn't contain security risk patterns
 */
export function validateCodeSecurity(content: string, filePath: string): SecurityValidationResult {
  const risks: SecurityRisk[] = []

  SECURITY_RISK_PATTERNS.forEach(pattern => {
    const matches = content.match(pattern)
    if (matches) {
      risks.push({
        type: 'SECURITY_RISK_PATTERN',
        description: `Security risk pattern found in ${filePath}: ${pattern.source}`,
        severity: 'MEDIUM',
        mitigation: 'Remove or replace with official API implementation',
      })
    }
  })

  return {
    isSecure: risks.length === 0,
    risks,
  }
}

/**
 * Validates that configuration only contains secure official API settings
 */
export function validateConfigurationSecurity(): SecurityValidationResult {
  const risks: SecurityRisk[] = []
  const aiProvider = process.env.AI_PROVIDER || 'openai'

  if (aiProvider === 'azure') {
    // Skip API key format validation for Azure as formats may change
    // Azure API key validation will be handled by the actual API call

    // Validate Azure endpoint if provided
    const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT
    if (isNotEmptyString(azureEndpoint) && !isOfficialAzureOpenAIEndpoint(azureEndpoint)) {
      risks.push({
        type: 'UNOFFICIAL_BASE_URL',
        description:
          'Azure endpoint does not point to official Azure OpenAI service or uses invalid protocol',
        severity: 'HIGH',
        mitigation: 'Use official Azure OpenAI endpoints with HTTPS (https://*.openai.azure.com)',
      })
    }
  } else {
    // Validate OpenAI API key format (should start with sk- for OpenAI)
    const apiKey = process.env.OPENAI_API_KEY
    if (isNotEmptyString(apiKey) && !apiKey.startsWith('sk-') && !apiKey.startsWith('sk_')) {
      risks.push({
        type: 'INVALID_API_KEY_FORMAT',
        description: 'API key does not follow official OpenAI format',
        severity: 'MEDIUM',
        mitigation: 'Ensure OPENAI_API_KEY starts with "sk-" and is from OpenAI platform',
      })
    }

    // Validate base URL if provided
    const baseUrl = process.env.OPENAI_API_BASE_URL
    if (isNotEmptyString(baseUrl) && !isOfficialOpenAIEndpoint(baseUrl)) {
          risks.push({
            type: 'UNOFFICIAL_BASE_URL',
            description:
              'Base URL does not point to official OpenAI endpoint or uses invalid protocol',
            severity: 'HIGH',
            mitigation: 'Use official OpenAI API endpoint with HTTPS (https://api.openai.com)',
          })
    }
  }

  return {
    isSecure: risks.length === 0,
    risks,
  }
}

/**
 * Comprehensive security validation
 */
export function performSecurityValidation(): SecurityValidationResult {
  const envValidation = validateEnvironmentSecurity()
  const authValidation = validateAuthenticationMethods()
  const configValidation = validateConfigurationSecurity()

  const allRisks = [...envValidation.risks, ...authValidation.risks, ...configValidation.risks]

  return {
    isSecure: allRisks.length === 0,
    risks: allRisks,
  }
}

/**
 * Security validation result interface
 */
export interface SecurityValidationResult {
  isSecure: boolean
  risks: SecurityRisk[]
}

/**
 * Security risk interface
 */
export interface SecurityRisk {
  type:
    | 'DEPRECATED_ENV_VAR'
    | 'MISSING_OFFICIAL_AUTH'
    | 'UNOFFICIAL_AUTH'
    | 'SECURITY_RISK_PATTERN'
    | 'INVALID_API_KEY_FORMAT'
    | 'UNOFFICIAL_BASE_URL'
  description: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  mitigation: string
}
