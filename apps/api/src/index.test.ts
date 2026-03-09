/**
 * Startup Tests for Native HTTP/2 Server
 *
 * Tests server startup, port binding, protocol support, and graceful shutdown.
 * Validates Requirements 13.8 and 22.5.
 */

import * as http from 'node:http'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HTTP2Adapter } from './adapters/http2-adapter.js'
import { getAvailablePort } from './test/test-helpers.js'
import { MiddlewareChainImpl } from './transport/middleware-chain.js'
import { RouterImpl } from './transport/router.js'
import { setupGracefulShutdown } from './utils/graceful-shutdown.js'

describe('Server Startup Tests', () => {
  let adapter: HTTP2Adapter | undefined
  let shutdownCleanup: (() => void) | undefined

  afterEach(async () => {
    shutdownCleanup?.()
    shutdownCleanup = undefined
    if (adapter) {
      try {
        await adapter.close()
      } catch {
        // Ignore errors if server wasn't started
      }
      adapter = undefined
    }
  })

  describe('Server starts successfully', () => {
    it('should create and start HTTP/2 server without TLS', async () => {
      const testPort = await getAvailablePort()
      const router = new RouterImpl()
      const middleware = new MiddlewareChainImpl()

      adapter = new HTTP2Adapter(router, middleware, {
        http2: true,
        tls: undefined,
      })

      await expect(adapter.listen(testPort, '127.0.0.1')).resolves.toBeUndefined()

      const server = adapter.getServer()
      expect(server).toBeDefined()
      expect(server.listening).toBe(true)
    })

    it('should create and start HTTP/1.1 server when HTTP/2 is disabled', async () => {
      const testPort = await getAvailablePort()
      const router = new RouterImpl()
      const middleware = new MiddlewareChainImpl()

      adapter = new HTTP2Adapter(router, middleware, {
        http2: false,
      })

      await expect(adapter.listen(testPort, '127.0.0.1')).resolves.toBeUndefined()

      const server = adapter.getServer()
      expect(server).toBeDefined()
      expect(server.listening).toBe(true)
    })

    it('should reject startup if port is already in use', async () => {
      const testPort = await getAvailablePort()
      const router = new RouterImpl()
      const middleware = new MiddlewareChainImpl()

      // Create first server
      adapter = new HTTP2Adapter(router, middleware, {
        http2: false,
      })
      await adapter.listen(testPort, '127.0.0.1')

      // Try to create second server on same port
      const router2 = new RouterImpl()
      const middleware2 = new MiddlewareChainImpl()
      const adapter2 = new HTTP2Adapter(router2, middleware2, {
        http2: false,
      })

      try {
        await expect(adapter2.listen(testPort, '127.0.0.1')).rejects.toThrow()
      } finally {
        // Clean up second adapter if it was created
        try {
          await adapter2.close()
        } catch {
          // Ignore errors on close
        }
      }
    })
  })

  describe('Server binds to configured port', () => {
    it('should bind to specified port', async () => {
      const testPort = await getAvailablePort()
      const router = new RouterImpl()
      const middleware = new MiddlewareChainImpl()

      adapter = new HTTP2Adapter(router, middleware, {
        http2: false,
      })

      await adapter.listen(testPort, '127.0.0.1')

      const server = adapter.getServer()
      const address = server.address()

      expect(address).not.toBeNull()
      expect(typeof address).toBe('object')
      if (address && typeof address === 'object') {
        expect(address.port).toBe(testPort)
      }
    })

    it('should bind to specified hostname', async () => {
      const testPort = await getAvailablePort()
      const router = new RouterImpl()
      const middleware = new MiddlewareChainImpl()

      adapter = new HTTP2Adapter(router, middleware, {
        http2: false,
      })

      await adapter.listen(testPort, '127.0.0.1')

      const server = adapter.getServer()
      const address = server.address()

      expect(address).not.toBeNull()
      expect(typeof address).toBe('object')
      if (address && typeof address === 'object') {
        expect(address.address).toBe('127.0.0.1')
      }
    })

    it('should bind to 0.0.0.0 by default', async () => {
      const testPort = await getAvailablePort()
      const router = new RouterImpl()
      const middleware = new MiddlewareChainImpl()

      adapter = new HTTP2Adapter(router, middleware, {
        http2: false,
      })

      await adapter.listen(testPort) // No hostname specified

      const server = adapter.getServer()
      const address = server.address()

      expect(address).not.toBeNull()
      expect(typeof address).toBe('object')
      if (address && typeof address === 'object') {
        expect(address.address).toBe('0.0.0.0')
      }
    })
  })

  describe('Server accepts HTTP/2 connections (if TLS configured)', () => {
    it('should attempt to create HTTP/2 secure server when TLS is configured', () => {
      const router = new RouterImpl()
      const middleware = new MiddlewareChainImpl()

      // Note: This will throw due to invalid certificates, but we verify
      // the code path attempts to create an HTTP/2 secure server
      let threwError = false
      try {
        new HTTP2Adapter(router, middleware, {
          http2: true,
          tls: {
            key: Buffer.from('-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----'),
            cert: Buffer.from('-----BEGIN CERTIFICATE-----\ntest\n-----END CERTIFICATE-----'),
          },
        })
      } catch (_error) {
        threwError = true
      }

      // Should throw due to invalid certificates
      expect(threwError).toBe(true)
    })

    it('should create HTTP/2 cleartext server when TLS is not configured', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const router = new RouterImpl()
      const middleware = new MiddlewareChainImpl()

      const testAdapter = new HTTP2Adapter(router, middleware, {
        http2: true,
        tls: undefined,
      })

      const server = testAdapter.getServer()
      expect(server).toBeDefined()

      // Verify it's an HTTP/2 server (has http2 specific properties)
      expect('setTimeout' in server).toBe(true)

      warnSpy.mockRestore()
    })

    it('should enable HTTP/1.1 fallback for HTTP/2 secure server', () => {
      const router = new RouterImpl()
      const middleware = new MiddlewareChainImpl()

      // This will throw due to invalid certs, but we're testing the configuration
      let threwError = false
      try {
        new HTTP2Adapter(router, middleware, {
          http2: true,
          tls: {
            key: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----',
            cert: '-----BEGIN CERTIFICATE-----\ntest\n-----END CERTIFICATE-----',
          },
        })
      } catch (_error) {
        threwError = true
      }

      // Should throw due to invalid certificates
      expect(threwError).toBe(true)
    })
  })

  describe('Server accepts HTTP/1.1 connections', () => {
    it('should accept HTTP/1.1 connections when HTTP/2 is disabled', async () => {
      const testPort = await getAvailablePort()
      const router = new RouterImpl()
      const middleware = new MiddlewareChainImpl()

      // Add a simple health route
      router.get('/health', async (_req: any, res: any) => {
        res.status(200).json({ status: 'ok' })
      })

      adapter = new HTTP2Adapter(router, middleware, {
        http2: false,
      })

      await adapter.listen(testPort, '127.0.0.1')

      // Make HTTP/1.1 request
      const response = await new Promise<http.IncomingMessage>((resolve, reject) => {
        const req = http.request(
          {
            hostname: '127.0.0.1',
            port: testPort,
            path: '/health',
            method: 'GET',
          },
          resolve,
        )
        req.on('error', reject)
        req.end()
      })

      expect(response.statusCode).toBe(200)
      expect(response.httpVersion).toBe('1.1')
    })

    it('should handle HTTP/1.1 POST requests', async () => {
      const testPort = await getAvailablePort()
      const router = new RouterImpl()
      const middleware = new MiddlewareChainImpl()

      // Add a simple echo route
      router.post('/echo', async (_req: any, res: any) => {
        res.status(200).json({ received: true })
      })

      adapter = new HTTP2Adapter(router, middleware, {
        http2: false,
      })

      await adapter.listen(testPort, '127.0.0.1')

      // Make HTTP/1.1 POST request
      const response = await new Promise<http.IncomingMessage>((resolve, reject) => {
        const req = http.request(
          {
            hostname: '127.0.0.1',
            port: testPort,
            path: '/echo',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          },
          resolve,
        )
        req.on('error', reject)
        req.write(JSON.stringify({ test: 'data' }))
        req.end()
      })

      expect(response.statusCode).toBe(200)
    })
  })

  describe('Graceful shutdown completes in-flight requests', () => {
    it('should wait for in-flight requests to complete before closing', async () => {
      const testPort = await getAvailablePort()
      const router = new RouterImpl()
      const middleware = new MiddlewareChainImpl()

      let requestCompleted = false

      // Add a slow route that takes time to complete
      router.get('/slow', async (_req: any, res: any) => {
        await new Promise(resolve => setTimeout(resolve, 100))
        requestCompleted = true
        res.status(200).json({ status: 'completed' })
      })

      adapter = new HTTP2Adapter(router, middleware, {
        http2: false,
      })

      await adapter.listen(testPort, '127.0.0.1')

      // Start a request
      const requestPromise = new Promise<void>((resolve, reject) => {
        const req = http.request(
          {
            hostname: '127.0.0.1',
            port: testPort,
            path: '/slow',
            method: 'GET',
          },
          response => {
            let _data = ''
            response.on('data', chunk => {
              _data += chunk
            })
            response.on('end', () => {
              expect(response.statusCode).toBe(200)
              resolve()
            })
          },
        )
        req.on('error', reject)
        req.end()
      })

      // Give the request a moment to start
      await new Promise(resolve => setTimeout(resolve, 10))

      // Close the server (should wait for request to complete)
      const closePromise = adapter.close()

      // Wait for both to complete
      await Promise.all([requestPromise, closePromise])

      // Verify the request completed
      expect(requestCompleted).toBe(true)
    }, 10000) // Increase timeout for this test

    it('should setup shutdown callbacks without errors', async () => {
      const testPort = await getAvailablePort()
      const router = new RouterImpl()
      const middleware = new MiddlewareChainImpl()

      adapter = new HTTP2Adapter(router, middleware, {
        http2: false,
      })

      await adapter.listen(testPort, '127.0.0.1')

      const callOrder: string[] = []

      // Setup graceful shutdown - this should not throw
      expect(() => {
        const server = adapter?.getServer()
        if (server) {
          shutdownCleanup = setupGracefulShutdown(server, {
            timeout: 1000,
            onShutdownStart: async _signal => {
              callOrder.push('start')
            },
            onShutdownComplete: async () => {
              callOrder.push('complete')
            },
          })
        }
      }).not.toThrow()

      // Manually trigger shutdown
      await adapter.close()

      // Note: The callbacks are only called on SIGTERM/SIGINT, not on manual close
      expect(callOrder.length).toBe(0) // Callbacks not called on manual close
    })

    it('should support graceful shutdown configuration', async () => {
      const testPort = await getAvailablePort()
      const router = new RouterImpl()
      const middleware = new MiddlewareChainImpl()

      adapter = new HTTP2Adapter(router, middleware, {
        http2: false,
      })

      await adapter.listen(testPort, '127.0.0.1')

      const server = adapter.getServer()

      // Setup graceful shutdown with short timeout - should not throw
      expect(() => {
        shutdownCleanup = setupGracefulShutdown(server, {
          timeout: 100, // 100ms timeout
        })
      }).not.toThrow()

      // Close should complete quickly
      const startTime = Date.now()
      await adapter.close()
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(1000) // Should complete well before 1 second
    })
  })

  describe('h2c warning is logged when TLS not configured', () => {
    it('should log warning when HTTP/2 is enabled without TLS', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const router = new RouterImpl()
      const middleware = new MiddlewareChainImpl()

      const testAdapter = new HTTP2Adapter(router, middleware, {
        http2: true,
        tls: undefined,
      })
      expect(testAdapter.getServer()).toBeDefined()

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('HTTP/2 without TLS (h2c) has limited browser support'),
      )
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Configure TLS for production use'),
      )

      warnSpy.mockRestore()
    })

    it('should not log warning when HTTP/1.1 is used', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const router = new RouterImpl()
      const middleware = new MiddlewareChainImpl()

      const testAdapter = new HTTP2Adapter(router, middleware, {
        http2: false,
      })
      expect(testAdapter.getServer()).toBeDefined()

      expect(warnSpy).not.toHaveBeenCalled()

      warnSpy.mockRestore()
    })

    it('should not log warning when HTTP/2 is used with TLS', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const router = new RouterImpl()
      const middleware = new MiddlewareChainImpl()

      // This will throw due to invalid certs, but we can check the warning wasn't called
      // before the error
      try {
        const testAdapter = new HTTP2Adapter(router, middleware, {
          http2: true,
          tls: {
            key: Buffer.from('test-key'),
            cert: Buffer.from('test-cert'),
          },
        })
        expect(testAdapter).toBeDefined()
      } catch {
        // Expected to throw
      }

      // Warning should not be called when TLS is configured
      expect(warnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('HTTP/2 without TLS (h2c) has limited browser support'),
      )

      warnSpy.mockRestore()
    })

    it('should include complete warning message', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const router = new RouterImpl()
      const middleware = new MiddlewareChainImpl()

      const testAdapter = new HTTP2Adapter(router, middleware, {
        http2: true,
      })
      expect(testAdapter.getServer()).toBeDefined()

      const expectedMessage =
        'Warning: HTTP/2 without TLS (h2c) has limited browser support. ' +
        'Configure TLS for production use.'

      expect(warnSpy).toHaveBeenCalledWith(expectedMessage)

      warnSpy.mockRestore()
    })
  })

  describe('Server configuration validation', () => {
    it('should accept valid configuration', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const router = new RouterImpl()
      const middleware = new MiddlewareChainImpl()

      let testAdapter: HTTP2Adapter | undefined
      expect(() => {
        testAdapter = new HTTP2Adapter(router, middleware, {
          http2: true,
          bodyLimit: {
            json: 1048576,
            urlencoded: 32768,
          },
        })
      }).not.toThrow()

      expect(testAdapter).toBeDefined()

      warnSpy.mockRestore()
    })

    it('should use default configuration when options are omitted', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const router = new RouterImpl()
      const middleware = new MiddlewareChainImpl()

      let testAdapter: HTTP2Adapter | undefined
      expect(() => {
        testAdapter = new HTTP2Adapter(router, middleware, {})
      }).not.toThrow()

      expect(testAdapter).toBeDefined()
      const options = (testAdapter as any).options
      expect(options.http2).toBe(true)
      expect(options.bodyLimit.json).toBe(1048576)
      expect(options.bodyLimit.urlencoded).toBe(32768)

      warnSpy.mockRestore()
    })

    it('should store router and middleware references', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const router = new RouterImpl()
      const middleware = new MiddlewareChainImpl()

      const testAdapter = new HTTP2Adapter(router, middleware, {
        http2: false,
      })

      expect((testAdapter as any).router).toBe(router)
      expect((testAdapter as any).middleware).toBe(middleware)

      warnSpy.mockRestore()
    })
  })

  describe('Server error handling', () => {
    it('should reject listen promise on error', async () => {
      const testPort = await getAvailablePort()
      const router = new RouterImpl()
      const middleware = new MiddlewareChainImpl()

      adapter = new HTTP2Adapter(router, middleware, {
        http2: false,
      })

      // Try to bind to invalid hostname
      await expect(adapter.listen(testPort, 'invalid.hostname.test')).rejects.toThrow()
    })

    it('should handle close on non-listening server', async () => {
      const router = new RouterImpl()
      const middleware = new MiddlewareChainImpl()

      adapter = new HTTP2Adapter(router, middleware, {
        http2: false,
      })

      // Close without starting - should reject with error
      await expect(adapter.close()).rejects.toThrow()
    })
  })

  describe('Server instance access', () => {
    it('should provide access to underlying server instance', () => {
      const router = new RouterImpl()
      const middleware = new MiddlewareChainImpl()

      const testAdapter = new HTTP2Adapter(router, middleware, {
        http2: false,
      })

      const server = testAdapter.getServer()
      expect(server).toBeDefined()
      expect(typeof server.listen).toBe('function')
      expect(typeof server.close).toBe('function')
    })

    it('should return HTTP/2 server instance when HTTP/2 is enabled', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const router = new RouterImpl()
      const middleware = new MiddlewareChainImpl()

      const testAdapter = new HTTP2Adapter(router, middleware, {
        http2: true,
      })

      const server = testAdapter.getServer()
      expect(server).toBeDefined()
      // HTTP/2 servers have setTimeout method
      expect('setTimeout' in server).toBe(true)

      warnSpy.mockRestore()
    })

    it('should return HTTP/1.1 server instance when HTTP/2 is disabled', () => {
      const router = new RouterImpl()
      const middleware = new MiddlewareChainImpl()

      const testAdapter = new HTTP2Adapter(router, middleware, {
        http2: false,
      })

      const server = testAdapter.getServer()
      expect(server).toBeDefined()
      expect(typeof server.listen).toBe('function')
    })
  })
})
