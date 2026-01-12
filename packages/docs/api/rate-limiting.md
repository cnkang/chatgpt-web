# Rate Limiting Guide

This guide covers the comprehensive rate limiting system implemented in ChatGPT Web to protect against abuse and ensure fair usage.

## Rate Limiting Overview

ChatGPT Web implements multiple layers of rate limiting:

1. **Global Rate Limiting**: Overall request limits per IP
2. **Endpoint-Specific Limits**: Different limits for different endpoints
3. **User-Based Limits**: Limits based on authentication
4. **Provider Rate Limiting**: Respect external API limits
5. **Adaptive Rate Limiting**: Dynamic limits based on system load

## Configuration

### Environment Variables

```bash
# Basic Rate Limiting
MAX_REQUEST_PER_HOUR=1000              # Requests per hour per IP
RATE_LIMIT_WINDOW_MS=3600000           # Rate limit window (1 hour)
RATE_LIMIT_MAX_REQUESTS=1000           # Max requests per window

# Advanced Configuration
ENABLE_RATE_LIMITING=true              # Enable/disable rate limiting
RATE_LIMIT_STRATEGY=sliding_window     # fixed_window, sliding_window
RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS=false
RATE_LIMIT_SKIP_FAILED_REQUESTS=false

# Redis Configuration (for distributed rate limiting)
REDIS_URL=redis://localhost:6379
RATE_LIMIT_REDIS_PREFIX=rl:
```

## Implementation

### Basic Rate Limiting Middleware

```typescript
// service/src/middleware/rate-limiter.ts
import rateLimit from 'express-rate-limit'
import RedisStore from 'rate-limit-redis'
import Redis from 'ioredis'

// Redis client for distributed rate limiting
const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null

// Global rate limiter
export const globalRateLimit = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '3600000'), // 1 hour
  max: parseInt(process.env.MAX_REQUEST_PER_HOUR || '1000'),

  // Use Redis store for distributed systems
  store: redis
    ? new RedisStore({
        sendCommand: (...args: string[]) => redis.call(...args),
        prefix: process.env.RATE_LIMIT_REDIS_PREFIX || 'rl:',
      })
    : undefined,

  // Standard headers
  standardHeaders: true,
  legacyHeaders: false,

  // Custom key generator
  keyGenerator: req => {
    // Use authenticated user ID if available, otherwise IP
    return req.user?.id || req.ip
  },

  // Custom message
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests, please try again later',
    retryAfter: Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW_MS || '3600000') / 1000),
  },

  // Skip certain requests
  skip: req => {
    // Skip health checks
    if (req.path === '/health') return true

    // Skip if rate limiting is disabled
    if (process.env.ENABLE_RATE_LIMITING === 'false') return true

    return false
  },

  // Custom handler for rate limit exceeded
  handler: (req, res) => {
    res.status(429).json({
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
      retryAfter: Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW_MS || '3600000') / 1000),
      timestamp: new Date().toISOString(),
    })
  },
})
```

### Endpoint-Specific Rate Limiting

```typescript
// service/src/middleware/endpoint-limiters.ts
import rateLimit from 'express-rate-limit'

// Chat endpoint - more restrictive
export const chatRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: {
    error: 'CHAT_RATE_LIMIT_EXCEEDED',
    message: 'Too many chat requests, please wait before sending another message',
  },
})

// Authentication endpoint - very restrictive
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: {
    error: 'AUTH_RATE_LIMIT_EXCEEDED',
    message: 'Too many authentication attempts, please try again later',
  },
})

// Health check - very permissive
export const healthRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  skip: req => req.path === '/health',
})
```

### Tiered Rate Limiting

