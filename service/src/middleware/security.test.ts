/**
 * Unit tests for Security Middleware
 * Tests security middleware implementation according to task 7.2
 */

import type { NextFunction, Request, Response } from 'express'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	createCorsMiddleware,
	createRateLimiter,
	createSecureLogger,
	createSecurityHeaders,
	secureApiKeys,
	validateSecurityEnvironment,
} from './security.js'

type RequestWithCount = Request & { requestCount?: number }
type MockRequest = Partial<Request> & { requestCount?: number }
type MockResponse = Partial<Response>

// Mock external dependencies
vi.mock('helmet', () => ({
	default: vi.fn().mockImplementation(options => {
		return (_req: Request, res: Response, next: NextFunction) => {
			// Simulate helmet setting headers
			if (options.contentSecurityPolicy) {
				res.setHeader('Content-Security-Policy', 'default-src \'self\'')
			}
			if (options.hsts) {
				res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
			}
			res.setHeader('X-Content-Type-Options', 'nosniff')
			res.setHeader('X-Frame-Options', 'DENY')
			next()
		}
	}),
}))

vi.mock('express-rate-limit', () => ({
	rateLimit: vi.fn().mockImplementation(options => {
		return (req: Request, _res: Response, next: NextFunction) => {
			// Simulate rate limiting logic
			const requestCount = (req as RequestWithCount).requestCount || 0
			if (requestCount >= options.max) {
				return options.handler(req, _res)
			}
			next()
		}
	}),
}))

vi.mock('express-session', () => ({
	default: vi.fn().mockImplementation(() => {
		return (req: Request, _res: Response, next: NextFunction) => {
			// Mock session middleware
			;(req as Request & { session?: Record<string, unknown> }).session = {}
			next()
		}
	}),
}))

vi.mock('connect-redis', () => ({
	default: vi.fn().mockImplementation(() => {
		return vi.fn().mockImplementation(() => ({}))
	}),
}))

vi.mock('redis', () => ({
	createClient: vi.fn().mockImplementation(() => ({
		connect: vi.fn().mockResolvedValue(undefined),
	})),
}))

