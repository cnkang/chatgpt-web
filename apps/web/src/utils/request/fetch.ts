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

/**
 * Create a fetch request with streaming support for chat responses
 */
async function fetchWithStreaming<T>(
  url: string,
  options: RequestInit,
  onProgress?: (event: FetchProgressEvent) => void,
): Promise<Response<T>> {
  const response = await fetch(url, options)

  if (!response.ok) {
    const rawText = await response.text()
    let errorPayload: unknown = null

    if (rawText) {
      try {
        errorPayload = JSON.parse(rawText)
      } catch {
        // Fallback to plain text payload
      }
    }

    if (!errorPayload) {
      errorPayload = {
        data: null,
        message: rawText || response.statusText,
        status: 'Error',
      }
    }

    if (response.status === 401 || response.status === 403) {
      return errorPayload as Response<T>
    }

    const message =
      typeof errorPayload === 'object' &&
      errorPayload !== null &&
      'message' in (errorPayload as Record<string, unknown>)
        ? String((errorPayload as Record<string, unknown>).message)
        : `HTTP ${response.status}: ${response.statusText}`

    throw new Error(message)
  }

  // Handle streaming responses (like chat completions)
  if (onProgress && response.body) {
    const contentLength = response.headers.get('content-length')
    const total = contentLength ? Number.parseInt(contentLength, 10) : undefined
    let loaded = 0
    let responseText = ''

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        responseText += chunk
        loaded += value.length

        // Call progress callback with accumulated response text
        onProgress({
          loaded,
          total,
          lengthComputable: total !== undefined,
          responseText,
        })
      }

      // Try to parse the final response as JSON
      try {
        return JSON.parse(responseText)
      } catch {
        // If not valid JSON, return as text response
        return {
          data: responseText,
          message: null,
          status: 'Success',
        } as Response<T>
      }
    } finally {
      reader.releaseLock()
    }
  }

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
