/**
 * CORS Middleware for Native Routing
 *
 * Handles Cross-Origin Resource Sharing (CORS) with environment-aware defaults
 * and security checks. Validates Origin headers against allowed list and handles
 * preflight OPTIONS requests.
 */

import type { MiddlewareHandler, TransportRequest, TransportResponse } from '../transport/types.js'

/**
 * Creates CORS middleware with environment-aware configuration
 *
 * @returns Middleware handler that sets CORS headers and handles preflight requests
 *
 * @example
 * ```typescript
 * const corsMiddleware = createCorsMiddleware()
 * router.use(corsMiddleware)
 * ```
 */
export function createCorsMiddleware(): MiddlewareHandler {
  const isProduction = process.env.NODE_ENV === 'production'

  // Parse ALLOWED_ORIGINS from environment (comma-separated)
  const configuredOrigins = process.env.ALLOWED_ORIGINS?.split(',')
    .map(o => o.trim())
    .filter(Boolean)
    .filter(origin => origin !== '*') // Block wildcard (*) origins in production

  // Default to localhost:1002 in development, no defaults in production
  let allowedOrigins = configuredOrigins ?? []
  if (allowedOrigins.length === 0 && !isProduction) {
    allowedOrigins = ['http://localhost:1002', 'http://127.0.0.1:1002']
  }

  return async (req: TransportRequest, res: TransportResponse, next) => {
    // Get Origin header from request
    const origin = req.getHeader('origin')?.trim()

    // Check if origin is null (file://, data:, etc.)
    const isNullOrigin = origin === 'null'

    // Validate Origin header against allowed list
    const isOriginAllowed = !isNullOrigin && origin && allowedOrigins.includes(origin)

    // Set Access-Control-Allow-Origin only for allowed origins
    if (isOriginAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Access-Control-Allow-Credentials', 'true')
      res.setHeader('Vary', 'Origin')
    }

    // Set Access-Control-Allow-Headers and Access-Control-Allow-Methods
    res.setHeader('Access-Control-Allow-Headers', 'authorization, Content-Type, X-Requested-With')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Max-Age', '86400')

    // Handle OPTIONS preflight requests
    if (req.method === 'OPTIONS') {
      // Return 403 for null origins or disallowed origins
      if (isNullOrigin || (origin && !isOriginAllowed)) {
        res.status(403).end()
        return
      }

      // Return 200 for allowed origins or no origin
      res.status(200).end()
      return
    }

    // Continue to next middleware for non-OPTIONS requests
    next()
  }
}
