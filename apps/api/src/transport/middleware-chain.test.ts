/**
 * Middleware Chain Implementation Tests
 *
 * Tests middleware execution order, error propagation, and response handling.
 */

import { describe, expect, it, vi } from 'vitest'
import { MiddlewareChainImpl } from './middleware-chain.js'
import type { TransportRequest, TransportResponse } from './types.js'

// Mock request and response for testing
function createMockRequest(): TransportRequest {
  return {
    method: 'GET',
    path: '/test',
    url: new URL('http://localhost/test'),
    headers: new Headers(),
    body: null,
    ip: '127.0.0.1',
    getHeader: (_name: string) => undefined,
    getQuery: (_name: string) => undefined,
  }
}

function createMockResponse(): TransportResponse {
  let _headersSent = false
  let _finished = false

  return {
    status: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    getHeader: vi.fn(),
    json: vi.fn(() => {
      _headersSent = true
      _finished = true
    }),
    send: vi.fn(() => {
      _headersSent = true
      _finished = true
    }),
    write: vi.fn(() => {
      _headersSent = true
      return true
    }),
    end: vi.fn(() => {
      _finished = true
    }),
    get headersSent() {
      return _headersSent
    },
    get finished() {
      return _finished
    },
  }
}

describe('MiddlewareChainImpl', () => {
  describe('Middleware Registration', () => {
    it('should add middleware to the chain', () => {
      const chain = new MiddlewareChainImpl()
      const middleware = vi.fn(async (_req, _res, next) => {
        next()
      })

      chain.use(middleware)

      expect(chain).toBeDefined()
    })

    it('should support method chaining', () => {
      const chain = new MiddlewareChainImpl()
      const middleware1 = vi.fn(async (_req, _res, next) => {
        next()
      })
      const middleware2 = vi.fn(async (_req, _res, next) => {
        next()
      })

      const result = chain.use(middleware1).use(middleware2)

      expect(result).toBe(chain)
    })
  })

  describe('Middleware Execution', () => {
    it('should execute middleware in order', async () => {
      const chain = new MiddlewareChainImpl()
      const req = createMockRequest()
      const res = createMockResponse()
      const executionOrder: number[] = []

      const middleware1 = vi.fn(async (_req, _res, next) => {
        executionOrder.push(1)
        next()
      })
      const middleware2 = vi.fn(async (_req, _res, next) => {
        executionOrder.push(2)
        next()
      })
      const middleware3 = vi.fn(async (_req, _res, next) => {
        executionOrder.push(3)
        next()
      })

      chain.use(middleware1).use(middleware2).use(middleware3)

      await chain.execute(req, res)

      expect(executionOrder).toEqual([1, 2, 3])
      expect(middleware1).toHaveBeenCalledTimes(1)
      expect(middleware2).toHaveBeenCalledTimes(1)
      expect(middleware3).toHaveBeenCalledTimes(1)
    })

    it('should pass request and response to each middleware', async () => {
      const chain = new MiddlewareChainImpl()
      const req = createMockRequest()
      const res = createMockResponse()

      const middleware = vi.fn(async (r, s, next) => {
        expect(r).toBe(req)
        expect(s).toBe(res)
        next()
      })

      chain.use(middleware)

      await chain.execute(req, res)

      expect(middleware).toHaveBeenCalledWith(req, res, expect.any(Function))
    })

    it('should stop execution when middleware does not call next', async () => {
      const chain = new MiddlewareChainImpl()
      const req = createMockRequest()
      const res = createMockResponse()

      const middleware1 = vi.fn(async (_req, _res, _next) => {
        // Don't call next - stop execution
      })
      const middleware2 = vi.fn(async (_req, _res, next) => {
        next()
      })

      chain.use(middleware1).use(middleware2)

      await chain.execute(req, res)

      expect(middleware1).toHaveBeenCalledTimes(1)
      expect(middleware2).not.toHaveBeenCalled()
    })

    it('should stop execution when response is sent', async () => {
      const chain = new MiddlewareChainImpl()
      const req = createMockRequest()
      const res = createMockResponse()

      const middleware1 = vi.fn(async (_req, r, next) => {
        r.json({ message: 'test' })
        next()
      })
      const middleware2 = vi.fn(async (_req, _res, next) => {
        next()
      })

      chain.use(middleware1).use(middleware2)

      await chain.execute(req, res)

      expect(middleware1).toHaveBeenCalledTimes(1)
      expect(middleware2).not.toHaveBeenCalled()
      expect(res.json).toHaveBeenCalledWith({ message: 'test' })
    })

    it('should stop execution when headers are sent', async () => {
      const chain = new MiddlewareChainImpl()
      const req = createMockRequest()
      const res = createMockResponse()

      const middleware1 = vi.fn(async (_req, r, next) => {
        r.write('chunk')
        next()
      })
      const middleware2 = vi.fn(async (_req, _res, next) => {
        next()
      })

      chain.use(middleware1).use(middleware2)

      await chain.execute(req, res)

      expect(middleware1).toHaveBeenCalledTimes(1)
      expect(middleware2).not.toHaveBeenCalled()
      expect(res.write).toHaveBeenCalledWith('chunk')
    })

    it('should handle async middleware', async () => {
      const chain = new MiddlewareChainImpl()
      const req = createMockRequest()
      const res = createMockResponse()
      const executionOrder: number[] = []

      const middleware1 = vi.fn(async (_req, _res, next) => {
        await new Promise(resolve => setTimeout(resolve, 10))
        executionOrder.push(1)
        next()
      })
      const middleware2 = vi.fn(async (_req, _res, next) => {
        await new Promise(resolve => setTimeout(resolve, 10))
        executionOrder.push(2)
        next()
      })

      chain.use(middleware1).use(middleware2)

      await chain.execute(req, res)

      expect(executionOrder).toEqual([1, 2])
    })

    it('should handle synchronous middleware', async () => {
      const chain = new MiddlewareChainImpl()
      const req = createMockRequest()
      const res = createMockResponse()
      const executionOrder: number[] = []

      const middleware1 = vi.fn((_req, _res, next) => {
        executionOrder.push(1)
        next()
      })
      const middleware2 = vi.fn((_req, _res, next) => {
        executionOrder.push(2)
        next()
      })

      chain.use(middleware1).use(middleware2)

      await chain.execute(req, res)

      expect(executionOrder).toEqual([1, 2])
    })

    it('should handle empty middleware chain', async () => {
      const chain = new MiddlewareChainImpl()
      const req = createMockRequest()
      const res = createMockResponse()

      await expect(chain.execute(req, res)).resolves.toBeUndefined()
    })
  })

  describe('Error Propagation', () => {
    it('should propagate errors thrown in middleware', async () => {
      const chain = new MiddlewareChainImpl()
      const req = createMockRequest()
      const res = createMockResponse()

      const middleware = vi.fn(async (_req, _res, _next) => {
        throw new Error('Test error')
      })

      chain.use(middleware)

      await expect(chain.execute(req, res)).rejects.toThrow('Test error')
    })

    it('should propagate errors passed to next()', async () => {
      const chain = new MiddlewareChainImpl()
      const req = createMockRequest()
      const res = createMockResponse()

      const middleware = vi.fn(async (_req, _res, next) => {
        next(new Error('Test error'))
      })

      chain.use(middleware)

      await expect(chain.execute(req, res)).rejects.toThrow('Test error')
    })

    it('should stop execution after error', async () => {
      const chain = new MiddlewareChainImpl()
      const req = createMockRequest()
      const res = createMockResponse()

      const middleware1 = vi.fn(async (_req, _res, next) => {
        next(new Error('Test error'))
      })
      const middleware2 = vi.fn(async (_req, _res, next) => {
        next()
      })

      chain.use(middleware1).use(middleware2)

      await expect(chain.execute(req, res)).rejects.toThrow('Test error')
      expect(middleware1).toHaveBeenCalledTimes(1)
      expect(middleware2).not.toHaveBeenCalled()
    })

    it('should propagate errors from async middleware', async () => {
      const chain = new MiddlewareChainImpl()
      const req = createMockRequest()
      const res = createMockResponse()

      const middleware = vi.fn(async (_req, _res, _next) => {
        await new Promise(resolve => setTimeout(resolve, 10))
        throw new Error('Async error')
      })

      chain.use(middleware)

      await expect(chain.execute(req, res)).rejects.toThrow('Async error')
    })
  })

  describe('Edge Cases', () => {
    it('should handle middleware that calls next multiple times', async () => {
      const chain = new MiddlewareChainImpl()
      const req = createMockRequest()
      const res = createMockResponse()
      let callCount = 0

      const middleware1 = vi.fn(async (_req, _res, next) => {
        next()
        next() // Second call should be ignored
      })
      const middleware2 = vi.fn(async (_req, _res, next) => {
        callCount++
        next()
      })

      chain.use(middleware1).use(middleware2)

      await chain.execute(req, res)

      // middleware2 should only be called once despite middleware1 calling next twice
      expect(callCount).toBe(1)
    })

    it('should not execute middleware after response is finished', async () => {
      const chain = new MiddlewareChainImpl()
      const req = createMockRequest()
      const res = createMockResponse()

      const middleware1 = vi.fn(async (_req, r, next) => {
        r.json({ message: 'done' })
        next()
      })
      const middleware2 = vi.fn(async (_req, _res, next) => {
        next()
      })

      chain.use(middleware1).use(middleware2)

      await chain.execute(req, res)

      expect(middleware2).not.toHaveBeenCalled()
    })
  })
})
