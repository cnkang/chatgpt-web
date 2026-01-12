# Shared Package Documentation

The shared package contains common utilities, types, and configurations used across multiple packages in the ChatGPT Web monorepo.

## Package Overview

```json
{
  "name": "@chatgpt-web/shared",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./types": {
      "import": "./dist/types/index.js",
      "types": "./dist/types/index.d.ts"
    },
    "./utils": {
      "import": "./dist/utils/index.js",
      "types": "./dist/utils/index.d.ts"
    },
    "./constants": {
      "import": "./dist/constants/index.js",
      "types": "./dist/constants/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "type-check": "tsc --noEmit",
    "test": "vitest --run",
    "test:watch": "vitest"
  }
}
```

## Architecture

### Technology Stack

- **TypeScript 5.9+**: Strict type definitions
- **tsup**: Build tool for library packaging
- **Vitest 4+**: Testing framework
- **Zod 4+**: Runtime type validation

### Project Structure

```
packages/shared/src/
├── types/               # TypeScript type definitions
│   ├── api.ts          # API-related types
│   ├── chat.ts         # Chat message types
│   ├── config.ts       # Configuration types
│   ├── error.ts        # Error types
│   └── index.ts        # Type exports
├── utils/              # Utility functions
│   ├── validation.ts   # Input validation
│   ├── formatting.ts   # Data formatting
│   ├── crypto.ts       # Cryptographic utilities
│   ├── date.ts         # Date utilities
│   └── index.ts        # Utility exports
├── constants/          # Shared constants
│   ├── api.ts          # API constants
│   ├── models.ts       # AI model constants
│   ├── errors.ts       # Error codes
│   └── index.ts        # Constant exports
├── schemas/            # Zod validation schemas
│   ├── chat.ts         # Chat validation schemas
│   ├── config.ts       # Configuration schemas
│   └── index.ts        # Schema exports
└── index.ts            # Main package exports
```

## Core Types

### Chat Types

```typescript
// src/types/chat.ts
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  metadata?: ChatMessageMetadata
}

export interface ChatMessageMetadata {
  model?: string
  usage?: TokenUsage
  reasoning?: ReasoningStep[]
  finishReason?: 'stop' | 'length' | 'content_filter' | 'tool_calls'
}

export interface TokenUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

export interface ReasoningStep {
  step: number
  title: string
  content: string
  duration?: number
}

export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  model: string
  createdAt: Date
  updatedAt: Date
  metadata?: ChatSessionMetadata
}

export interface ChatSessionMetadata {
  totalTokens: number
  messageCount: number
  lastActivity: Date
  tags?: string[]
}

export interface ChatResponse {
  message: ChatMessage
  usage?: TokenUsage
  model?: string
  finish_reason?: string
  reasoning?: ReasoningStep[]
}

export interface ChatRequest {
  messages: ChatMessage[]
  model?: string
  temperature?: number
  max_tokens?: number
  stream?: boolean
}
```

### API Types

```typescript
// src/types/api.ts
export interface APIResponse<T = any> {
  data?: T
  error?: APIError
  timestamp: string
  requestId?: string
}

export interface APIError {
  code: string
  message: string
  details?: any
  statusCode: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface RateLimitInfo {
  limit: number
  remaining: number
  reset: Date
  retryAfter?: number
}

export interface HealthCheckResponse {
  status: 'ok' | 'error' | 'degraded'
  timestamp: string
  uptime: number
  version: string
  services: ServiceHealth[]
}

export interface ServiceHealth {
  name: string
  status: 'healthy' | 'unhealthy' | 'unknown'
  responseTime?: number
  lastCheck: Date
  error?: string
}
```

### Configuration Types

