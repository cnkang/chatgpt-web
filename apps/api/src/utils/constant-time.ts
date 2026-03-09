import { createHmac, timingSafeEqual } from 'node:crypto'

export function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)

  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA)
    return false
  }

  return timingSafeEqual(bufA, bufB)
}

export function signValue(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url')
}
