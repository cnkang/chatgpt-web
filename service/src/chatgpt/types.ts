import type { ChatMessage } from 'chatgpt'

export interface RequestOptions {
  message: string
  lastContext?: { conversationId?: string; parentMessageId?: string }
  process?: (chat: ChatMessage) => void
  systemMessage?: string
  temperature?: number
  top_p?: number
}

export interface SetProxyOptions {
  fetch?: typeof globalThis.fetch
}

export interface UsageResponse {
  total_usage: number
}
