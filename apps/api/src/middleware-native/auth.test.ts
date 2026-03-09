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

describe('Authentication Middleware', () => {
  describe('when AUTH_SECRET_KEY is not configured', () => {
    it('should allow request to proceed without authentication', async () => {
      const middleware = createAuthMiddleware('')
      const req = createAuthRequest()
      const res = createMockResponse()
      const next = vi.fn()

      await middleware(req, res, next)

      expect(next).toHaveBeenCalledOnce()
      expect(next).toHaveBeenCalledWith()
    })
  })

  describe('when AUTH_SECRET_KEY is configured', () => {
    const SECRET_KEY = 'test-secret-key-12345'

    it('should allow request with valid Bearer token', async () => {
      const middleware = createAuthMiddleware(SECRET_KEY)
      const req = createAuthRequest(`Bearer ${SECRET_KEY}`)
      const res = createMockResponse()
      const next = vi.fn()

      await middleware(req, res, next)

      expect(next).toHaveBeenCalledOnce()
      expect(next).toHaveBeenCalledWith()
    })

    it('should allow request with valid token (with extra whitespace)', async () => {
      const middleware = createAuthMiddleware(`  ${SECRET_KEY}  `)
      const req = createAuthRequest(`Bearer   ${SECRET_KEY}  `)
      const res = createMockResponse()
      const next = vi.fn()

      await middleware(req, res, next)

      expect(next).toHaveBeenCalledOnce()
      expect(next).toHaveBeenCalledWith()
    })

    it('should reject request with missing Authorization header', async () => {
      const middleware = createAuthMiddleware(SECRET_KEY)
      const req = createAuthRequest()
      const res = createMockResponse()
      const next = vi.fn()

      await middleware(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(res._capture.statusCode).toBe(401)

      const response = res._capture.body as {
        status: string
        message: string
        data: null
        error: { code: string; type: string; timestamp: string }
      }

      expect(response.status).toBe('Fail')
      expect(response.message).toBe('Error: No access rights')
      expect(response.data).toBeNull()
      expect(response.error.code).toBe('AUTHENTICATION_ERROR')
      expect(response.error.type).toBe('AuthenticationError')
      expect(response.error.timestamp).toBeDefined()
    })

    it('should reject request with invalid Bearer token', async () => {
      const middleware = createAuthMiddleware(SECRET_KEY)
      const req = createAuthRequest('Bearer wrong-token')
      const res = createMockResponse()
      const next = vi.fn()

      await middleware(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(res._capture.statusCode).toBe(401)

      const response = res._capture.body as {
        status: string
        message: string
        data: null
        error: { code: string; type: string; timestamp: string }
      }

      expect(response.status).toBe('Fail')
      expect(response.message).toBe('Error: No access rights')
      expect(response.data).toBeNull()
      expect(response.error.code).toBe('AUTHENTICATION_ERROR')
    })

    it('should reject request with empty Bearer token', async () => {
      const middleware = createAuthMiddleware(SECRET_KEY)
      const req = createAuthRequest('Bearer ')
      const res = createMockResponse()
      const next = vi.fn()

      await middleware(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(res._capture.statusCode).toBe(401)

      const response = res._capture.body as {
        status: string
        message: string
        data: null
        error: { code: string }
      }

      expect(response.error.code).toBe('AUTHENTICATION_ERROR')
    })

    it('should reject request with token that differs only in case', async () => {
      const middleware = createAuthMiddleware(SECRET_KEY)
      const req = createAuthRequest(`Bearer ${SECRET_KEY.toUpperCase()}`)
      const res = createMockResponse()
      const next = vi.fn()

      await middleware(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(res._capture.statusCode).toBe(401)
    })

    it('should reject request with token that has different length', async () => {
      const middleware = createAuthMiddleware(SECRET_KEY)
      const req = createAuthRequest(`Bearer ${SECRET_KEY}extra`)
      const res = createMockResponse()
      const next = vi.fn()

      await middleware(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(res._capture.statusCode).toBe(401)
    })

    it('should reject request without Bearer prefix', async () => {
      const middleware = createAuthMiddleware(SECRET_KEY)
      const req = createAuthRequest(SECRET_KEY)
      const res = createMockResponse()
      const next = vi.fn()

      await middleware(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(res._capture.statusCode).toBe(401)
    })

    it('should use constant-time comparison (timing attack prevention)', async () => {
      // This test verifies that the comparison doesn't short-circuit
      // We can't directly test timing, but we verify the logic path
      const middleware = createAuthMiddleware(SECRET_KEY)

      // Test with tokens of different lengths
      const shortToken = 'short'
      const longToken = 'a'.repeat(100)

      const req1 = createAuthRequest(`Bearer ${shortToken}`)
      const res1 = createMockResponse()
      const next1 = vi.fn()

      const req2 = createAuthRequest(`Bearer ${longToken}`)
      const res2 = createMockResponse()
      const next2 = vi.fn()

      await middleware(req1, res1, next1)
      await middleware(req2, res2, next2)

      // Both should be rejected
      expect(next1).not.toHaveBeenCalled()
      expect(next2).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should handle errors gracefully', async () => {
      const middleware = createAuthMiddleware('secret')

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

      const res = createMockResponse()
      const next = vi.fn()

      await middleware(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(res._capture.statusCode).toBe(401)

      const response = res._capture.body as {
        status: string
        message: string
        error: { code: string; type: string }
      }

      expect(response.status).toBe('Fail')
      expect(response.message).toBe('Header access error')
      expect(response.error.code).toBe('AUTHENTICATION_ERROR')
      expect(response.error.type).toBe('Error')
    })
  })
})
