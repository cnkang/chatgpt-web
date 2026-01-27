# Testing Guide

This document outlines the testing strategy, tools, and best practices for the ChatGPT Web project.

## Testing Stack

### Core Testing Tools

- **Vitest 4+**: Fast unit testing framework
- **@vue/test-utils**: Vue component testing utilities
- **Fast-check**: Property-based testing library
- **MSW**: API mocking for integration tests

### Testing Types

1. **Unit Tests**: Individual functions and components
2. **Integration Tests**: Component interactions and API calls
3. **Property-Based Tests**: Automated test case generation
4. **E2E Tests**: Full application workflows (future)

## Project Structure

```
apps/api/
├── src/
│   ├── test/               # Test utilities and fixtures
│   └── __tests__/          # Unit tests
├── vitest.config.ts        # Vitest configuration
└── package.json            # Test scripts
```

## Configuration

### Vitest Configuration

```typescript
// apps/api/vitest.config.ts
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
      exclude: ['node_modules/', 'test/', '**/*.d.ts', '**/*.config.*'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### Test Setup

```typescript
// apps/api/test/setup.ts
import { beforeAll, afterAll, afterEach } from 'vitest'
import { setupServer } from 'msw/node'
import { handlers } from './mocks/handlers'

// Setup MSW server
const server = setupServer(...handlers)

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})
```

## Unit Testing

### Testing Utilities

```typescript
// apps/api/src/utils/__tests__/validator.test.ts
import { describe, it, expect } from 'vitest'
import { validateApiKey, sanitizeInput } from '../validator'

describe('validator', () => {
  describe('validateApiKey', () => {
    it('should validate OpenAI API key format', () => {
      const validKey = 'sk-1234567890abcdef1234567890abcdef12345678'
      expect(validateApiKey(validKey)).toBe(true)
    })

    it('should reject invalid API key format', () => {
      const invalidKey = 'invalid-key'
      expect(validateApiKey(invalidKey)).toBe(false)
    })

    it('should reject empty API key', () => {
      expect(validateApiKey('')).toBe(false)
      expect(validateApiKey(null)).toBe(false)
      expect(validateApiKey(undefined)).toBe(false)
    })
  })

  describe('sanitizeInput', () => {
    it('should remove HTML tags', () => {
      const input = '<script>alert("xss")</script>Hello'
      const result = sanitizeInput(input)
      expect(result).toBe('Hello')
    })

    it('should preserve safe content', () => {
      const input = 'Hello world! How are you?'
      const result = sanitizeInput(input)
      expect(result).toBe(input)
    })
  })
})
```

### Testing Express Middleware

```typescript
// apps/api/src/middleware/__tests__/auth.test.ts
import { describe, it, expect, vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { authMiddleware } from '../auth'

describe('authMiddleware', () => {
  const mockRequest = (headers: Record<string, string> = {}) =>
    ({
      headers,
      ip: '127.0.0.1',
    }) as Request

  const mockResponse = () => {
    const res = {} as Response
    res.status = vi.fn().mockReturnValue(res)
    res.json = vi.fn().mockReturnValue(res)
    return res
  }

  const mockNext = vi.fn() as NextFunction

  it('should allow requests with valid auth header', () => {
    const req = mockRequest({ authorization: 'Bearer valid-token' })
    const res = mockResponse()

    authMiddleware(req, res, mockNext)

    expect(mockNext).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('should reject requests without auth header', () => {
    const req = mockRequest()
    const res = mockResponse()

    authMiddleware(req, res, mockNext)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Authentication required',
    })
    expect(mockNext).not.toHaveBeenCalled()
  })
})
```

### Testing API Providers

```typescript
// apps/api/src/providers/__tests__/openai.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { OpenAIProvider } from '../openai'
import type { ChatMessage } from '../types'

// Mock fetch globally
global.fetch = vi.fn()

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider

  beforeEach(() => {
    provider = new OpenAIProvider({
      apiKey: 'sk-test-key',
      model: 'gpt-4o',
    })
    vi.clearAllMocks()
  })

  it('should send chat completion request', async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            role: 'assistant',
            content: 'Hello! How can I help you?',
          },
        },
      ],
    }

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response)

    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: 'Hello',
      },
    ]

    const result = await provider.sendMessage(messages)

    expect(fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-test-key',
          'Content-Type': 'application/json',
        }),
        body: expect.stringContaining('"model":"gpt-4o"'),
      }),
    )

    expect(result.content).toBe('Hello! How can I help you?')
  })

  it('should handle API errors', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    } as Response)

    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: 'Hello',
      },
    ]

    await expect(provider.sendMessage(messages)).rejects.toThrow(
      'OpenAI API error: 401 Unauthorized',
    )
  })
})
```

## Property-Based Testing

### Fast-check Integration

```typescript
// apps/api/src/utils/__tests__/format.property.test.ts
import { describe, it } from 'vitest'
import fc from 'fast-check'
import { formatMessage, parseMessage } from '../format'

