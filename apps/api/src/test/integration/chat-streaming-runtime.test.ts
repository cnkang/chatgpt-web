import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getAvailablePort } from '../test-helpers.js'

const originalEnv = process.env
const TEST_AUTH_TOKEN = 'test-secret-key-12345'

function createChatBody(text = 'Hello from runtime stream test') {
  return {
    messages: [
      {
        id: 'msg-user-1',
        role: 'user',
        parts: [{ type: 'text', text }],
      },
    ],
    systemMessage: 'You are a helpful assistant',
  }
}

function getCookieHeader(setCookieHeader: string | null) {
  return setCookieHeader?.split(';')[0] ?? ''
}

describe('chat streaming runtime integration', () => {
  let adapter: { getServer(): { close(callback: () => void): void } } | null = null
  let baseUrl = ''
  let loggerSpy: {
    debug: ReturnType<typeof vi.fn>
    error: ReturnType<typeof vi.fn>
    info: ReturnType<typeof vi.fn>
    logApiCall: ReturnType<typeof vi.fn>
    logPerformance: ReturnType<typeof vi.fn>
    warn: ReturnType<typeof vi.fn>
  }

  beforeEach(async () => {
    vi.resetModules()

    const port = await getAvailablePort()
    process.env = {
      ...originalEnv,
      AUTH_SECRET_KEY: TEST_AUTH_TOKEN,
      HOST: '127.0.0.1',
      HTTP2_ENABLED: 'false',
      NODE_ENV: 'test',
      OPENAI_API_KEY: 'sk-test-runtime-stream-key',
      PORT: String(port),
    }

    loggerSpy = {
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      logApiCall: vi.fn(),
      logPerformance: vi.fn(),
      warn: vi.fn(),
    }

    const loggerModule = await import('../../utils/logger.js')
    vi.spyOn(loggerModule, 'logger', 'get').mockReturnValue(loggerSpy as never)

    vi.doMock('../../chatgpt/ai-sdk-chat.js', () => ({
      pipeUIChatResponse: async (
        response: import('node:http').ServerResponse,
        options: { messages: Array<{ parts?: Array<{ text?: string }> }> },
      ) => {
        const prompt = options.messages[0]?.parts?.[0]?.text ?? 'unknown'

        response.writeHead(200, {
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'Content-Type': 'text/event-stream; charset=utf-8',
        })
        response.write('data: {"type":"start"}\n\n')
        response.end(`data: {"type":"finish","text":"Mock assistant reply for: ${prompt}"}\n\n`)
      },
    }))

    const { createConfiguredServer } = await import('../../server.js')
    const configuredServer = createConfiguredServer()
    adapter = configuredServer.adapter
    await configuredServer.adapter.listen(port, '127.0.0.1')
    baseUrl = `http://${configuredServer.runtime.host}:${configuredServer.runtime.port}`
  })

  afterEach(async () => {
    await new Promise<void>(resolve => {
      if (!adapter) {
        resolve()
        return
      }

      adapter.getServer().close(() => resolve())
    })

    adapter = null
    baseUrl = ''
    process.env = originalEnv
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('streams SSE responses and preserves the session created during chat', async () => {
    const chatResponse = await fetch(`${baseUrl}/chat-process`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TEST_AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createChatBody()),
    })

    expect(chatResponse.status).toBe(200)
    expect(chatResponse.headers.get('content-type')).toContain('text/event-stream')

    const setCookie = chatResponse.headers.get('set-cookie')
    expect(setCookie).toContain('sessionId=')

    const chatStreamBody = await chatResponse.text()
    expect(chatStreamBody).toContain('"type":"start"')
    expect(chatStreamBody).toContain('Mock assistant reply for: Hello from runtime stream test')

    const sessionCookie = getCookieHeader(setCookie)
    expect(sessionCookie).toContain('sessionId=')

    const sessionResponse = await fetch(`${baseUrl}/session`, {
      method: 'POST',
      headers: {
        Cookie: sessionCookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })

    expect(sessionResponse.status).toBe(200)
    expect(getCookieHeader(sessionResponse.headers.get('set-cookie'))).toBe(sessionCookie)
  })

  it('emits completion logs for streamed chat responses', async () => {
    const response = await fetch(`${baseUrl}/chat-process`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TEST_AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createChatBody('Log this request')),
    })

    expect(response.status).toBe(200)
    await response.text()

    expect(loggerSpy.logApiCall).toHaveBeenCalledWith(
      'POST',
      '/chat-process',
      200,
      expect.any(Number),
      expect.objectContaining({
        ip: '127.0.0.1',
      }),
    )
    expect(loggerSpy.logPerformance).toHaveBeenCalledWith(
      'POST /chat-process',
      expect.any(Number),
      expect.objectContaining({
        statusCode: 200,
      }),
      expect.any(Object),
    )
  })
})
