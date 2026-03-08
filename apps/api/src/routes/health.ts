/**
 * Health Check Route Handler
 * GET /api/health - Returns server health status
 */

import type { RouteHandler } from '../transport/types.js'

/**
 * Health check endpoint
 * Returns server uptime, status message, and timestamp
 *
 * @route GET /api/health
 * @authentication None required
 * @rateLimit General limit (100 req/hour)
 */
export const healthHandler: RouteHandler = async (_req, res) => {
  res.status(200).json({
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
  })
}