describe('security middleware', () => {
	let mockReq: MockRequest
	let mockRes: MockResponse
	let mockNext: NextFunction
	let originalEnv: NodeJS.ProcessEnv

	beforeEach(() => {
		// Save original environment
		originalEnv = { ...process.env }

		// Reset mocks
		vi.clearAllMocks()

		// Create mock request and response objects
		mockReq = {
			method: 'GET',
			url: '/test',
			ip: '127.0.0.1',
			headers: {},
			get: vi.fn(),
		}

		mockRes = {
			header: vi.fn(),
			setHeader: vi.fn(),
			status: vi.fn().mockReturnThis(),
			json: vi.fn().mockReturnThis(),
			end: vi.fn(),
			on: vi.fn(),
		}

		mockNext = vi.fn()
	})

	afterEach(() => {
		// Restore original environment
		process.env = originalEnv
		vi.restoreAllMocks()
	})

	describe('createSecurityHeaders', () => {
		it('should create helmet middleware with default configuration', () => {
			const middleware = createSecurityHeaders()
			expect(middleware).toBeDefined()
			expect(typeof middleware).toBe('function')
		})

		it('should apply security headers in production', () => {
			process.env.NODE_ENV = 'production'

			const config = {
				session: {
					secret: 'test-secret',
					name: 'test-session',
					maxAge: 60 * 1000,
					secure: true,
					httpOnly: true,
					sameSite: 'strict',
				},
				rateLimit: {
					windowMs: 60 * 1000,
					max: 100,
					skipSuccessfulRequests: false,
				},
				helmet: {
					contentSecurityPolicy: true,
					crossOriginEmbedderPolicy: false,
					hsts: true,
				},
			} as Parameters<typeof createSecurityHeaders>[0]

			const middleware = createSecurityHeaders(config)
			middleware(mockReq as Request, mockRes as Response, mockNext)

			expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Security-Policy', expect.any(String))
			expect(mockRes.setHeader).toHaveBeenCalledWith(
				'Strict-Transport-Security',
				expect.any(String),
			)
			expect(mockRes.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff')
			expect(mockNext).toHaveBeenCalled()
		})

		it('should disable HSTS in development', () => {
			process.env.NODE_ENV = 'development'

			const middleware = createSecurityHeaders()
			middleware(mockReq as Request, mockRes as Response, mockNext)

			expect(mockRes.setHeader).not.toHaveBeenCalledWith(
				'Strict-Transport-Security',
				expect.any(String),
			)
			expect(mockNext).toHaveBeenCalled()
		})
	})

	describe('createRateLimiter', () => {
		it('should create rate limiting middleware', () => {
			const middleware = createRateLimiter()
			expect(middleware).toBeDefined()
			expect(typeof middleware).toBe('function')
		})

		it('should allow requests under the limit', () => {
			const middleware = createRateLimiter()
			mockReq.requestCount = 50 // Under default limit of 100

			middleware(mockReq as Request, mockRes as Response, mockNext)
			expect(mockNext).toHaveBeenCalled()
		})

		it('should block requests over the limit', () => {
			const middleware = createRateLimiter()
			mockReq.requestCount = 150 // Over default limit of 100

			middleware(mockReq as Request, mockRes as Response, mockNext)
			expect(mockRes.status).toHaveBeenCalledWith(429)
			expect(mockRes.json).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'Fail',
					message: expect.stringContaining('Rate limit exceeded'),
				}),
			)
		})

		it('should use custom rate limit from environment', () => {
			process.env.MAX_REQUEST_PER_HOUR = '50'

			const middleware = createRateLimiter()
			expect(middleware).toBeDefined()
		})
	})

	describe('secureApiKeys', () => {
		it('should mask authorization headers', () => {
			mockReq.headers = {
				authorization: 'Bearer sk-1234567890abcdef1234567890abcdef1234567890',
			}

			secureApiKeys(mockReq as Request, mockRes as Response, mockNext)

			expect(mockReq.headers['x-masked-auth']).toBe('Bearer sk-1****')
			expect(mockNext).toHaveBeenCalled()
		})

		it('should sanitize API keys in response', () => {
			const originalJson = vi.fn()
			mockRes.json = vi.fn().mockImplementation(function (this: Response, body) {
				return originalJson.call(this, body)
			})

			secureApiKeys(mockReq as Request, mockRes as Response, mockNext)

			// Test the wrapped json method
			const responseBody = {
				apiKey: 'sk-1234567890abcdef1234567890abcdef1234567890',
				secret: 'very-secret-value',
				data: 'normal data',
			}

			;(mockRes.json as (body: unknown) => unknown)(responseBody)

			expect(originalJson).toHaveBeenCalledWith({
				apiKey: 'sk-1****7890',
				secret: '****',
				data: 'normal data',
			})
		})

		it('should handle nested objects with API keys', () => {
			const originalJson = vi.fn()
			mockRes.json = vi.fn().mockImplementation(function (this: Response, body) {
				return originalJson.call(this, body)
			})

			secureApiKeys(mockReq as Request, mockRes as Response, mockNext)

			const responseBody = {
				config: {
					openai: {
						apiKey: 'sk-1234567890abcdef1234567890abcdef1234567890',
					},
					azure: {
						api_key: 'azure-key-12345678',
					},
				},
				data: ['item1', 'item2'],
			}

			;(mockRes.json as (body: unknown) => unknown)(responseBody)

			expect(originalJson).toHaveBeenCalledWith({
				config: {
					openai: {
						apiKey: 'sk-1****7890',
					},
					azure: {
						api_key: 'azur****5678',
					},
				},
				data: ['item1', 'item2'],
			})
		})

		it('should handle arrays with sensitive data', () => {
			const originalJson = vi.fn()
			mockRes.json = vi.fn().mockImplementation(function (this: Response, body) {
				return originalJson.call(this, body)
			})

			secureApiKeys(mockReq as Request, mockRes as Response, mockNext)

			const responseBody = [{ apiKey: 'sk-test123456789' }, { token: 'secret-token-value' }]

			;(mockRes.json as (body: unknown) => unknown)(responseBody)

			expect(originalJson).toHaveBeenCalledWith([{ apiKey: 'sk-t****6789' }, { token: '****' }])
		})
	})

	describe('createCorsMiddleware', () => {
		it('should set CORS headers for allowed origins', () => {
			process.env.ALLOWED_ORIGINS = 'https://example.com,https://app.example.com'
			mockReq.get = vi.fn().mockReturnValue('https://example.com')

			const middleware = createCorsMiddleware()
			middleware(mockReq as Request, mockRes as Response, mockNext)

			expect(mockRes.header).toHaveBeenCalledWith(
				'Access-Control-Allow-Origin',
				'https://example.com',
			)
			expect(mockRes.header).toHaveBeenCalledWith(
				'Access-Control-Allow-Headers',
				expect.any(String),
			)
			expect(mockRes.header).toHaveBeenCalledWith(
				'Access-Control-Allow-Methods',
				expect.any(String),
			)
			expect(mockNext).toHaveBeenCalled()
		})

		it('should handle wildcard origins', () => {
			process.env.ALLOWED_ORIGINS = '*'
			mockReq.get = vi.fn().mockReturnValue('https://any-origin.com')

			const middleware = createCorsMiddleware()
			middleware(mockReq as Request, mockRes as Response, mockNext)

			expect(mockRes.header).toHaveBeenCalledWith(
				'Access-Control-Allow-Origin',
				'https://any-origin.com',
			)
			expect(mockNext).toHaveBeenCalled()
		})

		it('should handle OPTIONS preflight requests', () => {
			mockReq.method = 'OPTIONS'

			const middleware = createCorsMiddleware()
			middleware(mockReq as Request, mockRes as Response, mockNext)

			expect(mockRes.status).toHaveBeenCalledWith(200)
			expect(mockRes.end).toHaveBeenCalled()
			expect(mockNext).not.toHaveBeenCalled()
		})

		it('should reject disallowed origins', () => {
			process.env.ALLOWED_ORIGINS = 'https://allowed.com'
			mockReq.get = vi.fn().mockReturnValue('https://malicious.com')

			const middleware = createCorsMiddleware()
			middleware(mockReq as Request, mockRes as Response, mockNext)

			expect(mockRes.header).not.toHaveBeenCalledWith(
				'Access-Control-Allow-Origin',
				'https://malicious.com',
			)
			expect(mockNext).toHaveBeenCalled()
		})
	})

	describe('createSecureLogger', () => {
		let consoleSpy: ReturnType<typeof vi.spyOn>

		beforeEach(() => {
			consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
		})

		afterEach(() => {
			consoleSpy.mockRestore()
		})

		it('should log request without sensitive information', () => {
			mockReq.method = 'POST'
			mockReq.url = '/api/chat'
			Object.defineProperty(mockReq, 'ip', { value: '192.168.1.1', writable: true })
			mockReq.get = vi.fn().mockImplementation(header => {
				if (header === 'User-Agent') return 'Test Browser'
				return undefined
			})

			const middleware = createSecureLogger()
			middleware(mockReq as Request, mockRes as Response, mockNext)

			expect(consoleSpy).toHaveBeenCalledWith('Request:', expect.any(String))

			const logCall = consoleSpy.mock.calls[0]
			const logData = JSON.parse(logCall[1])

			expect(logData.method).toBe('POST')
			expect(logData.url).toBe('/api/chat')
			expect(logData.ip).toBe('192.168.1.1')
			expect(logData.userAgent).toBe('Test Browser')
			expect(logData.timestamp).toBeDefined()
		})

		it('should log response on finish', () => {
			let finishCallback: (() => void) | undefined
			mockRes.on = vi.fn().mockImplementation((event, callback) => {
				if (event === 'finish') {
					finishCallback = callback
				}
			})
			mockRes.statusCode = 200

			const middleware = createSecureLogger()
			middleware(mockReq as Request, mockRes as Response, mockNext)

			// Simulate response finish
			finishCallback?.()

			expect(consoleSpy).toHaveBeenCalledWith('Response:', expect.any(String))
		})
	})

	describe('validateSecurityEnvironment', () => {
		it('should pass validation with proper configuration', () => {
			process.env.SESSION_SECRET = 'secure-random-secret-key-for-production'
			process.env.NODE_ENV = 'development'
			process.env.MAX_REQUEST_PER_HOUR = '100'
			process.env.ALLOWED_ORIGINS = 'https://example.com'

			const result = validateSecurityEnvironment()

			expect(result.isValid).toBe(true)
			expect(result.warnings).toHaveLength(0)
		})

		it('should warn about default session secret', () => {
			process.env.SESSION_SECRET = 'default-session-secret-change-in-production'
			process.env.NODE_ENV = 'development'

			const result = validateSecurityEnvironment()

			expect(result.isValid).toBe(true)
			expect(
				result.warnings.some(w =>
					w.includes('SESSION_SECRET should be set to a secure random value'),
				),
			).toBe(true)
		})

		it('should fail validation in production with default session secret', () => {
			process.env.SESSION_SECRET = 'default-session-secret-change-in-production'
			process.env.NODE_ENV = 'production'

			const result = validateSecurityEnvironment()

			expect(result.isValid).toBe(false)
			expect(
				result.warnings.some(w =>
					w.includes('SESSION_SECRET should be set to a secure random value'),
				),
			).toBe(true)
		})

		it('should warn about missing HTTPS in production', () => {
			process.env.NODE_ENV = 'production'
			process.env.SESSION_SECRET = 'secure-secret'
			delete process.env.HTTPS

			const result = validateSecurityEnvironment()

			expect(result.warnings.some(w => w.includes('HTTPS should be enabled in production'))).toBe(
				true,
			)
		})

		it('should warn about high rate limits', () => {
			process.env.MAX_REQUEST_PER_HOUR = '5000'
			process.env.SESSION_SECRET = 'secure-secret'

			const result = validateSecurityEnvironment()

			expect(result.warnings.some(w => w.includes('MAX_REQUEST_PER_HOUR is set very high'))).toBe(
				true,
			)
		})

		it('should warn about missing ALLOWED_ORIGINS', () => {
			process.env.SESSION_SECRET = 'secure-secret'
			delete process.env.ALLOWED_ORIGINS

			const result = validateSecurityEnvironment()

			expect(
				result.warnings.some(w =>
					w.includes('ALLOWED_ORIGINS should be set to restrict CORS access'),
				),
			).toBe(true)
		})
	})
})
