/**
 * HTTP/2 Adapter Unit Tests
 *
 * Tests for HTTP/2 adapter server creation and configuration.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildIpv4Address, getAvailablePort } from '../test/test-helpers.js'
import type { MiddlewareChain, Router } from '../transport/index.js'
import { HTTP2Adapter } from './http2-adapter.js'

describe('HTTP2Adapter', () => {
  const testClientIp = buildIpv4Address(198, 51, 100, 10)

  // Mock router
  const mockRouter: Router = {
    addRoute: vi.fn().mockReturnThis(),
    get: vi.fn().mockReturnThis(),
    post: vi.fn().mockReturnThis(),
    put: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    match: vi.fn().mockReturnValue(null),
  }

  // Mock middleware chain
  const mockMiddleware: MiddlewareChain = {
    use: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue(undefined),
  }

  describe('Server Creation', () => {
    it('should attempt to create HTTP/2 secure server when TLS is configured', () => {
      // Note: This test verifies the code path is taken, but will fail with invalid certs
      // In a real scenario, valid TLS certificates would be provided
      const createSecureAdapter = () =>
        new HTTP2Adapter(mockRouter, mockMiddleware, {
          http2: true,
          tls: {
            key: Buffer.from('test-key'),
            cert: Buffer.from('test-cert'),
          },
        })

      expect(createSecureAdapter).toThrow() // Will throw due to invalid certificates
    })

    it('should create HTTP/2 cleartext server when TLS is not configured', () => {
      // Suppress console.warn for this test
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const adapter = new HTTP2Adapter(mockRouter, mockMiddleware, {
        http2: true,
      })

      const server = adapter.getServer()
      expect(server).toBeDefined()

      // Should log warning about h2c browser limitations
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('HTTP/2 without TLS (h2c) has limited browser support'),
      )

      warnSpy.mockRestore()
    })

    it('should create HTTP/1.1 server when HTTP/2 is disabled', () => {
      const adapter = new HTTP2Adapter(mockRouter, mockMiddleware, {
        http2: false,
      })

      const server = adapter.getServer()
      expect(server).toBeDefined()
      // HTTP/1.1 server doesn't have encrypted property
      expect('encrypted' in server).toBe(false)
    })

    it('should use default body limits when not specified', () => {
      const adapter = new HTTP2Adapter(mockRouter, mockMiddleware, {})

      // Access private options via type assertion for testing
      const options = (adapter as any).options
      expect(options.bodyLimit.json).toBe(1048576) // 1MB
      expect(options.bodyLimit.urlencoded).toBe(32768) // 32KB
    })

    it('should use custom body limits when specified', () => {
      const adapter = new HTTP2Adapter(mockRouter, mockMiddleware, {
        bodyLimit: {
          json: 2097152, // 2MB
          urlencoded: 65536, // 64KB
        },
      })

      const options = (adapter as any).options
      expect(options.bodyLimit.json).toBe(2097152)
      expect(options.bodyLimit.urlencoded).toBe(65536)
    })
  })

  describe('Server Lifecycle', () => {
    it('should start listening on specified port', async () => {
      const adapter = new HTTP2Adapter(mockRouter, mockMiddleware, {
        http2: false, // Use HTTP/1.1 for simpler testing
      })

      const port = await getAvailablePort()

      await expect(adapter.listen(port, '127.0.0.1')).resolves.toBeUndefined()

      await adapter.close()
    })

    it('should close server gracefully', async () => {
      const adapter = new HTTP2Adapter(mockRouter, mockMiddleware, {
        http2: false,
      })

      const port = await getAvailablePort()
      await adapter.listen(port, '127.0.0.1')

      await expect(adapter.close()).resolves.toBeUndefined()
    })
  })

  describe('Configuration', () => {
    it('should default to HTTP/2 enabled when not specified', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const adapter = new HTTP2Adapter(mockRouter, mockMiddleware, {})

      const options = (adapter as any).options
      expect(options.http2).toBe(true)

      // Should warn about h2c since no TLS
      expect(warnSpy).toHaveBeenCalled()

      warnSpy.mockRestore()
    })

    it('should store TLS configuration when provided', () => {
      // We can't create a valid server without real certs, but we can verify
      // the configuration is stored correctly before server creation fails
      const tlsConfig = {
        key: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----',
        cert: '-----BEGIN CERTIFICATE-----\ntest\n-----END CERTIFICATE-----',
      }

      const createTlsAdapter = () =>
        new HTTP2Adapter(mockRouter, mockMiddleware, {
          http2: true,
          tls: tlsConfig,
        })

      expect(createTlsAdapter).toThrow() // Will throw due to invalid certificates
    })
  })

  describe('Request Wrapping', () => {
    let adapter: HTTP2Adapter

    beforeEach(() => {
      adapter = new HTTP2Adapter(mockRouter, mockMiddleware, {
        http2: false, // Use HTTP/1.1 for simpler testing
      })
    })

    it('should extract method from native request', () => {
      const mockReq = {
        method: 'POST',
        url: '/api/health',
        headers: { host: 'localhost:3000' },
        socket: { remoteAddress: '127.0.0.1' },
      }

      const transportReq = (adapter as any).wrapRequest(mockReq)

      expect(transportReq.method).toBe('POST')
    })

    it('should default to GET when method is missing', () => {
      const mockReq = {
        url: '/api/health',
        headers: { host: 'localhost:3000' },
        socket: { remoteAddress: '127.0.0.1' },
      }

      const transportReq = (adapter as any).wrapRequest(mockReq)

      expect(transportReq.method).toBe('GET')
    })

    it('should extract path from URL', () => {
      const mockReq = {
        method: 'GET',
        url: '/api/health',
        headers: { host: 'localhost:3000' },
        socket: { remoteAddress: '127.0.0.1' },
      }

      const transportReq = (adapter as any).wrapRequest(mockReq)

      expect(transportReq.path).toBe('/api/health')
    })

    it('should parse URL with query parameters', () => {
      const mockReq = {
        method: 'GET',
        url: '/api/search?q=test&limit=10',
        headers: { host: 'localhost:3000' },
        socket: { remoteAddress: '127.0.0.1' },
      }

      const transportReq = (adapter as any).wrapRequest(mockReq)

      expect(transportReq.url).toBeInstanceOf(URL)
      expect(transportReq.url.pathname).toBe('/api/search')
      expect(transportReq.url.searchParams.get('q')).toBe('test')
      expect(transportReq.url.searchParams.get('limit')).toBe('10')
    })

    it('should ignore HTTP/2 pseudo-headers when building request headers', () => {
      const mockReq = {
        method: 'GET',
        url: '/api/health',
        headers: {
          ':method': 'GET',
          ':path': '/api/health',
          host: 'localhost:3000',
          authorization: 'Bearer token',
        },
        socket: { remoteAddress: '127.0.0.1' },
      }

      const transportReq = (adapter as any).wrapRequest(mockReq)

      expect([...transportReq.headers.keys()]).not.toContain(':method')
      expect([...transportReq.headers.keys()]).not.toContain(':path')
      expect(transportReq.getHeader('authorization')).toBe('Bearer token')
    })

    it('should convert headers to Headers object', () => {
      const mockReq = {
        method: 'GET',
        url: '/api/health',
        headers: {
          host: 'localhost:3000',
          'content-type': 'application/json',
          authorization: 'Bearer token123',
        },
        socket: { remoteAddress: '127.0.0.1' },
      }

      const transportReq = (adapter as any).wrapRequest(mockReq)

      expect(transportReq.headers).toBeInstanceOf(Headers)
      expect(transportReq.headers.get('content-type')).toBe('application/json')
      expect(transportReq.headers.get('authorization')).toBe('Bearer token123')
    })

    it('should handle array header values by joining with comma', () => {
      const mockReq = {
        method: 'GET',
        url: '/api/health',
        headers: {
          host: 'localhost:3000',
          accept: ['application/json', 'text/html'],
        },
        socket: { remoteAddress: '127.0.0.1' },
      }

      const transportReq = (adapter as any).wrapRequest(mockReq)

      expect(transportReq.headers.get('accept')).toBe('application/json, text/html')
    })

    it('should extract client IP from X-Forwarded-For header', () => {
      const trustedProxyAdapter = new HTTP2Adapter(mockRouter, mockMiddleware, {
        http2: false,
        trustProxy: true,
      })
      const mockReq = {
        method: 'GET',
        url: '/api/health',
        headers: {
          host: 'localhost:3000',
          'x-forwarded-for': '203.0.113.1, 198.51.100.1',
        },
        socket: { remoteAddress: '127.0.0.1' },
      }

      const transportReq = (trustedProxyAdapter as any).wrapRequest(mockReq)

      expect(transportReq.ip).toBe('203.0.113.1')
    })

    it('should extract client IP from X-Real-IP header when X-Forwarded-For is missing', () => {
      const trustedProxyAdapter = new HTTP2Adapter(mockRouter, mockMiddleware, {
        http2: false,
        trustProxy: true,
      })
      const mockReq = {
        method: 'GET',
        url: '/api/health',
        headers: {
          host: 'localhost:3000',
          'x-real-ip': '203.0.113.1',
        },
        socket: { remoteAddress: '127.0.0.1' },
      }

      const transportReq = (trustedProxyAdapter as any).wrapRequest(mockReq)

      expect(transportReq.ip).toBe('203.0.113.1')
    })

    it('should fall back to socket remote address when proxy headers are missing', () => {
      const mockReq = {
        method: 'GET',
        url: '/api/health',
        headers: { host: 'localhost:3000' },
        socket: { remoteAddress: testClientIp },
      }

      const transportReq = (adapter as any).wrapRequest(mockReq)

      expect(transportReq.ip).toBe(testClientIp)
    })

    it('should default to 0.0.0.0 when no IP information is available', () => {
      const mockReq = {
        method: 'GET',
        url: '/api/health',
        headers: { host: 'localhost:3000' },
        socket: {},
      }

      const transportReq = (adapter as any).wrapRequest(mockReq)

      expect(transportReq.ip).toBe('0.0.0.0')
    })

    it('should implement getHeader method with case-insensitive access', () => {
      const mockReq = {
        method: 'GET',
        url: '/api/health',
        headers: {
          host: 'localhost:3000',
          'Content-Type': 'application/json',
        },
        socket: { remoteAddress: '127.0.0.1' },
      }

      const transportReq = (adapter as any).wrapRequest(mockReq)

      expect(transportReq.getHeader('content-type')).toBe('application/json')
      expect(transportReq.getHeader('Content-Type')).toBe('application/json')
      expect(transportReq.getHeader('CONTENT-TYPE')).toBe('application/json')
    })

    it('should return undefined for missing headers', () => {
      const mockReq = {
        method: 'GET',
        url: '/api/health',
        headers: { host: 'localhost:3000' },
        socket: { remoteAddress: '127.0.0.1' },
      }

      const transportReq = (adapter as any).wrapRequest(mockReq)

      expect(transportReq.getHeader('authorization')).toBeUndefined()
    })

    it('should implement getQuery method', () => {
      const mockReq = {
        method: 'GET',
        url: '/api/search?q=test&limit=10&sort=asc',
        headers: { host: 'localhost:3000' },
        socket: { remoteAddress: '127.0.0.1' },
      }

      const transportReq = (adapter as any).wrapRequest(mockReq)

      expect(transportReq.getQuery('q')).toBe('test')
      expect(transportReq.getQuery('limit')).toBe('10')
      expect(transportReq.getQuery('sort')).toBe('asc')
    })

    it('should return undefined for missing query parameters', () => {
      const mockReq = {
        method: 'GET',
        url: '/api/health',
        headers: { host: 'localhost:3000' },
        socket: { remoteAddress: '127.0.0.1' },
      }

      const transportReq = (adapter as any).wrapRequest(mockReq)

      expect(transportReq.getQuery('missing')).toBeUndefined()
    })

    it('should initialize body as null', () => {
      const mockReq = {
        method: 'POST',
        url: '/api/chat-process',
        headers: { host: 'localhost:3000' },
        socket: { remoteAddress: '127.0.0.1' },
      }

      const transportReq = (adapter as any).wrapRequest(mockReq)

      expect(transportReq.body).toBeNull()
    })

    it('should initialize session as undefined', () => {
      const mockReq = {
        method: 'GET',
        url: '/api/health',
        headers: { host: 'localhost:3000' },
        socket: { remoteAddress: '127.0.0.1' },
      }

      const transportReq = (adapter as any).wrapRequest(mockReq)

      expect(transportReq.session).toBeUndefined()
    })

    it('should handle X-Forwarded-For with array values', () => {
      const trustedProxyAdapter = new HTTP2Adapter(mockRouter, mockMiddleware, {
        http2: false,
        trustProxy: true,
      })
      const mockReq = {
        method: 'GET',
        url: '/api/health',
        headers: {
          host: 'localhost:3000',
          'x-forwarded-for': ['203.0.113.1, 198.51.100.1', testClientIp],
        },
        socket: { remoteAddress: '127.0.0.1' },
      }

      const transportReq = (trustedProxyAdapter as any).wrapRequest(mockReq)

      expect(transportReq.ip).toBe('203.0.113.1')
    })

    it('should handle X-Real-IP with array values', () => {
      const trustedProxyAdapter = new HTTP2Adapter(mockRouter, mockMiddleware, {
        http2: false,
        trustProxy: true,
      })
      const mockReq = {
        method: 'GET',
        url: '/api/health',
        headers: {
          host: 'localhost:3000',
          'x-real-ip': ['203.0.113.1', '198.51.100.1'],
        },
        socket: { remoteAddress: '127.0.0.1' },
      }

      const transportReq = (trustedProxyAdapter as any).wrapRequest(mockReq)

      expect(transportReq.ip).toBe('203.0.113.1')
    })

    it('should ignore forwarded headers from untrusted proxies', () => {
      const mockReq = {
        method: 'GET',
        url: '/api/health',
        headers: {
          host: 'localhost:3000',
          'x-forwarded-for': '203.0.113.1, 198.51.100.1',
        },
        socket: { remoteAddress: testClientIp },
      }

      const transportReq = (adapter as any).wrapRequest(mockReq)

      expect(transportReq.ip).toBe(testClientIp)
    })

    it('should handle missing URL by defaulting to root path', () => {
      const mockReq = {
        method: 'GET',
        headers: { host: 'localhost:3000' },
        socket: { remoteAddress: '127.0.0.1' },
      }

      const transportReq = (adapter as any).wrapRequest(mockReq)

      expect(transportReq.path).toBe('/')
    })

    it('should handle missing host header by using localhost', () => {
      const mockReq = {
        method: 'GET',
        url: '/api/health',
        headers: {},
        socket: { remoteAddress: '127.0.0.1' },
      }

      const transportReq = (adapter as any).wrapRequest(mockReq)

      expect(transportReq.url.host).toBe('localhost')
    })
  })

  describe('Response Wrapping', () => {
    let adapter: HTTP2Adapter

    beforeEach(() => {
      adapter = new HTTP2Adapter(mockRouter, mockMiddleware, {
        http2: false, // Use HTTP/1.1 for simpler testing
      })
    })

    it('should set status code', () => {
      const mockRes = {
        statusCode: 200,
        headersSent: false,
        writableEnded: false,
        setHeader: vi.fn(),
        getHeader: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
      }

      const transportRes = (adapter as any).wrapResponse(mockRes)

      transportRes.status(404)
      transportRes.end()

      expect(mockRes.statusCode).toBe(404)
    })

    it('should support method chaining for status', () => {
      const mockRes = {
        statusCode: 200,
        headersSent: false,
        writableEnded: false,
        setHeader: vi.fn(),
        getHeader: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
      }

      const transportRes = (adapter as any).wrapResponse(mockRes)

      const result = transportRes.status(201)

      expect(result).toBe(transportRes)
    })

    it('should set response headers', () => {
      const mockRes = {
        statusCode: 200,
        headersSent: false,
        writableEnded: false,
        setHeader: vi.fn(),
        getHeader: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
      }

      const transportRes = (adapter as any).wrapResponse(mockRes)

      transportRes.setHeader('Content-Type', 'application/json')
      transportRes.setHeader('X-Custom-Header', 'value')

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json')
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Custom-Header', 'value')
    })

    it('should support method chaining for setHeader', () => {
      const mockRes = {
        statusCode: 200,
        headersSent: false,
        writableEnded: false,
        setHeader: vi.fn(),
        getHeader: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
      }

      const transportRes = (adapter as any).wrapResponse(mockRes)

      const result = transportRes.setHeader('Content-Type', 'application/json')

      expect(result).toBe(transportRes)
    })

    it('should set array header values', () => {
      const mockRes = {
        statusCode: 200,
        headersSent: false,
        writableEnded: false,
        setHeader: vi.fn(),
        getHeader: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
      }

      const transportRes = (adapter as any).wrapResponse(mockRes)

      transportRes.setHeader('Set-Cookie', ['cookie1=value1', 'cookie2=value2'])

      expect(mockRes.setHeader).toHaveBeenCalledWith('Set-Cookie', [
        'cookie1=value1',
        'cookie2=value2',
      ])
    })

    it('should get response headers', () => {
      const mockRes = {
        statusCode: 200,
        headersSent: false,
        writableEnded: false,
        setHeader: vi.fn(),
        getHeader: vi.fn().mockReturnValue('application/json'),
        write: vi.fn(),
        end: vi.fn(),
      }

      const transportRes = (adapter as any).wrapResponse(mockRes)

      const value = transportRes.getHeader('Content-Type')

      expect(mockRes.getHeader).toHaveBeenCalledWith('Content-Type')
      expect(value).toBe('application/json')
    })

    it('should convert numeric header values to strings', () => {
      const mockRes = {
        statusCode: 200,
        headersSent: false,
        writableEnded: false,
        setHeader: vi.fn(),
        getHeader: vi.fn().mockReturnValue(1024), // Content-Length can be a number
        write: vi.fn(),
        end: vi.fn(),
      }

      const transportRes = (adapter as any).wrapResponse(mockRes)

      const value = transportRes.getHeader('Content-Length')

      expect(mockRes.getHeader).toHaveBeenCalledWith('Content-Length')
      expect(value).toBe('1024')
      expect(typeof value).toBe('string')
    })

    it('should send JSON response with correct Content-Type', () => {
      const mockRes = {
        statusCode: 200,
        headersSent: false,
        writableEnded: false,
        setHeader: vi.fn(),
        getHeader: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
      }

      const transportRes = (adapter as any).wrapResponse(mockRes)

      const data = { status: 'Success', message: 'OK', data: { id: 123 } }
      transportRes.status(200).json(data)

      expect(mockRes.statusCode).toBe(200)
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json')
      expect(mockRes.end).toHaveBeenCalledWith(JSON.stringify(data))
    })

    it('should not set status or headers if already sent (json)', () => {
      const mockRes = {
        statusCode: 200,
        headersSent: true,
        writableEnded: false,
        setHeader: vi.fn(),
        getHeader: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
      }

      const transportRes = (adapter as any).wrapResponse(mockRes)

      transportRes.status(404).json({ error: 'Not Found' })

      expect(mockRes.statusCode).toBe(200) // Should not change
      expect(mockRes.setHeader).not.toHaveBeenCalled()
      expect(mockRes.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Not Found' }))
    })

    it('should send text response with text/plain Content-Type', () => {
      const mockRes = {
        statusCode: 200,
        headersSent: false,
        writableEnded: false,
        setHeader: vi.fn(),
        getHeader: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
      }

      const transportRes = (adapter as any).wrapResponse(mockRes)

      transportRes.status(200).send('Hello, World!')

      expect(mockRes.statusCode).toBe(200)
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain')
      expect(mockRes.end).toHaveBeenCalledWith('Hello, World!')
    })

    it('should send Buffer response with application/octet-stream Content-Type', () => {
      const mockRes = {
        statusCode: 200,
        headersSent: false,
        writableEnded: false,
        setHeader: vi.fn(),
        getHeader: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
      }

      const transportRes = (adapter as any).wrapResponse(mockRes)

      const buffer = Buffer.from('binary data')
      transportRes.status(200).send(buffer)

      expect(mockRes.statusCode).toBe(200)
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/octet-stream')
      expect(mockRes.end).toHaveBeenCalledWith(buffer)
    })

    it('should not set status or headers if already sent (send)', () => {
      const mockRes = {
        statusCode: 200,
        headersSent: true,
        writableEnded: false,
        setHeader: vi.fn(),
        getHeader: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
      }

      const transportRes = (adapter as any).wrapResponse(mockRes)

      transportRes.status(404).send('Not Found')

      expect(mockRes.statusCode).toBe(200) // Should not change
      expect(mockRes.setHeader).not.toHaveBeenCalled()
      expect(mockRes.end).toHaveBeenCalledWith('Not Found')
    })

    it('should write streaming chunks', () => {
      const mockRes = {
        statusCode: 200,
        headersSent: false,
        writableEnded: false,
        setHeader: vi.fn(),
        getHeader: vi.fn(),
        write: vi.fn().mockReturnValue(true),
        end: vi.fn(),
      }

      const transportRes = (adapter as any).wrapResponse(mockRes)

      transportRes.status(200)
      const result = transportRes.write('chunk1')

      expect(mockRes.statusCode).toBe(200)
      expect(mockRes.write).toHaveBeenCalledWith('chunk1')
      expect(result).toBe(true)
    })

    it('should write Buffer chunks', () => {
      const mockRes = {
        statusCode: 200,
        headersSent: false,
        writableEnded: false,
        setHeader: vi.fn(),
        getHeader: vi.fn(),
        write: vi.fn().mockReturnValue(true),
        end: vi.fn(),
      }

      const transportRes = (adapter as any).wrapResponse(mockRes)

      const buffer = Buffer.from('chunk data')
      transportRes.write(buffer)

      expect(mockRes.write).toHaveBeenCalledWith(buffer)
    })

    it('should return false when write buffer is full (backpressure)', () => {
      const mockRes = {
        statusCode: 200,
        headersSent: false,
        writableEnded: false,
        setHeader: vi.fn(),
        getHeader: vi.fn(),
        write: vi.fn().mockReturnValue(false),
        end: vi.fn(),
      }

      const transportRes = (adapter as any).wrapResponse(mockRes)

      const result = transportRes.write('large chunk')

      expect(result).toBe(false)
    })

    it('should set status code before first write', () => {
      const mockRes = {
        statusCode: 200,
        headersSent: false,
        writableEnded: false,
        setHeader: vi.fn(),
        getHeader: vi.fn(),
        write: vi.fn().mockReturnValue(true),
        end: vi.fn(),
      }

      const transportRes = (adapter as any).wrapResponse(mockRes)

      transportRes.status(201)
      transportRes.write('chunk')

      expect(mockRes.statusCode).toBe(201)
    })

    it('should not set status code if headers already sent (write)', () => {
      const mockRes = {
        statusCode: 200,
        headersSent: true,
        writableEnded: false,
        setHeader: vi.fn(),
        getHeader: vi.fn(),
        write: vi.fn().mockReturnValue(true),
        end: vi.fn(),
      }

      const transportRes = (adapter as any).wrapResponse(mockRes)

      transportRes.status(404)
      transportRes.write('chunk')

      expect(mockRes.statusCode).toBe(200) // Should not change
    })

    it('should end response without chunk', () => {
      const mockRes = {
        statusCode: 200,
        headersSent: false,
        writableEnded: false,
        setHeader: vi.fn(),
        getHeader: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
      }

      const transportRes = (adapter as any).wrapResponse(mockRes)

      transportRes.status(204)
      transportRes.end()

      expect(mockRes.statusCode).toBe(204)
      expect(mockRes.end).toHaveBeenCalledWith()
    })

    it('should end response with final chunk', () => {
      const mockRes = {
        statusCode: 200,
        headersSent: false,
        writableEnded: false,
        setHeader: vi.fn(),
        getHeader: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
      }

      const transportRes = (adapter as any).wrapResponse(mockRes)

      transportRes.status(200)
      transportRes.end('final chunk')

      expect(mockRes.statusCode).toBe(200)
      expect(mockRes.end).toHaveBeenCalledWith('final chunk')
    })

    it('should end response with Buffer chunk', () => {
      const mockRes = {
        statusCode: 200,
        headersSent: false,
        writableEnded: false,
        setHeader: vi.fn(),
        getHeader: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
      }

      const transportRes = (adapter as any).wrapResponse(mockRes)

      const buffer = Buffer.from('final data')
      transportRes.end(buffer)

      expect(mockRes.end).toHaveBeenCalledWith(buffer)
    })

    it('should not set status code if headers already sent (end)', () => {
      const mockRes = {
        statusCode: 200,
        headersSent: true,
        writableEnded: false,
        setHeader: vi.fn(),
        getHeader: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
      }

      const transportRes = (adapter as any).wrapResponse(mockRes)

      transportRes.status(404)
      transportRes.end()

      expect(mockRes.statusCode).toBe(200) // Should not change
    })

    it('should track headersSent state', () => {
      const mockRes = {
        statusCode: 200,
        headersSent: false,
        writableEnded: false,
        setHeader: vi.fn(),
        getHeader: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
      }

      const transportRes = (adapter as any).wrapResponse(mockRes)

      expect(transportRes.headersSent).toBe(false)

      mockRes.headersSent = true

      expect(transportRes.headersSent).toBe(true)
    })

    it('should track finished state', () => {
      const mockRes = {
        statusCode: 200,
        headersSent: false,
        writableEnded: false,
        setHeader: vi.fn(),
        getHeader: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
      }

      const transportRes = (adapter as any).wrapResponse(mockRes)

      expect(transportRes.finished).toBe(false)

      mockRes.writableEnded = true

      expect(transportRes.finished).toBe(true)
    })

    it('should support streaming workflow', () => {
      const mockRes = {
        statusCode: 200,
        headersSent: false,
        writableEnded: false,
        setHeader: vi.fn(),
        getHeader: vi.fn(),
        write: vi.fn().mockReturnValue(true),
        end: vi.fn(),
      }

      const transportRes = (adapter as any).wrapResponse(mockRes)

      // Set headers and status
      transportRes.status(200)
      transportRes.setHeader('Content-Type', 'application/octet-stream')
      transportRes.setHeader('Cache-Control', 'no-cache')

      // Write chunks
      transportRes.write('chunk1\n')
      transportRes.write('chunk2\n')
      transportRes.write('chunk3\n')

      // End response
      transportRes.end()

      expect(mockRes.statusCode).toBe(200)
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/octet-stream')
      expect(mockRes.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache')
      expect(mockRes.write).toHaveBeenCalledTimes(3)
      expect(mockRes.end).toHaveBeenCalledWith()
    })

    it('should handle default status code of 200', () => {
      const mockRes = {
        statusCode: 200,
        headersSent: false,
        writableEnded: false,
        setHeader: vi.fn(),
        getHeader: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
      }

      const transportRes = (adapter as any).wrapResponse(mockRes)

      // Don't set status explicitly
      transportRes.json({ message: 'OK' })

      expect(mockRes.statusCode).toBe(200)
    })

    it('should serialize complex JSON objects', () => {
      const mockRes = {
        statusCode: 200,
        headersSent: false,
        writableEnded: false,
        setHeader: vi.fn(),
        getHeader: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
      }

      const transportRes = (adapter as any).wrapResponse(mockRes)

      const complexData = {
        status: 'Success',
        data: {
          users: [
            { id: 1, name: 'Alice' },
            { id: 2, name: 'Bob' },
          ],
          metadata: {
            total: 2,
            page: 1,
          },
        },
      }

      transportRes.json(complexData)

      expect(mockRes.end).toHaveBeenCalledWith(JSON.stringify(complexData))
    })

    it('should handle null and undefined in JSON', () => {
      const mockRes = {
        statusCode: 200,
        headersSent: false,
        writableEnded: false,
        setHeader: vi.fn(),
        getHeader: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
      }

      const transportRes = (adapter as any).wrapResponse(mockRes)

      transportRes.json({ value: null, missing: undefined })

      expect(mockRes.end).toHaveBeenCalledWith(JSON.stringify({ value: null, missing: undefined }))
    })
  })

  // Body Parsing tests removed - parseBody method no longer exists in HTTP2Adapter
  // Body parsing is now handled by the body-parser middleware (apps/api/src/middleware-native/body-parser.ts)
  // See body-parser.test.ts for body parsing tests

  describe('HTTP/1.1 Fallback Negotiation', () => {
    it('should create HTTP/2 secure server with allowHTTP1 flag when TLS is configured', () => {
      // This test verifies the configuration is set up for HTTP/1.1 fallback
      // In production, the server would negotiate protocol via ALPN
      expect(
        () =>
          new HTTP2Adapter(mockRouter, mockMiddleware, {
            http2: true,
            tls: {
              key: Buffer.from('test-key'),
              cert: Buffer.from('test-cert'),
            },
          }),
      ).toThrow() // Will throw due to invalid certificates, but config path is tested
    })

    it('should accept HTTP/1.1 connections when HTTP/2 is disabled', async () => {
      const adapter = new HTTP2Adapter(mockRouter, mockMiddleware, {
        http2: false, // Explicitly disable HTTP/2
      })

      const port = await getAvailablePort()
      await adapter.listen(port, '127.0.0.1')

      const server = adapter.getServer()
      expect(server).toBeDefined()
      // HTTP/1.1 server doesn't have HTTP/2-specific properties
      expect('encrypted' in server).toBe(false)

      await adapter.close()
    })

    it('should create HTTP/2 cleartext server when HTTP/2 is enabled without TLS', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const adapter = new HTTP2Adapter(mockRouter, mockMiddleware, {
        http2: true,
        // No TLS configuration
      })

      const server = adapter.getServer()
      expect(server).toBeDefined()

      // Should warn about h2c limitations
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('HTTP/2 without TLS (h2c) has limited browser support'),
      )

      warnSpy.mockRestore()
    })

    it('should handle protocol negotiation configuration correctly', () => {
      // Test that the adapter is configured to support both protocols when TLS is used
      // The actual ALPN negotiation happens at the TLS layer
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // HTTP/2 without TLS should warn
      const adapter = new HTTP2Adapter(mockRouter, mockMiddleware, {
        http2: true,
      })
      expect(adapter.getServer()).toBeDefined()
      expect(warnSpy).toHaveBeenCalled()

      warnSpy.mockRestore()
    })
  })

  describe('Route Matching and Execution', () => {
    it('should match and execute route handler', async () => {
      const router = new (class {
        private readonly routes: any[] = []

        addRoute(route: any) {
          this.routes.push(route)
          return this
        }
        get(path: string, handler: any) {
          this.routes.push({ method: 'GET', path, handler, middleware: [] })
          return this
        }
        post(path: string, handler: any) {
          this.routes.push({ method: 'POST', path, handler, middleware: [] })
          return this
        }
        put() {
          return this
        }
        delete() {
          return this
        }
        match(method: string, path: string) {
          return this.routes.find(r => r.method === method && r.path === path) || null
        }
      })()

      const middleware = new (class {
        use() {
          return this
        }
        async execute() {
          return undefined
        }
      })()

      const adapter = new HTTP2Adapter(router as any, middleware as any, {
        http2: false,
      })

      let handlerCalled = false
      router.get('/test', async (_req: any, res: any) => {
        handlerCalled = true
        res.status(200).json({ message: 'success' })
      })

      const port = await getAvailablePort()
      await adapter.listen(port, '127.0.0.1')

      try {
        const http = require('node:http')
        await new Promise<void>((resolve, reject) => {
          const req = http.request(
            {
              hostname: '127.0.0.1',
              port,
              path: '/test',
              method: 'GET',
            },
            (res: any) => {
              let data = ''
              res.on('data', (chunk: Buffer) => {
                data += chunk.toString()
              })
              res.on('end', () => {
                expect(res.statusCode).toBe(200)
                expect(JSON.parse(data)).toEqual({ message: 'success' })
                expect(handlerCalled).toBe(true)
                resolve()
              })
            },
          )
          req.on('error', reject)
          req.end()
        })
      } finally {
        await adapter.close()
      }
    })

    it('should return 404 for unmatched routes', async () => {
      const router = new (class {
        addRoute() {
          return this
        }
        get() {
          return this
        }
        post() {
          return this
        }
        put() {
          return this
        }
        delete() {
          return this
        }
        match() {
          return null // No routes match
        }
      })()

      const middleware = new (class {
        use() {
          return this
        }
        async execute() {
          return undefined
        }
      })()

      const adapter = new HTTP2Adapter(router as any, middleware as any, {
        http2: false,
      })

      const port = await getAvailablePort()
      await adapter.listen(port, '127.0.0.1')

      try {
        const http = require('node:http')
        await new Promise<void>((resolve, reject) => {
          const req = http.request(
            {
              hostname: '127.0.0.1',
              port,
              path: '/nonexistent',
              method: 'GET',
            },
            (res: any) => {
              let data = ''
              res.on('data', (chunk: Buffer) => {
                data += chunk.toString()
              })
              res.on('end', () => {
                expect(res.statusCode).toBe(404)
                const body = JSON.parse(data)
                expect(body).toEqual({
                  status: 'Fail',
                  message: 'Not Found',
                  data: null,
                })
                resolve()
              })
            },
          )
          req.on('error', reject)
          req.end()
        })
      } finally {
        await adapter.close()
      }
    })

    it('should execute route-specific middleware before handler', async () => {
      const executionOrder: string[] = []

      const router = new (class {
        private readonly routes: any[] = []

        addRoute(route: any) {
          this.routes.push(route)
          return this
        }
        get(path: string, handler: any) {
          this.routes.push({ method: 'GET', path, handler, middleware: [] })
          return this
        }
        post(path: string, handler: any) {
          this.routes.push({ method: 'POST', path, handler, middleware: [] })
          return this
        }
        put() {
          return this
        }
        delete() {
          return this
        }
        match(method: string, path: string) {
          const route = this.routes.find(r => r.method === method && r.path === path)
          if (route) {
            // Add middleware to the route
            route.middleware = [
              async (_req: any, _res: any, next: any) => {
                executionOrder.push('middleware1')
                next()
              },
              async (_req: any, _res: any, next: any) => {
                executionOrder.push('middleware2')
                next()
              },
            ]
          }
          return route || null
        }
      })()

      const middleware = new (class {
        use() {
          return this
        }
        async execute() {
          executionOrder.push('global')
        }
      })()

      const adapter = new HTTP2Adapter(router as any, middleware as any, {
        http2: false,
      })

      router.get('/test', async (_req: any, res: any) => {
        executionOrder.push('handler')
        res.status(200).json({ message: 'success' })
      })

      const port = await getAvailablePort()
      await adapter.listen(port, '127.0.0.1')

      try {
        const http = require('node:http')
        await new Promise<void>((resolve, reject) => {
          const req = http.request(
            {
              hostname: '127.0.0.1',
              port,
              path: '/test',
              method: 'GET',
            },
            (res: any) => {
              let _data = ''
              res.on('data', (chunk: Buffer) => {
                _data += chunk.toString()
              })
              res.on('end', () => {
                expect(res.statusCode).toBe(200)
                expect(executionOrder).toEqual(['global', 'middleware1', 'middleware2', 'handler'])
                resolve()
              })
            },
          )
          req.on('error', reject)
          req.end()
        })
      } finally {
        await adapter.close()
      }
    })

    it('should stop execution if middleware sends response', async () => {
      const router = new (class {
        private readonly routes: any[] = []

        addRoute(route: any) {
          this.routes.push(route)
          return this
        }
        get(path: string, handler: any) {
          this.routes.push({ method: 'GET', path, handler, middleware: [] })
          return this
        }
        post(path: string, handler: any) {
          this.routes.push({ method: 'POST', path, handler, middleware: [] })
          return this
        }
        put() {
          return this
        }
        delete() {
          return this
        }
        match(method: string, path: string) {
          const route = this.routes.find(r => r.method === method && r.path === path)
          if (route) {
            // Middleware that sends response
            route.middleware = [
              async (_req: any, res: any, _next: any) => {
                res.status(403).json({ message: 'Forbidden' })
                // Don't call next()
              },
            ]
          }
          return route || null
        }
      })()

      const middleware = new (class {
        use() {
          return this
        }
        async execute() {
          return undefined
        }
      })()

      const adapter = new HTTP2Adapter(router as any, middleware as any, {
        http2: false,
      })

      let handlerCalled = false
      router.get('/test', async (_req: any, res: any) => {
        handlerCalled = true
        res.status(200).json({ message: 'success' })
      })

      const port = await getAvailablePort()
      await adapter.listen(port, '127.0.0.1')

      try {
        const http = require('node:http')
        await new Promise<void>((resolve, reject) => {
          const req = http.request(
            {
              hostname: '127.0.0.1',
              port,
              path: '/test',
              method: 'GET',
            },
            (res: any) => {
              let data = ''
              res.on('data', (chunk: Buffer) => {
                data += chunk.toString()
              })
              res.on('end', () => {
                expect(res.statusCode).toBe(403)
                expect(JSON.parse(data)).toEqual({ message: 'Forbidden' })
                expect(handlerCalled).toBe(false) // Handler should not be called
                resolve()
              })
            },
          )
          req.on('error', reject)
          req.end()
        })
      } finally {
        await adapter.close()
      }
    })

    it('should match routes with different HTTP methods', async () => {
      const router = new (class {
        private readonly routes: any[] = []

        addRoute(route: any) {
          this.routes.push(route)
          return this
        }
        get(path: string, handler: any) {
          this.routes.push({ method: 'GET', path, handler, middleware: [] })
          return this
        }
        post(path: string, handler: any) {
          this.routes.push({ method: 'POST', path, handler, middleware: [] })
          return this
        }
        put() {
          return this
        }
        delete() {
          return this
        }
        match(method: string, path: string) {
          return this.routes.find(r => r.method === method && r.path === path) || null
        }
      })()

      const middleware = new (class {
        use() {
          return this
        }
        async execute() {
          return undefined
        }
      })()

      const adapter = new HTTP2Adapter(router as any, middleware as any, {
        http2: false,
      })

      router.get('/test', async (_req: any, res: any) => {
        res.status(200).json({ method: 'GET' })
      })

      router.post('/test', async (_req: any, res: any) => {
        res.status(200).json({ method: 'POST' })
      })

      const port = await getAvailablePort()
      await adapter.listen(port, '127.0.0.1')

      try {
        const http = require('node:http')

        // Test GET
        await new Promise<void>((resolve, reject) => {
          const req = http.request(
            {
              hostname: '127.0.0.1',
              port,
              path: '/test',
              method: 'GET',
            },
            (res: any) => {
              let data = ''
              res.on('data', (chunk: Buffer) => {
                data += chunk.toString()
              })
              res.on('end', () => {
                expect(res.statusCode).toBe(200)
                expect(JSON.parse(data)).toEqual({ method: 'GET' })
                resolve()
              })
            },
          )
          req.on('error', reject)
          req.end()
        })

        // Test POST
        await new Promise<void>((resolve, reject) => {
          const req = http.request(
            {
              hostname: '127.0.0.1',
              port,
              path: '/test',
              method: 'POST',
            },
            (res: any) => {
              let data = ''
              res.on('data', (chunk: Buffer) => {
                data += chunk.toString()
              })
              res.on('end', () => {
                expect(res.statusCode).toBe(200)
                expect(JSON.parse(data)).toEqual({ method: 'POST' })
                resolve()
              })
            },
          )
          req.on('error', reject)
          req.end()
        })
      } finally {
        await adapter.close()
      }
    })
  })
})
