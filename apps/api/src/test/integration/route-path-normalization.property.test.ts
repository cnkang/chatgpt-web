/**
 * Property-Based Test: Route Path Normalization
 *
 * **Validates: Requirements 2.6**
 *
 * Tests that /api/path and /path produce identical responses for all endpoints.
 * This ensures dual path compatibility is maintained across the API.
 */

import * as fc from 'fast-check'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HTTP2Adapter } from '../../adapters/http2-adapter.js'
import { createAuthMiddleware } from '../../middleware-native/auth.js'
import { createBodyParserWithLimit } from '../../middleware-native/body-parser.js'
import { createCorsMiddleware } from '../../middleware-native/cors.js'
import { RateLimiter } from '../../middleware-native/rate-limiter.js'
import { createSecurityHeadersMiddleware } from '../../middleware-native/security-headers.js'
import { chatProcessHandler } from '../../routes/chat.js'
import { configHandler } from '../../routes/config.js'
import { healthHandler } from '../../routes/health.js'
import { sessionHandler } from '../../routes/session.js'
import { verifyHandler } from '../../routes/verify.js'
import { MiddlewareChainImpl } from '../../transport/middleware-chain.js'
import { RouterImpl } from '../../transport/router.js'
import type { TransportRequest, TransportResponse } from '../../transport/types.js'
import { asyncHandler } from '../../utils/async-handler.js'

// ============================================================================
// Test Configuration
// ============================================================================

const PROPERTY_TEST_RUNS = 100

// ============================================================================
// Test Setup
// ============================================================================

const originalEnv = process.env

