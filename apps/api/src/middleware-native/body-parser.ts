/**
 * Body Parser Middleware
 *
 * Parses request bodies and attaches them to req.body.
 * Supports JSON and URL-encoded content types with configurable size limits.
 *
 * @module middleware-native/body-parser
 */

import type { IncomingMessage } from 'node:http'
import type { Http2ServerRequest } from 'node:http2'
import type { MiddlewareHandler } from '../transport/types.js'
import { AppError, ErrorType } from '../utils/error-handler.js'

/**
 * Body parser configuration options
 */
export interface BodyParserOptions {
  /** Maximum JSON body size in bytes (default: 1MB) */
  jsonLimit?: number
  /** Maximum URL-encoded body size in bytes (default: 32KB) */
  urlencodedLimit?: number
}

/**
 * Parse request body from native request stream
 *
 * @param req - Native HTTP request
 * @param maxSize - Maximum body size in bytes
 * @returns Parsed body (object for JSON/form, string for other types)
 * @throws AppError with 413 status when size limit exceeded
 * @throws AppError with 400 status for invalid JSON
 */
async function parseBody(
  req: IncomingMessage | Http2ServerRequest,
  maxSize: number,
): Promise<unknown> {
  const contentType = req.headers['content-type'] || ''

  // Collect body chunks using async iteration
  const chunks: Buffer[] = []
  let totalSize = 0

  for await (const chunk of req) {
    totalSize += chunk.length

    // Enforce size limit
    if (totalSize > maxSize) {
      throw new AppError('Request entity too large', ErrorType.PAYLOAD_TOO_LARGE, 413)
    }

    chunks.push(chunk)
  }

  // Concatenate chunks and convert to string
  const body = Buffer.concat(chunks).toString('utf-8')

  // Parse based on Content-Type
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(body)
    } catch {
      throw new AppError('Invalid JSON payload', ErrorType.VALIDATION, 400)
    }
  } else if (contentType.includes('application/x-www-form-urlencoded')) {
    // Parse URL-encoded body using URLSearchParams
    return Object.fromEntries(new URLSearchParams(body))
  }

  // Return raw body for other content types
  return body
}

/**
 * Create body parser middleware
 *
 * Parses request bodies based on Content-Type header and attaches the result to req.body.
 * Supports:
 * - application/json (parsed as JSON object)
 * - application/x-www-form-urlencoded (parsed as key-value object)
 * - Other content types (returned as raw string)
 *
 * @param options - Body parser configuration
 * @returns Middleware handler
 *
 * @example
 * ```typescript
 * const bodyParser = createBodyParserMiddleware({
 *   jsonLimit: 1048576,      // 1MB for JSON
 *   urlencodedLimit: 32768   // 32KB for URL-encoded
 * })
 *
 * middleware.use(bodyParser)
 * ```
 */
export function createBodyParserMiddleware(options: BodyParserOptions = {}): MiddlewareHandler {
  const jsonLimit = options.jsonLimit ?? 1048576 // 1MB default
  const urlencodedLimit = options.urlencodedLimit ?? 32768 // 32KB default

  return async (req, _res, next) => {
    try {
      // Skip body parsing for GET, HEAD, DELETE methods (no body expected)
      if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'DELETE') {
        return next()
      }

      // Determine size limit based on Content-Type
      const contentType = req.getHeader('content-type') || ''
      const maxSize = contentType.includes('application/json') ? jsonLimit : urlencodedLimit

      // Access native request object through internal property
      const nativeReq = req._nativeRequest as IncomingMessage | Http2ServerRequest | undefined

      if (!nativeReq) {
        // If native request is not available, skip body parsing
        // This allows the middleware to work with mock requests in tests
        return next()
      }

      // Parse body and attach to request
      req.body = await parseBody(nativeReq, maxSize)

      next()
    } catch (error) {
      // Pass error to error handler
      next(error as Error)
    }
  }
}

/**
 * Create body parser middleware with specific size limit
 *
 * Convenience function for creating body parser with a single size limit
 * applied to all content types.
 *
 * @param maxSize - Maximum body size in bytes
 * @returns Middleware handler
 *
 * @example
 * ```typescript
 * // 1KB limit for /api/verify endpoint
 * const verifyBodyParser = createBodyParserWithLimit(1024)
 * router.post('/api/verify', verifyBodyParser, verifyHandler)
 * ```
 */
export function createBodyParserWithLimit(maxSize: number): MiddlewareHandler {
  return createBodyParserMiddleware({
    jsonLimit: maxSize,
    urlencodedLimit: maxSize,
  })
}
