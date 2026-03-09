/**
 * Rate Limiter Middleware Tests
 *
 * Tests rate limiting behavior, header setting, cleanup, and error responses.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextFunction, TransportRequest, TransportResponse } from '../transport/types.js'
import { buildIpv4Address } from '../test/test-helpers.js'
import { RateLimiter, createAuthRateLimiter, createGeneralRateLimiter } from './rate-limiter.js'

/**
 * Creates a mock TransportRequest for testing
 */
function createMockRequest(ip: string = '127.0.0.1'): TransportRequest {
  return {
    method: 'POST',
    path: '/api/test',
    url: new URL('http://localhost/api/test'),
    headers: new Headers(),
    body: {},
    ip,
    getHeader: (_name: string) => undefined,
    getQuery: (_name: string) => undefined,
  }
}

/**
 * Creates a mock TransportResponse for testing
 */
function createMockResponse(): TransportResponse & {
  _status: number
  _headers: Map<string, string | string[]>
  _jsonData: unknown
} {
  const headers = new Map<string, string | string[]>()
  let statusCode = 200
  let jsonData: unknown = null

  return {
    _status: statusCode,
    _headers: headers,
    _jsonData: jsonData,

    status(code: number) {
      statusCode = code
      this._status = code
      return this
    },

    setHeader(name: string, value: string | string[]) {
      headers.set(name, value)
      this._headers.set(name, value)
      return this
    },

    getHeader(name: string) {
      return headers.get(name)
    },

    json(data: unknown) {
      jsonData = data
      this._jsonData = data
    },

    send(_data: string | Buffer) {},

    write(_chunk: string | Buffer) {
      return true
    },

    end(_chunk?: string | Buffer) {},

    get headersSent() {
      return false
    },

    get finished() {
      return false
    },
  }
}

