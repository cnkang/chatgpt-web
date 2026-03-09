/**
 * Static File Middleware Tests
 */

import { describe, expect, it, vi } from 'vitest'
import { createMockRequest, createMockResponse } from '../test/test-helpers.js'
import { createStaticFileMiddleware } from './static.js'

describe('Static File Middleware', () => {
  async function expectPassthrough(method: string, path: string) {
    const middleware = createStaticFileMiddleware('/tmp')
    const req = createMockRequest({ method, path })
    const res = createMockResponse()
    const next = vi.fn()

    await middleware(req, res, next)

    expect(next).toHaveBeenCalledOnce()
  }

  it('should pass through non-GET requests', async () => {
    await expectPassthrough('POST', '/test.html')
  })

  it('should pass through for non-existent files', async () => {
    await expectPassthrough('GET', '/nonexistent-file-12345.html')
  })

  it('should prevent directory traversal attacks', async () => {
    await expectPassthrough('GET', '/../../../etc/passwd')
  })
})
