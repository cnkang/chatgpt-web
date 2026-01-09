import type { ChatGPTAPIOptions, ChatMessage, SendMessageOptions } from 'chatgpt'
import type { RequestInfo as NodeRequestInfo, RequestInit as NodeRequestInit } from 'node-fetch'
import type { ApiModel, ChatContext, ModelConfig } from '../types'
import type { FetchLike, RequestOptions, SetProxyOptions, UsageResponse } from './types'
import { ChatGPTAPI } from 'chatgpt'
import * as dotenv from 'dotenv'
import httpsProxyAgent from 'https-proxy-agent'
import fetch from 'node-fetch'
import { SocksProxyAgent } from 'socks-proxy-agent'
import { sendResponse } from '../utils'
import { isNotEmptyString } from '../utils/is'
import 'isomorphic-fetch'

const { HttpsProxyAgent } = httpsProxyAgent

dotenv.config()

const ErrorCodeMessage: Record<string, string> = {
  401: '[OpenAI] 提供错误的API密钥 | Incorrect API key provided',
  403: '[OpenAI] 服务器拒绝访问，请稍后再试 | Server refused to access, please try again later',
  502: '[OpenAI] 错误的网关 |  Bad Gateway',
  503: '[OpenAI] 服务器繁忙，请稍后再试 | Server is busy, please try again later',
  504: '[OpenAI] 网关超时 | Gateway Time-out',
  500: '[OpenAI] 服务器繁忙，请稍后再试 | Internal Server Error',
}

const timeoutMsEnv = process.env.TIMEOUT_MS
const timeoutMs: number = Number.isNaN(Number(timeoutMsEnv)) ? 100 * 1000 : Number(timeoutMsEnv)
const disableDebug: boolean = process.env.OPENAI_API_DISABLE_DEBUG === 'true'
const defaultFetch: FetchLike = (input, init) =>
  fetch(input as NodeRequestInfo, init as NodeRequestInit)

let apiModel: ApiModel
const model = isNotEmptyString(process.env.OPENAI_API_MODEL)
  ? process.env.OPENAI_API_MODEL
  : 'gpt-3.5-turbo'
const openAiApiKey = process.env.OPENAI_API_KEY

if (!isNotEmptyString(openAiApiKey)) {
  throw new Error(
    'Missing OPENAI_API_KEY environment variable. Please provide a valid OpenAI API key.',
  )
}

let api: ChatGPTAPI
;(async () => {
  // More Info: https://github.com/transitive-bullshit/chatgpt-api

  const openAiApiBaseUrl = process.env.OPENAI_API_BASE_URL

  const options: ChatGPTAPIOptions = {
    apiKey: openAiApiKey,
    completionParams: { model },
    debug: !disableDebug,
  }

  // increase max token limit if use gpt-4
  if (model.toLowerCase().includes('gpt-4')) {
    // if use 32k model
    if (model.toLowerCase().includes('32k')) {
      options.maxModelTokens = 32768
      options.maxResponseTokens = 8192
    }
    else if (/-4o-mini/.test(model.toLowerCase())) {
      options.maxModelTokens = 128000
      options.maxResponseTokens = 16384
    }
    // if use GPT-4 Turbo or GPT-4o
    else if (/-preview|-turbo|o/.test(model.toLowerCase())) {
      options.maxModelTokens = 128000
      options.maxResponseTokens = 4096
    }
    else {
      options.maxModelTokens = 8192
      options.maxResponseTokens = 2048
    }
  }
  else if (model.toLowerCase().includes('gpt-3.5')) {
    if (/16k|1106|0125/.test(model.toLowerCase())) {
      options.maxModelTokens = 16384
      options.maxResponseTokens = 4096
    }
  }

  if (isNotEmptyString(openAiApiBaseUrl)) {
    // if find /v1 in OPENAI_API_BASE_URL then use it
    if (openAiApiBaseUrl.includes('/v1'))
      options.apiBaseUrl = `${openAiApiBaseUrl}`
    else options.apiBaseUrl = `${openAiApiBaseUrl}/v1`
  }

  setupProxy(options)

  api = new ChatGPTAPI({ ...options })
  apiModel = 'ChatGPTAPI'
})()

