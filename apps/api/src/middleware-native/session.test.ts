/**
 * Session Middleware Tests
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockRequest, createMockResponse } from '../test/test-helpers.js'
import { signValue } from '../utils/constant-time.js'
import {
  MemorySessionStore,
  RedisSessionStore,
  createSessionMiddleware,
  type SessionStore,
} from './session.js'

type TestSessionStore = SessionStore & {
  isAvailable?: () => Promise<boolean>
}

describe('MemorySessionStore', () => {
  let store: MemorySessionStore

  beforeEach(() => {
    store = new MemorySessionStore()
  })

  it('should store and retrieve session', async () => {
    const session = {
      id: 'test-id',
      data: { userId: '123' },
      expires: Date.now() + 1000,
    }

    await store.set('test-id', session)
    const retrieved = await store.get('test-id')

    expect(retrieved).toEqual(session)
  })

  it('should return null for non-existent session', async () => {
    const retrieved = await store.get('non-existent')
    expect(retrieved).toBeNull()
  })

  it('should return null for expired session', async () => {
    const session = {
      id: 'test-id',
      data: { userId: '123' },
      expires: Date.now() - 1000, // Already expired
    }

    await store.set('test-id', session)
    const retrieved = await store.get('test-id')

    expect(retrieved).toBeNull()
  })

  it('should destroy session', async () => {
    const session = {
      id: 'test-id',
      data: { userId: '123' },
      expires: Date.now() + 1000,
    }

    await store.set('test-id', session)
    await store.destroy('test-id')
    const retrieved = await store.get('test-id')

    expect(retrieved).toBeNull()
  })
})

describe('RedisSessionStore', () => {
  it('should create Redis client with URL and password', () => {
    // Mock createClient to avoid actual Redis connection
    const store = new RedisSessionStore('redis://localhost:6379', 'password')
    expect(store).toBeDefined()
  })
})

describe('createSessionMiddleware', () => {
  let mockReq: ReturnType<typeof createMockRequest>
  let mockRes: ReturnType<typeof createMockResponse>
  let nextFn: (error?: Error) => void
  let store: SessionStore

  beforeEach(() => {
    store = new MemorySessionStore()
    mockReq = createMockRequest({ path: '/test' })
    mockRes = createMockResponse()

    nextFn = vi.fn()
  })

  it('should create new session if none exists', async () => {
    const middleware = createSessionMiddleware({
      secret: 'test-secret',
      name: 'sessionId',
      maxAge: 1000,
      secure: false,
      httpOnly: true,
      sameSite: 'strict',
      store,
    })

    await middleware(mockReq, mockRes, nextFn)

    expect(mockReq.session).toBeDefined()
    expect(mockReq.session?.id).toBeDefined()
    expect(mockReq.session?.data).toEqual({})
    expect(nextFn).toHaveBeenCalled()
  })

  it('should load existing session from cookie', async () => {
    // Create a session in the store
    const sessionId = 'existing-session-id'
    const existingSession = {
      id: sessionId,
      data: { userId: '123' },
      expires: Date.now() + 10000,
    }
    await store.set(sessionId, existingSession)

    // Mock cookie header with session ID
    mockReq.headers.set('cookie', `sessionId=${sessionId}.${signValue(sessionId, 'test-secret')}`)

    const middleware = createSessionMiddleware({
      secret: 'test-secret',
      name: 'sessionId',
      maxAge: 1000,
      secure: false,
      httpOnly: true,
      sameSite: 'strict',
      store,
    })

    await middleware(mockReq, mockRes, nextFn)

    expect(mockReq.session).toBeDefined()
    expect(mockReq.session?.id).toBe(sessionId)
    expect(mockReq.session?.data).toEqual({ userId: '123' })
    expect(nextFn).toHaveBeenCalled()
  })

  it('should set session cookie on response end', async () => {
    const middleware = createSessionMiddleware({
      secret: 'test-secret',
      name: 'sessionId',
      maxAge: 1000,
      secure: false,
      httpOnly: true,
      sameSite: 'strict',
      store,
    })

    await middleware(mockReq, mockRes, nextFn)

    // Call the wrapped end method
    mockRes.end()

    expect(mockRes.setHeader).toHaveBeenCalledWith(
      'Set-Cookie',
      expect.stringContaining('sessionId='),
    )
    expect(mockRes.setHeader).toHaveBeenCalledWith(
      'Set-Cookie',
      expect.stringContaining('HttpOnly'),
    )
    expect(mockRes.setHeader).toHaveBeenCalledWith(
      'Set-Cookie',
      expect.stringContaining('SameSite=Strict'),
    )
  })

  it('should set secure flag when secure option is true', async () => {
    const middleware = createSessionMiddleware({
      secret: 'test-secret',
      name: 'sessionId',
      maxAge: 1000,
      secure: true,
      httpOnly: true,
      sameSite: 'strict',
      store,
    })

    await middleware(mockReq, mockRes, nextFn)
    mockRes.end()

    expect(mockRes.setHeader).toHaveBeenCalledWith('Set-Cookie', expect.stringContaining('Secure'))
  })

  it('should set Max-Age attribute', async () => {
    const maxAge = 3600000 // 1 hour in milliseconds
    const middleware = createSessionMiddleware({
      secret: 'test-secret',
      name: 'sessionId',
      maxAge,
      secure: false,
      httpOnly: true,
      sameSite: 'strict',
      store,
    })

    await middleware(mockReq, mockRes, nextFn)
    mockRes.end()

    expect(mockRes.setHeader).toHaveBeenCalledWith(
      'Set-Cookie',
      expect.stringContaining(`Max-Age=${Math.floor(maxAge / 1000)}`),
    )
  })

  it('should set Path attribute', async () => {
    const middleware = createSessionMiddleware({
      secret: 'test-secret',
      name: 'sessionId',
      maxAge: 1000,
      secure: false,
      httpOnly: true,
      sameSite: 'strict',
      store,
    })

    await middleware(mockReq, mockRes, nextFn)
    mockRes.end()

    expect(mockRes.setHeader).toHaveBeenCalledWith('Set-Cookie', expect.stringContaining('Path=/'))
  })

  it('should save session to store on response end', async () => {
    const middleware = createSessionMiddleware({
      secret: 'test-secret',
      name: 'sessionId',
      maxAge: 1000,
      secure: false,
      httpOnly: true,
      sameSite: 'strict',
      store,
    })

    await middleware(mockReq, mockRes, nextFn)

    const sessionId = mockReq.session?.id
    expect(sessionId).toBeDefined()

    // Call the wrapped end method
    mockRes.end()

    // Wait for async save to complete
    await new Promise(resolve => setTimeout(resolve, 10))

    // Verify session was saved to store
    const savedSession = await store.get(sessionId!)
    expect(savedSession).toBeDefined()
    expect(savedSession?.id).toBe(sessionId)
  })

  it('should issue the session cookie before a native streaming response writes headers', async () => {
    const nativeResponse = {
      end: vi.fn(),
      write: vi.fn(),
      writeHead: vi.fn(),
    }
    ;(mockRes as unknown as { _nativeResponse?: unknown })._nativeResponse = nativeResponse

    const middleware = createSessionMiddleware({
      secret: 'test-secret',
      name: 'sessionId',
      maxAge: 1000,
      secure: false,
      httpOnly: true,
      sameSite: 'strict',
      store,
    })

    await middleware(mockReq, mockRes, nextFn)
    nativeResponse.writeHead(200)

    expect(mockRes.setHeader).toHaveBeenCalledWith(
      'Set-Cookie',
      expect.stringContaining('sessionId='),
    )
  })

  it('should not set a session cookie after headers are sent', async () => {
    const middleware = createSessionMiddleware({
      secret: 'test-secret',
      name: 'sessionId',
      maxAge: 1000,
      secure: false,
      httpOnly: true,
      sameSite: 'strict',
      store,
    })

    await middleware(mockReq, mockRes, nextFn)

    Object.defineProperty(mockRes, 'headersSent', {
      configurable: true,
      value: true,
    })
    mockRes.end()

    expect(mockRes.setHeader).not.toHaveBeenCalledWith(
      'Set-Cookie',
      expect.stringContaining('sessionId='),
    )
  })

  it('should handle errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Create a store that throws errors
    const errorStore: SessionStore = {
      get: vi.fn().mockRejectedValue(new Error('Store error')),
      set: vi.fn().mockRejectedValue(new Error('Store error')),
      destroy: vi.fn().mockRejectedValue(new Error('Store error')),
    }

    const middleware = createSessionMiddleware({
      secret: 'test-secret',
      name: 'sessionId',
      maxAge: 1000,
      secure: false,
      httpOnly: true,
      sameSite: 'strict',
      store: errorStore,
    })

    await middleware(mockReq, mockRes, nextFn)

    // Should still create a new session despite store error
    expect(mockReq.session).toBeDefined()
    expect(nextFn).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })

  it('should ignore tampered session cookies and create a new session', async () => {
    const originalSessionId = 'persisted-session-id'
    await store.set(originalSessionId, {
      id: originalSessionId,
      data: { userId: '123' },
      expires: Date.now() + 10000,
    })

    mockReq.headers.set('cookie', `sessionId=${originalSessionId}.tampered-signature`)

    const middleware = createSessionMiddleware({
      secret: 'test-secret',
      name: 'sessionId',
      maxAge: 1000,
      secure: false,
      httpOnly: true,
      sameSite: 'strict',
      store,
    })

    await middleware(mockReq, mockRes, nextFn)

    expect(mockReq.session?.id).not.toBe(originalSessionId)
    expect(nextFn).toHaveBeenCalled()
  })

  it('should skip cookie issuance when the backing store is unavailable', async () => {
    const unavailableStore: TestSessionStore = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      destroy: vi.fn().mockResolvedValue(undefined),
      isAvailable: vi.fn().mockResolvedValue(false),
    }

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const middleware = createSessionMiddleware({
      secret: 'test-secret',
      name: 'sessionId',
      maxAge: 1000,
      secure: false,
      httpOnly: true,
      sameSite: 'strict',
      store: unavailableStore,
    })

    await middleware(mockReq, mockRes, nextFn)
    mockRes.end()

    expect(unavailableStore.set).not.toHaveBeenCalled()
    expect(mockRes.setHeader).not.toHaveBeenCalledWith(
      'Set-Cookie',
      expect.stringContaining('sessionId='),
    )
    expect(warnSpy).toHaveBeenCalledWith(
      'Session store unavailable, skipping session cookie issuance',
    )

    warnSpy.mockRestore()
  })
})
