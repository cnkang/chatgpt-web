/**
 * Static File Middleware Tests
 */

import { describe, expect, it, vi } from 'vitest'
import type { TransportRequest, TransportResponse } from '../transport/types.js'
import { createStaticFileMiddleware } from './static.js'

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

  it('should prevent directory traversal attacks', async () => {
    const middleware = createStaticFileMiddleware('/tmp')

    const mockReq = {
      method: 'GET',
      path: '/../../../etc/passwd',
      url: new URL('http://localhost/../../../etc/passwd'),
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

    // Should pass through (not serve the file) for security
    expect(nextCalled).toBe(true)
  })
})
