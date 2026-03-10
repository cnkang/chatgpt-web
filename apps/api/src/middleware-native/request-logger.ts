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
import type { MiddlewareHandler, TransportResponse } from '../transport/types.js'
import { logger } from '../utils/logger.js'

/**
 * Extended TransportRequest with requestId
 */
interface RequestWithId {
  requestId?: string
}

type NativeResponseWithEnd = {
  end?: (...args: unknown[]) => unknown
  statusCode?: number
}

/**
 * Create middleware that logs request start, response completion, and performance metrics.
 *
 * Attaches or generates a request ID on the request, logs the request method, path and query at start,
 * and when the response finishes logs status code, duration, and memory usage delta while emitting API and performance metrics.
 *
 * @returns A middleware handler that records request and performance logs
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
    const nativeResponse = (res as TransportResponse & { _nativeResponse?: NativeResponseWithEnd })
      ._nativeResponse
    const originalNativeEnd =
      nativeResponse && typeof nativeResponse.end === 'function'
        ? nativeResponse.end.bind(nativeResponse)
        : null
    let responseLogged = false

    const logResponseCompletion = () => {
      // Log response only once
      if (responseLogged) {
        return
      }

      responseLogged = true

      const duration = Date.now() - start
      const endMemory = process.memoryUsage()

      // Calculate memory delta
      const memoryDelta = {
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        external: endMemory.external - startMemory.external,
      }

      // Extract status code from response
      const statusCode =
        (res as TransportResponse & { _nativeResponse?: { statusCode?: number } })._nativeResponse
          ?.statusCode || 200

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

    res.end = ((...args: unknown[]) => {
      logResponseCompletion()

      return originalEnd(...(args as [string | Buffer | undefined]))
    }) as typeof res.end

    if (nativeResponse && originalNativeEnd) {
      nativeResponse.end = ((...args: unknown[]) => {
        logResponseCompletion()
        return originalNativeEnd(...args)
      }) as typeof nativeResponse.end
    }

    next()
  }
}
