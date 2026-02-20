/**
 * Retry logic and circuit breaker utilities
 * Implements exponential backoff, circuit breaker pattern, and timeout handling
 */

import { AppError, ErrorType } from './error-handler'

/**
 * Retry configuration interface
 */
export interface RetryConfig {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
  jitter: boolean
  retryableErrors: string[]
  timeoutMs?: number
}

/**
 * Default retry configuration
 */
export const defaultRetryConfig: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  jitter: true,
  retryableErrors: [
    ErrorType.NETWORK,
    ErrorType.TIMEOUT,
    ErrorType.EXTERNAL_API,
    'ECONNRESET',
    'ENOTFOUND',
    'ECONNREFUSED',
    'ETIMEDOUT',
  ],
}

/**
 * Circuit breaker states
 */
export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number
  recoveryTimeout: number
  monitoringPeriod: number
  expectedErrors: string[]
}

/**
 * Default circuit breaker configuration
 */
export const defaultCircuitConfig: CircuitBreakerConfig = {
  failureThreshold: 5,
  recoveryTimeout: 60000, // 1 minute
  monitoringPeriod: 10000, // 10 seconds
  expectedErrors: [ErrorType.NETWORK, ErrorType.TIMEOUT, ErrorType.EXTERNAL_API],
}

/**
 * Circuit breaker implementation
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED
  private failureCount: number = 0
  private lastFailureTime: number = 0
  private successCount: number = 0

  constructor(private config: CircuitBreakerConfig = defaultCircuitConfig) {}

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime < this.config.recoveryTimeout) {
        throw new AppError(
          'Circuit breaker is OPEN - service temporarily unavailable',
          ErrorType.EXTERNAL_API,
          503,
        )
      }
      this.state = CircuitState.HALF_OPEN
      this.successCount = 0
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure(error)
      throw error
    }
  }

  private onSuccess(): void {
    this.failureCount = 0

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++
      if (this.successCount >= 3) {
        // Require 3 successes to close
        this.state = CircuitState.CLOSED
      }
    }
  }

  private onFailure(error: unknown): void {
    const errorInfo = error as { type?: string; code?: string }
    const isExpectedError = this.config.expectedErrors.some(
      expectedError => errorInfo.type === expectedError || errorInfo.code === expectedError,
    )

    if (isExpectedError) {
      this.failureCount++
      this.lastFailureTime = Date.now()

      if (this.failureCount >= this.config.failureThreshold) {
        this.state = CircuitState.OPEN
      }
    }
  }

  /**
   * Get current circuit breaker status
   */
  getStatus() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      successCount: this.successCount,
    }
  }

  /**
   * Reset circuit breaker to closed state
   */
  reset(): void {
    this.state = CircuitState.CLOSED
    this.failureCount = 0
    this.lastFailureTime = 0
    this.successCount = 0
  }
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
): Promise<T> {
  const finalConfig = { ...defaultRetryConfig, ...config }
  let lastError: unknown

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      // Add timeout if specified
      if (finalConfig.timeoutMs) {
        return await withTimeout(fn(), finalConfig.timeoutMs)
      }

      return await fn()
    } catch (error) {
      lastError = error

      // Don't retry on the last attempt
      if (attempt === finalConfig.maxAttempts) {
        break
      }

      // Check if error is retryable
      const isRetryable = isRetryableError(error, finalConfig.retryableErrors)
      if (!isRetryable) {
        break
      }

      // Calculate delay with exponential backoff
      const delay = calculateDelay(attempt, finalConfig)

      console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, {
        error: error instanceof Error ? error.message : String(error),
        type: getErrorType(error) || 'unknown',
        attempt,
        maxAttempts: finalConfig.maxAttempts,
      })

      await sleep(delay)
    }
  }

  throw lastError
}

/**
 * Check if error is retryable
 */
function getErrorType(error: unknown): string | undefined {
  if (error && typeof error === 'object') {
    const typedError = error as { type?: string; code?: string; constructor?: { name?: string } }
    return typedError.type || typedError.code || typedError.constructor?.name
  }
  return undefined
}

function isRetryableError(error: unknown, retryableErrors: string[]): boolean {
  const errorType = getErrorType(error)
  return errorType ? retryableErrors.includes(errorType) : false
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.baseDelay * config.backoffMultiplier ** (attempt - 1)
  const cappedDelay = Math.min(exponentialDelay, config.maxDelay)

  if (config.jitter) {
    // Add random jitter (±25%)
    const jitterRange = cappedDelay * 0.25
    const jitter = (Math.random() - 0.5) * 2 * jitterRange
    return Math.max(0, cappedDelay + jitter)
  }

  return cappedDelay
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Timeout wrapper for promises
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new AppError(`Operation timed out after ${timeoutMs}ms`, ErrorType.TIMEOUT, 504))
    }, timeoutMs)

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeoutId))
  })
}

/**
 * Batch retry utility for multiple operations
 */
export async function retryBatch<T>(
  operations: Array<() => Promise<T>>,
  config: Partial<RetryConfig> = {},
): Promise<Array<T | Error>> {
  const results = await Promise.allSettled(operations.map(op => retryWithBackoff(op, config)))

  return results.map(result => (result.status === 'fulfilled' ? result.value : result.reason))
}

/**
 * Rate-limited retry utility
 */
export class RateLimitedRetry {
  private queue: Array<() => Promise<unknown>> = []
  private processing = false
  private lastExecutionTime = 0

  constructor(
    private minInterval: number = 1000, // Minimum time between requests
  ) {}

  async execute<T>(fn: () => Promise<T>, config?: Partial<RetryConfig>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await retryWithBackoff(fn, config)
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })

      this.processQueue()
    })
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return
    }

    this.processing = true

    while (this.queue.length > 0) {
      const now = Date.now()
      const timeSinceLastExecution = now - this.lastExecutionTime

      if (timeSinceLastExecution < this.minInterval) {
        await sleep(this.minInterval - timeSinceLastExecution)
      }

      const operation = this.queue.shift()
      if (operation) {
        this.lastExecutionTime = Date.now()

        await operation()
      }
    }

    this.processing = false
  }

  getQueueLength(): number {
    return this.queue.length
  }
}
