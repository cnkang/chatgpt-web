/**
 * Native Node.js HTTP/1.1 + HTTP/2 Server Entry Point
 *
 * Loads environment, validates configuration, wires middleware/routes through the
 * shared native server factory, and starts the server.
 */

import { ConfigurationValidator } from './config/validator.js'
import { performSecurityValidation } from './security/index.js'
import { createConfiguredServer } from './server.js'
import { assessStartupValidation } from './startup-validation.js'
import { setupGracefulShutdown } from './utils/graceful-shutdown.js'
import { logger } from './utils/logger.js'

try {
  process.loadEnvFile()
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
    throw error
  }
}

function validateNodeVersion(): void {
  const nodeVersion = process.version
  const majorVersion = Number.parseInt(nodeVersion.slice(1).split('.')[0] || '0', 10)

  if (majorVersion < 24) {
    throw new Error(
      `Node.js 24.0.0 or higher is required. Current version: ${nodeVersion}\n` +
        'Please upgrade Node.js to continue.',
    )
  }

  logger.info('Node.js version check passed', { version: nodeVersion })
}

function validateConfigOrExit(): void {
  try {
    validateNodeVersion()
    const configValidation = ConfigurationValidator.validateSafely()
    const securityResult = performSecurityValidation()
    const assessment = assessStartupValidation(
      process.env.NODE_ENV,
      configValidation,
      securityResult,
    )

    if (assessment.blockingConfigErrors.length > 0) {
      throw new Error(assessment.blockingConfigErrors.join('\n'))
    }

    if (assessment.nonBlockingConfigErrors.length > 0 || configValidation.warnings.length > 0) {
      logger.warn('Configuration validation reported non-blocking issues', {
        errors: assessment.nonBlockingConfigErrors,
        warnings: configValidation.warnings,
      })
    } else {
      logger.info('Configuration validation passed')
    }

    if (assessment.blockingSecurityRisks.length > 0) {
      logger.error('Security validation failed')
      assessment.blockingSecurityRisks.forEach(risk => {
        logger.error(`[${risk.severity}] ${risk.description}`, {
          mitigation: risk.mitigation,
        })
      })
      process.exit(1)
    }

    if (assessment.nonBlockingSecurityRisks.length > 0) {
      logger.warn('Security validation reported non-blocking issues', {
        risks: assessment.nonBlockingSecurityRisks,
      })
    } else {
      logger.info('Security validation passed')
    }
  } catch (error) {
    logger.error('Configuration validation failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    process.exit(1)
  }
}

async function startServer(): Promise<void> {
  validateConfigOrExit()

  const { adapter, runtime } = createConfiguredServer()
  await adapter.listen(runtime.port, runtime.host)

  logger.info('Server started successfully', {
    port: runtime.port,
    host: runtime.host,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    http2: runtime.http2Enabled,
    tls: runtime.tlsConfigured,
    bodyLimit: runtime.bodyLimit,
  })

  if (runtime.http2Enabled && !runtime.tlsConfigured) {
    logger.warn(
      'Warning: HTTP/2 without TLS (h2c) has limited browser support. Configure TLS for production use.',
    )
  }

  setupGracefulShutdown(adapter.getServer(), {
    timeout: 30000,
    onShutdownStart: async signal => {
      logger.info(`Received ${signal}, starting graceful shutdown`)
    },
    onShutdownComplete: async () => {
      logger.info('Graceful shutdown completed')
    },
  })
}

try {
  await startServer()
} catch (error) {
  logger.error('Failed to start server', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  })
  process.exit(1)
}
