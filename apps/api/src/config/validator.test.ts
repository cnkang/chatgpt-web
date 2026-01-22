import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ConfigurationValidator } from './validator.js'

describe('configurationValidator - Deprecated Configuration Rejection', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env }
    // Clear environment variables
    delete process.env.OPENAI_ACCESS_TOKEN
    delete process.env.CHATGPT_ACCESS_TOKEN
    delete process.env.API_REVERSE_PROXY
    delete process.env.REVERSE_PROXY_URL
    delete process.env.OPENAI_API_KEY
  })

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv
  })

  describe('deprecated Configuration Detection', () => {
    it('should reject OPENAI_ACCESS_TOKEN configuration', () => {
      process.env.OPENAI_ACCESS_TOKEN = 'fake-access-token'

      expect(() => ConfigurationValidator.validateEnvironment()).toThrow(
        /deprecated.*configuration/i,
      )
      expect(() => ConfigurationValidator.validateEnvironment()).toThrow(/OPENAI_ACCESS_TOKEN/)
    })

    it('should reject CHATGPT_ACCESS_TOKEN configuration', () => {
      process.env.CHATGPT_ACCESS_TOKEN = 'fake-access-token'

      expect(() => ConfigurationValidator.validateEnvironment()).toThrow(
        /deprecated.*configuration/i,
      )
      expect(() => ConfigurationValidator.validateEnvironment()).toThrow(/CHATGPT_ACCESS_TOKEN/)
    })

    it('should reject API_REVERSE_PROXY configuration', () => {
      process.env.API_REVERSE_PROXY = 'https://fake-proxy.com'

      expect(() => ConfigurationValidator.validateEnvironment()).toThrow(
        /deprecated.*configuration/i,
      )
      expect(() => ConfigurationValidator.validateEnvironment()).toThrow(/API_REVERSE_PROXY/)
    })

    it('should reject REVERSE_PROXY_URL configuration', () => {
      process.env.REVERSE_PROXY_URL = 'https://fake-proxy.com'

      expect(() => ConfigurationValidator.validateEnvironment()).toThrow(
        /deprecated.*configuration/i,
      )
      expect(() => ConfigurationValidator.validateEnvironment()).toThrow(/REVERSE_PROXY_URL/)
    })

    it('should reject multiple deprecated configurations', () => {
      process.env.OPENAI_ACCESS_TOKEN = 'fake-access-token'
      process.env.API_REVERSE_PROXY = 'https://fake-proxy.com'

      expect(() => ConfigurationValidator.validateEnvironment()).toThrow(
        /deprecated.*configuration/i,
      )
      expect(() => ConfigurationValidator.validateEnvironment()).toThrow(/OPENAI_ACCESS_TOKEN/)
      expect(() => ConfigurationValidator.validateEnvironment()).toThrow(/API_REVERSE_PROXY/)
    })
  })

  describe('migration Error Messages', () => {
    it('should provide migration guidance for access token', () => {
      process.env.OPENAI_ACCESS_TOKEN = 'fake-access-token'

      try {
        ConfigurationValidator.validateEnvironment()
        expect.fail('Should have thrown an error')
      } catch (error) {
        const errorMessage = (error as Error).message
        expect(errorMessage).toContain('migrate to the official OpenAI API')
        expect(errorMessage).toContain('OPENAI_API_KEY')
        expect(errorMessage).toContain('https://platform.openai.com/api-keys')
      }
    })

    it('should provide migration guidance for reverse proxy', () => {
      process.env.API_REVERSE_PROXY = 'https://fake-proxy.com'

      try {
        ConfigurationValidator.validateEnvironment()
        expect.fail('Should have thrown an error')
      } catch (error) {
        const errorMessage = (error as Error).message
        expect(errorMessage).toContain('Deprecated')
        expect(errorMessage).toContain('API_REVERSE_PROXY')
      }
    })

    it('should include removal steps in error message', () => {
      process.env.OPENAI_ACCESS_TOKEN = 'fake-access-token'

      try {
        ConfigurationValidator.validateEnvironment()
        expect.fail('Should have thrown an error')
      } catch (error) {
        const errorMessage = (error as Error).message
        expect(errorMessage).toContain('Migration Steps')
        expect(errorMessage).toContain('Remove')
        expect(errorMessage).toContain('OPENAI_API_KEY')
      }
    })
  })

  describe('valid Configuration Acceptance', () => {
    it('should accept valid OPENAI_API_KEY configuration', () => {
      process.env.OPENAI_API_KEY = 'sk-fake-api-key-12345'

      expect(() => ConfigurationValidator.validateEnvironment()).not.toThrow()
    })

    it('should accept OPENAI_API_KEY with optional base URL', () => {
      process.env.OPENAI_API_KEY = 'sk-fake-api-key-12345'
      process.env.OPENAI_API_BASE_URL = 'https://api.openai.com'

      expect(() => ConfigurationValidator.validateEnvironment()).not.toThrow()
    })

    it('should accept OPENAI_API_KEY with model specification', () => {
      process.env.OPENAI_API_KEY = 'sk-fake-api-key-12345'
      process.env.OPENAI_API_MODEL = 'gpt-4'

      expect(() => ConfigurationValidator.validateEnvironment()).not.toThrow()
    })
  })

  describe('missing Required Configuration', () => {
    it('should reject configuration without OPENAI_API_KEY', () => {
      // No API key set

      expect(() => ConfigurationValidator.validateEnvironment()).toThrow(
        /missing required configuration/i,
      )
      expect(() => ConfigurationValidator.validateEnvironment()).toThrow(/OPENAI_API_KEY/)
    })

    it('should provide setup guidance for missing API key', () => {
      try {
        ConfigurationValidator.validateEnvironment()
        expect.fail('Should have thrown an error')
      } catch (error) {
        const errorMessage = (error as Error).message
        expect(errorMessage).toContain('OPENAI_API_KEY')
        expect(errorMessage).toContain('https://platform.openai.com/api-keys')
      }
    })
  })

  describe('configuration Validation Result', () => {
    it('should return validated config for valid environment', () => {
      process.env.OPENAI_API_KEY = 'sk-fake-api-key-12345'
      process.env.OPENAI_API_MODEL = 'gpt-4'
      process.env.TIMEOUT_MS = '60000'

      const config = ConfigurationValidator.getValidatedConfig()

      expect(config.apiKey).toBe('sk-fake-api-key-12345')
      expect(config.model).toBe('gpt-4')
      expect(config.timeout).toBe(60000)
    })

    it('should use default values for optional configuration', () => {
      process.env.OPENAI_API_KEY = 'sk-fake-api-key-12345'

      const config = ConfigurationValidator.getValidatedConfig()

      expect(config.apiKey).toBe('sk-fake-api-key-12345')
      expect(config.model).toBe('gpt-3.5-turbo') // default
      expect(config.timeout).toBe(100000) // default
    })
  })
})
