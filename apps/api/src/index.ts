/**
 * Native Node.js HTTP/2 Server Entry Point
 *
 * This is the main entry point for the native routing implementation using Node.js 24+
 * HTTP/2 module without Express dependencies. It wires up all middleware, routes,
 * validates configuration, and starts the server.
 *
 * @module index-native
 */

import { HTTP2Adapter } from './adapters/http2-adapter.js'
import { ConfigurationValidator } from './config/validator.js'
import {
  createAuthMiddleware,
  createAuthRateLimiter,
  createBodyParserMiddleware,
  createBodyParserWithLimit,
  createCorsMiddleware,
  createGeneralRateLimiter,
  createRequestLoggerMiddleware,
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
import { performSecurityValidation } from './security/index.js'
import { MiddlewareChainImpl } from './transport/middleware-chain.js'
import { RouterImpl } from './transport/router.js'
import { asyncHandler } from './utils/async-handler.js'
import { setupGracefulShutdown } from './utils/graceful-shutdown.js'
import { logger } from './utils/logger.js'

// Load .env in Node.js 24+ without external dependencies
try {
  process.loadEnvFile()
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
    throw error
  }
}

// Parse port from environment
const parsedPort = Number.parseInt(process.env.PORT || '3002', 10)
const PORT = Number.isNaN(parsedPort) ? 3002 : parsedPort

/**
 * Validate Node.js version requirement
 * Requires Node.js 24.0.0 or higher for native HTTP/2 and modern features
 */
function validateNodeVersion(): void {
  const nodeVersion = process.version
  const majorVersion = Number.parseInt(nodeVersion.slice(1).split('.')[0], 10)

  if (majorVersion < 24) {
    throw new Error(
      `Node.js 24.0.0 or higher is required. Current version: ${nodeVersion}\n` +
        'Please upgrade Node.js to continue.',
    )
  }

  logger.info('Node.js version check passed', { version: nodeVersion })
}

/**
 * Validate environment configuration and security settings
 * Exits process if validation fails
 */
function validateConfigOrExit(): void {
  try {
    // Validate Node.js version
    validateNodeVersion()

    // Validate configuration (API keys, provider settings)
    ConfigurationValidator.validateEnvironment()
    logger.info('Configuration validation passed')

    // Perform comprehensive security validation
    const securityResult = performSecurityValidation()
    if (!securityResult.isSecure) {
      logger.error('Security validation failed')
      securityResult.risks.forEach(risk => {
        logger.error(`[${risk.severity}] ${risk.description}`, {
          mitigation: risk.mitigation,
        })
      })
      process.exit(1)
    }
    logger.info('Security validation passed')
  } catch (error) {
    logger.error('Configuration validation failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    process.exit(1)
  }
}

/**
 * Create and configure the HTTP/2 adapter with all middleware and routes
 */
async function createServer(): Promise<HTTP2Adapter> {
  // Create router and middleware chain
  const router = new RouterImpl()
  const middleware = new MiddlewareChainImpl()

  // Create middleware instances
  const authMiddleware = createAuthMiddleware(process.env.AUTH_SECRET_KEY || '')
  const generalRateLimiter = createGeneralRateLimiter()
  const authRateLimiter = createAuthRateLimiter()
  const corsMiddleware = createCorsMiddleware()
  const securityHeadersMiddleware = createSecurityHeadersMiddleware()
  const bodyParserMiddleware = createBodyParserMiddleware()
  const requestLoggerMiddleware = createRequestLoggerMiddleware()

  // Register global middleware (executed for all requests)
  middleware.use(requestLoggerMiddleware) // Log all requests
  middleware.use(corsMiddleware)
  middleware.use(securityHeadersMiddleware)
  middleware.use(bodyParserMiddleware)

  // Register static file middleware for serving frontend assets
  const staticMiddleware = createStaticFileMiddleware('public')
  middleware.use(staticMiddleware)

  // Register routes with appropriate middleware

  // GET /health - Health check endpoint (no auth, general rate limit)
  router.get('/health', generalRateLimiter.middleware(), asyncHandler(healthHandler))

  // POST /chat-process - Chat processing with streaming (auth required, general rate limit, 1MB body limit)
  const chatBodyParser = createBodyParserWithLimit(1048576) // 1MB
  router.post(
    '/chat-process',
    authMiddleware,
    generalRateLimiter.middleware(),
    chatBodyParser,
    asyncHandler(chatProcessHandler),
  )

  // POST /config - Configuration endpoint (auth required, general rate limit)
  router.post(
    '/config',
    authMiddleware,
    generalRateLimiter.middleware(),
    asyncHandler(configHandler),
  )

  // POST /session - Session information (no auth, general rate limit)
  router.post('/session', generalRateLimiter.middleware(), asyncHandler(sessionHandler))

  // POST /verify - Token verification (strict rate limit, 1KB body limit)
  const verifyBodyParser = createBodyParserWithLimit(1024) // 1KB
  router.post(
    '/verify',
    authRateLimiter.middleware(),
    verifyBodyParser,
    asyncHandler(verifyHandler),
  )

  // Create HTTP/2 adapter with configuration
  const adapter = new HTTP2Adapter(router, middleware, {
    http2: true, // Enable HTTP/2 protocol
    tls: undefined, // TLS configuration (if needed, load from env)
    bodyLimit: {
      json: 1048576, // 1MB default for JSON
      urlencoded: 32768, // 32KB default for URL-encoded
    },
    staticDir: 'public',
  })

  return adapter
}

/**
 * Start the server and setup graceful shutdown
 */
async function startServer(): Promise<void> {
  // Validate configuration before starting
  validateConfigOrExit()

  // Create and configure server
  const adapter = await createServer()

  // Start listening
  await adapter.listen(PORT, '0.0.0.0')

  // Log startup information
  const nodeVersion = process.version
  const http2Enabled = true // Always true in this implementation
  const tlsConfigured = false // TODO: Check if TLS is configured from env

  logger.info('Server started successfully', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion,
    http2: http2Enabled,
    tls: tlsConfigured,
  })

  // Output warning if TLS not configured
  if (!tlsConfigured) {
    logger.warn(
      'Warning: HTTP/2 without TLS (h2c) has limited browser support. ' +
        'Configure TLS for production use.',
    )
  }

  // Setup graceful shutdown handlers
  setupGracefulShutdown(adapter.getServer(), {
    timeout: 30000, // 30 second timeout
    onShutdownStart: async signal => {
      logger.info(`Received ${signal}, starting graceful shutdown`)
    },
    onShutdownComplete: async () => {
      logger.info('Graceful shutdown completed')
    },
  })
}

// Start the server
try {
  await startServer()
} catch (error) {
  logger.error('Failed to start server', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  })
  process.exit(1)
}
