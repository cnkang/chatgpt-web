import {
  ChatGPTAPI,
  ChatGPTUnofficialProxyAPI,
  type ChatGPTAPIOptions,
  type ChatMessage,
  type FetchFn,
  type SendMessageOptions,
} from 'chatgpt'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { SocksProxyAgent } from 'socks-proxy-agent'
import type { ApiModel, ChatContext, ChatGPTUnofficialProxyAPIOptions, ModelConfig } from '../types'
import { sendResponse } from '../utils'
import { isNotEmptyString } from '../utils/is'
import { logSanitizedError, maskConfigured, sanitizeErrorMessage } from '../utils/security'
import type { RequestOptions, UsageResponse } from './types'

const ERROR_CODE_MESSAGE: Record<number, string> = {
  401: '[OpenAI] 提供错误的API密钥 | Incorrect API key provided',
  403: '[OpenAI] 服务器拒绝访问，请稍后再试 | Server refused to access, please try again later',
  500: '[OpenAI] 服务器繁忙，请稍后再试 | Internal Server Error',
  502: '[OpenAI] 错误的网关 | Bad Gateway',
  503: '[OpenAI] 服务器繁忙，请稍后再试 | Server is busy, please try again later',
  504: '[OpenAI] 网关超时 | Gateway Time-out',
}

const timeoutMs = parsePositiveInteger(process.env.TIMEOUT_MS, 100_000)
const usageRequestTimeoutMs = parsePositiveInteger(process.env.USAGE_REQUEST_TIMEOUT_MS, 10_000)
const disableDebug = process.env.OPENAI_API_DISABLE_DEBUG !== 'false'
const model = isNotEmptyString(process.env.OPENAI_API_MODEL) ? process.env.OPENAI_API_MODEL : 'gpt-3.5-turbo'

type ApiClient = ChatGPTAPI | ChatGPTUnofficialProxyAPI

type RequestInitWithAgent = RequestInit & { agent?: unknown }

const proxyFetch = createProxyFetch()
const { api, apiModel } = createApiClient(proxyFetch)

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!isNotEmptyString(value))
    return fallback

  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0)
    return fallback

  return parsed
}

function withTrailingV1(baseUrl: string): string {
  const normalized = baseUrl.trim().replace(/\/+$/, '')
  return normalized.endsWith('/v1') ? normalized : `${normalized}/v1`
}

function withoutTrailingV1(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '').replace(/\/v1$/i, '')
}

function setTokenWindowByModel(modelName: string, options: ChatGPTAPIOptions) {
  const normalizedModel = modelName.toLowerCase()

  if (normalizedModel.includes('gpt-4')) {
    if (normalizedModel.includes('32k')) {
      options.maxModelTokens = 32768
      options.maxResponseTokens = 8192
      return
    }

    if (normalizedModel.includes('-4o-mini')) {
      options.maxModelTokens = 128000
      options.maxResponseTokens = 16384
      return
    }

    if (/-preview|-turbo|o/.test(normalizedModel)) {
      options.maxModelTokens = 128000
      options.maxResponseTokens = 4096
      return
    }

    options.maxModelTokens = 8192
    options.maxResponseTokens = 2048
    return
  }

  if (normalizedModel.includes('gpt-3.5') && /16k|1106|0125/.test(normalizedModel)) {
    options.maxModelTokens = 16384
    options.maxResponseTokens = 4096
  }
}

function createAgentFetch(agent: unknown): FetchFn {
  return (input, init) => {
    return globalThis.fetch(input, { ...init, agent } as RequestInitWithAgent)
  }
}

function buildSocksProxyUrl(host: string, port: string): string {
  const username = process.env.SOCKS_PROXY_USERNAME
  const password = process.env.SOCKS_PROXY_PASSWORD

  if (!isNotEmptyString(username) && !isNotEmptyString(password))
    return `socks5://${host}:${port}`

  const encodedUsername = encodeURIComponent(username ?? '')
  const encodedPassword = encodeURIComponent(password ?? '')
  return `socks5://${encodedUsername}:${encodedPassword}@${host}:${port}`
}

function createProxyFetch(): FetchFn {
  const socksHost = process.env.SOCKS_PROXY_HOST
  const socksPort = process.env.SOCKS_PROXY_PORT

  if (isNotEmptyString(socksHost) && isNotEmptyString(socksPort)) {
    const socksProxyUrl = buildSocksProxyUrl(socksHost, socksPort)
    return createAgentFetch(new SocksProxyAgent(socksProxyUrl))
  }

  const httpsProxy = process.env.HTTPS_PROXY || process.env.ALL_PROXY
  if (isNotEmptyString(httpsProxy))
    return createAgentFetch(new HttpsProxyAgent(httpsProxy))

  return (input, init) => globalThis.fetch(input, init)
}

