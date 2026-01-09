import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ConfigurationValidator } from '../config/validator'

describe('configuration Validation Integration', () => {
	let originalEnv: NodeJS.ProcessEnv

	beforeEach(() => {
		// Save original environment
		originalEnv = { ...process.env }
	})

	afterEach(() => {
		// Restore original environment
		process.env = originalEnv
	})

	describe('validateEnvironment', () => {
		it('should pass validation with valid official API configuration', () => {
			// Set up valid configuration
			process.env.OPENAI_API_KEY = 'sk-test-key-123'
			delete process.env.OPENAI_ACCESS_TOKEN
			delete process.env.API_REVERSE_PROXY

			expect(() => ConfigurationValidator.validateEnvironment()).not.toThrow()
		})

		it('should fail validation when OPENAI_ACCESS_TOKEN is present', () => {
			process.env.OPENAI_ACCESS_TOKEN = 'deprecated-token'
			process.env.OPENAI_API_KEY = 'sk-test-key-123'

			expect(() => ConfigurationValidator.validateEnvironment()).toThrow(
				/deprecated configuration/i,
			)
		})

		it('should fail validation when API_REVERSE_PROXY is present', () => {
			process.env.API_REVERSE_PROXY = 'https://proxy.example.com'
			process.env.OPENAI_API_KEY = 'sk-test-key-123'

			expect(() => ConfigurationValidator.validateEnvironment()).toThrow(
				/deprecated.*configuration/i,
			)
		})

		it('should fail validation when multiple deprecated variables are present', () => {
			process.env.OPENAI_ACCESS_TOKEN = 'deprecated-token'
			process.env.API_REVERSE_PROXY = 'https://proxy.example.com'
			process.env.OPENAI_API_KEY = 'sk-test-key-123'

			expect(() => ConfigurationValidator.validateEnvironment()).toThrow(
				/deprecated configuration/i,
			)
		})

		it('should fail validation when OPENAI_API_KEY is missing', () => {
			delete process.env.OPENAI_API_KEY
			delete process.env.OPENAI_ACCESS_TOKEN
			delete process.env.API_REVERSE_PROXY

			expect(() => ConfigurationValidator.validateEnvironment()).toThrow(
				/missing required configuration/i,
			)
		})

		it('should fail validation when OPENAI_API_KEY is empty', () => {
			process.env.OPENAI_API_KEY = ''
			delete process.env.OPENAI_ACCESS_TOKEN
			delete process.env.API_REVERSE_PROXY

			expect(() => ConfigurationValidator.validateEnvironment()).toThrow(
				/missing required configuration/i,
			)
		})

		it('should provide migration guidance in error message for access token', () => {
			process.env.OPENAI_ACCESS_TOKEN = 'deprecated-token'
			process.env.OPENAI_API_KEY = 'sk-test-key-123'

			try {
				ConfigurationValidator.validateEnvironment()
				expect.fail('Should have thrown an error')
			} catch (error) {
				const message = (error as Error).message
				expect(message).toContain('OPENAI_ACCESS_TOKEN')
				expect(message).toContain('Migration')
				expect(message).toContain('Remove')
				expect(message).toContain('OPENAI_API_KEY')
				expect(message).toContain('https://platform.openai.com/api-keys')
			}
		})

		it('should provide migration guidance in error message for reverse proxy', () => {
			process.env.API_REVERSE_PROXY = 'https://proxy.example.com'
			process.env.OPENAI_API_KEY = 'sk-test-key-123'

			try {
				ConfigurationValidator.validateEnvironment()
				expect.fail('Should have thrown an error')
			} catch (error) {
				const message = (error as Error).message
				expect(message).toContain('API_REVERSE_PROXY')
				expect(message).toContain('Migration')
				expect(message).toContain('Remove')
				expect(message).toContain('OPENAI_API_KEY')
				expect(message).toContain('https://platform.openai.com/api-keys')
			}
		})
	})

	describe('getValidatedConfig', () => {
		it('should return valid configuration when environment is correct', () => {
			process.env.OPENAI_API_KEY = 'sk-test-key-123'
			process.env.OPENAI_API_MODEL = 'gpt-4'
			process.env.OPENAI_API_BASE_URL = 'https://api.openai.com'
			process.env.TIMEOUT_MS = '60000'
			process.env.OPENAI_API_DISABLE_DEBUG = 'true'
			delete process.env.OPENAI_ACCESS_TOKEN
			delete process.env.API_REVERSE_PROXY

			const config = ConfigurationValidator.getValidatedConfig()

			expect(config.apiKey).toBe('sk-test-key-123')
			expect(config.model).toBe('gpt-4')
			expect(config.baseUrl).toBe('https://api.openai.com')
			expect(config.timeout).toBe(60000)
			expect(config.disableDebug).toBe(true)
		})

		it('should use default values when optional environment variables are not set', () => {
			process.env.OPENAI_API_KEY = 'sk-test-key-123'
			delete process.env.OPENAI_API_MODEL
			delete process.env.OPENAI_API_BASE_URL
			delete process.env.TIMEOUT_MS
			delete process.env.OPENAI_API_DISABLE_DEBUG
			delete process.env.OPENAI_ACCESS_TOKEN
			delete process.env.API_REVERSE_PROXY

			const config = ConfigurationValidator.getValidatedConfig()

			expect(config.apiKey).toBe('sk-test-key-123')
			expect(config.model).toBe('gpt-3.5-turbo')
			expect(config.baseUrl).toBeUndefined()
			expect(config.timeout).toBe(100000)
			expect(config.disableDebug).toBe(false)
		})

		it('should throw error when deprecated configuration is present', () => {
			process.env.OPENAI_ACCESS_TOKEN = 'deprecated-token'
			process.env.OPENAI_API_KEY = 'sk-test-key-123'

			expect(() => ConfigurationValidator.getValidatedConfig()).toThrow(/deprecated configuration/i)
		})
	})

	describe('getDeprecatedVariables', () => {
		it('should return empty array when no deprecated variables are present', () => {
			process.env.OPENAI_API_KEY = 'sk-test-key-123'
			delete process.env.OPENAI_ACCESS_TOKEN
			delete process.env.API_REVERSE_PROXY
			delete process.env.CHATGPT_ACCESS_TOKEN
			delete process.env.REVERSE_PROXY_URL

			const deprecated = ConfigurationValidator.getDeprecatedVariables()
			expect(deprecated).toEqual([])
		})

		it('should detect OPENAI_ACCESS_TOKEN', () => {
			process.env.OPENAI_ACCESS_TOKEN = 'deprecated-token'

			const deprecated = ConfigurationValidator.getDeprecatedVariables()
			expect(deprecated).toContain('OPENAI_ACCESS_TOKEN')
		})

		it('should detect API_REVERSE_PROXY', () => {
			process.env.API_REVERSE_PROXY = 'https://proxy.example.com'

			const deprecated = ConfigurationValidator.getDeprecatedVariables()
			expect(deprecated).toContain('API_REVERSE_PROXY')
		})

		it('should detect CHATGPT_ACCESS_TOKEN', () => {
			process.env.CHATGPT_ACCESS_TOKEN = 'deprecated-token'

			const deprecated = ConfigurationValidator.getDeprecatedVariables()
			expect(deprecated).toContain('CHATGPT_ACCESS_TOKEN')
		})

		it('should detect REVERSE_PROXY_URL', () => {
			process.env.REVERSE_PROXY_URL = 'https://proxy.example.com'

			const deprecated = ConfigurationValidator.getDeprecatedVariables()
			expect(deprecated).toContain('REVERSE_PROXY_URL')
		})

		it('should detect multiple deprecated variables', () => {
			process.env.OPENAI_ACCESS_TOKEN = 'deprecated-token'
			process.env.API_REVERSE_PROXY = 'https://proxy.example.com'
			process.env.CHATGPT_ACCESS_TOKEN = 'another-token'

			const deprecated = ConfigurationValidator.getDeprecatedVariables()
			expect(deprecated).toContain('OPENAI_ACCESS_TOKEN')
			expect(deprecated).toContain('API_REVERSE_PROXY')
			expect(deprecated).toContain('CHATGPT_ACCESS_TOKEN')
			expect(deprecated.length).toBe(3)
		})

		it('should ignore empty deprecated variables', () => {
			process.env.OPENAI_ACCESS_TOKEN = ''
			process.env.API_REVERSE_PROXY = 'https://proxy.example.com'

			const deprecated = ConfigurationValidator.getDeprecatedVariables()
			expect(deprecated).not.toContain('OPENAI_ACCESS_TOKEN')
			expect(deprecated).toContain('API_REVERSE_PROXY')
			expect(deprecated.length).toBe(1)
		})
	})

	describe('getMigrationInfo', () => {
		it('should return no migration needed when configuration is clean', () => {
			process.env.OPENAI_API_KEY = 'sk-test-key-123'
			delete process.env.OPENAI_ACCESS_TOKEN
			delete process.env.API_REVERSE_PROXY

			const migrationInfo = ConfigurationValidator.getMigrationInfo()
			expect(migrationInfo.hasDeprecatedConfig).toBe(false)
			expect(migrationInfo.deprecatedVars).toEqual([])
			expect(migrationInfo.migrationSteps).toEqual(['Restart the application'])
		})

		it('should return migration info when deprecated variables are present', () => {
			process.env.OPENAI_ACCESS_TOKEN = 'deprecated-token'
			process.env.API_REVERSE_PROXY = 'https://proxy.example.com'
			delete process.env.OPENAI_API_KEY

			const migrationInfo = ConfigurationValidator.getMigrationInfo()
			expect(migrationInfo.hasDeprecatedConfig).toBe(true)
			expect(migrationInfo.deprecatedVars).toContain('OPENAI_ACCESS_TOKEN')
			expect(migrationInfo.deprecatedVars).toContain('API_REVERSE_PROXY')
			expect(migrationInfo.migrationSteps).toContain(
				'Remove deprecated variables: OPENAI_ACCESS_TOKEN, API_REVERSE_PROXY',
			)
			expect(migrationInfo.migrationSteps).toContain(
				'Set OPENAI_API_KEY with your official OpenAI API key',
			)
		})
	})

	describe('validateSafely', () => {
		it('should return valid result for correct configuration', () => {
			process.env.OPENAI_API_KEY = 'sk-test-key-123'
			delete process.env.OPENAI_ACCESS_TOKEN
			delete process.env.API_REVERSE_PROXY

			const result = ConfigurationValidator.validateSafely()
			expect(result.isValid).toBe(true)
			expect(result.errors).toEqual([])
			expect(result.warnings).toEqual([])
		})

		it('should return errors for deprecated configuration', () => {
			process.env.OPENAI_ACCESS_TOKEN = 'deprecated-token'
			process.env.OPENAI_API_KEY = 'sk-test-key-123'

			const result = ConfigurationValidator.validateSafely()
			expect(result.isValid).toBe(false)
			expect(result.errors).toContain('Deprecated configuration detected: OPENAI_ACCESS_TOKEN')
		})

		it('should return errors for missing API key', () => {
			delete process.env.OPENAI_API_KEY
			delete process.env.OPENAI_ACCESS_TOKEN

			const result = ConfigurationValidator.validateSafely()
			expect(result.isValid).toBe(false)
			expect(result.errors).toContain('Missing required configuration: OPENAI_API_KEY')
		})

		it('should return warnings for insecure base URL', () => {
			process.env.OPENAI_API_KEY = 'sk-test-key-123'
			process.env.OPENAI_API_BASE_URL = 'http://insecure.example.com'
			delete process.env.OPENAI_ACCESS_TOKEN

			const result = ConfigurationValidator.validateSafely()
			expect(result.isValid).toBe(true)
			expect(result.warnings).toContain('OPENAI_API_BASE_URL should use HTTPS protocol')
		})

		it('should return both errors and warnings when applicable', () => {
			process.env.OPENAI_ACCESS_TOKEN = 'deprecated-token'
			process.env.OPENAI_API_KEY = 'sk-test-key-123'
			process.env.OPENAI_API_BASE_URL = 'http://insecure.example.com'

			const result = ConfigurationValidator.validateSafely()
			expect(result.isValid).toBe(false)
			expect(result.errors.length).toBeGreaterThan(0)
			expect(result.warnings.length).toBeGreaterThan(0)
		})
	})

	describe('startup Integration', () => {
		it('should simulate application startup failure with deprecated config', () => {
			process.env.OPENAI_ACCESS_TOKEN = 'deprecated-token'
			process.env.OPENAI_API_KEY = 'sk-test-key-123'

			// Simulate what would happen during application startup
			let startupError: Error | null = null
			try {
				ConfigurationValidator.validateEnvironment()
			} catch (error) {
				startupError = error as Error
			}

			expect(startupError).not.toBeNull()
			expect(startupError?.message).toContain('Deprecated')
			expect(startupError?.message).toContain('Migration')
		})

		it('should simulate successful application startup with valid config', () => {
			process.env.OPENAI_API_KEY = 'sk-test-key-123'
			delete process.env.OPENAI_ACCESS_TOKEN
			delete process.env.API_REVERSE_PROXY

			// Simulate what would happen during application startup
			let startupError: Error | null = null
			let config: ReturnType<typeof ConfigurationValidator.getValidatedConfig> | null = null
			try {
				ConfigurationValidator.validateEnvironment()
				config = ConfigurationValidator.getValidatedConfig()
			} catch (error) {
				startupError = error as Error
			}

			expect(startupError).toBeNull()
			expect(config).not.toBeNull()
			expect(config?.apiKey).toBe('sk-test-key-123')
		})
	})
})

