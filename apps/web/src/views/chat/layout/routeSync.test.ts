import { describe, expect, it, vi } from 'vitest'
import { parseChatRouteUuid, syncChatRoute } from './routeSync'

describe('routeSync', () => {
  it('parses valid numeric chat params', () => {
    expect(parseChatRouteUuid('123')).toBe(123)
    expect(parseChatRouteUuid(['456'])).toBe(456)
  })

  it('returns null for invalid chat params', () => {
    expect(parseChatRouteUuid(undefined)).toBeNull()
    expect(parseChatRouteUuid('')).toBeNull()
    expect(parseChatRouteUuid('abc')).toBeNull()
    expect(parseChatRouteUuid('0')).toBeNull()
  })

  it('redirects /chat to the active conversation when available', async () => {
    const replaceRoute = vi.fn(async () => {})
    const syncActive = vi.fn()

    await syncChatRoute({
      routeUuid: null,
      activeUuid: 1002,
      replaceRoute,
      syncActive,
    })

    expect(replaceRoute).toHaveBeenCalledWith(1002)
    expect(syncActive).not.toHaveBeenCalled()
  })

  it('syncs the store from an explicit route uuid', async () => {
    const replaceRoute = vi.fn(async () => {})
    const syncActive = vi.fn()

    await syncChatRoute({
      routeUuid: 2002,
      activeUuid: 1002,
      replaceRoute,
      syncActive,
    })

    expect(syncActive).toHaveBeenCalledWith(2002)
    expect(replaceRoute).not.toHaveBeenCalled()
  })
})
