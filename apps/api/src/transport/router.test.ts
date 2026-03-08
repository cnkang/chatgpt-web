/**
 * Router Implementation Tests
 *
 * Tests route registration, matching, and dual path compatibility.
 */

import { describe, expect, it } from 'vitest'
import { RouterImpl } from './router.js'
import type { MiddlewareHandler, RouteHandler } from './types.js'

describe('RouterImpl', () => {
  describe('Route Registration', () => {
    it('should register a route with addRoute', () => {
      const router = new RouterImpl()
      const handler: RouteHandler = async (_req, res) => {
        res.json({ message: 'test' })
      }

      router.addRoute({
        method: 'GET',
        path: '/test',
        middleware: [],
        handler,
      })

      const route = router.match('GET', '/test')
      expect(route).not.toBeNull()
      expect(route?.method).toBe('GET')
      expect(route?.path).toBe('/test')
      expect(route?.handler).toBe(handler)
    })

    it('should register GET route with convenience method', () => {
      const router = new RouterImpl()
      const handler: RouteHandler = async (_req, res) => {
        res.json({ message: 'test' })
      }

      router.get('/test', handler)

      const route = router.match('GET', '/test')
      expect(route).not.toBeNull()
      expect(route?.method).toBe('GET')
      expect(route?.path).toBe('/test')
    })

    it('should register POST route with convenience method', () => {
      const router = new RouterImpl()
      const handler: RouteHandler = async (_req, res) => {
        res.json({ message: 'test' })
      }

      router.post('/test', handler)

      const route = router.match('POST', '/test')
      expect(route).not.toBeNull()
      expect(route?.method).toBe('POST')
    })

    it('should register PUT route with convenience method', () => {
      const router = new RouterImpl()
      const handler: RouteHandler = async (_req, res) => {
        res.json({ message: 'test' })
      }

      router.put('/test', handler)

      const route = router.match('PUT', '/test')
      expect(route).not.toBeNull()
      expect(route?.method).toBe('PUT')
    })

    it('should register DELETE route with convenience method', () => {
      const router = new RouterImpl()
      const handler: RouteHandler = async (_req, res) => {
        res.json({ message: 'test' })
      }

      router.delete('/test', handler)

      const route = router.match('DELETE', '/test')
      expect(route).not.toBeNull()
      expect(route?.method).toBe('DELETE')
    })

    it('should separate middleware from handler', () => {
      const router = new RouterImpl()
      const middleware1: MiddlewareHandler = async (_req, _res, next) => {
        next()
      }
      const middleware2: MiddlewareHandler = async (_req, _res, next) => {
        next()
      }
      const handler: RouteHandler = async (_req, res) => {
        res.json({ message: 'test' })
      }

      router.get('/test', middleware1, middleware2, handler)

      const route = router.match('GET', '/test')
      expect(route).not.toBeNull()
      expect(route?.middleware).toHaveLength(2)
      expect(route?.middleware[0]).toBe(middleware1)
      expect(route?.middleware[1]).toBe(middleware2)
      expect(route?.handler).toBe(handler)
    })

    it('should throw error when registering route without handler', () => {
      const router = new RouterImpl()

      expect(() => {
        router.get('/test')
      }).toThrow('Route GET /test must have at least one handler')
    })

    it('should support method chaining', () => {
      const router = new RouterImpl()
      const handler: RouteHandler = async (_req, res) => {
        res.json({ message: 'test' })
      }

      router.get('/test1', handler).post('/test2', handler).put('/test3', handler)

      expect(router.match('GET', '/test1')).not.toBeNull()
      expect(router.match('POST', '/test2')).not.toBeNull()
      expect(router.match('PUT', '/test3')).not.toBeNull()
    })
  })

  describe('Route Matching', () => {
    it('should match exact path', () => {
      const router = new RouterImpl()
      const handler: RouteHandler = async (_req, res) => {
        res.json({ message: 'test' })
      }

      router.get('/test', handler)

      expect(router.match('GET', '/test')).not.toBeNull()
      expect(router.match('GET', '/other')).toBeNull()
    })

    it('should match method case-insensitively', () => {
      const router = new RouterImpl()
      const handler: RouteHandler = async (_req, res) => {
        res.json({ message: 'test' })
      }

      router.get('/test', handler)

      expect(router.match('GET', '/test')).not.toBeNull()
      expect(router.match('get', '/test')).not.toBeNull()
      expect(router.match('Get', '/test')).not.toBeNull()
    })

    it('should not match different methods', () => {
      const router = new RouterImpl()
      const handler: RouteHandler = async (_req, res) => {
        res.json({ message: 'test' })
      }

      router.get('/test', handler)

      expect(router.match('GET', '/test')).not.toBeNull()
      expect(router.match('POST', '/test')).toBeNull()
      expect(router.match('PUT', '/test')).toBeNull()
      expect(router.match('DELETE', '/test')).toBeNull()
    })

    it('should return null for unmatched routes', () => {
      const router = new RouterImpl()
      const handler: RouteHandler = async (_req, res) => {
        res.json({ message: 'test' })
      }

      router.get('/test', handler)

      expect(router.match('GET', '/nonexistent')).toBeNull()
      expect(router.match('POST', '/test')).toBeNull()
    })
  })

  describe('Dual Path Compatibility (Task 2.8)', () => {
    it('should match /api/path when route is registered as /path', () => {
      const router = new RouterImpl()
      const handler: RouteHandler = async (_req, res) => {
        res.json({ message: 'test' })
      }

      router.get('/health', handler)

      // Both paths should match
      expect(router.match('GET', '/health')).not.toBeNull()
      expect(router.match('GET', '/api/health')).not.toBeNull()
    })

    it('should match /path when route is registered as /api/path', () => {
      const router = new RouterImpl()
      const handler: RouteHandler = async (_req, res) => {
        res.json({ message: 'test' })
      }

      router.get('/api/health', handler)

      // Both paths should match
      expect(router.match('GET', '/api/health')).not.toBeNull()
      expect(router.match('GET', '/health')).not.toBeNull()
    })

    it('should normalize /api prefix for all routes', () => {
      const router = new RouterImpl()
      const handler: RouteHandler = async (_req, res) => {
        res.json({ message: 'test' })
      }

      router.get('/chat-process', handler)
      router.post('/config', handler)
      router.post('/session', handler)
      router.post('/verify', handler)

      // All routes should be accessible with and without /api prefix
      expect(router.match('GET', '/chat-process')).not.toBeNull()
      expect(router.match('GET', '/api/chat-process')).not.toBeNull()

      expect(router.match('POST', '/config')).not.toBeNull()
      expect(router.match('POST', '/api/config')).not.toBeNull()

      expect(router.match('POST', '/session')).not.toBeNull()
      expect(router.match('POST', '/api/session')).not.toBeNull()

      expect(router.match('POST', '/verify')).not.toBeNull()
      expect(router.match('POST', '/api/verify')).not.toBeNull()
    })

    it('should handle /api root path', () => {
      const router = new RouterImpl()
      const handler: RouteHandler = async (_req, res) => {
        res.json({ message: 'test' })
      }

      router.get('/', handler)

      // Both / and /api should match
      expect(router.match('GET', '/')).not.toBeNull()
      expect(router.match('GET', '/api')).not.toBeNull()
    })

    it('should not double-normalize paths', () => {
      const router = new RouterImpl()
      const handler: RouteHandler = async (_req, res) => {
        res.json({ message: 'test' })
      }

      router.get('/api/test', handler)

      // Should match both forms
      expect(router.match('GET', '/api/test')).not.toBeNull()
      expect(router.match('GET', '/test')).not.toBeNull()

      // Double prefix will normalize to /api/test which matches the route
      // This is expected behavior - /api/api/test -> /api/test (after normalization)
      expect(router.match('GET', '/api/api/test')).not.toBeNull()
    })

    it('should preserve path segments after /api', () => {
      const router = new RouterImpl()
      const handler: RouteHandler = async (_req, res) => {
        res.json({ message: 'test' })
      }

      router.get('/api/v1/users', handler)

      // Should match with and without /api prefix
      expect(router.match('GET', '/api/v1/users')).not.toBeNull()
      expect(router.match('GET', '/v1/users')).not.toBeNull()
    })
  })

  describe('Multiple Routes', () => {
    it('should handle multiple routes with different paths', () => {
      const router = new RouterImpl()
      const handler1: RouteHandler = async (_req, res) => {
        res.json({ message: 'test1' })
      }
      const handler2: RouteHandler = async (_req, res) => {
        res.json({ message: 'test2' })
      }

      router.get('/test1', handler1)
      router.get('/test2', handler2)

      const route1 = router.match('GET', '/test1')
      const route2 = router.match('GET', '/test2')

      expect(route1).not.toBeNull()
      expect(route2).not.toBeNull()
      expect(route1?.handler).toBe(handler1)
      expect(route2?.handler).toBe(handler2)
    })

    it('should handle multiple routes with same path but different methods', () => {
      const router = new RouterImpl()
      const getHandler: RouteHandler = async (_req, res) => {
        res.json({ message: 'get' })
      }
      const postHandler: RouteHandler = async (_req, res) => {
        res.json({ message: 'post' })
      }

      router.get('/test', getHandler)
      router.post('/test', postHandler)

      const getRoute = router.match('GET', '/test')
      const postRoute = router.match('POST', '/test')

      expect(getRoute).not.toBeNull()
      expect(postRoute).not.toBeNull()
      expect(getRoute?.handler).toBe(getHandler)
      expect(postRoute?.handler).toBe(postHandler)
    })
  })
})