```typescript
// src/types/config.ts
export interface AppConfig {
  app: {
    name: string
    version: string
    environment: 'development' | 'staging' | 'production'
    port: number
    host: string
  }
  ai: AIConfig
  security: SecurityConfig
  logging: LoggingConfig
  database?: DatabaseConfig
  redis?: RedisConfig
}

export interface AIConfig {
  provider: 'openai' | 'azure'
  openai?: OpenAIConfig
  azure?: AzureOpenAIConfig
  defaultModel: string
  timeout: number
  maxRetries: number
}

export interface OpenAIConfig {
  apiKey: string
  baseURL?: string
  organization?: string
  models: string[]
}

export interface AzureOpenAIConfig {
  apiKey: string
  endpoint: string
  deployment: string
  apiVersion: string
  models: string[]
}

export interface SecurityConfig {
  authSecretKey?: string
  enableCors: boolean
  corsOrigin: string | string[]
  rateLimiting: RateLimitConfig
  encryption: EncryptionConfig
}

export interface RateLimitConfig {
  enabled: boolean
  windowMs: number
  maxRequests: number
  skipSuccessfulRequests: boolean
  skipFailedRequests: boolean
}

export interface EncryptionConfig {
  algorithm: string
  keyLength: number
  ivLength: number
}

export interface LoggingConfig {
  level: 'error' | 'warn' | 'info' | 'debug'
  format: 'json' | 'simple'
  enableConsole: boolean
  enableFile: boolean
  filePath?: string
  maxSize?: string
  maxFiles?: number
}

export interface DatabaseConfig {
  url: string
  host: string
  port: number
  database: string
  username: string
  password: string
  ssl: boolean
  poolSize: number
}

export interface RedisConfig {
  url: string
  host: string
  port: number
  password?: string
  database: number
  keyPrefix: string
}
```

### Error Types

```typescript
// src/types/error.ts
export interface ErrorInfo {
  code: string
  message: string
  statusCode: number
  timestamp: Date
  requestId?: string
  stack?: string
  context?: Record<string, any>
}

export interface ValidationErrorDetail {
  field: string
  message: string
  value?: any
  constraint?: string
}

export interface ProviderErrorInfo extends ErrorInfo {
  provider: string
  providerCode?: string
  retryable: boolean
  retryAfter?: number
}

export interface RateLimitErrorInfo extends ErrorInfo {
  limit: number
  remaining: number
  resetTime: Date
  retryAfter: number
}

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface ErrorReport {
  error: ErrorInfo
  severity: ErrorSeverity
  affectedUsers?: number
  resolution?: string
  preventionSteps?: string[]
}
```

## Utility Functions

### Validation Utilities

```typescript
// src/utils/validation.ts
import { z } from 'zod'

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function isValidURL(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

export function isValidAPIKey(apiKey: string, provider: 'openai' | 'azure'): boolean {
  switch (provider) {
    case 'openai':
      return apiKey.startsWith('sk-') && apiKey.length >= 48
    case 'azure':
      return apiKey.length >= 32
    default:
      return false
  }
}

export function sanitizeInput(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim()
}

export function validateChatMessage(message: any): message is ChatMessage {
  const schema = z.object({
    id: z.string().uuid(),
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().min(1).max(4000),
    timestamp: z.date(),
    metadata: z
      .object({
        model: z.string().optional(),
        usage: z
          .object({
            prompt_tokens: z.number(),
            completion_tokens: z.number(),
            total_tokens: z.number(),
          })
          .optional(),
        finishReason: z.enum(['stop', 'length', 'content_filter', 'tool_calls']).optional(),
      })
      .optional(),
  })

  try {
    schema.parse(message)
    return true
  } catch {
    return false
  }
}
```

### Formatting Utilities

```typescript
// src/utils/formatting.ts
export function formatTokenCount(count: number): string {
  if (count < 1000) {
    return count.toString()
  } else if (count < 1000000) {
    return `${(count / 1000).toFixed(1)}K`
  } else {
    return `${(count / 1000000).toFixed(1)}M`
  }
}

export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`
}

