/**
 * HTTP2 Adapter Error Handling Tests (Task 2.6)
 *
 * Tests error mapping to HTTP status codes and error response structure.
 * Validates Requirements 10.1-10.10 (Error Handling Behavior).
 */

import type { Server as HttpServer } from 'node:http'
import { describe, expect, it } from 'vitest'
import type { TransportRequest, TransportResponse } from '../transport/index.js'
import { MiddlewareChainImpl, RouterImpl } from '../transport/index.js'
import { AppError, ErrorType } from '../utils/error-handler.js'
import { HTTP2Adapter } from './http2-adapter.js'

type HttpTestResponse = {
  statusCode: number
  body: any
  headers: any
}

function createAdapter() {
  const router = new RouterImpl()
  const middleware = new MiddlewareChainImpl()
  const adapter = new HTTP2Adapter(router, middleware, {
    http2: false, // Use HTTP/1.1 for easier testing
  })
  return { adapter, router }
}

async function makeRequest(
  server: HttpServer,
  method: string,
  path: string,
  body?: unknown,
): Promise<HttpTestResponse> {
  return new Promise((resolve, reject) => {
    const address = server.address()
    if (!address || typeof address === 'string') {
      reject(new Error('Server not listening'))
      return
    }

    const http = require('node:http')
    const req = http.request(
      {
        hostname: 'localhost',
        port: address.port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      },
      (res: any) => {
        let data = ''
        res.on('data', (chunk: Buffer) => {
          data += chunk.toString()
        })
        res.on('end', () => {
          try {
            resolve({
              statusCode: res.statusCode,
              body: JSON.parse(data),
              headers: res.headers,
            })
          } catch {
            resolve({
              statusCode: res.statusCode,
              body: data,
              headers: res.headers,
            })
          }
        })
      },
    )

    req.on('error', reject)

    if (body) {
      req.write(JSON.stringify(body))
    }
    req.end()
  })
}

async function expectRouteErrorResponse(
  thrownError: Error,
  assertions: (response: HttpTestResponse) => void,
) {
  const { adapter, router } = createAdapter()

  router.post('/test', async (_req: TransportRequest, _res: TransportResponse) => {
    throw thrownError
  })

  await adapter.listen(0)
  const server = adapter.getServer() as HttpServer

  try {
    const response = await makeRequest(server, 'POST', '/test', {})
    assertions(response)
  } finally {
    await adapter.close()
  }
}

describe('HTTP2Adapter Error Handling (Task 2.6)', () => {
  describe('Error Response Structure', () => {
    it.each([
      {
        name: 'validation errors',
        error: new AppError('Validation failed', ErrorType.VALIDATION, 400),
        statusCode: 400,
        body: {
          status: 'Fail',
          message: 'Validation failed',
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            type: 'AppError',
            timestamp: expect.any(String),
          },
        },
      },
      {
        name: 'authentication errors',
        error: new AppError('Authentication required', ErrorType.AUTHENTICATION, 401),
        statusCode: 401,
        body: {
          status: 'Fail',
          message: 'Authentication required',
          data: null,
          error: {
            code: 'AUTHENTICATION_ERROR',
            type: 'AppError',
            timestamp: expect.any(String),
          },
        },
      },
      {
        name: 'payload too large errors',
        error: new AppError('Request entity too large', ErrorType.PAYLOAD_TOO_LARGE, 413),
        statusCode: 413,
        body: {
          status: 'Fail',
          message: 'Request entity too large',
          data: null,
          error: {
            code: 'PAYLOAD_TOO_LARGE_ERROR',
            type: 'AppError',
            timestamp: expect.any(String),
          },
        },
      },
      {
        name: 'rate limit errors',
        error: new AppError('Rate limit exceeded', ErrorType.RATE_LIMIT, 429),
        statusCode: 429,
        body: {
          status: 'Fail',
          message: 'Rate limit exceeded',
          data: null,
          error: {
            code: 'RATE_LIMIT_ERROR',
            type: 'AppError',
            timestamp: expect.any(String),
          },
        },
      },
      {
        name: 'internal errors',
        error: new Error('Unexpected error'),
        statusCode: 500,
        body: {
          status: 'Error',
          message: 'Internal server error',
          data: null,
          error: {
            code: 'INTERNAL_ERROR',
            type: 'Error',
            timestamp: expect.any(String),
          },
        },
      },
      {
        name: 'external API errors',
        error: new AppError('Upstream service failed', ErrorType.EXTERNAL_API, 502),
        statusCode: 502,
        body: {
          status: 'Error',
          message: 'Upstream service request failed',
          data: null,
          error: {
            code: 'EXTERNAL_API_ERROR',
            type: 'AppError',
            timestamp: expect.any(String),
          },
        },
      },
      {
        name: 'timeout errors',
        error: new AppError('Request timeout', ErrorType.TIMEOUT, 504),
        statusCode: 504,
        body: {
          status: 'Error',
          message: 'Request timeout',
          data: null,
          error: {
            code: 'TIMEOUT_ERROR',
            type: 'AppError',
            timestamp: expect.any(String),
          },
        },
      },
    ])('should return the expected structure for $name', async ({ error, statusCode, body }) => {
      await expectRouteErrorResponse(error, response => {
        expect(response.statusCode).toBe(statusCode)
        expect(response.body).toMatchObject(body)
      })
    })
  })

  describe('Error Message Mapping', () => {
    it.each([
      ['Invalid JSON payload', 400, 'VALIDATION_ERROR'],
      ['Validation error: field required', 400, 'VALIDATION_ERROR'],
      ['Authentication failed', 401, 'AUTHENTICATION_ERROR'],
      ['Error: No access rights', 401, 'AUTHENTICATION_ERROR'],
      ['Rate limit exceeded', 429, 'RATE_LIMIT_ERROR'],
      ['Upstream service error', 502, 'EXTERNAL_API_ERROR'],
      ['Request timeout', 504, 'TIMEOUT_ERROR'],
    ])('should map %j to %s / %s', async (message, statusCode, errorCode) => {
      await expectRouteErrorResponse(new Error(message), response => {
        expect(response.statusCode).toBe(statusCode)
        expect(response.body.error.code).toBe(errorCode)
      })
    })
  })

  describe('Error Details Handling', () => {
    it('should include details for 4xx errors', async () => {
      await expectRouteErrorResponse(
        new AppError('Validation failed', ErrorType.VALIDATION, 400, true, {
          field: 'email',
          reason: 'invalid format',
        }),
        response => {
          expect(response.statusCode).toBe(400)
          expect(response.body.error.details).toEqual({
            field: 'email',
            reason: 'invalid format',
          })
        },
      )
    })

    it('should not include details for 5xx errors', async () => {
      await expectRouteErrorResponse(
        new AppError('Internal error', ErrorType.INTERNAL, 500, true, {
          sensitive: 'data',
        }),
        response => {
          expect(response.statusCode).toBe(500)
          expect(response.body.error.details).toBeUndefined()
        },
      )
    })
  })

  describe('404 Not Found', () => {
    it('should return 404 for unmatched routes', async () => {
      const { adapter } = createAdapter()

      await adapter.listen(0)
      const server = adapter.getServer() as HttpServer

      try {
        const response = await makeRequest(server, 'GET', '/nonexistent')

        expect(response.statusCode).toBe(404)
        expect(response.body).toMatchObject({
          status: 'Fail',
          message: 'Not Found',
          data: null,
        })
      } finally {
        await adapter.close()
      }
    })
  })
})
