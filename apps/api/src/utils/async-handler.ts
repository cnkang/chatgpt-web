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
      const normalizedError = toError(error)
      const errorResponse = createErrorResponse(normalizedError, requestId)
      const statusCode = getStatusCode(errorResponse.error?.code)

      // Log error with context
      const logData = {
        requestId,
        error: {
          message: normalizedError.message,
          type: errorResponse.error?.code,
          stack: process.env.NODE_ENV === 'development' ? normalizedError.stack : undefined,
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

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}

function getStatusCode(errorCode?: string): number {
  if (!errorCode) {
    return 500
  }

  if (errorCode.includes('AUTHENTICATION')) {
    return 401
  }

  if (errorCode.includes('PAYLOAD_TOO_LARGE')) {
    return 413
  }

  if (errorCode.includes('RATE_LIMIT')) {
    return 429
  }

  if (errorCode.includes('VALIDATION')) {
    return 400
  }

  if (errorCode.includes('TIMEOUT')) {
    return 504
  }

  if (errorCode.includes('EXTERNAL_API') || errorCode.includes('NETWORK')) {
    return 502
  }

  return 500
}
