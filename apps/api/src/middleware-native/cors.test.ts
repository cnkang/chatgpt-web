/**
 * CORS Middleware Tests
 *
 * Tests CORS configuration with environment-aware defaults and security checks.
 */

import { describe, expect, it, vi } from 'vitest'
import { buildHttpOrigin, createMockRequest, createMockResponse } from '../test/test-helpers.js'
import { createCorsMiddleware } from './cors.js'

type CorsContextOptions = {
  environment?: 'development' | 'production'
  allowedOrigins?: string
  method?: string
  origin?: string
}

const allowedLocalhostOrigin = buildHttpOrigin('localhost:1002')
const allowedLoopbackOrigin = buildHttpOrigin('127.0.0.1:1002')
const blockedOrigin = buildHttpOrigin('evil.com')

function setupEnvironment(options: CorsContextOptions) {
  const originalEnv = process.env.NODE_ENV
  const originalAllowedOrigins = process.env.ALLOWED_ORIGINS

  if (options.environment !== undefined) {
    process.env.NODE_ENV = options.environment
  }

  if (options.allowedOrigins === undefined) {
    delete process.env.ALLOWED_ORIGINS
  } else {
    process.env.ALLOWED_ORIGINS = options.allowedOrigins
  }

  return () => {
    process.env.NODE_ENV = originalEnv
    if (originalAllowedOrigins === undefined) {
      delete process.env.ALLOWED_ORIGINS
    } else {
      process.env.ALLOWED_ORIGINS = originalAllowedOrigins
    }
  }
}

async function runCors(options: CorsContextOptions = {}) {
  const restoreEnv = setupEnvironment(options)

  try {
    const req = createMockRequest({
      method: options.method ?? 'GET',
      path: '/api/health',
      headers: options.origin ? { origin: options.origin } : undefined,
    })
    const res = createMockResponse()
    const next = vi.fn()

    await createCorsMiddleware()(req, res, next)

    return { req, res, next }
  } finally {
    restoreEnv()
  }
}

function getCapturedHeader(
  res: ReturnType<typeof createMockResponse>,
  name: string,
): string | string[] | undefined {
  return res._capture.headers.get(name.toLowerCase())
}

function expectAllowedOrigin(res: ReturnType<typeof createMockResponse>, origin: string) {
  expect(getCapturedHeader(res, 'Access-Control-Allow-Origin')).toBe(origin)
  expect(getCapturedHeader(res, 'Access-Control-Allow-Credentials')).toBe('true')
}

function expectBlockedOrigin(res: ReturnType<typeof createMockResponse>) {
  expect(getCapturedHeader(res, 'Access-Control-Allow-Origin')).toBeUndefined()
  expect(getCapturedHeader(res, 'Access-Control-Allow-Credentials')).toBeUndefined()
}

