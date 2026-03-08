/**
 * Health Route Tests
 */

import { describe, expect, it, vi } from 'vitest'
import type { TransportRequest, TransportResponse } from '../transport/types.js'
import { healthHandler } from './health.js'

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

  it('should return uptime greater than 0', async () => {
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

    let responseData: unknown = null

    const mockRes = {
      status: vi.fn(() => mockRes),
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

    expect(responseData).toHaveProperty('uptime')
    expect((responseData as { uptime: number }).uptime).toBeGreaterThan(0)
  })
})
