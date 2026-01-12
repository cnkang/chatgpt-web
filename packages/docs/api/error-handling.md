# Error Handling Guide

This guide covers the comprehensive error handling system implemented in ChatGPT Web, including error types, handling strategies, and best practices.

## Error Handling Architecture

### Error Categories

1. **Client Errors (4xx)**: Invalid requests, authentication failures
2. **Server Errors (5xx)**: Internal server errors, external API failures
3. **Network Errors**: Connection timeouts, network unavailability
4. **Validation Errors**: Input validation failures
5. **Rate Limiting Errors**: Request rate exceeded
6. **Provider Errors**: OpenAI/Azure API specific errors

### Error Response Format

All API errors follow a consistent JSON format:

```typescript
interface ErrorResponse {
  error: string // Error type/category
  message: string // Human-readable error message
  code?: string // Specific error code
  details?: any // Additional error details
  timestamp: string // ISO timestamp
  requestId?: string // Request tracking ID
}
```

## Backend Error Handling

### Error Classes

```typescript
// service/src/utils/errors.ts
export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly isOperational: boolean

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
  ) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.isOperational = isOperational

    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR')
    this.details = details
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR')
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_ERROR')
  }
}

export class ProviderError extends AppError {
  public readonly provider: string

  constructor(message: string, provider: string, statusCode: number = 502) {
    super(message, statusCode, 'PROVIDER_ERROR')
    this.provider = provider
  }
}

export class TimeoutError extends AppError {
  constructor(message: string = 'Request timeout') {
    super(message, 408, 'TIMEOUT_ERROR')
  }
}
```

### Global Error Handler

```typescript
// service/src/middleware/error-handler.ts
import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../utils/errors'
import { logger } from '../utils/logger'

export function errorHandler(error: Error, req: Request, res: Response, next: NextFunction) {
  // Generate request ID for tracking
  const requestId = (req.headers['x-request-id'] as string) || generateRequestId()

  // Log error with context
  logger.error('Request error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId,
  })

  // Handle known application errors
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: error.code,
      message: error.message,
      details: error.details,
      timestamp: new Date().toISOString(),
      requestId,
    })
  }

  // Handle validation errors (Zod, etc.)
  if (error.name === 'ZodError') {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid request data',
      details: error.issues,
      timestamp: new Date().toISOString(),
      requestId,
    })
  }

  // Handle JSON parsing errors
  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({
      error: 'INVALID_JSON',
      message: 'Invalid JSON in request body',
      timestamp: new Date().toISOString(),
      requestId,
    })
  }

  // Handle unexpected errors
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    timestamp: new Date().toISOString(),
    requestId,
  })
}

function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}
```

### Async Error Wrapper

```typescript
// service/src/utils/async-handler.ts
import type { Request, Response, NextFunction } from 'express'

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>

export function asyncHandler(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

// Usage example
router.post(
  '/chat',
  asyncHandler(async (req, res) => {
    const result = await chatService.sendMessage(req.body.messages)
    res.json(result)
  }),
)
```

### Provider-Specific Error Handling

```typescript
// service/src/providers/openai.ts
import { ProviderError, TimeoutError } from '../utils/errors'

export class OpenAIProvider {
  async sendMessage(messages: ChatMessage[]): Promise<ChatResponse> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        await this.handleAPIError(response)
      }

      return await response.json()
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new TimeoutError('OpenAI API request timeout')
      }

      if (error instanceof ProviderError) {
        throw error
      }

      throw new ProviderError(`OpenAI API error: ${error.message}`, 'openai')
    }
  }

  private async handleAPIError(response: Response): Promise<never> {
    const errorData = await response.json().catch(() => ({}))

    switch (response.status) {
      case 400:
        throw new ProviderError(
          `Invalid request: ${errorData.error?.message || 'Bad request'}`,
          'openai',
          400,
        )
      case 401:
        throw new ProviderError('Invalid API key or authentication failed', 'openai', 401)
      case 403:
        throw new ProviderError('Access forbidden - check your API key permissions', 'openai', 403)
      case 429:
        throw new ProviderError('Rate limit exceeded - please try again later', 'openai', 429)
      case 500:
      case 502:
      case 503:
        throw new ProviderError('OpenAI service temporarily unavailable', 'openai', response.status)
      default:
        throw new ProviderError(
          `OpenAI API error: ${response.status} ${response.statusText}`,
          'openai',
          response.status,
        )
    }
  }
}
```

