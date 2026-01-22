import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ConfigurationValidator } from './config/validator.js'

describe('startup Validation - Deprecated Configuration Handling', () => {
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

  describe('configuration Validation Error Messages', () => {
    it('should include specific deprecated variables in error message', () => {
      process.env.OPENAI_ACCESS_TOKEN = 'fake-token'
      process.env.API_REVERSE_PROXY = 'https://fake-proxy.com'

      try {
        ConfigurationValidator.validateEnvironment()
        expect.fail('Should have thrown an error')
      } catch (error) {
        const errorMessage = (error as Error).message
        expect(errorMessage).toContain('OPENAI_ACCESS_TOKEN')
        expect(errorMessage).toContain('API_REVERSE_PROXY')
      }
    })

    it('should provide step-by-step migration instructions', () => {
      process.env.OPENAI_ACCESS_TOKEN = 'fake-token'

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

    it('should include helpful resource links', () => {
      process.env.OPENAI_ACCESS_TOKEN = 'fake-token'

      try {
        ConfigurationValidator.validateEnvironment()
        expect.fail('Should have thrown an error')
      } catch (error) {
        const errorMessage = (error as Error).message
        expect(errorMessage).toContain('https://platform.openai.com/api-keys')
      }
    })

    it('should provide migration guidance on startup failure', () => {
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

    it('should start successfully with valid configuration', () => {
      process.env.OPENAI_API_KEY = 'sk-fake-api-key-12345'

      // This should not throw with valid configuration
      expect(() => ConfigurationValidator.validateEnvironment()).not.toThrow()
    })
  })
})
