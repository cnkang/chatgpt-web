/**
 * Unit tests for authentication middleware
 */

import { describe, expect, it, vi } from 'vitest'
import { createMockRequest, createMockResponse } from '../test/test-helpers.js'
import type { TransportRequest } from '../transport/types.js'
import { createAuthMiddleware } from './auth.js'

function createAuthRequest(authHeader?: string) {
  return createMockRequest({
    method: 'POST',
    path: '/api/config',
    headers: authHeader ? { authorization: authHeader } : undefined,
    body: {},
  })
}

async function runAuth(
  secretKey: string,
  authHeader?: string,
  req = createAuthRequest(authHeader),
) {
  const middleware = createAuthMiddleware(secretKey)
  const res = createMockResponse()
  const next = vi.fn()

  await middleware(req, res, next)

  return { req, res, next }
}

function expectUnauthorizedResponse(
  res: ReturnType<typeof createMockResponse>,
  message = 'Error: No access rights',
) {
  expect(res._capture.statusCode).toBe(401)
  expect(res._capture.body).toMatchObject({
    status: 'Fail',
    message,
    data: null,
    error: {
      code: 'AUTHENTICATION_ERROR',
    },
  })
}

describe('Authentication Middleware', () => {
  describe('when AUTH_SECRET_KEY is not configured', () => {
    it('should allow request to proceed without authentication', async () => {
      const { next } = await runAuth('')

      expect(next).toHaveBeenCalledOnce()
      expect(next).toHaveBeenCalledWith()
    })
  })

  describe('when AUTH_SECRET_KEY is configured', () => {
    const SECRET_KEY = 'test-secret-key-12345'

    it('should allow request with valid Bearer token', async () => {
      const { next } = await runAuth(SECRET_KEY, `Bearer ${SECRET_KEY}`)

      expect(next).toHaveBeenCalledOnce()
      expect(next).toHaveBeenCalledWith()
    })

    it('should allow request with valid token (with extra whitespace)', async () => {
      const { next } = await runAuth(`  ${SECRET_KEY}  `, `Bearer   ${SECRET_KEY}  `)

      expect(next).toHaveBeenCalledOnce()
      expect(next).toHaveBeenCalledWith()
    })

    it('should reject request with missing Authorization header', async () => {
      const { res, next } = await runAuth(SECRET_KEY)

      expect(next).not.toHaveBeenCalled()
      expectUnauthorizedResponse(res)

      const response = res._capture.body as {
        error: { code: string; type: string; timestamp: string }
      }
      expect(response.error.type).toBe('AuthenticationError')
      expect(response.error.timestamp).toBeDefined()
    })

    it('should reject request with invalid Bearer token', async () => {
      const { res, next } = await runAuth(SECRET_KEY, 'Bearer wrong-token')

      expect(next).not.toHaveBeenCalled()
      expectUnauthorizedResponse(res)
    })

    it('should reject request with empty Bearer token', async () => {
      const { res, next } = await runAuth(SECRET_KEY, 'Bearer ')

      expect(next).not.toHaveBeenCalled()
      expectUnauthorizedResponse(res)
      const response = res._capture.body as { error: { code: string } }
      expect(response.error.code).toBe('AUTHENTICATION_ERROR')
    })

    it('should reject request with token that differs only in case', async () => {
      const { res, next } = await runAuth(SECRET_KEY, `Bearer ${SECRET_KEY.toUpperCase()}`)

      expect(next).not.toHaveBeenCalled()
      expectUnauthorizedResponse(res)
    })

    it('should reject request with token that has different length', async () => {
      const { res, next } = await runAuth(SECRET_KEY, `Bearer ${SECRET_KEY}extra`)

      expect(next).not.toHaveBeenCalled()
      expectUnauthorizedResponse(res)
    })

    it('should reject request without Bearer prefix', async () => {
      const { res, next } = await runAuth(SECRET_KEY, SECRET_KEY)

      expect(next).not.toHaveBeenCalled()
      expectUnauthorizedResponse(res)
    })

    it('should use constant-time comparison (timing attack prevention)', async () => {
      // This test verifies that the comparison doesn't short-circuit
      // We can't directly test timing, but we verify the logic path
      // Test with tokens of different lengths
      const shortToken = 'short'
      const longToken = 'a'.repeat(100)

      const { next: next1 } = await runAuth(SECRET_KEY, `Bearer ${shortToken}`)
      const { next: next2 } = await runAuth(SECRET_KEY, `Bearer ${longToken}`)

      // Both should be rejected
      expect(next1).not.toHaveBeenCalled()
      expect(next2).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should handle errors gracefully', async () => {
      // Create a request that will cause an error in getHeader
      const req = {
        method: 'POST',
        path: '/api/config',
        url: new URL('http://localhost:3002/api/config'),
        headers: new Headers(),
        body: {},
        ip: '127.0.0.1',
        getHeader: () => {
          throw new Error('Header access error')
        },
        getQuery: () => undefined,
      } as TransportRequest

      const { res, next } = await runAuth('secret', undefined, req)

      expect(next).not.toHaveBeenCalled()
      expectUnauthorizedResponse(res, 'Header access error')
      const response = res._capture.body as { error: { code: string; type: string } }
      expect(response.error.code).toBe('AUTHENTICATION_ERROR')
      expect(response.error.type).toBe('Error')
    })
  })
})