describe('CORS Middleware', () => {
  it.each([
    {
      name: 'allow localhost:1002 by default in development',
      options: {
        environment: 'development',
        origin: allowedLocalhostOrigin,
      } satisfies CorsContextOptions,
      assert: ({ res }: Awaited<ReturnType<typeof runCors>>) => {
        expectAllowedOrigin(res, allowedLocalhostOrigin)
        expect(getCapturedHeader(res, 'Vary')).toBe('Origin')
      },
    },
    {
      name: 'allow 127.0.0.1:1002 by default in development',
      options: {
        environment: 'development',
        origin: allowedLoopbackOrigin,
      } satisfies CorsContextOptions,
      assert: ({ res }: Awaited<ReturnType<typeof runCors>>) => {
        expectAllowedOrigin(res, allowedLoopbackOrigin)
      },
    },
    {
      name: 'block disallowed origins in development',
      options: {
        environment: 'development',
        origin: blockedOrigin,
      } satisfies CorsContextOptions,
      assert: ({ res }: Awaited<ReturnType<typeof runCors>>) => {
        expectBlockedOrigin(res)
      },
    },
    {
      name: 'block localhost by default in production',
      options: {
        environment: 'production',
        origin: allowedLocalhostOrigin,
      } satisfies CorsContextOptions,
      assert: ({ res }: Awaited<ReturnType<typeof runCors>>) => {
        expectBlockedOrigin(res)
      },
    },
    {
      name: 'block wildcard origins in production',
      options: {
        environment: 'production',
        allowedOrigins: '*',
        origin: buildHttpOrigin('example.com'),
      } satisfies CorsContextOptions,
      assert: ({ res }: Awaited<ReturnType<typeof runCors>>) => {
        expectBlockedOrigin(res)
      },
    },
    {
      name: 'parse comma-separated ALLOWED_ORIGINS',
      options: {
        environment: 'production',
        allowedOrigins: 'https://app.example.com,https://admin.example.com',
        origin: 'https://app.example.com',
      } satisfies CorsContextOptions,
      assert: ({ res }: Awaited<ReturnType<typeof runCors>>) => {
        expectAllowedOrigin(res, 'https://app.example.com')
      },
    },
    {
      name: 'trim ALLOWED_ORIGINS entries',
      options: {
        environment: 'production',
        allowedOrigins: ' https://app.example.com , https://admin.example.com ',
        origin: 'https://admin.example.com',
      } satisfies CorsContextOptions,
      assert: ({ res }: Awaited<ReturnType<typeof runCors>>) => {
        expectAllowedOrigin(res, 'https://admin.example.com')
      },
    },
    {
      name: 'filter wildcard entries from ALLOWED_ORIGINS',
      options: {
        environment: 'production',
        allowedOrigins: 'https://app.example.com,*,https://admin.example.com',
        origin: blockedOrigin,
      } satisfies CorsContextOptions,
      assert: ({ res }: Awaited<ReturnType<typeof runCors>>) => {
        expectBlockedOrigin(res)
      },
    },
    {
      name: 'allow configured origins',
      options: {
        environment: 'production',
        allowedOrigins: 'https://app.example.com',
        origin: 'https://app.example.com',
      } satisfies CorsContextOptions,
      assert: ({ res }: Awaited<ReturnType<typeof runCors>>) => {
        expectAllowedOrigin(res, 'https://app.example.com')
        expect(getCapturedHeader(res, 'Vary')).toBe('Origin')
      },
    },
    {
      name: 'reject origins not in ALLOWED_ORIGINS',
      options: {
        environment: 'production',
        allowedOrigins: 'https://app.example.com',
        origin: blockedOrigin,
      } satisfies CorsContextOptions,
      assert: ({ res }: Awaited<ReturnType<typeof runCors>>) => {
        expectBlockedOrigin(res)
      },
    },
    {
      name: 'reject null origins',
      options: {
        environment: 'development',
        origin: 'null',
      } satisfies CorsContextOptions,
      assert: ({ res }: Awaited<ReturnType<typeof runCors>>) => {
        expectBlockedOrigin(res)
      },
    },
    {
      name: 'ignore missing Origin headers',
      options: {
        environment: 'development',
      } satisfies CorsContextOptions,
      assert: ({ res }: Awaited<ReturnType<typeof runCors>>) => {
        expectBlockedOrigin(res)
      },
    },
  ])('should $name', async ({ options, assert }) => {
    const context = await runCors(options)

    assert(context)
    expect(context.next).toHaveBeenCalled()
  })

  it.each([
    {
      name: 'return 200 for allowed preflight origins',
      options: {
        environment: 'development',
        method: 'OPTIONS',
        origin: allowedLocalhostOrigin,
      } satisfies CorsContextOptions,
      statusCode: 200,
    },
    {
      name: 'return 403 for disallowed preflight origins',
      options: {
        environment: 'development',
        method: 'OPTIONS',
        origin: blockedOrigin,
      } satisfies CorsContextOptions,
      statusCode: 403,
    },
    {
      name: 'return 403 for null preflight origins',
      options: {
        environment: 'development',
        method: 'OPTIONS',
        origin: 'null',
      } satisfies CorsContextOptions,
      statusCode: 403,
    },
  ])('should $name', async ({ options, statusCode }) => {
    const { res, next } = await runCors(options)

    expect(res._capture.statusCode).toBe(statusCode)
    expect(res.end).toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()
  })

  it.each(['GET', 'POST'])('should call next() for %s requests', async method => {
    const { res, next } = await runCors({
      environment: 'development',
      method,
      origin: allowedLocalhostOrigin,
    })

    expect(next).toHaveBeenCalled()
    expect(res.end).not.toHaveBeenCalled()
  })

  it('should always set the shared CORS response headers', async () => {
    const { res } = await runCors({
      environment: 'development',
      origin: allowedLocalhostOrigin,
    })

    expect(getCapturedHeader(res, 'Access-Control-Allow-Headers')).toBe(
      'authorization, Content-Type, X-Requested-With',
    )
    expect(getCapturedHeader(res, 'Access-Control-Allow-Methods')).toBe(
      'GET, POST, PUT, DELETE, OPTIONS',
    )
    expect(getCapturedHeader(res, 'Access-Control-Max-Age')).toBe('86400')
  })
})
