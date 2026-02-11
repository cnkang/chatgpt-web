import express, { type Request, type Response } from 'express'
import type { RequestProps } from './types'
import { chatConfig, chatReplyProcess, currentModel, type ChatMessage } from './chatgpt'
import { auth } from './middleware/auth'
import { limiter, verifyLimiter } from './middleware/limiter'
import { isNotEmptyString } from './utils/is'
import { logSanitizedError, safeEqualSecret, sanitizeErrorMessage } from './utils/security'

const app = express()
const router = express.Router()

const isProduction = process.env.NODE_ENV === 'production'
const enforceAuthInProduction = process.env.AUTH_REQUIRED_IN_PRODUCTION !== 'false'
const requestBodyLimit = process.env.JSON_BODY_LIMIT?.trim() || '1mb'
const maxPromptChars = parsePositiveInteger(process.env.MAX_PROMPT_CHARS, 32000)
const maxSystemMessageChars = parsePositiveInteger(process.env.MAX_SYSTEM_MESSAGE_CHARS, 8000)
const maxVerifyTokenChars = parsePositiveInteger(process.env.MAX_VERIFY_TOKEN_CHARS, 1024)
const serverPort = parsePositiveInteger(process.env.PORT, 3002)

if (isProduction && enforceAuthInProduction && !isNotEmptyString(process.env.AUTH_SECRET_KEY)) {
  throw new Error('Missing AUTH_SECRET_KEY in production. Set AUTH_SECRET_KEY or explicitly set AUTH_REQUIRED_IN_PRODUCTION=false.')
}

const configuredCorsOrigins = (process.env.CORS_ALLOW_ORIGIN ?? '')
  .split(',')
  .map(origin => origin.trim())
  .filter(origin => origin.length > 0)

const allowedCorsOrigins = new Set(
  configuredCorsOrigins.length > 0
    ? configuredCorsOrigins
    : (isProduction ? [] : ['http://localhost:1002', 'http://127.0.0.1:1002']),
)

const PUBLIC_ERROR_MESSAGE = 'Request failed, please try again later.'

type OptionalNumberValidation =
  | { valid: true; value?: number }
  | { valid: false }

function sendFail(res: Response, message: string, statusCode = 200) {
  res.status(statusCode).send({ status: 'Fail', message, data: null })
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!isNotEmptyString(value))
    return fallback

  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0)
    return fallback

  return parsed
}

function parseTrustProxy(value: string | undefined): boolean | number | string {
  if (!isNotEmptyString(value))
    return false

  const normalized = value.trim().toLowerCase()
  if (normalized === 'true')
    return 1

  if (normalized === 'false')
    return false

  const parsed = Number.parseInt(normalized, 10)
  if (Number.isInteger(parsed) && parsed >= 0)
    return parsed

  return value.trim()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function validateOptionalNumber(value: unknown, min: number, max: number): OptionalNumberValidation {
  if (value === undefined)
    return { valid: true }

  if (typeof value !== 'number' || Number.isNaN(value) || value < min || value > max)
    return { valid: false }

  return { valid: true, value }
}

function validateChatProcessRequest(payload: unknown): { valid: true; value: RequestProps } | { valid: false; message: string } {
  if (!isRecord(payload))
    return { valid: false, message: 'Invalid request payload' }

  if (!isNotEmptyString(payload.prompt))
    return { valid: false, message: 'Prompt is required' }

  const prompt = payload.prompt
  if (prompt.length > maxPromptChars)
    return { valid: false, message: `Prompt is too long (max ${maxPromptChars} characters)` }

  let options: RequestProps['options']
  if (payload.options !== undefined) {
    if (!isRecord(payload.options))
      return { valid: false, message: 'Invalid options payload' }

    const nextOptions: NonNullable<RequestProps['options']> = {}

    const conversationId = payload.options.conversationId
    if (conversationId !== undefined) {
      if (!isNotEmptyString(conversationId) || conversationId.length > 128)
        return { valid: false, message: 'Invalid conversationId' }

      nextOptions.conversationId = conversationId
    }

    const parentMessageId = payload.options.parentMessageId
    if (parentMessageId !== undefined) {
      if (!isNotEmptyString(parentMessageId) || parentMessageId.length > 128)
        return { valid: false, message: 'Invalid parentMessageId' }

      nextOptions.parentMessageId = parentMessageId
    }

    if (Object.keys(nextOptions).length > 0)
      options = nextOptions
  }

  let systemMessage: string | undefined
  if (payload.systemMessage !== undefined) {
    if (!isNotEmptyString(payload.systemMessage))
      return { valid: false, message: 'Invalid systemMessage' }

    if (payload.systemMessage.length > maxSystemMessageChars)
      return { valid: false, message: `System message is too long (max ${maxSystemMessageChars} characters)` }

    systemMessage = payload.systemMessage
  }

  const validatedTemperature = validateOptionalNumber(payload.temperature, 0, 2)
  if (!validatedTemperature.valid)
    return { valid: false, message: 'Invalid temperature (must be a number between 0 and 2)' }

  const validatedTopP = validateOptionalNumber(payload.top_p, 0, 1)
  if (!validatedTopP.valid)
    return { valid: false, message: 'Invalid top_p (must be a number between 0 and 1)' }

  const request: RequestProps = { prompt }

  if (options)
    request.options = options

  if (systemMessage !== undefined)
    request.systemMessage = systemMessage

  if (validatedTemperature.value !== undefined)
    request.temperature = validatedTemperature.value

  if (validatedTopP.value !== undefined)
    request.top_p = validatedTopP.value

  return { valid: true, value: request }
}

app.disable('x-powered-by')
app.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY))
app.use(express.static('public', {
  etag: true,
  immutable: isProduction,
  maxAge: isProduction ? '1d' : 0,
}))
app.use(express.json({ limit: requestBodyLimit }))

