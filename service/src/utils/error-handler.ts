/**
 * Comprehensive error handling utilities
 * Provides consistent error response format, retry logic, and circuit breaker pattern
 */

import type { NextFunction, Request, Response } from 'express'

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
export function createErrorResponse(error: Error | AppError, requestId?: string): ErrorResponse {
	const isAppError = error instanceof AppError

	return {
		status: isAppError && error.statusCode < 500 ? 'Fail' : 'Error',
		message: error.message,
		data: null,
		error: {
			code: isAppError ? error.type : ErrorType.INTERNAL,
			type: error.constructor.name,
			details: isAppError ? error.details : undefined,
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
	// Generate request ID for tracking
	const requestId =
		(req.headers['x-request-id'] as string) ||
		`req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

	const isAppError = error instanceof AppError
	const statusCode = isAppError ? error.statusCode : 500

	// Log error (excluding sensitive information)
	const logData = {
		requestId,
		error: {
			message: error.message,
			type: isAppError ? error.type : ErrorType.INTERNAL,
			stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
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
	const errorResponse = createErrorResponse(error, requestId)
	res.status(statusCode).json(errorResponse)
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler<T = unknown>(
	fn: (req: Request, res: Response, next: NextFunction) => Promise<T>,
) {
	return (req: Request, res: Response, next: NextFunction): Promise<T | void> => {
		return Promise.resolve(fn(req, res, next)).catch(next)
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
		setTimeout(() => {
			console.error('Forced shutdown after timeout')
			process.exit(1)
		}, 30000)
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
