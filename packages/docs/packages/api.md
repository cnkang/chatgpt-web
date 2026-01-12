# API Package Documentation

The API package contains the backend Node.js service for ChatGPT Web, providing the server-side functionality, AI provider integration, and API endpoints.

## Package Overview

```json
{
  "name": "chatgpt-web-service",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "esno src/index.ts",
    "build": "tsup",
    "prod": "node build/index.js",
    "start": "esno src/index.ts",
    "test": "vitest --run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

## Architecture

### Technology Stack

- **Node.js 24+**: Runtime environment with native fetch
- **TypeScript 5.9+**: Strict type checking
- **Express.js 5+**: Web framework
- **Zod 4+**: Runtime type validation
- **Vitest 4+**: Testing framework
- **tsup**: Build tool for TypeScript

### Project Structure

```
service/src/
├── providers/            # AI service providers
│   ├── base.ts          # Abstract provider interface
│   ├── openai.ts        # OpenAI implementation
│   ├── azure.ts         # Azure OpenAI implementation
│   └── factory.ts       # Provider factory
├── middleware/          # Express middleware
│   ├── auth.ts          # Authentication
│   ├── limiter.ts       # Rate limiting
│   ├── security.ts      # Security headers
│   └── validation.ts    # Request validation
├── routes/              # API route handlers
│   ├── chat.ts          # Chat endpoints
│   ├── health.ts        # Health checks
│   └── models.ts        # Model management
├── utils/               # Utility functions
│   ├── errors.ts        # Error classes
│   ├── logger.ts        # Logging
│   └── retry.ts         # Retry logic
├── validation/          # Input validation
│   └── schemas.ts       # Zod schemas
└── index.ts             # Application entry point
```

## Core Components

### Application Entry Point

```typescript
// src/index.ts
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { globalRateLimit } from './middleware/limiter.js'
import { authMiddleware } from './middleware/auth.js'
import { errorHandler } from './middleware/error-handler.js'
import { securityMiddleware } from './middleware/security.js'
import chatRoutes from './routes/chat.js'
import healthRoutes from './routes/health.js'
import modelsRoutes from './routes/models.js'
import { logger } from './utils/logger.js'

const app = express()
const port = process.env.PORT || 3002

// Security middleware
app.use(helmet())
app.use(securityMiddleware)

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || false,
    credentials: true,
  }),
)

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Rate limiting
app.use(globalRateLimit)

// Authentication (optional)
app.use(authMiddleware)

// Routes
app.use('/api/chat', chatRoutes)
app.use('/health', healthRoutes)
app.use('/api/models', modelsRoutes)

// Error handling
app.use(errorHandler)

// Start server
app.listen(port, () => {
  logger.info(`Server running on port ${port}`, {
    port,
    nodeVersion: process.version,
    environment: process.env.NODE_ENV,
  })
})

export { app }
```

### Provider System

#### Base Provider Interface

```typescript
// src/providers/base.ts
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ChatResponse {
  message: ChatMessage
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  model?: string
  finish_reason?: string
}

export interface ProviderConfig {
  apiKey: string
  model?: string
  timeout?: number
  maxRetries?: number
}

export abstract class BaseProvider {
  protected config: ProviderConfig

  constructor(config: ProviderConfig) {
    this.config = config
  }

  abstract sendMessage(messages: ChatMessage[]): Promise<ChatResponse>
  abstract validateConfig(): boolean
  abstract getAvailableModels(): Promise<string[]>
  abstract getName(): string
}
```

#### OpenAI Provider Implementation

```typescript
// src/providers/openai.ts
import { BaseProvider, ChatMessage, ChatResponse, ProviderConfig } from './base.js'
import { ProviderError, TimeoutError } from '../utils/errors.js'
import { logger } from '../utils/logger.js'

interface OpenAIConfig extends ProviderConfig {
  baseURL?: string
  organization?: string
}

export class OpenAIProvider extends BaseProvider {
  private baseURL: string
  private organization?: string

