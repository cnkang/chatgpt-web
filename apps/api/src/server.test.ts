import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createConfiguredServer } from './server.js'

const originalEnv = process.env

describe('createConfiguredServer', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    process.env = { ...originalEnv }
    process.env.HTTP2_ENABLED = 'false'
    delete process.env.SESSION_SECRET
    delete process.env.AUTH_SECRET_KEY
    delete process.env.REDIS_URL
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('allows startup without explicit session secret outside production', () => {
    process.env.NODE_ENV = 'development'
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(() => createConfiguredServer()).not.toThrow()
    expect(warnSpy).toHaveBeenCalledWith(
      'Warning: SESSION_SECRET/AUTH_SECRET_KEY not configured. Using an ephemeral development session secret.',
    )
  })

  it('requires a session secret in production', () => {
    process.env.NODE_ENV = 'production'

    expect(() => createConfiguredServer()).toThrow(
      'SESSION_SECRET or AUTH_SECRET_KEY must be configured for secure session management',
    )
  })
})
