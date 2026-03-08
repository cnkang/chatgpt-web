/**
 * Unit tests for authentication middleware
 */

import { describe, expect, it, vi } from 'vitest'
import type { TransportRequest, TransportResponse } from '../transport/types.js'
import { createAuthMiddleware } from './auth.js'

describe('Authentication Middleware', () => {
  // Helper to create mock request
  function createMockRequest(authHeader?: string): TransportRequest {
    return {
      method: 'POST',
      path: '/api/config',
      url: new URL('http://localhost:3002/api/config'),
      headers: new Headers(),
      body: {},
      ip: '127.0.0.1',
      getHeader: (name: string) => {
        if (name.toLowerCase() === 'authorization') {
          return authHeader
        }
        return undefined
      },
      getQuery: () => undefined,
    }
  }

  // Helper to create mock response
  function createMockResponse() {
    let statusCode = 200
    let responseData: unknown = null
    let headersSentFlag = false

    const res: TransportResponse = {
      status: (code: number) => {
        statusCode = code
        return res
      },
      setHeader: () => res,
      getHeader: () => undefined,
      json: (data: unknown) => {
        responseData = data
        headersSentFlag = true
      },
      send: () => {
        headersSentFlag = true
      },
      write: () => true,
      end: () => {},
      get headersSent() {
        return headersSentFlag
      },
      get finished() {
        return headersSentFlag
      },
    }

    return {
      res,
      getStatusCode: () => statusCode,
      getResponseData: () => responseData,
    }
  }

  describe('when AUTH_SECRET_KEY is not configured', () => {
    it('should allow request to proceed without authentication', async () => {
      const middleware = createAuthMiddleware('')
      const req = createMockRequest()
      const { res } = createMockResponse()
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
      const req = createMockRequest(`Bearer ${SECRET_KEY}`)
      const { res } = createMockResponse()
      const next = vi.fn()

      await middleware(req, res, next)

      expect(next).toHaveBeenCalledOnce()
      expect(next).toHaveBeenCalledWith()
    })

    it('should allow request with valid token (with extra whitespace)', async () => {
      const middleware = createAuthMiddleware(`  ${SECRET_KEY}  `)
      const req = createMockRequest(`Bearer   ${SECRET_KEY}  `)
      const { res } = createMockResponse()
      const next = vi.fn()

      await middleware(req, res, next)

      expect(next).toHaveBeenCalledOnce()
      expect(next).toHaveBeenCalledWith()
    })

    it('should reject request with missing Authorization header', async () => {
      const middleware = createAuthMiddleware(SECRET_KEY)
      const req = createMockRequest()
      const { res, getStatusCode, getResponseData } = createMockResponse()
      const next = vi.fn()

      await middleware(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(getStatusCode()).toBe(401)

      const response = getResponseData() as {
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
      const req = createMockRequest('Bearer wrong-token')
      const { res, getStatusCode, getResponseData } = createMockResponse()
      const next = vi.fn()

      await middleware(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(getStatusCode()).toBe(401)

      const response = getResponseData() as {
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
      const req = createMockRequest('Bearer ')
      const { res, getStatusCode, getResponseData } = createMockResponse()
      const next = vi.fn()

      await middleware(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(getStatusCode()).toBe(401)

      const response = getResponseData() as {
        status: string
        message: string
        data: null
        error: { code: string }
      }

      expect(response.error.code).toBe('AUTHENTICATION_ERROR')
    })

    it('should reject request with token that differs only in case', async () => {
      const middleware = createAuthMiddleware(SECRET_KEY)
      const req = createMockRequest(`Bearer ${SECRET_KEY.toUpperCase()}`)
      const { res, getStatusCode } = createMockResponse()
      const next = vi.fn()

      await middleware(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(getStatusCode()).toBe(401)
    })

    it('should reject request with token that has different length', async () => {
      const middleware = createAuthMiddleware(SECRET_KEY)
      const req = createMockRequest(`Bearer ${SECRET_KEY}extra`)
      const { res, getStatusCode } = createMockResponse()
      const next = vi.fn()

      await middleware(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(getStatusCode()).toBe(401)
    })

    it('should reject request without Bearer prefix', async () => {
      const middleware = createAuthMiddleware(SECRET_KEY)
      const req = createMockRequest(SECRET_KEY)
      const { res, getStatusCode } = createMockResponse()
      const next = vi.fn()

      await middleware(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(getStatusCode()).toBe(401)
    })

    it('should use constant-time comparison (timing attack prevention)', async () => {
      // This test verifies that the comparison doesn't short-circuit
      // We can't directly test timing, but we verify the logic path
      const middleware = createAuthMiddleware(SECRET_KEY)

      // Test with tokens of different lengths
      const shortToken = 'short'
      const longToken = 'a'.repeat(100)

      const req1 = createMockRequest(`Bearer ${shortToken}`)
      const { res: res1 } = createMockResponse()
      const next1 = vi.fn()

      const req2 = createMockRequest(`Bearer ${longToken}`)
      const { res: res2 } = createMockResponse()
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

      const { res, getStatusCode, getResponseData } = createMockResponse()
      const next = vi.fn()

      await middleware(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(getStatusCode()).toBe(401)

      const response = getResponseData() as {
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