// Property-based tests for configuration validation
describe('configuration Validation Properties', () => {
	let originalEnv: NodeJS.ProcessEnv

	beforeEach(() => {
		originalEnv = { ...process.env }
	})

	afterEach(() => {
		process.env = originalEnv
	})

	it('property: All deprecated configurations should be rejected', () => {
		const deprecatedVars = [
			'OPENAI_ACCESS_TOKEN',
			'API_REVERSE_PROXY',
			'CHATGPT_ACCESS_TOKEN',
			'REVERSE_PROXY_URL',
		]

		// Test each deprecated variable individually
		for (const deprecatedVar of deprecatedVars) {
			// Reset environment
			process.env = { ...originalEnv }
			process.env.OPENAI_API_KEY = 'sk-test-key-123'
			process.env[deprecatedVar] = 'test-value'

			expect(() => ConfigurationValidator.validateEnvironment()).toThrow(
				/deprecated.*configuration/i,
			)
		}
	})

	it('property: All combinations of deprecated variables should be rejected', () => {
		const deprecatedVars = [
			'OPENAI_ACCESS_TOKEN',
			'API_REVERSE_PROXY',
			'CHATGPT_ACCESS_TOKEN',
			'REVERSE_PROXY_URL',
		]

		// Test combinations of deprecated variables
		for (let i = 1; i < 2 ** deprecatedVars.length; i++) {
			// Reset environment
			process.env = { ...originalEnv }
			process.env.OPENAI_API_KEY = 'sk-test-key-123'

			// Set deprecated variables based on binary representation of i
			for (let j = 0; j < deprecatedVars.length; j++) {
				if (i & (1 << j)) {
					process.env[deprecatedVars[j]] = 'test-value'
				}
			}

			expect(() => ConfigurationValidator.validateEnvironment()).toThrow(
				/deprecated.*configuration/i,
			)
		}
	})

	it('property: Valid official API configurations should always be accepted', () => {
		const validConfigs = [
			{
				OPENAI_API_KEY: 'sk-test-key-123',
			},
			{
				OPENAI_API_KEY: 'sk-test-key-123',
				OPENAI_API_MODEL: 'gpt-4',
			},
			{
				OPENAI_API_KEY: 'sk-test-key-123',
				OPENAI_API_BASE_URL: 'https://api.openai.com',
			},
			{
				OPENAI_API_KEY: 'sk-test-key-123',
				OPENAI_API_MODEL: 'gpt-3.5-turbo',
				OPENAI_API_BASE_URL: 'https://api.openai.com',
				TIMEOUT_MS: '60000',
				OPENAI_API_DISABLE_DEBUG: 'true',
			},
		]

		for (const config of validConfigs) {
			// Reset environment
			process.env = { ...originalEnv }

			// Remove all deprecated variables
			delete process.env.OPENAI_ACCESS_TOKEN
			delete process.env.API_REVERSE_PROXY
			delete process.env.CHATGPT_ACCESS_TOKEN
			delete process.env.REVERSE_PROXY_URL

			// Set valid configuration
			Object.assign(process.env, config)

			expect(() => ConfigurationValidator.validateEnvironment()).not.toThrow()

			const validatedConfig = ConfigurationValidator.getValidatedConfig()
			expect(validatedConfig.apiKey).toBe(config.OPENAI_API_KEY)
		}
	})

	it('property: Missing OPENAI_API_KEY should always cause validation failure', () => {
		const apiKeyVariations = [undefined, '', '   ', null]

		for (const apiKeyValue of apiKeyVariations) {
			// Reset environment
			process.env = { ...originalEnv }

			// Remove all deprecated variables
			delete process.env.OPENAI_ACCESS_TOKEN
			delete process.env.API_REVERSE_PROXY
			delete process.env.CHATGPT_ACCESS_TOKEN
			delete process.env.REVERSE_PROXY_URL

			if (apiKeyValue === undefined || apiKeyValue === null) {
				delete process.env.OPENAI_API_KEY
			} else {
				process.env.OPENAI_API_KEY = apiKeyValue
			}

			expect(() => ConfigurationValidator.validateEnvironment()).toThrow(
				/missing required configuration/i,
			)
		}
	})
})