export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`
  } else if (ms < 3600000) {
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
  } else {
    const hours = Math.floor(ms / 3600000)
    const minutes = Math.floor((ms % 3600000) / 60000)
    return `${hours}h ${minutes}m`
  }
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}

export function truncateText(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) {
    return text
  }

  return text.substring(0, maxLength - suffix.length) + suffix
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
```

### Cryptographic Utilities

```typescript
// src/utils/crypto.ts
import { createHash, createHmac, randomBytes, createCipheriv, createDecipheriv } from 'crypto'

export function generateId(length: number = 16): string {
  return randomBytes(length).toString('hex')
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function hashString(input: string, algorithm: string = 'sha256'): string {
  return createHash(algorithm).update(input).digest('hex')
}

export function hmacString(input: string, secret: string, algorithm: string = 'sha256'): string {
  return createHmac(algorithm, secret).update(input).digest('hex')
}

export function generateSecretKey(length: number = 32): string {
  return randomBytes(length).toString('base64')
}

export function encrypt(text: string, key: string, algorithm: string = 'aes-256-gcm'): string {
  const iv = randomBytes(16)
  const cipher = createCipheriv(algorithm, Buffer.from(key, 'base64'), iv)

  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

export function decrypt(
  encryptedText: string,
  key: string,
  algorithm: string = 'aes-256-gcm',
): string {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':')

  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const decipher = createDecipheriv(algorithm, Buffer.from(key, 'base64'), iv)

  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

export function compareHash(input: string, hash: string, algorithm: string = 'sha256'): boolean {
  const inputHash = hashString(input, algorithm)
  return inputHash === hash
}
```

### Date Utilities

```typescript
// src/utils/date.ts
export function formatDate(date: Date, format: string = 'YYYY-MM-DD'): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return format
    .replace('YYYY', year.toString())
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) {
    return 'just now'
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  } else {
    return formatDate(date, 'MMM DD, YYYY')
  }
}

export function isToday(date: Date): boolean {
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

export function isYesterday(date: Date): boolean {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return date.toDateString() === yesterday.toDateString()
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function addHours(date: Date, hours: number): Date {
  const result = new Date(date)
  result.setHours(result.getHours() + hours)
  return result
}

export function startOfDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

export function endOfDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(23, 59, 59, 999)
  return result
}
```

## Constants

### API Constants

```typescript
// src/constants/api.ts
export const API_ENDPOINTS = {
  CHAT: '/api/chat',
  CHAT_STREAM: '/api/chat/stream',
  MODELS: '/api/models',
  HEALTH: '/health',
  HEALTH_DETAILED: '/health/detailed',
  PROVIDER_STATUS: '/api/provider/status',
} as const

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const

export const RATE_LIMIT_HEADERS = {
  LIMIT: 'X-RateLimit-Limit',
  REMAINING: 'X-RateLimit-Remaining',
  RESET: 'X-RateLimit-Reset',
  RETRY_AFTER: 'Retry-After',
} as const

export const CONTENT_TYPES = {
  JSON: 'application/json',
  TEXT: 'text/plain',
  HTML: 'text/html',
  STREAM: 'text/event-stream',
  FORM: 'application/x-www-form-urlencoded',
  MULTIPART: 'multipart/form-data',
} as const
```

### Model Constants