describe('Property 1: Route Path Normalization', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
    // Set up test environment
    process.env.AUTH_SECRET_KEY = 'test-secret-key'
    process.env.OPENAI_API_KEY = 'sk-test-key'
    process.env.AI_PROVIDER = 'openai'
    process.env.NODE_ENV = 'test'
  })

  afterEach(() => {
    process.env = originalEnv
  })

  /**
   * Create a test adapter with all routes registered
   */
  function createTestAdapter(): HTTP2Adapter {
    const router = new RouterImpl()
    const middleware = new MiddlewareChainImpl()

    // Register middleware
    const corsMiddleware = createCorsMiddleware()
    const securityHeadersMiddleware = createSecurityHeadersMiddleware()
    const bodyParserMiddleware = createBodyParserWithLimit(1048576) // 1MB
    const authMiddleware = createAuthMiddleware(process.env.AUTH_SECRET_KEY || '')

    // Rate limiters
    const generalRateLimiter = new RateLimiter({
      windowMs: 60 * 60 * 1000,
      max: 100,
      message: 'Too many requests',
    })

    const authRateLimiter = new RateLimiter({
      windowMs: 15 * 60 * 1000,
      max: 10,
      message: 'Too many authentication attempts',
    })

    middleware.use(corsMiddleware)
    middleware.use(securityHeadersMiddleware)
    middleware.use(bodyParserMiddleware)

    // Register routes (without /api prefix)
    router.get('/health', generalRateLimiter.middleware(), asyncHandler(healthHandler))

    const chatBodyParser = createBodyParserWithLimit(1048576) // 1MB
    router.post(
      '/chat-process',
      authMiddleware,
      generalRateLimiter.middleware(),
      chatBodyParser,
      asyncHandler(chatProcessHandler),
    )

    router.post(
      '/config',
      authMiddleware,
      generalRateLimiter.middleware(),
      asyncHandler(configHandler),
    )

    router.post('/session', generalRateLimiter.middleware(), asyncHandler(sessionHandler))

    const verifyBodyParser = createBodyParserWithLimit(1024) // 1KB
    router.post(
      '/verify',
      authRateLimiter.middleware(),
      verifyBodyParser,
      asyncHandler(verifyHandler),
    )

    return new HTTP2Adapter(router, middleware, {
      http2: false, // Use HTTP/1.1 for testing
      bodyLimit: {
        json: 1048576,
        urlencoded: 32768,
      },
    })
  }

  /**
   * Create a mock request
   */
  function createMockRequest(
    method: string,
    path: string,
    body: unknown = null,
    headers: Record<string, string> = {},
  ): TransportRequest {
    const url = new URL(`http://localhost${path}`)
    const headersObj = new Headers(Object.entries(headers))

    return {
      method,
      path,
      url,
      headers: headersObj,
      body,
      ip: '127.0.0.1',
      getHeader: (name: string) => headersObj.get(name) || undefined,
      getQuery: (name: string) => url.searchParams.get(name) || undefined,
    } as TransportRequest
  }

  /**
   * Create a mock response that captures status, headers, and body
   */
  function createMockResponse(): {
    response: TransportResponse
    captured: {
      statusCode: number
      headers: Map<string, string | string[]>
      body: unknown
      finished: boolean
    }
  } {
    const captured = {
      statusCode: 200,
      headers: new Map<string, string | string[]>(),
      body: null as unknown,
      finished: false,
    }

    const response = {
      status: vi.fn((code: number) => {
        captured.statusCode = code
        return response
      }),
      setHeader: vi.fn((name: string, value: string | string[]) => {
        captured.headers.set(name.toLowerCase(), value)
        return response
      }),
      getHeader: vi.fn((name: string) => captured.headers.get(name.toLowerCase())),
      json: vi.fn((data: unknown) => {
        captured.body = data
        captured.finished = true
      }),
      send: vi.fn((data: string | Buffer) => {
        captured.body = data
        captured.finished = true
      }),
      write: vi.fn(() => true),
      end: vi.fn(() => {
        captured.finished = true
      }),
      headersSent: false,
      finished: false,
    } as unknown as TransportResponse

    return { response, captured }
  }

  /**
   * Execute a request through the router and capture the response
   */
  async function executeRequest(
    adapter: HTTP2Adapter,
    req: TransportRequest,
  ): Promise<{
    statusCode: number
    headers: Map<string, string | string[]>
    body: unknown
  }> {
    const { response, captured } = createMockResponse()

    // Get the router from the adapter (we need to access it through the private field)
    // For testing, we'll manually execute the routing logic
    const router = (adapter as any).router as RouterImpl
    const middlewareChain = (adapter as any).middleware as MiddlewareChainImpl

    // Execute middleware
    await middlewareChain.execute(req, response)

    // If response not finished, execute route
    if (!captured.finished) {
      const route = router.match(req.method, req.path)
      if (route) {
        // Execute route middleware
        for (const mw of route.middleware) {
          if (captured.finished) break
          await new Promise<void>((resolve, reject) => {
            const next = (error?: Error) => {
              if (error) reject(error)
              else resolve()
            }
            const result = mw(req, response, next)
            if (result instanceof Promise) {
              result.then(() => resolve()).catch(reject)
            }
          })
        }

        // Execute handler
        if (!captured.finished) {
          await route.handler(req, response)
        }
      } else {
        response.status(404).json({
          status: 'Fail',
          message: 'Not Found',
          data: null,
        })
      }
    }

    return {
      statusCode: captured.statusCode,
      headers: captured.headers,
      body: captured.body,
    }
  }

  // ============================================================================
  // Property Tests
  // ============================================================================

  it('Property 1: /api/health and /health produce identical responses', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        const adapter = createTestAdapter()

        // Test both paths
        const req1 = createMockRequest('GET', '/api/health')
        const req2 = createMockRequest('GET', '/health')

        const res1 = await executeRequest(adapter, req1)
        const res2 = await executeRequest(adapter, req2)

        // Verify status codes match
        expect(res1.statusCode).toBe(res2.statusCode)
        expect(res1.statusCode).toBe(200)

        // Verify response bodies have same structure (not exact values due to timestamps)
        expect(res1.body).toMatchObject({
          uptime: expect.any(Number),
          message: 'OK',
          timestamp: expect.any(Number),
        })
        expect(res2.body).toMatchObject({
          uptime: expect.any(Number),
          message: 'OK',
          timestamp: expect.any(Number),
        })

        return true
      }),
      { numRuns: PROPERTY_TEST_RUNS },
    )
  })

  it('Property 1: /api/session and /session produce identical responses', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        const adapter = createTestAdapter()

        // Test both paths
        const req1 = createMockRequest('POST', '/api/session', {})
        const req2 = createMockRequest('POST', '/session', {})

        const res1 = await executeRequest(adapter, req1)
        const res2 = await executeRequest(adapter, req2)

        // Verify status codes match
        expect(res1.statusCode).toBe(res2.statusCode)
        expect(res1.statusCode).toBe(200)

        // Verify response structure matches
        expect(res1.body).toMatchObject({
          status: 'Success',
          message: '',
          data: {
            auth: expect.any(Boolean),
            model: expect.any(String),
          },
        })
        expect(res2.body).toMatchObject({
          status: 'Success',
          message: '',
          data: {
            auth: expect.any(Boolean),
            model: expect.any(String),
          },
        })

        return true
      }),
      { numRuns: PROPERTY_TEST_RUNS },
    )
  })

  it('Property 1: /api/verify and /verify produce identical responses for valid tokens', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        const adapter = createTestAdapter()

        const validToken = 'test-secret-key'

        // Test both paths with valid token
        const req1 = createMockRequest('POST', '/api/verify', { token: validToken })
        const req2 = createMockRequest('POST', '/verify', { token: validToken })

        const res1 = await executeRequest(adapter, req1)
        const res2 = await executeRequest(adapter, req2)

        // Verify status codes match
        expect(res1.statusCode).toBe(res2.statusCode)
        expect(res1.statusCode).toBe(200)

        // Verify response structure matches
        expect(res1.body).toMatchObject({
          status: 'Success',
          message: 'Verify successfully',
          data: null,
        })
        expect(res2.body).toMatchObject({
          status: 'Success',
          message: 'Verify successfully',
          data: null,
        })

        return true
      }),
      { numRuns: PROPERTY_TEST_RUNS },
    )
  })

  it('Property 1: /api/verify and /verify produce identical responses for invalid tokens', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }).filter(s => s !== 'test-secret-key'),
        async randomToken => {
          const adapter = createTestAdapter()

          // Test both paths with invalid token
          const req1 = createMockRequest('POST', '/api/verify', { token: randomToken })
          const req2 = createMockRequest('POST', '/verify', { token: randomToken })

          const res1 = await executeRequest(adapter, req1)
          const res2 = await executeRequest(adapter, req2)

          // Verify status codes match (both should be 401)
          expect(res1.statusCode).toBe(res2.statusCode)
          expect(res1.statusCode).toBe(401)

          // Verify response structure matches
          expect(res1.body).toMatchObject({
            status: 'Fail',
            message: 'Invalid authentication token',
            data: null,
            error: {
              code: 'AUTHENTICATION_ERROR',
              type: 'AuthenticationError',
              timestamp: expect.any(String),
            },
          })
          expect(res2.body).toMatchObject({
            status: 'Fail',
            message: 'Invalid authentication token',
            data: null,
            error: {
              code: 'AUTHENTICATION_ERROR',
              type: 'AuthenticationError',
              timestamp: expect.any(String),
            },
          })

          return true
        },
      ),
      { numRuns: PROPERTY_TEST_RUNS },
    )
  })

  it('Property 1: /api/config and /config produce identical responses with auth', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        const adapter = createTestAdapter()

        const authHeaders = {
          authorization: 'Bearer test-secret-key',
        }

        // Test both paths with authentication
        const req1 = createMockRequest('POST', '/api/config', {}, authHeaders)
        const req2 = createMockRequest('POST', '/config', {}, authHeaders)

        const res1 = await executeRequest(adapter, req1)
        const res2 = await executeRequest(adapter, req2)

        // Verify status codes match
        expect(res1.statusCode).toBe(res2.statusCode)
        expect(res1.statusCode).toBe(200)

        // Verify response structure matches (message can be null or string)
        const body1 = res1.body as any
        const body2 = res2.body as any

        expect(body1).toHaveProperty('status', 'Success')
        expect(body1).toHaveProperty('data')
        expect(body2).toHaveProperty('status', 'Success')
        expect(body2).toHaveProperty('data')

        // Both should have the same structure
        expect(typeof body1.data).toBe(typeof body2.data)

        return true
      }),
      { numRuns: PROPERTY_TEST_RUNS },
    )
  })

  it('Property 1: /api/config and /config produce identical 401 responses without auth', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        const adapter = createTestAdapter()

        // Test both paths without authentication
        const req1 = createMockRequest('POST', '/api/config', {})
        const req2 = createMockRequest('POST', '/config', {})

        const res1 = await executeRequest(adapter, req1)
        const res2 = await executeRequest(adapter, req2)

        // Verify status codes match
        expect(res1.statusCode).toBe(res2.statusCode)
        expect(res1.statusCode).toBe(401)

        // Verify response structure matches
        expect(res1.body).toMatchObject({
          status: 'Fail',
          message: 'Error: No access rights',
          data: null,
        })
        expect(res2.body).toMatchObject({
          status: 'Fail',
          message: 'Error: No access rights',
          data: null,
        })

        return true
      }),
      { numRuns: PROPERTY_TEST_RUNS },
    )
  })

  it('Property 1: All endpoints support dual path compatibility', async () => {
    // Test all endpoints systematically
    const endpoints = [
      { method: 'GET', path: '/health', requiresAuth: false, body: null },
      { method: 'POST', path: '/session', requiresAuth: false, body: {} },
      { method: 'POST', path: '/verify', requiresAuth: false, body: { token: 'test-secret-key' } },
      {
        method: 'POST',
        path: '/config',
        requiresAuth: true,
        body: {},
        headers: { authorization: 'Bearer test-secret-key' },
      },
    ]

    await fc.assert(
      fc.asyncProperty(fc.constantFrom(...endpoints), async endpoint => {
        const adapter = createTestAdapter()

        // Test with /api prefix
        const req1 = createMockRequest(
          endpoint.method,
          `/api${endpoint.path}`,
          endpoint.body,
          endpoint.headers || {},
        )

        // Test without /api prefix
        const req2 = createMockRequest(
          endpoint.method,
          endpoint.path,
          endpoint.body,
          endpoint.headers || {},
        )

        const res1 = await executeRequest(adapter, req1)
        const res2 = await executeRequest(adapter, req2)

        // Verify status codes match
        expect(res1.statusCode).toBe(res2.statusCode)

        // Verify both responses have the same status field
        const body1 = res1.body as any
        const body2 = res2.body as any

        if (body1 && typeof body1 === 'object' && body2 && typeof body2 === 'object') {
          expect(body1.status).toBe(body2.status)
          // Both should have data field
          expect('data' in body1).toBe('data' in body2)
        }

        return true
      }),
      { numRuns: PROPERTY_TEST_RUNS },
    )
  })
})
