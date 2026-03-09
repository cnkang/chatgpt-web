import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { z } from 'zod'
import { HTTP2Adapter, type TLSConfig } from './adapters/http2-adapter.js'
import {
  createAuthMiddleware,
  createAuthRateLimiter,
  createBodyParserMiddleware,
  createBodyParserWithLimit,
  createCorsMiddleware,
  createGeneralRateLimiter,
  createRequestLoggerMiddleware,
  createSessionMiddleware,
  createValidationMiddleware,
  MemorySessionStore,
  RedisSessionStore,
  type SessionStore,
} from './middleware-native/index.js'
import { createSecurityHeadersMiddleware } from './middleware-native/security-headers.js'
import { createStaticFileMiddleware } from './middleware-native/static.js'
import {
  chatProcessHandler,
  configHandler,
  healthHandler,
  sessionHandler,
  verifyHandler,
} from './routes/index.js'
import { MiddlewareChainImpl } from './transport/middleware-chain.js'
import { RouterImpl } from './transport/router.js'
import { asyncHandler } from './utils/async-handler.js'
import { parseTrustedProxyConfig } from './utils/proxy-trust.js'

const DEFAULT_JSON_BODY_LIMIT = 1_048_576
const DEFAULT_FORM_BODY_LIMIT = 32_768
const DEFAULT_CHAT_BODY_LIMIT = 1_048_576
const DEFAULT_VERIFY_BODY_LIMIT = 1_024
const DEFAULT_SESSION_MAX_AGE = 24 * 60 * 60 * 1000
let developmentSessionSecret: string | undefined
let hasWarnedAboutDevelopmentSessionSecret = false

const chatRequestSchema = z.object({
  prompt: z.string().trim().min(1),
  options: z.unknown().optional(),
  systemMessage: z.string().optional(),
  temperature: z.number().optional(),
  top_p: z.number().optional(),
})

const verifyRequestSchema = z.object({
  token: z.string().min(1),
})

export interface NativeServerRuntimeConfig {
  host: string
  port: number
  http2Enabled: boolean
  tlsConfigured: boolean
  bodyLimit: {
    json: number
    urlencoded: number
    chat: number
    verify: number
  }
}

export interface ConfiguredServer {
  adapter: HTTP2Adapter
  runtime: NativeServerRuntimeConfig
}

function parseIntegerEnv(name: string, fallback: number): number {
  const rawValue = process.env[name]
  if (!rawValue) {
    return fallback
  }

  const parsedValue = Number.parseInt(rawValue, 10)
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback
}

function parseSameSite(value: string | undefined): 'strict' | 'lax' | 'none' {
  switch (value?.toLowerCase()) {
    case 'lax':
      return 'lax'
    case 'none':
      return 'none'
    default:
      return 'strict'
  }
}

function resolveTlsConfig(): TLSConfig | undefined {
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

function resolveSessionSecret(): string {
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

function createSessionStore(): SessionStore {
  if (!process.env.REDIS_URL) {
    return new MemorySessionStore()
  }

  return new RedisSessionStore(process.env.REDIS_URL, process.env.REDIS_PASSWORD)
}

export function createConfiguredServer(): ConfiguredServer {
  const host = process.env.HOST || '0.0.0.0'
  const port = parseIntegerEnv('PORT', 3002)
  const tls = resolveTlsConfig()
  const http2Enabled = process.env.HTTP2_ENABLED === 'true' || Boolean(tls)
  const jsonBodyLimit = parseIntegerEnv('JSON_BODY_LIMIT', DEFAULT_JSON_BODY_LIMIT)
  const urlencodedBodyLimit = parseIntegerEnv('FORM_BODY_LIMIT', DEFAULT_FORM_BODY_LIMIT)
  const chatBodyLimit = parseIntegerEnv('CHAT_BODY_LIMIT', DEFAULT_CHAT_BODY_LIMIT)
  const verifyBodyLimit = parseIntegerEnv('VERIFY_BODY_LIMIT', DEFAULT_VERIFY_BODY_LIMIT)
  const generalRateLimit = parseIntegerEnv('MAX_REQUEST_PER_HOUR', 100)
  const sessionMaxAge = parseIntegerEnv('SESSION_MAX_AGE_MS', DEFAULT_SESSION_MAX_AGE)
  const trustedProxy = parseTrustedProxyConfig(process.env.TRUST_PROXY)
  const sessionStore = createSessionStore()

  const router = new RouterImpl()
  const middleware = new MiddlewareChainImpl()

  const authMiddleware = createAuthMiddleware(process.env.AUTH_SECRET_KEY || '')
  const generalRateLimiter = createGeneralRateLimiter(generalRateLimit)
  const authRateLimiter = createAuthRateLimiter()
  const corsMiddleware = createCorsMiddleware()
  const securityHeadersMiddleware = createSecurityHeadersMiddleware(trustedProxy)
  const requestLoggerMiddleware = createRequestLoggerMiddleware()
  const defaultBodyParser = createBodyParserMiddleware({
    jsonLimit: jsonBodyLimit,
    urlencodedLimit: urlencodedBodyLimit,
  })
  const chatBodyParser = createBodyParserWithLimit(chatBodyLimit)
  const verifyBodyParser = createBodyParserWithLimit(verifyBodyLimit)
  const sessionMiddleware = createSessionMiddleware({
    secret: resolveSessionSecret(),
    name: process.env.SESSION_COOKIE_NAME || 'sessionId',
    maxAge: sessionMaxAge,
    secure: tls ? true : 'auto',
    httpOnly: true,
    sameSite: parseSameSite(process.env.SESSION_SAME_SITE),
    store: sessionStore,
    trustProxy: trustedProxy,
  })
  const staticMiddleware = createStaticFileMiddleware('public')

  middleware.use(requestLoggerMiddleware)
  middleware.use(corsMiddleware)
  middleware.use(securityHeadersMiddleware)
  middleware.use(staticMiddleware)

  router.get('/health', asyncHandler(healthHandler))
  router.post(
    '/chat-process',
    sessionMiddleware,
    authMiddleware,
    generalRateLimiter.middleware(),
    chatBodyParser,
    createValidationMiddleware(chatRequestSchema),
    asyncHandler(chatProcessHandler),
  )
  router.post(
    '/config',
    sessionMiddleware,
    authMiddleware,
    generalRateLimiter.middleware(),
    defaultBodyParser,
    asyncHandler(configHandler),
  )
  router.post(
    '/session',
    sessionMiddleware,
    generalRateLimiter.middleware(),
    defaultBodyParser,
    asyncHandler(sessionHandler),
  )
  router.post(
    '/verify',
    sessionMiddleware,
    authRateLimiter.middleware(),
    verifyBodyParser,
    createValidationMiddleware(verifyRequestSchema),
    asyncHandler(verifyHandler),
  )

  const adapter = new HTTP2Adapter(router, middleware, {
    http2: http2Enabled,
    tls,
    bodyLimit: {
      json: jsonBodyLimit,
      urlencoded: urlencodedBodyLimit,
    },
    staticDir: 'public',
    trustProxy: trustedProxy,
  })

  return {
    adapter,
    runtime: {
      host,
      port,
      http2Enabled,
      tlsConfigured: Boolean(tls),
      bodyLimit: {
        json: jsonBodyLimit,
        urlencoded: urlencodedBodyLimit,
        chat: chatBodyLimit,
        verify: verifyBodyLimit,
      },
    },
  }
}
