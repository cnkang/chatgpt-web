/**
 * Secure logging utility
 * Provides structured logging with sensitive data protection
 */

import type { NextFunction, Request, Response } from 'express'

/**
 * Log levels
 */
export enum LogLevel {
	ERROR = 'error',
	WARN = 'warn',
	INFO = 'info',
	DEBUG = 'debug',
}

/**
 * Log entry interface
 */
interface LogEntry {
	level: LogLevel
	message: string
	timestamp: string
	data?: unknown
	requestId?: string
	userId?: string
	ip?: string
	userAgent?: string
}

interface LogContext {
	requestId?: string
	userId?: string
	ip?: string
	userAgent?: string
}

/**
 * Sensitive data patterns to mask
 */
const SENSITIVE_PATTERNS = [
	// API keys and tokens
	/apikey/gi,
	/api_key/gi,
	/api-key/gi,
	/token/gi,
	/secret/gi,
	/password/gi,
	/authorization/gi,
	/bearer/gi,

	// OpenAI specific
	/openai_api_key/gi,
	/openai-api-key/gi,
	/sk-[a-z0-9]{48}/gi, // OpenAI API key pattern
	/sk-proj-[a-z0-9]{48}/gi, // OpenAI project API key pattern

	// Credit card patterns
	/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,

	// Email patterns (partial masking)
	/\b[\w.%+-]+@[A-Z0-9.-]+\.[A-Z|]{2,}\b/gi,
]

/**
 * Recursively sanitizes an object to remove sensitive information
 */
function sanitizeData(data: unknown, depth: number = 0): unknown {
	// Prevent infinite recursion
	if (depth > 10) {
		return '[Max depth reached]'
	}

	if (typeof data === 'string') {
		return maskSensitiveString(data)
	}

	if (typeof data === 'number' || typeof data === 'boolean' || data === null) {
		return data
	}

	if (Array.isArray(data)) {
		return data.map(item => sanitizeData(item, depth + 1))
	}

	if (typeof data === 'object') {
		const sanitized: Record<string, unknown> = {}

		for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
			const lowerKey = key.toLowerCase()

			// Check if key contains sensitive information
			const isSensitiveKey = SENSITIVE_PATTERNS.some(pattern => pattern.test(lowerKey))

			if (isSensitiveKey && typeof value === 'string') {
				sanitized[key] = maskSensitiveString(value)
			} else {
				sanitized[key] = sanitizeData(value, depth + 1)
			}
		}

		return sanitized
	}

	return data
}

/**
 * Masks sensitive strings
 */
function maskSensitiveString(str: string): string {
	let masked = str

	// Mask API keys and tokens
	masked = masked.replace(/sk-[a-z0-9]{48}/gi, 'sk-****')
	masked = masked.replace(/sk-proj-[a-z0-9]{48}/gi, 'sk-proj-****')
	masked = masked.replace(/Bearer\s+[\w\-.]+/gi, 'Bearer ****')

	// Mask credit card numbers
	masked = masked.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '**** **** **** ****')

	// Partially mask emails
	masked = masked.replace(
		/\b([\w.%+-]+)@([A-Z0-9.-]+\.[A-Z|]{2,})\b/gi,
		(_match, username, domain) => {
			const maskedUsername = username.length > 2 ? `${username.substring(0, 2)}****` : '****'
			return `${maskedUsername}@${domain}`
		},
	)

	return masked
}

/**
 * Logger class with security features
 */
export class Logger {
	private static instance: Logger
	private logLevel: LogLevel

	private constructor() {
		this.logLevel = this.getLogLevelFromEnv()
	}

	static getInstance(): Logger {
		if (!Logger.instance) {
			Logger.instance = new Logger()
		}
		return Logger.instance
	}

	private getLogLevelFromEnv(): LogLevel {
		const envLevel = process.env.LOG_LEVEL?.toLowerCase()
		switch (envLevel) {
			case 'error':
				return LogLevel.ERROR
			case 'warn':
				return LogLevel.WARN
			case 'info':
				return LogLevel.INFO
			case 'debug':
				return LogLevel.DEBUG
			default:
				return process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG
		}
	}