async function chatReplyProcess(options: RequestOptions) {
  const { message, lastContext, process, systemMessage, temperature, top_p } = options
  try {
    const sendOptions: SendMessageOptions = { timeoutMs }

    if (isNotEmptyString(systemMessage))
      sendOptions.systemMessage = systemMessage
    sendOptions.completionParams = { model, temperature, top_p }

    if (lastContext != null) {
      sendOptions.parentMessageId = lastContext.parentMessageId
    }

    const response = await api.sendMessage(message, {
      ...sendOptions,
      onProgress: (partialResponse) => {
        process?.(partialResponse)
      },
    })

    return sendResponse({ type: 'Success', data: response })
  }
  catch (error: unknown) {
    const code = (error as { statusCode?: number }).statusCode
    global.console.log(error)
    if (typeof code === 'number' && Reflect.has(ErrorCodeMessage, code))
      return sendResponse({ type: 'Fail', message: ErrorCodeMessage[code] })
    return sendResponse({
      type: 'Fail',
      message: (error as Error).message ?? 'Please check the back-end console',
    })
  }
}

async function fetchUsage() {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY
  const OPENAI_API_BASE_URL = process.env.OPENAI_API_BASE_URL

  if (!isNotEmptyString(OPENAI_API_KEY))
    return Promise.resolve('-')

  const API_BASE_URL = isNotEmptyString(OPENAI_API_BASE_URL)
    ? OPENAI_API_BASE_URL
    : 'https://api.openai.com'

  const [startDate, endDate] = formatDate()

  // 每月使用量
  const urlUsage = `${API_BASE_URL}/v1/dashboard/billing/usage?start_date=${startDate}&end_date=${endDate}`

  const headers = {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
  }

  const options = {} as SetProxyOptions

  setupProxy(options)

  try {
    // 获取已使用量
    const fetchWithProxy: FetchLike = options.fetch ?? defaultFetch
    const useResponse = (await fetchWithProxy(urlUsage, { headers })) as {
      ok: boolean
      json: () => Promise<UsageResponse>
    }
    if (!useResponse.ok)
      throw new Error('获取使用量失败')
    const usageData = (await useResponse.json()) as UsageResponse
    const usage = Math.round(usageData.total_usage) / 100
    return Promise.resolve(usage ? `$${usage}` : '-')
  }
  catch (error) {
    global.console.log(error)
    return Promise.resolve('-')
  }
}

function formatDate(): string[] {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() + 1
  const lastDay = new Date(year, month, 0)
  const formattedFirstDay = `${year}-${month.toString().padStart(2, '0')}-01`
  const formattedLastDay = `${year}-${month.toString().padStart(2, '0')}-${lastDay.getDate().toString().padStart(2, '0')}`
  return [formattedFirstDay, formattedLastDay]
}

async function chatConfig() {
  const usage = await fetchUsage()
  const httpsProxy = (process.env.HTTPS_PROXY || process.env.ALL_PROXY) ?? '-'
  const socksProxy
    = process.env.SOCKS_PROXY_HOST && process.env.SOCKS_PROXY_PORT
      ? `${process.env.SOCKS_PROXY_HOST}:${process.env.SOCKS_PROXY_PORT}`
      : '-'
  return sendResponse<ModelConfig>({
    type: 'Success',
    data: { apiModel, timeoutMs, socksProxy, httpsProxy, usage },
  })
}

function setupProxy(options: SetProxyOptions) {
  const socksProxyHost = process.env.SOCKS_PROXY_HOST
  const socksProxyPort = process.env.SOCKS_PROXY_PORT
  const socksProxyUsername = process.env.SOCKS_PROXY_USERNAME
  const socksProxyPassword = process.env.SOCKS_PROXY_PASSWORD

  if (isNotEmptyString(socksProxyHost) && isNotEmptyString(socksProxyPort)) {
    const socksProxyAuth = isNotEmptyString(socksProxyUsername)
      ? `${encodeURIComponent(socksProxyUsername)}${isNotEmptyString(socksProxyPassword) ? `:${encodeURIComponent(socksProxyPassword)}` : ''}@`
      : ''
    const agent = new SocksProxyAgent(
      `socks://${socksProxyAuth}${socksProxyHost}:${socksProxyPort}`,
    )
    options.fetch = (url, init) => {
      const initWithAgent: NodeRequestInit = { ...(init as NodeRequestInit), agent }
      return fetch(url as NodeRequestInfo, initWithAgent)
    }
  }
  else if (isNotEmptyString(process.env.HTTPS_PROXY) || isNotEmptyString(process.env.ALL_PROXY)) {
    const httpsProxy = process.env.HTTPS_PROXY || process.env.ALL_PROXY
    if (httpsProxy) {
      const agent = new HttpsProxyAgent(httpsProxy)
      options.fetch = (url, init) => {
        const initWithAgent: NodeRequestInit = { ...(init as NodeRequestInit), agent }
        return fetch(url as NodeRequestInfo, initWithAgent)
      }
    }
  }
  else {
    options.fetch = (url, init) => {
      return defaultFetch(url, init)
    }
  }
}

function currentModel(): ApiModel {
  return apiModel
}

export type { ChatContext, ChatMessage }

export { chatConfig, chatReplyProcess, currentModel }