describe('RateLimiter', () => {
  const testIpOne = buildIpv4Address(198, 51, 100, 1)
  const testIpTwo = buildIpv4Address(198, 51, 100, 2)
  let limiter: RateLimiter
  let mockNext: NextFunction

  beforeEach(() => {
    mockNext = vi.fn()
  })

  afterEach(() => {
    if (limiter) {
      limiter.destroy()
    }
  })

  describe('Basic Rate Limiting', () => {
    it('should allow requests under the limit', async () => {
      limiter = new RateLimiter({
        windowMs: 60000, // 1 minute
        max: 5,
        message: 'Too many requests',
      })

      const req = createMockRequest()
      const res = createMockResponse()
      const middleware = limiter.middleware()

      // Make 5 requests (all should succeed)
      for (let i = 0; i < 5; i++) {
        await middleware(req, res, mockNext)
      }

      expect(mockNext).toHaveBeenCalledTimes(5)
      expect(res._status).toBe(200)
    })

    it('should block requests over the limit', async () => {
      limiter = new RateLimiter({
        windowMs: 60000, // 1 minute
        max: 3,
        message: 'Too many requests',
      })

      const req = createMockRequest()
      const res = createMockResponse()
      const middleware = limiter.middleware()

      // Make 3 requests (should succeed)
      for (let i = 0; i < 3; i++) {
        await middleware(req, res, mockNext)
      }

      expect(mockNext).toHaveBeenCalledTimes(3)

      // 4th request should be blocked
      const res4 = createMockResponse()
      await middleware(req, res4, mockNext)

      expect(mockNext).toHaveBeenCalledTimes(3) // Still 3, not called for 4th request
      expect(res4._status).toBe(429)
      expect(res4._jsonData).toEqual({
        status: 'Fail',
        message: 'Too many requests',
        data: null,
        error: {
          code: 'RATE_LIMIT_ERROR',
          type: 'RateLimitError',
          timestamp: expect.any(String),
        },
      })
    })

    it('should track requests per IP independently', async () => {
      limiter = new RateLimiter({
        windowMs: 60000,
        max: 2,
        message: 'Too many requests',
      })

      const middleware = limiter.middleware()

      // IP 1: Make 2 requests (should succeed)
      const req1 = createMockRequest(testIpOne)
      for (let i = 0; i < 2; i++) {
        const res = createMockResponse()
        await middleware(req1, res, mockNext)
        expect(res._status).toBe(200)
      }

      // IP 2: Make 2 requests (should also succeed)
      const req2 = createMockRequest(testIpTwo)
      for (let i = 0; i < 2; i++) {
        const res = createMockResponse()
        await middleware(req2, res, mockNext)
        expect(res._status).toBe(200)
      }

      // IP 1: 3rd request should be blocked
      const res1_3 = createMockResponse()
      await middleware(req1, res1_3, mockNext)
      expect(res1_3._status).toBe(429)

      // IP 2: 3rd request should also be blocked
      const res2_3 = createMockResponse()
      await middleware(req2, res2_3, mockNext)
      expect(res2_3._status).toBe(429)
    })
  })

  describe('Rate Limit Headers', () => {
    it('should set X-RateLimit-Limit header', async () => {
      limiter = new RateLimiter({
        windowMs: 60000,
        max: 10,
        message: 'Too many requests',
      })

      const req = createMockRequest()
      const res = createMockResponse()
      const middleware = limiter.middleware()

      await middleware(req, res, mockNext)

      expect(res._headers.get('X-RateLimit-Limit')).toBe('10')
    })

    it('should set X-RateLimit-Remaining header correctly', async () => {
      limiter = new RateLimiter({
        windowMs: 60000,
        max: 5,
        message: 'Too many requests',
      })

      const req = createMockRequest()
      const middleware = limiter.middleware()

      // First request: 4 remaining
      const res1 = createMockResponse()
      await middleware(req, res1, mockNext)
      expect(res1._headers.get('X-RateLimit-Remaining')).toBe('4')

      // Second request: 3 remaining
      const res2 = createMockResponse()
      await middleware(req, res2, mockNext)
      expect(res2._headers.get('X-RateLimit-Remaining')).toBe('3')

      // Third request: 2 remaining
      const res3 = createMockResponse()
      await middleware(req, res3, mockNext)
      expect(res3._headers.get('X-RateLimit-Remaining')).toBe('2')
    })

    it('should set X-RateLimit-Remaining to 0 when limit exceeded', async () => {
      limiter = new RateLimiter({
        windowMs: 60000,
        max: 2,
        message: 'Too many requests',
      })

      const req = createMockRequest()
      const middleware = limiter.middleware()

      // Make 2 requests
      for (let i = 0; i < 2; i++) {
        const res = createMockResponse()
        await middleware(req, res, mockNext)
      }

      // 3rd request should show 0 remaining
      const res3 = createMockResponse()
      await middleware(req, res3, mockNext)
      expect(res3._headers.get('X-RateLimit-Remaining')).toBe('0')
    })

    it('should set X-RateLimit-Reset header', async () => {
      limiter = new RateLimiter({
        windowMs: 60000, // 1 minute
        max: 10,
        message: 'Too many requests',
      })

      const req = createMockRequest()
      const res = createMockResponse()
      const middleware = limiter.middleware()

      const beforeTime = Math.ceil(Date.now() / 1000)
      await middleware(req, res, mockNext)
      const afterTime = Math.ceil((Date.now() + 60000) / 1000)

      const resetTime = Number(res._headers.get('X-RateLimit-Reset'))
      expect(resetTime).toBeGreaterThanOrEqual(beforeTime)
      expect(resetTime).toBeLessThanOrEqual(afterTime)
    })
  })

  describe('Window Reset', () => {
    it('should reset counter after window expires', async () => {
      limiter = new RateLimiter({
        windowMs: 100, // 100ms window for testing
        max: 2,
        message: 'Too many requests',
      })

      const req = createMockRequest()
      const middleware = limiter.middleware()

      // Make 2 requests (should succeed)
      for (let i = 0; i < 2; i++) {
        const res = createMockResponse()
        await middleware(req, res, mockNext)
        expect(res._status).toBe(200)
      }

      // 3rd request should be blocked
      const res3 = createMockResponse()
      await middleware(req, res3, mockNext)
      expect(res3._status).toBe(429)

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150))

      // New request should succeed after window reset
      const res4 = createMockResponse()
      await middleware(req, res4, mockNext)
      expect(res4._status).toBe(200)
    })
  })

  describe('Cleanup', () => {
    it('should remove expired entries', async () => {
      limiter = new RateLimiter({
        windowMs: 100, // 100ms window
        max: 5,
        message: 'Too many requests',
      })

      const req1 = createMockRequest(testIpOne)
      const req2 = createMockRequest(testIpTwo)
      const middleware = limiter.middleware()

      // Make requests from two IPs
      await middleware(req1, createMockResponse(), mockNext)
      await middleware(req2, createMockResponse(), mockNext)

      // Wait for entries to expire
      await new Promise(resolve => setTimeout(resolve, 150))

      // Call cleanup
      limiter.cleanup()

      // Verify cleanup by checking that new requests start fresh counters
      const res1 = createMockResponse()
      await middleware(req1, res1, mockNext)
      expect(res1._headers.get('X-RateLimit-Remaining')).toBe('4') // Fresh counter
    })

    it('should not remove non-expired entries', async () => {
      limiter = new RateLimiter({
        windowMs: 60000, // 1 minute
        max: 5,
        message: 'Too many requests',
      })

      const req = createMockRequest()
      const middleware = limiter.middleware()

      // Make 2 requests
      await middleware(req, createMockResponse(), mockNext)
      await middleware(req, createMockResponse(), mockNext)

      // Call cleanup immediately (entries should not be removed)
      limiter.cleanup()

      // Next request should continue from count 3
      const res = createMockResponse()
      await middleware(req, res, mockNext)
      expect(res._headers.get('X-RateLimit-Remaining')).toBe('2') // Count is 3, so 2 remaining
    })
  })

  describe('Error Response Structure', () => {
    it('should return correct error structure when limit exceeded', async () => {
      limiter = new RateLimiter({
        windowMs: 60000,
        max: 1,
        message: 'Custom error message',
      })

      const req = createMockRequest()
      const middleware = limiter.middleware()

      // First request succeeds
      await middleware(req, createMockResponse(), mockNext)

      // Second request should be blocked with correct error structure
      const res = createMockResponse()
      await middleware(req, res, mockNext)

      expect(res._status).toBe(429)
      expect(res._jsonData).toMatchObject({
        status: 'Fail',
        message: 'Custom error message',
        data: null,
        error: {
          code: 'RATE_LIMIT_ERROR',
          type: 'RateLimitError',
          timestamp: expect.any(String),
        },
      })

      // Verify timestamp is valid ISO 8601
      const errorData = res._jsonData as any
      expect(() => new Date(errorData.error.timestamp)).not.toThrow()
    })
  })
})

