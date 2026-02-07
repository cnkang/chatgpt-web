import { useAuthStore } from '@/store'

type RequestData = Record<string, unknown>

interface ProgressTarget {
  responseText: string
}

export interface DownloadProgressEvent {
  event: {
    target: ProgressTarget
  }
}

export interface HttpOption {
  url: string
  data?: RequestData | (() => RequestData)
  method?: string
  headers?: HeadersInit
  onDownloadProgress?: (progressEvent: DownloadProgressEvent) => void
  signal?: AbortSignal
  beforeRequest?: () => void
  afterRequest?: () => void
}

export interface Response<T = any> {
  data: T
  message: string | null
  status: string
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null
}

function tryParseJSON(text: string): unknown {
  try {
    return JSON.parse(text)
  }
  catch {
    return undefined
  }
}

function isAbortError(error: unknown): boolean {
  return isRecord(error) && error.name === 'AbortError'
}

function resolveUrl(url: string): string {
  if (/^https?:\/\//.test(url))
    return url

  return `${import.meta.env.VITE_GLOB_API_URL}${url}`
}

function appendQuery(url: string, params: RequestData): string {
  const query = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined)
      return

    if (typeof value === 'string')
      query.set(key, value)
    else
      query.set(key, JSON.stringify(value))
  })

  if (!query.size)
    return url

  return `${url}${url.includes('?') ? '&' : '?'}${query.toString()}`
}

async function readAsText(
  response: globalThis.Response,
  onDownloadProgress?: (progressEvent: DownloadProgressEvent) => void,
): Promise<string> {
  if (!response.body) {
    const text = await response.text()
    onDownloadProgress?.({ event: { target: { responseText: text } } })
    return text
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let responseText = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done)
      break
    responseText += decoder.decode(value, { stream: true })
    onDownloadProgress?.({ event: { target: { responseText } } })
  }

  responseText += decoder.decode()
  return responseText
}

function lastJsonLine(text: string): Record<string, any> | null {
  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const parsed = tryParseJSON(lines[i])
    if (isRecord(parsed))
      return parsed
  }

  return null
}

function normalizeErrorMessage(errorPayload: unknown, fallback: string): string {
  if (isRecord(errorPayload) && typeof errorPayload.message === 'string' && errorPayload.message)
    return errorPayload.message
  return fallback
}

async function http<T = any>(
  { url, data, method, headers, onDownloadProgress, signal, beforeRequest, afterRequest }: HttpOption,
): Promise<Response<T>> {
  const authStore = useAuthStore()
  beforeRequest?.()

  try {
    const params = Object.assign(typeof data === 'function' ? data() : data ?? {}, {})
    const requestMethod = (method || 'GET').toUpperCase()
    const requestUrl = requestMethod === 'GET' ? appendQuery(url, params) : url

    const requestHeaders = new Headers(headers || {})
    const token = authStore.token
    if (token)
      requestHeaders.set('Authorization', `Bearer ${token}`)
    if (requestMethod !== 'GET' && !requestHeaders.has('Content-Type'))
      requestHeaders.set('Content-Type', 'application/json')

    const response = await fetch(resolveUrl(requestUrl), {
      method: requestMethod,
      headers: requestHeaders,
      body: requestMethod === 'GET' ? undefined : JSON.stringify(params),
      signal,
    })

    const responseText = await readAsText(response, onDownloadProgress)
    const parsedJson = tryParseJSON(responseText)
    const payload = parsedJson ?? responseText

    if (!response.ok) {
      const message = normalizeErrorMessage(payload, response.statusText || 'Error')
      if (response.status === 401 || (isRecord(payload) && payload.status === 'Unauthorized')) {
        authStore.removeToken()
        throw new Error(message || 'Unauthorized')
      }
      throw new Error(message)
    }

    if (typeof payload === 'string') {
      const streamLastLine = lastJsonLine(payload)
      if (streamLastLine?.status === 'Unauthorized') {
        authStore.removeToken()
        throw new Error(streamLastLine.message || 'Unauthorized')
      }
      if (streamLastLine?.status && streamLastLine.status !== 'Success')
        throw new Error(streamLastLine.message || 'Error')

      return payload as unknown as Response<T>
    }

    if (isRecord(payload) && payload.status === 'Unauthorized') {
      authStore.removeToken()
      throw new Error(payload.message || 'Unauthorized')
    }

    if (isRecord(payload) && payload.status && payload.status !== 'Success')
      throw new Error(payload.message || 'Error')

    return payload as Response<T>
  }
  catch (error) {
    if (isAbortError(error))
      throw new Error('canceled', { cause: error })

    if (error instanceof Error)
      throw error

    throw new Error('Error', { cause: error })
  }
  finally {
    afterRequest?.()
  }
}

export function get<T = any>(
  { url, data, method = 'GET', onDownloadProgress, signal, beforeRequest, afterRequest }: HttpOption,
): Promise<Response<T>> {
  return http<T>({
    url,
    method,
    data,
    onDownloadProgress,
    signal,
    beforeRequest,
    afterRequest,
  })
}

export function post<T = any>(
  { url, data, method = 'POST', headers, onDownloadProgress, signal, beforeRequest, afterRequest }: HttpOption,
): Promise<Response<T>> {
  return http<T>({
    url,
    method,
    data,
    headers,
    onDownloadProgress,
    signal,
    beforeRequest,
    afterRequest,
  })
}

export default post
