/**
 * Router Implementation Tests
 *
 * Tests route registration, matching, and dual path compatibility.
 */

import { describe, expect, it } from 'vitest'
import { RouterImpl } from './router.js'
import type { MiddlewareHandler, RouteHandler } from './types.js'

function createHandler(message = 'test'): RouteHandler {
  return async (_req, res) => {
    res.json({ message })
  }
}

function createRouterWithRoute(method: 'get' | 'post' | 'put' | 'delete', path: string) {
  const router = new RouterImpl()
  const handler = createHandler(`${method}:${path}`)
  router[method](path, handler)
  return { router, handler }
}

describe('RouterImpl', () => {
  describe('Route Registration', () => {
    it('should register a route with addRoute', () => {
      const router = new RouterImpl()
      const handler = createHandler()

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

    it.each([
      ['get', 'GET'],
      ['post', 'POST'],
      ['put', 'PUT'],
      ['delete', 'DELETE'],
    ] as const)('should register %s route with convenience method', (method, expectedMethod) => {
      const { router } = createRouterWithRoute(method, '/test')

      const route = router.match(expectedMethod, '/test')
      expect(route).not.toBeNull()
      expect(route?.method).toBe(expectedMethod)
      expect(route?.path).toBe('/test')
    })

    it('should separate middleware from handler', () => {
      const router = new RouterImpl()
      const middleware1: MiddlewareHandler = async (_req, _res, next) => {
        next()
      }
      const middleware2: MiddlewareHandler = async (_req, _res, next) => {
        next()
      }
      const handler = createHandler()

      router.get('/test', middleware1, middleware2, handler)

      const route = router.match('GET', '/test')
      expect(route).not.toBeNull()
      expect(route?.middleware).toEqual([middleware1, middleware2])
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
      const handler = createHandler()

      router.get('/test1', handler).post('/test2', handler).put('/test3', handler)

      expect(router.match('GET', '/test1')).not.toBeNull()
      expect(router.match('POST', '/test2')).not.toBeNull()
      expect(router.match('PUT', '/test3')).not.toBeNull()
    })
  })

  describe('Route Matching', () => {
    it('should match exact path and return null for other paths', () => {
      const { router } = createRouterWithRoute('get', '/test')

      expect(router.match('GET', '/test')).not.toBeNull()
      expect(router.match('GET', '/other')).toBeNull()
    })

    it.each(['GET', 'get', 'Get'])(
      'should match method case-insensitively for %s',
      candidateMethod => {
        const { router } = createRouterWithRoute('get', '/test')
        expect(router.match(candidateMethod, '/test')).not.toBeNull()
      },
    )

    it.each(['POST', 'PUT', 'DELETE'])('should not match different method %s', method => {
      const { router } = createRouterWithRoute('get', '/test')
      expect(router.match(method, '/test')).toBeNull()
    })

    it('should return null for unmatched routes', () => {
      const { router } = createRouterWithRoute('get', '/test')

      expect(router.match('GET', '/nonexistent')).toBeNull()
      expect(router.match('POST', '/test')).toBeNull()
    })
  })

  describe('Dual Path Compatibility (Task 2.8)', () => {
    it.each([
      ['/health', ['/health', '/api/health']],
      ['/api/health', ['/api/health', '/health']],
      ['/', ['/', '/api']],
      ['/api/test', ['/api/test', '/test', '/api/api/test']],
      ['/api/v1/users', ['/api/v1/users', '/v1/users']],
    ] as const)('should support normalized aliases for %s', (registeredPath, matchedPaths) => {
      const { router } = createRouterWithRoute('get', registeredPath)

      for (const path of matchedPaths) {
        expect(router.match('GET', path)).not.toBeNull()
      }
    })

    it('should normalize /api prefix for all routes', () => {
      const router = new RouterImpl()

      router.get('/chat-process', createHandler('chat'))
      router.post('/config', createHandler('config'))
      router.post('/session', createHandler('session'))
      router.post('/verify', createHandler('verify'))

      expect(router.match('GET', '/chat-process')).not.toBeNull()
      expect(router.match('GET', '/api/chat-process')).not.toBeNull()
      expect(router.match('POST', '/config')).not.toBeNull()
      expect(router.match('POST', '/api/config')).not.toBeNull()
      expect(router.match('POST', '/session')).not.toBeNull()
      expect(router.match('POST', '/api/session')).not.toBeNull()
      expect(router.match('POST', '/verify')).not.toBeNull()
      expect(router.match('POST', '/api/verify')).not.toBeNull()
    })
  })

  describe('Multiple Routes', () => {
    it('should handle multiple routes with different paths', () => {
      const router = new RouterImpl()
      const handler1 = createHandler('test1')
      const handler2 = createHandler('test2')

      router.get('/test1', handler1)
      router.get('/test2', handler2)

      expect(router.match('GET', '/test1')?.handler).toBe(handler1)
      expect(router.match('GET', '/test2')?.handler).toBe(handler2)
    })

    it('should handle multiple routes with same path but different methods', () => {
      const router = new RouterImpl()
      const getHandler = createHandler('get')
      const postHandler = createHandler('post')

      router.get('/test', getHandler)
      router.post('/test', postHandler)

      expect(router.match('GET', '/test')?.handler).toBe(getHandler)
      expect(router.match('POST', '/test')?.handler).toBe(postHandler)
    })
  })
})
