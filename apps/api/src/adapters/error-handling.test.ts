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

function createAdapter() {
  const router = new RouterImpl()
  const middleware = new MiddlewareChainImpl()
  const adapter = new HTTP2Adapter(router, middleware, {
    http2: false, // Use HTTP/1.1 for easier testing
  })
  return { adapter, router, middleware }
}

async function makeRequest(
  server: HttpServer,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ statusCode: number; body: any; headers: any }> {
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

describe('HTTP2Adapter Error Handling (Task 2.6)', () => {
  describe('Error Response Structure', () => {
    it('should return 400 for validation errors with correct structure', async () => {
      const { adapter, router } = createAdapter()

      router.post('/test', async (_req: TransportRequest, _res: TransportResponse) => {
        throw new AppError('Validation failed', ErrorType.VALIDATION, 400)
      })

      await adapter.listen(0)
      const server = adapter.getServer() as HttpServer

      try {
        const response = await makeRequest(server, 'POST', '/test', {})

        expect(response.statusCode).toBe(400)
        expect(response.body).toMatchObject({
          status: 'Fail',
          message: 'Validation failed',
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            type: 'AppError',
            timestamp: expect.any(String),
          },
        })
      } finally {
        await adapter.close()
      }
    })

    it('should return 401 for authentication errors with correct structure', async () => {
      const { adapter, router } = createAdapter()

      router.post('/test', async (_req: TransportRequest, _res: TransportResponse) => {
        throw new AppError('Authentication required', ErrorType.AUTHENTICATION, 401)
      })

      await adapter.listen(0)
      const server = adapter.getServer() as HttpServer

      try {
        const response = await makeRequest(server, 'POST', '/test', {})

        expect(response.statusCode).toBe(401)
        expect(response.body).toMatchObject({
          status: 'Fail',
          message: 'Authentication required',
          data: null,
          error: {
            code: 'AUTHENTICATION_ERROR',
            type: 'AppError',
            timestamp: expect.any(String),
          },
        })
      } finally {
        await adapter.close()
      }
    })

    it('should return 413 for payload too large errors', async () => {
      const { adapter, router } = createAdapter()

      router.post('/test', async (_req: TransportRequest, _res: TransportResponse) => {
        throw new AppError('Request entity too large', ErrorType.PAYLOAD_TOO_LARGE, 413)
      })

      await adapter.listen(0)
      const server = adapter.getServer() as HttpServer

      try {
        const response = await makeRequest(server, 'POST', '/test', {})

        expect(response.statusCode).toBe(413)
        expect(response.body).toMatchObject({
          status: 'Fail',
          message: 'Request entity too large',
          data: null,
          error: {
            code: 'PAYLOAD_TOO_LARGE_ERROR',
            type: 'AppError',
            timestamp: expect.any(String),
          },
        })
      } finally {
        await adapter.close()
      }
    })

    it('should return 429 for rate limit errors', async () => {
      const { adapter, router } = createAdapter()

      router.post('/test', async (_req: TransportRequest, _res: TransportResponse) => {
        throw new AppError('Rate limit exceeded', ErrorType.RATE_LIMIT, 429)
      })

      await adapter.listen(0)
      const server = adapter.getServer() as HttpServer

      try {
        const response = await makeRequest(server, 'POST', '/test', {})

        expect(response.statusCode).toBe(429)
        expect(response.body).toMatchObject({
          status: 'Fail',
          message: 'Rate limit exceeded',
          data: null,
          error: {
            code: 'RATE_LIMIT_ERROR',
            type: 'AppError',
            timestamp: expect.any(String),
          },
        })
      } finally {
        await adapter.close()
      }
    })

    it('should return 500 for internal errors', async () => {
      const { adapter, router } = createAdapter()

      router.post('/test', async (_req: TransportRequest, _res: TransportResponse) => {
        throw new Error('Unexpected error')
      })

      await adapter.listen(0)
      const server = adapter.getServer() as HttpServer

      try {
        const response = await makeRequest(server, 'POST', '/test', {})

        expect(response.statusCode).toBe(500)
        expect(response.body).toMatchObject({
          status: 'Error',
          message: 'Internal server error',
          data: null,
          error: {
            code: 'INTERNAL_ERROR',
            type: 'Error',
            timestamp: expect.any(String),
          },
        })
      } finally {
        await adapter.close()
      }
    })

    it('should return 502 for external API errors', async () => {
      const { adapter, router } = createAdapter()

      router.post('/test', async (_req: TransportRequest, _res: TransportResponse) => {
        throw new AppError('Upstream service failed', ErrorType.EXTERNAL_API, 502)
      })

      await adapter.listen(0)
      const server = adapter.getServer() as HttpServer

      try {
        const response = await makeRequest(server, 'POST', '/test', {})

        expect(response.statusCode).toBe(502)
        expect(response.body).toMatchObject({
          status: 'Error',
          message: 'Upstream service request failed',
          data: null,
          error: {
            code: 'EXTERNAL_API_ERROR',
            type: 'AppError',
            timestamp: expect.any(String),
          },
        })
      } finally {
        await adapter.close()
      }
    })

    it('should return 504 for timeout errors', async () => {
      const { adapter, router } = createAdapter()

      router.post('/test', async (_req: TransportRequest, _res: TransportResponse) => {
        throw new AppError('Request timeout', ErrorType.TIMEOUT, 504)
      })

      await adapter.listen(0)
      const server = adapter.getServer() as HttpServer

      try {
        const response = await makeRequest(server, 'POST', '/test', {})

        expect(response.statusCode).toBe(504)
        expect(response.body).toMatchObject({
          status: 'Error',
          message: 'Request timeout',
          data: null,
          error: {
            code: 'TIMEOUT_ERROR',
            type: 'AppError',
            timestamp: expect.any(String),
          },
        })
      } finally {
        await adapter.close()
      }
    })
  })

  describe('Error Message Mapping', () => {
    it('should map "invalid json" message to 400 validation error', async () => {
      const { adapter, router } = createAdapter()

      router.post('/test', async (_req: TransportRequest, _res: TransportResponse) => {
        throw new Error('Invalid JSON payload')
      })

      await adapter.listen(0)
      const server = adapter.getServer() as HttpServer

      try {
        const response = await makeRequest(server, 'POST', '/test', {})

        expect(response.statusCode).toBe(400)
        expect(response.body.error.code).toBe('VALIDATION_ERROR')
      } finally {
        await adapter.close()
      }
    })

    it('should map "validation" message to 400 validation error', async () => {
      const { adapter, router } = createAdapter()

      router.post('/test', async (_req: TransportRequest, _res: TransportResponse) => {
        throw new Error('Validation error: field required')
      })

      await adapter.listen(0)
      const server = adapter.getServer() as HttpServer

      try {
        const response = await makeRequest(server, 'POST', '/test', {})

        expect(response.statusCode).toBe(400)
        expect(response.body.error.code).toBe('VALIDATION_ERROR')
      } finally {
        await adapter.close()
      }
    })

    it('should map "authentication" message to 401 auth error', async () => {
      const { adapter, router } = createAdapter()

      router.post('/test', async (_req: TransportRequest, _res: TransportResponse) => {
        throw new Error('Authentication failed')
      })

      await adapter.listen(0)
      const server = adapter.getServer() as HttpServer

      try {
        const response = await makeRequest(server, 'POST', '/test', {})

        expect(response.statusCode).toBe(401)
        expect(response.body.error.code).toBe('AUTHENTICATION_ERROR')
      } finally {
        await adapter.close()
      }
    })

    it('should map "no access rights" message to 401 auth error', async () => {
      const { adapter, router } = createAdapter()

      router.post('/test', async (_req: TransportRequest, _res: TransportResponse) => {
        throw new Error('Error: No access rights')
      })

      await adapter.listen(0)
      const server = adapter.getServer() as HttpServer

      try {
        const response = await makeRequest(server, 'POST', '/test', {})

        expect(response.statusCode).toBe(401)
        expect(response.body.error.code).toBe('AUTHENTICATION_ERROR')
      } finally {
        await adapter.close()
      }
    })

    it('should map "rate limit" message to 429 rate limit error', async () => {
      const { adapter, router } = createAdapter()

      router.post('/test', async (_req: TransportRequest, _res: TransportResponse) => {
        throw new Error('Rate limit exceeded')
      })

      await adapter.listen(0)
      const server = adapter.getServer() as HttpServer

      try {
        const response = await makeRequest(server, 'POST', '/test', {})

        expect(response.statusCode).toBe(429)
        expect(response.body.error.code).toBe('RATE_LIMIT_ERROR')
      } finally {
        await adapter.close()
      }
    })

    it('should map "upstream" message to 502 external API error', async () => {
      const { adapter, router } = createAdapter()

      router.post('/test', async (_req: TransportRequest, _res: TransportResponse) => {
        throw new Error('Upstream service error')
      })

      await adapter.listen(0)
      const server = adapter.getServer() as HttpServer

      try {
        const response = await makeRequest(server, 'POST', '/test', {})

        expect(response.statusCode).toBe(502)
        expect(response.body.error.code).toBe('EXTERNAL_API_ERROR')
      } finally {
        await adapter.close()
      }
    })

    it('should map "timeout" message to 504 timeout error', async () => {
      const { adapter, router } = createAdapter()

      router.post('/test', async (_req: TransportRequest, _res: TransportResponse) => {
        throw new Error('Request timeout')
      })

      await adapter.listen(0)
      const server = adapter.getServer() as HttpServer

      try {
        const response = await makeRequest(server, 'POST', '/test', {})

        expect(response.statusCode).toBe(504)
        expect(response.body.error.code).toBe('TIMEOUT_ERROR')
      } finally {
        await adapter.close()
      }
    })
  })

  describe('Error Details Handling', () => {
    it('should include details for 4xx errors', async () => {
      const { adapter, router } = createAdapter()

      router.post('/test', async (_req: TransportRequest, _res: TransportResponse) => {
        throw new AppError('Validation failed', ErrorType.VALIDATION, 400, true, {
          field: 'email',
          reason: 'invalid format',
        })
      })

      await adapter.listen(0)
      const server = adapter.getServer() as HttpServer

      try {
        const response = await makeRequest(server, 'POST', '/test', {})

        expect(response.statusCode).toBe(400)
        expect(response.body.error.details).toEqual({
          field: 'email',
          reason: 'invalid format',
        })
      } finally {
        await adapter.close()
      }
    })

    it('should NOT include details for 5xx errors', async () => {
      const { adapter, router } = createAdapter()

      router.post('/test', async (_req: TransportRequest, _res: TransportResponse) => {
        throw new AppError('Internal error', ErrorType.INTERNAL, 500, true, {
          sensitive: 'data',
        })
      })

      await adapter.listen(0)
      const server = adapter.getServer() as HttpServer

      try {
        const response = await makeRequest(server, 'POST', '/test', {})

        expect(response.statusCode).toBe(500)
        expect(response.body.error.details).toBeUndefined()
      } finally {
        await adapter.close()
      }
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
