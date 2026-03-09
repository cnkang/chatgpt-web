/**
 * Input Validation Middleware for Native Routing
 *
 * Provides comprehensive input validation and sanitization using Zod schemas.
 * Implements XSS prevention through HTML entity escaping and prototype pollution
 * protection by blocking dangerous object keys.
 */

import type { ZodSchema } from 'zod'
import type { MiddlewareHandler, TransportRequest, TransportResponse } from '../transport/types.js'

/**
 * Keys whose values are AI content and must NOT be HTML-escaped.
 * These are sent to the AI provider as-is; XSS prevention is the
 * frontend renderer's responsibility (markdown-it, highlight.js, etc.).
 */
const AI_CONTENT_KEYS = new Set(['prompt', 'systemMessage', 'content', 'text', 'thought'])

/**
 * Object keys that are blocked to prevent prototype pollution attacks
 */
const BLOCKED_OBJECT_KEYS = new Set(['__proto__', 'prototype', 'constructor'])

/**
 * Sanitizes string input to prevent XSS attacks
 *
 * Escapes HTML entities (&, <, >, ", ') to prevent script injection.
 * Normalizes unicode with NFKC and removes null bytes.
 *
 * @param input - String to sanitize
 * @returns Sanitized string with HTML entities escaped
 */
export function sanitizeString(input: string): string {
  const entities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }

  return input
    .normalize('NFKC') // Normalize unicode to prevent bypass attempts
    .replaceAll('\0', '') // Remove null bytes
    .replaceAll(/[&<>"']/g, match => entities[match] ?? match) // Escape HTML entities
    .trim()
}

/**
 * Light sanitization for AI content fields
 *
 * Normalizes unicode and strips null bytes but preserves original characters
 * so code snippets and special formatting are not corrupted.
 *
 * @param input - AI content string to sanitize
 * @returns Lightly sanitized string
 */
function sanitizeAIContent(input: string): string {
  return input.normalize('NFKC').replaceAll('\0', '')
}

/**
 * Recursively sanitizes an object's string properties
 *
 * - Blocks __proto__, prototype, constructor keys to prevent prototype pollution
 * - Escapes HTML entities in regular strings
 * - Lightly sanitizes AI content fields (no HTML escaping)
 * - Recursively processes nested objects and arrays
 *
 * @param obj - Object to sanitize
 * @param parentKey - Parent key name (used to identify AI content fields)
 * @returns Sanitized object
 */
export function sanitizeObject(obj: unknown, parentKey?: string): unknown {
  // Sanitize strings based on context
  if (typeof obj === 'string') {
    return parentKey && AI_CONTENT_KEYS.has(parentKey)
      ? sanitizeAIContent(obj)
      : sanitizeString(obj)
  }

  // Recursively sanitize arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, parentKey))
  }

  // Recursively sanitize objects
  if (obj && typeof obj === 'object') {
    const sanitizedEntries = Object.entries(obj)
      .filter(([key]) => !BLOCKED_OBJECT_KEYS.has(key)) // Block dangerous keys
      .map(([key, value]) => [key, sanitizeObject(value, key)] as const)

    return Object.fromEntries(sanitizedEntries)
  }

  // Return primitives as-is
  return obj
}

/**
 * Creates validation middleware for request body
 *
 * Sanitizes the request body to prevent XSS attacks, then validates it
 * against the provided Zod schema. Returns 400 with validation errors
 * if validation fails.
 *
 * @param schema - Zod schema to validate against
 * @returns Middleware handler that validates and sanitizes request body
 *
 * @example
 * ```typescript
 * const chatSchema = z.object({
 *   prompt: z.string().min(1),
 *   temperature: z.number().min(0).max(2).optional()
 * })
 *
 * router.post('/api/chat', createValidationMiddleware(chatSchema), chatHandler)
 * ```
 */
export function createValidationMiddleware<T>(schema: ZodSchema<T>): MiddlewareHandler {
  return async (req: TransportRequest, res: TransportResponse, next) => {
    try {
      // First sanitize the request body to prevent XSS
      const sanitizedBody = sanitizeObject(req.body)

      // Then validate with Zod schema
      const result = schema.safeParse(sanitizedBody)

      if (!result.success) {
        // Extract validation errors
        const details = result.error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }))

        res.status(400).json({
          status: 'Fail',
          message: 'Validation failed',
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            type: 'ValidationError',
            details,
            timestamp: new Date().toISOString(),
          },
        })
        return
      }

      // Replace request body with validated and sanitized data
      req.body = result.data
      next()
    } catch (error) {
      res.status(500).json({
        status: 'Error',
        message: error instanceof Error ? error.message : 'Validation error occurred',
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          type: error instanceof Error ? error.constructor.name : 'Error',
          timestamp: new Date().toISOString(),
        },
      })
    }
  }
}