  constructor(config: OpenAIConfig) {
    super(config)
    this.baseURL = config.baseURL || 'https://api.openai.com'
    this.organization = config.organization
  }

  getName(): string {
    return 'OpenAI'
  }

  validateConfig(): boolean {
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key is required')
    }

    if (!this.config.apiKey.startsWith('sk-')) {
      throw new Error('Invalid OpenAI API key format')
    }

    return true
  }

  async sendMessage(messages: ChatMessage[]): Promise<ChatResponse> {
    this.validateConfig()

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout || 30000)

    try {
      logger.info('Sending request to OpenAI', {
        model: this.config.model,
        messageCount: messages.length,
      })

      const response = await fetch(`${this.baseURL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          ...(this.organization && { 'OpenAI-Organization': this.organization }),
        },
        body: JSON.stringify({
          model: this.config.model || 'gpt-4o',
          messages,
          temperature: 0.7,
          max_tokens: 4000,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        await this.handleAPIError(response)
      }

      const data = await response.json()

      logger.info('Received response from OpenAI', {
        model: data.model,
        usage: data.usage,
      })

      return {
        message: {
          role: 'assistant',
          content: data.choices[0].message.content,
        },
        usage: data.usage,
        model: data.model,
        finish_reason: data.choices[0].finish_reason,
      }
    } catch (error) {
      clearTimeout(timeoutId)

      if (error.name === 'AbortError') {
        throw new TimeoutError('OpenAI API request timeout')
      }

      throw error
    }
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseURL}/v1/models`, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          ...(this.organization && { 'OpenAI-Organization': this.organization }),
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data.data
        .filter((model: any) => model.id.includes('gpt'))
        .map((model: any) => model.id)
        .sort()
    } catch (error) {
      logger.error('Failed to fetch OpenAI models', { error: error.message })
      return ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo']
    }
  }

  private async handleAPIError(response: Response): Promise<never> {
    let errorData: any = {}

    try {
      errorData = await response.json()
    } catch {
      // Ignore JSON parsing errors
    }

    const errorMessage =
      errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`

    switch (response.status) {
      case 400:
        throw new ProviderError(`Invalid request: ${errorMessage}`, 'openai', 400)
      case 401:
        throw new ProviderError('Invalid API key or authentication failed', 'openai', 401)
      case 403:
        throw new ProviderError('Access forbidden - check your API key permissions', 'openai', 403)
      case 429:
        throw new ProviderError('Rate limit exceeded', 'openai', 429)
      case 500:
      case 502:
      case 503:
        throw new ProviderError('OpenAI service temporarily unavailable', 'openai', response.status)
      default:
        throw new ProviderError(`OpenAI API error: ${errorMessage}`, 'openai', response.status)
    }
  }
}
```

### Route Handlers

#### Chat Routes

```typescript
// src/routes/chat.ts
import { Router } from 'express'
import { z } from 'zod'
import { ProviderFactory } from '../providers/factory.js'
import { asyncHandler } from '../utils/async-handler.js'
import { chatRateLimit } from '../middleware/limiter.js'
import { logger } from '../utils/logger.js'

const router = Router()

// Chat message schema
const chatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().min(1).max(4000).optional(),
})

// Apply rate limiting to chat endpoints
router.use(chatRateLimit)

// Chat completion endpoint
router.post(
  '/',
  asyncHandler(async (req, res) => {
    // Validate request
    const validatedData = chatRequestSchema.parse(req.body)

    logger.info('Chat request received', {
      messageCount: validatedData.messages.length,
      model: validatedData.model,
      ip: req.ip,
    })

    // Get provider
    const provider = ProviderFactory.getProviderFromEnv()

    // Send message
    const response = await provider.sendMessage(validatedData.messages)

    logger.info('Chat response sent', {
      model: response.model,
      usage: response.usage,
      finishReason: response.finish_reason,
    })

    res.json(response)
  }),
)

// Stream chat completion endpoint
router.post(
  '/stream',
  asyncHandler(async (req, res) => {
    const validatedData = chatRequestSchema.parse(req.body)

    // Set headers for streaming
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    // Get provider
    const provider = ProviderFactory.getProviderFromEnv()

    try {
      // This would implement streaming if supported by provider
      const response = await provider.sendMessage(validatedData.messages)

      // Send as server-sent events
      res.write(`data: ${JSON.stringify(response)}\n\n`)
      res.write('data: [DONE]\n\n')
      res.end()
    } catch (error) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`)
      res.end()
    }
  }),
)

