/**
 * Shared validation schemas using Zod
 * Comprehensive input validation and sanitization schemas
 */

import { z } from 'zod'

// ============================================================================
// Base Validation Schemas
// ============================================================================

export const stringSchema = z.string().trim().min(1, 'Field cannot be empty')
export const optionalStringSchema = z.string().trim().optional()
export const numberSchema = z.number().min(0).max(2, 'Value must be between 0 and 2')
export const optionalNumberSchema = z.number().min(0).max(2).optional()

// ============================================================================
// Chat and Message Schemas
// ============================================================================

export const ReasoningStepSchema = z.object({
  step: z.number().int().min(1),
  thought: z.string().trim().min(1),
  confidence: z.number().min(0).max(1),
  duration: z.number().int().min(0).optional(),
})

export const ChatMessageSchema = z.object({
  id: z.string().trim().min(1).optional(),
  content: z.string().trim().min(1).optional(),
  text: z.string().trim().min(1).optional(),
  role: z.enum(['user', 'assistant', 'system']),
  timestamp: z.number().int().min(0).optional(),
  reasoning: z.array(ReasoningStepSchema).optional(),
  name: z.string().trim().optional(),
  delta: z.string().optional(),
  detail: z.unknown().optional(),
  parentMessageId: z.string().trim().optional(),
  conversationId: z.string().trim().optional(),
})

export const ChatContextSchema = z
  .object({
    conversationId: z.string().uuid().optional(),
    parentMessageId: z.string().uuid().optional(),
  })
  .optional()

export const ConversationRequestSchema = z.object({
  conversationId: z.string().uuid().optional(),
  parentMessageId: z.string().uuid().optional(),
})

export const ChatSchema = z.object({
  dateTime: z.string(),
  text: z.string(),
  inversion: z.boolean().optional(),
  error: z.boolean().optional(),
  loading: z.boolean().optional(),
  conversationOptions: ConversationRequestSchema.nullable().optional(),
  requestOptions: z.object({
    prompt: z.string(),
    options: ConversationRequestSchema.nullable().optional(),
  }),
})

export const HistorySchema = z.object({
  title: z.string(),
  isEdit: z.boolean(),
  uuid: z.number().int(),
})

export const ChatStateSchema = z.object({
  active: z.number().int().nullable(),
  usingContext: z.boolean(),
  history: z.array(HistorySchema),
  chat: z.array(
    z.object({
      uuid: z.number().int(),
      data: z.array(ChatSchema),
    }),
  ),
})

// ============================================================================
// API Request and Response Schemas
// ============================================================================

export const ApiResponseSchema = z.object({
  data: z.unknown(),
  error: z.string().optional(),
  success: z.boolean(),
})

export const RequestPropsSchema = z.object({
  prompt: z.string().trim().min(1),
  options: ChatContextSchema,
  systemMessage: z.string().trim(),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
})

export const ChatProcessRequestSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(1, 'Prompt cannot be empty')
    .max(32000, 'Prompt too long')
    .refine(val => {
      // Basic XSS prevention - check for script tags and javascript: protocols
      const dangerousPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /<iframe/gi,
        /<object/gi,
        /<embed/gi,
      ]
      return !dangerousPatterns.some(pattern => pattern.test(val))
    }, 'Invalid content detected'),
  options: ChatContextSchema,
  systemMessage: z.string().trim().max(8000, 'System message too long').optional(),
  temperature: z
    .number()
    .min(0, 'Temperature must be at least 0')
    .max(2, 'Temperature must be at most 2')
    .optional(),
  top_p: z.number().min(0, 'Top_p must be at least 0').max(1, 'Top_p must be at most 1').optional(),
})

// ============================================================================
// AI Provider Schemas
// ============================================================================

export const ChatCompletionRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1, 'At least one message is required'),
  model: z.string().trim().min(1, 'Model is required'),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  maxTokens: z.number().int().min(1).max(32000).optional(),
  stream: z.boolean().optional(),
  reasoningMode: z.boolean().optional(),
})

export const UsageInfoSchema = z.object({
  promptTokens: z.number().int().min(0),
  completionTokens: z.number().int().min(0),
  totalTokens: z.number().int().min(0),
})

export const ChatCompletionResponseSchema = z.object({
  id: z.string(),
  object: z.string(),
  created: z.number().int(),
  model: z.string(),
  choices: z.array(
    z.object({
      index: z.number().int(),
      message: ChatMessageSchema,
      finishReason: z.string(),
    }),
  ),
  usage: UsageInfoSchema.optional(),
})

export const ChatCompletionChunkSchema = z.object({
  id: z.string(),
  object: z.string(),
  created: z.number().int(),
  model: z.string(),
  choices: z.array(
    z.object({
      index: z.number().int(),
      delta: ChatMessageSchema.partial(),
      finishReason: z.string().optional(),
    }),
  ),
})

