/**
 * Comprehensive error handling utilities
 * Provides consistent error response format, retry logic, and circuit breaker pattern
 */

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
 * Error configuration map for consistent error creation
 */
const ERROR_CONFIGS = {
  [ErrorType.VALIDATION]: {
    statusCode: 400,
    defaultMessage: 'Validation failed',
    isOperational: true,
  },
  [ErrorType.AUTHENTICATION]: {
    statusCode: 401,
    defaultMessage: 'Authentication required',
    isOperational: true,
  },
  [ErrorType.AUTHORIZATION]: {
    statusCode: 403,
    defaultMessage: 'Insufficient permissions',
    isOperational: true,
  },
  [ErrorType.NOT_FOUND]: {
    statusCode: 404,
    defaultMessage: 'Resource not found',
    isOperational: true,
  },
  [ErrorType.PAYLOAD_TOO_LARGE]: {
    statusCode: 413,
    defaultMessage: 'Request entity too large',
    isOperational: true,
  },
  [ErrorType.RATE_LIMIT]: {
    statusCode: 429,
    defaultMessage: 'Rate limit exceeded',
    isOperational: true,
  },
  [ErrorType.EXTERNAL_API]: {
    statusCode: 502,
    defaultMessage: 'External API error',
    isOperational: true,
  },
  [ErrorType.NETWORK]: { statusCode: 503, defaultMessage: 'Network error', isOperational: true },
  [ErrorType.TIMEOUT]: { statusCode: 504, defaultMessage: 'Request timeout', isOperational: true },
  [ErrorType.CONFIGURATION]: {
    statusCode: 500,
    defaultMessage: 'Configuration error',
    isOperational: false,
  },
  [ErrorType.INTERNAL]: {
    statusCode: 500,
    defaultMessage: 'Internal server error',
    isOperational: true,
  },
} as const

/**
 * Generic error creator using configuration
 */
function createTypedError(type: ErrorType, message?: string, details?: unknown): AppError {
  const config = ERROR_CONFIGS[type]
  return new AppError(
    message ?? config.defaultMessage,
    type,
    config.statusCode,
    config.isOperational,
    details,
  )
}

/**
 * Convenience functions for specific error types
 */
export function createValidationError(message: string, details?: unknown) {
  return createTypedError(ErrorType.VALIDATION, message, details)
}

export function createAuthenticationError(message?: string) {
  return createTypedError(ErrorType.AUTHENTICATION, message)
}

export function createAuthorizationError(message?: string) {
  return createTypedError(ErrorType.AUTHORIZATION, message)
}

export function createNotFoundError(message?: string) {
  return createTypedError(ErrorType.NOT_FOUND, message)
}

export function createRateLimitError(message?: string) {
  return createTypedError(ErrorType.RATE_LIMIT, message)
}

export function createPayloadTooLargeError(message?: string) {
  return createTypedError(ErrorType.PAYLOAD_TOO_LARGE, message)
}

export function createExternalApiError(message: string, details?: unknown) {
  return createTypedError(ErrorType.EXTERNAL_API, message, details)
}

export function createNetworkError(message: string, details?: unknown) {
  return createTypedError(ErrorType.NETWORK, message, details)
}

export function createTimeoutError(message?: string) {
  return createTypedError(ErrorType.TIMEOUT, message)
}

export function createConfigurationError(message: string, details?: unknown) {
  return createTypedError(ErrorType.CONFIGURATION, message, details)
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
