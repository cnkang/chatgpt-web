import { beforeEach, describe, expect, it, vi } from 'vitest'

const { authStoreMock, fetchMock } = vi.hoisted(() => ({
  authStoreMock: {
    token: undefined as string | undefined,
    removeToken: vi.fn(),
  },
  fetchMock: vi.fn(),
}))

vi.mock('@/store', () => ({
  useAuthStore: () => authStoreMock,
}))

import { isUpstreamUnavailableError, post } from './fetch'

describe('request fetch client', () => {
  beforeEach(() => {
    authStoreMock.token = undefined
    authStoreMock.removeToken.mockReset()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  it('omits json headers for post requests without a body', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ status: 'Success', message: null, data: { auth: false } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await post({
      url: '/session',
      method: 'POST',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(options.method).toBe('POST')
    expect(options.body).toBeUndefined()
    expect(options.headers).toEqual({})
  })

  it('sends json headers when a post request includes data', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ status: 'Success', message: null, data: { ok: true } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await post({
      url: '/verify',
      method: 'POST',
      data: { token: 'test-token' },
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(options.body).toBe(JSON.stringify({ token: 'test-token' }))
  })

  it('classifies empty 5xx responses as upstream unavailable', async () => {
    fetchMock.mockResolvedValue(
      new Response('', {
        status: 500,
        statusText: 'Internal Server Error',
        headers: { 'Content-Type': 'text/plain' },
      }),
    )

    await expect(
      post({
        url: '/session',
        method: 'POST',
      }),
    ).rejects.toSatisfy(error => isUpstreamUnavailableError(error))
  })
})