```typescript
// service/src/middleware/tiered-rate-limiter.ts
import rateLimit from 'express-rate-limit'

interface UserTier {
  name: string
  hourlyLimit: number
  minuteLimit: number
  burstLimit: number
}

const tiers: Record<string, UserTier> = {
  free: {
    name: 'Free',
    hourlyLimit: 100,
    minuteLimit: 5,
    burstLimit: 10,
  },
  premium: {
    name: 'Premium',
    hourlyLimit: 1000,
    minuteLimit: 20,
    burstLimit: 50,
  },
  enterprise: {
    name: 'Enterprise',
    hourlyLimit: 10000,
    minuteLimit: 100,
    burstLimit: 200,
  },
}

export function createTieredRateLimit() {
  return rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour

    // Dynamic max based on user tier
    max: req => {
      const userTier = req.user?.tier || 'free'
      return tiers[userTier]?.hourlyLimit || tiers.free.hourlyLimit
    },

    keyGenerator: req => {
      return req.user?.id || req.ip
    },

    message: req => {
      const userTier = req.user?.tier || 'free'
      const tier = tiers[userTier] || tiers.free

      return {
        error: 'TIER_RATE_LIMIT_EXCEEDED',
        message: `${tier.name} tier limit exceeded`,
        limits: {
          hourly: tier.hourlyLimit,
          minute: tier.minuteLimit,
          burst: tier.burstLimit,
        },
      }
    },
  })
}
```

### Sliding Window Rate Limiter

```typescript
// service/src/middleware/sliding-window-limiter.ts
import Redis from 'ioredis'

export class SlidingWindowRateLimiter {
  private redis: Redis

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl)
  }

  async isAllowed(
    key: string,
    limit: number,
    windowMs: number,
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now()
    const windowStart = now - windowMs

    // Use Redis pipeline for atomic operations
    const pipeline = this.redis.pipeline()

    // Remove expired entries
    pipeline.zremrangebyscore(key, 0, windowStart)

    // Count current requests
    pipeline.zcard(key)

    // Add current request
    pipeline.zadd(key, now, `${now}-${Math.random()}`)

    // Set expiration
    pipeline.expire(key, Math.ceil(windowMs / 1000))

    const results = await pipeline.exec()
    const currentCount = (results?.[1]?.[1] as number) || 0

    const allowed = currentCount < limit
    const remaining = Math.max(0, limit - currentCount - 1)
    const resetTime = now + windowMs

    if (!allowed) {
      // Remove the request we just added since it's not allowed
      await this.redis.zrem(key, `${now}-${Math.random()}`)
    }

    return { allowed, remaining, resetTime }
  }

  middleware(limit: number, windowMs: number) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const key = `rate_limit:${req.user?.id || req.ip}`

      try {
        const result = await this.isAllowed(key, limit, windowMs)

        // Set rate limit headers
        res.set({
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
        })

        if (!result.allowed) {
          return res.status(429).json({
            error: 'RATE_LIMIT_EXCEEDED',
            message: 'Rate limit exceeded',
            retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
          })
        }

        next()
      } catch (error) {
        console.error('Rate limiting error:', error)
        // Fail open - allow request if rate limiter fails
        next()
      }
    }
  }
}
```

### Adaptive Rate Limiting

```typescript
// service/src/middleware/adaptive-rate-limiter.ts
export class AdaptiveRateLimiter {
  private baseLimit: number
  private currentLoad = 0
  private errorRate = 0

  constructor(baseLimit: number) {
    this.baseLimit = baseLimit
    this.startMonitoring()
  }

  private startMonitoring() {
    setInterval(() => {
      this.updateMetrics()
    }, 10000) // Update every 10 seconds
  }

  private updateMetrics() {
    // Get system metrics
    const memoryUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()

    // Calculate load factor (0-1)
    this.currentLoad = Math.min(1, memoryUsage.heapUsed / memoryUsage.heapTotal)

    // Update error rate based on recent errors
    // This would be implemented based on your error tracking
  }

  getCurrentLimit(): number {
    // Reduce limit based on system load
    const loadFactor = 1 - this.currentLoad * 0.5

    // Reduce limit based on error rate
    const errorFactor = 1 - this.errorRate * 0.3

    return Math.floor(this.baseLimit * loadFactor * errorFactor)
  }

  middleware() {
    return rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: () => this.getCurrentLimit(),
      message: {
        error: 'ADAPTIVE_RATE_LIMIT_EXCEEDED',
        message: 'System is under high load, please try again later',
      },
    })
  }
}
```

## Provider-Specific Rate Limiting

### OpenAI Rate Limiting

