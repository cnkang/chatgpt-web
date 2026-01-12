/**
 * Security middleware for Express application
 * Implements comprehensive security headers, session management, and API key protection
 */

import type { NextFunction, Request, Response } from 'express'
import { rateLimit } from 'express-rate-limit'
import type { SessionOptions } from 'express-session'
import session from 'express-session'
import helmet from 'helmet'
import { createClient } from 'redis'

/**
 * Security configuration interface
 */
interface SecurityConfig {
  session: {
    secret: string
    name: string
    maxAge: number
    secure: boolean
    httpOnly: boolean
    sameSite: 'strict' | 'lax' | 'none'
  }
  redis?: {
    url: string
    password?: string
  }
  rateLimit: {
    windowMs: number
    max: number
    skipSuccessfulRequests: boolean
  }
  helmet: {
    contentSecurityPolicy: boolean
    crossOriginEmbedderPolicy: boolean
    hsts: boolean
  }
}

/**
 * Default security configuration
 */
const defaultSecurityConfig: SecurityConfig = {
  session: {
    secret: process.env.SESSION_SECRET || 'default-session-secret-change-in-production',
    name: 'chatgpt-web-session',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
  },
  redis: process.env.REDIS_URL
    ? {
        url: process.env.REDIS_URL,
        password: process.env.REDIS_PASSWORD,
      }
    : undefined,
  rateLimit: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: Number.parseInt(process.env.MAX_REQUEST_PER_HOUR || '100', 10),
    skipSuccessfulRequests: false,
  },
  helmet: {
    contentSecurityPolicy: true,
    crossOriginEmbedderPolicy: false, // Disable for API compatibility
    hsts: process.env.NODE_ENV === 'production',
  },
}

/**
 * Creates Helmet security middleware with custom configuration
 */
export function createSecurityHeaders(config: SecurityConfig = defaultSecurityConfig) {
  return helmet({
    contentSecurityPolicy: config.helmet.contentSecurityPolicy
      ? {
          directives: {
            defaultSrc: ['\'self\''],
            scriptSrc: ['\'self\'', '\'unsafe-eval\'', '\'unsafe-inline\''],
            styleSrc: ['\'self\'', '\'unsafe-inline\''],
            imgSrc: ['\'self\'', 'data:', 'blob:'],
            fontSrc: ['\'self\'', 'data:'],
            connectSrc: ['\'self\'', 'https:', 'wss:'],
            workerSrc: ['\'self\'', 'blob:'],
            childSrc: ['\'self\'', 'blob:'],
            objectSrc: ['\'none\''],
            baseUri: ['\'self\''],
            formAction: ['\'self\''],
            frameAncestors: ['\'none\''],
            upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
          },
        }
      : false,
    crossOriginEmbedderPolicy: config.helmet.crossOriginEmbedderPolicy,
    hsts: config.helmet.hsts
      ? {
          maxAge: 31536000, // 1 year
          includeSubDomains: true,
          preload: true,
        }
      : false,
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    permittedCrossDomainPolicies: false,
  })
}

/**
 * Creates session middleware with Redis store if available
 */
export async function createSessionMiddleware(
  config: SecurityConfig = defaultSecurityConfig,
): Promise<ReturnType<typeof session>> {
  let store: SessionOptions['store'] | undefined

  // Set up Redis store if Redis URL is provided
  if (config.redis) {
    try {
      const redisClient = createClient({
        url: config.redis.url,
        password: config.redis.password,
      })

      await redisClient.connect()
      store = new RedisStore({ client: redisClient })

      console.warn('✓ Redis session store connected')
    } catch (error) {
      console.warn(
        '⚠ Redis connection failed, using memory store:',
        error instanceof Error ? error.message : String(error),
      )
    }
  }

  const sessionOptions: SessionOptions = {
    store,
    secret: config.session.secret,
    name: config.session.name,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: config.session.maxAge,
      secure: config.session.secure,
      httpOnly: config.session.httpOnly,
      sameSite: config.session.sameSite,
    },
  }

  return session(sessionOptions)
}

/**
 * Creates enhanced rate limiting middleware
 */
export function createRateLimiter(config: SecurityConfig = defaultSecurityConfig) {
  return rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    skipSuccessfulRequests: config.rateLimit.skipSuccessfulRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: 'Fail',
      message: `Too many requests from this IP, please try again after ${Math.ceil(config.rateLimit.windowMs / (60 * 1000))} minutes`,
      data: null,
    },
    handler: (_req: Request, res: Response) => {
      res.status(429).json({
        status: 'Fail',
        message: `Rate limit exceeded. Try again in ${Math.ceil(config.rateLimit.windowMs / (60 * 1000))} minutes`,
        data: null,
      })
    },
  })
}

