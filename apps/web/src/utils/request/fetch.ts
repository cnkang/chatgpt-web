import { useAuthStore } from '@/store'

/**
 * Native fetch-based HTTP client for Node.js 24+ environments
 * Replaces axios with modern native fetch API
 */

export interface FetchProgressEvent {
  loaded: number
  total?: number
  lengthComputable: boolean
  responseText?: string // For streaming compatibility with existing code
}

export interface FetchOption {
  url: string
  data?: unknown
  method?: string
  headers?: Record<string, string>
  onDownloadProgress?: (progressEvent: FetchProgressEvent) => void
  signal?: AbortSignal
  beforeRequest?: () => void
  afterRequest?: () => void
}

export interface Response<T = unknown> {
  data: T
  message: string | null
  status: string
}

function parseErrorPayload(rawText: string, statusText: string): unknown {
  if (!rawText) {
    return {
      data: null,
      message: statusText,
      status: 'Error',
    }
  }

  try {
    return JSON.parse(rawText)
  } catch {
    return {
      data: null,
      message: rawText,
      status: 'Error',
    }
  }
}

function getErrorMessage(errorPayload: unknown, response: globalThis.Response): string {
  if (typeof errorPayload === 'object' && errorPayload !== null && 'message' in errorPayload) {
    return String((errorPayload as Record<string, unknown>).message)
  }

  return `HTTP ${response.status}: ${response.statusText}`
}

async function handleErrorResponse<T>(response: globalThis.Response): Promise<Response<T>> {
  const rawText = await response.text()
  const errorPayload = parseErrorPayload(rawText, response.statusText)

  if (response.status === 401 || response.status === 403) {
    return errorPayload as Response<T>
  }

  throw new Error(getErrorMessage(errorPayload, response))
}

function emitProgress(
  onProgress: (event: FetchProgressEvent) => void,
  loaded: number,
  total: number | undefined,
  responseText: string,
) {
  onProgress({
    loaded,
    total,
    lengthComputable: total !== undefined,
    responseText,
  })
}

function parseStreamingResponseText<T>(responseText: string): Response<T> {
  try {
    return JSON.parse(responseText)
  } catch {
    return {
      data: responseText as T,
      message: null,
      status: 'Success',
    }
  }
}

async function readStreamingResponse<T>(
  response: globalThis.Response,
  onProgress: (event: FetchProgressEvent) => void,
): Promise<Response<T>> {
  const contentLength = response.headers.get('content-length')
  const total = contentLength ? Number.parseInt(contentLength, 10) : undefined
  let loaded = 0
  let responseText = ''

  const reader = response.body?.getReader()
  if (!reader) return response.json()

  const decoder = new TextDecoder()

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      responseText += chunk
      loaded += value.length
      emitProgress(onProgress, loaded, total, responseText)
    }
  } finally {
    reader.releaseLock()
  }

  return parseStreamingResponseText<T>(responseText)
}

/**
 * Create a fetch request with streaming support for chat responses
 */
async function fetchWithStreaming<T>(
  url: string,
  options: RequestInit,
  onProgress?: (event: FetchProgressEvent) => void,
): Promise<Response<T>> {
  const response = await fetch(url, options)

  if (!response.ok) return handleErrorResponse<T>(response)

  // Handle streaming responses (like chat completions)
  if (onProgress && response.body) return readStreamingResponse<T>(response, onProgress)

  // Standard response handling without progress
  return response.json()
}

function buildRequestOptions(
  method: string,
  headers: Record<string, string>,
  signal?: AbortSignal,
): RequestInit {
  return {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    signal,
  }
}

function attachAuthHeader(requestOptions: RequestInit) {
  const authStore = useAuthStore()
  if (!authStore.token) return

  requestOptions.headers = {
    ...requestOptions.headers,
    Authorization: `Bearer ${authStore.token}`,
  }
}

function applyRequestBody(requestOptions: RequestInit, method: string, data?: unknown) {
  if (method === 'GET' || !data) return

  if (data instanceof FormData) {
    requestOptions.body = data
    delete (requestOptions.headers as Record<string, string>)['Content-Type']
    return
  }

  requestOptions.body = JSON.stringify(data)
}

function buildApiUrl(url: string): string {
  const baseURL = import.meta.env.VITE_GLOB_API_URL || ''
  return url.startsWith('http') ? url : `${baseURL}${url}`
}

function appendQueryParams(url: string, data?: unknown): string {
  if (!data) return url

  const params = new URLSearchParams()
  Object.entries(data as Record<string, string>).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value))
    }
  })

  const queryString = params.toString()
  if (!queryString) return url
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}${queryString}`
}

function createSuccessHandler<T>() {
  return (res: Response<T>) => {
    const authStore = useAuthStore()

    if (res.status === 'Success' || typeof res.data === 'string') return res

    if (res.status === 'Unauthorized') {
      authStore.removeToken()
      globalThis.location.reload()
    }

    const requestError = new Error(res.message ?? 'Request failed') as Error & {
      response: Response<T>
    }
    requestError.response = res
    throw requestError
  }
}

function createFailHandler() {
  return (error: Error) => {
    throw new Error(error?.message ?? 'Error')
  }
}

/**
 * Main HTTP function using native fetch
 */
function http<T = unknown>({
  url,
  data,
  method = 'GET',
  headers = {},
  onDownloadProgress,
  signal,
  beforeRequest,
  afterRequest,
}: FetchOption): Promise<Response<T>> {
  beforeRequest?.()
  const requestOptions = buildRequestOptions(method, headers, signal)
  attachAuthHeader(requestOptions)
  applyRequestBody(requestOptions, method, data)

  const fullUrl = buildApiUrl(url)
  const finalUrl = method === 'GET' ? appendQueryParams(fullUrl, data) : fullUrl
  const successHandler = createSuccessHandler<T>()
  const failHandler = createFailHandler()

  return fetchWithStreaming<T>(finalUrl, requestOptions, onDownloadProgress)
    .then(successHandler, failHandler)
    .finally(() => afterRequest?.())
}

export function get<T = unknown>(options: FetchOption): Promise<Response<T>> {
  return http<T>({ ...options, method: 'GET' })
}

export function post<T = unknown>(options: FetchOption): Promise<Response<T>> {
  return http<T>({ ...options, method: 'POST' })
}

export function put<T = unknown>(options: FetchOption): Promise<Response<T>> {
  return http<T>({ ...options, method: 'PUT' })
}

export function del<T = unknown>(options: FetchOption): Promise<Response<T>> {
  return http<T>({ ...options, method: 'DELETE' })
}

export default { get, post, put, delete: del }
