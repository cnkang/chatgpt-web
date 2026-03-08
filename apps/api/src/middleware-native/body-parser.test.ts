/**
 * Body Parser Middleware Tests
 */

import type { IncomingMessage } from 'node:http'
import { describe, expect, it } from 'vitest'
import type { TransportRequest, TransportResponse } from '../transport/types.js'
import { AppError } from '../utils/error-handler.js'
import { createBodyParserMiddleware, createBodyParserWithLimit } from './body-parser.js'

/**
 * Create mock TransportRequest with native request
 */
function createMockRequest(method: string, contentType: string, body: string): TransportRequest {
  // Create mock native request with readable stream
  const chunks = [Buffer.from(body)]
  const mockNativeReq = {
    headers: {
      'content-type': contentType,
    },
    [Symbol.asyncIterator]: async function* () {
      for (const chunk of chunks) {
        yield chunk
      }
    },
  } as unknown as IncomingMessage

  return {
    method,
    path: '/test',
    url: new URL('http://localhost/test'),
    headers: new Headers({ 'content-type': contentType }),
    body: null,
    ip: '127.0.0.1',
    _nativeRequest: mockNativeReq,
    getHeader: (name: string) => (name === 'content-type' ? contentType : undefined),
    getQuery: () => undefined,
  } as any
}

/**
 * Create mock TransportResponse
 */
function createMockResponse(): TransportResponse {
  return {
    status: () => ({}) as any,
    setHeader: () => ({}) as any,
    getHeader: () => undefined,
    json: () => {},
    send: () => {},
    write: () => true,
    end: () => {},
    headersSent: false,
    finished: false,
  }
}

