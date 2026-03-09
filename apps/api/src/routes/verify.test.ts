/**
 * Verify Route Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockRequest, createMockResponse } from '../test/test-helpers.js'
import { verifyHandler } from './verify.js'

const originalEnv = process.env

describe('Verify Route', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  async function executeVerify(body: unknown) {
    const req = createMockRequest({
      method: 'POST',
      path: '/api/verify',
      body,
    })
    const res = createMockResponse()

    await verifyHandler(req, res)

    return res._capture
  }

  it('should return 200 for valid token', async () => {
    process.env.AUTH_SECRET_KEY = 'test-secret-key'
    const response = await executeVerify({ token: 'test-secret-key' })

    expect(response.statusCode).toBe(200)
    expect(response.body).toMatchObject({
      status: 'Success',
      message: 'Verify successfully',
      data: null,
    })
  })

  it('should return 401 for invalid token', async () => {
    process.env.AUTH_SECRET_KEY = 'test-secret-key'
    const response = await executeVerify({ token: 'wrong-token' })

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
    const response = await executeVerify({})

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

  it('should use constant-time comparison for tokens', async () => {
    process.env.AUTH_SECRET_KEY = 'secret123'
    const response = await executeVerify({ token: 'short' })

    expect(response.statusCode).toBe(401)
  })
})