```typescript
// service/src/providers/openai-rate-limiter.ts
export class OpenAIRateLimiter {
  private requestsPerMinute = 0
  private tokensPerMinute = 0
  private lastReset = Date.now()

  // OpenAI rate limits (adjust based on your tier)
  private readonly limits = {
    requestsPerMinute: 3500,
    tokensPerMinute: 90000,
    requestsPerDay: 10000,
  }

  async checkRateLimit(estimatedTokens: number): Promise<boolean> {
    const now = Date.now()

    // Reset counters every minute
    if (now - this.lastReset > 60000) {
      this.requestsPerMinute = 0
      this.tokensPerMinute = 0
      this.lastReset = now
    }

    // Check if we would exceed limits
    if (this.requestsPerMinute >= this.limits.requestsPerMinute) {
      return false
    }

    if (this.tokensPerMinute + estimatedTokens > this.limits.tokensPerMinute) {
      return false
    }

    return true
  }

  recordRequest(actualTokens: number) {
    this.requestsPerMinute++
    this.tokensPerMinute += actualTokens
  }

  getWaitTime(): number {
    const now = Date.now()
    const timeUntilReset = 60000 - (now - this.lastReset)
    return Math.max(0, timeUntilReset)
  }
}
```

### Provider Rate Limiting Middleware

```typescript
// service/src/middleware/provider-rate-limiter.ts
import { OpenAIRateLimiter } from '../providers/openai-rate-limiter'

const openaiLimiter = new OpenAIRateLimiter()

export async function providerRateLimit(req: Request, res: Response, next: NextFunction) {
  const messages = req.body.messages || []
  const estimatedTokens = estimateTokens(messages)

  const allowed = await openaiLimiter.checkRateLimit(estimatedTokens)

  if (!allowed) {
    const waitTime = openaiLimiter.getWaitTime()

    return res.status(429).json({
      error: 'PROVIDER_RATE_LIMIT_EXCEEDED',
      message: 'OpenAI rate limit would be exceeded',
      retryAfter: Math.ceil(waitTime / 1000),
      details: {
        provider: 'openai',
        estimatedTokens,
      },
    })
  }

  // Store estimated tokens for later recording
  req.estimatedTokens = estimatedTokens
  next()
}

function estimateTokens(messages: any[]): number {
  // Rough estimation: 1 token ≈ 4 characters
  const totalChars = messages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0)
  return Math.ceil(totalChars / 4)
}
```

## Frontend Rate Limiting

### Client-Side Rate Limiting

```typescript
// src/utils/client-rate-limiter.ts
export class ClientRateLimiter {
  private requests: number[] = []
  private readonly maxRequests: number
  private readonly windowMs: number

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
  }

  canMakeRequest(): boolean {
    const now = Date.now()

    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs)

    return this.requests.length < this.maxRequests
  }

  recordRequest(): void {
    this.requests.push(Date.now())
  }

  getWaitTime(): number {
    if (this.requests.length === 0) return 0

    const oldestRequest = Math.min(...this.requests)
    const waitTime = this.windowMs - (Date.now() - oldestRequest)

    return Math.max(0, waitTime)
  }

  getRemainingRequests(): number {
    const now = Date.now()
    const recentRequests = this.requests.filter(time => now - time < this.windowMs)
    return Math.max(0, this.maxRequests - recentRequests.length)
  }
}
```

### Rate Limit Store

```typescript
// src/store/modules/rate-limit.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ClientRateLimiter } from '@/utils/client-rate-limiter'

export const useRateLimitStore = defineStore('rateLimit', () => {
  const chatLimiter = new ClientRateLimiter(10, 60000) // 10 requests per minute
  const lastRateLimitError = ref<Date | null>(null)
  const serverLimits = ref({
    remaining: 0,
    reset: new Date(),
    limit: 0,
  })

  const canSendMessage = computed(() => {
    return chatLimiter.canMakeRequest()
  })

  const waitTime = computed(() => {
    return chatLimiter.getWaitTime()
  })

  const remainingRequests = computed(() => {
    return chatLimiter.getRemainingRequests()
  })

  function recordRequest() {
    chatLimiter.recordRequest()
  }

  function updateServerLimits(headers: Headers) {
    const remaining = headers.get('X-RateLimit-Remaining')
    const reset = headers.get('X-RateLimit-Reset')
    const limit = headers.get('X-RateLimit-Limit')

    if (remaining) serverLimits.value.remaining = parseInt(remaining)
    if (reset) serverLimits.value.reset = new Date(reset)
    if (limit) serverLimits.value.limit = parseInt(limit)
  }

  function handleRateLimitError() {
    lastRateLimitError.value = new Date()
  }

  return {
    canSendMessage,
    waitTime,
    remainingRequests,
    serverLimits: readonly(serverLimits),
    lastRateLimitError: readonly(lastRateLimitError),
    recordRequest,
    updateServerLimits,
    handleRateLimitError,
  }
})
```

