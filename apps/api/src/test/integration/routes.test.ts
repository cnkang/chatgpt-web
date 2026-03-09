/**
 * Route Integration Tests
 * Tests all API endpoints with Transport Layer
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { healthHandler } from '../../routes/health.js'
import { sessionHandler } from '../../routes/session.js'
import { verifyHandler } from '../../routes/verify.js'
import { createMockRequest, createMockResponse } from '../test-helpers.js'

// Mock environment variables
const originalEnv = process.env

describe('Route Integration Tests', () => {
  async function executeHandler(
    handler: typeof healthHandler | typeof sessionHandler | typeof verifyHandler,
    requestOverrides: Parameters<typeof createMockRequest>[0],
  ) {
    const req = createMockRequest(requestOverrides)
    const res = createMockResponse()

    await handler(req, res)

    return res._capture
  }

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Health Route', () => {
    it('should return 200 with health data', async () => {
      const response = await executeHandler(healthHandler, {
        method: 'GET',
        path: '/api/health',
      })

      expect(response.statusCode).toBe(200)
      expect(response.body).toMatchObject({
        uptime: expect.any(Number),
        message: 'OK',
        timestamp: expect.any(Number),
      })
    })
  })

  describe('Session Route', () => {
    it('should return 200 with session data', async () => {
      process.env.AUTH_SECRET_KEY = 'test-secret'
      process.env.OPENAI_API_KEY = 'sk-test'
      process.env.AI_PROVIDER = 'openai'

      const response = await executeHandler(sessionHandler, {
        method: 'POST',
        path: '/api/session',
        body: {},
      })

      expect(response.statusCode).toBe(200)
      expect(response.body).toMatchObject({
        status: 'Success',
        message: '',
        data: {
          auth: expect.any(Boolean),
          model: expect.any(String),
        },
      })
    })
  })

  describe('Verify Route', () => {
    it('should return 200 for valid token', async () => {
      process.env.AUTH_SECRET_KEY = 'test-secret-key'
      const response = await executeHandler(verifyHandler, {
        method: 'POST',
        path: '/api/verify',
        body: { token: 'test-secret-key' },
      })

      expect(response.statusCode).toBe(200)
      expect(response.body).toMatchObject({
        status: 'Success',
        message: 'Verify successfully',
        data: null,
      })
    })

    it('should return 401 for invalid token', async () => {
      process.env.AUTH_SECRET_KEY = 'test-secret-key'
      const response = await executeHandler(verifyHandler, {
        method: 'POST',
        path: '/api/verify',
        body: { token: 'wrong-token' },
      })

      expect(response.statusCode).toBe(401)
      expect(response.body).toMatchObject({
        status: 'Fail',
        message: 'Invalid authentication token',
        data: null,
        error: {
          code: 'AUTHENTICATION_ERROR',
          type: 'AuthenticationError',
          timestamp: expect.any(String),
        },
      })
    })

    it('should return 400 for missing token', async () => {
      process.env.AUTH_SECRET_KEY = 'test-secret-key'
      const response = await executeHandler(verifyHandler, {
        method: 'POST',
        path: '/api/verify',
        body: {},
      })

      expect(response.statusCode).toBe(400)
      expect(response.body).toMatchObject({
        status: 'Fail',
        message: 'Validation error: token is required',
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          type: 'ValidationError',
          timestamp: expect.any(String),
        },
      })
    })
  })

  describe('Route Path Normalization', () => {
    it('should handle both /api/health and /health paths', async () => {
      const paths = ['/api/health', '/health']

      for (const path of paths) {
        const response = await executeHandler(healthHandler, {
          method: 'GET',
          path,
          url: path,
        })

        expect(response.statusCode).toBe(200)
        expect(response.body).toMatchObject({
          uptime: expect.any(Number),
          message: 'OK',
          timestamp: expect.any(Number),
        })
      }
    })
  })
})
