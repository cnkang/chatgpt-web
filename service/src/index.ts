import type { Request, Response } from 'express'
import type { ChatMessage } from './chatgpt/index.js'
import type { RequestProps } from './types'
import express from 'express'
import { ConfigurationValidator } from './config/validator'
import { auth } from './middleware/auth'
import { limiter } from './middleware/limiter'
import {
	createCorsMiddleware,
	createSecureLogger,
	createSecurityHeaders,
	createSessionMiddleware,
	secureApiKeys,
	validateSecurityEnvironment,
} from './middleware/security'
import {
	sanitizeRequest,
	validateBody,
	validateContentType,
	validateRequestSize,
} from './middleware/validation'
import { performSecurityValidation } from './security/index.js'
import {
	asyncHandler,
	errorHandler,
	notFoundHandler,
	setupGracefulShutdown,
} from './utils/error-handler'
import { isNotEmptyString } from './utils/is'
import { logger, requestLogger } from './utils/logger'
import { CircuitBreaker, retryWithBackoff } from './utils/retry'
import { chatProcessRequestSchema, tokenVerificationSchema } from './validation/schemas'

const PORT = 3002

type ChatModule = typeof import('./chatgpt/index.js')

// Create circuit breaker for external API calls
const apiCircuitBreaker = new CircuitBreaker({
	failureThreshold: 5,
	recoveryTimeout: 60000, // 1 minute
	monitoringPeriod: 10000, // 10 seconds
	expectedErrors: ['EXTERNAL_API_ERROR', 'NETWORK_ERROR', 'TIMEOUT_ERROR'],
})

function validateConfigOrExit() {
	try {
		ConfigurationValidator.validateEnvironment()
		console.warn('✓ Configuration validation passed')

		// Perform comprehensive security validation
		const securityResult = performSecurityValidation()
		if (!securityResult.isSecure) {
			console.error('✗ Security validation failed:')
			securityResult.risks.forEach(risk => {
				console.error(`  [${risk.severity}] ${risk.description}`)
				console.error(`    Mitigation: ${risk.mitigation}`)
			})
			process.exit(1)
		}
		console.warn('✓ Security validation passed')

		// Validate security environment
		const envValidation = validateSecurityEnvironment()
		if (!envValidation.isValid) {
			console.error('✗ Security environment validation failed')
			process.exit(1)
		}
		if (envValidation.warnings.length > 0) {
			console.warn('⚠ Security warnings:')
			envValidation.warnings.forEach(warning => {
				console.warn(`  - ${warning}`)
			})
		}
		console.warn('✓ Security environment validation passed')
	} catch (error) {
		console.error('✗ Configuration validation failed:')
		console.error(error instanceof Error ? error.message : String(error))
		process.exit(1)
	}
}

async function applySecurityMiddleware(app: express.Express) {
	// Apply security headers with Helmet
	app.use(createSecurityHeaders())

	// Apply CORS middleware
	app.use(createCorsMiddleware())

	// Apply secure logging
	app.use(createSecureLogger())

	// Apply API key security
	app.use(secureApiKeys)

	// Apply session middleware
	const sessionMiddleware = await createSessionMiddleware()
	app.use(sessionMiddleware)
}

function registerHealthRoute(router: express.Router) {
	router.get('/health', async (_req, res, _next) => {
		const healthcheck = {
			uptime: process.uptime(),
			message: 'OK',
			timestamp: Date.now(),
		}

		try {
			res.send(healthcheck)
		} catch (error) {
			healthcheck.message = error instanceof Error ? error.message : String(error)
			res.status(503).send()
		}
	})
}