### Retry Logic with Error Handling

```typescript
// service/src/utils/retry.ts
import { logger } from './logger'

interface RetryOptions {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  exponentialBackoff: boolean
  jitter: boolean
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    exponentialBackoff = true,
    jitter = true,
  } = options

  let lastError: Error

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error

      // Don't retry on certain error types
      if (
        error instanceof AuthenticationError ||
        error instanceof ValidationError ||
        (error instanceof ProviderError && error.statusCode < 500)
      ) {
        throw error
      }

      if (attempt === maxAttempts) {
        logger.error(`Operation failed after ${maxAttempts} attempts`, {
          error: lastError.message,
          attempts: maxAttempts,
        })
        throw lastError
      }

      // Calculate delay
      let delay = exponentialBackoff ? baseDelay * Math.pow(2, attempt - 1) : baseDelay

      delay = Math.min(delay, maxDelay)

      if (jitter) {
        delay = delay * (0.5 + Math.random() * 0.5)
      }

      logger.warn(`Operation failed, retrying in ${delay}ms`, {
        error: lastError.message,
        attempt,
        maxAttempts,
        delay,
      })

      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}
```

## Frontend Error Handling

### Error Store

```typescript
// src/store/modules/error.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

interface ErrorInfo {
  id: string
  type: 'error' | 'warning' | 'info'
  title: string
  message: string
  timestamp: Date
  details?: any
  dismissed: boolean
}

export const useErrorStore = defineStore('error', () => {
  const errors = ref<ErrorInfo[]>([])

  function addError(error: Partial<ErrorInfo>) {
    const errorInfo: ErrorInfo = {
      id: generateId(),
      type: 'error',
      title: 'Error',
      message: 'An error occurred',
      timestamp: new Date(),
      dismissed: false,
      ...error,
    }

    errors.value.unshift(errorInfo)

    // Auto-dismiss after 10 seconds for non-critical errors
    if (errorInfo.type !== 'error') {
      setTimeout(() => {
        dismissError(errorInfo.id)
      }, 10000)
    }
  }

  function dismissError(id: string) {
    const error = errors.value.find(e => e.id === id)
    if (error) {
      error.dismissed = true
    }
  }

  function clearErrors() {
    errors.value = []
  }

  const activeErrors = computed(() => errors.value.filter(e => !e.dismissed))

  return {
    errors: readonly(errors),
    activeErrors,
    addError,
    dismissError,
    clearErrors,
  }
})

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}
```

### API Error Handler

```typescript
// src/utils/error-handler.ts
import { useErrorStore } from '@/store/modules/error'

export interface APIError {
  error: string
  message: string
  code?: string
  details?: any
  timestamp: string
  requestId?: string
}

export class ErrorHandler {
  private errorStore = useErrorStore()

  handleAPIError(error: APIError, context?: string) {
    const errorMap = {
      AUTHENTICATION_ERROR: {
        title: 'Authentication Failed',
        message: 'Please check your credentials and try again',
        type: 'error' as const,
      },
      VALIDATION_ERROR: {
        title: 'Invalid Input',
        message: 'Please check your input and try again',
        type: 'warning' as const,
      },
      RATE_LIMIT_ERROR: {
        title: 'Rate Limit Exceeded',
        message: 'Too many requests. Please wait before trying again',
        type: 'warning' as const,
      },
      PROVIDER_ERROR: {
        title: 'Service Unavailable',
        message: 'The AI service is temporarily unavailable',
        type: 'error' as const,
      },
      TIMEOUT_ERROR: {
        title: 'Request Timeout',
        message: 'The request took too long to complete',
        type: 'warning' as const,
      },
      INTERNAL_ERROR: {
        title: 'Server Error',
        message: 'An internal server error occurred',
        type: 'error' as const,
      },
    }

    const errorInfo = errorMap[error.error] || {
      title: 'Unknown Error',
      message: error.message || 'An unknown error occurred',
      type: 'error' as const,
    }

    this.errorStore.addError({
      ...errorInfo,
      message: context ? `${context}: ${errorInfo.message}` : errorInfo.message,
      details: {
        code: error.code,
        requestId: error.requestId,
        timestamp: error.timestamp,
        originalError: error,
      },
    })
  }

  handleNetworkError(error: Error, context?: string) {
    this.errorStore.addError({
      type: 'error',
      title: 'Network Error',
      message: context ? `${context}: Unable to connect to server` : 'Unable to connect to server',
      details: {
        originalError: error.message,
      },
    })
  }

  handleUnexpectedError(error: Error, context?: string) {
    console.error('Unexpected error:', error)

    this.errorStore.addError({
      type: 'error',
      title: 'Unexpected Error',
      message: context
        ? `${context}: An unexpected error occurred`
        : 'An unexpected error occurred',
      details: {
        originalError: error.message,
        stack: error.stack,
      },
    })
  }
}

export const errorHandler = new ErrorHandler()
```

