/**
 * Rate Limiting Middleware for Native Routing
 *
 * Enforces request rate limits per client IP address to prevent abuse.
 * Supports both general rate limiting (100 req/hour) and strict rate limiting
 * (10 req/15min for /verify endpoint).
 */

import type { MiddlewareHandler, TransportRequest, TransportResponse } from '../transport/types.js'

/**
 * Rate limit record for tracking requests per IP
 */
interface RateLimitRecord {
  /** Number of requests in current window */
  count: number
  /** Timestamp when counter resets (milliseconds) */
  resetTime: number
}

/**
 * Rate limiter configuration
 */
interface RateLimitConfig {
  /** Time window in milliseconds */
  windowMs: number
  /** Maximum requests allowed in window */
  max: number
  /** Error message to return when limit exceeded */
  message: string
}

/**
 * Rate limiter class that tracks requests per IP address
 *
 * Uses in-memory Map storage to track request counts and reset times.
 * Automatically cleans up expired entries every minute.
 */
export class RateLimiter {
  private readonly requests = new Map<string, RateLimitRecord>()
  private readonly cleanupInterval: NodeJS.Timeout

  /**
   * Creates a new rate limiter
   *
   * @param config - Rate limit configuration
   *
   * @example
   * ```typescript
   * const limiter = new RateLimiter({
   *   windowMs: 60 * 60 * 1000, // 1 hour
   *   max: 100,
   *   message: 'Too many requests, please try again later'
   * })
   * ```
   */
  constructor(private readonly config: RateLimitConfig) {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000)
  }

  /**
   * Creates middleware handler for rate limiting
   *
   * @returns Middleware handler that enforces rate limits
   */
  middleware(): MiddlewareHandler {
    return async (req: TransportRequest, res: TransportResponse, next) => {
      const key = req.ip
      const now = Date.now()

      // Get or create rate limit record for this IP
      let record = this.requests.get(key)

      if (!record || now > record.resetTime) {
        // Create new record or reset expired record
        record = {
          count: 0,
          resetTime: now + this.config.windowMs,
        }
        this.requests.set(key, record)
      }

      // Increment request count
      record.count++

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', String(this.config.max))
      res.setHeader('X-RateLimit-Remaining', String(Math.max(0, this.config.max - record.count)))
      res.setHeader('X-RateLimit-Reset', String(Math.ceil(record.resetTime / 1000)))

      // Check if limit exceeded
      if (record.count > this.config.max) {
        res.status(429).json({
          status: 'Fail',
          message: this.config.message,
          data: null,
          error: {
            code: 'RATE_LIMIT_ERROR',
            type: 'RateLimitError',
            timestamp: new Date().toISOString(),
          },
        })
        return
      }

      // Limit not exceeded, proceed to next middleware
      next()
    }
  }

  /**
   * Removes expired rate limit records from memory
   *
   * Called automatically every minute by the cleanup interval.
   * Can also be called manually for testing or immediate cleanup.
   */
  cleanup(): void {
    const now = Date.now()
    for (const [key, record] of this.requests) {
      if (now > record.resetTime) {
        this.requests.delete(key)
      }
    }
  }

  /**
   * Stops the cleanup interval
   *
   * Should be called when shutting down the server to prevent memory leaks.
   */
  destroy(): void {
    clearInterval(this.cleanupInterval)
  }
}

/**
 * Creates a general rate limiter (100 requests per hour by default)
 *
 * @param maxRequestsPerHour - Maximum requests per hour (from MAX_REQUEST_PER_HOUR env var)
 * @returns RateLimiter instance configured for general rate limiting
 *
 * @example
 * ```typescript
 * const generalLimiter = createGeneralRateLimiter(100)
 * router.post('/api/chat-process', generalLimiter.middleware(), chatHandler)
 * ```
 */
export function createGeneralRateLimiter(maxRequestsPerHour: number = 100): RateLimiter {
  const configuredLimit =
    maxRequestsPerHour === 100
      ? Number.parseInt(process.env.MAX_REQUEST_PER_HOUR || String(maxRequestsPerHour), 10)
      : maxRequestsPerHour

  return new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: Number.isFinite(configuredLimit) && configuredLimit > 0 ? configuredLimit : 100,
    message: 'Too many requests from this IP, please try again after 60 minutes',
  })
}

/**
 * Creates a strict rate limiter for /verify endpoint (10 requests per 15 minutes)
 *
 * @returns RateLimiter instance configured for strict rate limiting
 *
 * @example
 * ```typescript
 * const authLimiter = createAuthRateLimiter()
 * router.post('/api/verify', authLimiter.middleware(), verifyHandler)
 * ```
 */
export function createAuthRateLimiter(): RateLimiter {
  return new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: 'Too many authentication attempts, please try again after 15 minutes',
  })
}
