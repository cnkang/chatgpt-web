import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  validateAuthenticationMethods,
  validateCodeSecurity,
  validateConfigurationSecurity,
  validateEnvironmentSecurity,
} from './validator.js'

describe('security Validator - Unofficial API Pattern Detection', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env }
    // Clear environment variables
    delete process.env.OPENAI_ACCESS_TOKEN
    delete process.env.API_REVERSE_PROXY
    delete process.env.OPENAI_API_KEY
    delete process.env.OPENAI_API_BASE_URL
    delete process.env.AZURE_OPENAI_ENDPOINT
    delete process.env.AI_PROVIDER
    delete process.env.SKIP_API_DOMAIN_CHECK
  })

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv
  })

  describe('code Security Scanning', () => {
    it('should detect ChatGPTUnofficialProxyAPI references', () => {
      const codeWithUnofficialAPI = `
        import { ChatGPTUnofficialProxyAPI } from 'chatgpt'
        const api = new ChatGPTUnofficialProxyAPI({
          accessToken: 'fake-token'
        })
      `

      const result = validateCodeSecurity(codeWithUnofficialAPI, 'test.ts')

      expect(result.isSecure).toBe(false)
      expect(result.risks.length).toBeGreaterThan(0)
      expect(
        result.risks.some(risk => risk.description.includes('ChatGPTUnofficialProxyAPI')),
      ).toBe(true)
    })

    it('should detect accessToken references', () => {
      const codeWithAccessToken = `
        const config = {
          accessToken: process.env.OPENAI_ACCESS_TOKEN,
          model: 'gpt-3.5-turbo'
        }
      `

      const result = validateCodeSecurity(codeWithAccessToken, 'test.ts')

      expect(result.isSecure).toBe(false)
      expect(result.risks.length).toBeGreaterThan(0)
      expect(result.risks.some(risk => risk.description.includes('accessToken'))).toBe(true)
    })

    it('should detect API_REVERSE_PROXY references', () => {
      const codeWithReverseProxy = `
        const proxyUrl = process.env.API_REVERSE_PROXY
        if (proxyUrl) {
          // Configure reverse proxy
        }
      `

      const result = validateCodeSecurity(codeWithReverseProxy, 'test.ts')

      expect(result.isSecure).toBe(false)
      expect(result.risks.length).toBeGreaterThan(0)
      expect(result.risks.some(risk => risk.description.includes('API_REVERSE_PROXY'))).toBe(true)
    })

    it('should detect reverseProxy field references', () => {
      const codeWithReverseProxyField = `
        interface Config {
          reverseProxy?: string
          apiKey: string
        }
      `

      const result = validateCodeSecurity(codeWithReverseProxyField, 'test.ts')

      expect(result.isSecure).toBe(false)
      expect(result.risks.length).toBeGreaterThan(0)
      expect(result.risks.some(risk => risk.description.includes('reverseProxy'))).toBe(true)
    })

    it('should detect web scraping patterns', () => {
      const codeWithWebScraping = `
        import puppeteer from 'puppeteer'
        const browser = await puppeteer.launch()
        const page = await browser.newPage()
        await page.goto('https://chat.openai.com')
      `

      const result = validateCodeSecurity(codeWithWebScraping, 'test.ts')

      expect(result.isSecure).toBe(false)
      expect(result.risks.length).toBeGreaterThan(0)
      expect(result.risks.some(risk => risk.description.includes('puppeteer'))).toBe(true)
    })

    it('should detect browser automation patterns', () => {
      const codeWithBrowserAutomation = `
        import { chromium } from 'playwright'
        const browser = await chromium.launch()
        await page.click('#login-button')
      `

      const result = validateCodeSecurity(codeWithBrowserAutomation, 'test.ts')

      expect(result.isSecure).toBe(false)
      expect(result.risks.length).toBeGreaterThan(0)
      expect(
        result.risks.some(
          risk =>
            risk.description.includes('playwright') || risk.description.includes('page.click'),
        ),
      ).toBe(true)
    })

    it('should pass clean official API code', () => {
      const cleanCode = `
        import { ChatGPTAPI } from 'chatgpt'
        const api = new ChatGPTAPI({
          apiKey: process.env.OPENAI_API_KEY,
          completionParams: { model: 'gpt-3.5-turbo' }
        })
      `

      const result = validateCodeSecurity(cleanCode, 'test.ts')

      expect(result.isSecure).toBe(true)
      expect(result.risks).toHaveLength(0)
    })

    it('should detect multiple security risks', () => {
      const codeWithMultipleRisks = `
        import { ChatGPTUnofficialProxyAPI } from 'chatgpt'
        import puppeteer from 'puppeteer'
        
        const api = new ChatGPTUnofficialProxyAPI({
          accessToken: process.env.OPENAI_ACCESS_TOKEN,
          apiReverseProxyUrl: process.env.API_REVERSE_PROXY
        })
        
        const browser = await puppeteer.launch()
      `

      const result = validateCodeSecurity(codeWithMultipleRisks, 'test.ts')

      expect(result.isSecure).toBe(false)
      expect(result.risks.length).toBeGreaterThan(1)
    })
  })

  describe('environment Variable Security Check', () => {
    it('should detect deprecated environment variables', () => {
      process.env.OPENAI_ACCESS_TOKEN = 'fake-token'
      process.env.API_REVERSE_PROXY = 'https://fake-proxy.com'

      const result = validateEnvironmentSecurity()

      expect(result.isSecure).toBe(false)
      expect(result.risks.length).toBeGreaterThan(0)
      expect(result.risks.some(risk => risk.description.includes('OPENAI_ACCESS_TOKEN'))).toBe(true)
      expect(result.risks.some(risk => risk.description.includes('API_REVERSE_PROXY'))).toBe(true)
    })

    it('should pass clean environment variables', () => {
      // Only set clean environment variables
      process.env.OPENAI_API_KEY = 'sk-fake-key'
      process.env.OPENAI_API_BASE_URL = 'https://api.openai.com'

      const result = validateEnvironmentSecurity()

      expect(result.isSecure).toBe(true)
      expect(result.risks).toHaveLength(0)
    })
  })

  describe('authentication Method Validation', () => {
    it('should require official API key', () => {
      // No API key set

      const result = validateAuthenticationMethods()

      expect(result.isSecure).toBe(false)
      expect(result.risks.some(risk => risk.type === 'MISSING_OFFICIAL_AUTH')).toBe(true)
    })

    it('should detect unofficial authentication methods', () => {
      process.env.OPENAI_ACCESS_TOKEN = 'fake-token'
      process.env.OPENAI_API_KEY = 'sk-fake-key'

      const result = validateAuthenticationMethods()

      expect(result.isSecure).toBe(false)
      expect(result.risks.some(risk => risk.type === 'UNOFFICIAL_AUTH')).toBe(true)
    })

    it('should validate API key format', () => {
      process.env.OPENAI_API_KEY = 'invalid-key-format'

      const result = validateAuthenticationMethods()

      expect(result.isSecure).toBe(false)
      expect(result.risks.some(risk => risk.type === 'INVALID_API_KEY_FORMAT')).toBe(true)
    })

    it('should pass with valid official API key', () => {
      process.env.OPENAI_API_KEY = 'sk-1234567890abcdef1234567890abcdef1234567890abcdef'

      const result = validateAuthenticationMethods()

      expect(result.isSecure).toBe(true)
      expect(result.risks).toHaveLength(0)
    })

    it('should skip strict OpenAI key format check when SKIP_API_DOMAIN_CHECK is enabled', () => {
      process.env.OPENAI_API_KEY = 'third-party-token'
      process.env.SKIP_API_DOMAIN_CHECK = 'true'

      const result = validateAuthenticationMethods()

      expect(result.risks.some(risk => risk.type === 'INVALID_API_KEY_FORMAT')).toBe(false)
      expect(result.isSecure).toBe(true)
    })
  })

  describe('configuration Security Validation', () => {
    it('should flag unofficial OpenAI base URL by default', () => {
      process.env.AI_PROVIDER = 'openai'
      process.env.OPENAI_API_KEY = 'sk-1234567890abcdef1234567890abcdef1234567890abcdef'
      process.env.OPENAI_API_BASE_URL = 'https://third-party.example.com/v1'

      const result = validateConfigurationSecurity()

      expect(result.isSecure).toBe(false)
      expect(result.risks.some(risk => risk.type === 'UNOFFICIAL_BASE_URL')).toBe(true)
    })

    it('should skip OpenAI base URL domain check when SKIP_API_DOMAIN_CHECK is enabled', () => {
      process.env.AI_PROVIDER = 'openai'
      process.env.OPENAI_API_KEY = 'third-party-token'
      process.env.OPENAI_API_BASE_URL = 'https://third-party.example.com/v1'
      process.env.SKIP_API_DOMAIN_CHECK = 'true'

      const result = validateConfigurationSecurity()

      expect(result.risks.some(risk => risk.type === 'UNOFFICIAL_BASE_URL')).toBe(false)
      expect(result.isSecure).toBe(true)
    })

    it('should still enforce Azure endpoint domain check when SKIP_API_DOMAIN_CHECK is enabled', () => {
      process.env.AI_PROVIDER = 'azure'
      process.env.AZURE_OPENAI_API_KEY = 'azure-key'
      process.env.AZURE_OPENAI_ENDPOINT = 'https://azure-compatible.example.com'
      process.env.AZURE_OPENAI_DEPLOYMENT = 'deploy'
      process.env.SKIP_API_DOMAIN_CHECK = 'true'

      const result = validateConfigurationSecurity()

      expect(result.risks.some(risk => risk.type === 'UNOFFICIAL_BASE_URL')).toBe(true)
      expect(result.isSecure).toBe(false)
    })
  })
})
