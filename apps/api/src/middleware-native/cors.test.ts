/**
 * CORS Middleware Tests
 *
 * Tests CORS configuration with environment-aware defaults and security checks.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TransportRequest, TransportResponse } from '../transport/types.js'
import { buildHttpOrigin } from '../test/test-helpers.js'
import { createCorsMiddleware } from './cors.js'

describe('CORS Middleware', () => {
  const allowedLocalhostOrigin = buildHttpOrigin('localhost:1002')
  const allowedLoopbackOrigin = buildHttpOrigin('127.0.0.1:1002')
  const blockedOrigin = buildHttpOrigin('evil.com')

  let mockReq: TransportRequest
  let mockRes: TransportResponse
  let nextFn: (error?: Error) => void
  let headers: Map<string, string | string[]>

  beforeEach(() => {
    headers = new Map()

    mockReq = {
      method: 'GET',
      path: '/api/health',
      url: new URL('http://localhost:3002/api/health'),
      headers: new Headers(),
      body: null,
      ip: '127.0.0.1',
      getHeader: (name: string) => mockReq.headers.get(name) || undefined,
      getQuery: vi.fn(),
    } as unknown as TransportRequest

    mockRes = {
      status: vi.fn().mockReturnThis(),
      setHeader: vi.fn((name: string, value: string | string[]) => {
        headers.set(name.toLowerCase(), value)
        return mockRes
      }),
      getHeader: vi.fn((name: string) => headers.get(name.toLowerCase())),
      json: vi.fn(),
      send: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
      headersSent: false,
      finished: false,
    } as unknown as TransportResponse

    nextFn = vi.fn()
  })

  describe('Development Environment', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development')
      delete process.env.ALLOWED_ORIGINS
    })

    it('should allow localhost:1002 by default in development', async () => {
      mockReq.headers.set('origin', allowedLocalhostOrigin)

      const middleware = createCorsMiddleware()
      await middleware(mockReq, mockRes, nextFn)

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        allowedLocalhostOrigin,
      )
      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true')
      expect(mockRes.setHeader).toHaveBeenCalledWith('Vary', 'Origin')
      expect(nextFn).toHaveBeenCalled()
    })

    it('should allow 127.0.0.1:1002 by default in development', async () => {
      mockReq.headers.set('origin', allowedLoopbackOrigin)

      const middleware = createCorsMiddleware()
      await middleware(mockReq, mockRes, nextFn)

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        allowedLoopbackOrigin,
      )
      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true')
      expect(nextFn).toHaveBeenCalled()
    })

    it('should not set CORS headers for disallowed origins in development', async () => {
      mockReq.headers.set('origin', blockedOrigin)

      const middleware = createCorsMiddleware()
      await middleware(mockReq, mockRes, nextFn)

      expect(mockRes.setHeader).not.toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        expect.anything(),
      )
      expect(mockRes.setHeader).not.toHaveBeenCalledWith(
        'Access-Control-Allow-Credentials',
        expect.anything(),
      )
      expect(nextFn).toHaveBeenCalled()
    })
  })

  describe('Production Environment', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'production')
      delete process.env.ALLOWED_ORIGINS
    })

    it('should not allow any origins by default in production', async () => {
      mockReq.headers.set('origin', allowedLocalhostOrigin)

      const middleware = createCorsMiddleware()
      await middleware(mockReq, mockRes, nextFn)

      expect(mockRes.setHeader).not.toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        expect.anything(),
      )
      expect(nextFn).toHaveBeenCalled()
    })

    it('should block wildcard (*) origins in production', async () => {
      vi.stubEnv('ALLOWED_ORIGINS', '*')
      mockReq.headers.set('origin', buildHttpOrigin('example.com'))

      const middleware = createCorsMiddleware()
      await middleware(mockReq, mockRes, nextFn)

      expect(mockRes.setHeader).not.toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        expect.anything(),
      )
      expect(nextFn).toHaveBeenCalled()
    })
  })

  describe('ALLOWED_ORIGINS Configuration', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'production')
    })

    it('should parse comma-separated ALLOWED_ORIGINS', async () => {
      vi.stubEnv('ALLOWED_ORIGINS', 'https://app.example.com,https://admin.example.com')
      mockReq.headers.set('origin', 'https://app.example.com')

      const middleware = createCorsMiddleware()
      await middleware(mockReq, mockRes, nextFn)

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'https://app.example.com',
      )
      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true')
      expect(nextFn).toHaveBeenCalled()
    })

    it('should trim whitespace from ALLOWED_ORIGINS', async () => {
      vi.stubEnv('ALLOWED_ORIGINS', ' https://app.example.com , https://admin.example.com ')
      mockReq.headers.set('origin', 'https://admin.example.com')

      const middleware = createCorsMiddleware()
      await middleware(mockReq, mockRes, nextFn)

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'https://admin.example.com',
      )
      expect(nextFn).toHaveBeenCalled()
    })

    it('should filter out wildcard (*) from ALLOWED_ORIGINS', async () => {
      vi.stubEnv('ALLOWED_ORIGINS', 'https://app.example.com,*,https://admin.example.com')
      mockReq.headers.set('origin', 'https://evil.com')

      const middleware = createCorsMiddleware()
      await middleware(mockReq, mockRes, nextFn)

      expect(mockRes.setHeader).not.toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        expect.anything(),
      )
      expect(nextFn).toHaveBeenCalled()
    })

    it('should allow configured origins', async () => {
      vi.stubEnv('ALLOWED_ORIGINS', 'https://app.example.com')
      mockReq.headers.set('origin', 'https://app.example.com')

      const middleware = createCorsMiddleware()
      await middleware(mockReq, mockRes, nextFn)

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'https://app.example.com',
      )
      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true')
      expect(mockRes.setHeader).toHaveBeenCalledWith('Vary', 'Origin')
      expect(nextFn).toHaveBeenCalled()
    })

    it('should reject origins not in ALLOWED_ORIGINS', async () => {
      vi.stubEnv('ALLOWED_ORIGINS', 'https://app.example.com')
      mockReq.headers.set('origin', 'https://evil.com')

      const middleware = createCorsMiddleware()
      await middleware(mockReq, mockRes, nextFn)

      expect(mockRes.setHeader).not.toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        expect.anything(),
      )
      expect(mockRes.setHeader).not.toHaveBeenCalledWith(
        'Access-Control-Allow-Credentials',
        expect.anything(),
      )
      expect(nextFn).toHaveBeenCalled()
    })
  })

  describe('Null Origin Handling', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development')
      delete process.env.ALLOWED_ORIGINS
    })

    it('should not set CORS headers for null origin', async () => {
      mockReq.headers.set('origin', 'null')

      const middleware = createCorsMiddleware()
      await middleware(mockReq, mockRes, nextFn)

      expect(mockRes.setHeader).not.toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        expect.anything(),
      )
      expect(mockRes.setHeader).not.toHaveBeenCalledWith(
        'Access-Control-Allow-Credentials',
        expect.anything(),
      )
      expect(nextFn).toHaveBeenCalled()
    })
  })

  describe('OPTIONS Preflight Requests', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development')
      delete process.env.ALLOWED_ORIGINS
      mockReq.method = 'OPTIONS'
    })

    it('should return 200 for allowed origins', async () => {
      mockReq.headers.set('origin', allowedLocalhostOrigin)

      const middleware = createCorsMiddleware()
      await middleware(mockReq, mockRes, nextFn)

      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.end).toHaveBeenCalled()
      expect(nextFn).not.toHaveBeenCalled()
    })

    it('should return 403 for disallowed origins', async () => {
      mockReq.headers.set('origin', blockedOrigin)

      const middleware = createCorsMiddleware()
      await middleware(mockReq, mockRes, nextFn)

      expect(mockRes.status).toHaveBeenCalledWith(403)
      expect(mockRes.end).toHaveBeenCalled()
      expect(nextFn).not.toHaveBeenCalled()
    })

    it('should return 403 for null origin', async () => {
      mockReq.headers.set('origin', 'null')

      const middleware = createCorsMiddleware()
      await middleware(mockReq, mockRes, nextFn)

      expect(mockRes.status).toHaveBeenCalledWith(403)
      expect(mockRes.end).toHaveBeenCalled()
      expect(nextFn).not.toHaveBeenCalled()
    })

    it('should set Access-Control-Allow-Headers', async () => {
      mockReq.headers.set('origin', allowedLocalhostOrigin)

      const middleware = createCorsMiddleware()
      await middleware(mockReq, mockRes, nextFn)

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Headers',
        'authorization, Content-Type, X-Requested-With',
      )
    })

    it('should set Access-Control-Allow-Methods', async () => {
      mockReq.headers.set('origin', allowedLocalhostOrigin)

      const middleware = createCorsMiddleware()
      await middleware(mockReq, mockRes, nextFn)

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS',
      )
    })

    it('should set Access-Control-Max-Age', async () => {
      mockReq.headers.set('origin', allowedLocalhostOrigin)

      const middleware = createCorsMiddleware()
      await middleware(mockReq, mockRes, nextFn)

      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Max-Age', '86400')
    })
  })

  describe('Non-OPTIONS Requests', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development')
      delete process.env.ALLOWED_ORIGINS
    })

    it('should call next() for GET requests', async () => {
      mockReq.method = 'GET'
      mockReq.headers.set('origin', allowedLocalhostOrigin)

      const middleware = createCorsMiddleware()
      await middleware(mockReq, mockRes, nextFn)

      expect(nextFn).toHaveBeenCalled()
      expect(mockRes.end).not.toHaveBeenCalled()
    })

    it('should call next() for POST requests', async () => {
      mockReq.method = 'POST'
      mockReq.headers.set('origin', allowedLocalhostOrigin)

      const middleware = createCorsMiddleware()
      await middleware(mockReq, mockRes, nextFn)

      expect(nextFn).toHaveBeenCalled()
      expect(mockRes.end).not.toHaveBeenCalled()
    })

    it('should set CORS headers for allowed origins on non-OPTIONS requests', async () => {
      mockReq.method = 'POST'
      mockReq.headers.set('origin', allowedLocalhostOrigin)

      const middleware = createCorsMiddleware()
      await middleware(mockReq, mockRes, nextFn)

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        allowedLocalhostOrigin,
      )
      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true')
      expect(mockRes.setHeader).toHaveBeenCalledWith('Vary', 'Origin')
      expect(nextFn).toHaveBeenCalled()
    })
  })

  describe('Missing Origin Header', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development')
      delete process.env.ALLOWED_ORIGINS
    })

    it('should not set CORS headers when Origin header is missing', async () => {
      const middleware = createCorsMiddleware()
      await middleware(mockReq, mockRes, nextFn)

      expect(mockRes.setHeader).not.toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        expect.anything(),
      )
      expect(mockRes.setHeader).not.toHaveBeenCalledWith(
        'Access-Control-Allow-Credentials',
        expect.anything(),
      )
      expect(nextFn).toHaveBeenCalled()
    })

    it('should still set Access-Control-Allow-Headers and Methods', async () => {
      const middleware = createCorsMiddleware()
      await middleware(mockReq, mockRes, nextFn)

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Headers',
        'authorization, Content-Type, X-Requested-With',
      )
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS',
      )
    })
  })
})
