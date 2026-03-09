/**
 * Graceful shutdown handler for HTTP servers
 * Ensures in-flight requests complete before server stops
 */

import { logger } from './logger.js'

/**
 * Interface for servers that can be closed gracefully
 */
interface ClosableServer {
  close: (callback: (err?: Error | null) => void) => void
}

/**
 * Configuration options for graceful shutdown
 */
interface ShutdownOptions {
  /** Timeout in milliseconds before forcing shutdown (default: 30000) */
  timeout?: number
  /** Callback to execute before shutdown starts */
  onShutdownStart?: (signal: string) => void | Promise<void>
  /** Callback to execute after successful shutdown */
  onShutdownComplete?: () => void | Promise<void>
}

/**
 * Sets up graceful shutdown handlers for SIGTERM and SIGINT signals
 *
 * @param server - HTTP server instance to close gracefully
 * @param options - Configuration options for shutdown behavior
 *
 * @example
 * ```typescript
 * const server = http.createServer(app)
 * setupGracefulShutdown(server, {
 *   timeout: 30000,
 *   onShutdownStart: (signal) => console.log(`Received ${signal}`),
 *   onShutdownComplete: () => console.log('Shutdown complete')
 * })
 * ```
 */
export function setupGracefulShutdown(
  server: ClosableServer,
  options: ShutdownOptions = {},
): () => void {
  const { timeout = 30000, onShutdownStart, onShutdownComplete } = options

  const shutdown = async (signal: string) => {
    logger.warn(`Received ${signal}. Starting graceful shutdown...`)

    // Execute pre-shutdown callback if provided
    if (onShutdownStart) {
      try {
        await onShutdownStart(signal)
      } catch (error) {
        logger.error('Error in onShutdownStart callback:', error)
      }
    }

    // Stop accepting new connections and wait for existing ones to complete
    server.close(async (err?: Error | null) => {
      if (err) {
        logger.error('Error during server shutdown:', err)
        process.exit(1)
      }

      logger.info('Server closed successfully')

      // Execute post-shutdown callback if provided
      if (onShutdownComplete) {
        try {
          await onShutdownComplete()
        } catch (error) {
          logger.error('Error in onShutdownComplete callback:', error)
        }
      }

      process.exit(0)
    })

    // Force shutdown after timeout
    // Use .unref() so the timer doesn't keep the event loop alive if the server closes cleanly
    setTimeout(() => {
      logger.error(`Forced shutdown after ${timeout}ms timeout`)
      process.exit(1)
    }, timeout).unref()
  }

  // Register signal handlers
  const sigtermHandler = () => {
    void shutdown('SIGTERM')
  }
  const sigintHandler = () => {
    void shutdown('SIGINT')
  }
  const uncaughtExceptionHandler = (error: Error) => {
    logger.error('Uncaught Exception:', error)
    process.exit(1)
  }
  const unhandledRejectionHandler = (reason: unknown, promise: Promise<unknown>) => {
    logger.error('Unhandled Rejection', { promiseType: promise.constructor.name, reason })
    process.exit(1)
  }

  process.on('SIGTERM', sigtermHandler)
  process.on('SIGINT', sigintHandler)
  process.on('uncaughtException', uncaughtExceptionHandler)
  process.on('unhandledRejection', unhandledRejectionHandler)

  return () => {
    process.off('SIGTERM', sigtermHandler)
    process.off('SIGINT', sigintHandler)
    process.off('uncaughtException', uncaughtExceptionHandler)
    process.off('unhandledRejection', unhandledRejectionHandler)
  }
}
