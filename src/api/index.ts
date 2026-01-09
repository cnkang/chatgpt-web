import { useAuthStore, useSettingStore } from '@/store'
import { post } from '@/utils/request'
import type { FetchProgressEvent } from '@/utils/request/fetch'

export function fetchChatAPI<T = unknown>(
	prompt: string,
	options?: { conversationId?: string; parentMessageId?: string },
	signal?: AbortSignal,
) {
	return post<T>({
		url: '/chat',
		data: { prompt, options },
		signal,
	})
}

export function fetchChatConfig<T = unknown>() {
	return post<T>({
		url: '/config',
	})
}

export function fetchChatAPIProcess<T = unknown>(params: {
	prompt: string
	options?: { conversationId?: string; parentMessageId?: string }
	signal?: AbortSignal
	onDownloadProgress?: (progressEvent: FetchProgressEvent) => void
}) {
	const settingStore = useSettingStore()
	const authStore = useAuthStore()

	let data: Record<string, unknown> = {
		prompt: params.prompt,
		options: params.options,
	}

	if (authStore.isChatGPTAPI) {
		data = {
			...data,
			systemMessage: settingStore.systemMessage,
			temperature: settingStore.temperature,
			top_p: settingStore.top_p,
		}
	}

	return post<T>({
		url: '/chat-process',
		data,
		signal: params.signal,
		onDownloadProgress: params.onDownloadProgress,
	})
}

export function fetchSession<T>() {
	return post<T>({
		url: '/session',
	})
}

export function fetchVerify<T>(token: string) {
	return post<T>({
		url: '/verify',
		data: { token },
	})
}
