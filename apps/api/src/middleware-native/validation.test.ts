/**
 * Unit tests for Input Validation Middleware
 */

import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import type { TransportRequest, TransportResponse } from '../transport/types.js'
import { createValidationMiddleware, sanitizeObject, sanitizeString } from './validation.js'

/**
 * Creates a mock TransportRequest for testing
 */
function createMockRequest(body: unknown): TransportRequest {
  return {
    method: 'POST',
    path: '/api/test',
    url: new URL('http://localhost:3002/api/test'),
    headers: new Headers(),
    body,
    ip: '127.0.0.1',
    getHeader: () => undefined,
    getQuery: () => undefined,
  }
}

/**
 * Creates a mock TransportResponse for testing
 */
function createMockResponse(): TransportResponse & {
  statusCode: number
  jsonData: unknown
} {
  let statusCode = 200
  let jsonData: unknown = null

  return {
    statusCode,
    jsonData,
    status(code: number) {
      statusCode = code
      this.statusCode = code
      return this
    },
    setHeader: vi.fn().mockReturnThis(),
    getHeader: vi.fn(),
    json(data: unknown) {
      jsonData = data
      this.jsonData = data
    },
    send: vi.fn(),
    write: vi.fn(),
    end: vi.fn(),
    headersSent: false,
    finished: false,
  }
}

describe('sanitizeString', () => {
  it('should escape HTML entities', () => {
    const input = '<script>alert("XSS")</script>'
    const result = sanitizeString(input)
    expect(result).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;')
  })

  it('should escape ampersands', () => {
    const input = 'Tom & Jerry'
    const result = sanitizeString(input)
    expect(result).toBe('Tom &amp; Jerry')
  })

  it('should escape single quotes', () => {
    const input = "It's a test"
    const result = sanitizeString(input)
    expect(result).toBe('It&#39;s a test')
  })

  it('should escape double quotes', () => {
    const input = 'He said "hello"'
    const result = sanitizeString(input)
    expect(result).toBe('He said &quot;hello&quot;')
  })

  it('should remove null bytes', () => {
    const input = 'test\0string'
    const result = sanitizeString(input)
    expect(result).not.toContain('\0')
    expect(result).toBe('teststring')
  })

  it('should normalize unicode with NFKC', () => {
    const input = '\u00BD' // ½ (vulgar fraction one half)
    const result = sanitizeString(input)
    expect(result).toBe('1⁄2') // Normalized form
  })

  it('should trim whitespace', () => {
    const input = '  test  '
    const result = sanitizeString(input)
    expect(result).toBe('test')
  })

  it('should handle empty strings', () => {
    const input = ''
    const result = sanitizeString(input)
    expect(result).toBe('')
  })

  it('should handle strings with multiple dangerous characters', () => {
    const input = '<div class="test" onclick=\'alert("xss")\'>&nbsp;</div>'
    const result = sanitizeString(input)
    expect(result).toBe(
      '&lt;div class=&quot;test&quot; onclick=&#39;alert(&quot;xss&quot;)&#39;&gt;&amp;nbsp;&lt;/div&gt;',
    )
  })
})

