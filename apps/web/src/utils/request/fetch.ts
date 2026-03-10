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

export interface RequestError extends Error {
  isNetworkError?: boolean
  isUpstreamUnavailable?: boolean
  response?: unknown
  statusCode?: number
}

/**
 * Constructs a RequestError and attaches optional metadata (network/upstream flags, response, and status code).
 *
 * @param message - The human-readable error message
 * @param options - Optional metadata to attach to the error:
 *   - `isNetworkError`: set to `true` if the error originated from a network failure
 *   - `isUpstreamUnavailable`: set to `true` if the upstream service appears unavailable (e.g., empty 5xx response)
 *   - `response`: the parsed response payload or raw error payload, if available
 *   - `statusCode`: the HTTP status code associated with the error, if available
 * @returns The created `RequestError` with the provided metadata properties set
 */
function createRequestError(
  message: string,
  options: {
    isNetworkError?: boolean
    isUpstreamUnavailable?: boolean
    response?: unknown
    statusCode?: number
  } = {},
): RequestError {
  const error = new Error(message) as RequestError
  error.isNetworkError = options.isNetworkError
  error.isUpstreamUnavailable = options.isUpstreamUnavailable
  error.response = options.response
  error.statusCode = options.statusCode
  return error
}

/**
 * Determines whether a value is a RequestError marked as upstream unavailable.
 *
 * @returns `true` if `error` is a `RequestError` and its `isUpstreamUnavailable` flag is `true`, `false` otherwise.
 */
export function isUpstreamUnavailableError(error: unknown): error is RequestError {
  return Boolean(
    error &&
    typeof error === 'object' &&
    'isUpstreamUnavailable' in error &&
    (error as RequestError).isUpstreamUnavailable,
  )
}

/**
 * Normalize an HTTP error response body into a structured payload.
 *
 * @param rawText - The raw response body text from the server
 * @param statusText - The HTTP status text to use when `rawText` is empty
 * @returns The parsed JSON payload when `rawText` is valid JSON; otherwise an object `{ data: null, message, status: 'Error' }` where `message` is `rawText` when present or `statusText` when not
 */
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

/**
 * Handle a non-OK fetch Response by parsing its error payload and either returning authorization errors or throwing a RequestError.
 *
 * @param response - The fetch Response to evaluate and parse
 * @returns A parsed `Response<T>` error payload when the status is 401 or 403
 * @throws RequestError - If the response indicates an upstream service failure (status >= 500 with an empty body). The thrown error will have `isUpstreamUnavailable: true` and include `statusCode`. Also throws a RequestError containing a computed error message, the parsed error payload as `response`, and `statusCode` for other error responses.
 */
async function handleErrorResponse<T>(response: globalThis.Response): Promise<Response<T>> {
  const rawText = await response.text()
  const errorPayload = parseErrorPayload(rawText, response.statusText)

  if (response.status === 401 || response.status === 403) {
    return errorPayload as Response<T>
  }

  if (response.status >= 500 && rawText.trim().length === 0) {
    throw createRequestError('Backend service is unavailable.', {
      isUpstreamUnavailable: true,
      statusCode: response.status,
    })
  }

  throw createRequestError(getErrorMessage(errorPayload, response), {
    response: errorPayload,
    statusCode: response.status,
  })
}

/**
 * Invoke the progress callback with a constructed FetchProgressEvent.
 *
 * @param onProgress - Callback to receive progress updates
 * @param loaded - Number of bytes (or units) that have been loaded so far
 * @param total - Total number of bytes (or units) expected, or `undefined` if unknown
 * @param responseText - Accumulated response text received so far
 */
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
 * Perform an HTTP fetch that supports streaming response bodies and unified error handling.
 *
 * When `onProgress` is provided and the response exposes a readable body, progress events
 * will be emitted as the body is streamed and the streaming payload will be parsed.
 *
 * @param url - The request URL (absolute or built API path)
 * @param options - Fetch RequestInit options (headers, method, body, signal, etc.)
 * @param onProgress - Optional callback invoked with download progress events for streaming responses
 * @returns The parsed response payload as a `Response<T>`
 * @throws {RequestError} On network failures (marked with `isNetworkError` and `isUpstreamUnavailable`)
 *   or when the server returns a non-OK HTTP status (see `handleErrorResponse` for details)
 */
async function fetchWithStreaming<T>(
  url: string,
  options: RequestInit,
  onProgress?: (event: FetchProgressEvent) => void,
): Promise<Response<T>> {
  let response: globalThis.Response

  try {
    response = await fetch(url, options)
  } catch (error) {
    throw createRequestError(error instanceof Error ? error.message : 'Network request failed', {
      isNetworkError: true,
      isUpstreamUnavailable: true,
    })
  }

  if (!response.ok) return handleErrorResponse<T>(response)

  // Handle streaming responses (like chat completions)
  if (onProgress && response.body) return readStreamingResponse<T>(response, onProgress)

  // Standard response handling without progress
  return response.json()
}

/**
 * Builds a RequestInit object for a fetch call using the provided method, headers, and optional abort signal.
 *
 * @param signal - Optional AbortSignal used to cancel the request
 * @returns A RequestInit configured with the given HTTP method, headers, and `signal` (if provided)
 */
function buildRequestOptions(
  method: string,
  headers: Record<string, string>,
  signal?: AbortSignal,
): RequestInit {
  return {
    method,
    headers: {
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

/**
 * Attaches the given request body to RequestInit and sets appropriate headers.
 *
 * For GET requests or when `data` is undefined/null, the requestOptions are unchanged.
 * If `data` is a FormData instance, it is assigned to `requestOptions.body` and any explicit
 * `Content-Type` header is removed so the browser can set the multipart boundary.
 * For other data values, `data` is JSON-stringified and `Content-Type: application/json` is set.
 *
 * @param requestOptions - The mutable RequestInit object to modify
 * @param method - HTTP method name (e.g., "GET", "POST")
 * @param data - Optional request payload; if FormData it is sent as-is, otherwise JSON-stringified
 */
function applyRequestBody(requestOptions: RequestInit, method: string, data?: unknown) {
  if (method === 'GET' || !data) return

  if (data instanceof FormData) {
    requestOptions.body = data
    delete (requestOptions.headers as Record<string, string>)['Content-Type']
    return
  }

  requestOptions.headers = {
    ...requestOptions.headers,
    'Content-Type': 'application/json',
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

/**
 * Creates a response handler that validates an API response and handles authorization failures.
 *
 * @template T
 * @returns A function that accepts a `Response<T>` and: returns the response when `status` is `'Success'` or when `data` is a string; if `status` is `'Unauthorized'` removes the stored auth token and reloads the page; otherwise throws an `Error` with the original response attached as `error.response`.
 * @throws Error The thrown error includes a `response` property containing the original `Response<T>`.
 */
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

/**
 * Produces an error handler that rethrows Error instances and converts non-Error values into a generic Error.
 *
 * @returns A function that takes an `unknown` `error` and throws the original `Error` if `error` is an instance of `Error`, otherwise throws a new `Error('Error')`.
 */
function createFailHandler() {
  return (error: unknown) => {
    if (error instanceof Error) {
      throw error
    }

    throw new Error('Error')
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