```typescript
// src/constants/models.ts
export const OPENAI_MODELS = {
  GPT_4O: 'gpt-4o',
  GPT_4O_MINI: 'gpt-4o-mini',
  GPT_4_TURBO: 'gpt-4-turbo',
  GPT_4: 'gpt-4',
  GPT_3_5_TURBO: 'gpt-3.5-turbo',
  O1_PREVIEW: 'o1-preview',
  O1_MINI: 'o1-mini',
} as const

export const AZURE_MODELS = {
  GPT_4O: 'gpt-4o',
  GPT_4: 'gpt-4',
  GPT_35_TURBO: 'gpt-35-turbo',
} as const

export const REASONING_MODELS = [OPENAI_MODELS.O1_PREVIEW, OPENAI_MODELS.O1_MINI] as const

export const MODEL_LIMITS = {
  [OPENAI_MODELS.GPT_4O]: {
    maxTokens: 128000,
    contextWindow: 128000,
    costPer1kTokens: { input: 0.005, output: 0.015 },
  },
  [OPENAI_MODELS.GPT_4O_MINI]: {
    maxTokens: 128000,
    contextWindow: 128000,
    costPer1kTokens: { input: 0.00015, output: 0.0006 },
  },
  [OPENAI_MODELS.O1_PREVIEW]: {
    maxTokens: 32768,
    contextWindow: 128000,
    costPer1kTokens: { input: 0.015, output: 0.06 },
  },
  [OPENAI_MODELS.O1_MINI]: {
    maxTokens: 65536,
    contextWindow: 128000,
    costPer1kTokens: { input: 0.003, output: 0.012 },
  },
} as const

export const DEFAULT_MODEL = OPENAI_MODELS.GPT_4O
export const DEFAULT_REASONING_MODEL = OPENAI_MODELS.O1_PREVIEW
```

### Error Constants

```typescript
// src/constants/errors.ts
export const ERROR_CODES = {
  // General errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',

  // Authentication errors
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // Rate limiting errors
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',

  // Provider errors
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
  PROVIDER_TIMEOUT: 'PROVIDER_TIMEOUT',
  INVALID_API_KEY: 'INVALID_API_KEY',

  // Request errors
  INVALID_REQUEST: 'INVALID_REQUEST',
  MISSING_PARAMETER: 'MISSING_PARAMETER',
  INVALID_PARAMETER: 'INVALID_PARAMETER',
  REQUEST_TOO_LARGE: 'REQUEST_TOO_LARGE',

  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  CONNECTION_ERROR: 'CONNECTION_ERROR',
} as const

export const ERROR_MESSAGES = {
  [ERROR_CODES.INTERNAL_ERROR]: 'An internal server error occurred',
  [ERROR_CODES.VALIDATION_ERROR]: 'Request validation failed',
  [ERROR_CODES.NOT_FOUND]: 'Resource not found',
  [ERROR_CODES.UNAUTHORIZED]: 'Authentication required',
  [ERROR_CODES.FORBIDDEN]: 'Access forbidden',
  [ERROR_CODES.AUTHENTICATION_ERROR]: 'Authentication failed',
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'Rate limit exceeded',
  [ERROR_CODES.PROVIDER_ERROR]: 'AI provider error',
  [ERROR_CODES.PROVIDER_UNAVAILABLE]: 'AI provider temporarily unavailable',
  [ERROR_CODES.TIMEOUT_ERROR]: 'Request timeout',
  [ERROR_CODES.NETWORK_ERROR]: 'Network error occurred',
} as const

export const RETRYABLE_ERRORS = [
  ERROR_CODES.PROVIDER_UNAVAILABLE,
  ERROR_CODES.TIMEOUT_ERROR,
  ERROR_CODES.NETWORK_ERROR,
  ERROR_CODES.CONNECTION_ERROR,
] as const
```

## Validation Schemas

### Chat Schemas

```typescript
// src/schemas/chat.ts
import { z } from 'zod'

export const chatMessageSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1).max(4000),
  timestamp: z.date(),
  metadata: z
    .object({
      model: z.string().optional(),
      usage: z
        .object({
          prompt_tokens: z.number().min(0),
          completion_tokens: z.number().min(0),
          total_tokens: z.number().min(0),
        })
        .optional(),
      finishReason: z.enum(['stop', 'length', 'content_filter', 'tool_calls']).optional(),
    })
    .optional(),
})

export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().min(1).max(4000).optional(),
  stream: z.boolean().optional(),
})

export const chatSessionSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(100),
  messages: z.array(chatMessageSchema),
  model: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  metadata: z
    .object({
      totalTokens: z.number().min(0),
      messageCount: z.number().min(0),
      lastActivity: z.date(),
      tags: z.array(z.string()).optional(),
    })
    .optional(),
})
```

