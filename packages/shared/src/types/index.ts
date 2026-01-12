/**
 * Shared TypeScript types and interfaces
 * Common types used across frontend and backend applications
 */

// ============================================================================
// Chat and Conversation Types
// ============================================================================

export interface ChatMessage {
  id?: string
  content?: string
  text?: string
  role: 'user' | 'assistant' | 'system'
  timestamp?: number
  reasoning?: ReasoningStep[]
  name?: string
  delta?: string
  detail?: unknown
  parentMessageId?: string
  conversationId?: string
}

export interface ReasoningStep {
  step: number
  thought: string
  confidence: number
  duration?: number
}

export interface ChatContext {
  conversationId?: string
  parentMessageId?: string
}

export interface ConversationRequest {
  conversationId?: string
  parentMessageId?: string
}

export interface ConversationResponse {
  conversationId: string
  detail: {
    choices: { finish_reason: string; index: number; logprobs: unknown; text: string }[]
    created: number
    id: string
    model: string
    object: string
    usage: { completion_tokens: number; prompt_tokens: number; total_tokens: number }
  }
  id: string
  parentMessageId: string
  role: string
  text: string
}

// Frontend-specific chat types
export interface Chat {
  dateTime: string
  text: string
  inversion?: boolean
  error?: boolean
  loading?: boolean
  conversationOptions?: ConversationRequest | null
  requestOptions: { prompt: string; options?: ConversationRequest | null }
}

export interface History {
  title: string
  isEdit: boolean
  uuid: number
}

export interface ChatState {
  active: number | null
  usingContext: boolean
  history: History[]
  chat: { uuid: number; data: Chat[] }[]
}

// ============================================================================
// API and Request Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  data: T
  error?: string
  success: boolean
}

export interface RequestProps {
  prompt: string
  options?: ChatContext
  systemMessage: string
  temperature?: number
  top_p?: number
}

export interface ChatProcessRequest {
  prompt: string
  options?: ChatContext
  systemMessage?: string
  temperature?: number
  top_p?: number
}

// ============================================================================
// AI Provider Types
// ============================================================================

export interface ChatCompletionRequest {
  messages: ChatMessage[]
  model: string
  temperature?: number
  topP?: number
  maxTokens?: number
  stream?: boolean
  reasoningMode?: boolean
}

export interface ChatCompletionResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: ChatMessage
    finishReason: string
  }>
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface ChatCompletionChunk {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    delta: Partial<ChatMessage>
    finishReason?: string
  }>
}

export interface UsageInfo {
  totalTokens: number
  promptTokens: number
  completionTokens: number
  cost?: number
}

export interface ProviderError extends Error {
  code?: string
  statusCode?: number
  provider: string
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface BaseProviderConfig {
  provider: 'openai' | 'azure'
  defaultModel: string
  enableReasoning: boolean
  timeout?: number
}

export interface OpenAIConfig {
  apiKey: string
  baseUrl?: string
  organization?: string
}

export interface AzureOpenAIConfig {
  apiKey: string
  endpoint: string
  deployment: string
  apiVersion: string
  useResponsesAPI?: boolean
}

export interface ServerConfig {
  port: number
  host: string
  cors: {
    origin: string | string[]
    credentials: boolean
  }
}

export interface SecurityConfig {
  enableRateLimit: boolean
  rateLimitWindowMs: number
  rateLimitMaxRequests: number
  enableCSP: boolean
  enableHSTS: boolean
  apiKeyHeader: string
}

export interface DevelopmentConfig {
  debug: boolean
  logLevel: 'error' | 'warn' | 'info' | 'debug'
  hotReload: boolean
}

export interface AIConfig extends BaseProviderConfig {
  openai?: OpenAIConfig
  azure?: AzureOpenAIConfig
}

export interface AppConfiguration {
  server: ServerConfig
  ai: AIConfig
  security: SecurityConfig
  development: DevelopmentConfig
}

export interface ModelConfig {
  apiModel?: ApiModel
  timeoutMs?: number
  socksProxy?: string
  httpsProxy?: string
  usage?: string
}

export type ApiModel = 'ChatGPTAPI' | 'AzureOpenAI' | undefined

// ============================================================================
// Utility Types
// ============================================================================

export interface TokenVerificationRequest {
  token: string
}

export interface ConfigRequest {
  model?: string
  temperature?: number
  top_p?: number
  max_tokens?: number
}

export interface AuthHeader {
  authorization?: string
}

export interface PaginationQuery {
  page: number
  limit: number
}

// ============================================================================
// Legacy Types (for backward compatibility)
// ============================================================================

export interface RequestOptions {
  message: string
  lastContext?: { conversationId?: string; parentMessageId?: string }
  process?: (chat: ChatMessage) => void
  systemMessage?: string
  temperature?: number
  top_p?: number
}

export interface UsageResponse {
  total_usage: number
}

export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<unknown>

export interface SetProxyOptions {
  fetch?: FetchLike
}