function registerChatRoutes(router: express.Router, chatModule: ChatModule) {
	const { chatConfig, chatReplyProcess, currentModel } = chatModule

	router.post(
		'/chat-process',
		[
			validateContentType(['application/json']),
			validateRequestSize(1024 * 1024), // 1MB limit
			sanitizeRequest,
			validateBody(chatProcessRequestSchema),
			auth,
			limiter,
		],
		asyncHandler(async (req: Request, res: Response) => {
			res.setHeader('Content-type', 'application/octet-stream')

			const { prompt, options = {}, systemMessage, temperature, top_p } = req.body as RequestProps
			let firstChunk = true

			// Use circuit breaker and retry logic for chat processing
			await apiCircuitBreaker.execute(async () => {
				await retryWithBackoff(
					async () => {
						await chatReplyProcess({
							message: prompt,
							lastContext: options,
							process: (chat: ChatMessage) => {
								res.write(firstChunk ? JSON.stringify(chat) : `\n${JSON.stringify(chat)}`)
								firstChunk = false
							},
							systemMessage,
							temperature,
							top_p,
						})
					},
					{
						maxAttempts: 3,
						baseDelay: 1000,
						retryableErrors: ['NETWORK_ERROR', 'TIMEOUT_ERROR', 'EXTERNAL_API_ERROR'],
					},
				)
			})

			res.end()
		}),
	)

	router.post(
		'/config',
		[validateContentType(['application/json']), sanitizeRequest, auth],
		asyncHandler(async (_req, res) => {
			const response = await retryWithBackoff(
				async () => {
					return await chatConfig()
				},
				{
					maxAttempts: 2,
					baseDelay: 500,
				},
			)
			res.send(response)
		}),
	)

	router.post(
		'/session',
		[sanitizeRequest],
		asyncHandler(async (_req, res) => {
			const { AUTH_SECRET_KEY } = process.env
			const hasAuth = isNotEmptyString(AUTH_SECRET_KEY)
			res.send({ status: 'Success', message: '', data: { auth: hasAuth, model: currentModel() } })
		}),
	)

	router.post(
		'/verify',
		[
			validateContentType(['application/json']),
			validateRequestSize(1024), // 1KB limit for token verification
			sanitizeRequest,
			validateBody(tokenVerificationSchema),
		],
		asyncHandler(async (req, res) => {
			const { token } = req.body as { token: string }

			if (process.env.AUTH_SECRET_KEY !== token) {
				throw new Error('密钥无效 | Secret key is invalid')
			}

			res.send({ status: 'Success', message: 'Verify successfully', data: null })
		}),
	)
}

function registerMigrationRoute(router: express.Router) {
	router.get(
		'/migration-info',
		asyncHandler(async (_req, res) => {
			const migrationInfo = ConfigurationValidator.getMigrationInfo()
			const validationResult = ConfigurationValidator.validateSafely()

			res.send({
				status: 'Success',
				message: 'Migration information retrieved',
				data: {
					migration: migrationInfo,
					validation: validationResult,
				},
			})
		}),
	)
}

function registerSecurityRoute(router: express.Router) {
	router.get(
		'/security-status',
		asyncHandler(async (_req, res) => {
			const securityResult = performSecurityValidation()

			res.send({
				status: 'Success',
				message: 'Security validation completed',
				data: {
					isSecure: securityResult.isSecure,
					risks: securityResult.risks,
					summary: {
						totalRisks: securityResult.risks.length,
						highSeverity: securityResult.risks.filter(r => r.severity === 'HIGH').length,
						mediumSeverity: securityResult.risks.filter(r => r.severity === 'MEDIUM').length,
						lowSeverity: securityResult.risks.filter(r => r.severity === 'LOW').length,
					},
				},
			})
		}),
	)

	// Add circuit breaker status endpoint
	router.get(
		'/circuit-breaker-status',
		asyncHandler(async (_req, res) => {
			const status = apiCircuitBreaker.getStatus()
			res.send({
				status: 'Success',
				message: 'Circuit breaker status retrieved',
				data: status,
			})
		}),
	)
}

function attachRouter(app: express.Express, router: express.Router) {
	app.use('', router)
	app.use('/api', router)
	app.set('trust proxy', 1)
}

function listen(app: express.Express) {
	const server = app.listen(PORT, () => console.warn(`Server is running on port ${PORT}`))
	return server
}

async function startServer() {
	validateConfigOrExit()

	// Dynamic import of chatgpt module after validation passes
	const chatModule = await import('./chatgpt/index.js')

	const app = express()
	const router = express.Router()

	app.use(express.static('public'))
	app.use(express.json())

	// Request logging middleware
	app.use(requestLogger())

	// Apply comprehensive security middleware
	await applySecurityMiddleware(app)

	registerHealthRoute(router)
	registerChatRoutes(router, chatModule)
	registerMigrationRoute(router)
	registerSecurityRoute(router)
	attachRouter(app, router)

	// 404 handler for unmatched routes
	app.use(notFoundHandler)

	// Global error handler (must be last)
	app.use(errorHandler)

	// Start server
	const server = listen(app)

	// Setup graceful shutdown
	setupGracefulShutdown(server)

	logger.info('Server started successfully', {
		port: PORT,
		environment: process.env.NODE_ENV || 'development',
		nodeVersion: process.version,
	})
}

// Start the server
startServer().catch(error => {
	console.error('Failed to start server:', error)
	process.exit(1)
})
