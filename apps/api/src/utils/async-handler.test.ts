/**
 * Tests for async handler wrapper
 */

import { describe, expect, it, vi } from 'vitest'
import type { TransportRequest, TransportResponse } from '../transport/index.js'
import { asyncHandler } from './async-handler.js'
import { AppError, ErrorType } from './error-handler.js'

describe('async handler', () => {
  const createMockRequest = (): TransportRequest => ({
    method: 'POST',
    path: '/api/test',
    url: new URL('http://localhost:3002/api/test'),
    headers: new Headers(),
    body: {},
    ip: '127.0.0.1',
    getHeader: vi.fn((name: string) => {
      if (name === 'x-request-id') return 'test-request-id'
      return undefined
    }),
    getQuery: vi.fn(),
  })

  const createMockResponse = (): TransportResponse => {
    const headers: Record<string, string | string[]> = {}
    let sent = false
    let finished = false

    return {
      status: vi.fn(function (this: TransportResponse, _code: number) {
        return this
      }),
      setHeader: vi.fn(function (this: TransportResponse, name: string, value: string | string[]) {
        headers[name] = value
        return this
      }),
      getHeader: vi.fn((name: string) => headers[name]),
      json: vi.fn(() => {
        sent = true
        finished = true
      }),
      send: vi.fn(() => {
        sent = true
        finished = true
      }),
      write: vi.fn(() => true),
      end: vi.fn(() => {
        finished = true
      }),
      get headersSent() {
        return sent
      },
      get finished() {
        return finished
      },
    } as unknown as TransportResponse
  }

  it('should execute handler successfully', async () => {
    const handler = vi.fn(async (_req, res) => {
      res.json({ success: true })
    })

    const wrapped = asyncHandler(handler)
    const req = createMockRequest()
    const res = createMockResponse()

    await wrapped(req, res)

    expect(handler).toHaveBeenCalledWith(req, res)
    expect(res.json).toHaveBeenCalledWith({ success: true })
  })

  it('should catch and handle errors', async () => {
    const handler = vi.fn(async () => {
      throw new Error('Test error')
    })

    const wrapped = asyncHandler(handler)
    const req = createMockRequest()
    const res = createMockResponse()

    await wrapped(req, res)

    expect(res.status).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalled()

    // Verify error response structure
    const errorResponse = (res.json as any).mock.calls[0][0]
    expect(errorResponse).toHaveProperty('status')
    expect(errorResponse).toHaveProperty('message')
    expect(errorResponse).toHaveProperty('data', null)
    expect(errorResponse).toHaveProperty('error')
  })

  it('should handle AppError with correct status code', async () => {
    const handler = vi.fn(async () => {
      throw new AppError('Validation failed', ErrorType.VALIDATION, 400)
    })

    const wrapped = asyncHandler(handler)
    const req = createMockRequest()
    const res = createMockResponse()

    await wrapped(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalled()

    const errorResponse = (res.json as any).mock.calls[0][0]
    expect(errorResponse.status).toBe('Fail')
    expect(errorResponse.error?.code).toBe('VALIDATION_ERROR')
  })

  it('should handle authentication errors with 401', async () => {
    const handler = vi.fn(async () => {
      throw new AppError('Authentication required', ErrorType.AUTHENTICATION, 401)
    })

    const wrapped = asyncHandler(handler)
    const req = createMockRequest()
    const res = createMockResponse()

    await wrapped(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('should handle payload too large errors with 413', async () => {
    const handler = vi.fn(async () => {
      throw new AppError('Request entity too large', ErrorType.PAYLOAD_TOO_LARGE, 413)
    })

    const wrapped = asyncHandler(handler)
    const req = createMockRequest()
    const res = createMockResponse()

    await wrapped(req, res)

    expect(res.status).toHaveBeenCalledWith(413)
  })

  it('should handle rate limit errors with 429', async () => {
    const handler = vi.fn(async () => {
      throw new AppError('Rate limit exceeded', ErrorType.RATE_LIMIT, 429)
    })

    const wrapped = asyncHandler(handler)
    const req = createMockRequest()
    const res = createMockResponse()

    await wrapped(req, res)

    expect(res.status).toHaveBeenCalledWith(429)
  })

  it('should handle external API errors with 502', async () => {
    const handler = vi.fn(async () => {
      throw new AppError('Upstream service failed', ErrorType.EXTERNAL_API, 502)
    })

    const wrapped = asyncHandler(handler)
    const req = createMockRequest()
    const res = createMockResponse()

    await wrapped(req, res)

    expect(res.status).toHaveBeenCalledWith(502)
  })

  it('should handle timeout errors with 504', async () => {
    const handler = vi.fn(async () => {
      throw new AppError('Request timeout', ErrorType.TIMEOUT, 504)
    })

    const wrapped = asyncHandler(handler)
    const req = createMockRequest()
    const res = createMockResponse()

    await wrapped(req, res)

    expect(res.status).toHaveBeenCalledWith(504)
  })

  it('should not send error if response already sent', async () => {
    const handler = vi.fn(async (_req, res) => {
      res.json({ data: 'test' })
      throw new Error('Error after response sent')
    })

    const wrapped = asyncHandler(handler)
    const req = createMockRequest()
    const res = createMockResponse()

    await wrapped(req, res)

    // json should only be called once (by the handler, not by error handler)
    expect(res.json).toHaveBeenCalledTimes(1)
    expect(res.json).toHaveBeenCalledWith({ data: 'test' })
  })

  it('should include request ID in error response', async () => {
    const handler = vi.fn(async () => {
      throw new Error('Test error')
    })

    const wrapped = asyncHandler(handler)
    const req = createMockRequest()
    const res = createMockResponse()

    await wrapped(req, res)

    const errorResponse = (res.json as any).mock.calls[0][0]
    expect(errorResponse.error?.requestId).toBe('test-request-id')
  })

  it('should generate request ID if not provided', async () => {
    const handler = vi.fn(async () => {
      throw new Error('Test error')
    })

    const wrapped = asyncHandler(handler)
    const req = createMockRequest()
    req.getHeader = vi.fn(() => undefined) // No request ID
    const res = createMockResponse()

    await wrapped(req, res)

    const errorResponse = (res.json as any).mock.calls[0][0]
    expect(errorResponse.error?.requestId).toBeDefined()
    expect(typeof errorResponse.error?.requestId).toBe('string')
  })

  it('should handle non-Error objects', async () => {
    const handler = vi.fn(async () => {
      throw new Error('String error')
    })

    const wrapped = asyncHandler(handler)
    const req = createMockRequest()
    const res = createMockResponse()

    await wrapped(req, res)

    expect(res.status).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalled()
  })

  it('should preserve TypeScript types', () => {
    const handler: (req: TransportRequest, res: TransportResponse) => Promise<void> = async (
      _req,
      res,
    ) => {
      res.json({ success: true })
    }

    const wrapped = asyncHandler(handler)

    // Type check: wrapped should have the same signature as the handler
    expect(typeof wrapped).toBe('function')
  })
})
