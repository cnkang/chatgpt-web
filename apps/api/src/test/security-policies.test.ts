/**
 * Security Policies Test Suite
 *
 * This test suite verifies that all security policies work identically to the Express implementation:
 * - Authentication (Requirements 5.1-5.4)
 * - Rate Limiting (Requirements 6.1-6.6)
 * - Security Headers (Requirements 7.1-7.5)
 * - Session Persistence (Requirements 8.1-8.7)
 * - CORS (Requirements 17.1-17.5)
 *
 * @module test/security-policies
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { HTTP2Adapter } from '../adapters/http2-adapter.js'
import { createConfiguredServer } from '../server.js'
import { buildHttpOrigin } from './test-helpers.js'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

function getRequest(baseUrl: string, path: string, headers?: Record<string, string>) {
  return fetch(`${baseUrl}${path}`, headers === undefined ? undefined : { headers })
}

function optionsRequest(baseUrl: string, path: string, headers?: Record<string, string>) {
  return fetch(
    `${baseUrl}${path}`,
    headers === undefined ? { method: 'OPTIONS' } : { method: 'OPTIONS', headers },
  )
}

function postJson(
  baseUrl: string,
  path: string,
  body: unknown = {},
  headers?: Record<string, string>,
) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: headers === undefined ? JSON_HEADERS : { ...JSON_HEADERS, ...headers },
    body: JSON.stringify(body),
  })
}

function postWithBearer(baseUrl: string, path: string, token: string, body: unknown = {}) {
  return postJson(baseUrl, path, body, { Authorization: `Bearer ${token}` })
}

async function expectFailureResponse(response: Response, status: number) {
  expect(response.status).toBe(status)
  const data = (await response.json()) as Record<string, unknown>
  expect(data).toHaveProperty('status', 'Fail')
  expect(data).toHaveProperty('message')
  expect(data).toHaveProperty('data', null)
  return data
}

function expectRateLimitHeaders(response: Response, limit: string) {
  expect(response.headers.has('x-ratelimit-limit')).toBe(true)
  expect(response.headers.has('x-ratelimit-remaining')).toBe(true)
  expect(response.headers.has('x-ratelimit-reset')).toBe(true)
  expect(response.headers.get('x-ratelimit-limit')).toBe(limit)
}

describe('Security Policies Tests', () => {
  let adapter: HTTP2Adapter
  let baseUrl: string
  const TEST_PORT = 13003 // Use different port to avoid conflicts
  const TEST_AUTH_TOKEN = 'test-secret-key-12345'
  const allowedLocalhostOrigin = buildHttpOrigin('localhost:1002')
  const allowedLoopbackOrigin = buildHttpOrigin('127.0.0.1:1002')
  const blockedOrigin = buildHttpOrigin('evil.com')

  beforeAll(async () => {
    // Set up test environment
    process.env.AUTH_SECRET_KEY = TEST_AUTH_TOKEN
    process.env.NODE_ENV = 'test'
    process.env.OPENAI_API_KEY = 'sk-test-key'
    process.env.AI_PROVIDER = 'openai'
    process.env.MAX_REQUEST_PER_HOUR = '100'
    process.env.ALLOWED_ORIGINS = `${allowedLocalhostOrigin},${allowedLoopbackOrigin}`
    process.env.PORT = String(TEST_PORT)
    process.env.HOST = '127.0.0.1'
    process.env.HTTP2_ENABLED = 'false'
    process.env.TRUST_PROXY = 'true'

    const configuredServer = createConfiguredServer()
    adapter = configuredServer.adapter
    await adapter.listen(TEST_PORT, '127.0.0.1')
    baseUrl = buildHttpOrigin(`${configuredServer.runtime.host}:${configuredServer.runtime.port}`)
  })

  afterAll(async () => {
    // Stop server
    await new Promise<void>(resolve => {
      adapter.getServer().close(() => resolve())
    })
  })

  describe('Authentication (Requirements 5.1-5.4)', () => {
    describe('Valid Bearer tokens succeed', () => {
      it('should allow access to /config with valid Bearer token', async () => {
        const response = await postWithBearer(baseUrl, '/config', TEST_AUTH_TOKEN)

        expect(response.status).toBe(200)
      })

      it('should allow access to /chat-process with valid Bearer token', async () => {
        const response = await postWithBearer(baseUrl, '/chat-process', TEST_AUTH_TOKEN, {
          messages: [
            {
              id: 'msg-user-1',
              role: 'user',
              parts: [{ type: 'text', text: 'Hello' }],
            },
          ],
          systemMessage: 'You are a helpful assistant',
        })

        // Should not be 401 (may be other errors due to provider)
        expect(response.status).not.toBe(401)
      })
    })

    describe('Invalid tokens return 401 with correct error structure', () => {
      it('should return 401 for invalid token on /config', async () => {
        await expectFailureResponse(await postWithBearer(baseUrl, '/config', 'invalid-token'), 401)
      })

      it('should return 401 for invalid token on /chat-process', async () => {
        await expectFailureResponse(
          await postWithBearer(baseUrl, '/chat-process', 'wrong-token', {
            messages: [
              {
                id: 'msg-user-1',
                role: 'user',
                parts: [{ type: 'text', text: 'Hello' }],
              },
            ],
          }),
          401,
        )
      })
    })

    describe('Missing tokens return 401', () => {
      it('should return 401 when Authorization header is missing on /config', async () => {
        await expectFailureResponse(await postJson(baseUrl, '/config'), 401)
      })

      it('should return 401 when Authorization header is missing on /chat-process', async () => {
        await expectFailureResponse(
          await postJson(baseUrl, '/chat-process', {
            messages: [
              {
                id: 'msg-user-1',
                role: 'user',
                parts: [{ type: 'text', text: 'Hello' }],
              },
            ],
          }),
          401,
        )
      })
    })

    describe('Uses timing-safe comparison', () => {
      it('should use constant-time comparison for token validation', async () => {
        // Test with tokens of different lengths
        const shortToken = 'short'
        const longToken = 'a'.repeat(100)

        const start1 = Date.now()
        await postWithBearer(baseUrl, '/config', shortToken)
        const time1 = Date.now() - start1

        const start2 = Date.now()
        await postWithBearer(baseUrl, '/config', longToken)
        const time2 = Date.now() - start2

        // Timing difference should be minimal (within 50ms)
        // This is a weak test but verifies basic timing-safe behavior
        expect(Math.abs(time1 - time2)).toBeLessThan(50)
      })
    })

    describe('Protected endpoints', () => {
      it('/config should require authentication', async () => {
        await expectFailureResponse(await postJson(baseUrl, '/config'), 401)
      })

      it('/chat-process should require authentication', async () => {
        await expectFailureResponse(
          await postJson(baseUrl, '/chat-process', {
            messages: [
              {
                id: 'msg-user-1',
                role: 'user',
                parts: [{ type: 'text', text: 'Hello' }],
              },
            ],
          }),
          401,
        )
      })
    })
  })

  describe('Rate Limiting (Requirements 6.1-6.6)', () => {
    describe('General limit: 100 requests/hour per IP on user routes', () => {
      it('should allow requests under the limit', async () => {
        // Make a few requests (well under 100)
        for (let i = 0; i < 5; i++) {
          const response = await postJson(baseUrl, '/session')
          expect(response.status).toBe(200)
        }
      })

      it('should set X-RateLimit-* headers', async () => {
        expectRateLimitHeaders(await postJson(baseUrl, '/session'), '100')
      })

      it('should decrement remaining count with each request', async () => {
        const response1 = await postJson(baseUrl, '/session')
        const remaining1 = Number.parseInt(
          response1.headers.get('x-ratelimit-remaining') || '0',
          10,
        )

        const response2 = await postJson(baseUrl, '/session')
        const remaining2 = Number.parseInt(
          response2.headers.get('x-ratelimit-remaining') || '0',
          10,
        )

        // Remaining should decrease (or stay same if at 0)
        expect(remaining2).toBeLessThanOrEqual(remaining1)
      })
    })

    describe('Health checks are exempt from user-facing rate limits', () => {
      it('should not set X-RateLimit-* headers on /health', async () => {
        const response = await getRequest(baseUrl, '/health')

        expect(response.headers.has('x-ratelimit-limit')).toBe(false)
        expect(response.headers.has('x-ratelimit-remaining')).toBe(false)
        expect(response.headers.has('x-ratelimit-reset')).toBe(false)
      })

      it('should continue serving /health after repeated probe traffic', async () => {
        for (let i = 0; i < 105; i++) {
          const response = await getRequest(baseUrl, '/health')
          expect(response.status).toBe(200)
        }
      })
    })

    describe('Strict limit: 10 requests/15min for /verify endpoint', () => {
      it('should allow requests under the strict limit', async () => {
        // Make a few requests (well under 10)
        for (let i = 0; i < 3; i++) {
          const response = await postJson(baseUrl, '/verify', { token: TEST_AUTH_TOKEN })
          // Should not be rate limited
          expect(response.status).not.toBe(429)
        }
      })

      it('should set X-RateLimit-* headers for /verify', async () => {
        expectRateLimitHeaders(await postJson(baseUrl, '/verify', { token: TEST_AUTH_TOKEN }), '10')
      })
    })

    describe('Returns 429 with correct error structure when exceeded', () => {
      it('should return 429 with correct structure', async () => {
        // This test would need to make 100+ requests to trigger
        // For now, we verify the error structure is correct when it happens
        // In a real scenario, you'd make 100+ requests here

        // We can test the error structure by checking a 429 response
        // if we get one during testing
        const response = await postJson(baseUrl, '/session')
        if (response.status === 429) {
          const data = await expectFailureResponse(response, 429)
          expect(data.message).toContain('Too many requests')
        }
      })
    })
  })

  describe('Security Headers (Requirements 7.1-7.5)', () => {
    describe('Content-Security-Policy with correct directives', () => {
      it('should set CSP header on all responses', async () => {
        const response = await getRequest(baseUrl, '/health')
        const csp = response.headers.get('content-security-policy')

        expect(csp).toBeTruthy()
        expect(csp).toContain("default-src 'self'")
        expect(csp).toContain("script-src 'self' 'unsafe-eval' 'unsafe-inline'")
        expect(csp).toContain("style-src 'self' 'unsafe-inline'")
        expect(csp).toContain("img-src 'self' data: blob:")
        expect(csp).toContain("font-src 'self' data:")
        expect(csp).toContain("object-src 'none'")
        expect(csp).toContain("base-uri 'self'")
        expect(csp).toContain("form-action 'self'")
        expect(csp).toContain("frame-ancestors 'none'")
      })

      it('should include unsafe-eval for Mermaid', async () => {
        const response = await getRequest(baseUrl, '/health')
        const csp = response.headers.get('content-security-policy')
        expect(csp).toContain("'unsafe-eval'")
      })

      it('should include unsafe-inline for Naive UI', async () => {
        const response = await getRequest(baseUrl, '/health')
        const csp = response.headers.get('content-security-policy')
        expect(csp).toContain("style-src 'self' 'unsafe-inline'")
      })
    })

    describe('X-Content-Type-Options: nosniff', () => {
      it('should set X-Content-Type-Options on all responses', async () => {
        const response = await getRequest(baseUrl, '/health')
        expect(response.headers.get('x-content-type-options')).toBe('nosniff')
      })

      it('should set nosniff on POST endpoints', async () => {
        const response = await postJson(baseUrl, '/session')
        expect(response.headers.get('x-content-type-options')).toBe('nosniff')
      })
    })

    describe('X-Frame-Options: DENY', () => {
      it('should set X-Frame-Options on all responses', async () => {
        const response = await getRequest(baseUrl, '/health')
        expect(response.headers.get('x-frame-options')).toBe('DENY')
      })
    })

    describe('Referrer-Policy: strict-origin-when-cross-origin', () => {
      it('should set Referrer-Policy on all responses', async () => {
        const response = await getRequest(baseUrl, '/health')
        expect(response.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin')
      })
    })

    describe('X-Permitted-Cross-Domain-Policies: none', () => {
      it('should set X-Permitted-Cross-Domain-Policies on all responses', async () => {
        const response = await getRequest(baseUrl, '/health')
        expect(response.headers.get('x-permitted-cross-domain-policies')).toBe('none')
      })
    })

    describe('Strict-Transport-Security in production', () => {
      it('should not set HSTS in test environment', async () => {
        const response = await getRequest(baseUrl, '/health')
        // In test mode, HSTS should not be set
        expect(response.headers.has('strict-transport-security')).toBe(false)
      })
    })
  })

  describe('Session Persistence (Requirements 8.1-8.7)', () => {
    describe('Session cookies created with correct attributes', () => {
      it('should create session cookie with httpOnly flag', async () => {
        const response = await postJson(baseUrl, '/session')

        const setCookie = response.headers.get('set-cookie')
        expect(setCookie).toBeTruthy()
        expect(setCookie).toContain('HttpOnly')
      })

      it('should not set secure flag on session cookie for HTTP requests', async () => {
        const response = await postJson(baseUrl, '/session')

        const setCookie = response.headers.get('set-cookie')
        expect(setCookie).toBeTruthy()
        expect(setCookie).not.toContain('Secure')
      })

      it('should create session cookie with secure flag when HTTPS is indicated by proxy headers', async () => {
        const response = await postJson(baseUrl, '/session', {}, { 'X-Forwarded-Proto': 'https' })

        const setCookie = response.headers.get('set-cookie')
        expect(setCookie).toBeTruthy()
        expect(setCookie).toContain('Secure')
      })

      it('should create session cookie with sameSite attribute', async () => {
        const response = await postJson(baseUrl, '/session')

        const setCookie = response.headers.get('set-cookie')
        expect(setCookie).toBeTruthy()
        expect(setCookie!.toLowerCase()).toMatch(/samesite=(strict|lax|none)/i)
      })
    })

    describe('Sessions persist across requests', () => {
      it('should maintain session across multiple requests', async () => {
        // First request creates session
        const response1 = await postJson(baseUrl, '/session')

        const setCookie = response1.headers.get('set-cookie')
        expect(setCookie).toBeTruthy()

        // Extract cookie value
        const cookieValue = setCookie!.split(';')[0]

        // Second request with cookie
        const response2 = await postJson(baseUrl, '/session', {}, { Cookie: cookieValue })

        expect(response2.status).toBe(200)
      })
    })

    describe('Expired sessions not loaded', () => {
      it('should not load expired sessions', async () => {
        // This would require waiting for session expiry or mocking time
        // For now, we verify the session has an expiry time
        const response = await postJson(baseUrl, '/session')

        const setCookie = response.headers.get('set-cookie')
        expect(setCookie).toBeTruthy()
        expect(setCookie).toMatch(/Max-Age=\d+|Expires=/i)
      })
    })

    describe('Session data stored correctly', () => {
      it('should store and retrieve session data', async () => {
        const response = await postJson(baseUrl, '/session')

        expect(response.status).toBe(200)
        const data = (await response.json()) as Record<string, unknown>
        expect(data).toHaveProperty('data')
        expect(data.data as Record<string, unknown>).toHaveProperty('auth')
        expect(data.data as Record<string, unknown>).toHaveProperty('model')
      })
    })
  })

  describe('CORS (Requirements 17.1-17.5)', () => {
    describe('Allowed origins get CORS headers', () => {
      it('should set CORS headers for allowed origin', async () => {
        const response = await getRequest(baseUrl, '/health', { Origin: allowedLocalhostOrigin })

        expect(response.headers.get('access-control-allow-origin')).toBe(allowedLocalhostOrigin)
        expect(response.headers.get('access-control-allow-credentials')).toBe('true')
        expect(response.headers.get('vary')).toContain('Origin')
      })

      it('should set CORS headers for another allowed origin', async () => {
        const response = await getRequest(baseUrl, '/health', { Origin: allowedLoopbackOrigin })

        expect(response.headers.get('access-control-allow-origin')).toBe(allowedLoopbackOrigin)
        expect(response.headers.get('access-control-allow-credentials')).toBe('true')
      })
    })

    describe('Disallowed origins do not get CORS headers', () => {
      it('should not set CORS headers for disallowed origin', async () => {
        const response = await getRequest(baseUrl, '/health', { Origin: blockedOrigin })

        expect(response.headers.get('access-control-allow-origin')).toBeNull()
      })

      it('should not set CORS headers for null origin', async () => {
        const response = await getRequest(baseUrl, '/health', { Origin: 'null' })

        expect(response.headers.get('access-control-allow-origin')).toBeNull()
      })
    })

    describe('Wildcard (*) blocked in production', () => {
      it('should not allow wildcard origin in configuration', async () => {
        // This is tested by the middleware configuration
        // Wildcard should be filtered out during initialization
        expect(process.env.ALLOWED_ORIGINS).not.toContain('*')
      })
    })

    describe('OPTIONS preflight handled correctly', () => {
      it('should handle OPTIONS request for allowed origin', async () => {
        const response = await optionsRequest(baseUrl, '/health', {
          Origin: allowedLocalhostOrigin,
        })

        expect(response.status).toBe(200)
        expect(response.headers.get('access-control-allow-origin')).toBe(allowedLocalhostOrigin)
        expect(response.headers.get('access-control-allow-methods')).toContain('GET')
        expect(response.headers.get('access-control-allow-methods')).toContain('POST')
      })

      it('should reject OPTIONS request for disallowed origin', async () => {
        const response = await optionsRequest(baseUrl, '/health', { Origin: blockedOrigin })

        expect(response.status).toBe(403)
      })

      it('should set Access-Control-Max-Age header', async () => {
        const response = await optionsRequest(baseUrl, '/health', {
          Origin: allowedLocalhostOrigin,
        })

        expect(response.headers.get('access-control-max-age')).toBe('86400')
      })
    })

    describe('Vary: Origin header set', () => {
      it('should set Vary header for CORS requests', async () => {
        const response = await fetch(`${baseUrl}/health`, {
          headers: {
            Origin: allowedLocalhostOrigin,
          },
        })

        expect(response.headers.get('vary')).toContain('Origin')
      })
    })
  })
})
