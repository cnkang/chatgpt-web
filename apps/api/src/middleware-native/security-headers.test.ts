/**
 * Unit tests for security headers middleware
 */

import { describe, expect, it, vi } from 'vitest'
import { buildHttpOrigin, createMockRequest, createMockResponse } from '../test/test-helpers.js'
import { createSecurityHeadersMiddleware } from './security-headers.js'

type SecurityContextOptions = {
  environment?: 'development' | 'production'
  forwardedProto?: string
  trustProxy?: boolean
  directTls?: boolean
}

const localhostConnectSource = `${buildHttpOrigin('localhost')}:*`
const localhostWebSocketSource = 'ws://localhost:*'

function createSecurityContext(options: SecurityContextOptions = {}) {
  const req = createMockRequest({ path: '/api/health' })
  req._nativeRequest = {
    socket: {
      remoteAddress: options.directTls ? 'direct-tls-socket' : '127.0.0.1',
      encrypted: options.directTls || undefined,
    },
  }

  if (options.forwardedProto) {
    req.headers.set('x-forwarded-proto', options.forwardedProto)
  }

  const res = createMockResponse()
  const next = vi.fn()
  const middleware = createSecurityHeadersMiddleware(options.trustProxy ?? false)

  return { middleware, req, res, next }
}

async function runSecurityHeaders(options: SecurityContextOptions = {}) {
  const originalEnv = process.env.NODE_ENV
  process.env.NODE_ENV = options.environment ?? originalEnv

  try {
    const context = createSecurityContext(options)
    await context.middleware(context.req, context.res, context.next)
    return context
  } finally {
    process.env.NODE_ENV = originalEnv
  }
}

function getCapturedHeader(
  res: ReturnType<typeof createMockResponse>,
  name: string,
): string | string[] | undefined {
  return res._capture.headers.get(name.toLowerCase())
}

describe('createSecurityHeadersMiddleware', () => {
  it('should set all required security headers in a single request', async () => {
    const { res, next } = await runSecurityHeaders()

    expect(getCapturedHeader(res, 'Content-Security-Policy')).toEqual(expect.any(String))
    expect(getCapturedHeader(res, 'X-Content-Type-Options')).toBe('nosniff')
    expect(getCapturedHeader(res, 'X-Frame-Options')).toBe('DENY')
    expect(getCapturedHeader(res, 'Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(getCapturedHeader(res, 'X-Permitted-Cross-Domain-Policies')).toBe('none')
    expect(next).toHaveBeenCalledOnce()
    expect(next).toHaveBeenCalledWith()
  })

  it.each([["default-src 'self'"], ["'unsafe-eval'"], ["style-src 'self' 'unsafe-inline'"]])(
    'should include %s in the CSP header',
    async expectedDirective => {
      const { res, next } = await runSecurityHeaders()
      const csp = getCapturedHeader(res, 'Content-Security-Policy')

      expect(csp).toEqual(expect.any(String))
      expect(csp).toContain(expectedDirective)
      expect(next).toHaveBeenCalled()
    },
  )

  it('should set Strict-Transport-Security for trusted HTTPS proxy traffic in production', async () => {
    const { res, next } = await runSecurityHeaders({
      environment: 'production',
      trustProxy: true,
      forwardedProto: 'https',
    })

    expect(getCapturedHeader(res, 'Strict-Transport-Security')).toBe(
      'max-age=31536000; includeSubDomains; preload',
    )
    expect(next).toHaveBeenCalled()
  })

  it('should set Strict-Transport-Security for direct TLS production requests', async () => {
    const { res, next } = await runSecurityHeaders({
      environment: 'production',
      directTls: true,
    })

    expect(getCapturedHeader(res, 'Strict-Transport-Security')).toBe(
      'max-age=31536000; includeSubDomains; preload',
    )
    expect(next).toHaveBeenCalled()
  })

  it.each([
    {
      name: 'non-HTTPS production requests',
      options: { environment: 'production', trustProxy: true } satisfies SecurityContextOptions,
    },
    {
      name: 'development requests',
      options: { environment: 'development' } satisfies SecurityContextOptions,
    },
  ])('should not set Strict-Transport-Security for $name', async ({ options }) => {
    const { res, next } = await runSecurityHeaders(options)

    expect(getCapturedHeader(res, 'Strict-Transport-Security')).toBeUndefined()
    expect(next).toHaveBeenCalled()
  })

  it.each([
    {
      name: 'include upgrade-insecure-requests in production',
      environment: 'production' as const,
      matcher: (csp: string) => expect(csp).toContain('upgrade-insecure-requests'),
    },
    {
      name: 'exclude upgrade-insecure-requests in development',
      environment: 'development' as const,
      matcher: (csp: string) => expect(csp).not.toContain('upgrade-insecure-requests'),
    },
    {
      name: 'allow localhost websocket sources in development',
      environment: 'development' as const,
      matcher: (csp: string) => {
        expect(csp).toContain(localhostConnectSource)
        expect(csp).toContain(localhostWebSocketSource)
      },
    },
    {
      name: 'exclude localhost websocket sources in production',
      environment: 'production' as const,
      matcher: (csp: string) => {
        expect(csp).not.toContain(localhostConnectSource)
        expect(csp).not.toContain(localhostWebSocketSource)
      },
    },
  ])('should $name', async ({ environment, matcher }) => {
    const { res, next } = await runSecurityHeaders({ environment })
    const csp = getCapturedHeader(res, 'Content-Security-Policy')

    expect(csp).toEqual(expect.any(String))
    matcher(csp as string)
    expect(next).toHaveBeenCalled()
  })
})