### Configuration Schemas

```typescript
// src/schemas/config.ts
import { z } from 'zod'

export const openaiConfigSchema = z.object({
  apiKey: z.string().min(1),
  baseURL: z.string().url().optional(),
  organization: z.string().optional(),
  models: z.array(z.string()).optional(),
})

export const azureConfigSchema = z.object({
  apiKey: z.string().min(1),
  endpoint: z.string().url(),
  deployment: z.string().min(1),
  apiVersion: z.string().min(1),
  models: z.array(z.string()).optional(),
})

export const aiConfigSchema = z.object({
  provider: z.enum(['openai', 'azure']),
  openai: openaiConfigSchema.optional(),
  azure: azureConfigSchema.optional(),
  defaultModel: z.string(),
  timeout: z.number().min(1000).max(300000),
  maxRetries: z.number().min(0).max(10),
})

export const appConfigSchema = z.object({
  app: z.object({
    name: z.string(),
    version: z.string(),
    environment: z.enum(['development', 'staging', 'production']),
    port: z.number().min(1).max(65535),
    host: z.string(),
  }),
  ai: aiConfigSchema,
  security: z.object({
    authSecretKey: z.string().optional(),
    enableCors: z.boolean(),
    corsOrigin: z.union([z.string(), z.array(z.string())]),
    rateLimiting: z.object({
      enabled: z.boolean(),
      windowMs: z.number().min(1000),
      maxRequests: z.number().min(1),
      skipSuccessfulRequests: z.boolean(),
      skipFailedRequests: z.boolean(),
    }),
  }),
})
```

## Build Configuration

### tsup Configuration

```typescript
// tsup.config.ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/types/index.ts',
    'src/utils/index.ts',
    'src/constants/index.ts',
    'src/schemas/index.ts',
  ],
  format: ['esm', 'cjs'],
  target: 'node18',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  dts: true,
  splitting: false,
  treeshake: true,
  minify: false,
  external: ['zod', 'crypto'],
})
```

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Node",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

## Testing

### Unit Tests

```typescript
// src/__tests__/utils/validation.test.ts
import { describe, it, expect } from 'vitest'
import { isValidEmail, isValidURL, sanitizeInput, validateChatMessage } from '../utils/validation'

describe('Validation Utils', () => {
  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true)
    })

    it('should reject invalid email addresses', () => {
      expect(isValidEmail('invalid-email')).toBe(false)
      expect(isValidEmail('@domain.com')).toBe(false)
      expect(isValidEmail('user@')).toBe(false)
    })
  })

  describe('sanitizeInput', () => {
    it('should remove script tags', () => {
      const input = '<script>alert("xss")</script>Hello'
      expect(sanitizeInput(input)).toBe('Hello')
    })

    it('should remove HTML tags', () => {
      const input = '<div>Hello <b>world</b></div>'
      expect(sanitizeInput(input)).toBe('Hello world')
    })
  })
})
```

## Usage Examples

### Using Shared Types

```typescript
// In web package
import type { ChatMessage, ChatSession } from '@chatgpt-web/shared/types'

const message: ChatMessage = {
  id: generateUUID(),
  role: 'user',
  content: 'Hello',
  timestamp: new Date(),
}
```

### Using Shared Utils

```typescript
// In API package
import { validateChatMessage, sanitizeInput } from '@chatgpt-web/shared/utils'

const isValid = validateChatMessage(message)
const cleanContent = sanitizeInput(userInput)
```

### Using Shared Constants

```typescript
// In both packages
import { OPENAI_MODELS, ERROR_CODES } from '@chatgpt-web/shared/constants'

const model = OPENAI_MODELS.GPT_4O
const errorCode = ERROR_CODES.RATE_LIMIT_EXCEEDED
```

The shared package provides a solid foundation of common functionality, ensuring consistency and reducing code duplication across the ChatGPT Web monorepo.
