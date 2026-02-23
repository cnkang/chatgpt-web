/**
 * Shared SSE (Server-Sent Events) stream parser.
 * Extracts `data:` payloads from a ReadableStream, handling buffering
 * of incomplete lines across chunks.
 */

import { logger } from './logger.js'

/**
 * Parsed SSE payload — either a JSON object or the `[DONE]` sentinel.
 */
export type SSEPayload = { type: 'data'; json: unknown } | { type: 'done' }

/**
 * Async generator that reads a ReadableStream<Uint8Array> and yields
 * parsed SSE payloads. Handles:
 * - Standard `data: {...}` lines
 * - `data: [DONE]` sentinel
 * - Raw JSON lines without `data:` prefix (some Azure implementations)
 * - Buffering of incomplete lines across read() boundaries
 */
export async function* parseSSEStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<SSEPayload> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        // Flush remaining buffer
        if (buffer.trim()) {
          yield* processLines(buffer.split('\n'))
        }
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')

      // Keep the last (potentially incomplete) line in the buffer
      buffer = lines.pop() || ''

      yield* processLines(lines)
    }
  } finally {
    reader.releaseLock()
  }
}

function* processLines(lines: string[]): Generator<SSEPayload> {
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('event:')) continue

    if (trimmed.startsWith('data: ')) {
      const data = trimmed.slice(6).trim()

      if (data === '[DONE]') {
        yield { type: 'done' }
        return // Stop processing after [DONE]
      }

      if (data) {
        try {
          yield { type: 'data', json: JSON.parse(data) }
        } catch (error) {
          logger.warn('SSE: failed to parse data line', { line: trimmed, error })
        }
      }
    } else {
      // Some Azure implementations send raw JSON without "data:" prefix
      try {
        yield { type: 'data', json: JSON.parse(trimmed) }
      } catch {
        // Not JSON — skip silently
      }
    }
  }
}