describe('createGeneralRateLimiter', () => {
  let limiter: RateLimiter

  afterEach(() => {
    if (limiter) {
      limiter.destroy()
    }
  })

  it('should create limiter with default 100 requests per hour', async () => {
    limiter = createGeneralRateLimiter()

    const req = createMockRequest()
    const res = createMockResponse()
    const middleware = limiter.middleware()

    await middleware(req, res, vi.fn())

    expect(res._headers.get('X-RateLimit-Limit')).toBe('100')
  })

  it('should create limiter with custom max requests', async () => {
    limiter = createGeneralRateLimiter(50)

    const req = createMockRequest()
    const res = createMockResponse()
    const middleware = limiter.middleware()

    await middleware(req, res, vi.fn())

    expect(res._headers.get('X-RateLimit-Limit')).toBe('50')
  })

  it('should use 1 hour window', async () => {
    limiter = createGeneralRateLimiter(100)

    const req = createMockRequest()
    const res = createMockResponse()
    const middleware = limiter.middleware()

    const beforeTime = Math.ceil((Date.now() + 60 * 60 * 1000) / 1000) // 1 hour from now
    await middleware(req, res, vi.fn())
    const afterTime = Math.ceil((Date.now() + 60 * 60 * 1000) / 1000)

    const resetTime = Number(res._headers.get('X-RateLimit-Reset'))
    expect(resetTime).toBeGreaterThanOrEqual(beforeTime - 1)
    expect(resetTime).toBeLessThanOrEqual(afterTime + 1)
  })

  it('should use correct error message', async () => {
    limiter = createGeneralRateLimiter(1)

    const req = createMockRequest()
    const middleware = limiter.middleware()

    // First request succeeds
    await middleware(req, createMockResponse(), vi.fn())

    // Second request should be blocked
    const res = createMockResponse()
    await middleware(req, res, vi.fn())

    expect(res._status).toBe(429)
    const errorData = res._jsonData as any
    expect(errorData.message).toBe(
      'Too many requests from this IP, please try again after 60 minutes',
    )
  })
})

describe('createAuthRateLimiter', () => {
  let limiter: RateLimiter

  afterEach(() => {
    if (limiter) {
      limiter.destroy()
    }
  })

  it('should create limiter with 10 requests limit', async () => {
    limiter = createAuthRateLimiter()

    const req = createMockRequest()
    const res = createMockResponse()
    const middleware = limiter.middleware()

    await middleware(req, res, vi.fn())

    expect(res._headers.get('X-RateLimit-Limit')).toBe('10')
  })

  it('should use 15 minute window', async () => {
    limiter = createAuthRateLimiter()

    const req = createMockRequest()
    const res = createMockResponse()
    const middleware = limiter.middleware()

    const beforeTime = Math.ceil((Date.now() + 15 * 60 * 1000) / 1000) // 15 minutes from now
    await middleware(req, res, vi.fn())
    const afterTime = Math.ceil((Date.now() + 15 * 60 * 1000) / 1000)

    const resetTime = Number(res._headers.get('X-RateLimit-Reset'))
    expect(resetTime).toBeGreaterThanOrEqual(beforeTime - 1)
    expect(resetTime).toBeLessThanOrEqual(afterTime + 1)
  })

  it('should use correct error message', async () => {
    limiter = createAuthRateLimiter()

    const req = createMockRequest()
    const middleware = limiter.middleware()

    // Make 10 requests (should succeed)
    for (let i = 0; i < 10; i++) {
      await middleware(req, createMockResponse(), vi.fn())
    }

    // 11th request should be blocked
    const res = createMockResponse()
    await middleware(req, res, vi.fn())

    expect(res._status).toBe(429)
    const errorData = res._jsonData as any
    expect(errorData.message).toBe(
      'Too many authentication attempts, please try again after 15 minutes',
    )
  })

  it('should enforce strict 10 request limit', async () => {
    limiter = createAuthRateLimiter()

    const req = createMockRequest()
    const middleware = limiter.middleware()
    const mockNext = vi.fn()

    // Make 10 requests (all should succeed)
    for (let i = 0; i < 10; i++) {
      const res = createMockResponse()
      await middleware(req, res, mockNext)
      expect(res._status).toBe(200)
    }

    expect(mockNext).toHaveBeenCalledTimes(10)

    // 11th request should be blocked
    const res11 = createMockResponse()
    await middleware(req, res11, mockNext)
    expect(res11._status).toBe(429)
    expect(mockNext).toHaveBeenCalledTimes(10) // Still 10, not called for 11th request
  })
})
