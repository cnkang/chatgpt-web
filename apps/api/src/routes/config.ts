/**
 * Config Route Handler
 * POST /api/config - Returns provider configuration
 */

import { chatConfig } from '../chatgpt/provider-adapter.js'
import type { RouteHandler } from '../transport/types.js'

/**
 * Configuration endpoint
 * Returns AI provider configuration including model, timeout, proxy settings
 *
 * @route POST /api/config
 * @authentication Required (AUTH_SECRET_KEY)
 * @rateLimit General limit (100 req/hour)
 */
export const configHandler: RouteHandler = async (_req, res) => {
  try {
    const config = await chatConfig()
    res.status(200).json(config)
  } catch (error) {
    res.status(500).json({
      status: 'Error',
      message: error instanceof Error ? error.message : 'Failed to retrieve configuration',
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        type: error instanceof Error ? error.constructor.name : 'Error',
        timestamp: new Date().toISOString(),
      },
    })
  }
}
