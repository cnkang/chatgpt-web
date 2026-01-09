/**
 * Unit tests for Validation Middleware
 * Tests input validation and sanitization according to task 7.2
 */

import type { NextFunction, Request, Response } from 'express'
import type { ZodSchema } from 'zod'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import {
	sanitizeRequest,
	validateBody,
	validateContentType,
	validateHeaders,
	validateParams,
	validateQuery,
	validateRequestSize,
} from './validation.js'

// Mock DOMPurify
vi.mock('dompurify', () => ({
	default: vi.fn().mockImplementation(() => ({
		sanitize: vi.fn().mockImplementation(input => {
			// Simple mock sanitization - remove script tags
			return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
		}),
	})),
}))

vi.mock('jsdom', () => ({
	JSDOM: class MockJSDOM {
		window = {}
		constructor() {}
	},
}))

describe('validation middleware', () => {
	let mockReq: Partial<Request>
	let mockRes: Partial<Response>
	let mockNext: NextFunction

	beforeEach(() => {
		vi.clearAllMocks()

		mockReq = {
			body: {},
			query: {},
			params: {},
			headers: {},
			get: vi.fn(),
		}

		mockRes = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn().mockReturnThis(),
		}

		mockNext = vi.fn()
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	describe('validateBody', () => {
		const testSchema = z.object({
			name: z.string().min(1),
			age: z.number().min(0),
			email: z.string().email(),
		})

		it('should validate and pass valid request body', () => {
			mockReq.body = {
				name: 'John Doe',
				age: 30,
				email: 'john@example.com',
			}

			const middleware = validateBody(testSchema)
			middleware(mockReq as Request, mockRes as Response, mockNext)

			expect(mockNext).toHaveBeenCalled()
			expect(mockRes.status).not.toHaveBeenCalled()
		})

		it('should reject invalid request body', () => {
			mockReq.body = {
				name: '', // Invalid: empty string
				age: -5, // Invalid: negative number
				email: 'invalid-email', // Invalid: not an email
			}

			const middleware = validateBody(testSchema)
			middleware(mockReq as Request, mockRes as Response, mockNext)

			expect(mockNext).not.toHaveBeenCalled()
			expect(mockRes.status).toHaveBeenCalledWith(400)
			expect(mockRes.json).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'Fail',
					message: 'Validation failed',
					errors: expect.arrayContaining([
						expect.objectContaining({
							field: 'name',
							message: expect.any(String),
						}),
						expect.objectContaining({
							field: 'age',
							message: expect.any(String),
						}),
						expect.objectContaining({
							field: 'email',
							message: expect.any(String),
						}),
					]),
				}),
			)
		})

		it('should sanitize malicious input', () => {
			mockReq.body = {
				name: 'John<script>alert("xss")</script>Doe',
				age: 30,
				email: 'john@example.com',
			}

			const middleware = validateBody(testSchema)
			middleware(mockReq as Request, mockRes as Response, mockNext)

			expect(mockReq.body.name).toBe('JohnDoe') // Script tag removed
			expect(mockNext).toHaveBeenCalled()
		})

		it('should handle nested objects', () => {
			const nestedSchema = z.object({
				user: z.object({
					name: z.string(),
					profile: z.object({
						bio: z.string(),
					}),
				}),
			})

			mockReq.body = {
				user: {
					name: 'John<script>alert("xss")</script>',
					profile: {
						bio: 'Developer<img src="x" onerror="alert(1)">',
					},
				},
			}

			const middleware = validateBody(nestedSchema)
			middleware(mockReq as Request, mockRes as Response, mockNext)

			expect(mockReq.body.user.name).toBe('John')
			expect(mockReq.body.user.profile.bio).toBe('Developer')
			expect(mockNext).toHaveBeenCalled()
		})

		it('should handle arrays', () => {
			const arraySchema = z.object({
				items: z.array(z.string()),
			})

			mockReq.body = {
				items: ['Item 1<script>alert("xss")</script>', 'Item 2<img src="x" onerror="alert(1)">'],
			}

			const middleware = validateBody(arraySchema)
			middleware(mockReq as Request, mockRes as Response, mockNext)

			expect(mockReq.body.items[0]).toBe('Item 1')
			expect(mockReq.body.items[1]).toBe('Item 2')
			expect(mockNext).toHaveBeenCalled()
		})

		it('should handle validation errors gracefully', () => {
			// Mock Zod to throw an error
			const faultySchema = {
				safeParse: vi.fn().mockImplementation(() => {
					throw new Error('Validation error')
				}),
			} as unknown as ZodSchema<unknown>

			const middleware = validateBody(faultySchema)
			middleware(mockReq as Request, mockRes as Response, mockNext)

			expect(mockRes.status).toHaveBeenCalledWith(500)
			expect(mockRes.json).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'Fail',
					message: 'Validation error occurred',
				}),
			)
		})
	})

	describe('validateQuery', () => {
		const querySchema = z.object({
			page: z.string().transform(Number).pipe(z.number().min(1)),
			limit: z.string().transform(Number).pipe(z.number().max(100)),
			search: z.string().optional(),
		})

		it('should validate and pass valid query parameters', () => {
			mockReq.query = {
				page: '1',
				limit: '10',
				search: 'test query',
			}

			const middleware = validateQuery(querySchema)
			middleware(mockReq as Request, mockRes as Response, mockNext)

			expect(mockNext).toHaveBeenCalled()
			expect(mockReq.query.page).toBe(1) // Transformed to number
			expect(mockReq.query.limit).toBe(10) // Transformed to number
		})

		it('should reject invalid query parameters', () => {
			mockReq.query = {
				page: '0', // Invalid: less than 1
				limit: '200', // Invalid: greater than 100
			}

			const middleware = validateQuery(querySchema)
			middleware(mockReq as Request, mockRes as Response, mockNext)

			expect(mockNext).not.toHaveBeenCalled()
			expect(mockRes.status).toHaveBeenCalledWith(400)
			expect(mockRes.json).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'Fail',
					message: 'Query validation failed',
				}),
			)
		})

		it('should sanitize malicious query parameters', () => {
			mockReq.query = {
				page: '1',
				limit: '10',
				search: 'test<script>alert("xss")</script>query',
			}

			const middleware = validateQuery(querySchema)
			middleware(mockReq as Request, mockRes as Response, mockNext)

			expect(mockReq.query.search).toBe('testquery') // Script tag removed
			expect(mockNext).toHaveBeenCalled()
		})
	})

	describe('validateParams', () => {
		const paramsSchema = z.object({
			id: z.string().uuid(),
			slug: z.string().min(1),
		})

		it('should validate and pass valid path parameters', () => {
			mockReq.params = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				slug: 'test-slug',
			}

			const middleware = validateParams(paramsSchema)
			middleware(mockReq as Request, mockRes as Response, mockNext)

			expect(mockNext).toHaveBeenCalled()
		})

		it('should reject invalid path parameters', () => {
			mockReq.params = {
				id: 'invalid-uuid',
				slug: '',
			}

			const middleware = validateParams(paramsSchema)
			middleware(mockReq as Request, mockRes as Response, mockNext)

			expect(mockNext).not.toHaveBeenCalled()
			expect(mockRes.status).toHaveBeenCalledWith(400)
			expect(mockRes.json).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'Fail',
					message: 'Parameter validation failed',
				}),
			)
		})

		it('should sanitize malicious path parameters', () => {
			mockReq.params = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				slug: 'test<script>alert("xss")</script>slug',
			}

			const middleware = validateParams(paramsSchema)
			middleware(mockReq as Request, mockRes as Response, mockNext)

			expect(mockReq.params.slug).toBe('testslug') // Script tag removed
			expect(mockNext).toHaveBeenCalled()
		})
	})

	describe('validateHeaders', () => {
		const headersSchema = z.object({
			'content-type': z.string(),
			'authorization': z.string().optional(),
			'x-api-key': z.string().optional(),
		})

		it('should validate and pass valid headers', () => {
			mockReq.headers = {
				'Content-Type': 'application/json',
				'Authorization': 'Bearer token123',
				'X-API-Key': 'api-key-123',
			}

			const middleware = validateHeaders(headersSchema)
			middleware(mockReq as Request, mockRes as Response, mockNext)

			expect(mockNext).toHaveBeenCalled()
		})

		it('should reject invalid headers', () => {
			mockReq.headers = {
				// Missing required content-type
				Authorization: 'Bearer token123',
			}

			const middleware = validateHeaders(headersSchema)
			middleware(mockReq as Request, mockRes as Response, mockNext)

			expect(mockNext).not.toHaveBeenCalled()
			expect(mockRes.status).toHaveBeenCalledWith(400)
			expect(mockRes.json).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'Fail',
					message: 'Header validation failed',
				}),
			)
		})

		it('should normalize header names to lowercase', () => {
			mockReq.headers = {
				'Content-Type': 'application/json',
				'AUTHORIZATION': 'Bearer token123',
			}

			const middleware = validateHeaders(headersSchema)
			middleware(mockReq as Request, mockRes as Response, mockNext)

			expect(mockNext).toHaveBeenCalled()
		})
	})

	describe('sanitizeRequest', () => {
		it('should sanitize all request parts', () => {
			mockReq.body = {
				message: 'Hello<script>alert("xss")</script>World',
			}
			mockReq.query = {
				search: 'query<img src="x" onerror="alert(1)">term',
			}
			mockReq.params = {
				id: 'param<script>alert("xss")</script>value',
			}

			sanitizeRequest(mockReq as Request, mockRes as Response, mockNext)

			expect(mockReq.body.message).toBe('HelloWorld')
			expect(mockReq.query.search).toBe('queryterm')
			expect(mockReq.params.id).toBe('paramvalue')
			expect(mockNext).toHaveBeenCalled()
		})

		it('should handle missing request parts', () => {
			mockReq.body = undefined
			mockReq.query = undefined
			mockReq.params = undefined

			sanitizeRequest(mockReq as Request, mockRes as Response, mockNext)

			expect(mockNext).toHaveBeenCalled()
		})

		it('should handle sanitization errors', () => {
			const errorBody = {}
			Object.defineProperty(errorBody, 'message', {
				enumerable: true,
				get() {
					throw new Error('Sanitization error')
				},
			})
			mockReq.body = errorBody

			sanitizeRequest(mockReq as Request, mockRes as Response, mockNext)

			expect(mockRes.status).toHaveBeenCalledWith(500)
			expect(mockRes.json).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'Fail',
					message: 'Request sanitization failed',
				}),
			)
		})
	})

	describe('validateContentType', () => {
		it('should allow valid content types', () => {
			mockReq.get = vi.fn().mockReturnValue('application/json; charset=utf-8')

			const middleware = validateContentType(['application/json'])
			middleware(mockReq as Request, mockRes as Response, mockNext)

			expect(mockNext).toHaveBeenCalled()
		})

		it('should reject invalid content types', () => {
			mockReq.get = vi.fn().mockReturnValue('text/plain')

			const middleware = validateContentType(['application/json'])
			middleware(mockReq as Request, mockRes as Response, mockNext)

			expect(mockNext).not.toHaveBeenCalled()
			expect(mockRes.status).toHaveBeenCalledWith(415)
			expect(mockRes.json).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'Fail',
					message: expect.stringContaining('Invalid Content-Type'),
				}),
			)
		})

		it('should reject missing content type', () => {
			mockReq.get = vi.fn().mockReturnValue(undefined)

			const middleware = validateContentType(['application/json'])
			middleware(mockReq as Request, mockRes as Response, mockNext)

			expect(mockNext).not.toHaveBeenCalled()
			expect(mockRes.status).toHaveBeenCalledWith(415)
		})

		it('should allow multiple content types', () => {
			mockReq.get = vi.fn().mockReturnValue('multipart/form-data')

			const middleware = validateContentType(['application/json', 'multipart/form-data'])
			middleware(mockReq as Request, mockRes as Response, mockNext)

			expect(mockNext).toHaveBeenCalled()
		})
	})

	describe('validateRequestSize', () => {
		it('should allow requests under size limit', () => {
			mockReq.get = vi.fn().mockReturnValue('1000') // 1KB

			const middleware = validateRequestSize(5000) // 5KB limit
			middleware(mockReq as Request, mockRes as Response, mockNext)

			expect(mockNext).toHaveBeenCalled()
		})

		it('should reject requests over size limit', () => {
			mockReq.get = vi.fn().mockReturnValue('10000') // 10KB

			const middleware = validateRequestSize(5000) // 5KB limit
			middleware(mockReq as Request, mockRes as Response, mockNext)

			expect(mockNext).not.toHaveBeenCalled()
			expect(mockRes.status).toHaveBeenCalledWith(413)
			expect(mockRes.json).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'Fail',
					message: expect.stringContaining('Request too large'),
				}),
			)
		})

		it('should allow requests without content-length header', () => {
			mockReq.get = vi.fn().mockReturnValue(undefined)

			const middleware = validateRequestSize(5000)
			middleware(mockReq as Request, mockRes as Response, mockNext)

			expect(mockNext).toHaveBeenCalled()
		})
	})

	describe('xss protection', () => {
		const testCases = [
			{
				name: 'script tags',
				input: '<script>alert("xss")</script>',
				expected: '',
			},
			{
				name: 'javascript protocol',
				input: 'javascript:alert("xss")',
				expected: 'alert("xss")',
			},
			{
				name: 'data protocol',
				input: 'data:text/html,<script>alert(1)</script>',
				expected: 'text/html,',
			},
			{
				name: 'event handlers',
				input: '<img src="x" onerror="alert(1)">',
				expected: '',
			},
			{
				name: 'HTML comments',
				input: '<!-- malicious comment -->content',
				expected: 'content',
			},
		]

		testCases.forEach(({ name, input, expected }) => {
			it(`should sanitize ${name}`, () => {
				const schema = z.object({
					content: z.string(),
				})

				mockReq.body = { content: input }

				const middleware = validateBody(schema)
				middleware(mockReq as Request, mockRes as Response, mockNext)

				expect(mockReq.body.content).toBe(expected)
				expect(mockNext).toHaveBeenCalled()
			})
		})
	})
})
