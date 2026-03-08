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

/**
 * In-memory session store
 *
 * Stores sessions in a Map. Suitable for development or single-instance deployments.
 * Sessions are lost on server restart.
 */
export class MemorySessionStore implements SessionStore {
  private sessions = new Map<string, SessionData>()

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
  private client: ReturnType<typeof createClient>

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
    this.client.connect().catch(error => {
      console.error('Redis connection error:', error)
    })

    // Handle Redis errors
    this.client.on('error', error => {
      console.error('Redis client error:', error)
    })
  }

  async get(id: string): Promise<SessionData | null> {
    try {
      const data = await this.client.get(`session:${id}`)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error('Redis get error:', error)
      return null
    }
  }

  async set(id: string, session: SessionData): Promise<void> {
    try {
      // Calculate TTL in seconds
      const ttl = Math.ceil((session.expires - Date.now()) / 1000)

      // Only set if TTL is positive
      if (ttl > 0) {
        await this.client.setEx(`session:${id}`, ttl, JSON.stringify(session))
      }
    } catch (error) {
      console.error('Redis set error:', error)
    }
  }

  async destroy(id: string): Promise<void> {
    try {
      await this.client.del(`session:${id}`)
    } catch (error) {
      console.error('Redis destroy error:', error)
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.client.quit()
  }
}

/**
 * Session middleware options
 */
export interface SessionOptions {
  /** Secret key for signing session cookies (not used in current implementation) */
  secret: string

  /** Session cookie name */
  name: string

  /** Session max age in milliseconds */
  maxAge: number

  /** Set secure flag on cookie (requires HTTPS) */
  secure: boolean

  /** Set httpOnly flag on cookie */
  httpOnly: boolean

  /** SameSite cookie attribute */
  sameSite: 'strict' | 'lax' | 'none'

  /** Session store backend (defaults to MemorySessionStore) */
  store?: SessionStore
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
      // Parse session cookie from Cookie header
      const cookies = parseCookies(req.getHeader('cookie') || '')
      const sessionId = cookies[options.name]

      // Try to load existing session
      if (sessionId) {
        const session = await store.get(sessionId)
        if (session) {
          req.session = session
        }
      }

      // Create new session if none exists
      if (!req.session) {
        req.session = {
          id: randomBytes(32).toString('hex'),
          data: {},
          expires: Date.now() + options.maxAge,
        }
      }

      // Wrap res.end() to save session and set cookie
      const originalEnd = res.end.bind(res)
      res.end = ((chunk?: string | Buffer) => {
        // Update session expiry
        if (req.session) {
          req.session.expires = Date.now() + options.maxAge

          // Save session to store
          store.set(req.session.id, req.session).catch(error => {
            console.error('Failed to save session:', error)
          })

          // Set session cookie
          const cookieValue = serializeCookie(options.name, req.session.id, {
            maxAge: options.maxAge,
            secure: options.secure,
            httpOnly: options.httpOnly,
            sameSite: options.sameSite,
            path: '/',
          })
          res.setHeader('Set-Cookie', cookieValue)
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
    maxAge: number
    secure: boolean
    httpOnly: boolean
    sameSite: 'strict' | 'lax' | 'none'
    path: string
  },
): string {
  const parts = [`${name}=${value}`]

  // Max-Age in seconds
  parts.push(`Max-Age=${Math.floor(options.maxAge / 1000)}`)

  // Path
  parts.push(`Path=${options.path}`)

  // Secure flag (requires HTTPS)
  if (options.secure) {
    parts.push('Secure')
  }

  // HttpOnly flag (prevents JavaScript access)
  if (options.httpOnly) {
    parts.push('HttpOnly')
  }

  // SameSite attribute (CSRF protection)
  parts.push(`SameSite=${options.sameSite.charAt(0).toUpperCase() + options.sameSite.slice(1)}`)

  return parts.join('; ')
}
