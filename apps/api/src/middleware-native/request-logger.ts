/**
 * Request logging middleware for native routing
 *
 * Provides comprehensive request/response logging with:
 * - Request details (method, path, query parameters)
 * - Response details (status code, duration)
 * - Performance metrics (response time, memory usage)
 * - Request ID tracking for correlation
 *
 * @module middleware-native/request-logger
 */

import { randomUUID } from 'node:crypto'
import type { MiddlewareHandler } from '../transport/types.js'
import { logger } from '../utils/logger.js'

/**
 * Extended TransportRequest with requestId
 */
interface RequestWithId {
  requestId?: string
}

/**
 * Create request logging middleware
 *
 * Logs:
 * - Request start with method, path, query parameters
 * - Request completion with status code, duration, memory usage
 * - Performance metrics for monitoring
 *
 * @returns Middleware handler
 */
export function createRequestLoggerMiddleware(): MiddlewareHandler {
  return async (req, res, next) => {
    const start = Date.now()
    const startMemory = process.memoryUsage()

    // Extract or generate request ID
    const headerRequestId = req.getHeader('x-request-id')
    const requestId = headerRequestId || randomUUID()

    // Store request ID on request object for downstream use
    ;(req as unknown as RequestWithId).requestId = requestId

    // Log request start
    logger.info(
      'Request started',
      {
        method: req.method,
        path: req.path,
        query: Object.fromEntries(req.url.searchParams),
      },
      {
        requestId,
        ip: req.ip,
        userAgent: req.getHeader('user-agent'),
      },
    )

    // Wrap response.end() to capture completion
    const originalEnd = res.end.bind(res)
    let responseLogged = false

    res.end = ((...args: unknown[]) => {
      // Log response only once
      if (!responseLogged) {
        responseLogged = true

        const duration = Date.now() - start
        const endMemory = process.memoryUsage()

        // Calculate memory delta
        const memoryDelta = {
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          external: endMemory.external - startMemory.external,
        }

        // Extract status code from response
        // Note: We need to access the native response to get the status code
        // biome-ignore lint/suspicious/noExplicitAny: Accessing internal _nativeResponse property for status code
        const statusCode = (res as any)._nativeResponse?.statusCode || 200

        // Log API call completion
        logger.logApiCall(req.method, req.path, statusCode, duration, {
          requestId,
          ip: req.ip,
          userAgent: req.getHeader('user-agent'),
        })

        // Log performance metrics
        logger.logPerformance(
          `${req.method} ${req.path}`,
          duration,
          {
            memoryDelta: {
              heapUsed: `${Math.round(memoryDelta.heapUsed / 1024)}KB`,
              external: `${Math.round(memoryDelta.external / 1024)}KB`,
            },
            statusCode,
          },
          {
            requestId,
          },
        )
      }

      return originalEnd(...(args as [string | Buffer | undefined]))
    }) as typeof res.end

    next()
  }
}
