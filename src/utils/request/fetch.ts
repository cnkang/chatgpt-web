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
		throw new Error(`HTTP ${response.status}: ${response.statusText}`)
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
				// eslint-disable-next-line no-await-in-loop
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
				return { data: responseText, message: null, status: 'Success' } as Response<T>
			}
		} finally {
			reader.releaseLock()
		}
	}

	// Standard response handling without progress
	return response.json()
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
	const successHandler = (res: Response<T>) => {
		const authStore = useAuthStore()

		if (res.status === 'Success' || typeof res.data === 'string') return res

		if (res.status === 'Unauthorized') {
			authStore.removeToken()
			window.location.reload()
		}

		return Promise.reject(res)
	}

	const failHandler = (error: Error) => {
		afterRequest?.()
		throw new Error(error?.message || 'Error')
	}

	beforeRequest?.()

	// Prepare request options
	const requestOptions: RequestInit = {
		method,
		headers: {
			'Content-Type': 'application/json',
			...headers,
		},
		signal,
	}

	// Add authentication header if token exists
	const authStore = useAuthStore()
	if (authStore.token) {
		requestOptions.headers = {
			...requestOptions.headers,
			Authorization: `Bearer ${authStore.token}`,
		}
	}

	// Build full URL
	const baseURL = import.meta.env.VITE_GLOB_API_URL || ''
	const fullUrl = url.startsWith('http') ? url : `${baseURL}${url}`

	// Handle request body for non-GET methods
	if (method !== 'GET' && data) {
		if (data instanceof FormData) {
			requestOptions.body = data
			// Remove Content-Type header for FormData (browser will set it with boundary)
			delete (requestOptions.headers as Record<string, string>)['Content-Type']
		} else {
			requestOptions.body = JSON.stringify(data)
		}
	}

	// Handle GET parameters
	if (method === 'GET' && data) {
		const params = new URLSearchParams()
		Object.entries(data as Record<string, string>).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				params.append(key, String(value))
			}
		})
		const queryString = params.toString()
		const separator = fullUrl.includes('?') ? '&' : '?'
		const urlWithParams = queryString ? `${fullUrl}${separator}${queryString}` : fullUrl

		return fetchWithStreaming<T>(urlWithParams, requestOptions, onDownloadProgress)
			.then(successHandler, failHandler)
			.finally(() => afterRequest?.())
	}

	return fetchWithStreaming<T>(fullUrl, requestOptions, onDownloadProgress)
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
