/**
 * Unit tests for security headers middleware
 */

import { describe, expect, it, vi } from 'vitest'
import { buildHttpOrigin, createMockRequest, createMockResponse } from '../test/test-helpers.js'
import { createSecurityHeadersMiddleware } from './security-headers.js'

describe('createSecurityHeadersMiddleware', () => {
  const localhostConnectSource = `${buildHttpOrigin('localhost')}:*`
  const localhostWebSocketSource = 'ws://localhost:*'

  function createSecurityTestRequest() {
    const req = createMockRequest({ path: '/api/health' })
    req._nativeRequest = { socket: { remoteAddress: '127.0.0.1' } }
    return req
  }

  it('should set Content-Security-Policy header', async () => {
    const middleware = createSecurityHeadersMiddleware()
    const req = createSecurityTestRequest()
    const res = createMockResponse()
    const next = vi.fn()

    await middleware(req, res, next)

    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Security-Policy',
      expect.stringContaining("default-src 'self'"),
    )
    expect(next).toHaveBeenCalled()
  })

  it('should include unsafe-eval for Mermaid in script-src', async () => {
    const middleware = createSecurityHeadersMiddleware()
    const req = createSecurityTestRequest()
    const res = createMockResponse()
    const next = vi.fn()

    await middleware(req, res, next)

    const cspCall = (res.setHeader as ReturnType<typeof vi.fn>).mock.calls.find(
      call => call[0] === 'Content-Security-Policy',
    )
    expect(cspCall).toBeDefined()
    expect(cspCall?.[1]).toContain("'unsafe-eval'")
  })

  it('should include unsafe-inline for Naive UI in style-src', async () => {
    const middleware = createSecurityHeadersMiddleware()
    const req = createSecurityTestRequest()
    const res = createMockResponse()
    const next = vi.fn()

    await middleware(req, res, next)

    const cspCall = (res.setHeader as ReturnType<typeof vi.fn>).mock.calls.find(
      call => call[0] === 'Content-Security-Policy',
    )
    expect(cspCall).toBeDefined()
    expect(cspCall?.[1]).toContain("style-src 'self' 'unsafe-inline'")
  })

  it('should set X-Content-Type-Options: nosniff', async () => {
    const middleware = createSecurityHeadersMiddleware()
    const req = createSecurityTestRequest()
    const res = createMockResponse()
    const next = vi.fn()

    await middleware(req, res, next)

    expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff')
    expect(next).toHaveBeenCalled()
  })

  it('should set X-Frame-Options: DENY', async () => {
    const middleware = createSecurityHeadersMiddleware()
    const req = createSecurityTestRequest()
    const res = createMockResponse()
    const next = vi.fn()

    await middleware(req, res, next)

    expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY')
    expect(next).toHaveBeenCalled()
  })

  it('should set Referrer-Policy: strict-origin-when-cross-origin', async () => {
    const middleware = createSecurityHeadersMiddleware()
    const req = createSecurityTestRequest()
    const res = createMockResponse()
    const next = vi.fn()

    await middleware(req, res, next)

    expect(res.setHeader).toHaveBeenCalledWith('Referrer-Policy', 'strict-origin-when-cross-origin')
    expect(next).toHaveBeenCalled()
  })

  it('should set X-Permitted-Cross-Domain-Policies: none', async () => {
    const middleware = createSecurityHeadersMiddleware()
    const req = createSecurityTestRequest()
    const res = createMockResponse()
    const next = vi.fn()

    await middleware(req, res, next)

    expect(res.setHeader).toHaveBeenCalledWith('X-Permitted-Cross-Domain-Policies', 'none')
    expect(next).toHaveBeenCalled()
  })

  it('should set Strict-Transport-Security in production', async () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    const middleware = createSecurityHeadersMiddleware(true)
    const req = createSecurityTestRequest()
    req.headers.set('x-forwarded-proto', 'https')
    const res = createMockResponse()
    const next = vi.fn()

    await middleware(req, res, next)

    expect(res.setHeader).toHaveBeenCalledWith(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload',
    )
    expect(next).toHaveBeenCalled()

    process.env.NODE_ENV = originalEnv
  })

  it('should not set Strict-Transport-Security for non-HTTPS production requests', async () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    const middleware = createSecurityHeadersMiddleware(true)
    const req = createSecurityTestRequest()
    const res = createMockResponse()
    const next = vi.fn()

    await middleware(req, res, next)

    const hstsCall = (res.setHeader as ReturnType<typeof vi.fn>).mock.calls.find(
      call => call[0] === 'Strict-Transport-Security',
    )
    expect(hstsCall).toBeUndefined()
    expect(next).toHaveBeenCalled()

    process.env.NODE_ENV = originalEnv
  })

  it('should not set Strict-Transport-Security in development', async () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    const middleware = createSecurityHeadersMiddleware()
    const req = createSecurityTestRequest()
    const res = createMockResponse()
    const next = vi.fn()

    await middleware(req, res, next)

    const hstsCall = (res.setHeader as ReturnType<typeof vi.fn>).mock.calls.find(
      call => call[0] === 'Strict-Transport-Security',
    )
    expect(hstsCall).toBeUndefined()
    expect(next).toHaveBeenCalled()

    process.env.NODE_ENV = originalEnv
  })

  it('should include upgrade-insecure-requests in production CSP', async () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    const middleware = createSecurityHeadersMiddleware()
    const req = createSecurityTestRequest()
    const res = createMockResponse()
    const next = vi.fn()

    await middleware(req, res, next)

    const cspCall = (res.setHeader as ReturnType<typeof vi.fn>).mock.calls.find(
      call => call[0] === 'Content-Security-Policy',
    )
    expect(cspCall).toBeDefined()
    expect(cspCall?.[1]).toContain('upgrade-insecure-requests')
    expect(next).toHaveBeenCalled()

    process.env.NODE_ENV = originalEnv
  })

  it('should not include upgrade-insecure-requests in development CSP', async () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    const middleware = createSecurityHeadersMiddleware()
    const req = createSecurityTestRequest()
    const res = createMockResponse()
    const next = vi.fn()

    await middleware(req, res, next)

    const cspCall = (res.setHeader as ReturnType<typeof vi.fn>).mock.calls.find(
      call => call[0] === 'Content-Security-Policy',
    )
    expect(cspCall).toBeDefined()
    expect(cspCall?.[1]).not.toContain('upgrade-insecure-requests')
    expect(next).toHaveBeenCalled()

    process.env.NODE_ENV = originalEnv
  })

  it('should allow localhost WebSocket connections in development', async () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    const middleware = createSecurityHeadersMiddleware()
    const req = createSecurityTestRequest()
    const res = createMockResponse()
    const next = vi.fn()

    await middleware(req, res, next)

    const cspCall = (res.setHeader as ReturnType<typeof vi.fn>).mock.calls.find(
      call => call[0] === 'Content-Security-Policy',
    )
    expect(cspCall).toBeDefined()
    expect(cspCall?.[1]).toContain(localhostConnectSource)
    expect(cspCall?.[1]).toContain(localhostWebSocketSource)
    expect(next).toHaveBeenCalled()

    process.env.NODE_ENV = originalEnv
  })

  it('should not allow localhost connections in production', async () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    const middleware = createSecurityHeadersMiddleware()
    const req = createSecurityTestRequest()
    const res = createMockResponse()
    const next = vi.fn()

    await middleware(req, res, next)

    const cspCall = (res.setHeader as ReturnType<typeof vi.fn>).mock.calls.find(
      call => call[0] === 'Content-Security-Policy',
    )
    expect(cspCall).toBeDefined()
    expect(cspCall?.[1]).not.toContain(localhostConnectSource)
    expect(cspCall?.[1]).not.toContain(localhostWebSocketSource)
    expect(next).toHaveBeenCalled()

    process.env.NODE_ENV = originalEnv
  })

  it('should call next() to continue middleware chain', async () => {
    const middleware = createSecurityHeadersMiddleware()
    const req = createSecurityTestRequest()
    const res = createMockResponse()
    const next = vi.fn()

    await middleware(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(next).toHaveBeenCalledWith()
  })

  it('should set all required security headers in a single request', async () => {
    const middleware = createSecurityHeadersMiddleware()
    const req = createSecurityTestRequest()
    const res = createMockResponse()
    const next = vi.fn()

    await middleware(req, res, next)

    const setHeaderCalls = (res.setHeader as ReturnType<typeof vi.fn>).mock.calls
    const headerNames = setHeaderCalls.map(call => call[0])

    expect(headerNames).toContain('Content-Security-Policy')
    expect(headerNames).toContain('X-Content-Type-Options')
    expect(headerNames).toContain('X-Frame-Options')
    expect(headerNames).toContain('Referrer-Policy')
    expect(headerNames).toContain('X-Permitted-Cross-Domain-Policies')
    expect(next).toHaveBeenCalled()
  })
})
