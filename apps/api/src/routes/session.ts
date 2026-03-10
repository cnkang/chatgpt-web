/**
 * Session Route Handler
 * POST /api/session - Returns session information
 */

import { currentModel } from '../chatgpt/provider-adapter.js'
import type { RouteHandler, SessionData } from '../transport/types.js'

/**
 * Session endpoint
 * Returns authentication status and current model
 *
 * @route POST /api/session
 * @authentication None required
 * @rateLimit General limit (100 req/hour)
 */
function updateSessionMetadata(session: SessionData | undefined): void {
  if (!session) {
    return
  }

  const previousCount =
    typeof session.data.requestCount === 'number' ? session.data.requestCount : 0

  session.data.requestCount = previousCount + 1
  session.data.lastAccessedAt = new Date().toISOString()
}

export const sessionHandler: RouteHandler = async (req, res) => {
  try {
    const model = currentModel()
    updateSessionMetadata(req.session)

    res.status(200).json({
      status: 'Success',
      message: '',
      data: {
        auth: Boolean(process.env.AUTH_SECRET_KEY),
        model,
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