/**
 * API key security middleware
 * Ensures API keys are never exposed in logs or responses
 */
export function secureApiKeys(req: Request, res: Response, next: NextFunction) {
  // Remove sensitive headers from logs
  const originalJson = res.json
  res.json = function (this: Response, body: unknown) {
    // Ensure no API keys are accidentally included in responses
    if (body && typeof body === 'object') {
      const sanitizedBody = sanitizeApiKeys(body)
      return originalJson.call(this, sanitizedBody)
    }
    return originalJson.call(this, body)
  } as Response['json']

  // Sanitize request headers for logging
  if (req.headers.authorization) {
    // Replace authorization header with masked version for logging
    const maskedAuth = req.headers.authorization.replace(/Bearer\s+(.{4}).*/, 'Bearer $1****')
    req.headers['x-masked-auth'] = maskedAuth
  }

  next()
}

/**
 * Recursively removes API keys from objects
 */
function sanitizeApiKeys(obj: unknown): unknown {
  if (typeof obj !== 'object' || obj === null) {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeApiKeys)
  }

  const sanitized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase()

    // List of sensitive key patterns
    const sensitivePatterns = [
      'apikey',
      'api_key',
      'api-key',
      'secret',
      'password',
      'token',
      'authorization',
      'auth',
      'openai_api_key',
      'openai-api-key',
    ]

    const fullMaskPatterns = ['secret', 'password', 'token', 'authorization', 'auth']

    const isSensitive = sensitivePatterns.some(pattern => lowerKey.includes(pattern))
    const shouldFullyMask = fullMaskPatterns.some(pattern => lowerKey.includes(pattern))

    if (isSensitive && typeof value === 'string') {
      // Mask sensitive values
      if (shouldFullyMask) {
        sanitized[key] = '****'
      } else {
        sanitized[key] =
          value.length > 8
            ? `${value.substring(0, 4)}****${value.substring(value.length - 4)}`
            : '****'
      }
    } else {
      sanitized[key] = sanitizeApiKeys(value)
    }
  }

  return sanitized
}

/**
 * CORS middleware with security considerations
 */
export function createCorsMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.get('Origin')
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*']

    // Set CORS headers
    if (allowedOrigins.includes('*') || (origin && allowedOrigins.includes(origin))) {
      res.header('Access-Control-Allow-Origin', origin || '*')
    }

    res.header('Access-Control-Allow-Headers', 'authorization, Content-Type, X-Requested-With')
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.header('Access-Control-Allow-Credentials', 'true')
    res.header('Access-Control-Max-Age', '86400') // 24 hours

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end()
    }

    next()
  }
}

/**
 * Request logging middleware that excludes sensitive information
 */
export function createSecureLogger() {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now()

    // Log request (excluding sensitive data)
    const logData = {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
    }

    console.warn('Request:', JSON.stringify(logData))

    // Log response on finish
    res.on('finish', () => {
      const duration = Date.now() - start
      const responseLog = {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      }

      console.warn('Response:', JSON.stringify(responseLog))
    })

    next()
  }
}

/**
 * Environment validation for security settings
 */
export function validateSecurityEnvironment(): { isValid: boolean; warnings: string[] } {
  const warnings: string[] = []
  let isValid = true

  // Check session secret
  if (
    !process.env.SESSION_SECRET ||
    process.env.SESSION_SECRET === 'default-session-secret-change-in-production'
  ) {
    warnings.push('SESSION_SECRET should be set to a secure random value in production')
    if (process.env.NODE_ENV === 'production') {
      isValid = false
    }
  }

  // Check HTTPS in production
  if (process.env.NODE_ENV === 'production' && !process.env.HTTPS) {
    warnings.push('HTTPS should be enabled in production')
  }

  // Check rate limiting configuration
  const maxRequests = Number.parseInt(process.env.MAX_REQUEST_PER_HOUR || '100', 10)
  if (maxRequests > 1000) {
    warnings.push('MAX_REQUEST_PER_HOUR is set very high, consider lowering for better security')
  }

  // Check allowed origins
  if (!process.env.ALLOWED_ORIGINS) {
    warnings.push('ALLOWED_ORIGINS should be set to restrict CORS access')
  }

  return { isValid, warnings }
}
