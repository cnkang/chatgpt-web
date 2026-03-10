/**
 * Chat Process Route Handler
 * POST /api/chat-process - AI SDK UI streaming chat endpoint
 */

import type { UIMessage } from 'ai'
import type { ServerResponse } from 'node:http'
import { pipeUIChatResponse } from '../chatgpt/ai-sdk-chat.js'
import type { RouteHandler, TransportResponse } from '../transport/types.js'
import { createValidationError } from '../utils/error-handler.js'

interface ChatProcessBody {
  messages?: UIMessage[]
  systemMessage?: string
  temperature?: number
  top_p?: number
  usingContext?: boolean
}

/**
 * Chat process endpoint with AI SDK UI streaming support
 *
 * @route POST /api/chat-process
 * @authentication Required (AUTH_SECRET_KEY)
 * @rateLimit General limit (100 req/hour)
 * @bodyLimit 1MB (1048576 bytes)
 */
export const chatProcessHandler: RouteHandler = async (req, res) => {
  const body = req.body as ChatProcessBody

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    throw createValidationError('Validation error: messages are required')
  }

  await handleUIMessageStream(body as ChatProcessBody & { messages: UIMessage[] }, res)
}

/**
 * Stream chat responses for the provided UI messages to the native HTTP response.
 *
 * Streams model output for the given `messages`, applying the optional `systemMessage`,
 * `temperature`, `top_p`, and `usingContext` generation parameters.
 *
 * @param body - Request body containing `messages` (required) and optional `systemMessage`, `temperature`, `top_p`, and `usingContext`.
 * @param res - Transport response wrapper that must expose a `_nativeResponse` (node `ServerResponse`) to write the streamed output.
 * @throws Error if the native HTTP response (`_nativeResponse`) is not available on `res`.
 */
async function handleUIMessageStream(
  body: ChatProcessBody & { messages: UIMessage[] },
  res: TransportResponse,
) {
  const nativeResponse = (res as TransportResponse & { _nativeResponse?: ServerResponse })
    ._nativeResponse

  if (!nativeResponse) {
    throw new Error('Native response is unavailable for UI message streaming')
  }

  await pipeUIChatResponse(nativeResponse, {
    messages: body.messages,
    systemMessage: body.systemMessage,
    temperature: body.temperature,
    top_p: body.top_p,
    usingContext: body.usingContext,
  })
}
