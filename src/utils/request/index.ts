import type { FetchProgressEvent } from './fetch'
import { get as fetchGet, post as fetchPost } from './fetch'

export interface HttpOption {
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

export function get<T = unknown>(options: HttpOption): Promise<Response<T>> {
	return fetchGet<T>(options)
}

export function post<T = unknown>(options: HttpOption): Promise<Response<T>> {
	return fetchPost<T>(options)
}

export default post
