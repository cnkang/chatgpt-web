/**
 * Zod validation schemas for API endpoints
 * Provides comprehensive input validation and sanitization
 */

import { z } from 'zod'

// Base validation schemas
export const stringSchema = z.string().trim().min(1, 'Field cannot be empty')
export const optionalStringSchema = z.string().trim().optional()
export const numberSchema = z.number().min(0).max(2, 'Value must be between 0 and 2')
export const optionalNumberSchema = z.number().min(0).max(2).optional()

// Chat context schema
export const chatContextSchema = z
  .object({
    conversationId: z.string().uuid().optional(),
    parentMessageId: z.string().uuid().optional(),
  })
  .optional()

// Chat process request schema
export const chatProcessRequestSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(1, 'Prompt cannot be empty')
    .max(32000, 'Prompt too long')
    .refine((val) => {
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
  options: chatContextSchema,
  systemMessage: z.string().trim().max(8000, 'System message too long').optional(),
  temperature: z
    .number()
    .min(0, 'Temperature must be at least 0')
    .max(2, 'Temperature must be at most 2')
    .optional(),
  top_p: z.number().min(0, 'Top_p must be at least 0').max(1, 'Top_p must be at most 1').optional(),
})

// Token verification schema
export const tokenVerificationSchema = z.object({
  token: z
    .string()
    .trim()
    .min(1, 'Token cannot be empty')
    .max(1000, 'Token too long')
    .refine((val) => {
      // Ensure token doesn't contain dangerous characters
      const safePattern = /^[\w\-.]+$/
      return safePattern.test(val)
    }, 'Token contains invalid characters'),
})

// Configuration request schema (for future use)
export const configRequestSchema = z.object({
  model: z.string().trim().optional(),
  temperature: optionalNumberSchema,
  top_p: z.number().min(0).max(1).optional(),
  max_tokens: z.number().min(1).max(32000).optional(),
})

// Generic ID schema for path parameters
export const idSchema = z
  .string()
  .trim()
  .min(1, 'ID cannot be empty')
  .max(100, 'ID too long')
  .refine((val) => {
    // Allow alphanumeric, hyphens, and underscores only
    const safePattern = /^[\w\-]+$/
    return safePattern.test(val)
  }, 'ID contains invalid characters')

// Query parameter schemas
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).max(1000).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
})

// Headers validation schema
export const authHeaderSchema = z.object({
  authorization: z
    .string()
    .trim()
    .min(1, 'Authorization header cannot be empty')
    .refine((val) => {
      // Must start with 'Bearer ' and contain only safe characters
      const bearerPattern = /^Bearer [\w\-.]+$/
      return bearerPattern.test(val)
    }, 'Invalid authorization header format')
    .optional(),
})

// Export type definitions for TypeScript
export type ChatProcessRequest = z.infer<typeof chatProcessRequestSchema>
export type TokenVerificationRequest = z.infer<typeof tokenVerificationSchema>
export type ConfigRequest = z.infer<typeof configRequestSchema>
export type ChatContext = z.infer<typeof chatContextSchema>
export type AuthHeader = z.infer<typeof authHeaderSchema>
export type PaginationQuery = z.infer<typeof paginationSchema>
