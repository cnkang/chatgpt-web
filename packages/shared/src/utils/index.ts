/**
 * Shared utility functions
 * Framework-agnostic utilities used across frontend and backend
 */

// ============================================================================
// Type Checking Utilities
// ============================================================================

export function isNumber(value: unknown): value is number {
  return Object.prototype.toString.call(value) === '[object Number]'
}

export function isString(value: unknown): value is string {
  return Object.prototype.toString.call(value) === '[object String]'
}

export function isNotEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

export function isBoolean(value: unknown): value is boolean {
  return Object.prototype.toString.call(value) === '[object Boolean]'
}

export function isNull(value: unknown): value is null {
  return Object.prototype.toString.call(value) === '[object Null]'
}

export function isUndefined(value: unknown): value is undefined {
  return Object.prototype.toString.call(value) === '[object Undefined]'
}

export function isObject(value: unknown): value is object {
  return Object.prototype.toString.call(value) === '[object Object]'
}

export function isArray<T = unknown>(value: unknown): value is T[] {
  return Object.prototype.toString.call(value) === '[object Array]'
}

export function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return Object.prototype.toString.call(value) === '[object Function]'
}

export function isDate(value: unknown): value is Date {
  return Object.prototype.toString.call(value) === '[object Date]'
}

export function isRegExp(value: unknown): value is RegExp {
  return Object.prototype.toString.call(value) === '[object RegExp]'
}

export function isPromise<T = unknown>(value: unknown): value is Promise<T> {
  return Object.prototype.toString.call(value) === '[object Promise]'
}

export function isSet<T = unknown>(value: unknown): value is Set<T> {
  return Object.prototype.toString.call(value) === '[object Set]'
}

export function isMap<K = unknown, V = unknown>(value: unknown): value is Map<K, V> {
  return Object.prototype.toString.call(value) === '[object Map]'
}

export function isFile(value: unknown): value is File {
  return Object.prototype.toString.call(value) === '[object File]'
}

// ============================================================================
// Date and Time Utilities
// ============================================================================

export function getCurrentDate(): string {
  const date = new Date()
  const day = date.getDate()
  const month = date.getMonth() + 1
  const year = date.getFullYear()
  return `${year}-${month}-${day}`
}

export function formatTimestamp(date: Date): string {
  return date.toISOString()
}

export function parseTimestamp(timestamp: string): Date {
  return new Date(timestamp)
}

export function isValidDate(date: Date): boolean {
  return date instanceof Date && !Number.isNaN(date.getTime())
}

// ============================================================================
// String Utilities
// ============================================================================

const RANDOM_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'
const UINT32_MAX_PLUS_ONE = 0x1_0000_0000

function getRandomFraction(): number {
  const randomBuffer = new Uint32Array(1)
  globalThis.crypto.getRandomValues(randomBuffer)
  return randomBuffer[0] / UINT32_MAX_PLUS_ONE
}

export function generateId(): string {
  const randomPart = Array.from(
    { length: 10 },
    () => RANDOM_ALPHABET[Math.floor(getRandomFraction() * RANDOM_ALPHABET.length)],
  ).join('')
  return `${randomPart}${Date.now().toString(36)}`
}

export function generateUUID(): string {
  return globalThis.crypto.randomUUID()
}

export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return `${str.substring(0, maxLength - 3)}...`
}

export function sanitizeString(str: string): string {
  return str.trim().replaceAll(/\s+/g, ' ')
}

// ============================================================================
// API Key and Token Utilities
// ============================================================================

export function validateApiKey(key: string): boolean {
  if (!isNotEmptyString(key)) return false

  // OpenAI API key patterns
  const openaiPatterns = [
    /^sk-[a-zA-Z0-9]{48}$/, // Standard OpenAI API key
    /^sk-proj-[a-zA-Z0-9]{48}$/, // Project-based OpenAI API key
  ]

  return openaiPatterns.some(pattern => pattern.test(key))
}

export function validateAzureApiKey(key: string): boolean {
  return isNotEmptyString(key) && key.length >= 32
}

export function maskApiKey(key: string): string {
  if (!isNotEmptyString(key)) return ''

  if (key.startsWith('sk-')) {
    return key.startsWith('sk-proj-') ? 'sk-proj-****' : 'sk-****'
  }

  if (key.length > 8) {
    return `${key.substring(0, 4)}****${key.substring(key.length - 4)}`
  }

  return '****'
}

export function validateBearerToken(token: string): boolean {
  const bearerPattern = /^Bearer [\w\-.]+$/
  return bearerPattern.test(token)
}

// ============================================================================
// URL and Endpoint Utilities
// ============================================================================

export function isValidUrl(url: string): boolean {
  return URL.canParse(url)
}

export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.toString().replace(/\/$/, '') // Remove trailing slash
  } catch {
    return url
  }
}

export function buildApiUrl(
  baseUrl: string,
  path: string,
  params?: Record<string, string>,
): string {
  const normalizedBase = normalizeUrl(baseUrl)
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  let url = `${normalizedBase}${normalizedPath}`

  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams(params)
    url += `?${searchParams.toString()}`
  }

  return url
}

// ============================================================================
// Object Utilities
// ============================================================================

export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj) as T
  if (Array.isArray(obj)) return obj.map(item => deepClone(item)) as T
  if (typeof obj === 'object') {
    const cloned = {} as T
    for (const key in obj) {
      if (Object.hasOwn(obj, key)) {
        cloned[key] = deepClone(obj[key])
      }
    }
    return cloned
  }
  return obj
}

export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj }
  for (const key of keys) {
    delete result[key]
  }
  return result
}

export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key]
    }
  }
  return result
}

export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.length === 0
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

// ============================================================================
// Error Utilities
// ============================================================================

export function createError(
  message: string,
  code?: string,
  statusCode?: number,
): Error & {
  code?: string
  statusCode?: number
} {
  const error = new Error(message) as Error & { code?: string; statusCode?: number }
  if (code) error.code = code
  if (statusCode) error.statusCode = statusCode
  return error
}

export function isErrorWithCode(error: unknown): error is Error & { code: string } {
  return error instanceof Error && 'code' in error && typeof error.code === 'string'
}

export function isErrorWithStatusCode(error: unknown): error is Error & { statusCode: number } {
  return error instanceof Error && 'statusCode' in error && typeof error.statusCode === 'number'
}

// ============================================================================
// Validation Utilities
// ============================================================================

export function validateTemperature(temperature: number): boolean {
  return isNumber(temperature) && temperature >= 0 && temperature <= 2
}

export function validateTopP(topP: number): boolean {
  return isNumber(topP) && topP >= 0 && topP <= 1
}

export function validateMaxTokens(maxTokens: number): boolean {
  return isNumber(maxTokens) && maxTokens > 0 && maxTokens <= 262144
}

export function validateModel(model: string): boolean {
  return isNotEmptyString(model) && model.length <= 100
}

// ============================================================================
// Array Utilities
// ============================================================================

export function unique<T>(array: T[]): T[] {
  return [...new Set(array)]
}

export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

export function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(getRandomFraction() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// ============================================================================
// Performance Utilities
// ============================================================================

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | undefined

  return (...args: Parameters<T>) => {
    const later = () => {
      timeout = undefined
      func(...args)
    }

    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle: boolean

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}