// ============================================================================
// Configuration Schemas
// ============================================================================

export const BaseProviderConfigSchema = z.object({
  provider: z.enum(['openai', 'azure']),
  defaultModel: z.string().trim().min(1),
  enableReasoning: z.boolean(),
  timeout: z.number().int().min(1000).optional(),
})

export const OpenAIConfigSchema = z.object({
  apiKey: z
    .string()
    .trim()
    .min(1, 'OpenAI API key is required')
    .refine(key => key.startsWith('sk-'), 'Invalid OpenAI API key format'),
  baseUrl: z.string().url().optional(),
  organization: z.string().trim().optional(),
})

export const AzureOpenAIConfigSchema = z.object({
  apiKey: z.string().trim().min(1, 'Azure API key is required'),
  endpoint: z.string().url('Invalid Azure endpoint URL'),
  deployment: z.string().trim().min(1, 'Azure deployment is required'),
  apiVersion: z.string().trim().min(1, 'Azure API version is required'),
  useResponsesAPI: z.boolean().optional(),
})

export const ServerConfigSchema = z.object({
  port: z.number().int().min(1).max(65535),
  host: z.string().trim().min(1),
  cors: z.object({
    origin: z.union([z.string(), z.array(z.string())]),
    credentials: z.boolean(),
  }),
})

export const SecurityConfigSchema = z.object({
  enableRateLimit: z.boolean(),
  rateLimitWindowMs: z.number().int().min(1000),
  rateLimitMaxRequests: z.number().int().min(1),
  enableCSP: z.boolean(),
  enableHSTS: z.boolean(),
  apiKeyHeader: z.string().trim().min(1),
})

export const DevelopmentConfigSchema = z.object({
  debug: z.boolean(),
  logLevel: z.enum(['error', 'warn', 'info', 'debug']),
  hotReload: z.boolean(),
})

export const AIConfigSchema = BaseProviderConfigSchema.extend({
  openai: OpenAIConfigSchema.optional(),
  azure: AzureOpenAIConfigSchema.optional(),
})

export const AppConfigurationSchema = z.object({
  server: ServerConfigSchema,
  ai: AIConfigSchema,
  security: SecurityConfigSchema,
  development: DevelopmentConfigSchema,
})

export const ModelConfigSchema = z.object({
  apiModel: z.enum(['ChatGPTAPI']).optional(),
  timeoutMs: z.number().int().min(1000).optional(),
  socksProxy: z.string().url().optional(),
  httpsProxy: z.string().url().optional(),
  usage: z.string().optional(),
})

// ============================================================================
// Authentication and Security Schemas
// ============================================================================

export const TokenVerificationSchema = z.object({
  token: z
    .string()
    .trim()
    .min(1, 'Token cannot be empty')
    .max(1000, 'Token too long')
    .refine(val => {
      // Ensure token doesn't contain dangerous characters
      const safePattern = /^[\w\-.]+$/
      return safePattern.test(val)
    }, 'Token contains invalid characters'),
})

export const AuthHeaderSchema = z.object({
  authorization: z
    .string()
    .trim()
    .min(1, 'Authorization header cannot be empty')
    .refine(val => {
      // Must start with 'Bearer ' and contain only safe characters
      const bearerPattern = /^Bearer [\w\-.]+$/
      return bearerPattern.test(val)
    }, 'Invalid authorization header format')
    .optional(),
})

// ============================================================================
// Utility Schemas
// ============================================================================

export const ConfigRequestSchema = z.object({
  model: z.string().trim().optional(),
  temperature: optionalNumberSchema,
  top_p: z.number().min(0).max(1).optional(),
  max_tokens: z.number().int().min(1).max(32000).optional(),
})

export const IdSchema = z
  .string()
  .trim()
  .min(1, 'ID cannot be empty')
  .max(100, 'ID too long')
  .refine(val => {
    // Allow alphanumeric, hyphens, and underscores only
    const safePattern = /^[\w\-]+$/
    return safePattern.test(val)
  }, 'ID contains invalid characters')

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const UUIDSchema = z.string().uuid('Invalid UUID format')

export const EmailSchema = z.string().email('Invalid email format')

export const UrlSchema = z.string().url('Invalid URL format')

// ============================================================================
// Legacy Schemas (for backward compatibility)
// ============================================================================

export const RequestOptionsSchema = z.object({
  message: z.string().trim().min(1),
  lastContext: z
    .object({
      conversationId: z.string().optional(),
      parentMessageId: z.string().optional(),
    })
    .optional(),
  process: z.function().optional(),
  systemMessage: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
})

export const UsageResponseSchema = z.object({
  total_usage: z.number().int().min(0),
})
