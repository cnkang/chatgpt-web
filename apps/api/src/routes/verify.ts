/**
 * Verify Route Handler
 * POST /api/verify - Verify authentication credentials
 */

import { timingSafeEqual } from 'node:crypto'
import type { RouteHandler } from '../transport/types.js'

/**
 * Constant-time comparison to prevent timing attacks
 */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA) // Constant time for length of bufA
    return false
  }
  return timingSafeEqual(bufA, bufB)
}

/**
 * Verify endpoint
 * Validates authentication token against configured secret
 *
 * @route POST /api/verify
 * @authentication Required (token in body)
 * @rateLimit Strict limit (10 req/15min)
 * @bodyLimit 1KB (1024 bytes)
 */
export const verifyHandler: RouteHandler = async (req, res) => {
  try {
    const body = req.body as { token?: string }

    // Validate request body
    if (!body.token || typeof body.token !== 'string') {
      res.status(400).json({
        status: 'Fail',
        message: 'Validation error: token is required',
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          type: 'ValidationError',
          timestamp: new Date().toISOString(),
        },
      })
      return
    }

    // Get AUTH_SECRET_KEY from environment
    const secretKey = process.env.AUTH_SECRET_KEY

    // Check if AUTH_SECRET_KEY is configured
    if (!secretKey) {
      res.status(401).json({
        status: 'Fail',
        message: 'Authentication is not configured',
        data: null,
        error: {
          code: 'AUTHENTICATION_ERROR',
          type: 'AuthenticationError',
          timestamp: new Date().toISOString(),
        },
      })
      return
    }

    // Verify token using constant-time comparison
    const isValid = safeEqual(body.token.trim(), secretKey.trim())

    if (!isValid) {
      res.status(401).json({
        status: 'Fail',
        message: 'Invalid authentication token',
        data: null,
        error: {
          code: 'AUTHENTICATION_ERROR',
          type: 'AuthenticationError',
          timestamp: new Date().toISOString(),
        },
      })
      return
    }

    // Valid token
    res.status(200).json({
      status: 'Success',
      message: 'Verify successfully',
      data: null,
    })
  } catch (error) {
    res.status(500).json({
      status: 'Error',
      message: error instanceof Error ? error.message : 'Internal server error',
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        type: error instanceof Error ? error.constructor.name : 'Error',
        timestamp: new Date().toISOString(),
      },
    })
  }
}
