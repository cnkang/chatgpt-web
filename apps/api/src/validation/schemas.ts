/**
 * Zod validation schemas for API endpoints
 * Provides comprehensive input validation and sanitization
 */

import {
  AuthHeaderSchema,
  ChatContextSchema,
  ChatProcessRequestSchema,
  ConfigRequestSchema,
  IdSchema,
  PaginationSchema,
  TokenVerificationSchema,
  numberSchema,
  optionalNumberSchema,
  optionalStringSchema,
  stringSchema,
} from '@chatgpt-web/shared'
import { z } from 'zod'

// Re-export schemas for backward compatibility
export const chatProcessRequestSchema = ChatProcessRequestSchema
export const tokenVerificationSchema = TokenVerificationSchema
export const configRequestSchema = ConfigRequestSchema
export const chatContextSchema = ChatContextSchema
export const authHeaderSchema = AuthHeaderSchema
export const paginationSchema = PaginationSchema
export const idSchema = IdSchema

// Re-export base schemas
export { numberSchema, optionalNumberSchema, optionalStringSchema, stringSchema }

// Export type definitions for TypeScript
export type ChatProcessRequest = z.infer<typeof ChatProcessRequestSchema>
export type TokenVerificationRequest = z.infer<typeof TokenVerificationSchema>
export type ConfigRequest = z.infer<typeof ConfigRequestSchema>
export type ChatContext = z.infer<typeof ChatContextSchema>
export type AuthHeader = z.infer<typeof AuthHeaderSchema>
export type PaginationQuery = z.infer<typeof PaginationSchema>
