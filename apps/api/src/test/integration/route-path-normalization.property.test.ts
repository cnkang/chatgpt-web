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
import {
  createConfiguredTestAdapter,
  createIntegrationRequest,
  executeAdapterRequest,
} from './adapter-test-utils.js'

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

  // ============================================================================
  // Property Tests
  // ============================================================================

  it('Property 1: /api/health and /health produce identical responses', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        const adapter = createConfiguredTestAdapter()

        // Test both paths
        const req1 = createIntegrationRequest('GET', '/api/health')
        const req2 = createIntegrationRequest('GET', '/health')

        const res1 = await executeAdapterRequest(adapter, req1)
        const res2 = await executeAdapterRequest(adapter, req2)

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
        const adapter = createConfiguredTestAdapter()

        // Test both paths
        const req1 = createIntegrationRequest('POST', '/api/session', {})
        const req2 = createIntegrationRequest('POST', '/session', {})

        const res1 = await executeAdapterRequest(adapter, req1)
        const res2 = await executeAdapterRequest(adapter, req2)

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
        const adapter = createConfiguredTestAdapter()

        const validToken = 'test-secret-key'

        // Test both paths with valid token
        const req1 = createIntegrationRequest('POST', '/api/verify', { token: validToken })
        const req2 = createIntegrationRequest('POST', '/verify', { token: validToken })

        const res1 = await executeAdapterRequest(adapter, req1)
        const res2 = await executeAdapterRequest(adapter, req2)

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
        fc
          .string({ minLength: 1 })
          .filter(s => s.trim().length > 0 && s.trim() !== 'test-secret-key'),
        async randomToken => {
          const adapter = createConfiguredTestAdapter()

          // Test both paths with invalid token
          const req1 = createIntegrationRequest('POST', '/api/verify', { token: randomToken })
          const req2 = createIntegrationRequest('POST', '/verify', { token: randomToken })

          const res1 = await executeAdapterRequest(adapter, req1)
          const res2 = await executeAdapterRequest(adapter, req2)

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
        const adapter = createConfiguredTestAdapter()

        const authHeaders = {
          authorization: 'Bearer test-secret-key',
        }

        // Test both paths with authentication
        const req1 = createIntegrationRequest('POST', '/api/config', {}, authHeaders)
        const req2 = createIntegrationRequest('POST', '/config', {}, authHeaders)

        const res1 = await executeAdapterRequest(adapter, req1)
        const res2 = await executeAdapterRequest(adapter, req2)

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
        const adapter = createConfiguredTestAdapter()

        // Test both paths without authentication
        const req1 = createIntegrationRequest('POST', '/api/config', {})
        const req2 = createIntegrationRequest('POST', '/config', {})

        const res1 = await executeAdapterRequest(adapter, req1)
        const res2 = await executeAdapterRequest(adapter, req2)

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
        const adapter = createConfiguredTestAdapter()

        // Test with /api prefix
        const req1 = createIntegrationRequest(
          endpoint.method,
          `/api${endpoint.path}`,
          endpoint.body,
          endpoint.headers || {},
        )

        // Test without /api prefix
        const req2 = createIntegrationRequest(
          endpoint.method,
          endpoint.path,
          endpoint.body,
          endpoint.headers || {},
        )

        const res1 = await executeAdapterRequest(adapter, req1)
        const res2 = await executeAdapterRequest(adapter, req2)

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
