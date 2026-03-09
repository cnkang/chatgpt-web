/**
 * Session Middleware for Native Routing
 *
 * Manages user sessions with support for both in-memory and Redis storage.
 * Uses native redis package (not connect-redis) for Redis integration.
 */

import { randomBytes } from 'node:crypto'
import { createClient } from 'redis'
import type {
  MiddlewareHandler,
  SessionData,
  TransportRequest,
  TransportResponse,
} from '../transport/types.js'
import { constantTimeEqual, signValue } from '../utils/constant-time.js'
import { isTrustedForwardedHttps, type TrustedProxyConfig } from '../utils/proxy-trust.js'

/**
 * Session store interface
 *
 * Abstracts session storage backend (memory or Redis).
 */
export interface SessionStore {
  /**
   * Get session by ID
   * @param id - Session ID
   * @returns Session data or null if not found/expired
   */
  get(id: string): Promise<SessionData | null>

  /**
   * Save session
   * @param id - Session ID
   * @param session - Session data to save
   */
  set(id: string, session: SessionData): Promise<void>

  /**
   * Destroy session
   * @param id - Session ID
   */
  destroy(id: string): Promise<void>
}

interface AvailabilityAwareSessionStore extends SessionStore {
  isAvailable?(): Promise<boolean>
}

/**
 * In-memory session store
 *
 * Stores sessions in a Map. Suitable for development or single-instance deployments.
 * Sessions are lost on server restart.
 */
export class MemorySessionStore implements SessionStore {
  private readonly sessions = new Map<string, SessionData>()

  async isAvailable(): Promise<boolean> {
    return true
  }

  async get(id: string): Promise<SessionData | null> {
    const session = this.sessions.get(id)
    if (!session) return null

    // Check if session has expired
    if (Date.now() > session.expires) {
      this.sessions.delete(id)
      return null
    }

    return session
  }

  async set(id: string, session: SessionData): Promise<void> {
    this.sessions.set(id, session)
  }

  async destroy(id: string): Promise<void> {
    this.sessions.delete(id)
  }
}

/**
 * Redis session store using native redis client
 *
 * Stores sessions in Redis with automatic expiration (TTL).
 * Suitable for production and multi-instance deployments.
 */
export class RedisSessionStore implements SessionStore {
  private readonly client: ReturnType<typeof createClient>
  private readonly connectPromise: Promise<void>
  private connectionFailed = false

  /**
   * Create Redis session store
   * @param redisUrl - Redis connection URL (e.g., redis://localhost:6379)
   * @param password - Optional Redis password
   */
  constructor(redisUrl: string, password?: string) {
    // Use native redis package, not connect-redis
    this.client = createClient({
      url: redisUrl,
      password,
    })

    // Connect to Redis
    this.connectPromise = this.client
      .connect()
      .then(() => undefined)
      .catch(error => {
        this.connectionFailed = true
        console.error('Redis connection error, falling back to in-memory sessions:', error)
      })

    // Handle Redis errors
    this.client.on('error', error => {
      this.connectionFailed = true
      console.error('Redis client error, falling back to in-memory sessions:', error)
    })
  }

  async get(id: string): Promise<SessionData | null> {
    if (!(await this.isAvailable())) {
      return null
    }

    try {
      const data = await this.client.get(`session:${id}`)
      return data ? JSON.parse(data) : null
    } catch (error) {
      this.connectionFailed = true
      console.error('Redis get error:', error)
      return null
    }
  }

  async set(id: string, session: SessionData): Promise<void> {
    if (!(await this.isAvailable())) {
      return
    }

    try {
      // Calculate TTL in seconds
      const ttl = Math.ceil((session.expires - Date.now()) / 1000)

      // Only set if TTL is positive
      if (ttl > 0) {
        await this.client.setEx(`session:${id}`, ttl, JSON.stringify(session))
      }
    } catch (error) {
      this.connectionFailed = true
      console.error('Redis set error:', error)
    }
  }

  async destroy(id: string): Promise<void> {
    if (!(await this.isAvailable())) {
      return
    }

    try {
      await this.client.del(`session:${id}`)
    } catch (error) {
      this.connectionFailed = true
      console.error('Redis destroy error:', error)
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.connectPromise
    if (this.client.isOpen) {
      await this.client.quit()
    }
  }

  async isAvailable(): Promise<boolean> {
    await this.connectPromise
    return this.client.isReady && !this.connectionFailed
  }
}

/**
 * Session middleware options
 */
export interface SessionOptions {
  /** Secret key for signing session cookies */
  secret: string

  /** Session cookie name */
  name: string

  /** Session max age in milliseconds */
  maxAge: number

  /** Set secure flag on cookie (requires HTTPS) */
  secure: boolean | 'auto'

  /** Set httpOnly flag on cookie */
  httpOnly: boolean

  /** SameSite cookie attribute */
  sameSite: 'strict' | 'lax' | 'none'

  /** Session store backend (defaults to MemorySessionStore) */
  store?: SessionStore

