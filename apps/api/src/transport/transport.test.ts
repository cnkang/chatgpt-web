/**
 * Unit tests for Transport Layer interfaces
 * Tests TransportRequest, TransportResponse, and middleware chain execution
 * Requirements: 13.1
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildIpv4Address } from '../test/test-helpers.js'
import type {
  MiddlewareChain,
  MiddlewareHandler,
  NextFunction,
  Route,
  Router,
  SessionData,
  TransportRequest,
  TransportResponse,
} from './types.js'

describe('transport layer interfaces', () => {
  describe('TransportRequest', () => {
    let mockRequest: TransportRequest
    const testClientIp = buildIpv4Address(198, 51, 100, 20)

    beforeEach(() => {
      const url = new URL('http://localhost:3002/api/health?foo=bar&baz=qux')
      const headers = new Headers({
        'content-type': 'application/json',
        authorization: 'Bearer token123',
        'x-custom-header': 'custom-value',
      })

      mockRequest = {
        method: 'POST',
        path: '/api/health',
        url,
        headers,
        body: { message: 'test' },
        ip: testClientIp,
        session: {
          id: 'session-123',
          data: { userId: 'user-456' },
          expires: Date.now() + 3600000,
        },
        getHeader(name: string): string | undefined {
          return this.headers.get(name) || undefined
        },
        getQuery(name: string): string | undefined {
          return this.url.searchParams.get(name) || undefined
        },
      }
    })

    it('should extract HTTP method correctly', () => {
      expect(mockRequest.method).toBe('POST')
    })

    it('should extract request path correctly', () => {
      expect(mockRequest.path).toBe('/api/health')
    })

    it('should provide URL with query parameters', () => {
      expect(mockRequest.url).toBeInstanceOf(URL)
      expect(mockRequest.url.pathname).toBe('/api/health')
      expect(mockRequest.url.searchParams.get('foo')).toBe('bar')
      expect(mockRequest.url.searchParams.get('baz')).toBe('qux')
    })

    it('should provide headers with case-insensitive access', () => {
      expect(mockRequest.headers).toBeInstanceOf(Headers)
      expect(mockRequest.headers.get('content-type')).toBe('application/json')
      expect(mockRequest.headers.get('Content-Type')).toBe('application/json')
      expect(mockRequest.headers.get('CONTENT-TYPE')).toBe('application/json')
    })

    it('should extract parsed body correctly', () => {
      expect(mockRequest.body).toEqual({ message: 'test' })
    })

    it('should extract client IP address', () => {
      expect(mockRequest.ip).toBe(testClientIp)
    })

    it('should provide session data when available', () => {
      expect(mockRequest.session).toBeDefined()
      expect(mockRequest.session?.id).toBe('session-123')
      expect(mockRequest.session?.data).toEqual({ userId: 'user-456' })
      expect(mockRequest.session?.expires).toBeGreaterThan(Date.now())
    })

    it('should get header value using getHeader method', () => {
      expect(mockRequest.getHeader('authorization')).toBe('Bearer token123')
      expect(mockRequest.getHeader('Authorization')).toBe('Bearer token123')
      expect(mockRequest.getHeader('x-custom-header')).toBe('custom-value')
    })

    it('should return undefined for non-existent headers', () => {
      expect(mockRequest.getHeader('non-existent')).toBeUndefined()
    })

    it('should get query parameter using getQuery method', () => {
      expect(mockRequest.getQuery('foo')).toBe('bar')
      expect(mockRequest.getQuery('baz')).toBe('qux')
    })

    it('should return undefined for non-existent query parameters', () => {
      expect(mockRequest.getQuery('non-existent')).toBeUndefined()
    })

    it('should handle request without session', () => {
      const requestWithoutSession: TransportRequest = {
        ...mockRequest,
        session: undefined,
      }

      expect(requestWithoutSession.session).toBeUndefined()
    })
  })

  describe('TransportResponse', () => {
    let mockResponse: TransportResponse
    let statusCode: number
    let responseHeaders: Map<string, string | string[]>
    let responseBody: string | Buffer | null
    let writeChunks: (string | Buffer)[]
    let isHeadersSent: boolean
    let isFinished: boolean

    beforeEach(() => {
      statusCode = 200
      responseHeaders = new Map()
      responseBody = null
      writeChunks = []
      isHeadersSent = false
      isFinished = false

      mockResponse = {
        status(code: number) {
          statusCode = code
          return this
        },
        setHeader(name: string, value: string | string[]) {
          responseHeaders.set(name.toLowerCase(), value)
          return this
        },
        getHeader(name: string) {
          return responseHeaders.get(name.toLowerCase())
        },
        json(data: unknown) {
          isHeadersSent = true
          this.setHeader('content-type', 'application/json')
          responseBody = JSON.stringify(data)
          isFinished = true
        },
        send(data: string | Buffer) {
          isHeadersSent = true
          const contentType = typeof data === 'string' ? 'text/plain' : 'application/octet-stream'
          this.setHeader('content-type', contentType)
          responseBody = data
          isFinished = true
        },
        write(chunk: string | Buffer) {
          if (!isHeadersSent) {
            isHeadersSent = true
          }
          writeChunks.push(chunk)
          return true // Simulate no backpressure
        },
        end(chunk?: string | Buffer) {
          if (!isHeadersSent) {
            isHeadersSent = true
          }
          if (chunk !== undefined) {
            writeChunks.push(chunk)
          }
          isFinished = true
        },
        get headersSent() {
          return isHeadersSent
        },
        get finished() {
          return isFinished
        },
      }
    })

    it('should set HTTP status code', () => {
      mockResponse.status(404)
      expect(statusCode).toBe(404)
    })

    it('should support method chaining for status', () => {
      const result = mockResponse.status(201)
      expect(result).toBe(mockResponse)
    })

    it('should set response headers', () => {
      mockResponse.setHeader('content-type', 'application/json')
      mockResponse.setHeader('x-custom-header', 'custom-value')

      expect(responseHeaders.get('content-type')).toBe('application/json')
      expect(responseHeaders.get('x-custom-header')).toBe('custom-value')
    })

    it('should support method chaining for setHeader', () => {
      const result = mockResponse.setHeader('content-type', 'text/plain')
      expect(result).toBe(mockResponse)
    })

    it('should set array header values', () => {
      mockResponse.setHeader('set-cookie', ['cookie1=value1', 'cookie2=value2'])
      expect(responseHeaders.get('set-cookie')).toEqual(['cookie1=value1', 'cookie2=value2'])
    })

    it('should get response header value', () => {
      mockResponse.setHeader('content-type', 'application/json')
      expect(mockResponse.getHeader('content-type')).toBe('application/json')
    })

    it('should return undefined for non-existent headers', () => {
      expect(mockResponse.getHeader('non-existent')).toBeUndefined()
    })

    it('should send JSON response', () => {
      const data = { status: 'Success', message: 'OK', data: { id: 123 } }
      mockResponse.status(200).json(data)

      expect(statusCode).toBe(200)
      expect(responseHeaders.get('content-type')).toBe('application/json')
      expect(responseBody).toBe(JSON.stringify(data))
      expect(isHeadersSent).toBe(true)
      expect(isFinished).toBe(true)
    })

    it('should send text response', () => {
      mockResponse.status(200).send('Hello, World!')

      expect(statusCode).toBe(200)
      expect(responseHeaders.get('content-type')).toBe('text/plain')
      expect(responseBody).toBe('Hello, World!')
      expect(isHeadersSent).toBe(true)
      expect(isFinished).toBe(true)
    })

    it('should send buffer response', () => {
      const buffer = Buffer.from('binary data')
      mockResponse.status(200).send(buffer)

      expect(statusCode).toBe(200)
      expect(responseHeaders.get('content-type')).toBe('application/octet-stream')
      expect(responseBody).toBe(buffer)
      expect(isHeadersSent).toBe(true)
      expect(isFinished).toBe(true)
    })

    it('should write streaming chunks', () => {
      const chunk1 = 'chunk1'
      const chunk2 = Buffer.from('chunk2')

      const result1 = mockResponse.write(chunk1)
      const result2 = mockResponse.write(chunk2)

      expect(result1).toBe(true)
      expect(result2).toBe(true)
      expect(writeChunks).toEqual([chunk1, chunk2])
      expect(isHeadersSent).toBe(true)
      expect(isFinished).toBe(false)
    })

    it('should end streaming response without final chunk', () => {
      mockResponse.write('chunk1')
      mockResponse.end()

      expect(writeChunks).toEqual(['chunk1'])
      expect(isFinished).toBe(true)
    })

    it('should end streaming response with final chunk', () => {
      mockResponse.write('chunk1')
      mockResponse.end('final chunk')

      expect(writeChunks).toEqual(['chunk1', 'final chunk'])
      expect(isFinished).toBe(true)
    })

    it('should track headersSent state', () => {
      expect(mockResponse.headersSent).toBe(false)

      mockResponse.write('chunk')
      expect(mockResponse.headersSent).toBe(true)
    })

    it('should track finished state', () => {
      expect(mockResponse.finished).toBe(false)

      mockResponse.json({ message: 'done' })
      expect(mockResponse.finished).toBe(true)
    })
  })

  describe('middleware chain execution', () => {
    let mockRequest: TransportRequest
    let mockResponse: TransportResponse
    let executionOrder: string[]

    // Helper to create a mock middleware chain
    const createMockChain = (handlers: MiddlewareHandler[]): MiddlewareChain => {
      return {
        use(handler: MiddlewareHandler) {
          handlers.push(handler)
          return this
        },
        async execute(req: TransportRequest, res: TransportResponse) {
          return new Promise<void>((resolve, reject) => {
            let index = 0
            let completed = false
            const next: NextFunction = (error?: Error) => {
              if (completed) return
              if (error) {
                completed = true
                reject(error)
                return
              }
              if (index < handlers.length) {
                const handler = handlers[index++]
                try {
                  const result = handler(req, res, next)
                  if (result instanceof Promise) {
                    result
                      .then(() => {
                        // If middleware completes without calling next, resolve after a delay
                        if (!completed && index > 0) {
                          setTimeout(() => {
                            if (!completed) {
                              completed = true
                              resolve()
                            }
                          }, 10)
                        }
                      })
                      .catch(reject)
                  }
                } catch (err) {
                  completed = true
                  reject(err)
                }
              } else {
                completed = true
                resolve()
              }
            }
            next()
          })
        },
      }
    }

    beforeEach(() => {
      executionOrder = []

      mockRequest = {
        method: 'GET',
        path: '/test',
        url: new URL('http://localhost:3002/test'),
        headers: new Headers(),
        body: null,
        ip: '127.0.0.1',
        getHeader: () => undefined,
        getQuery: () => undefined,
      }

      mockResponse = {
        status: vi.fn().mockReturnThis(),
        setHeader: vi.fn().mockReturnThis(),
        getHeader: vi.fn(),
        json: vi.fn(),
        send: vi.fn(),
        write: vi.fn().mockReturnValue(true),
        end: vi.fn(),
        headersSent: false,
        finished: false,
      }
    })

    it('should execute middleware in correct order', async () => {
      const middleware1: MiddlewareHandler = async (_req, _res, next) => {
        executionOrder.push('middleware1')
        next()
      }

      const middleware2: MiddlewareHandler = async (_req, _res, next) => {
        executionOrder.push('middleware2')
        next()
      }

      const middleware3: MiddlewareHandler = async (_req, _res, next) => {
        executionOrder.push('middleware3')
        next()
      }

      const chain = createMockChain([middleware1, middleware2, middleware3])

      await chain.execute(mockRequest, mockResponse)

      expect(executionOrder).toEqual(['middleware1', 'middleware2', 'middleware3'])
    })

    it('should stop execution when middleware does not call next', async () => {
      const middleware1: MiddlewareHandler = async (_req, _res, next) => {
        executionOrder.push('middleware1')
        next()
      }

      const middleware2: MiddlewareHandler = async (_req, res, _next) => {
        executionOrder.push('middleware2')
        // Don't call next - send response instead
        res.json({ message: 'stopped' })
        // In real implementation, middleware that sends response should still resolve
        // For this test, we'll manually resolve after a short delay
      }

      const middleware3: MiddlewareHandler = async (_req, _res, next) => {
        executionOrder.push('middleware3')
        next()
      }

      const chain = createMockChain([middleware1, middleware2, middleware3])

      await chain.execute(mockRequest, mockResponse)

      expect(executionOrder).toEqual(['middleware1', 'middleware2'])
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'stopped' })
    })

    it('should propagate errors through middleware chain', async () => {
      const testError = new Error('Test error')

      const middleware1: MiddlewareHandler = async (_req, _res, next) => {
        executionOrder.push('middleware1')
        next()
      }

      const middleware2: MiddlewareHandler = async (_req, _res, next) => {
        executionOrder.push('middleware2')
        next(testError)
      }

      const middleware3: MiddlewareHandler = async (_req, _res, next) => {
        executionOrder.push('middleware3')
        next()
      }

      const chain = createMockChain([middleware1, middleware2, middleware3])

      await expect(chain.execute(mockRequest, mockResponse)).rejects.toThrow('Test error')
      expect(executionOrder).toEqual(['middleware1', 'middleware2'])
    })

    it('should handle async middleware correctly', async () => {
      const middleware1: MiddlewareHandler = async (_req, _res, next) => {
        await new Promise(resolve => setTimeout(resolve, 10))
        executionOrder.push('async-middleware1')
        next()
      }

      const middleware2: MiddlewareHandler = async (_req, _res, next) => {
        await new Promise(resolve => setTimeout(resolve, 5))
        executionOrder.push('async-middleware2')
        next()
      }

      const chain = createMockChain([middleware1, middleware2])

      await chain.execute(mockRequest, mockResponse)

      expect(executionOrder).toEqual(['async-middleware1', 'async-middleware2'])
    })

    it('should allow middleware to modify request', async () => {
      const middleware: MiddlewareHandler = async (req, _res, next) => {
        // Middleware can add properties to request
        ;(req as { customProp?: string }).customProp = 'modified'
        next()
      }

      const chain = createMockChain([middleware])

      await chain.execute(mockRequest, mockResponse)

      expect((mockRequest as { customProp?: string }).customProp).toBe('modified')
    })

    it('should allow middleware to set response headers', async () => {
      const middleware: MiddlewareHandler = async (_req, res, next) => {
        res.setHeader('x-custom-header', 'custom-value')
        next()
      }

      const chain = createMockChain([middleware])

      await chain.execute(mockRequest, mockResponse)

      expect(mockResponse.setHeader).toHaveBeenCalledWith('x-custom-header', 'custom-value')
    })
  })

  describe('Router interface', () => {
    let mockRouter: Router

    beforeEach(() => {
      const routes: Route[] = []

      mockRouter = {
        addRoute(route: Route) {
          routes.push(route)
          return this
        },
        get(path: string, ...handlers: (MiddlewareHandler | any)[]) {
          const middleware = handlers.slice(0, -1) as MiddlewareHandler[]
          const handler = handlers[handlers.length - 1]
          routes.push({ method: 'GET', path, middleware, handler })
          return this
        },
        post(path: string, ...handlers: (MiddlewareHandler | any)[]) {
          const middleware = handlers.slice(0, -1) as MiddlewareHandler[]
          const handler = handlers[handlers.length - 1]
          routes.push({ method: 'POST', path, middleware, handler })
          return this
        },
        put(path: string, ...handlers: (MiddlewareHandler | any)[]) {
          const middleware = handlers.slice(0, -1) as MiddlewareHandler[]
          const handler = handlers[handlers.length - 1]
          routes.push({ method: 'PUT', path, middleware, handler })
          return this
        },
        delete(path: string, ...handlers: (MiddlewareHandler | any)[]) {
          const middleware = handlers.slice(0, -1) as MiddlewareHandler[]
          const handler = handlers[handlers.length - 1]
          routes.push({ method: 'DELETE', path, middleware, handler })
          return this
        },
        match(method: string, path: string) {
          return routes.find(r => r.method === method && r.path === path) || null
        },
      }
    })

    it('should register routes with addRoute', () => {
      const handler = vi.fn()
      const route: Route = {
        method: 'GET',
        path: '/test',
        middleware: [],
        handler,
      }

      mockRouter.addRoute(route)

      const matched = mockRouter.match('GET', '/test')
      expect(matched).toBeDefined()
      expect(matched?.handler).toBe(handler)
    })

    it('should register GET routes', () => {
      const handler = vi.fn()
      mockRouter.get('/api/health', handler)

      const matched = mockRouter.match('GET', '/api/health')
      expect(matched).toBeDefined()
      expect(matched?.method).toBe('GET')
      expect(matched?.path).toBe('/api/health')
      expect(matched?.handler).toBe(handler)
    })

    it('should register POST routes', () => {
      const handler = vi.fn()
      mockRouter.post('/api/chat', handler)

      const matched = mockRouter.match('POST', '/api/chat')
      expect(matched).toBeDefined()
      expect(matched?.method).toBe('POST')
    })

    it('should register PUT routes', () => {
      const handler = vi.fn()
      mockRouter.put('/api/update', handler)

      const matched = mockRouter.match('PUT', '/api/update')
      expect(matched).toBeDefined()
      expect(matched?.method).toBe('PUT')
    })

    it('should register DELETE routes', () => {
      const handler = vi.fn()
      mockRouter.delete('/api/delete', handler)

      const matched = mockRouter.match('DELETE', '/api/delete')
      expect(matched).toBeDefined()
      expect(matched?.method).toBe('DELETE')
    })

    it('should register routes with middleware', () => {
      const middleware1 = vi.fn()
      const middleware2 = vi.fn()
      const handler = vi.fn()

      mockRouter.get('/api/protected', middleware1, middleware2, handler)

      const matched = mockRouter.match('GET', '/api/protected')
      expect(matched).toBeDefined()
      expect(matched?.middleware).toHaveLength(2)
      expect(matched?.middleware[0]).toBe(middleware1)
      expect(matched?.middleware[1]).toBe(middleware2)
      expect(matched?.handler).toBe(handler)
    })

    it('should return null for non-matching routes', () => {
      mockRouter.get('/api/health', vi.fn())

      const matched = mockRouter.match('GET', '/api/nonexistent')
      expect(matched).toBeNull()
    })

    it('should distinguish between different HTTP methods', () => {
      const getHandler = vi.fn()
      const postHandler = vi.fn()

      mockRouter.get('/api/resource', getHandler)
      mockRouter.post('/api/resource', postHandler)

      const getMatch = mockRouter.match('GET', '/api/resource')
      const postMatch = mockRouter.match('POST', '/api/resource')

      expect(getMatch?.handler).toBe(getHandler)
      expect(postMatch?.handler).toBe(postHandler)
    })

    it('should support method chaining', () => {
      const result = mockRouter
        .get('/api/health', vi.fn())
        .post('/api/chat', vi.fn())
        .put('/api/update', vi.fn())

      expect(result).toBe(mockRouter)
    })
  })

  describe('SessionData interface', () => {
    it('should store session with id, data, and expiration', () => {
      const session: SessionData = {
        id: 'session-abc123',
        data: {
          userId: 'user-456',
          username: 'testuser',
          preferences: { theme: 'dark' },
        },
        expires: Date.now() + 3600000, // 1 hour from now
      }

      expect(session.id).toBe('session-abc123')
      expect(session.data.userId).toBe('user-456')
      expect(session.data.username).toBe('testuser')
      expect(session.expires).toBeGreaterThan(Date.now())
    })

    it('should allow empty session data', () => {
      const session: SessionData = {
        id: 'session-xyz789',
        data: {},
        expires: Date.now() + 3600000,
      }

      expect(session.data).toEqual({})
    })

    it('should support nested data structures', () => {
      const session: SessionData = {
        id: 'session-nested',
        data: {
          user: {
            id: '123',
            profile: {
              name: 'Test User',
              email: 'test@example.com',
            },
          },
          settings: {
            notifications: true,
            language: 'en',
          },
        },
        expires: Date.now() + 3600000,
      }

      expect(session.data.user).toBeDefined()
      expect((session.data.user as { profile: { name: string } }).profile.name).toBe('Test User')
    })
  })
})
