import type { ServerResponse } from 'node:http'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { convertToModelMessagesMock, pipeUIMessageStreamToResponseMock, streamTextMock } =
  vi.hoisted(() => ({
    convertToModelMessagesMock: vi.fn(async (messages: unknown) => messages),
    pipeUIMessageStreamToResponseMock: vi.fn(),
    streamTextMock: vi.fn(async () => ({
      pipeUIMessageStreamToResponse: vi.fn(),
    })),
  }))

streamTextMock.mockImplementation(async () => ({
  pipeUIMessageStreamToResponse: pipeUIMessageStreamToResponseMock,
}))

vi.mock('ai', () => ({
  convertToModelMessages: convertToModelMessagesMock,
  streamText: streamTextMock,
}))

vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: () => ({
    chat: () => 'mock-openai-model',
  }),
}))

vi.mock('@ai-sdk/azure', () => ({
  createAzure: () => ({
    chat: () => 'mock-azure-chat-model',
  }),
}))

vi.mock('../providers/config.js', () => ({
  getConfig: () => ({
    ai: {
      provider: 'openai',
      defaultModel: 'gpt-4o-mini',
      openai: {
        apiKey: 'sk-test',
        baseUrl: '',
        organization: '',
      },
      azure: null,
    },
  }),
}))

import { pipeUIChatResponse } from './ai-sdk-chat.js'

function createMessages() {
  return [
    {
      id: 'u1',
      role: 'user' as const,
      parts: [{ type: 'text' as const, text: 'first question' }],
    },
    {
      id: 'a1',
      role: 'assistant' as const,
      parts: [{ type: 'text' as const, text: 'first answer' }],
    },
    {
      id: 'u2',
      role: 'user' as const,
      parts: [{ type: 'text' as const, text: 'second question' }],
    },
  ]
}

describe('pipeUIChatResponse usingContext behavior', () => {
  beforeEach(() => {
    convertToModelMessagesMock.mockClear()
    streamTextMock.mockClear()
    pipeUIMessageStreamToResponseMock.mockClear()
  })

  it('sends all messages when usingContext=true', async () => {
    const messages = createMessages()

    await pipeUIChatResponse({} as ServerResponse, {
      messages,
      usingContext: true,
    })

    expect(convertToModelMessagesMock).toHaveBeenCalledTimes(1)
    expect(convertToModelMessagesMock).toHaveBeenCalledWith(messages)
  })

  it('sends only the last user message when usingContext=false', async () => {
    const messages = createMessages()

    await pipeUIChatResponse({} as ServerResponse, {
      messages,
      usingContext: false,
    })

    expect(convertToModelMessagesMock).toHaveBeenCalledTimes(1)
    expect(convertToModelMessagesMock).toHaveBeenCalledWith([messages[2]])
  })
})
