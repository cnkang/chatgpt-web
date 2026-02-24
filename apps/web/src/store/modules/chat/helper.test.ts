import type { ChatState } from '@chatgpt-web/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { ssMock, tMock } = vi.hoisted(() => ({
  ssMock: {
    get: vi.fn(),
    set: vi.fn(),
  },
  tMock: vi.fn((key: string) => (key === 'chat.newChatTitle' ? 'New Chat' : key)),
}))

vi.mock('@/utils/storage', () => ({
  ss: ssMock,
}))

vi.mock('@/locales', () => ({
  t: tMock,
}))

import { defaultState, getLocalState, setLocalState } from './helper'

describe('chat storage helper', () => {
  beforeEach(() => {
    ssMock.get.mockReset()
    ssMock.set.mockReset()
    tMock.mockClear()
  })

  it('migrates legacy storage and preserves message ids', () => {
    ssMock.get.mockReturnValue({
      active: '1002',
      history: [{ uuid: '1002', isEdit: 'not-bool' }],
      chat: [
        {
          uuid: '1002',
          data: [
            {
              id: 'legacy-id-1',
              text: 'legacy user message',
              dateTime: '2024/01/01 10:00',
              inversion: true,
              prompt: 'legacy prompt',
              options: { conversationId: 'conv-1' },
            },
            {
              text: 'legacy assistant reply',
              dateTime: '2024/01/01 10:01',
              loading: true,
              requestOptions: {
                prompt: 'assistant prompt',
                options: { parentMessageId: 'parent-1' },
              },
            },
          ],
        },
      ],
    })

    const state = getLocalState()

    expect(state.active).toBe(1002)
    expect(state.usingContext).toBe(true)
    expect(state.history).toEqual([{ uuid: 1002, title: 'New Chat', isEdit: false }])

    expect(state.chat[0]?.data[0]?.id).toBe('legacy-id-1')
    expect(state.chat[0]?.data[0]?.requestOptions).toEqual({
      prompt: 'legacy prompt',
      options: { conversationId: 'conv-1' },
    })

    expect(state.chat[0]?.data[1]?.id).toEqual(expect.any(String))
    expect(state.chat[0]?.data[1]?.requestOptions).toEqual({
      prompt: 'assistant prompt',
      options: { parentMessageId: 'parent-1' },
    })
  })

  it('falls back to default state when a newer payload version fails schema validation', () => {
    ssMock.get.mockReturnValue({
      version: 999,
      state: {
        active: 1002,
        usingContext: true,
        history: 'invalid',
        chat: [],
      },
    })

    const state = getLocalState()

    expect(state).toEqual(defaultState())
  })

  it('writes versioned payload to storage', () => {
    const state: ChatState = {
      ...defaultState(),
      chat: [
        {
          uuid: 1002,
          data: [
            {
              id: 'msg-1',
              dateTime: '2024/01/01 10:00',
              text: 'hello',
              inversion: true,
              error: false,
              loading: false,
              conversationOptions: null,
              requestOptions: { prompt: 'hello', options: null },
            },
          ],
        },
      ],
    }

    setLocalState(state)

    expect(ssMock.set).toHaveBeenCalledTimes(1)
    expect(ssMock.set).toHaveBeenCalledWith(
      'chatStorage',
      expect.objectContaining({
        version: 1,
        state,
      }),
    )
  })
})
