/**
 * Unit tests for Input Validation Middleware
 */

import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import {
  createMockRequest as baseCreateMockRequest,
  createMockResponse as baseCreateMockResponse,
} from '../test/test-helpers.js'
import { createValidationMiddleware, sanitizeObject, sanitizeString } from './validation.js'

function createValidationRequest(body: unknown) {
  return baseCreateMockRequest({
    method: 'POST',
    path: '/api/test',
    body,
  })
}

function createValidationResponse() {
  return baseCreateMockResponse()
}

async function runValidation(schema: z.ZodTypeAny, body: unknown) {
  const middleware = createValidationMiddleware(schema)
  const req = createValidationRequest(body)
  const res = createValidationResponse()
  const next = vi.fn()

  await middleware(req, res, next)

  return { req, res, next }
}

function expectValidationFailure(
  res: ReturnType<typeof createValidationResponse>,
  detailsMatcher?: unknown,
) {
  expect(res._capture.statusCode).toBe(400)
  expect(res._capture.body).toMatchObject({
    status: 'Fail',
    message: 'Validation failed',
    data: null,
    error: {
      code: 'VALIDATION_ERROR',
      type: 'ValidationError',
      ...(detailsMatcher === undefined ? {} : { details: detailsMatcher }),
    },
  })
}

describe('sanitizeString', () => {
  it.each([
    ['<script>alert("XSS")</script>', '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'],
    ['Tom & Jerry', 'Tom &amp; Jerry'],
    ["It's a test", 'It&#39;s a test'],
    ['He said "hello"', 'He said &quot;hello&quot;'],
    ['test\0string', 'teststring'],
    ['\u00BD', '1⁄2'],
    ['  test  ', 'test'],
    ['', ''],
  ])('should sanitize %j into %j', (input, expected) => {
    expect(sanitizeString(input)).toBe(expected)
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
    expect(Object.getPrototypeOf(result)).not.toHaveProperty('admin')
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

    const { req, next } = await runValidation(schema, { name: 'John', age: 25 })

    expect(next).toHaveBeenCalledOnce()
    expect(req.body).toEqual({ name: 'John', age: 25 })
  })

  it('should sanitize XSS in request body before validation', async () => {
    const schema = z.object({
      name: z.string(),
    })

    const { req, next } = await runValidation(schema, {
      name: '<script>alert("XSS")</script>',
    })

    expect(next).toHaveBeenCalledOnce()
    expect(req.body).toEqual({ name: '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;' })
  })

  it('should return 400 for validation errors', async () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    })

    const { res, next } = await runValidation(schema, { name: 'John' })

    expect(next).not.toHaveBeenCalled()
    expectValidationFailure(
      res,
      expect.arrayContaining([
        expect.objectContaining({
          field: 'age',
          code: 'invalid_type',
        }),
      ]),
    )
  })

  it('should return 400 for invalid field types', async () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    })

    const { res, next } = await runValidation(schema, {
      name: 'John',
      age: 'twenty-five',
    })

    expect(next).not.toHaveBeenCalled()
    expectValidationFailure(
      res,
      expect.arrayContaining([
        expect.objectContaining({
          field: 'age',
          code: 'invalid_type',
        }),
      ]),
    )
  })

  it('should return 400 for multiple validation errors', async () => {
    const schema = z.object({
      name: z.string().min(3),
      age: z.number().min(18),
      email: z.string().email(),
    })

    const { res, next } = await runValidation(schema, {
      name: 'Jo', // Too short
      age: 15, // Too young
      email: 'invalid-email', // Invalid format
    })

    expect(next).not.toHaveBeenCalled()
    expectValidationFailure(res)
    const errors = (res._capture.body as { error: { details: unknown[] } }).error.details
    expect(errors).toHaveLength(3)
  })

  it('should block prototype pollution attempts', async () => {
    const schema = z.object({
      name: z.string(),
    })

    const { req, next } = await runValidation(schema, {
      name: 'test',
      __proto__: { admin: true },
    })

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

    const { req, next } = await runValidation(schema, {
      user: {
        name: '<script>alert(1)</script>',
        profile: {
          bio: '<img src=x>',
        },
      },
    })

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

    const { req, next } = await runValidation(schema, {
      prompt: 'Write code: <script>alert(1)</script>',
      systemMessage: 'You are <strong>powerful</strong>',
      regularField: '<script>alert(1)</script>',
    })

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

    const { req, next } = await runValidation(schema, {
      tags: ['<script>alert(1)</script>', 'normal', '<img src=x>'],
    })

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
    const req = createValidationRequest({ name: 'test' })
    const res = createValidationResponse()
    const next = vi.fn()

    // Force an error by making safeParse throw
    vi.spyOn(schema, 'safeParse').mockImplementation(() => {
      throw new Error('Unexpected error')
    })

    await middleware(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res._capture.statusCode).toBe(500)
    expect(res._capture.body).toMatchObject({
      status: 'Error',
      message: 'Unexpected error',
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
      },
    })
  })

  it('should handle optional fields', async () => {
    const schema = z.object({
      name: z.string(),
      age: z.number().optional(),
    })

    const { req, next } = await runValidation(schema, { name: 'John' })

    expect(next).toHaveBeenCalledOnce()
    expect(req.body).toEqual({ name: 'John' })
  })

  it('should handle default values', async () => {
    const schema = z.object({
      name: z.string(),
      age: z.number().default(18),
    })

    const { req, next } = await runValidation(schema, { name: 'John' })

    expect(next).toHaveBeenCalledOnce()
    expect(req.body).toEqual({ name: 'John', age: 18 })
  })
})