describe('sanitizeObject', () => {
  it('should sanitize string properties', () => {
    const input = {
      name: '<script>alert("XSS")</script>',
      description: 'Normal text',
    }
    const result = sanitizeObject(input)
    expect(result).toEqual({
      name: '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;',
      description: 'Normal text',
    })
  })

  it('should block __proto__ key', () => {
    const input = {
      name: 'test',
      __proto__: { admin: true },
    }
    const result = sanitizeObject(input) as Record<string, unknown>
    expect(result).toEqual({ name: 'test' })
    expect(result.__proto__).not.toHaveProperty('admin')
  })

  it('should block prototype key', () => {
    const input = {
      name: 'test',
      prototype: { admin: true },
    }
    const result = sanitizeObject(input)
    expect(result).toEqual({ name: 'test' })
  })

  it('should block constructor key', () => {
    const input = {
      name: 'test',
      constructor: { admin: true },
    }
    const result = sanitizeObject(input)
    expect(result).toEqual({ name: 'test' })
  })

  it('should recursively sanitize nested objects', () => {
    const input = {
      user: {
        name: '<script>alert("XSS")</script>',
        profile: {
          bio: '<img src=x onerror=alert(1)>',
        },
      },
    }
    const result = sanitizeObject(input)
    expect(result).toEqual({
      user: {
        name: '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;',
        profile: {
          bio: '&lt;img src=x onerror=alert(1)&gt;',
        },
      },
    })
  })

  it('should sanitize arrays', () => {
    const input = {
      tags: ['<script>alert(1)</script>', 'normal', '<img src=x>'],
    }
    const result = sanitizeObject(input)
    expect(result).toEqual({
      tags: ['&lt;script&gt;alert(1)&lt;/script&gt;', 'normal', '&lt;img src=x&gt;'],
    })
  })

  it('should preserve AI content fields without HTML escaping', () => {
    const input = {
      prompt: 'Write a function: <script>alert(1)</script>',
      systemMessage: 'You are a helpful assistant with <strong>powers</strong>',
      content: 'Code: <div>test</div>',
      text: 'Text with <tags>',
      thought: 'Thinking about <concepts>',
      regularField: '<script>alert(1)</script>',
    }
    const result = sanitizeObject(input)
    expect(result).toEqual({
      prompt: 'Write a function: <script>alert(1)</script>', // Not escaped
      systemMessage: 'You are a helpful assistant with <strong>powers</strong>', // Not escaped
      content: 'Code: <div>test</div>', // Not escaped
      text: 'Text with <tags>', // Not escaped
      thought: 'Thinking about <concepts>', // Not escaped
      regularField: '&lt;script&gt;alert(1)&lt;/script&gt;', // Escaped
    })
  })

  it('should handle null values', () => {
    const input = {
      name: 'test',
      value: null,
    }
    const result = sanitizeObject(input)
    expect(result).toEqual({
      name: 'test',
      value: null,
    })
  })

  it('should handle undefined values', () => {
    const input = {
      name: 'test',
      value: undefined,
    }
    const result = sanitizeObject(input)
    expect(result).toEqual({
      name: 'test',
      value: undefined,
    })
  })

  it('should handle number values', () => {
    const input = {
      name: 'test',
      age: 25,
      score: 3.14,
    }
    const result = sanitizeObject(input)
    expect(result).toEqual({
      name: 'test',
      age: 25,
      score: 3.14,
    })
  })

  it('should handle boolean values', () => {
    const input = {
      name: 'test',
      active: true,
      deleted: false,
    }
    const result = sanitizeObject(input)
    expect(result).toEqual({
      name: 'test',
      active: true,
      deleted: false,
    })
  })

  it('should handle mixed arrays', () => {
    const input = {
      data: ['<script>alert(1)</script>', 123, true, null, { key: '<img src=x>' }],
    }
    const result = sanitizeObject(input)
    expect(result).toEqual({
      data: [
        '&lt;script&gt;alert(1)&lt;/script&gt;',
        123,
        true,
        null,
        { key: '&lt;img src=x&gt;' },
      ],
    })
  })
})

