/**
 * Chat Process Route Handler
 * POST /api/chat-process - Streaming chat completion endpoint
 */

import type { RequestOptions } from '@chatgpt-web/shared'
import { chatReplyProcess } from '../chatgpt/provider-adapter.js'
import type { RouteHandler, TransportResponse } from '../transport/types.js'
import { logger } from '../utils/logger.js'

interface ChatProcessBody {
  prompt?: string
  options?: unknown
  systemMessage?: string
  temperature?: number
  top_p?: number
}

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
    startStreamingResponse(res)

    const body = req.body as ChatProcessBody
    const prompt = getPrompt(body, res)
    if (!prompt) {
      return
    }

    await chatReplyProcess(buildRequestOptions(body, prompt, res))
    endStreamingResponse(res)
  } catch (error) {
    handleChatProcessError(error, res)
  }
}

function startStreamingResponse(res: TransportResponse): void {
  res.setHeader('Content-Type', 'application/octet-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.status(200)
}

function getPrompt(body: ChatProcessBody, res: TransportResponse): string | null {
  if (typeof body.prompt === 'string' && body.prompt.length > 0) {
    return body.prompt
  }

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

  return null
}

function buildRequestOptions(
  body: ChatProcessBody,
  prompt: string,
  res: TransportResponse,
): RequestOptions {
  let firstChunk = true

  return {
    message: prompt,
    lastContext: body.options as RequestOptions['lastContext'],
    systemMessage: body.systemMessage,
    temperature: body.temperature,
    top_p: body.top_p,
    process: response => {
      try {
        const line = firstChunk ? JSON.stringify(response) : `\n${JSON.stringify(response)}`
        firstChunk = false

        const canContinue = res.write(line)
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
}

function endStreamingResponse(res: TransportResponse): void {
  if (res.finished) {
    return
  }

  res.end()
}

function handleChatProcessError(error: unknown, res: TransportResponse): void {
  logger.error('Chat process error', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  })

  if (res.headersSent) {
    endStreamingResponse(res)
    return
  }

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
