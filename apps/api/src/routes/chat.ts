/**
 * Chat Process Route Handler
 * POST /api/chat-process - Streaming chat completion endpoint
 */

import type { RequestOptions } from '@chatgpt-web/shared'
import { chatReplyProcess } from '../chatgpt/provider-adapter.js'
import type { RouteHandler } from '../transport/types.js'
import { logger } from '../utils/logger.js'

/**
 * Chat process endpoint with streaming support
 * Streams AI responses in real-time using application/octet-stream
 *
 * @route POST /api/chat-process
 * @authentication Required (AUTH_SECRET_KEY)
 * @rateLimit General limit (100 req/hour)
 * @bodyLimit 1MB (1048576 bytes)
 */
export const chatProcessHandler: RouteHandler = async (req, res) => {
  try {
    // Set streaming headers
    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.status(200)

    // Extract request body
    const body = req.body as {
      prompt?: string
      options?: unknown
      systemMessage?: string
      temperature?: number
      top_p?: number
    }

    // Validate required fields
    if (!body.prompt || typeof body.prompt !== 'string') {
      res.status(400).json({
        status: 'Fail',
        message: 'Validation error: prompt is required',
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          type: 'ValidationError',
          timestamp: new Date().toISOString(),
        },
      })
      return
    }

    let firstChunk = true

    // Build request options for chat provider
    const requestOptions: RequestOptions = {
      message: body.prompt,
      lastContext: body.options as RequestOptions['lastContext'],
      systemMessage: body.systemMessage,
      temperature: body.temperature,
      top_p: body.top_p,
      process: response => {
        try {
          // Format as newline-delimited JSON
          // First chunk has no leading newline, subsequent chunks have \n prefix
          const line = firstChunk ? JSON.stringify(response) : `\n${JSON.stringify(response)}`
          firstChunk = false

          // Write chunk to response
          const canContinue = res.write(line)

          // Handle backpressure if needed
          if (!canContinue && !res.finished) {
            logger.debug('Backpressure detected in streaming response')
          }
        } catch (error) {
          logger.error('Error writing streaming chunk', {
            error: error instanceof Error ? error.message : String(error),
          })
        }
      },
    }

    // Process chat request with streaming
    await chatReplyProcess(requestOptions)

    // End streaming response
    if (!res.finished) {
      res.end()
    }
  } catch (error) {
    logger.error('Chat process error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })

    // Handle errors during streaming
    if (!res.headersSent) {
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
    } else {
      // Headers already sent, just close connection
      if (!res.finished) {
        res.end()
      }
    }
  }
}