	private shouldLog(level: LogLevel): boolean {
		const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG]
		return levels.indexOf(level) <= levels.indexOf(this.logLevel)
	}

	private formatLogEntry(entry: LogEntry): string {
		const { timestamp, level, message, requestId, userId, ip, userAgent, data } = entry

		const logObject = {
			timestamp,
			level,
			message,
			...(requestId ? { requestId } : {}),
			...(userId ? { userId } : {}),
			...(ip ? { ip } : {}),
			...(userAgent ? { userAgent } : {}),
			...(data ? { data: sanitizeData(data) } : {}),
		}

		return JSON.stringify(logObject)
	}

	private log(level: LogLevel, message: string, data?: unknown, context?: LogContext): void {
		if (!this.shouldLog(level)) {
			return
		}

		const entry: LogEntry = {
			level,
			message,
			timestamp: new Date().toISOString(),
			data,
			...context,
		}

		const formattedLog = this.formatLogEntry(entry)

		switch (level) {
			case LogLevel.ERROR:
				console.error(formattedLog)
				break
			case LogLevel.WARN:
				console.warn(formattedLog)
				break
			case LogLevel.INFO:
				process.stdout.write(`${formattedLog}\n`)
				break
			case LogLevel.DEBUG:
				process.stdout.write(`${formattedLog}\n`)
				break
		}
	}

	error(message: string, data?: unknown, context?: LogContext): void {
		this.log(LogLevel.ERROR, message, data, context)
	}

	warn(message: string, data?: unknown, context?: LogContext): void {
		this.log(LogLevel.WARN, message, data, context)
	}

	info(message: string, data?: unknown, context?: LogContext): void {
		this.log(LogLevel.INFO, message, data, context)
	}

	debug(message: string, data?: unknown, context?: LogContext): void {
		this.log(LogLevel.DEBUG, message, data, context)
	}

	/**
	 * Log API request/response with automatic sanitization
	 */
	logApiCall(
		method: string,
		url: string,
		statusCode: number,
		duration: number,
		context?: LogContext & {
			requestBody?: unknown
			responseBody?: unknown
		},
	): void {
		const { requestBody, responseBody, ...logContext } = context || {}

		this.info(
			'API Call',
			{
				method,
				url,
				statusCode,
				duration: `${duration}ms`,
				...(requestBody ? { requestBody: sanitizeData(requestBody) } : {}),
				...(responseBody ? { responseBody: sanitizeData(responseBody) } : {}),
			},
			logContext,
		)
	}

	/**
	 * Log security events
	 */
	logSecurityEvent(
		event: string,
		severity: 'low' | 'medium' | 'high',
		details?: unknown,
		context?: LogContext,
	): void {
		this.warn(
			`Security Event: ${event}`,
			{
				severity,
				details: sanitizeData(details),
			},
			context,
		)
	}

	/**
	 * Log performance metrics
	 */
	logPerformance(
		operation: string,
		duration: number,
		metadata?: unknown,
		context?: {
			requestId?: string
			userId?: string
		},
	): void {
		this.info(
			`Performance: ${operation}`,
			{
				duration: `${duration}ms`,
				metadata: sanitizeData(metadata),
			},
			context,
		)
	}
}

// Export singleton instance
export const logger = Logger.getInstance()

/**
 * Express middleware for request logging
 */
export function requestLogger() {
	return (req: Request, res: Response, next: NextFunction) => {
		const start = Date.now()
		const headerRequestId = req.headers['x-request-id']
		const requestId =
			(typeof headerRequestId === 'string' && headerRequestId) ||
			(Array.isArray(headerRequestId) && headerRequestId[0]) ||
			`req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

		// Add request ID to request object
		;(req as Request & { requestId?: string }).requestId = requestId

		// Log request
		logger.info(
			'Request started',
			{
				method: req.method,
				url: req.url,
				query: sanitizeData(req.query),
			},
			{
				requestId,
				ip: req.ip,
				userAgent: req.get('User-Agent'),
			},
		)

		// Log response when finished
		res.on('finish', () => {
			const duration = Date.now() - start

			logger.logApiCall(req.method, req.url, res.statusCode, duration, {
				requestId,
				ip: req.ip,
				userAgent: req.get('User-Agent'),
			})
		})

		next()
	}
}