describe('format properties', () => {
  it('should maintain round-trip consistency', () => {
    fc.assert(
      fc.property(
        fc.record({
          role: fc.constantFrom('user', 'assistant', 'system'),
          content: fc.string({ minLength: 1, maxLength: 1000 }),
          timestamp: fc.date(),
        }),
        message => {
          const formatted = formatMessage(message)
          const parsed = parseMessage(formatted)

          expect(parsed.role).toBe(message.role)
          expect(parsed.content).toBe(message.content)
          // Allow small timestamp differences due to serialization
          expect(Math.abs(parsed.timestamp.getTime() - message.timestamp.getTime())).toBeLessThan(
            1000,
          )
        },
      ),
    )
  })

  it('should handle edge cases in content', () => {
    fc.assert(
      fc.property(fc.string(), content => {
        const message = {
          role: 'user' as const,
          content,
          timestamp: new Date(),
        }

        const formatted = formatMessage(message)

        // Should not throw and should produce valid output
        expect(typeof formatted).toBe('string')
        expect(formatted.length).toBeGreaterThan(0)
      }),
    )
  })
})
```

### Custom Arbitraries

```typescript
// apps/api/test/arbitraries.ts
import fc from 'fast-check'
import type { ChatMessage, ChatSession } from '../src/types'

export const chatMessageArbitrary = (): fc.Arbitrary<ChatMessage> =>
  fc.record({
    id: fc.uuid(),
    role: fc.constantFrom('user', 'assistant', 'system'),
    content: fc.string({ minLength: 1, maxLength: 4000 }),
    timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
  })

export const chatSessionArbitrary = (): fc.Arbitrary<ChatSession> =>
  fc.record({
    id: fc.uuid(),
    messages: fc.array(chatMessageArbitrary(), { minLength: 0, maxLength: 50 }),
    model: fc.constantFrom('gpt-4o', 'gpt-4o-mini', 'o1-preview'),
    createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
    updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
  })

export const apiKeyArbitrary = (): fc.Arbitrary<string> =>
  fc.string({ minLength: 40, maxLength: 60 }).filter(s => s.startsWith('sk-'))
```

## Integration Testing

### API Endpoint Testing

```typescript
// apps/api/src/__tests__/chat.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { app } from '../app'
import { setupTestDatabase, cleanupTestDatabase } from '../test/database'

describe('Chat API Integration', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  it('should handle chat completion request', async () => {
    const response = await request(app)
      .post('/api/chat')
      .send({
        messages: [
          {
            role: 'user',
            content: 'Hello, how are you?',
          },
        ],
        model: 'gpt-4o',
      })
      .expect(200)

    expect(response.body).toHaveProperty('message')
    expect(response.body.message).toHaveProperty('role', 'assistant')
    expect(response.body.message).toHaveProperty('content')
    expect(typeof response.body.message.content).toBe('string')
  })

  it('should validate request payload', async () => {
    const response = await request(app)
      .post('/api/chat')
      .send({
        messages: [], // Invalid: empty messages
        model: 'invalid-model',
      })
      .expect(400)

    expect(response.body).toHaveProperty('error')
    expect(response.body.error).toContain('validation')
  })

  it('should handle rate limiting', async () => {
    // Make multiple requests quickly
    const requests = Array.from({ length: 10 }, () =>
      request(app)
        .post('/api/chat')
        .send({
          messages: [{ role: 'user', content: 'Test' }],
          model: 'gpt-4o',
        }),
    )

    const responses = await Promise.all(requests)

    // Some requests should be rate limited
    const rateLimitedResponses = responses.filter(r => r.status === 429)
    expect(rateLimitedResponses.length).toBeGreaterThan(0)
  })
})
```

### Mock Service Workers

```typescript
// apps/api/test/mocks/handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  // OpenAI API mock
  http.post('https://api.openai.com/v1/chat/completions', async ({ request }) => {
    const body = (await request.json()) as any

    return HttpResponse.json({
      id: 'chatcmpl-test',
      object: 'chat.completion',
      created: Date.now(),
      model: body.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: `Mock response to: ${body.messages[body.messages.length - 1].content}`,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
      },
    })
  }),

  // Azure OpenAI API mock
  http.post(
    'https://test.openai.azure.com/openai/deployments/*/chat/completions',
    async ({ request }) => {
      const body = (await request.json()) as any

      return HttpResponse.json({
        id: 'chatcmpl-azure-test',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4o',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: `Azure mock response to: ${body.messages[body.messages.length - 1].content}`,
            },
            finish_reason: 'stop',
          },
        ],
      })
    },
  ),
]
```

## Test Scripts

### Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest --run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:property": "vitest --run --reporter=verbose property",
    "test:integration": "vitest --run integration"
  }
}
```

