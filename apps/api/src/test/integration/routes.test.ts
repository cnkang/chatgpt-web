/**
 * Route Integration Tests
 * Tests all API endpoints with Transport Layer
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createStaticFileMiddleware } from '../../middleware-native/static.js'
import { healthHandler } from '../../routes/health.js'
import { sessionHandler } from '../../routes/session.js'
import { verifyHandler } from '../../routes/verify.js'
import type { TransportRequest, TransportResponse } from '../../transport/types.js'

// Mock environment variables
const originalEnv = process.env

describe('Route Integration Tests', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Health Route', () => {
    it('should return 200 with health data', async () => {
      const mockReq = {
        method: 'GET',
        path: '/api/health',
        url: new URL('http://localhost/api/health'),
        headers: new Headers(),
        body: null,
        ip: '127.0.0.1',
        getHeader: () => undefined,
        getQuery: () => undefined,
      } as TransportRequest

      let statusCode = 200
      let responseData: unknown = null

      const mockRes = {
        status: vi.fn((code: number) => {
          statusCode = code
          return mockRes
        }),
        setHeader: vi.fn(),
        getHeader: vi.fn(),
        json: vi.fn((data: unknown) => {
          responseData = data
        }),
        send: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
        headersSent: false,
        finished: false,
      } as unknown as TransportResponse

      await healthHandler(mockReq, mockRes)

      expect(statusCode).toBe(200)
      expect(responseData).toMatchObject({
        uptime: expect.any(Number),
        message: 'OK',
        timestamp: expect.any(Number),
      })
    })
  })

  describe('Session Route', () => {
    it('should return 200 with session data', async () => {
      process.env.AUTH_SECRET_KEY = 'test-secret'
      process.env.OPENAI_API_KEY = 'sk-test'
      process.env.AI_PROVIDER = 'openai'

      const mockReq = {
        method: 'POST',
        path: '/api/session',
        url: new URL('http://localhost/api/session'),
        headers: new Headers(),
        body: {},
        ip: '127.0.0.1',
        getHeader: () => undefined,
        getQuery: () => undefined,
      } as TransportRequest

      let statusCode = 200
      let responseData: unknown = null

      const mockRes = {
        status: vi.fn((code: number) => {
          statusCode = code
          return mockRes
        }),
        setHeader: vi.fn(),
        getHeader: vi.fn(),
        json: vi.fn((data: unknown) => {
          responseData = data
        }),
        send: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
        headersSent: false,
        finished: false,
      } as unknown as TransportResponse

      await sessionHandler(mockReq, mockRes)

      expect(statusCode).toBe(200)
      expect(responseData).toMatchObject({
        status: 'Success',
        message: '',
        data: {
          auth: expect.any(Boolean),
          model: expect.any(String),
        },
      })
    })
  })

  describe('Verify Route', () => {
    it('should return 200 for valid token', async () => {
      process.env.AUTH_SECRET_KEY = 'test-secret-key'

      const mockReq = {
        method: 'POST',
        path: '/api/verify',
        url: new URL('http://localhost/api/verify'),
        headers: new Headers(),
        body: { token: 'test-secret-key' },
        ip: '127.0.0.1',
        getHeader: () => undefined,
        getQuery: () => undefined,
      } as TransportRequest

      let statusCode = 200
      let responseData: unknown = null

      const mockRes = {
        status: vi.fn((code: number) => {
          statusCode = code
          return mockRes
        }),
        setHeader: vi.fn(),
        getHeader: vi.fn(),
        json: vi.fn((data: unknown) => {
          responseData = data
        }),
        send: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
        headersSent: false,
        finished: false,
      } as unknown as TransportResponse

      await verifyHandler(mockReq, mockRes)

      expect(statusCode).toBe(200)
      expect(responseData).toMatchObject({
        status: 'Success',
        message: 'Verify successfully',
        data: null,
      })
    })

    it('should return 401 for invalid token', async () => {
      process.env.AUTH_SECRET_KEY = 'test-secret-key'

      const mockReq = {
        method: 'POST',
        path: '/api/verify',
        url: new URL('http://localhost/api/verify'),
        headers: new Headers(),
        body: { token: 'wrong-token' },
        ip: '127.0.0.1',
        getHeader: () => undefined,
        getQuery: () => undefined,
      } as TransportRequest

      let statusCode = 200
      let responseData: unknown = null

      const mockRes = {
        status: vi.fn((code: number) => {
          statusCode = code
          return mockRes
        }),
        setHeader: vi.fn(),
        getHeader: vi.fn(),
        json: vi.fn((data: unknown) => {
          responseData = data
        }),
        send: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
        headersSent: false,
        finished: false,
      } as unknown as TransportResponse

      await verifyHandler(mockReq, mockRes)

      expect(statusCode).toBe(401)
      expect(responseData).toMatchObject({
        status: 'Fail',
        message: 'Invalid authentication token',
        data: null,
        error: {
          code: 'AUTHENTICATION_ERROR',
          type: 'AuthenticationError',
          timestamp: expect.any(String),
        },
      })
    })

    it('should return 400 for missing token', async () => {
      process.env.AUTH_SECRET_KEY = 'test-secret-key'

      const mockReq = {
        method: 'POST',
        path: '/api/verify',
        url: new URL('http://localhost/api/verify'),
        headers: new Headers(),
        body: {},
        ip: '127.0.0.1',
        getHeader: () => undefined,
        getQuery: () => undefined,
      } as TransportRequest

      let statusCode = 200
      let responseData: unknown = null

      const mockRes = {
        status: vi.fn((code: number) => {
          statusCode = code
          return mockRes
        }),
        setHeader: vi.fn(),
        getHeader: vi.fn(),
        json: vi.fn((data: unknown) => {
          responseData = data
        }),
        send: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
        headersSent: false,
        finished: false,
      } as unknown as TransportResponse

      await verifyHandler(mockReq, mockRes)

      expect(statusCode).toBe(400)
      expect(responseData).toMatchObject({
        status: 'Fail',
        message: 'Validation error: token is required',
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          type: 'ValidationError',
          timestamp: expect.any(String),
        },
      })
    })
  })

  describe('Static File Middleware', () => {
    it('should pass through non-GET requests', async () => {
      const middleware = createStaticFileMiddleware('/tmp')

      const mockReq = {
        method: 'POST',
        path: '/test.html',
        url: new URL('http://localhost/test.html'),
        headers: new Headers(),
        body: null,
        ip: '127.0.0.1',
        getHeader: () => undefined,
        getQuery: () => undefined,
      } as TransportRequest

      const mockRes = {
        status: vi.fn(() => mockRes),
        setHeader: vi.fn(),
        getHeader: vi.fn(),
        json: vi.fn(),
        send: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
        headersSent: false,
        finished: false,
      } as unknown as TransportResponse

      let nextCalled = false
      const next = () => {
        nextCalled = true
      }

      await middleware(mockReq, mockRes, next)

      expect(nextCalled).toBe(true)
    })

    it('should pass through for non-existent files', async () => {
      const middleware = createStaticFileMiddleware('/tmp')

      const mockReq = {
        method: 'GET',
        path: '/nonexistent-file-12345.html',
        url: new URL('http://localhost/nonexistent-file-12345.html'),
        headers: new Headers(),
        body: null,
        ip: '127.0.0.1',
        getHeader: () => undefined,
        getQuery: () => undefined,
      } as TransportRequest

      const mockRes = {
        status: vi.fn(() => mockRes),
        setHeader: vi.fn(),
        getHeader: vi.fn(),
        json: vi.fn(),
        send: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
        headersSent: false,
        finished: false,
      } as unknown as TransportResponse

      let nextCalled = false
      const next = () => {
        nextCalled = true
      }

      await middleware(mockReq, mockRes, next)

      expect(nextCalled).toBe(true)
    })
  })

  describe('Route Path Normalization', () => {
    it('should handle both /api/health and /health paths', async () => {
      const paths = ['/api/health', '/health']

      for (const path of paths) {
        const mockReq = {
          method: 'GET',
          path,
          url: new URL(`http://localhost${path}`),
          headers: new Headers(),
          body: null,
          ip: '127.0.0.1',
          getHeader: () => undefined,
          getQuery: () => undefined,
        } as TransportRequest

        let statusCode = 200
        let responseData: unknown = null

        const mockRes = {
          status: vi.fn((code: number) => {
            statusCode = code
            return mockRes
          }),
          setHeader: vi.fn(),
          getHeader: vi.fn(),
          json: vi.fn((data: unknown) => {
            responseData = data
          }),
          send: vi.fn(),
          write: vi.fn(),
          end: vi.fn(),
          headersSent: false,
          finished: false,
        } as unknown as TransportResponse

        await healthHandler(mockReq, mockRes)

        expect(statusCode).toBe(200)
        expect(responseData).toMatchObject({
          uptime: expect.any(Number),
          message: 'OK',
          timestamp: expect.any(Number),
        })
      }
    })
  })
})