describe('Body Parser Middleware', () => {
  describe('createBodyParserMiddleware', () => {
    it('should parse JSON body', async () => {
      const jsonData = { message: 'Hello, World!', count: 42 }
      const req = createMockRequest('POST', 'application/json', JSON.stringify(jsonData))
      const res = createMockResponse()

      const middleware = createBodyParserMiddleware()

      await new Promise<void>((resolve, reject) => {
        middleware(req, res, (error?: Error) => {
          if (error) reject(error)
          else resolve()
        })
      })

      expect(req.body).toEqual(jsonData)
    })

    it('should parse JSON body with charset', async () => {
      const jsonData = { text: 'Hello 世界' }
      const req = createMockRequest(
        'POST',
        'application/json; charset=utf-8',
        JSON.stringify(jsonData),
      )
      const res = createMockResponse()

      const middleware = createBodyParserMiddleware()

      await new Promise<void>((resolve, reject) => {
        middleware(req, res, (error?: Error) => {
          if (error) reject(error)
          else resolve()
        })
      })

      expect(req.body).toEqual(jsonData)
    })

    it('should parse URL-encoded body', async () => {
      const formData = 'key=value&foo=bar&number=123'
      const req = createMockRequest('POST', 'application/x-www-form-urlencoded', formData)
      const res = createMockResponse()

      const middleware = createBodyParserMiddleware()

      await new Promise<void>((resolve, reject) => {
        middleware(req, res, (error?: Error) => {
          if (error) reject(error)
          else resolve()
        })
      })

      expect(req.body).toEqual({
        key: 'value',
        foo: 'bar',
        number: '123',
      })
    })

    it('should parse empty URL-encoded body', async () => {
      const req = createMockRequest('POST', 'application/x-www-form-urlencoded', '')
      const res = createMockResponse()

      const middleware = createBodyParserMiddleware()

      await new Promise<void>((resolve, reject) => {
        middleware(req, res, (error?: Error) => {
          if (error) reject(error)
          else resolve()
        })
      })

      expect(req.body).toEqual({})
    })

    it('should return raw body for other content types', async () => {
      const textData = 'Plain text content'
      const req = createMockRequest('POST', 'text/plain', textData)
      const res = createMockResponse()

      const middleware = createBodyParserMiddleware()

      await new Promise<void>((resolve, reject) => {
        middleware(req, res, (error?: Error) => {
          if (error) reject(error)
          else resolve()
        })
      })

      expect(req.body).toBe(textData)
    })

    it('should skip body parsing for GET requests', async () => {
      const req = createMockRequest('GET', 'application/json', '')
      const res = createMockResponse()

      const middleware = createBodyParserMiddleware()

      await new Promise<void>((resolve, reject) => {
        middleware(req, res, (error?: Error) => {
          if (error) reject(error)
          else resolve()
        })
      })

      expect(req.body).toBeNull()
    })

    it('should skip body parsing for HEAD requests', async () => {
      const req = createMockRequest('HEAD', 'application/json', '')
      const res = createMockResponse()

      const middleware = createBodyParserMiddleware()

      await new Promise<void>((resolve, reject) => {
        middleware(req, res, (error?: Error) => {
          if (error) reject(error)
          else resolve()
        })
      })

      expect(req.body).toBeNull()
    })

    it('should skip body parsing for DELETE requests', async () => {
      const req = createMockRequest('DELETE', 'application/json', '')
      const res = createMockResponse()

      const middleware = createBodyParserMiddleware()

      await new Promise<void>((resolve, reject) => {
        middleware(req, res, (error?: Error) => {
          if (error) reject(error)
          else resolve()
        })
      })

      expect(req.body).toBeNull()
    })

    it('should reject invalid JSON with 400 error', async () => {
      const invalidJson = '{ invalid json }'
      const req = createMockRequest('POST', 'application/json', invalidJson)
      const res = createMockResponse()

      const middleware = createBodyParserMiddleware()

      await expect(
        new Promise<void>((resolve, reject) => {
          middleware(req, res, (error?: Error) => {
            if (error) reject(error)
            else resolve()
          })
        }),
      ).rejects.toThrow('Invalid JSON payload')
    })

    it('should reject JSON body exceeding size limit', async () => {
      const largeData = { data: 'x'.repeat(2_000_000) } // ~2MB
      const req = createMockRequest('POST', 'application/json', JSON.stringify(largeData))
      const res = createMockResponse()

      const middleware = createBodyParserMiddleware({
        jsonLimit: 1048576, // 1MB
      })

      await expect(
        new Promise<void>((resolve, reject) => {
          middleware(req, res, (error?: Error) => {
            if (error) reject(error)
            else resolve()
          })
        }),
      ).rejects.toThrow('Request entity too large')
    })

    it('should reject URL-encoded body exceeding size limit', async () => {
      const largeData = `data=${'x'.repeat(50_000)}` // ~50KB
      const req = createMockRequest('POST', 'application/x-www-form-urlencoded', largeData)
      const res = createMockResponse()

      const middleware = createBodyParserMiddleware({
        urlencodedLimit: 32768, // 32KB
      })

      await expect(
        new Promise<void>((resolve, reject) => {
          middleware(req, res, (error?: Error) => {
            if (error) reject(error)
            else resolve()
          })
        }),
      ).rejects.toThrow('Request entity too large')
    })

    it('should use default limits when not specified', async () => {
      const jsonData = { message: 'test' }
      const req = createMockRequest('POST', 'application/json', JSON.stringify(jsonData))
      const res = createMockResponse()

      const middleware = createBodyParserMiddleware()

      await new Promise<void>((resolve, reject) => {
        middleware(req, res, (error?: Error) => {
          if (error) reject(error)
          else resolve()
        })
      })

      expect(req.body).toEqual(jsonData)
    })

    it('should handle empty JSON body', async () => {
      const req = createMockRequest('POST', 'application/json', '')
      const res = createMockResponse()

      const middleware = createBodyParserMiddleware()

      await expect(
        new Promise<void>((resolve, reject) => {
          middleware(req, res, (error?: Error) => {
            if (error) reject(error)
            else resolve()
          })
        }),
      ).rejects.toThrow('Invalid JSON payload')
    })

    it('should handle request without native request object', async () => {
      const req = {
        method: 'POST',
        path: '/test',
        url: new URL('http://localhost/test'),
        headers: new Headers({ 'content-type': 'application/json' }),
        body: null,
        ip: '127.0.0.1',
        getHeader: (name: string) => (name === 'content-type' ? 'application/json' : undefined),
        getQuery: () => undefined,
      } as TransportRequest

      const res = createMockResponse()
      const middleware = createBodyParserMiddleware()

      await new Promise<void>((resolve, reject) => {
        middleware(req, res, (error?: Error) => {
          if (error) reject(error)
          else resolve()
        })
      })

      // Should skip parsing and leave body as null
      expect(req.body).toBeNull()
    })
  })

  describe('createBodyParserWithLimit', () => {
    it('should create middleware with specific size limit', async () => {
      const jsonData = { token: 'abc123' }
      const req = createMockRequest('POST', 'application/json', JSON.stringify(jsonData))
      const res = createMockResponse()

      const middleware = createBodyParserWithLimit(1024) // 1KB limit

      await new Promise<void>((resolve, reject) => {
        middleware(req, res, (error?: Error) => {
          if (error) reject(error)
          else resolve()
        })
      })

      expect(req.body).toEqual(jsonData)
    })

    it('should enforce size limit for all content types', async () => {
      const largeData = { data: 'x'.repeat(2000) } // ~2KB
      const req = createMockRequest('POST', 'application/json', JSON.stringify(largeData))
      const res = createMockResponse()

      const middleware = createBodyParserWithLimit(1024) // 1KB limit

      await expect(
        new Promise<void>((resolve, reject) => {
          middleware(req, res, (error?: Error) => {
            if (error) reject(error)
            else resolve()
          })
        }),
      ).rejects.toThrow('Request entity too large')
    })
  })

  describe('Error handling', () => {
    it('should pass AppError to next function', async () => {
      const invalidJson = '{ invalid }'
      const req = createMockRequest('POST', 'application/json', invalidJson)
      const res = createMockResponse()

      const middleware = createBodyParserMiddleware()

      let capturedError: Error | undefined

      await new Promise<void>(resolve => {
        middleware(req, res, (error?: Error) => {
          capturedError = error
          resolve()
        })
      })

      expect(capturedError).toBeInstanceOf(AppError)
      expect((capturedError as AppError).statusCode).toBe(400)
    })

    it('should pass size limit error to next function', async () => {
      const largeData = { data: 'x'.repeat(2_000_000) }
      const req = createMockRequest('POST', 'application/json', JSON.stringify(largeData))
      const res = createMockResponse()

      const middleware = createBodyParserMiddleware({ jsonLimit: 1048576 })

      let capturedError: Error | undefined

      await new Promise<void>(resolve => {
        middleware(req, res, (error?: Error) => {
          capturedError = error
          resolve()
        })
      })

      expect(capturedError).toBeInstanceOf(AppError)
      expect((capturedError as AppError).statusCode).toBe(413)
    })
  })
})
