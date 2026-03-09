/**
 * Property-Based Test: Route Path Normalization
 *
 * **Validates: Requirements 2.6**
 *
 * Tests that /api/path and /path produce identical responses for all endpoints.
 * This ensures dual path compatibility is maintained across the API.
 */

import * as fc from 'fast-check'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  executeDualPathRequest,
  PROPERTY_TEST_RUNS,
  restoreIntegrationTestEnv,
  runConstantProperty,
  setupIntegrationTestEnv,
  TEST_AUTH_HEADERS,
  TEST_SECRET_KEY,
} from './adapter-test-utils.js'

function expectMatchingStatus(
  res1: { statusCode: number },
  res2: { statusCode: number },
  expectedStatus: number,
) {
  expect(res1.statusCode).toBe(res2.statusCode)
  expect(res1.statusCode).toBe(expectedStatus)
}

function expectMatchingBodyShape(res1: { body: unknown }, res2: { body: unknown }, shape: object) {
  expect(res1.body).toMatchObject(shape)
  expect(res2.body).toMatchObject(shape)
}

describe('Property 1: Route Path Normalization', () => {
  beforeEach(() => {
    setupIntegrationTestEnv()
  })

  afterEach(() => {
    restoreIntegrationTestEnv()
  })

  // ============================================================================
  // Property Tests
  // ============================================================================

  it('Property 1: /api/health and /health produce identical responses', async () => {
    await runConstantProperty(async () => {
      const { prefixedResponse, unprefixedResponse } = await executeDualPathRequest(
        'GET',
        '/health',
      )

      expectMatchingStatus(prefixedResponse, unprefixedResponse, 200)
      expectMatchingBodyShape(prefixedResponse, unprefixedResponse, {
        uptime: expect.any(Number),
        message: 'OK',
        timestamp: expect.any(Number),
      })
    })
  })

  it('Property 1: /api/session and /session produce identical responses', async () => {
    await runConstantProperty(async () => {
      const { prefixedResponse, unprefixedResponse } = await executeDualPathRequest(
        'POST',
        '/session',
        {},
      )

      expectMatchingStatus(prefixedResponse, unprefixedResponse, 200)
      expectMatchingBodyShape(prefixedResponse, unprefixedResponse, {
        status: 'Success',
        message: '',
        data: {
          auth: expect.any(Boolean),
          model: expect.any(String),
        },
      })
    })
  })

  it('Property 1: /api/verify and /verify produce identical responses for valid tokens', async () => {
    await runConstantProperty(async () => {
      const { prefixedResponse, unprefixedResponse } = await executeDualPathRequest(
        'POST',
        '/verify',
        {
          token: TEST_SECRET_KEY,
        },
      )

      expectMatchingStatus(prefixedResponse, unprefixedResponse, 200)
      expectMatchingBodyShape(prefixedResponse, unprefixedResponse, {
        status: 'Success',
        message: 'Verify successfully',
        data: null,
      })
    })
  })

  it('Property 1: /api/verify and /verify produce identical responses for invalid tokens', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .string({ minLength: 1 })
          .filter(s => s.trim().length > 0 && s.trim() !== TEST_SECRET_KEY),
        async randomToken => {
          const { prefixedResponse, unprefixedResponse } = await executeDualPathRequest(
            'POST',
            '/verify',
            {
              token: randomToken,
            },
          )

          expectMatchingStatus(prefixedResponse, unprefixedResponse, 401)
          expectMatchingBodyShape(prefixedResponse, unprefixedResponse, {
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
    await runConstantProperty(async () => {
      const { prefixedResponse, unprefixedResponse } = await executeDualPathRequest(
        'POST',
        '/config',
        {},
        TEST_AUTH_HEADERS,
      )

      expectMatchingStatus(prefixedResponse, unprefixedResponse, 200)

      const body1 = prefixedResponse.body as any
      const body2 = unprefixedResponse.body as any

      expect(body1).toHaveProperty('status', 'Success')
      expect(body1).toHaveProperty('data')
      expect(body2).toHaveProperty('status', 'Success')
      expect(body2).toHaveProperty('data')
      expect(typeof body1.data).toBe(typeof body2.data)
    })
  })

  it('Property 1: /api/config and /config produce identical 401 responses without auth', async () => {
    await runConstantProperty(async () => {
      const { prefixedResponse, unprefixedResponse } = await executeDualPathRequest(
        'POST',
        '/config',
        {},
      )

      expectMatchingStatus(prefixedResponse, unprefixedResponse, 401)
      expectMatchingBodyShape(prefixedResponse, unprefixedResponse, {
        status: 'Fail',
        message: 'Error: No access rights',
        data: null,
      })
    })
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
        const { prefixedResponse, unprefixedResponse } = await executeDualPathRequest(
          endpoint.method,
          endpoint.path,
          endpoint.body,
          endpoint.headers || {},
        )

        // Verify status codes match
        expect(prefixedResponse.statusCode).toBe(unprefixedResponse.statusCode)

        // Verify both responses have the same status field
        const body1 = prefixedResponse.body as any
        const body2 = unprefixedResponse.body as any

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
