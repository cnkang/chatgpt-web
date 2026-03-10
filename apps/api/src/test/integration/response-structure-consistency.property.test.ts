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
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  executeIntegrationRequest,
  PROPERTY_TEST_RUNS,
  restoreIntegrationTestEnv,
  runConstantProperty,
  setupIntegrationTestEnv,
  TEST_AUTH_HEADERS,
  TEST_SECRET_KEY,
} from './adapter-test-utils.js'

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

function createChatProcessBody(text = 'test') {
  return {
    messages: [
      {
        id: 'msg-user-1',
        role: 'user' as const,
        parts: [{ type: 'text' as const, text }],
      },
    ],
  }
}

function validateResponseStructure(body: unknown, endpoint?: string, method?: string): void {
  expect(body).toBeDefined()
  expect(typeof body).toBe('object')
  expect(body).not.toBeNull()

  const response = body as any

  if (endpoint === '/health' && method === 'GET' && response.uptime !== undefined) {
    expect(response).toHaveProperty('uptime')
    expect(response).toHaveProperty('message')
    expect(response).toHaveProperty('timestamp')
    expect(typeof response.uptime).toBe('number')
    expect(typeof response.message).toBe('string')
    expect(typeof response.timestamp).toBe('number')
    return
  }

  expect(response).toHaveProperty('status')
  expect(response).toHaveProperty('message')
  expect(response).toHaveProperty('data')
  expect(['Success', 'Fail', 'Error']).toContain(response.status)
  expect(['string', 'object']).toContain(typeof response.message)

  if (response.message !== null) {
    expect(typeof response.message).toBe('string')
  }

  expect('data' in response).toBe(true)

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

describe('Property 2: Response Structure Consistency', () => {
  beforeEach(() => {
    setupIntegrationTestEnv()
  })

  afterEach(() => {
    restoreIntegrationTestEnv()
  })

  // ============================================================================
  // Property Tests - Success Cases
  // ============================================================================

  it('Property 2: GET /health returns consistent response structure', async () => {
    await runConstantProperty(async () => {
      const res = await executeIntegrationRequest('GET', '/health')

      expect(res.statusCode).toBe(200)
      validateResponseStructure(res.body, '/health', 'GET')

      // Health endpoint returns raw data, not wrapped in status/message/data
      // So we need to check it has the expected fields
      const body = res.body as any
      expect(body).toHaveProperty('uptime')
      expect(body).toHaveProperty('message')
      expect(body).toHaveProperty('timestamp')
    })
  })

  it('Property 2: POST /session returns consistent response structure', async () => {
    await runConstantProperty(async () => {
      const res = await executeIntegrationRequest('POST', '/session', {})

      expect(res.statusCode).toBe(200)
      validateResponseStructure(res.body)

      const body = res.body as BaseResponse
      expect(body.status).toBe('Success')
      expect(body.data).toHaveProperty('auth')
      expect(body.data).toHaveProperty('model')
    })
  })

  it('Property 2: POST /verify with valid token returns consistent response structure', async () => {
    await runConstantProperty(async () => {
      const res = await executeIntegrationRequest('POST', '/verify', { token: TEST_SECRET_KEY })

      expect(res.statusCode).toBe(200)
      validateResponseStructure(res.body)

      const body = res.body as BaseResponse
      expect(body.status).toBe('Success')
      expect(body.message).toBe('Verify successfully')
      expect(body.data).toBeNull()
    })
  })

  it('Property 2: POST /config with auth returns consistent response structure', async () => {
    await runConstantProperty(async () => {
      const res = await executeIntegrationRequest('POST', '/config', {}, TEST_AUTH_HEADERS)

      expect(res.statusCode).toBe(200)
      validateResponseStructure(res.body)

      const body = res.body as BaseResponse
      expect(body.status).toBe('Success')
      expect(body.data).toBeDefined()
    })
  })

  // ============================================================================
  // Property Tests - Error Cases
  // ============================================================================

  it('Property 2: POST /verify with invalid token returns consistent error structure', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }).filter(s => s !== TEST_SECRET_KEY),
        async invalidToken => {
          const res = await executeIntegrationRequest('POST', '/verify', { token: invalidToken })

          const expectsValidationError = invalidToken.trim().length === 0

          expect(res.statusCode).toBe(expectsValidationError ? 400 : 401)
          validateResponseStructure(res.body)

          const body = res.body as BaseResponse
          expect(body.status).toBe('Fail')
          expect(body.data).toBeNull()
          expect(body.error).toBeDefined()
          expect(body.error?.code).toBe(
            expectsValidationError ? 'VALIDATION_ERROR' : 'AUTHENTICATION_ERROR',
          )
        },
      ),
      { numRuns: PROPERTY_TEST_RUNS },
    )
  })

  it('Property 2: POST /config without auth returns consistent error structure', async () => {
    await runConstantProperty(async () => {
      const res = await executeIntegrationRequest('POST', '/config', {})

      expect(res.statusCode).toBe(401)
      validateResponseStructure(res.body)

      const body = res.body as BaseResponse
      expect(body.status).toBe('Fail')
      expect(body.message).toBe('Error: No access rights')
      expect(body.data).toBeNull()
    })
  })

  it('Property 2: POST /chat-process without auth returns consistent error structure', async () => {
    await runConstantProperty(async () => {
      const res = await executeIntegrationRequest('POST', '/chat-process', createChatProcessBody())

      expect(res.statusCode).toBe(401)
      validateResponseStructure(res.body)

      const body = res.body as BaseResponse
      expect(body.status).toBe('Fail')
      expect(body.data).toBeNull()
    })
  })

  it('Property 2: GET /nonexistent returns consistent 404 error structure', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .string({ minLength: 1, maxLength: 50 })
          .filter(s => !['health', 'session', 'verify', 'config', 'chat-process'].includes(s)),
        async randomPath => {
          const res = await executeIntegrationRequest('GET', `/${randomPath}`)

          expect(res.statusCode).toBe(404)
          validateResponseStructure(res.body)

          const body = res.body as BaseResponse
          expect(body.status).toBe('Fail')
          expect(body.message).toBe('Not Found')
          expect(body.data).toBeNull()
        },
      ),
      { numRuns: PROPERTY_TEST_RUNS },
    )
  })

  it('Property 2: POST /verify with missing token field returns consistent error structure', async () => {
    await runConstantProperty(async () => {
      const res = await executeIntegrationRequest('POST', '/verify', {}) // Missing token field

      // Should return 400 for validation error
      expect([400, 401]).toContain(res.statusCode)
      validateResponseStructure(res.body)

      const body = res.body as BaseResponse
      expect(body.status).toBe('Fail')
      expect(body.data).toBeNull()
    })
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
        body: { token: TEST_SECRET_KEY },
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
        const res = await executeIntegrationRequest(
          endpoint.method,
          endpoint.path,
          endpoint.body,
          endpoint.headers,
        )

        expect(res.statusCode).toBeGreaterThanOrEqual(200)
        expect(res.statusCode).toBeLessThan(300)
        validateResponseStructure(res.body, endpoint.path, endpoint.method)
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
        const res = await executeIntegrationRequest(
          endpoint.method,
          endpoint.path,
          endpoint.body,
          endpoint.headers,
        )

        expect(res.statusCode).toBeGreaterThanOrEqual(400)
        validateResponseStructure(res.body)

        const body = res.body as BaseResponse
        expect(['Fail', 'Error']).toContain(body.status)
        expect(body.data).toBeNull()
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
          const res = await executeIntegrationRequest(method, path, {})

          // All responses should have consistent structure
          validateResponseStructure(res.body, path, method)
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
            messages: fc.array(
              fc.record({
                id: fc.string(),
                role: fc.constantFrom('user', 'assistant', 'system'),
                parts: fc.array(
                  fc.record({
                    type: fc.string({ minLength: 1 }),
                    text: fc.string(),
                  }),
                  { minLength: 1 },
                ),
              }),
            ),
          }),
          fc.object(),
        ),
        async (path, body) => {
          const res = await executeIntegrationRequest('POST', path, body)

          // Regardless of input, response structure should be consistent
          validateResponseStructure(res.body)
        },
      ),
      { numRuns: PROPERTY_TEST_RUNS },
    )
  })
})
