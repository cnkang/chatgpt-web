import type { NextFunction, Request, Response } from 'express'
import type { ChatMessage } from './chatgpt'
import type { RequestProps } from './types'
import express from 'express'
import { chatConfig, chatReplyProcess, currentModel } from './chatgpt'
import { auth } from './middleware/auth'
import { limiter } from './middleware/limiter'
import { isNotEmptyString } from './utils/is'

const app = express()
const router = express.Router()

app.use(express.static('public'))
app.use(express.json())

app.use((_: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'authorization, Content-Type')
  res.header('Access-Control-Allow-Methods', '*')

  // Content Security Policy for Mermaid and other dynamic libraries
  res.header('Content-Security-Policy', [
    'default-src \'self\'',
    'script-src \'self\' \'unsafe-eval\' \'unsafe-inline\'',
    'style-src \'self\' \'unsafe-inline\'',
    'img-src \'self\' data: blob:',
    'font-src \'self\' data:',
    'connect-src \'self\' https: wss:',
    'worker-src \'self\' blob:',
    'child-src \'self\' blob:',
    'object-src \'none\'',
    'base-uri \'self\'',
    'form-action \'self\'',
  ].join('; '))

  next()
})

router.get('/health', async (_req, res, _next) => {
  const healthcheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
  }
  try {
    res.send(healthcheck)
  }
  catch (error) {
    healthcheck.message = error instanceof Error ? error.message : String(error)
    res.status(503).send()
  }
})

router.post('/chat-process', [auth, limiter], async (req: Request, res: Response) => {
  res.setHeader('Content-type', 'application/octet-stream')

  try {
    const { prompt, options = {}, systemMessage, temperature, top_p } = req.body as RequestProps
    let firstChunk = true
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
  catch (error) {
    res.write(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }))
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
  catch (error) {
    res.send({ error: error instanceof Error ? error.message : String(error) })
  }
})

router.post('/session', async (_req, res) => {
  try {
    const { AUTH_SECRET_KEY } = process.env
    const hasAuth = isNotEmptyString(AUTH_SECRET_KEY)
    res.send({ status: 'Success', message: '', data: { auth: hasAuth, model: currentModel() } })
  }
  catch (error) {
    res.send({ status: 'Fail', message: error instanceof Error ? error.message : String(error), data: null })
  }
})

router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body as { token: string }
    if (!token)
      throw new Error('Secret key is empty')

    if (process.env.AUTH_SECRET_KEY !== token)
      throw new Error('密钥无效 | Secret key is invalid')

    res.send({ status: 'Success', message: 'Verify successfully', data: null })
  }
  catch (error) {
    res.send({ status: 'Fail', message: error instanceof Error ? error.message : String(error), data: null })
  }
})

app.use('', router)
app.use('/api', router)
app.set('trust proxy', 1)

app.listen(3002, () => globalThis.console.log('Server is running on port 3002'))
