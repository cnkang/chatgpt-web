/**
 * Configuration parsing utilities
 * Provides reusable functions for parsing environment variables and configuration
 */

import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'

/**
 * TLS configuration interface
 */
export interface TLSConfig {
  key: Buffer
  cert: Buffer
}

/**
 * Parse integer environment variable with fallback
 *
 * @param name - Environment variable name
 * @param fallback - Default value if not set or invalid
 * @returns Parsed integer or fallback value
 */
export function parseIntegerEnv(name: string, fallback: number): number {
  const rawValue = process.env[name]
  if (!rawValue) {
    return fallback
  }

  const parsedValue = Number.parseInt(rawValue, 10)
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback
}

/**
 * Normalize a SameSite cookie attribute to one of 'strict', 'lax', or 'none'.
 *
 * @param value - Raw SameSite value to normalize (case-insensitive)
 * @returns `'lax'` if `value` equals `'lax'` (case-insensitive), `'none'` if `value` equals `'none'` (case-insensitive), `'strict'` otherwise
 */
export function parseSameSite(value: string | undefined): 'strict' | 'lax' | 'none' {
  switch (value?.toLowerCase()) {
    case 'lax':
      return 'lax'
    case 'none':
      return 'none'
    default:
      return 'strict'
  }
}

/**
 * Resolve TLS configuration from environment variables
 *
 * @returns TLS config or undefined if not configured
 * @throws Error if TLS is partially configured or files cannot be read
 */
export function resolveTlsConfig(): TLSConfig | undefined {
  const keyPath = process.env.TLS_KEY_PATH
  const certPath = process.env.TLS_CERT_PATH

  if (!keyPath && !certPath) {
    return undefined
  }

  if (!keyPath || !certPath) {
    throw new Error('TLS_KEY_PATH and TLS_CERT_PATH must both be configured to enable TLS')
  }

  try {
    return {
      key: readFileSync(keyPath),
      cert: readFileSync(certPath),
    }
  } catch (error) {
    throw new Error(
      `Failed to read TLS certificate files: ${
        error instanceof Error ? error.message : String(error)
      }. Ensure TLS_KEY_PATH="${keyPath}" and TLS_CERT_PATH="${certPath}" are valid readable files.`,
    )
  }
}

// Track development session secret and warning state
let developmentSessionSecret: string | undefined
let hasWarnedAboutDevelopmentSessionSecret = false

/**
 * Resolve the session secret used to sign and encrypt sessions.
 *
 * Selects the first of the environment variables SESSION_SECRET or AUTH_SECRET_KEY.
 * If neither is set and NODE_ENV is not 'production', lazily generates and returns a per-process ephemeral secret and emits a one-time warning. If neither is set in production, an error is thrown.
 *
 * @returns The session secret string
 * @throws Error if no session secret is configured and NODE_ENV is 'production'
 */
export function resolveSessionSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.AUTH_SECRET_KEY

  if (secret) {
    return secret
  }

  if (process.env.NODE_ENV !== 'production') {
    developmentSessionSecret ??= randomBytes(32).toString('hex')
    if (!hasWarnedAboutDevelopmentSessionSecret) {
      hasWarnedAboutDevelopmentSessionSecret = true
      console.warn(
        'Warning: SESSION_SECRET/AUTH_SECRET_KEY not configured. Using an ephemeral development session secret.',
      )
    }
    return developmentSessionSecret
  }

  throw new Error(
    'SESSION_SECRET or AUTH_SECRET_KEY must be configured for secure session management',
  )
}