### Running Tests

```bash
# Run all tests once
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run with UI
pnpm test:ui

# Generate coverage report
pnpm test:coverage

# Run only property-based tests
pnpm test:property

# Run only integration tests
pnpm test:integration
```

## Testing Best Practices

### Test Organization

```typescript
describe('ChatService', () => {
  describe('sendMessage', () => {
    describe('when message is valid', () => {
      it('should send message successfully', () => {
        // Test implementation
      })

      it('should return formatted response', () => {
        // Test implementation
      })
    })

    describe('when message is invalid', () => {
      it('should throw validation error', () => {
        // Test implementation
      })
    })

    describe('when API is unavailable', () => {
      it('should retry with exponential backoff', () => {
        // Test implementation
      })

      it('should fail after max retries', () => {
        // Test implementation
      })
    })
  })
})
```

### Test Data Management

```typescript
// apps/api/test/fixtures/messages.ts
export const validChatMessage = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  role: 'user' as const,
  content: 'Hello, world!',
  timestamp: new Date('2024-01-15T10:30:00Z'),
}

export const assistantMessage = {
  id: '123e4567-e89b-12d3-a456-426614174001',
  role: 'assistant' as const,
  content: 'Hello! How can I help you today?',
  timestamp: new Date('2024-01-15T10:30:05Z'),
}

export const chatSession = {
  id: '123e4567-e89b-12d3-a456-426614174002',
  messages: [validChatMessage, assistantMessage],
  model: 'gpt-4o',
  createdAt: new Date('2024-01-15T10:30:00Z'),
  updatedAt: new Date('2024-01-15T10:30:05Z'),
}
```

### Async Testing

```typescript
describe('async operations', () => {
  it('should handle promise resolution', async () => {
    const result = await asyncFunction()
    expect(result).toBe('expected value')
  })

  it('should handle promise rejection', async () => {
    await expect(failingAsyncFunction()).rejects.toThrow('Expected error message')
  })

  it('should timeout long operations', async () => {
    const promise = longRunningOperation()

    await expect(promise).resolves.toBe('result')
  }, 10000) // 10 second timeout
})
```

### Mocking Guidelines

```typescript
// ✅ Good - Mock external dependencies
vi.mock('../external-service', () => ({
  ExternalService: vi.fn().mockImplementation(() => ({
    call: vi.fn().mockResolvedValue('mocked result'),
  })),
}))

// ✅ Good - Spy on internal methods
const spy = vi.spyOn(service, 'internalMethod')
spy.mockReturnValue('mocked value')

// ❌ Bad - Don't mock the system under test
vi.mock('../service-under-test') // This defeats the purpose
```

## Coverage Requirements

### Coverage Targets

- **Statements**: 90%+
- **Branches**: 85%+
- **Functions**: 90%+
- **Lines**: 90%+

### Coverage Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        statements: 90,
        branches: 85,
        functions: 90,
        lines: 90,
      },
      exclude: ['node_modules/', 'test/', '**/*.d.ts', '**/*.config.*', '**/types.ts'],
    },
  },
})
```

## Continuous Integration

### GitHub Actions Integration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm

      - run: pnpm install
      - run: pnpm test:coverage

      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/coverage-final.json
```

This testing guide ensures comprehensive test coverage and maintains code quality throughout the development process.
