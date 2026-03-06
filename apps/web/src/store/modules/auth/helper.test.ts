import { beforeEach, describe, expect, it, vi } from 'vitest'

const { sessionMock } = vi.hoisted(() => ({
  sessionMock: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}))

vi.mock('@/utils/storage', () => ({
  session: sessionMock,
}))

import { getToken, removeToken, setToken } from './helper'

describe('auth storage helper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reads the token from session storage', () => {
    sessionMock.get.mockReturnValue('token-123')

    expect(getToken()).toBe('token-123')
    expect(sessionMock.get).toHaveBeenCalledWith('SECRET_TOKEN')
  })

  it('writes the token to session storage', () => {
    setToken('token-456')

    expect(sessionMock.set).toHaveBeenCalledWith('SECRET_TOKEN', 'token-456')
  })

  it('removes the token from session storage', () => {
    removeToken()

    expect(sessionMock.remove).toHaveBeenCalledWith('SECRET_TOKEN')
  })
})