### API Client with Error Handling

```typescript
// src/api/client.ts
import { errorHandler } from '@/utils/error-handler'

export class APIClient {
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const response = await fetch(`/api${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: 'UNKNOWN_ERROR',
          message: `HTTP ${response.status}: ${response.statusText}`,
        }))

        errorHandler.handleAPIError(errorData, `API ${endpoint}`)
        throw new Error(errorData.message)
      }

      return await response.json()
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorHandler.handleNetworkError(error, `API ${endpoint}`)
      } else if (!(error.message in ['Authentication Failed', 'Invalid Input'])) {
        errorHandler.handleUnexpectedError(error as Error, `API ${endpoint}`)
      }

      throw error
    }
  }

  async sendMessage(messages: ChatMessage[]): Promise<ChatResponse> {
    return this.request<ChatResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify({ messages }),
    })
  }
}
```

### Error Display Component

```vue
<!-- src/components/ErrorDisplay.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useErrorStore } from '@/store/modules/error'
import { NAlert, NButton, NSpace } from 'naive-ui'

const errorStore = useErrorStore()

const sortedErrors = computed(() =>
  errorStore.activeErrors.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
)

function getAlertType(type: string) {
  switch (type) {
    case 'error':
      return 'error'
    case 'warning':
      return 'warning'
    case 'info':
      return 'info'
    default:
      return 'error'
  }
}

function formatTimestamp(timestamp: Date) {
  return timestamp.toLocaleTimeString()
}
</script>

<template>
  <div class="error-display">
    <TransitionGroup name="error" tag="div">
      <NAlert
        v-for="error in sortedErrors"
        :key="error.id"
        :type="getAlertType(error.type)"
        :title="error.title"
        :closable="true"
        class="error-alert"
        @close="errorStore.dismissError(error.id)"
      >
        <div class="error-content">
          <p class="error-message">{{ error.message }}</p>
          <div class="error-meta">
            <span class="error-time">{{ formatTimestamp(error.timestamp) }}</span>
            <NButton v-if="error.details" text size="small" @click="showDetails(error)">
              Show Details
            </NButton>
          </div>
        </div>
      </NAlert>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.error-display {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 9999;
  max-width: 400px;
}

.error-alert {
  margin-bottom: 0.5rem;
}

.error-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.error-message {
  margin: 0;
  font-size: 0.9rem;
}

.error-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  opacity: 0.7;
}

.error-enter-active,
.error-leave-active {
  transition: all 0.3s ease;
}

.error-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.error-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
```

## Error Recovery Strategies

### Circuit Breaker Pattern

```typescript
// service/src/utils/circuit-breaker.ts
export class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'

  constructor(
    private failureThreshold: number = 5,
    private recoveryTimeout: number = 60000,
    private monitoringPeriod: number = 10000,
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN'
      } else {
        throw new Error('Circuit breaker is OPEN')
      }
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess() {
    this.failures = 0
    this.state = 'CLOSED'
  }

  private onFailure() {
    this.failures++
    this.lastFailureTime = Date.now()

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN'
    }
  }
}
```

### Graceful Degradation

```typescript
// service/src/services/chat-service.ts
export class ChatService {
  private circuitBreaker = new CircuitBreaker()

