import { createHash, timingSafeEqual } from 'crypto'
import { isNotEmptyString } from './is'

const FALLBACK_ERROR_MESSAGE = 'Request failed, please try again later.'

function sanitizeText(input: string): string {
  return input
    .replace(/(Bearer\s+)[^\s"'`]+/gi, '$1***')
    .replace(/(sk-[A-Za-z0-9_-]{8,})/g, 'sk-***')
    .replace(/((?:api[_-]?key|access[_-]?token|auth[_-]?secret[_-]?key|password)\s*[:=]\s*['"]?)[^'",\s}]+/gi, '$1***')
    .replace(/(https?:\/\/)([^/\s:@]+):([^@\s/]+)@/gi, '$1***:***@')
}

export function sanitizeErrorMessage(error: unknown, fallback = FALLBACK_ERROR_MESSAGE): string {
  if (isNotEmptyString(error))
    return sanitizeText(error)

  if (error && typeof error === 'object' && 'message' in error && isNotEmptyString((error as { message?: string }).message))
    return sanitizeText((error as { message: string }).message)

  return fallback
}

export function logSanitizedError(scope: string, error: unknown) {
  const safeMessage = sanitizeErrorMessage(error)
  global.console.error(`[${scope}] ${safeMessage}`)
}

export function maskConfigured(value?: string) {
  return isNotEmptyString(value) ? 'configured' : '-'
}

export function safeEqualSecret(expected: string, provided: string) {
  const expectedBuffer = createHash('sha256').update(expected.trim()).digest()
  const providedBuffer = createHash('sha256').update(provided.trim()).digest()
  return timingSafeEqual(expectedBuffer, providedBuffer)
}