describe('createValidationMiddleware', () => {
  it('should validate and sanitize valid request body', async () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    })

    const middleware = createValidationMiddleware(schema)
    const req = createMockRequest({ name: 'John', age: 25 })
    const res = createMockResponse()
    const next = vi.fn()

    await middleware(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(req.body).toEqual({ name: 'John', age: 25 })
  })

  it('should sanitize XSS in request body before validation', async () => {
    const schema = z.object({
      name: z.string(),
    })

    const middleware = createValidationMiddleware(schema)
    const req = createMockRequest({ name: '<script>alert("XSS")</script>' })
    const res = createMockResponse()
    const next = vi.fn()

    await middleware(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(req.body).toEqual({ name: '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;' })
  })

  it('should return 400 for validation errors', async () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    })

    const middleware = createValidationMiddleware(schema)
    const req = createMockRequest({ name: 'John' }) // Missing age
    const res = createMockResponse()
    const next = vi.fn()

    await middleware(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(400)
    expect(res.jsonData).toMatchObject({
      status: 'Fail',
      message: 'Validation failed',
      data: null,
      errors: expect.arrayContaining([
        expect.objectContaining({
          field: 'age',
          code: 'invalid_type',
        }),
      ]),
    })
  })

  it('should return 400 for invalid field types', async () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    })

    const middleware = createValidationMiddleware(schema)
    const req = createMockRequest({ name: 'John', age: 'twenty-five' }) // Wrong type
    const res = createMockResponse()
    const next = vi.fn()

    await middleware(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(400)
    expect(res.jsonData).toMatchObject({
      status: 'Fail',
      message: 'Validation failed',
      data: null,
      errors: expect.arrayContaining([
        expect.objectContaining({
          field: 'age',
          code: 'invalid_type',
        }),
      ]),
    })
  })

  it('should return 400 for multiple validation errors', async () => {
    const schema = z.object({
      name: z.string().min(3),
      age: z.number().min(18),
      email: z.string().email(),
    })

    const middleware = createValidationMiddleware(schema)
    const req = createMockRequest({
      name: 'Jo', // Too short
      age: 15, // Too young
      email: 'invalid-email', // Invalid format
    })
    const res = createMockResponse()
    const next = vi.fn()

    await middleware(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(400)
    expect(res.jsonData).toMatchObject({
      status: 'Fail',
      message: 'Validation failed',
      data: null,
    })
    const errors = (res.jsonData as { errors: unknown[] }).errors
    expect(errors).toHaveLength(3)
  })

  it('should block prototype pollution attempts', async () => {
    const schema = z.object({
      name: z.string(),
    })

    const middleware = createValidationMiddleware(schema)
    const req = createMockRequest({
      name: 'test',
      __proto__: { admin: true },
    })
    const res = createMockResponse()
    const next = vi.fn()

    await middleware(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(req.body).toEqual({ name: 'test' })
    expect(req.body).not.toHaveProperty('__proto__')
  })

  it('should handle nested object validation', async () => {
    const schema = z.object({
      user: z.object({
        name: z.string(),
        profile: z.object({
          bio: z.string(),
        }),
      }),
    })

    const middleware = createValidationMiddleware(schema)
    const req = createMockRequest({
      user: {
        name: '<script>alert(1)</script>',
        profile: {
          bio: '<img src=x>',
        },
      },
    })
    const res = createMockResponse()
    const next = vi.fn()

    await middleware(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(req.body).toEqual({
      user: {
        name: '&lt;script&gt;alert(1)&lt;/script&gt;',
        profile: {
          bio: '&lt;img src=x&gt;',
        },
      },
    })
  })

  it('should preserve AI content fields without HTML escaping', async () => {
    const schema = z.object({
      prompt: z.string(),
      systemMessage: z.string().optional(),
      regularField: z.string(),
    })

    const middleware = createValidationMiddleware(schema)
    const req = createMockRequest({
      prompt: 'Write code: <script>alert(1)</script>',
      systemMessage: 'You are <strong>powerful</strong>',
      regularField: '<script>alert(1)</script>',
    })
    const res = createMockResponse()
    const next = vi.fn()

    await middleware(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(req.body).toEqual({
      prompt: 'Write code: <script>alert(1)</script>', // Not escaped
      systemMessage: 'You are <strong>powerful</strong>', // Not escaped
      regularField: '&lt;script&gt;alert(1)&lt;/script&gt;', // Escaped
    })
  })

  it('should handle array validation', async () => {
    const schema = z.object({
      tags: z.array(z.string()),
    })

    const middleware = createValidationMiddleware(schema)
    const req = createMockRequest({
      tags: ['<script>alert(1)</script>', 'normal', '<img src=x>'],
    })
    const res = createMockResponse()
    const next = vi.fn()

    await middleware(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(req.body).toEqual({
      tags: ['&lt;script&gt;alert(1)&lt;/script&gt;', 'normal', '&lt;img src=x&gt;'],
    })
  })

  it('should return 500 for unexpected errors', async () => {
    const schema = z.object({
      name: z.string(),
    })

    const middleware = createValidationMiddleware(schema)
    const req = createMockRequest({ name: 'test' })
    const res = createMockResponse()
    const next = vi.fn()

    // Force an error by making safeParse throw
    vi.spyOn(schema, 'safeParse').mockImplementation(() => {
      throw new Error('Unexpected error')
    })

    await middleware(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(500)
    expect(res.jsonData).toMatchObject({
      status: 'Fail',
      message: 'Validation error occurred',
      data: null,
    })
  })

  it('should handle optional fields', async () => {
    const schema = z.object({
      name: z.string(),
      age: z.number().optional(),
    })

    const middleware = createValidationMiddleware(schema)
    const req = createMockRequest({ name: 'John' })
    const res = createMockResponse()
    const next = vi.fn()

    await middleware(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(req.body).toEqual({ name: 'John' })
  })

  it('should handle default values', async () => {
    const schema = z.object({
      name: z.string(),
      age: z.number().default(18),
    })

    const middleware = createValidationMiddleware(schema)
    const req = createMockRequest({ name: 'John' })
    const res = createMockResponse()
    const next = vi.fn()

    await middleware(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(req.body).toEqual({ name: 'John', age: 18 })
  })
})
