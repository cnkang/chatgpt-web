/**
 * Unit tests for Error Handler
 * Tests error handling scenarios according to task 7.2
 */

import type { NextFunction, Request, Response } from 'express'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AppError,
  asyncHandler,
  createAuthenticationError,
  createAuthorizationError,
  createConfigurationError,
  createErrorResponse,
  createExternalApiError,
  createNetworkError,
  createNotFoundError,
  createRateLimitError,
  createTimeoutError,
  createValidationError,
  errorHandler,
  ErrorType,
  notFoundHandler,
  setupGracefulShutdown,
} from './error-handler.js'

describe('error handler', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: NextFunction
  let consoleSpy: { error: ReturnType<typeof vi.spyOn>, warn: ReturnType<typeof vi.spyOn> }

  beforeEach(() => {
    vi.clearAllMocks()

    mockReq = {
      method: 'GET',
      url: '/test',
      ip: '127.0.0.1',
      headers: {},
      get: vi.fn(),
    }

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    }

    mockNext = vi.fn()

    // Mock console methods
    consoleSpy = {
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('app error', () => {
    it('should create AppError with default values', () => {
      const error = new AppError('Test error')

      expect(error.message).toBe('Test error')
      expect(error.type).toBe(ErrorType.INTERNAL)
      expect(error.statusCode).toBe(500)
      expect(error.isOperational).toBe(true)
      expect(error.details).toBeUndefined()
    })

    it('should create AppError with custom values', () => {
      const details = { field: 'email', value: 'invalid' }
      const error = new AppError('Validation failed', ErrorType.VALIDATION, 400, true, details)

      expect(error.message).toBe('Validation failed')
      expect(error.type).toBe(ErrorType.VALIDATION)
      expect(error.statusCode).toBe(400)
      expect(error.isOperational).toBe(true)
      expect(error.details).toBe(details)
    })

    it('should capture stack trace', () => {
      const error = new AppError('Test error')
      expect(error.stack).toBeDefined()
    })
  })

  describe('create error response', () => {
    it('should create error response for AppError', () => {
      const error = new AppError('Validation failed', ErrorType.VALIDATION, 400)
      const requestId = 'req_123'

      const response = createErrorResponse(error, requestId)

      expect(response.status).toBe('Fail')
      expect(response.message).toBe('Validation failed')
      expect(response.data).toBeNull()
      expect(response.error?.code).toBe(ErrorType.VALIDATION)
      expect(response.error?.type).toBe('AppError')
      expect(response.error?.requestId).toBe(requestId)
      expect(response.error?.timestamp).toBeDefined()
    })

    it('should create error response for regular Error', () => {
      const error = new Error('Regular error')
      const requestId = 'req_456'

      const response = createErrorResponse(error, requestId)

      expect(response.status).toBe('Error')
      expect(response.message).toBe('Regular error')
      expect(response.data).toBeNull()
      expect(response.error?.code).toBe(ErrorType.INTERNAL)
      expect(response.error?.type).toBe('Error')
      expect(response.error?.requestId).toBe(requestId)
    })

    it('should use Fail status for client errors', () => {
      const error = new AppError('Not found', ErrorType.NOT_FOUND, 404)

      const response = createErrorResponse(error)

      expect(response.status).toBe('Fail')
    })

    it('should use Error status for server errors', () => {
      const error = new AppError('Internal error', ErrorType.INTERNAL, 500)

      const response = createErrorResponse(error)

      expect(response.status).toBe('Error')
    })
  })

  describe('error handler', () => {
    it('should handle AppError correctly', () => {
      const error = new AppError('Validation failed', ErrorType.VALIDATION, 400)

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'Fail',
          message: 'Validation failed',
          error: expect.objectContaining({
            code: ErrorType.VALIDATION,
          }),
        }),
      )
    })

    it('should handle regular Error correctly', () => {
      const error = new Error('Regular error')

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(500)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'Error',
          message: 'Regular error',
          error: expect.objectContaining({
            code: ErrorType.INTERNAL,
          }),
        }),
      )
    })

    it('should log server errors', () => {
      const error = new AppError('Server error', ErrorType.INTERNAL, 500)

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext)

      expect(consoleSpy.error).toHaveBeenCalledWith('Server Error:', expect.any(String))
    })

    it('should log client errors as warnings', () => {
      const error = new AppError('Client error', ErrorType.VALIDATION, 400)

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext)

      expect(consoleSpy.warn).toHaveBeenCalledWith('Client Error:', expect.any(String))
    })

    it('should generate request ID if not provided', () => {
      const error = new Error('Test error')

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            requestId: expect.stringMatching(/^req_\d+_[a-z0-9]+$/),
          }),
        }),
      )
    })

    it('should use provided request ID', () => {
      const error = new Error('Test error')
      mockReq.headers = { 'x-request-id': 'custom-request-id' }

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            requestId: 'custom-request-id',
          }),
        }),
      )
    })
  })

  describe('async handler', () => {
    it('should handle successful async function', async () => {
      const asyncFn = vi.fn().mockResolvedValue('success')
      const wrappedFn = asyncHandler(asyncFn)

      const result = await wrappedFn(mockReq as Request, mockRes as Response, mockNext)

      expect(result).toBe('success')
      expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should handle async function errors', async () => {
      const error = new Error('Async error')
      const asyncFn = vi.fn().mockRejectedValue(error)
      const wrappedFn = asyncHandler(asyncFn)

      await wrappedFn(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(error)
    })
  })

  describe('error creation functions', () => {
    it('should create validation error', () => {
      const details = { field: 'email' }
      const error = createValidationError('Invalid email', details)

      expect(error).toBeInstanceOf(AppError)
      expect(error.type).toBe(ErrorType.VALIDATION)
      expect(error.statusCode).toBe(400)
      expect(error.details).toBe(details)
    })

    it('should create authentication error', () => {
      const error = createAuthenticationError('Invalid credentials')

      expect(error).toBeInstanceOf(AppError)
      expect(error.type).toBe(ErrorType.AUTHENTICATION)
      expect(error.statusCode).toBe(401)
      expect(error.message).toBe('Invalid credentials')
    })

    it('should create authentication error with default message', () => {
      const error = createAuthenticationError()

      expect(error.message).toBe('Authentication required')
    })

    it('should create authorization error', () => {
      const error = createAuthorizationError('Access denied')

      expect(error).toBeInstanceOf(AppError)
      expect(error.type).toBe(ErrorType.AUTHORIZATION)
      expect(error.statusCode).toBe(403)
      expect(error.message).toBe('Access denied')
    })

    it('should create not found error', () => {
      const error = createNotFoundError('User not found')

      expect(error).toBeInstanceOf(AppError)
      expect(error.type).toBe(ErrorType.NOT_FOUND)
      expect(error.statusCode).toBe(404)
      expect(error.message).toBe('User not found')
    })

    it('should create rate limit error', () => {
      const error = createRateLimitError('Too many requests')

      expect(error).toBeInstanceOf(AppError)
      expect(error.type).toBe(ErrorType.RATE_LIMIT)
      expect(error.statusCode).toBe(429)
      expect(error.message).toBe('Too many requests')
    })

    it('should create external API error', () => {
      const details = { provider: 'openai', statusCode: 500 }
      const error = createExternalApiError('API error', details)

      expect(error).toBeInstanceOf(AppError)
      expect(error.type).toBe(ErrorType.EXTERNAL_API)
      expect(error.statusCode).toBe(502)
      expect(error.details).toBe(details)
    })

    it('should create network error', () => {
      const details = { provider: 'azure' }
      const error = createNetworkError('Network error', details)

      expect(error).toBeInstanceOf(AppError)
      expect(error.type).toBe(ErrorType.NETWORK)
      expect(error.statusCode).toBe(503)
      expect(error.details).toBe(details)
    })

    it('should create timeout error', () => {
      const error = createTimeoutError('Request timeout')

      expect(error).toBeInstanceOf(AppError)
      expect(error.type).toBe(ErrorType.TIMEOUT)
      expect(error.statusCode).toBe(504)
      expect(error.message).toBe('Request timeout')
    })

    it('should create configuration error', () => {
      const details = { config: 'invalid' }
      const error = createConfigurationError('Config error', details)

      expect(error).toBeInstanceOf(AppError)
      expect(error.type).toBe(ErrorType.CONFIGURATION)
      expect(error.statusCode).toBe(500)
      expect(error.isOperational).toBe(false) // Configuration errors are not operational
      expect(error.details).toBe(details)
    })
  })

  describe('not found handler', () => {
    it('should create not found error for unmatched routes', () => {
      mockReq.method = 'POST'
      Object.defineProperty(mockReq, 'path', { value: '/api/nonexistent', writable: true })

      notFoundHandler(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ErrorType.NOT_FOUND,
          message: 'Route POST /api/nonexistent not found',
        }),
      )
    })
  })

  describe('setup graceful shutdown', () => {
    let mockServer: { close: (callback: () => void) => void }
    let processListeners: Record<string, (...args: unknown[]) => void>
    let exitSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      mockServer = {
        close: vi.fn().mockImplementation((callback) => {
          setTimeout(callback, 10) // Simulate async close
        }),
      }

      processListeners = {}

      // Mock process event listeners
      vi.spyOn(process, 'on').mockImplementation(
        (event: string | symbol, listener: (...args: any[]) => void) => {
          processListeners[event as string] = listener
          return process
        },
      )

      exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)

      vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    it('should setup graceful shutdown handlers', () => {
      setupGracefulShutdown(mockServer)

      expect(process.on).toHaveBeenCalledWith('SIGTERM', expect.any(Function))
      expect(process.on).toHaveBeenCalledWith('SIGINT', expect.any(Function))
      expect(process.on).toHaveBeenCalledWith('uncaughtException', expect.any(Function))
      expect(process.on).toHaveBeenCalledWith('unhandledRejection', expect.any(Function))
    })

    it('should handle SIGTERM gracefully', async () => {
      setupGracefulShutdown(mockServer)

      // Trigger SIGTERM
      processListeners.SIGTERM()

      // Wait for server close
      await new Promise(resolve => setTimeout(resolve, 20))

      expect(mockServer.close).toHaveBeenCalled()
      expect(exitSpy).toHaveBeenCalledWith(0)
    })

    it('should handle SIGINT gracefully', async () => {
      setupGracefulShutdown(mockServer)

      // Trigger SIGINT
      processListeners.SIGINT()

      // Wait for server close
      await new Promise(resolve => setTimeout(resolve, 20))

      expect(mockServer.close).toHaveBeenCalled()
      expect(exitSpy).toHaveBeenCalledWith(0)
    })

    it('should handle uncaught exceptions', () => {
      setupGracefulShutdown(mockServer)

      const error = new Error('Uncaught error')

      processListeners.uncaughtException(error)
      expect(consoleSpy.error).toHaveBeenCalledWith('Uncaught Exception:', error)
      expect(exitSpy).toHaveBeenCalledWith(1)
    })

    it('should handle unhandled rejections', () => {
      setupGracefulShutdown(mockServer)

      const reason = 'Rejection reason'
      const promise = Promise.reject(reason)
      void promise.catch(() => {})

      processListeners.unhandledRejection(reason, promise)
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Unhandled Rejection at:',
        promise,
        'reason:',
        reason,
      )
      expect(exitSpy).toHaveBeenCalledWith(1)
    })

    it('should handle server close errors', async () => {
      mockServer.close = vi.fn().mockImplementation((callback) => {
        callback(new Error('Close error'))
      })

      setupGracefulShutdown(mockServer)

      processListeners.SIGTERM()
      await new Promise(resolve => setTimeout(resolve, 20))
      expect(exitSpy).toHaveBeenCalledWith(1)
    })
  })
})
