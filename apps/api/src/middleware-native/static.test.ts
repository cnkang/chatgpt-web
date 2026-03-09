/**
 * Static File Middleware Tests
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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

  it('should serve existing files before continuing the middleware chain', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'static-middleware-'))
    const filePath = join(tempDir, 'test.txt')
    writeFileSync(filePath, 'hello world', 'utf8')

    try {
      const middleware = createStaticFileMiddleware(tempDir)
      const req = createMockRequest({ method: 'GET', path: '/test.txt' })
      const res = createMockResponse()
      const next = vi.fn()

      await middleware(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(res._capture.headers.get('content-type')).toBe('text/plain; charset=utf-8')
      expect(res._capture.headers.get('content-length')).toBe(
        String(Buffer.byteLength('hello world')),
      )
      expect(res.write).toHaveBeenCalledWith(expect.any(Buffer))
      expect(res.end).toHaveBeenCalled()
      expect(res._capture.finished).toBe(true)
    } finally {
      rmSync(tempDir, { force: true, recursive: true })
    }
  })
})