### Rate Limit UI Component

```vue
<!-- src/components/RateLimitIndicator.vue -->
<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRateLimitStore } from '@/store/modules/rate-limit'
import { NProgress, NTooltip } from 'naive-ui'

const rateLimitStore = useRateLimitStore()
const currentTime = ref(Date.now())

let interval: NodeJS.Timeout

onMounted(() => {
  interval = setInterval(() => {
    currentTime.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (interval) clearInterval(interval)
})

const progressPercentage = computed(() => {
  const total = rateLimitStore.serverLimits.limit
  const remaining = rateLimitStore.serverLimits.remaining

  if (total === 0) return 100

  return Math.round((remaining / total) * 100)
})

const resetTimeRemaining = computed(() => {
  const resetTime = rateLimitStore.serverLimits.reset.getTime()
  const remaining = Math.max(0, resetTime - currentTime.value)

  if (remaining === 0) return 'Reset now'

  const minutes = Math.floor(remaining / 60000)
  const seconds = Math.floor((remaining % 60000) / 1000)

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }

  return `${seconds}s`
})

const statusColor = computed(() => {
  if (progressPercentage.value > 50) return 'success'
  if (progressPercentage.value > 20) return 'warning'
  return 'error'
})
</script>

<template>
  <div class="rate-limit-indicator">
    <NTooltip>
      <template #trigger>
        <div class="rate-limit-progress">
          <NProgress
            :percentage="progressPercentage"
            :status="statusColor"
            :show-indicator="false"
            :height="4"
          />
          <div class="rate-limit-text">
            {{ rateLimitStore.serverLimits.remaining }}/{{ rateLimitStore.serverLimits.limit }}
          </div>
        </div>
      </template>

      <div class="rate-limit-tooltip">
        <div>Remaining requests: {{ rateLimitStore.serverLimits.remaining }}</div>
        <div>Limit resets in: {{ resetTimeRemaining }}</div>
        <div v-if="!rateLimitStore.canSendMessage" class="rate-limit-warning">
          Client rate limit active
        </div>
      </div>
    </NTooltip>
  </div>
</template>

<style scoped>
.rate-limit-indicator {
  padding: 0.5rem;
  border-radius: 4px;
  background: var(--color-card);
}

.rate-limit-progress {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.rate-limit-text {
  font-size: 0.75rem;
  text-align: center;
  color: var(--color-text-secondary);
}

.rate-limit-tooltip {
  font-size: 0.875rem;
}

.rate-limit-warning {
  color: var(--color-warning);
  font-weight: 500;
}
</style>
```

## Monitoring and Analytics

### Rate Limit Metrics

```typescript
// service/src/utils/rate-limit-metrics.ts
import { Counter, Histogram, Gauge } from 'prom-client'

export const rateLimitCounter = new Counter({
  name: 'chatgpt_web_rate_limit_exceeded_total',
  help: 'Total number of rate limit exceeded events',
  labelNames: ['endpoint', 'tier', 'type'],
})

export const rateLimitGauge = new Gauge({
  name: 'chatgpt_web_rate_limit_remaining',
  help: 'Remaining rate limit quota',
  labelNames: ['endpoint', 'tier'],
})

export const rateLimitDuration = new Histogram({
  name: 'chatgpt_web_rate_limit_wait_duration_seconds',
  help: 'Time users wait due to rate limiting',
  labelNames: ['endpoint', 'tier'],
})

// Usage in rate limiter
export function recordRateLimitExceeded(endpoint: string, tier: string, type: string) {
  rateLimitCounter.inc({ endpoint, tier, type })
}

export function updateRateLimitRemaining(endpoint: string, tier: string, remaining: number) {
  rateLimitGauge.set({ endpoint, tier }, remaining)
}
```

### Rate Limit Dashboard

