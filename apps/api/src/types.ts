export interface RequestProps {
  messages: UIMessage[]
  systemMessage: string
  temperature?: number
  top_p?: number
  usingContext?: boolean
}

export interface ChatContext {
  conversationId?: string
  parentMessageId?: string
}

export interface UIMessagePart {
  type: string
  text?: string
  [key: string]: unknown
}

export interface UIMessage {
  id?: string
  role: 'user' | 'assistant' | 'system'
  parts: UIMessagePart[]
  metadata?: unknown
  [key: string]: unknown
}

export interface ModelConfig {
  apiModel?: ApiModel
  timeoutMs?: number
  socksProxy?: string
  httpsProxy?: string
  usage?: string
}

export type ApiModel = 'ChatGPTAPI' | 'AzureOpenAI' | undefined
