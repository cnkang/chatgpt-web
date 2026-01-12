/**
 * Main exports for @chatgpt-web/shared package
 * Provides tree-shaking friendly exports for all shared functionality
 */

// Export all types
export * from './types/index'

// Export all utilities
export * from './utils/index'

// Export validation schemas (but not the duplicate types)
export {
  AIConfigSchema,
  // API schemas
  ApiResponseSchema,
  AppConfigurationSchema,
  AuthHeaderSchema,
  AzureOpenAIConfigSchema,
  // Configuration schemas
  BaseProviderConfigSchema,
  ChatCompletionChunkSchema,
  // AI Provider schemas
  ChatCompletionRequestSchema,
  ChatCompletionResponseSchema,
  ChatContextSchema,
  ChatMessageSchema,
  ChatProcessRequestSchema,
  ChatSchema,
  ChatStateSchema,
  // Utility schemas
  ConfigRequestSchema,
  ConversationRequestSchema,
  DevelopmentConfigSchema,
  EmailSchema,
  HistorySchema,
  IdSchema,
  ModelConfigSchema,
  numberSchema,
  OpenAIConfigSchema,
  optionalNumberSchema,
  optionalStringSchema,
  PaginationSchema,
  // Chat and message schemas
  ReasoningStepSchema,
  // Legacy schemas
  RequestOptionsSchema,
  RequestPropsSchema,
  SecurityConfigSchema,
  ServerConfigSchema,
  // Base schemas
  stringSchema,
  // Auth schemas
  TokenVerificationSchema,
  UrlSchema,
  UsageInfoSchema,
  UsageResponseSchema,
  UUIDSchema,
} from './validation/index'