app.all('*', (req, res, next) => {
  const origin = req.header('Origin')

  if (origin && (allowedCorsOrigins.has('*') || allowedCorsOrigins.has(origin))) {
    res.header('Access-Control-Allow-Origin', allowedCorsOrigins.has('*') ? '*' : origin)
    res.header('Vary', 'Origin')
  }

  res.header('X-Content-Type-Options', 'nosniff')
  res.header('X-Frame-Options', 'DENY')
  res.header('Referrer-Policy', 'no-referrer')
  res.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  res.header('Access-Control-Allow-Headers', 'authorization, Content-Type')
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')

  if (req.method === 'OPTIONS') {
    res.sendStatus(204)
    return
  }

  next()
})

router.get('/health', (_req, res) => {
  res.send({
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
  })
})

router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store')
  next()
})

router.post('/chat-process', [auth, limiter], async (req: Request, res: Response) => {
  let firstChunk = true

  try {
    const validation = validateChatProcessRequest(req.body)
    if (!validation.valid) {
      sendFail(res, validation.message, 400)
      return
    }

    const { prompt, options, systemMessage, temperature, top_p } = validation.value
    res.setHeader('Content-Type', 'application/octet-stream')

    await chatReplyProcess({
      message: prompt,
      lastContext: options ?? {},
      process: (chat: ChatMessage) => {
        res.write(firstChunk ? JSON.stringify(chat) : `\n${JSON.stringify(chat)}`)
        firstChunk = false
      },
      ...(systemMessage !== undefined ? { systemMessage } : {}),
      ...(temperature !== undefined ? { temperature } : {}),
      ...(top_p !== undefined ? { top_p } : {}),
    })
  }
  catch (error: unknown) {
    logSanitizedError('chat-process', error)

    if (!res.headersSent) {
      sendFail(res, PUBLIC_ERROR_MESSAGE, 500)
    }
    else {
      const payload = JSON.stringify({ status: 'Fail', message: PUBLIC_ERROR_MESSAGE, data: null })
      res.write(firstChunk ? payload : `\n${payload}`)
    }
  }
  finally {
    if (!res.writableEnded)
      res.end()
  }
})

router.post('/config', auth, async (_req, res) => {
  try {
    const response = await chatConfig()
    res.send(response)
  }
  catch (error: unknown) {
    sendFail(res, sanitizeErrorMessage(error, 'Failed to load config'), 500)
  }
})

router.post('/session', async (_req, res) => {
  try {
    const authSecret = process.env.AUTH_SECRET_KEY
    const hasAuth = isNotEmptyString(authSecret)
    res.send({ status: 'Success', message: '', data: { auth: hasAuth, model: currentModel() } })
  }
  catch (error: unknown) {
    sendFail(res, sanitizeErrorMessage(error, 'Failed to load session'), 500)
  }
})

router.post('/verify', verifyLimiter, async (req, res) => {
  try {
    const authSecret = process.env.AUTH_SECRET_KEY
    if (!isNotEmptyString(authSecret))
      throw new Error('Server authentication is disabled')

    const token = isRecord(req.body) ? req.body.token : undefined
    if (!isNotEmptyString(token))
      throw new Error('Secret key is empty')

    if (token.length > maxVerifyTokenChars)
      throw new Error('Secret key is too long')

    if (!safeEqualSecret(authSecret, token))
      throw new Error('密钥无效 | Secret key is invalid')

    res.send({ status: 'Success', message: 'Verify successfully', data: null })
  }
  catch {
    sendFail(res, 'Verification failed', 401)
  }
})

app.use('', router)
app.use('/api', router)

app.listen(serverPort, () => {
  globalThis.console.log(`Server is running on port ${serverPort}`)
})
