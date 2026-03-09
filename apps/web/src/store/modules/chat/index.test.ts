import type { ChatState } from '@chatgpt-web/shared'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type WindowListener = () => void

const { setLocalStateMock, getLocalStateMock, routerPushMock, tMock } = vi.hoisted(() => ({
  setLocalStateMock: vi.fn(),
  getLocalStateMock: vi.fn(),
  routerPushMock: vi.fn(async () => {}),
  tMock: vi.fn((key: string) => key),
}))

vi.mock('./helper', () => ({
  createChatMessageId: vi.fn(() => 'mock-message-id'),
  defaultState: vi.fn(() => ({
    active: 1002,
    usingContext: true,
    history: [{ uuid: 1002, title: 'New Chat', isEdit: false }],
    chat: [{ uuid: 1002, data: [] }],
  })),
  getLocalState: getLocalStateMock,
  setLocalState: setLocalStateMock,
}))

vi.mock('@/router', () => ({
  router: { push: routerPushMock },
}))

vi.mock('@/locales', () => ({
  t: tMock,
}))

function makeState(): ChatState {
  return {
    active: 1002,
    usingContext: true,
    history: [{ uuid: 1002, title: 'New Chat', isEdit: false }],
    chat: [{ uuid: 1002, data: [] }],
  }
}

function createFakeWindow() {
  const listeners = new Map<string, WindowListener[]>()

  return {
    setTimeout: (handler: TimerHandler, timeout?: number) =>
      globalThis.setTimeout(handler, timeout),
    clearTimeout: (id: number) => globalThis.clearTimeout(id),
    addEventListener: (type: string, listener: WindowListener) => {
      const current = listeners.get(type) ?? []
      current.push(listener)
      listeners.set(type, current)
    },
    emit: (type: string) => {
      for (const listener of listeners.get(type) ?? []) listener()
    },
  }
}

async function setupStore() {
  const fakeWindow = createFakeWindow()
  vi.stubGlobal('window', fakeWindow)
  setActivePinia(createPinia())
  const { useChatStore } = await import('./index')
  return { store: useChatStore(), fakeWindow }
}

describe('chat store persistence throttling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.resetModules()
    setLocalStateMock.mockReset()
    getLocalStateMock.mockReset()
    routerPushMock.mockReset()
    tMock.mockClear()
    getLocalStateMock.mockImplementation(() => makeState())
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('coalesces delayed recordState writes and flushes the latest state', async () => {
    const { store } = await setupStore()

    store.usingContext = false
    store.recordState()
    store.usingContext = true
    store.active = 2001
    store.recordState()

    expect(setLocalStateMock).not.toHaveBeenCalled()

    vi.advanceTimersByTime(119)
    expect(setLocalStateMock).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(setLocalStateMock).toHaveBeenCalledTimes(1)
    expect(setLocalStateMock.mock.calls[0]?.[0]).toMatchObject({
      active: 2001,
      usingContext: true,
    })
  })

  it('flushes pending persistence on pagehide', async () => {
    const { store, fakeWindow } = await setupStore()

    store.usingContext = false
    store.recordState()
    expect(setLocalStateMock).not.toHaveBeenCalled()

    fakeWindow.emit('pagehide')

    expect(setLocalStateMock).toHaveBeenCalledTimes(1)
    expect(setLocalStateMock.mock.calls[0]?.[0]).toMatchObject({ usingContext: false })

    vi.runAllTimers()
    expect(setLocalStateMock).toHaveBeenCalledTimes(1)
  })

  it('flushes immediately when recordState(true) is used', async () => {
    const { store } = await setupStore()

    store.active = 3003
    store.recordState(true)

    expect(setLocalStateMock).toHaveBeenCalledTimes(1)
    expect(setLocalStateMock.mock.calls[0]?.[0]).toMatchObject({ active: 3003 })

    vi.runAllTimers()
    expect(setLocalStateMock).toHaveBeenCalledTimes(1)
  })

  it('syncs an explicit route without triggering navigation', async () => {
    const { store } = await setupStore()

    store.syncActiveFromRoute(4004)

    expect(store.active).toBe(4004)
    expect(store.history[0]).toMatchObject({ uuid: 4004, title: 'chat.newChatTitle' })
    expect(store.chat[0]).toMatchObject({ uuid: 4004, data: [] })
    expect(routerPushMock).not.toHaveBeenCalled()
    expect(setLocalStateMock).toHaveBeenCalledTimes(1)
  })

  it('resets to the default conversation and updates the route when clearing history', async () => {
    const { store } = await setupStore()

    store.syncActiveFromRoute(4004)
    routerPushMock.mockClear()
    setLocalStateMock.mockClear()

    store.clearHistory()

    expect(store.active).toBe(1002)
    expect(store.history).toHaveLength(1)
    expect(store.history[0]).toMatchObject({ uuid: 1002 })
    expect(routerPushMock).toHaveBeenCalledWith({ name: 'Chat', params: { uuid: 1002 } })
    expect(setLocalStateMock).toHaveBeenCalledTimes(1)
  })
})