  async sendMessage(messages: ChatMessage[]): Promise<ChatResponse> {
    try {
      return await this.circuitBreaker.execute(() => this.primaryProvider.sendMessage(messages))
    } catch (error) {
      logger.warn('Primary provider failed, trying fallback', {
        error: error.message,
      })

      try {
        return await this.fallbackProvider.sendMessage(messages)
      } catch (fallbackError) {
        logger.error('Both providers failed', {
          primaryError: error.message,
          fallbackError: fallbackError.message,
        })

        // Return cached response or error message
        return this.getGracefulResponse(messages)
      }
    }
  }

  private getGracefulResponse(messages: ChatMessage[]): ChatResponse {
    return {
      message: {
        role: 'assistant',
        content:
          "I apologize, but I'm currently experiencing technical difficulties. Please try again in a few moments.",
      },
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    }
  }
}
```

## Monitoring and Alerting

### Error Metrics

```typescript
// service/src/utils/metrics.ts
import { Counter, Histogram } from 'prom-client'

export const errorCounter = new Counter({
  name: 'chatgpt_web_errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'code', 'endpoint'],
})

export const errorDuration = new Histogram({
  name: 'chatgpt_web_error_duration_seconds',
  help: 'Time spent handling errors',
  labelNames: ['type', 'code'],
})

// Usage in error handler
errorCounter.inc({
  type: error.constructor.name,
  code: error.code || 'UNKNOWN',
  endpoint: req.path,
})
```

### Error Reporting

```typescript
// service/src/utils/error-reporter.ts
import * as Sentry from '@sentry/node'

export class ErrorReporter {
  static init() {
    if (process.env.SENTRY_DSN) {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV,
        tracesSampleRate: 0.1,
      })
    }
  }

  static reportError(error: Error, context?: any) {
    console.error('Error reported:', error.message, context)

    if (process.env.SENTRY_DSN) {
      Sentry.captureException(error, {
        extra: context,
      })
    }

    // Send to custom logging service
    if (process.env.ERROR_WEBHOOK_URL) {
      this.sendToWebhook(error, context)
    }
  }

  private static async sendToWebhook(error: Error, context?: any) {
    try {
      await fetch(process.env.ERROR_WEBHOOK_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: error.message,
          stack: error.stack,
          context,
          timestamp: new Date().toISOString(),
        }),
      })
    } catch (webhookError) {
      console.error('Failed to send error to webhook:', webhookError)
    }
  }
}
```

## Testing Error Handling

### Unit Tests

```typescript
// service/src/__tests__/error-handling.test.ts
import { describe, it, expect, vi } from 'vitest'
import { AppError, ValidationError } from '../utils/errors'
import { errorHandler } from '../middleware/error-handler'

describe('Error Handling', () => {
  it('should handle AppError correctly', () => {
    const error = new ValidationError('Invalid input')
    const req = mockRequest()
    const res = mockResponse()
    const next = vi.fn()

    errorHandler(error, req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'VALIDATION_ERROR',
        message: 'Invalid input',
      }),
    )
  })

  it('should handle unexpected errors', () => {
    const error = new Error('Unexpected error')
    const req = mockRequest()
    const res = mockResponse()
    const next = vi.fn()

    errorHandler(error, req, res, next)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'INTERNAL_ERROR',
      }),
    )
  })
})
```

### Integration Tests

```typescript
// service/src/__tests__/error-integration.test.ts
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../app'

describe('Error Integration', () => {
  it('should handle validation errors in API endpoints', async () => {
    const response = await request(app).post('/api/chat').send({
      messages: [], // Invalid: empty messages
    })

    expect(response.status).toBe(400)
    expect(response.body.error).toBe('VALIDATION_ERROR')
    expect(response.body.message).toContain('Invalid')
  })

  it('should handle authentication errors', async () => {
    const response = await request(app)
      .post('/api/chat')
      .send({
        messages: [{ role: 'user', content: 'Hello' }],
      })

    expect(response.status).toBe(401)
    expect(response.body.error).toBe('AUTHENTICATION_ERROR')
  })
})
```

This comprehensive error handling guide ensures robust error management across the entire ChatGPT Web application, providing clear error messages, proper logging, and graceful degradation strategies.
