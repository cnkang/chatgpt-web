/**
 * Comprehensive error handling utilities
 * Provides consistent error response format, retry logic, and circuit breaker pattern
 */

import type { NextFunction, Request, Response } from 'express'
import { randomUUID } from 'node:crypto'

/**
 * Standard error response interface
 */
export interface ErrorResponse {
  status: 'Fail' | 'Error'
  message: string
  data: null
  error?: {
    code: string
    type: string
    details?: unknown
    timestamp: string
    requestId?: string
  }
}

/**
 * Error types for classification
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  PAYLOAD_TOO_LARGE = 'PAYLOAD_TOO_LARGE_ERROR',
  RATE_LIMIT = 'RATE_LIMIT_ERROR',
  EXTERNAL_API = 'EXTERNAL_API_ERROR',
  NETWORK = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT_ERROR',
  INTERNAL = 'INTERNAL_ERROR',
  CONFIGURATION = 'CONFIGURATION_ERROR',
}

/**
 * Custom error class with additional metadata
 */
export class AppError extends Error {
  public readonly type: ErrorType
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly details?: unknown

  constructor(
    message: string,
    type: ErrorType = ErrorType.INTERNAL,
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: unknown,
  ) {
    super(message)
    this.type = type
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.details = details

    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Creates standardized error responses
 */
function normalizeError(error: Error | AppError): Error | AppError {
  if (error instanceof AppError) {
    return error
  }

  const expressError = error as Error & { status?: number; statusCode?: number; type?: string }
  const statusCode = expressError.statusCode ?? expressError.status

  if (expressError.type === 'entity.too.large' || statusCode === 413) {
    return new AppError('Request entity too large', ErrorType.PAYLOAD_TOO_LARGE, 413, true)
  }

  if (expressError.type === 'entity.parse.failed' || statusCode === 400) {
    return createValidationError('Invalid JSON payload')
  }

  return error
}

function getPublicErrorMessage(error: Error | AppError, statusCode: number): string {
  if (statusCode < 500) {
    return error.message
  }

  if (error instanceof AppError) {
    switch (error.type) {
      case ErrorType.TIMEOUT:
        return 'Request timeout'
      case ErrorType.EXTERNAL_API:
      case ErrorType.NETWORK:
        return 'Upstream service request failed'
      default:
        break
    }
  }

  return 'Internal server error'
}

export function createErrorResponse(error: Error | AppError, requestId?: string): ErrorResponse {
  const normalizedError = normalizeError(error)
  const isAppError = normalizedError instanceof AppError
  const statusCode = isAppError ? normalizedError.statusCode : 500

  return {
    status: isAppError && statusCode < 500 ? 'Fail' : 'Error',
    message: getPublicErrorMessage(normalizedError, statusCode),
    data: null,
    error: {
      code: isAppError ? normalizedError.type : ErrorType.INTERNAL,
      type: normalizedError.constructor.name,
      details: isAppError && statusCode < 500 ? normalizedError.details : undefined,
      timestamp: new Date().toISOString(),
      requestId,
    },
  }
}

/**
 * Express error handling middleware
 */
export function errorHandler(
  error: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  const normalizedError = normalizeError(error)

  // Generate request ID for tracking
  const requestId = (req.headers['x-request-id'] as string) || randomUUID()

  const isAppError = normalizedError instanceof AppError
  const statusCode = isAppError ? normalizedError.statusCode : 500

  // Log error (excluding sensitive information)
  const logData = {
    requestId,
    error: {
      message: normalizedError.message,
      type: isAppError ? normalizedError.type : ErrorType.INTERNAL,
      stack: process.env.NODE_ENV === 'development' ? normalizedError.stack : undefined,
    },
    request: {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    },
    timestamp: new Date().toISOString(),
  }

  if (statusCode >= 500) {
    console.error('Server Error:', JSON.stringify(logData, null, 2))
  } else {
    console.warn('Client Error:', JSON.stringify(logData))
  }

  // Send error response
  const errorResponse = createErrorResponse(normalizedError, requestId)
  res.status(statusCode).json(errorResponse)
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler<T = unknown>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * Creates specific error types
 */
export function createValidationError(message: string, details?: unknown) {
  return new AppError(message, ErrorType.VALIDATION, 400, true, details)
}

export function createAuthenticationError(message: string = 'Authentication required') {
  return new AppError(message, ErrorType.AUTHENTICATION, 401, true)
}

export function createAuthorizationError(message: string = 'Insufficient permissions') {
  return new AppError(message, ErrorType.AUTHORIZATION, 403, true)
}

export function createNotFoundError(message: string = 'Resource not found') {
  return new AppError(message, ErrorType.NOT_FOUND, 404, true)
}

export function createRateLimitError(message: string = 'Rate limit exceeded') {
  return new AppError(message, ErrorType.RATE_LIMIT, 429, true)
}

export function createPayloadTooLargeError(message: string = 'Request entity too large') {
  return new AppError(message, ErrorType.PAYLOAD_TOO_LARGE, 413, true)
}

export function createExternalApiError(message: string, details?: unknown) {
  return new AppError(message, ErrorType.EXTERNAL_API, 502, true, details)
}

export function createNetworkError(message: string, details?: unknown) {
  return new AppError(message, ErrorType.NETWORK, 503, true, details)
}

export function createTimeoutError(message: string = 'Request timeout') {
  return new AppError(message, ErrorType.TIMEOUT, 504, true)
}

export function createConfigurationError(message: string, details?: unknown) {
  return new AppError(message, ErrorType.CONFIGURATION, 500, false, details)
}

/**
 * 404 handler for unmatched routes
 */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  const error = createNotFoundError(`Route ${req.method} ${req.path} not found`)
  next(error)
}

/**
 * Graceful shutdown handler
 */
interface ClosableServer {
  close: (callback: (err?: Error | null) => void) => void
}

export function setupGracefulShutdown(server: ClosableServer) {
  const shutdown = (signal: string) => {
    console.warn(`Received ${signal}. Starting graceful shutdown...`)

    server.close((err?: Error | null) => {
      if (err) {
        console.error('Error during server shutdown:', err)
        process.exit(1)
      }

      console.warn('Server closed successfully')
      process.exit(0)
    })

    // Force shutdown after 30 seconds
    // Use .unref() so the timer doesn't keep the event loop alive if the server closes cleanly
    setTimeout(() => {
      console.error('Forced shutdown after timeout')
      process.exit(1)
    }, 30000).unref()
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  process.on('uncaughtException', error => {
    console.error('Uncaught Exception:', error)
    process.exit(1)
  })

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason)
    process.exit(1)
  })
}
