/**
 * Tests for request logging middleware
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TransportRequest, TransportResponse } from '../transport/types.js'
import * as loggerModule from '../utils/logger.js'
import { createRequestLoggerMiddleware } from './request-logger.js'

describe('Request Logger Middleware', () => {
  let mockReq: TransportRequest
  let mockRes: TransportResponse
  let next: (error?: Error) => void
  let loggerSpy: {
    info: ReturnType<typeof vi.fn>
    error: ReturnType<typeof vi.fn>
    logApiCall: ReturnType<typeof vi.fn>
    logPerformance: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    // Mock logger
    loggerSpy = {
      info: vi.fn(),
      error: vi.fn(),
      logApiCall: vi.fn(),
      logPerformance: vi.fn(),
    }
    vi.spyOn(loggerModule, 'logger', 'get').mockReturnValue(loggerSpy as any)

    // Mock request
    mockReq = {
      method: 'GET',
      path: '/api/health',
      url: new URL('http://localhost:3002/api/health?test=value'),
      headers: new Headers({
        'user-agent': 'test-agent',
        'x-request-id': 'test-request-id',
      }),
      body: null,
      ip: '127.0.0.1',
      getHeader: (name: string) => {
        if (name === 'user-agent') return 'test-agent'
        if (name === 'x-request-id') return 'test-request-id'
        return undefined
      },
      getQuery: (name: string) => {
        if (name === 'test') return 'value'
        return undefined
      },
    }

    // Mock response
    let endCallback: Function | undefined
    mockRes = {
      status: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
      getHeader: vi.fn(),
      json: vi.fn(),
      send: vi.fn(),
      write: vi.fn(),
      end: vi.fn((...args: unknown[]) => {
        if (endCallback) {
          endCallback(...(args as [string | Buffer | undefined]))
        }
      }),
      headersSent: false,
      finished: false,
      _nativeResponse: { statusCode: 200 },
    } as any

    // Allow setting end callback for testing
    const originalEnd = mockRes.end
    mockRes.end = vi.fn((...args: unknown[]) => {
      if (endCallback) {
        endCallback(...(args as [string | Buffer | undefined]))
      }
      return originalEnd(...(args as [string | Buffer | undefined]))
    }) as any

    next = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should log request start with method, path, and query parameters', async () => {
    const middleware = createRequestLoggerMiddleware()

    await middleware(mockReq, mockRes, next)

    expect(loggerSpy.info).toHaveBeenCalledWith(
      'Request started',
      {
        method: 'GET',
        path: '/api/health',
        query: { test: 'value' },
      },
      {
        requestId: 'test-request-id',
        ip: '127.0.0.1',
        userAgent: 'test-agent',
      },
    )
  })

  it('should generate request ID if not provided in headers', async () => {
    mockReq.getHeader = (name: string) => {
      if (name === 'user-agent') return 'test-agent'
      return undefined
    }

    const middleware = createRequestLoggerMiddleware()

    await middleware(mockReq, mockRes, next)

    const infoCall = loggerSpy.info.mock.calls[0]
    expect(infoCall[2].requestId).toBeDefined()
    expect(typeof infoCall[2].requestId).toBe('string')
    expect(infoCall[2].requestId.length).toBeGreaterThan(0)
  })

  it('should call next() to continue middleware chain', async () => {
    const middleware = createRequestLoggerMiddleware()

    await middleware(mockReq, mockRes, next)

    expect(next).toHaveBeenCalledOnce()
  })

  it('should log API call completion when response ends', async () => {
    const middleware = createRequestLoggerMiddleware()

    await middleware(mockReq, mockRes, next)

    // Simulate response end
    ;(mockRes as any)._nativeResponse.statusCode = 200
    mockRes.end()

    expect(loggerSpy.logApiCall).toHaveBeenCalledWith(
      'GET',
      '/api/health',
      200,
      expect.any(Number),
      {
        requestId: 'test-request-id',
        ip: '127.0.0.1',
        userAgent: 'test-agent',
      },
    )
  })

  it('should log performance metrics with duration and memory delta', async () => {
    const middleware = createRequestLoggerMiddleware()

    await middleware(mockReq, mockRes, next)

    // Simulate response end
    ;(mockRes as any)._nativeResponse.statusCode = 200
    mockRes.end()

    expect(loggerSpy.logPerformance).toHaveBeenCalledWith(
      'GET /api/health',
      expect.any(Number),
      {
        memoryDelta: {
          heapUsed: expect.any(String),
          external: expect.any(String),
        },
        statusCode: 200,
      },
      {
        requestId: 'test-request-id',
      },
    )
  })

  it('should log correct status code for error responses', async () => {
    const middleware = createRequestLoggerMiddleware()

    await middleware(mockReq, mockRes, next)

    // Simulate error response
    ;(mockRes as any)._nativeResponse.statusCode = 404
    mockRes.end()

    expect(loggerSpy.logApiCall).toHaveBeenCalledWith(
      'GET',
      '/api/health',
      404,
      expect.any(Number),
      expect.any(Object),
    )
  })

  it('should only log response once even if end() is called multiple times', async () => {
    const middleware = createRequestLoggerMiddleware()

    await middleware(mockReq, mockRes, next)

    // Call end multiple times
    mockRes.end()
    mockRes.end()
    mockRes.end()

    // Should only log once
    expect(loggerSpy.logApiCall).toHaveBeenCalledOnce()
    expect(loggerSpy.logPerformance).toHaveBeenCalledOnce()
  })

  it('should handle POST requests with body', async () => {
    mockReq.method = 'POST'
    mockReq.path = '/api/chat-process'
    mockReq.body = { prompt: 'test prompt' }

    const middleware = createRequestLoggerMiddleware()

    await middleware(mockReq, mockRes, next)

    expect(loggerSpy.info).toHaveBeenCalledWith(
      'Request started',
      expect.objectContaining({
        method: 'POST',
        path: '/api/chat-process',
      }),
      expect.any(Object),
    )
  })

  it('should measure response time accurately', async () => {
    const middleware = createRequestLoggerMiddleware()

    await middleware(mockReq, mockRes, next)

    // Wait a bit before ending
    await new Promise(resolve => setTimeout(resolve, 10))

    mockRes.end()

    const performanceCall = loggerSpy.logPerformance.mock.calls[0]
    const duration = performanceCall[1]

    expect(duration).toBeGreaterThanOrEqual(10)
  })

  it('should handle missing user-agent header', async () => {
    mockReq.getHeader = (name: string) => {
      if (name === 'x-request-id') return 'test-request-id'
      return undefined
    }

    const middleware = createRequestLoggerMiddleware()

    await middleware(mockReq, mockRes, next)

    expect(loggerSpy.info).toHaveBeenCalledWith(
      'Request started',
      expect.any(Object),
      expect.objectContaining({
        requestId: 'test-request-id',
        ip: '127.0.0.1',
        userAgent: undefined,
      }),
    )
  })

  it('should handle requests with no query parameters', async () => {
    mockReq.url = new URL('http://localhost:3002/api/health')

    const middleware = createRequestLoggerMiddleware()

    await middleware(mockReq, mockRes, next)

    expect(loggerSpy.info).toHaveBeenCalledWith(
      'Request started',
      expect.objectContaining({
        query: {},
      }),
      expect.any(Object),
    )
  })
})
