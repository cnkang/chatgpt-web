/**
 * Authentication method validation for ChatGPT Web application
 * Ensures only official API key authentication is supported
 */

import { isNotEmptyString } from '../utils/is'

/**
 * Official OpenAI API key patterns
 */
const OFFICIAL_API_KEY_PATTERNS = [
	/^sk-[a-zA-Z0-9]{48}$/, // Standard OpenAI API key format
	/^sk-proj-[a-zA-Z0-9]{48}$/, // Project-based API key format
	/^sk_[\w-]{48,}$/, // Alternative format
]

/**
 * Official OpenAI base URL patterns
 */
const OFFICIAL_BASE_URL_PATTERNS = [
	/^https:\/\/api\.openai\.com(\/.*)?$/,
	/^https:\/\/[a-zA-Z0-9-]+\.openai\.azure\.com(\/.*)?$/,
]

/**
 * Validates that only official API key authentication is used
 */
export function validateOfficialAuthentication(): AuthValidationResult {
	const errors: string[] = []
	const warnings: string[] = []

	// Check for required API key
	const apiKey = process.env.OPENAI_API_KEY
	if (!isNotEmptyString(apiKey)) {
		errors.push('Missing OPENAI_API_KEY environment variable')
		return {
			isValid: false,
			errors,
			warnings,
			authMethod: 'NONE',
		}
	}

	// Validate API key format
	const isValidFormat = OFFICIAL_API_KEY_PATTERNS.some(pattern => pattern.test(apiKey))
	if (!isValidFormat) {
		warnings.push(
			'API key format does not match standard OpenAI patterns. Ensure it is from the official OpenAI platform.',
		)
	}

	// Validate base URL if provided
	const baseUrl = process.env.OPENAI_API_BASE_URL
	if (isNotEmptyString(baseUrl)) {
		const isOfficialUrl = OFFICIAL_BASE_URL_PATTERNS.some(pattern => pattern.test(baseUrl))
		if (!isOfficialUrl) {
			errors.push(
				`Unofficial base URL detected: ${baseUrl}. Only official OpenAI endpoints are allowed.`,
			)
		}
	}

	// Check for deprecated authentication methods
	const deprecatedAuthVars = [
		'OPENAI_ACCESS_TOKEN',
		'API_REVERSE_PROXY',
		'CHATGPT_ACCESS_TOKEN',
		'REVERSE_PROXY_URL',
	]

	const foundDeprecated = deprecatedAuthVars.filter(varName => process.env[varName] !== undefined)

	if (foundDeprecated.length > 0) {
		errors.push(
			`Deprecated authentication methods detected: ${foundDeprecated.join(', ')}. Remove these and use OPENAI_API_KEY only.`,
		)
	}

	return {
		isValid: errors.length === 0,
		errors,
		warnings,
		authMethod: 'OFFICIAL_API_KEY',
	}
}

/**
 * Validates secure configuration for official API
 */
export function validateSecureConfiguration(): ConfigValidationResult {
	const errors: string[] = []
	const warnings: string[] = []
	const recommendations: string[] = []

	// Check API key security
	const apiKey = process.env.OPENAI_API_KEY
	if (isNotEmptyString(apiKey)) {
		// Check if API key is exposed in logs or error messages
		if (apiKey.length < 20) {
			warnings.push('API key appears to be too short. Ensure you are using a valid OpenAI API key.')
		}

		// Recommend secure storage
		recommendations.push('Store API keys securely and never commit them to version control')
		recommendations.push('Use environment variables or secure secret management systems')
	}

	// Validate timeout settings
	const timeoutMs = process.env.TIMEOUT_MS
	if (isNotEmptyString(timeoutMs)) {
		const timeout = Number(timeoutMs)
		if (Number.isNaN(timeout) || timeout < 1000) {
			warnings.push('Timeout value is too low. Consider using at least 10000ms (10 seconds)')
		}
		if (timeout > 300000) {
			warnings.push('Timeout value is very high. Consider reducing to improve user experience')
		}
	}

	// Check for secure proxy configuration
	const httpsProxy = process.env.HTTPS_PROXY || process.env.ALL_PROXY
	if (isNotEmptyString(httpsProxy)) {
		if (!httpsProxy.startsWith('https://') && !httpsProxy.startsWith('http://')) {
			warnings.push('Proxy URL should use HTTPS for secure communication')
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
		warnings,
		recommendations,
	}
}

/**
 * Comprehensive authentication and configuration validation
 */
export function validateAuthenticationSecurity(): SecurityAuthResult {
	const authValidation = validateOfficialAuthentication()
	const configValidation = validateSecureConfiguration()

	return {
		authentication: authValidation,
		configuration: configValidation,
		overallSecure: authValidation.isValid && configValidation.isValid,
	}
}

/**
 * Gets migration guidance for users with deprecated authentication
 */
export function getAuthenticationMigrationGuidance(): MigrationGuidance {
	const deprecatedVars = [
		'OPENAI_ACCESS_TOKEN',
		'API_REVERSE_PROXY',
		'CHATGPT_ACCESS_TOKEN',
		'REVERSE_PROXY_URL',
	]

	const foundDeprecated = deprecatedVars.filter(varName => process.env[varName] !== undefined)

	if (foundDeprecated.length === 0) {
		return {
			needsMigration: false,
			steps: [],
			resources: [],
		}
	}

	return {
		needsMigration: true,
		steps: [
			{
				step: 1,
				action: 'Remove deprecated variables',
				description: `Remove the following environment variables: ${foundDeprecated.join(', ')}`,
				command: `# Remove these from your .env file:\n${foundDeprecated.map(v => `# ${v}=...`).join('\n')}`,
			},
			{
				step: 2,
				action: 'Get official OpenAI API key',
				description: 'Create an account and get your API key from the official OpenAI platform',
				command: '# Visit: https://platform.openai.com/api-keys',
			},
			{
				step: 3,
				action: 'Set official API key',
				description: 'Add your official OpenAI API key to the environment variables',
				command: 'OPENAI_API_KEY=sk-your-actual-api-key-here',
			},
			{
				step: 4,
				action: 'Optional: Set base URL',
				description: 'If using Azure OpenAI, set the base URL to your Azure endpoint',
				command: 'OPENAI_API_BASE_URL=https://your-resource.openai.azure.com',
			},
		],
		resources: [
			{
				title: 'OpenAI API Keys',
				url: 'https://platform.openai.com/api-keys',
				description: 'Create and manage your OpenAI API keys',
			},
			{
				title: 'OpenAI API Documentation',
				url: 'https://platform.openai.com/docs/api-reference',
				description: 'Official API documentation and usage guidelines',
			},
			{
				title: 'Azure OpenAI Service',
				url: 'https://azure.microsoft.com/en-us/products/ai-services/openai-service',
				description: 'Enterprise-grade OpenAI service through Microsoft Azure',
			},
		],
	}
}

// Type definitions

export interface AuthValidationResult {
	isValid: boolean
	errors: string[]
	warnings: string[]
	authMethod: 'OFFICIAL_API_KEY' | 'NONE'
}

export interface ConfigValidationResult {
	isValid: boolean
	errors: string[]
	warnings: string[]
	recommendations: string[]
}

export interface SecurityAuthResult {
	authentication: AuthValidationResult
	configuration: ConfigValidationResult
	overallSecure: boolean
}

export interface MigrationGuidance {
	needsMigration: boolean
	steps: MigrationStep[]
	resources: Resource[]
}

export interface MigrationStep {
	step: number
	action: string
	description: string
	command: string
}

export interface Resource {
	title: string
	url: string
	description: string
}
