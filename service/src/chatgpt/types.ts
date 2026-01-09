import type { ChatMessage } from 'chatgpt'

export interface RequestOptions {
	message: string
	lastContext?: { conversationId?: string; parentMessageId?: string }
	process?: (chat: ChatMessage) => void
	systemMessage?: string
	temperature?: number
	top_p?: number
}

export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<unknown>

export interface SetProxyOptions {
	fetch?: FetchLike
}

export interface UsageResponse {
	total_usage: number
}
