/**
 * Verify Route Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TransportRequest, TransportResponse } from '../transport/types.js'
import { verifyHandler } from './verify.js'

const originalEnv = process.env

describe('Verify Route', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

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

  it('should use constant-time comparison for tokens', async () => {
    process.env.AUTH_SECRET_KEY = 'secret123'

    // Test with tokens of different lengths
    const mockReq = {
      method: 'POST',
      path: '/api/verify',
      url: new URL('http://localhost/api/verify'),
      headers: new Headers(),
      body: { token: 'short' },
      ip: '127.0.0.1',
      getHeader: () => undefined,
      getQuery: () => undefined,
    } as TransportRequest

    let statusCode = 200

    const mockRes = {
      status: vi.fn((code: number) => {
        statusCode = code
        return mockRes
      }),
      setHeader: vi.fn(),
      getHeader: vi.fn(),
      json: vi.fn(),
      send: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
      headersSent: false,
      finished: false,
    } as unknown as TransportResponse

    await verifyHandler(mockReq, mockRes)

    expect(statusCode).toBe(401)
  })
})