  /** Trusted proxy configuration for forwarded HTTPS detection */
  trustProxy?: TrustedProxyConfig
}

/**
 * Creates session middleware
 *
 * Manages user sessions with cookie-based session IDs and configurable storage backend.
 *
 * @param options - Session configuration options
 * @returns Middleware handler that manages sessions
 *
 * @example
 * ```typescript
 * // In-memory sessions (development)
 * const sessionMiddleware = createSessionMiddleware({
 *   secret: 'my-secret',
 *   name: 'sessionId',
 *   maxAge: 24 * 60 * 60 * 1000, // 24 hours
 *   secure: false,
 *   httpOnly: true,
 *   sameSite: 'strict'
 * })
 *
 * // Redis sessions (production)
 * const redisStore = new RedisSessionStore('redis://localhost:6379', 'password')
 * const sessionMiddleware = createSessionMiddleware({
 *   secret: 'my-secret',
 *   name: 'sessionId',
 *   maxAge: 24 * 60 * 60 * 1000,
 *   secure: true,
 *   httpOnly: true,
 *   sameSite: 'strict',
 *   store: redisStore
 * })
 * ```
 */
export function createSessionMiddleware(options: SessionOptions): MiddlewareHandler {
  const store = options.store || new MemorySessionStore()

  return async (req: TransportRequest, res: TransportResponse, next) => {
    try {
      const canPersistSession = await isSessionStoreAvailable(store)

      // Parse session cookie from Cookie header
      const cookies = parseCookies(req.getHeader('cookie') || '')
      const sessionId = verifySignedSessionId(cookies[options.name], options.secret)

      // Try to load existing session
      if (sessionId) {
        const session = await store.get(sessionId)
        if (session) {
          req.session = session
        }
      }

      // Create new session if none exists
      req.session ??= {
        id: randomBytes(32).toString('hex'),
        data: {},
        expires: Date.now() + options.maxAge,
      }

      // Wrap res.end() to save session and set cookie
      const originalEnd = res.end.bind(res)
      res.end = ((chunk?: string | Buffer) => {
        // Update session expiry
        if (req.session) {
          req.session.expires = Date.now() + options.maxAge

          if (canPersistSession) {
            store.set(req.session.id, req.session).catch(error => {
              console.error('Failed to save session:', error)
            })
          }

          // Avoid issuing a durable cookie when the backing store is unavailable.
          if (canPersistSession && !res.headersSent && !res.finished) {
            const cookieValue = serializeCookie(options.name, req.session.id, {
              secret: options.secret,
              maxAge: options.maxAge,
              secure: shouldSetSecureCookie(req, options.secure, options.trustProxy ?? false),
              httpOnly: options.httpOnly,
              sameSite: options.sameSite,
              path: '/',
            })
            res.setHeader('Set-Cookie', cookieValue)
          } else if (!canPersistSession) {
            console.warn('Session store unavailable, skipping session cookie issuance')
          }
        }

        // Call original end method
        return originalEnd(chunk)
      }) as typeof res.end

      next()
    } catch (error) {
      console.error('Session middleware error:', error)
      next(error instanceof Error ? error : new Error('Session middleware error'))
    }
  }
}

async function isSessionStoreAvailable(store: SessionStore): Promise<boolean> {
  const availabilityChecker = (store as AvailabilityAwareSessionStore).isAvailable
  if (!availabilityChecker) {
    return true
  }

  try {
    return Boolean(await availabilityChecker.call(store))
  } catch {
    return false
  }
}

/**
 * Parse cookies from Cookie header
 *
 * @param cookieHeader - Cookie header value
 * @returns Object mapping cookie names to values
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  return Object.fromEntries(
    cookieHeader
      .split(';')
      .map(c => {
        const [key, ...values] = c.trim().split('=')
        return [key, values.join('=')]
      })
      .filter(([key]) => key),
  )
}

/**
 * Serialize cookie with attributes
 *
 * @param name - Cookie name
 * @param value - Cookie value
 * @param options - Cookie attributes
 * @returns Serialized Set-Cookie header value
 */
function serializeCookie(
  name: string,
  value: string,
  options: {
    secret: string
    maxAge: number
    secure: boolean
    httpOnly: boolean
    sameSite: 'strict' | 'lax' | 'none'
    path: string
  },
): string {
  const signedValue = `${value}.${signValue(value, options.secret)}`
  const optionalAttributes = [
    options.secure ? 'Secure' : null,
    options.httpOnly ? 'HttpOnly' : null,
  ].filter((part): part is string => part !== null)

  return [
    `${name}=${signedValue}`,
    `Max-Age=${Math.floor(options.maxAge / 1000)}`,
    `Path=${options.path}`,
    ...optionalAttributes,
    `SameSite=${options.sameSite.charAt(0).toUpperCase() + options.sameSite.slice(1)}`,
  ].join('; ')
}

function shouldSetSecureCookie(
  req: TransportRequest,
  secureOption: boolean | 'auto',
  trustProxy: TrustedProxyConfig,
): boolean {
  if (secureOption === true || secureOption === false) {
    return secureOption
  }

  return isTrustedForwardedHttps(req, trustProxy)
}

function verifySignedSessionId(
  cookieValue: string | undefined,
  secret: string,
): string | undefined {
  if (!cookieValue) {
    return undefined
  }

  const separatorIndex = cookieValue.lastIndexOf('.')
  if (separatorIndex <= 0) {
    return undefined
  }

  const sessionId = cookieValue.slice(0, separatorIndex)
  const signature = cookieValue.slice(separatorIndex + 1)
  const expectedSignature = signValue(sessionId, secret)

  return constantTimeEqual(signature, expectedSignature) ? sessionId : undefined
}
