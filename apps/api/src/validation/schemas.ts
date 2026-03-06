/**
 * Zod validation schemas for API endpoints
 * Provides comprehensive input validation and sanitization
 */

import type {
  AuthHeaderSchema,
  ChatContextSchema,
  ChatProcessRequestSchema,
  ConfigRequestSchema,
  PaginationSchema,
  TokenVerificationSchema,
} from '@chatgpt-web/shared'
import type { z } from 'zod'

// Re-export schemas for backward compatibility
export {
  AuthHeaderSchema as authHeaderSchema,
  ChatContextSchema as chatContextSchema,
  ChatProcessRequestSchema as chatProcessRequestSchema,
  ConfigRequestSchema as configRequestSchema,
  IdSchema as idSchema,
  PaginationSchema as paginationSchema,
  TokenVerificationSchema as tokenVerificationSchema,
  numberSchema,
  optionalNumberSchema,
  optionalStringSchema,
  stringSchema,
} from '@chatgpt-web/shared'

// Export type definitions for TypeScript
export type ChatProcessRequest = z.infer<typeof ChatProcessRequestSchema>
export type TokenVerificationRequest = z.infer<typeof TokenVerificationSchema>
export type ConfigRequest = z.infer<typeof ConfigRequestSchema>
export type ChatContext = z.infer<typeof ChatContextSchema>
export type AuthHeader = z.infer<typeof AuthHeaderSchema>
export type PaginationQuery = z.infer<typeof PaginationSchema>