export default router
```

#### Health Check Routes

```typescript
// src/routes/health.ts
import { Router } from 'express'
import { ProviderFactory } from '../providers/factory.js'
import { asyncHandler } from '../utils/async-handler.js'

const router = Router()

// Basic health check
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0',
  })
})

// Detailed health check
router.get(
  '/detailed',
  asyncHandler(async (req, res) => {
    const provider = ProviderFactory.getProviderFromEnv()

    let providerHealth = 'unknown'
    try {
      await provider.sendMessage([
        {
          role: 'user',
          content: 'Health check',
        },
      ])
      providerHealth = 'healthy'
    } catch (error) {
      providerHealth = 'unhealthy'
    }

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0',
      provider: {
        name: provider.getName(),
        status: providerHealth,
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    })
  }),
)

// Readiness probe (for Kubernetes)
router.get('/ready', (req, res) => {
  // Check if application is ready to serve requests
  res.json({
    status: 'ready',
    timestamp: new Date().toISOString(),
  })
})

// Liveness probe (for Kubernetes)
router.get('/live', (req, res) => {
  // Check if application is alive
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  })
})

export default router
```

### Middleware

#### Authentication Middleware

```typescript
// src/middleware/auth.ts
import type { Request, Response, NextFunction } from 'express'
import { AuthenticationError } from '../utils/errors.js'

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authSecret = process.env.AUTH_SECRET_KEY

  // Skip authentication if no secret is configured
  if (!authSecret) {
    return next()
  }

  // Skip health checks
  if (req.path.startsWith('/health')) {
    return next()
  }

  // Extract token
  const token = extractToken(req)

  if (!token) {
    throw new AuthenticationError('No authentication token provided')
  }

  if (token !== authSecret) {
    throw new AuthenticationError('Invalid authentication token')
  }

  next()
}

function extractToken(req: Request): string | null {
  // Check Authorization header
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // Check query parameter
  const queryToken = req.query.token as string
  if (queryToken) {
    return queryToken
  }

  return null
}
```

#### Security Middleware

```typescript
// src/middleware/security.ts
import helmet from 'helmet'
import type { Request, Response, NextFunction } from 'express'

export const securityMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.openai.com', 'https://*.openai.azure.com'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'same-origin' },
})

// Additional security headers
export function additionalSecurityHeaders(req: Request, res: Response, next: NextFunction) {
  // Remove server header
  res.removeHeader('X-Powered-By')

  // Add custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')

  next()
}
```

### Utilities

#### Error Handling

```typescript
// src/utils/errors.ts
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

#### Logging

```typescript
// src/utils/logger.ts
import winston from 'winston'

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: {
    service: 'chatgpt-web-api',
    version: process.env.npm_package_version || '1.0.0',
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  ],
})

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
  )

  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  )
}

export { logger }
```

## Configuration

### Build Configuration

```typescript
// tsup.config.ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node24',
  outDir: 'build',
  clean: true,
  sourcemap: true,
  minify: process.env.NODE_ENV === 'production',
  splitting: false,
  treeshake: true,
  external: [
    // External dependencies that shouldn't be bundled
  ],
  esbuildOptions(options) {
    options.banner = {
      js: '#!/usr/bin/env node',
    }
  },
})
```

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "allowJs": true,
    "sourceMap": true,
    "outDir": "./build",
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
  "exclude": ["node_modules", "build", "**/*.test.ts"]
}
```

## Testing

### Test Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'test/', '**/*.d.ts', '**/*.config.*', 'build/'],
      thresholds: {
        statements: 90,
        branches: 85,
        functions: 90,
        lines: 90,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### Unit Tests

```typescript
// src/__tests__/providers/openai.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OpenAIProvider } from '../../providers/openai.js'

