/**
 * Async error wrapper for route handlers
 * Catches errors from async route handlers and passes them to error handler
 */

import type { TransportRequest, TransportResponse } from '../transport/index.js'
import { createErrorResponse } from './error-handler.js'
import { logger } from './logger.js'

/**
 * Route handler type that can be sync or async
 */
export type RouteHandler = (req: TransportRequest, res: TransportResponse) => void | Promise<void>

/**
 * Wraps an async route handler to catch errors and handle them appropriately
 *
 * @param handler - The async route handler to wrap
 * @returns A wrapped handler that catches and handles errors
 *
 * @example
 * ```typescript
 * router.post('/api/chat', asyncHandler(async (req, res) => {
 *   const result = await processChat(req.body)
 *   res.json(result)
 * }))
 * ```
 */
export function asyncHandler(handler: RouteHandler): RouteHandler {
  return async (req: TransportRequest, res: TransportResponse) => {
    try {
      await handler(req, res)
    } catch (error) {
      // Don't send error if response already sent
      if (res.headersSent || res.finished) {
        logger.error('Error after response sent:', {
          error: error instanceof Error ? error.message : String(error),
          method: req.method,
          path: req.path,
          stack: error instanceof Error ? error.stack : undefined,
        })
        return
      }

      // Generate request ID for tracking
      const requestId = req.getHeader('x-request-id') || crypto.randomUUID()

      // Create standardized error response
      const errorResponse = createErrorResponse(
        error instanceof Error ? error : new Error(String(error)),
        requestId,
      )

      // Determine status code from error response
      const statusCode =
        errorResponse.error?.code.includes('VALIDATION') ||
        errorResponse.error?.code.includes('AUTHENTICATION') ||
        errorResponse.error?.code.includes('PAYLOAD_TOO_LARGE') ||
        errorResponse.error?.code.includes('RATE_LIMIT')
          ? errorResponse.error.code.includes('AUTHENTICATION')
            ? 401
            : errorResponse.error.code.includes('PAYLOAD_TOO_LARGE')
              ? 413
              : errorResponse.error.code.includes('RATE_LIMIT')
                ? 429
                : 400
          : errorResponse.error?.code.includes('TIMEOUT')
            ? 504
            : errorResponse.error?.code.includes('EXTERNAL_API') ||
                errorResponse.error?.code.includes('NETWORK')
              ? 502
              : 500

      // Log error with context
      const logData = {
        requestId,
        error: {
          message: error instanceof Error ? error.message : String(error),
          type: errorResponse.error?.code,
          stack:
            process.env.NODE_ENV === 'development' && error instanceof Error
              ? error.stack
              : undefined,
        },
        request: {
          method: req.method,
          path: req.path,
          ip: req.ip,
        },
        timestamp: new Date().toISOString(),
      }

      if (statusCode >= 500) {
        logger.error('Server Error:', logData)
      } else {
        logger.warn('Client Error:', logData)
      }

      // Send error response
      res.status(statusCode).json(errorResponse)
    }
  }
}
