import type { HTTP2Adapter } from '../../adapters/http2-adapter.js'
import { createConfiguredServer } from '../../server.js'
import type { MiddlewareChainImpl } from '../../transport/middleware-chain.js'
import type { RouterImpl } from '../../transport/router.js'
import type {
  MiddlewareHandler,
  TransportRequest,
  TransportResponse,
} from '../../transport/types.js'
import { createMockRequest, createMockResponse } from '../test-helpers.js'
import * as fc from 'fast-check'
import { vi } from 'vitest'

type AdapterInternals = {
  middleware: MiddlewareChainImpl
  router: RouterImpl
}

type CapturedResponse = {
  body: unknown
  finished: boolean
  headers: Map<string, string | string[]>
  statusCode: number
}

const originalEnv = process.env

export const PROPERTY_TEST_RUNS = 100
export const TEST_SECRET_KEY = 'test-secret-key'
export const TEST_AUTH_HEADERS = {
  authorization: `Bearer ${TEST_SECRET_KEY}`,
}

export function setupIntegrationTestEnv() {
  vi.resetModules()
  process.env = { ...originalEnv }
  process.env.AUTH_SECRET_KEY = TEST_SECRET_KEY
  process.env.OPENAI_API_KEY = 'sk-test-key'
  process.env.AI_PROVIDER = 'openai'
  process.env.NODE_ENV = 'test'
}

export function restoreIntegrationTestEnv() {
  process.env = originalEnv
}

export function runConstantProperty(assertion: () => Promise<void>) {
  return fc.assert(
    fc.asyncProperty(fc.constant(null), async () => {
      await assertion()
      return true
    }),
    { numRuns: PROPERTY_TEST_RUNS },
  )
}

export function createConfiguredTestAdapter(): HTTP2Adapter {
  process.env.HTTP2_ENABLED = 'false'
  return createConfiguredServer().adapter
}

export function createIntegrationRequest(
  method: string,
  path: string,
  body: unknown = null,
  headers: Record<string, string> = {},
): TransportRequest {
  const normalizedPath = encodeURI(path.startsWith('/') ? path.replace(/^\/+/, '/') : `/${path}`)

  return createMockRequest({
    body,
    headers,
    method,
    path: normalizedPath,
  })
}

export async function executeIntegrationRequest(
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
) {
  const adapter = createConfiguredTestAdapter()
  const request = createIntegrationRequest(method, path, body, headers)
  return executeAdapterRequest(adapter, request)
}

export async function executeDualPathRequest(
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
) {
  const adapter = createConfiguredTestAdapter()
  const prefixedRequest = createIntegrationRequest(method, `/api${path}`, body, headers)
  const unprefixedRequest = createIntegrationRequest(method, path, body, headers)

  const prefixedResponse = await executeAdapterRequest(adapter, prefixedRequest)
  const unprefixedResponse = await executeAdapterRequest(adapter, unprefixedRequest)

  return {
    prefixedResponse,
    unprefixedResponse,
  }
}

export async function executeAdapterRequest(
  adapter: HTTP2Adapter,
  request: TransportRequest,
): Promise<{
  body: unknown
  headers: Map<string, string | string[]>
  statusCode: number
}> {
  const response = createMockResponse()
  const captured = response._capture
  const { middleware, router } = adapter as unknown as AdapterInternals

  await middleware.execute(request, response)

  if (!captured.finished) {
    const route = router.match(request.method, request.path)
    if (route) {
      await executeRouteMiddleware(route.middleware, request, response, captured)

      if (!captured.finished) {
        await route.handler(request, response)
      }
    } else {
      response.status(404).json({
        data: null,
        message: 'Not Found',
        status: 'Fail',
      })
    }
  }

  return {
    body: captured.body,
    headers: captured.headers,
    statusCode: captured.statusCode,
  }
}

async function executeRouteMiddleware(
  middlewareHandlers: MiddlewareHandler[],
  request: TransportRequest,
  response: TransportResponse,
  captured: CapturedResponse,
): Promise<void> {
  for (const middleware of middlewareHandlers) {
    if (captured.finished) {
      return
    }

    let nextCalled = false
    await new Promise<void>((resolve, reject) => {
      const next = (error?: Error) => {
        if (error) {
          reject(error)
          return
        }

        nextCalled = true
        resolve()
      }

      try {
        Promise.resolve(middleware(request, response, next))
          .then(() => {
            if (!nextCalled) {
              resolve()
            }
          })
          .catch(reject)
      } catch (error) {
        reject(error)
      }
    })

    if (!nextCalled) {
      return
    }
  }
}
