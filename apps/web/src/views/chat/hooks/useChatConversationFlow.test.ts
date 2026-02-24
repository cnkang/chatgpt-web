import type { Chat, ConversationResponse } from '@chatgpt-web/shared'
import { computed, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fetchChatAPIProcessMock, tMock } = vi.hoisted(() => ({
  fetchChatAPIProcessMock: vi.fn(),
  tMock: vi.fn((key: string) => key),
}))

vi.mock('@/api', () => ({
  fetchChatAPIProcess: fetchChatAPIProcessMock,
}))

vi.mock('@/locales', () => ({
  t: tMock,
}))

function makeChunk(params: {
  id: string
  text: string
  conversationId?: string
  parentMessageId?: string
  finishReason: string
}): ConversationResponse {
  return {
    id: params.id,
    conversationId: params.conversationId ?? 'conv-1',
    parentMessageId: params.parentMessageId ?? 'parent-0',
    role: 'assistant',
    text: params.text,
    detail: {
      id: `detail-${params.id}`,
      object: 'text_completion',
      created: Date.now(),
      model: 'test-model',
      usage: { completion_tokens: 1, prompt_tokens: 1, total_tokens: 2 },
      choices: [
        {
          index: 0,
          logprobs: null,
          text: params.text,
          finish_reason: params.finishReason,
        },
      ],
    },
  }
}

async function flushMicrotasks(times = 4) {
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve()
  }
}

