/**
 * Session Route Handler
 * POST /api/session - Returns session information
 */

import { currentModel } from '../chatgpt/provider-adapter.js'
import { getConfig } from '../providers/config.js'
import type { RouteHandler } from '../transport/types.js'

/**
 * Session endpoint
 * Returns authentication status and current model
 *
 * @route POST /api/session
 * @authentication None required
 * @rateLimit General limit (100 req/hour)
 */
export const sessionHandler: RouteHandler = async (_req, res) => {
  try {
    const config = getConfig()
    const model = currentModel()

    res.status(200).json({
      status: 'Success',
      message: '',
      data: {
        auth: Boolean(process.env.AUTH_SECRET_KEY),
        model: config.ai.defaultModel || model || 'gpt-4o',
      },
    })
  } catch (error) {
    res.status(500).json({
      status: 'Error',
      message: error instanceof Error ? error.message : 'Failed to retrieve session information',
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        type: error instanceof Error ? error.constructor.name : 'Error',
        timestamp: new Date().toISOString(),
      },
    })
  }
}
