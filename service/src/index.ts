import express from 'express'
import type { RequestProps } from './types'
import type { ChatMessage } from './chatgpt'
import { chatConfig, chatReplyProcess, currentModel } from './chatgpt'
import { auth } from './middleware/auth'
import { limiter, verifyLimiter } from './middleware/limiter'
import { isNotEmptyString } from './utils/is'
import { safeEqualSecret, sanitizeErrorMessage } from './utils/security'

const app = express()
const router = express.Router()
const isProduction = process.env.NODE_ENV === 'production'
const enforceAuthInProduction = process.env.AUTH_REQUIRED_IN_PRODUCTION !== 'false'

if (isProduction && enforceAuthInProduction && !isNotEmptyString(process.env.AUTH_SECRET_KEY))
  throw new Error('Missing AUTH_SECRET_KEY in production. Set AUTH_SECRET_KEY or explicitly set AUTH_REQUIRED_IN_PRODUCTION=false.')

const configuredCorsOrigins = (process.env.CORS_ALLOW_ORIGIN ?? '')
  .split(',')
  .map(origin => origin.trim())
  .filter(origin => origin.length > 0)

const allowedCorsOrigins = configuredCorsOrigins.length > 0
  ? configuredCorsOrigins
  : (isProduction ? [] : ['http://localhost:1002', 'http://127.0.0.1:1002'])

function sendFail(res, message: string, statusCode = 200) {
  res.status(statusCode).send({ status: 'Fail', message, data: null })
}

app.set('trust proxy', 1)
app.use(express.static('public'))
app.use(express.json())

app.all('*', (req, res, next) => {
  const origin = req.header('Origin')
  if (origin && (allowedCorsOrigins.includes('*') || allowedCorsOrigins.includes(origin))) {
    res.header('Access-Control-Allow-Origin', allowedCorsOrigins.includes('*') ? '*' : origin)
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

router.post('/chat-process', [auth, limiter], async (req, res) => {
  res.setHeader('Content-type', 'application/octet-stream')
  let firstChunk = true

  try {
    const { prompt, options = {}, systemMessage, temperature, top_p } = req.body as RequestProps
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
  }
  catch (error: unknown) {
    const message = sanitizeErrorMessage(error)
    const payload = JSON.stringify({ status: 'Fail', message, data: null })
    res.write(firstChunk ? payload : `\n${payload}`)
  }
  finally {
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
    const AUTH_SECRET_KEY = process.env.AUTH_SECRET_KEY
    const hasAuth = isNotEmptyString(AUTH_SECRET_KEY)
    res.send({ status: 'Success', message: '', data: { auth: hasAuth, model: currentModel() } })
  }
  catch (error: unknown) {
    sendFail(res, sanitizeErrorMessage(error, 'Failed to load session'), 500)
  }
})

router.post('/verify', verifyLimiter, async (req, res) => {
  try {
    const AUTH_SECRET_KEY = process.env.AUTH_SECRET_KEY
    if (!isNotEmptyString(AUTH_SECRET_KEY))
      throw new Error('Server authentication is disabled')

    const { token } = req.body as { token: string }
    if (!token)
      throw new Error('Secret key is empty')

    if (!safeEqualSecret(AUTH_SECRET_KEY, token))
      throw new Error('密钥无效 | Secret key is invalid')

    res.send({ status: 'Success', message: 'Verify successfully', data: null })
  }
  catch {
    sendFail(res, 'Verification failed', 401)
  }
})

app.use('', router)
app.use('/api', router)

app.listen(3002, () => globalThis.console.log('Server is running on port 3002'))
