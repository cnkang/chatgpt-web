/**
 * Validation middleware for Express routes
 * Provides comprehensive input validation and sanitization using Zod schemas
 */

import type { NextFunction, Request, Response } from 'express'
import type { ZodSchema } from 'zod'

import DOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'

// Initialize DOMPurify with JSDOM for server-side usage
const window = new JSDOM('').window
const purify = DOMPurify(window as unknown as Window & typeof globalThis)

/**
 * Validation error response interface
 */
interface ValidationErrorResponse {
  status: 'Fail'
  message: string
  data: null
  errors?: Array<{
    field: string
    message: string
    code: string
  }>
}

/**
 * Sanitizes string input to prevent XSS attacks
 */
function sanitizeString(input: string): string {
  // First pass: DOMPurify sanitization
  let sanitized = purify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [], // No attributes allowed
    KEEP_CONTENT: true, // Keep text content
  })

  // Second pass: Additional sanitization for common XSS patterns
  sanitized = sanitized
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/data:/gi, '') // Remove data: protocols
    .replace(/vbscript:/gi, '') // Remove vbscript: protocols
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<!--[\s\S]*?-->/g, '') // Remove HTML comments
    .replace(/<[^>]*>/g, '') // Remove any remaining tags

  return sanitized.trim()
}

/**
 * Recursively sanitizes an object's string properties
 */
function sanitizeObject(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return sanitizeString(obj)
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject)
  }

  if (obj && typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value)
    }
    return sanitized
  }

  return obj
}

/**
 * Creates validation middleware for request body
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // First sanitize the request body
      const sanitizedBody = sanitizeObject(req.body)

      // Then validate with Zod schema
      const result = schema.safeParse(sanitizedBody)

      if (!result.success) {
        const errors = result.error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }))

        const response: ValidationErrorResponse = {
          status: 'Fail',
          message: 'Validation failed',
          data: null,
          errors,
        }

        return res.status(400).json(response)
      }

      // Replace request body with validated and sanitized data
      req.body = result.data
      next()
    }
    catch {
      const response: ValidationErrorResponse = {
        status: 'Fail',
        message: 'Validation error occurred',
        data: null,
      }

      return res.status(500).json(response)
    }
  }
}

/**
 * Creates validation middleware for query parameters
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Sanitize query parameters
      const sanitizedQuery = sanitizeObject(req.query)

      // Validate with Zod schema
      const result = schema.safeParse(sanitizedQuery)

      if (!result.success) {
        const errors = result.error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }))

        const response: ValidationErrorResponse = {
          status: 'Fail',
          message: 'Query validation failed',
          data: null,
          errors,
        }

        return res.status(400).json(response)
      }

      // Replace query with validated and sanitized data
      req.query = result.data as Request['query']
      next()
    }
    catch {
      const response: ValidationErrorResponse = {
        status: 'Fail',
        message: 'Query validation error occurred',
        data: null,
      }

      return res.status(500).json(response)
    }
  }
}

/**
 * Creates validation middleware for path parameters
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Sanitize path parameters
      const sanitizedParams = sanitizeObject(req.params)

      // Validate with Zod schema
      const result = schema.safeParse(sanitizedParams)

      if (!result.success) {
        const errors = result.error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }))

        const response: ValidationErrorResponse = {
          status: 'Fail',
          message: 'Parameter validation failed',
          data: null,
          errors,
        }

        return res.status(400).json(response)
      }

      // Replace params with validated and sanitized data
      req.params = result.data as Record<string, string>
      next()
    }
    catch {
      const response: ValidationErrorResponse = {
        status: 'Fail',
        message: 'Parameter validation error occurred',
        data: null,
      }

      return res.status(500).json(response)
    }
  }
}

/**
 * Creates validation middleware for request headers
 */
export function validateHeaders<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Convert headers to lowercase for consistent validation
      const normalizedHeaders: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(req.headers)) {
        normalizedHeaders[key.toLowerCase()] = value
      }

      // Validate with Zod schema
      const result = schema.safeParse(normalizedHeaders)

      if (!result.success) {
        const errors = result.error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }))

        const response: ValidationErrorResponse = {
          status: 'Fail',
          message: 'Header validation failed',
          data: null,
          errors,
        }

        return res.status(400).json(response)
      }

      next()
    }
    catch {
      const response: ValidationErrorResponse = {
        status: 'Fail',
        message: 'Header validation error occurred',
        data: null,
      }

      return res.status(500).json(response)
    }
  }
}

/**
 * General purpose sanitization middleware
 * Applies to all string fields in request body, query, and params
 */
export function sanitizeRequest(req: Request, res: Response, next: NextFunction) {
  try {
    // Sanitize request body
    if (req.body) {
      req.body = sanitizeObject(req.body)
    }

    // Sanitize query parameters
    if (req.query) {
      req.query = sanitizeObject(req.query) as Request['query']
    }

    // Sanitize path parameters
    if (req.params) {
      req.params = sanitizeObject(req.params) as Record<string, string>
    }

    next()
  }
  catch {
    const response: ValidationErrorResponse = {
      status: 'Fail',
      message: 'Request sanitization failed',
      data: null,
    }

    return res.status(500).json(response)
  }
}

/**
 * Content-Type validation middleware
 */
export function validateContentType(allowedTypes: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentType = req.get('Content-Type')

    if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
      const response: ValidationErrorResponse = {
        status: 'Fail',
        message: `Invalid Content-Type. Allowed types: ${allowedTypes.join(', ')}`,
        data: null,
      }

      return res.status(415).json(response)
    }

    next()
  }
}

/**
 * Request size validation middleware
 */
export function validateRequestSize(maxSizeBytes: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.get('Content-Length')

    if (contentLength && Number.parseInt(contentLength, 10) > maxSizeBytes) {
      const response: ValidationErrorResponse = {
        status: 'Fail',
        message: `Request too large. Maximum size: ${maxSizeBytes} bytes`,
        data: null,
      }

      return res.status(413).json(response)
    }

    next()
  }
}