```typescript
// service/src/routes/admin.ts
import { Router } from 'express'
import { redis } from '../utils/redis'

const router = Router()

router.get('/rate-limits', async (req, res) => {
  try {
    // Get all rate limit keys
    const keys = await redis.keys('rl:*')

    const rateLimits = await Promise.all(
      keys.map(async key => {
        const ttl = await redis.ttl(key)
        const count = await redis.get(key)

        return {
          key: key.replace('rl:', ''),
          count: parseInt(count || '0'),
          ttl,
          resetTime: new Date(Date.now() + ttl * 1000),
        }
      }),
    )

    res.json({
      rateLimits: rateLimits.sort((a, b) => b.count - a.count),
      totalKeys: keys.length,
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rate limits' })
  }
})

export default router
```

## Testing Rate Limiting

### Unit Tests

```typescript
// service/src/__tests__/rate-limiting.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../app'

describe('Rate Limiting', () => {
  beforeEach(() => {
    // Reset rate limit counters
    vi.clearAllMocks()
  })

  it('should allow requests within rate limit', async () => {
    const responses = await Promise.all([
      request(app).post('/api/chat').send({ messages: [] }),
      request(app).post('/api/chat').send({ messages: [] }),
      request(app).post('/api/chat').send({ messages: [] }),
    ])

    responses.forEach(response => {
      expect(response.status).not.toBe(429)
    })
  })

  it('should block requests exceeding rate limit', async () => {
    // Make requests up to the limit
    const requests = Array.from({ length: 15 }, () =>
      request(app).post('/api/chat').send({ messages: [] }),
    )

    const responses = await Promise.all(requests)

    // Some requests should be rate limited
    const rateLimitedResponses = responses.filter(r => r.status === 429)
    expect(rateLimitedResponses.length).toBeGreaterThan(0)
  })

  it('should include rate limit headers', async () => {
    const response = await request(app).post('/api/chat').send({ messages: [] })

    expect(response.headers['x-ratelimit-limit']).toBeDefined()
    expect(response.headers['x-ratelimit-remaining']).toBeDefined()
    expect(response.headers['x-ratelimit-reset']).toBeDefined()
  })
})
```

### Load Testing

```typescript
// scripts/rate-limit-load-test.ts
import { performance } from 'perf_hooks'

async function loadTest() {
  const baseUrl = 'http://localhost:3002'
  const concurrency = 50
  const duration = 60000 // 1 minute

  const results = {
    totalRequests: 0,
    successfulRequests: 0,
    rateLimitedRequests: 0,
    errors: 0,
    averageResponseTime: 0,
  }

  const startTime = performance.now()
  const endTime = startTime + duration

  const workers = Array.from({ length: concurrency }, () => runWorker(baseUrl, endTime, results))

  await Promise.all(workers)

  console.log('Load test results:', results)
}

async function runWorker(baseUrl: string, endTime: number, results: any) {
  while (performance.now() < endTime) {
    const requestStart = performance.now()

    try {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [] }),
      })

      const requestTime = performance.now() - requestStart
      results.averageResponseTime =
        (results.averageResponseTime * results.totalRequests + requestTime) /
        (results.totalRequests + 1)

      results.totalRequests++

      if (response.status === 429) {
        results.rateLimitedRequests++
      } else if (response.ok) {
        results.successfulRequests++
      } else {
        results.errors++
      }
    } catch (error) {
      results.errors++
      results.totalRequests++
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}

loadTest().catch(console.error)
```

## Best Practices

### Configuration Best Practices

1. **Environment-Specific Limits**: Use different limits for dev/staging/production
2. **Graceful Degradation**: Fail open if rate limiter is unavailable
3. **Clear Error Messages**: Provide helpful rate limit error messages
4. **Proper Headers**: Include standard rate limit headers
5. **Monitoring**: Track rate limit metrics and patterns

### Implementation Best Practices

1. **Distributed Rate Limiting**: Use Redis for multi-instance deployments
2. **Sliding Windows**: More accurate than fixed windows
3. **Tiered Limits**: Different limits for different user types
4. **Provider Awareness**: Respect external API rate limits
5. **Client-Side Limiting**: Prevent unnecessary server requests

### Security Best Practices

1. **IP-Based Limiting**: Protect against distributed attacks
2. **Authentication Integration**: Higher limits for authenticated users
3. **Endpoint-Specific Limits**: Different limits for different endpoints
4. **Adaptive Limiting**: Reduce limits under high load
5. **Bypass Mechanisms**: Allow bypassing for critical operations

This comprehensive rate limiting guide ensures fair usage and protects ChatGPT Web from abuse while maintaining good user experience.
