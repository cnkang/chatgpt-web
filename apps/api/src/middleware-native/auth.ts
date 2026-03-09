/**
 * Authentication Middleware for Native Routing
 *
 * Validates Bearer tokens against AUTH_SECRET_KEY using constant-time comparison
 * to prevent timing attacks.
 */

import type { MiddlewareHandler, TransportRequest, TransportResponse } from '../transport/types.js'
import { constantTimeEqual } from '../utils/constant-time.js'

/**
 * Creates authentication middleware that validates Bearer tokens
 *
 * @param secretKey - The AUTH_SECRET_KEY from environment variables
 * @returns Middleware handler that validates authentication
 *
 * @example
 * ```typescript
 * const authMiddleware = createAuthMiddleware(process.env.AUTH_SECRET_KEY || '')
 * router.post('/api/config', authMiddleware, configHandler)
 * ```
 */
export function createAuthMiddleware(secretKey: string): MiddlewareHandler {
  return async (req: TransportRequest, res: TransportResponse, next) => {
    // If no secret key is configured, skip authentication
    if (!secretKey) {
      return next()
    }

    try {
      // Extract Authorization header
      const authorization = req.getHeader('authorization')

      // Check if Authorization header is present and has Bearer prefix
      if (!authorization || !authorization.startsWith('Bearer ')) {
        res.status(401).json({
          status: 'Fail',
          message: 'Error: No access rights',
          data: null,
          error: {
            code: 'AUTHENTICATION_ERROR',
            type: 'AuthenticationError',
            timestamp: new Date().toISOString(),
          },
        })
        return
      }

      // Extract Bearer token
      const token = authorization.replace('Bearer ', '').trim()

      // Validate token using constant-time comparison
      if (!constantTimeEqual(token, secretKey.trim())) {
        res.status(401).json({
          status: 'Fail',
          message: 'Error: No access rights',
          data: null,
          error: {
            code: 'AUTHENTICATION_ERROR',
            type: 'AuthenticationError',
            timestamp: new Date().toISOString(),
          },
        })
        return
      }

      // Authentication successful, proceed to next middleware
      next()
    } catch (error) {
      // Handle unexpected errors during authentication
      res.status(401).json({
        status: 'Fail',
        message: error instanceof Error ? error.message : 'Please authenticate.',
        data: null,
        error: {
          code: 'AUTHENTICATION_ERROR',
          type: error instanceof Error ? error.constructor.name : 'Error',
          timestamp: new Date().toISOString(),
        },
      })
      return
    }
  }
}