// Mock fetch globally
global.fetch = vi.fn()

describe('OpenAI Provider', () => {
  let provider: OpenAIProvider

  beforeEach(() => {
    provider = new OpenAIProvider({
      apiKey: 'sk-test-key',
      model: 'gpt-4o',
    })
    vi.clearAllMocks()
  })

  it('should validate configuration', () => {
    expect(() => provider.validateConfig()).not.toThrow()

    const invalidProvider = new OpenAIProvider({ apiKey: '' })
    expect(() => invalidProvider.validateConfig()).toThrow('OpenAI API key is required')
  })

  it('should send message successfully', async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            role: 'assistant',
            content: 'Hello! How can I help you?',
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
      },
      model: 'gpt-4o',
    }

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response)

    const result = await provider.sendMessage([
      {
        role: 'user',
        content: 'Hello',
      },
    ])

    expect(result.message.content).toBe('Hello! How can I help you?')
    expect(result.usage?.total_tokens).toBe(30)
  })
})
```

### Integration Tests

```typescript
// src/__tests__/routes/chat.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { app } from '../../index.js'

describe('Chat API Integration', () => {
  beforeAll(async () => {
    // Setup test environment
    process.env.AUTH_SECRET_KEY = 'test-secret'
  })

  afterAll(async () => {
    // Cleanup
  })

  it('should handle chat completion request', async () => {
    const response = await request(app)
      .post('/api/chat')
      .set('Authorization', 'Bearer test-secret')
      .send({
        messages: [
          {
            role: 'user',
            content: 'Hello, how are you?',
          },
        ],
      })
      .expect(200)

    expect(response.body).toHaveProperty('message')
    expect(response.body.message).toHaveProperty('role', 'assistant')
    expect(response.body.message).toHaveProperty('content')
  })

  it('should validate request payload', async () => {
    const response = await request(app)
      .post('/api/chat')
      .set('Authorization', 'Bearer test-secret')
      .send({
        messages: [], // Invalid: empty messages
      })
      .expect(400)

    expect(response.body).toHaveProperty('error')
  })
})
```

## Deployment

### Production Build

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Build for production
pnpm build

# Start production server
pnpm prod
```

### Environment Variables

```bash
# Required
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-api-key-here

# Optional
PORT=3002
NODE_ENV=production
AUTH_SECRET_KEY=your-secret-key
MAX_REQUEST_PER_HOUR=1000
TIMEOUT_MS=30000
LOG_LEVEL=info
```

### Docker Support

```dockerfile
# Dockerfile
FROM node:24-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install dependencies
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN pnpm build

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3002/health || exit 1

# Start application
CMD ["pnpm", "prod"]
```

## Performance Optimization

### Connection Pooling

```typescript
// src/utils/http-client.ts
import { Agent } from 'https'

export const httpsAgent = new Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 30000,
})

// Use in fetch requests
fetch(url, {
  agent: httpsAgent,
  // ... other options
})
```

### Caching

```typescript
// src/utils/cache.ts
import NodeCache from 'node-cache'

export const responseCache = new NodeCache({
  stdTTL: 300, // 5 minutes
  checkperiod: 60, // Check for expired keys every minute
  maxKeys: 1000,
})

// Cache middleware
export function cacheMiddleware(duration: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.method}:${req.originalUrl}:${JSON.stringify(req.body)}`
    const cached = responseCache.get(key)

    if (cached) {
      return res.json(cached)
    }

    const originalSend = res.json
    res.json = function (data) {
      responseCache.set(key, data, duration)
      return originalSend.call(this, data)
    }

    next()
  }
}
```

The API package provides a robust, secure, and scalable backend service for ChatGPT Web with comprehensive error handling, authentication, rate limiting, and AI provider integration.