function createApiClient(fetchWithProxy: FetchFn): { api: ApiClient; apiModel: ApiModel } {
  const apiKey = process.env.OPENAI_API_KEY
  const accessToken = process.env.OPENAI_ACCESS_TOKEN

  if (isNotEmptyString(apiKey)) {
    const options: ChatGPTAPIOptions = {
      apiKey,
      completionParams: { model },
      debug: !disableDebug,
      fetch: fetchWithProxy,
    }

    if (isNotEmptyString(process.env.OPENAI_API_BASE_URL))
      options.apiBaseUrl = withTrailingV1(process.env.OPENAI_API_BASE_URL)

    setTokenWindowByModel(model, options)

    return {
      api: new ChatGPTAPI(options),
      apiModel: 'ChatGPTAPI',
    }
  }

  if (isNotEmptyString(accessToken)) {
    const options: ChatGPTUnofficialProxyAPIOptions = {
      accessToken,
      apiReverseProxyUrl: isNotEmptyString(process.env.API_REVERSE_PROXY)
        ? process.env.API_REVERSE_PROXY
        : 'https://ai.fakeopen.com/api/conversation',
      model,
      debug: !disableDebug,
      fetch: fetchWithProxy,
    }

    return {
      api: new ChatGPTUnofficialProxyAPI(options),
      apiModel: 'ChatGPTUnofficialProxyAPI',
    }
  }

  throw new Error('Missing OPENAI_API_KEY or OPENAI_ACCESS_TOKEN environment variable')
}

function buildCompletionParams(temperature?: number, topP?: number): NonNullable<SendMessageOptions['completionParams']> {
  const completionParams: NonNullable<SendMessageOptions['completionParams']> = { model }

  if (temperature !== undefined)
    completionParams.temperature = temperature

  if (topP !== undefined)
    completionParams.top_p = topP

  return completionParams
}

function getErrorStatusCode(error: unknown): number | null {
  if (!error || typeof error !== 'object')
    return null

  if (!('statusCode' in error))
    return null

  const statusCode = (error as { statusCode?: unknown }).statusCode
  return typeof statusCode === 'number' ? statusCode : null
}

async function chatReplyProcess(options: RequestOptions) {
  const { message, lastContext, process, systemMessage, temperature, top_p: topP } = options

  try {
    const sendMessageOptions: SendMessageOptions = {
      timeoutMs,
      onProgress: partialResponse => process?.(partialResponse),
    }

    if (apiModel === 'ChatGPTAPI') {
      if (isNotEmptyString(systemMessage))
        sendMessageOptions.systemMessage = systemMessage

      sendMessageOptions.completionParams = buildCompletionParams(temperature, topP)

      if (isNotEmptyString(lastContext?.parentMessageId))
        sendMessageOptions.parentMessageId = lastContext.parentMessageId
    }
    else if (lastContext) {
      if (isNotEmptyString(lastContext.conversationId))
        sendMessageOptions.conversationId = lastContext.conversationId

      if (isNotEmptyString(lastContext.parentMessageId))
        sendMessageOptions.parentMessageId = lastContext.parentMessageId
    }

    const response = await api.sendMessage(message, sendMessageOptions)
    return sendResponse({ type: 'Success', data: response })
  }
  catch (error: unknown) {
    const code = getErrorStatusCode(error)
    logSanitizedError('chatReplyProcess', error)

    if (code !== null) {
      const errorMessage = ERROR_CODE_MESSAGE[code]
      if (errorMessage)
        return sendResponse({ type: 'Fail', message: errorMessage })
    }

    return sendResponse({ type: 'Fail', message: sanitizeErrorMessage(error) })
  }
}

function formatDateRange(): [string, string] {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() + 1
  const lastDay = new Date(year, month, 0)

  const formattedFirstDay = `${year}-${month.toString().padStart(2, '0')}-01`
  const formattedLastDay = `${year}-${month.toString().padStart(2, '0')}-${lastDay.getDate().toString().padStart(2, '0')}`

  return [formattedFirstDay, formattedLastDay]
}

async function fetchUsage() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!isNotEmptyString(apiKey))
    return '-'

  const baseUrl = isNotEmptyString(process.env.OPENAI_API_BASE_URL)
    ? withoutTrailingV1(process.env.OPENAI_API_BASE_URL)
    : 'https://api.openai.com'

  const [startDate, endDate] = formatDateRange()
  const usageUrl = `${baseUrl}/v1/dashboard/billing/usage?start_date=${startDate}&end_date=${endDate}`

  try {
    const useResponse = await proxyFetch(usageUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(usageRequestTimeoutMs),
    })

    if (!useResponse.ok)
      throw new Error('Failed to fetch usage')

    const usageData = await useResponse.json() as UsageResponse
    const usage = Math.round(usageData.total_usage) / 100
    return usage ? `$${usage}` : '-'
  }
  catch (error) {
    logSanitizedError('fetchUsage', error)
    return '-'
  }
}

async function chatConfig() {
  const usage = await fetchUsage()
  const reverseProxy = maskConfigured(process.env.API_REVERSE_PROXY)
  const httpsProxy = maskConfigured(process.env.HTTPS_PROXY || process.env.ALL_PROXY)
  const socksProxy = (process.env.SOCKS_PROXY_HOST && process.env.SOCKS_PROXY_PORT)
    ? maskConfigured(`${process.env.SOCKS_PROXY_HOST}:${process.env.SOCKS_PROXY_PORT}`)
    : '-'

  return sendResponse<ModelConfig>({
    type: 'Success',
    data: {
      apiModel,
      reverseProxy,
      timeoutMs,
      socksProxy,
      httpsProxy,
      usage,
    },
  })
}

function currentModel(): ApiModel {
  return apiModel
}

export type { ChatContext, ChatMessage }

export { chatConfig, chatReplyProcess, currentModel }
