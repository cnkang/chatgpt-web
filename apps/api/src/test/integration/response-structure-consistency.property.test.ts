/**
 * Property-Based Test: Response Structure Consistency
 *
 * **Validates: Requirements 2.7**
 *
 * Tests that all API responses contain the required fields (status, message, data)
 * with correct types, regardless of success or failure scenarios.
 * This ensures consistent response structure across all endpoints.
 */

import * as fc from 'fast-check'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HTTP2Adapter } from '../../adapters/http2-adapter.js'
import { createConfiguredServer } from '../../server.js'
import type { MiddlewareChainImpl } from '../../transport/middleware-chain.js'
import type { RouterImpl } from '../../transport/router.js'
import type { TransportRequest, TransportResponse } from '../../transport/types.js'

// ============================================================================
// Test Configuration
// ============================================================================

const PROPERTY_TEST_RUNS = 100

// ============================================================================
// Response Structure Types
// ============================================================================

interface BaseResponse {
  status: 'Success' | 'Fail' | 'Error'
  message: string
  data: unknown
  error?: {
    code: string
    type: string
    details?: unknown
    timestamp: string
    requestId?: string
  }
}

// ============================================================================
// Test Setup
// ============================================================================

const originalEnv = process.env

describe('Property 2: Response Structure Consistency', () => {
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
    process.env.HTTP2_ENABLED = 'false'
    return createConfiguredServer().adapter
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

    // Get the router from the adapter
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

  /**
   * Validate response structure
   * Note: Some endpoints have different response structures:
   * - /health returns {uptime, message, timestamp} (legacy format) - only for GET requests
   * - Most endpoints return {status, message, data, error?}
   * - message can be string or null in some cases
   */
  function validateResponseStructure(body: unknown, endpoint?: string, method?: string): void {
    expect(body).toBeDefined()
    expect(typeof body).toBe('object')
    expect(body).not.toBeNull()

    const response = body as any

    // Special case: /health endpoint has different structure only for GET requests
    if (endpoint === '/health' && method === 'GET' && response.uptime !== undefined) {
      expect(response).toHaveProperty('uptime')
      expect(response).toHaveProperty('message')
      expect(response).toHaveProperty('timestamp')
      expect(typeof response.uptime).toBe('number')
      expect(typeof response.message).toBe('string')
      expect(typeof response.timestamp).toBe('number')
      return
    }

    // Standard response structure validation
    // Required fields
    expect(response).toHaveProperty('status')
    expect(response).toHaveProperty('message')
    expect(response).toHaveProperty('data')

    // Status must be one of the valid values
    expect(['Success', 'Fail', 'Error']).toContain(response.status)

    // Message must be a string or null (some endpoints return null for message)
    expect(['string', 'object']).toContain(typeof response.message)
    if (response.message !== null) {
      expect(typeof response.message).toBe('string')
    }

    // Data can be any type (including null)
    expect('data' in response).toBe(true)

    // If error field exists, validate its structure
    if (response.error) {
      expect(typeof response.error).toBe('object')
      expect(response.error).toHaveProperty('code')
      expect(response.error).toHaveProperty('type')
      expect(response.error).toHaveProperty('timestamp')
      expect(typeof response.error.code).toBe('string')
      expect(typeof response.error.type).toBe('string')
      expect(typeof response.error.timestamp).toBe('string')
    }
  }

  // ============================================================================
  // Property Tests - Success Cases
  // ============================================================================

  it('Property 2: GET /health returns consistent response structure', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        const adapter = createTestAdapter()
        const req = createMockRequest('GET', '/health')
        const res = await executeRequest(adapter, req)

        expect(res.statusCode).toBe(200)
        validateResponseStructure(res.body, '/health', 'GET')

        // Health endpoint returns raw data, not wrapped in status/message/data
        // So we need to check it has the expected fields
        const body = res.body as any
        expect(body).toHaveProperty('uptime')
        expect(body).toHaveProperty('message')
        expect(body).toHaveProperty('timestamp')

        return true
      }),
      { numRuns: PROPERTY_TEST_RUNS },
    )
  })

  it('Property 2: POST /session returns consistent response structure', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        const adapter = createTestAdapter()
        const req = createMockRequest('POST', '/session', {})
        const res = await executeRequest(adapter, req)

        expect(res.statusCode).toBe(200)
        validateResponseStructure(res.body)

        const body = res.body as BaseResponse
        expect(body.status).toBe('Success')
        expect(body.data).toHaveProperty('auth')
        expect(body.data).toHaveProperty('model')

        return true
      }),
      { numRuns: PROPERTY_TEST_RUNS },
    )
  })

  it('Property 2: POST /verify with valid token returns consistent response structure', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        const adapter = createTestAdapter()
        const req = createMockRequest('POST', '/verify', { token: 'test-secret-key' })
        const res = await executeRequest(adapter, req)

        expect(res.statusCode).toBe(200)
        validateResponseStructure(res.body)

        const body = res.body as BaseResponse
        expect(body.status).toBe('Success')
        expect(body.message).toBe('Verify successfully')
        expect(body.data).toBeNull()

        return true
      }),
      { numRuns: PROPERTY_TEST_RUNS },
    )
  })

  it('Property 2: POST /config with auth returns consistent response structure', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        const adapter = createTestAdapter()
        const req = createMockRequest(
          'POST',
          '/config',
          {},
          {
            authorization: 'Bearer test-secret-key',
          },
        )
        const res = await executeRequest(adapter, req)

        expect(res.statusCode).toBe(200)
        validateResponseStructure(res.body)

        const body = res.body as BaseResponse
        expect(body.status).toBe('Success')
        expect(body.data).toBeDefined()

        return true
      }),
      { numRuns: PROPERTY_TEST_RUNS },
    )
  })

  // ============================================================================
  // Property Tests - Error Cases
  // ============================================================================

  it('Property 2: POST /verify with invalid token returns consistent error structure', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }).filter(s => s !== 'test-secret-key'),
        async invalidToken => {
          const adapter = createTestAdapter()
          const req = createMockRequest('POST', '/verify', { token: invalidToken })
          const res = await executeRequest(adapter, req)

          expect(res.statusCode).toBe(401)
          validateResponseStructure(res.body)

          const body = res.body as BaseResponse
          expect(body.status).toBe('Fail')
          expect(body.data).toBeNull()
          expect(body.error).toBeDefined()
          expect(body.error?.code).toBe('AUTHENTICATION_ERROR')

          return true
        },
      ),
      { numRuns: PROPERTY_TEST_RUNS },
    )
  })

  it('Property 2: POST /config without auth returns consistent error structure', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        const adapter = createTestAdapter()
        const req = createMockRequest('POST', '/config', {})
        const res = await executeRequest(adapter, req)

        expect(res.statusCode).toBe(401)
        validateResponseStructure(res.body)

        const body = res.body as BaseResponse
        expect(body.status).toBe('Fail')
        expect(body.message).toBe('Error: No access rights')
        expect(body.data).toBeNull()

        return true
      }),
      { numRuns: PROPERTY_TEST_RUNS },
    )
  })

  it('Property 2: POST /chat-process without auth returns consistent error structure', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        const adapter = createTestAdapter()
        const req = createMockRequest('POST', '/chat-process', { prompt: 'test' })
        const res = await executeRequest(adapter, req)

        expect(res.statusCode).toBe(401)
        validateResponseStructure(res.body)

        const body = res.body as BaseResponse
        expect(body.status).toBe('Fail')
        expect(body.data).toBeNull()

        return true
      }),
      { numRuns: PROPERTY_TEST_RUNS },
    )
  })

  it('Property 2: GET /nonexistent returns consistent 404 error structure', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .string({ minLength: 1, maxLength: 50 })
          .filter(s => !['health', 'session', 'verify', 'config', 'chat-process'].includes(s)),
        async randomPath => {
          const adapter = createTestAdapter()
          const req = createMockRequest('GET', `/${randomPath}`)
          const res = await executeRequest(adapter, req)

          expect(res.statusCode).toBe(404)
          validateResponseStructure(res.body)

          const body = res.body as BaseResponse
          expect(body.status).toBe('Fail')
          expect(body.message).toBe('Not Found')
          expect(body.data).toBeNull()

          return true
        },
      ),
      { numRuns: PROPERTY_TEST_RUNS },
    )
  })

  it('Property 2: POST /verify with missing token field returns consistent error structure', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        const adapter = createTestAdapter()
        const req = createMockRequest('POST', '/verify', {}) // Missing token field
        const res = await executeRequest(adapter, req)

        // Should return 400 for validation error
        expect([400, 401]).toContain(res.statusCode)
        validateResponseStructure(res.body)

        const body = res.body as BaseResponse
        expect(body.status).toBe('Fail')
        expect(body.data).toBeNull()

        return true
      }),
      { numRuns: PROPERTY_TEST_RUNS },
    )
  })

  // ============================================================================
  // Property Tests - All Endpoints with Various Inputs
  // ============================================================================

  it('Property 2: All endpoints return consistent structure with valid inputs', async () => {
    const validEndpoints: Array<{
      method: string
      path: string
      body: unknown
      headers: Record<string, string>
    }> = [
      { method: 'GET', path: '/health', body: null, headers: {} },
      { method: 'POST', path: '/session', body: {}, headers: {} },
      {
        method: 'POST',
        path: '/verify',
        body: { token: 'test-secret-key' },
        headers: {},
      },
      {
        method: 'POST',
        path: '/config',
        body: {},
        headers: { authorization: 'Bearer test-secret-key' },
      },
    ]

    await fc.assert(
      fc.asyncProperty(fc.constantFrom(...validEndpoints), async endpoint => {
        const adapter = createTestAdapter()
        const req = createMockRequest(
          endpoint.method,
          endpoint.path,
          endpoint.body,
          endpoint.headers,
        )
        const res = await executeRequest(adapter, req)

        expect(res.statusCode).toBeGreaterThanOrEqual(200)
        expect(res.statusCode).toBeLessThan(300)
        validateResponseStructure(res.body, endpoint.path, endpoint.method)

        return true
      }),
      { numRuns: PROPERTY_TEST_RUNS },
    )
  })

  it('Property 2: All endpoints return consistent structure with invalid inputs', async () => {
    const invalidEndpoints = [
      { method: 'POST', path: '/config', body: {}, headers: {} }, // Missing auth
      { method: 'POST', path: '/chat-process', body: {}, headers: {} }, // Missing auth
      {
        method: 'POST',
        path: '/verify',
        body: { token: 'wrong-token' },
        headers: {},
      }, // Invalid token
    ]

    await fc.assert(
      fc.asyncProperty(fc.constantFrom(...invalidEndpoints), async endpoint => {
        const adapter = createTestAdapter()
        const req = createMockRequest(
          endpoint.method,
          endpoint.path,
          endpoint.body,
          endpoint.headers,
        )
        const res = await executeRequest(adapter, req)

        expect(res.statusCode).toBeGreaterThanOrEqual(400)
        validateResponseStructure(res.body)

        const body = res.body as BaseResponse
        expect(['Fail', 'Error']).toContain(body.status)
        expect(body.data).toBeNull()

        return true
      }),
      { numRuns: PROPERTY_TEST_RUNS },
    )
  })

  it('Property 2: All HTTP methods on all endpoints return consistent structure', async () => {
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
    const paths = ['/health', '/session', '/verify', '/config', '/chat-process']

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...methods),
        fc.constantFrom(...paths),
        async (method, path) => {
          const adapter = createTestAdapter()
          const req = createMockRequest(method, path, {})
          const res = await executeRequest(adapter, req)

          // All responses should have consistent structure
          validateResponseStructure(res.body, path, method)

          return true
        },
      ),
      { numRuns: PROPERTY_TEST_RUNS },
    )
  })

  it('Property 2: Random request bodies maintain response structure consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('/session', '/verify', '/config'),
        fc.oneof(
          fc.constant(null),
          fc.constant({}),
          fc.record({
            token: fc.string(),
          }),
          fc.record({
            prompt: fc.string(),
          }),
          fc.object(),
        ),
        async (path, body) => {
          const adapter = createTestAdapter()
          const req = createMockRequest('POST', path, body)
          const res = await executeRequest(adapter, req)

          // Regardless of input, response structure should be consistent
          validateResponseStructure(res.body)

          return true
        },
      ),
      { numRuns: PROPERTY_TEST_RUNS },
    )
  })
})