describe('useChatConversationFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.stubEnv('VITE_GLOB_OPEN_LONG_REPLY', 'true')
  })

  it('continues long replies in a loop, preserves original prompt, and finalizes loading once', async () => {
    const chats = ref<Chat[]>([
      {
        id: 'assistant-1',
        dateTime: '2024/01/01 10:00',
        text: 'initial',
        inversion: false,
        error: false,
        loading: false,
        conversationOptions: null,
        requestOptions: {
          prompt: 'Explain in detail',
          options: { conversationId: 'conv-1', parentMessageId: 'parent-0' },
        },
      },
    ])

    const addChat = vi.fn((_: number, chat: Chat) => {
      chats.value.push(chat)
    })
    const updateChat = vi.fn((_: number, index: number, chat: Chat) => {
      chats.value[index] = chat
    })
    const updateChatSome = vi.fn((_: number, index: number, patch: Partial<Chat>) => {
      chats.value[index] = { ...chats.value[index], ...patch }
    })
    const getChatByUuidAndIndex = vi.fn((_: number, index: number) => chats.value[index] ?? null)
    const scrollToBottom = vi.fn(async () => {})
    const scrollToBottomIfAtBottom = vi.fn(async () => {})

    fetchChatAPIProcessMock
      .mockImplementationOnce(async ({ onDownloadProgress, options, prompt }) => {
        expect(prompt).toBe('Explain in detail')
        expect(options).toEqual({ conversationId: 'conv-1', parentMessageId: 'parent-0' })
        onDownloadProgress?.({
          responseText: `${JSON.stringify(
            makeChunk({
              id: 'msg-1',
              text: 'Part 1',
              parentMessageId: 'parent-0',
              finishReason: 'length',
            }),
          )}\n`,
        })
      })
      .mockImplementationOnce(async ({ onDownloadProgress, options, prompt }) => {
        expect(prompt).toBe('')
        expect(options).toEqual({ conversationId: 'conv-1', parentMessageId: 'msg-1' })
        onDownloadProgress?.({
          responseText: `${JSON.stringify(
            makeChunk({
              id: 'msg-2',
              text: ' + Part 2',
              parentMessageId: 'msg-1',
              finishReason: 'length',
            }),
          )}\n`,
        })
      })
      .mockImplementationOnce(async ({ onDownloadProgress, options, prompt }) => {
        expect(prompt).toBe('')
        expect(options).toEqual({ conversationId: 'conv-1', parentMessageId: 'msg-2' })
        onDownloadProgress?.({
          responseText: `${JSON.stringify(
            makeChunk({
              id: 'msg-3',
              text: ' + Part 3',
              parentMessageId: 'msg-2',
              finishReason: 'stop',
            }),
          )}\n`,
        })
      })

    const { useChatConversationFlow } = await import('./useChatConversationFlow')
    const flow = useChatConversationFlow({
      uuid: 1002,
      isMobile: ref(false),
      usingContext: ref(true),
      dataSources: computed(() => chats.value),
      conversationList: computed(() => chats.value),
      addChat,
      updateChat,
      updateChatSome,
      getChatByUuidAndIndex,
      scrollToBottom,
      scrollToBottomIfAtBottom,
    })

    await flow.onRegenerate(0)

    expect(fetchChatAPIProcessMock).toHaveBeenCalledTimes(3)
    expect(updateChatSome).toHaveBeenCalledTimes(1)
    expect(updateChatSome).toHaveBeenCalledWith(1002, 0, { loading: false })

    expect(chats.value[0]?.loading).toBe(false)
    expect(chats.value[0]?.text).toBe('Part 1 + Part 2 + Part 3')
    expect(chats.value[0]?.conversationOptions).toEqual({
      conversationId: 'conv-1',
      parentMessageId: 'msg-3',
    })
    expect(chats.value[0]?.requestOptions.prompt).toBe('Explain in detail')
  })

  it('handles abort during regenerate without entering error state', async () => {
    const chats = ref<Chat[]>([
      {
        id: 'assistant-1',
        dateTime: '2024/01/01 10:00',
        text: 'existing reply',
        inversion: false,
        error: false,
        loading: false,
        conversationOptions: { conversationId: 'conv-1', parentMessageId: 'parent-0' },
        requestOptions: {
          prompt: 'Regenerate me',
          options: { conversationId: 'conv-1', parentMessageId: 'parent-0' },
        },
      },
    ])

    const addChat = vi.fn((_: number, chat: Chat) => {
      chats.value.push(chat)
    })
    const updateChat = vi.fn((_: number, index: number, chat: Chat) => {
      chats.value[index] = chat
    })
    const updateChatSome = vi.fn((_: number, index: number, patch: Partial<Chat>) => {
      chats.value[index] = { ...chats.value[index], ...patch }
    })
    const getChatByUuidAndIndex = vi.fn((_: number, index: number) => chats.value[index] ?? null)
    const scrollToBottom = vi.fn(async () => {})
    const scrollToBottomIfAtBottom = vi.fn(async () => {})

    fetchChatAPIProcessMock.mockRejectedValueOnce(
      Object.assign(new Error('aborted'), { name: 'AbortError' }),
    )

    const { useChatConversationFlow } = await import('./useChatConversationFlow')
    const flow = useChatConversationFlow({
      uuid: 1002,
      isMobile: ref(false),
      usingContext: ref(true),
      dataSources: computed(() => chats.value),
      conversationList: computed(() => chats.value),
      addChat,
      updateChat,
      updateChatSome,
      getChatByUuidAndIndex,
      scrollToBottom,
      scrollToBottomIfAtBottom,
    })

    await flow.onRegenerate(0)

    expect(fetchChatAPIProcessMock).toHaveBeenCalledTimes(1)
    expect(updateChatSome).toHaveBeenCalledWith(1002, 0, { loading: false })
    expect(chats.value[0]?.loading).toBe(false)
    expect(chats.value[0]?.error).toBe(false)

    const errorWrites = updateChat.mock.calls.filter(([, , chat]) => chat.error === true)
    expect(errorWrites).toHaveLength(0)
  })

  it('handles abort during submit without entering error state', async () => {
    const chats = ref<Chat[]>([])

    const addChat = vi.fn((_: number, chat: Chat) => {
      chats.value.push(chat)
    })
    const updateChat = vi.fn((_: number, index: number, chat: Chat) => {
      chats.value[index] = chat
    })
    const updateChatSome = vi.fn((_: number, index: number, patch: Partial<Chat>) => {
      chats.value[index] = { ...chats.value[index], ...patch }
    })
    const getChatByUuidAndIndex = vi.fn((_: number, index: number) => chats.value[index] ?? null)
    const scrollToBottom = vi.fn(async () => {})
    const scrollToBottomIfAtBottom = vi.fn(async () => {})

    fetchChatAPIProcessMock.mockRejectedValueOnce(
      Object.assign(new Error('aborted'), { name: 'AbortError' }),
    )

    const { useChatConversationFlow } = await import('./useChatConversationFlow')
    const flow = useChatConversationFlow({
      uuid: 1002,
      isMobile: ref(false),
      usingContext: ref(true),
      dataSources: computed(() => chats.value),
      conversationList: computed(() => chats.value),
      addChat,
      updateChat,
      updateChatSome,
      getChatByUuidAndIndex,
      scrollToBottom,
      scrollToBottomIfAtBottom,
    })

    flow.prompt.value = 'Hello abort'
    flow.handleSubmit()

    await flushMicrotasks()

    expect(fetchChatAPIProcessMock).toHaveBeenCalledTimes(1)
    expect(addChat).toHaveBeenCalledTimes(2)
    expect(chats.value).toHaveLength(2)
    expect(chats.value[1]?.text).toBe('chat.thinking')
    expect(chats.value[1]?.loading).toBe(false)
    expect(chats.value[1]?.error).toBe(false)
    expect(updateChatSome).toHaveBeenCalledWith(1002, 1, { loading: false })
    expect(scrollToBottomIfAtBottom).toHaveBeenCalledTimes(1)
    expect(flow.loading.value).toBe(false)
    expect(flow.phase.value).toBe('idle')

    const errorWrites = updateChat.mock.calls.filter(([, , chat]) => chat.error === true)
    expect(errorWrites).toHaveLength(0)
  })

  it('keeps phase for the newer submit when a stopped request aborts later', async () => {
    const chats = ref<Chat[]>([])

    const addChat = vi.fn((_: number, chat: Chat) => {
      chats.value.push(chat)
    })
    const updateChat = vi.fn((_: number, index: number, chat: Chat) => {
      chats.value[index] = chat
    })
    const updateChatSome = vi.fn((_: number, index: number, patch: Partial<Chat>) => {
      chats.value[index] = { ...chats.value[index], ...patch }
    })
    const getChatByUuidAndIndex = vi.fn((_: number, index: number) => chats.value[index] ?? null)
    const scrollToBottom = vi.fn(async () => {})
    const scrollToBottomIfAtBottom = vi.fn(async () => {})

    type FetchParams = {
      onDownloadProgress?: (event: { responseText?: string }) => void
      options?: { conversationId?: string; parentMessageId?: string }
      prompt: string
    }

    let firstReject!: (reason?: unknown) => void
    const firstRequest = new Promise<void>((_, reject) => {
      firstReject = reject
    })

    let secondResolve!: () => void
    let secondParams!: FetchParams
    const secondRequest = new Promise<void>(resolve => {
      secondResolve = resolve
    })

    fetchChatAPIProcessMock
      .mockImplementationOnce(async () => {
        return firstRequest.then(() => undefined)
      })
      .mockImplementationOnce(async params => {
        secondParams = params as FetchParams
        return secondRequest.then(() => undefined)
      })

    const { useChatConversationFlow } = await import('./useChatConversationFlow')
    const flow = useChatConversationFlow({
      uuid: 1002,
      isMobile: ref(false),
      usingContext: ref(true),
      dataSources: computed(() => chats.value),
      conversationList: computed(() => chats.value),
      addChat,
      updateChat,
      updateChatSome,
      getChatByUuidAndIndex,
      scrollToBottom,
      scrollToBottomIfAtBottom,
    })

    flow.prompt.value = 'first prompt'
    flow.handleSubmit()
    await flushMicrotasks(2)

    expect(flow.phase.value).toBe('submitting')
    expect(fetchChatAPIProcessMock).toHaveBeenCalledTimes(1)

    flow.handleStop()
    expect(flow.phase.value).toBe('idle')

    flow.prompt.value = 'second prompt'
    flow.handleSubmit()
    await flushMicrotasks(2)

    expect(flow.phase.value).toBe('submitting')
    expect(fetchChatAPIProcessMock).toHaveBeenCalledTimes(2)

    firstReject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
    await flushMicrotasks()

    expect(flow.phase.value).toBe('submitting')

    expect(secondParams.prompt).toBe('second prompt')
    secondParams.onDownloadProgress?.({
      responseText: `${JSON.stringify(
        makeChunk({
          id: 'msg-race-2',
          text: 'second reply',
          finishReason: 'stop',
        }),
      )}\n`,
    })
    secondResolve()

    await flushMicrotasks(8)

    expect(flow.phase.value).toBe('idle')

    const secondReply = chats.value[3]
    expect(secondReply?.text).toBe('second reply')
    expect(secondReply?.loading).toBe(false)
  })
})
