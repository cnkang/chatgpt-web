import { isNotEmptyString } from '@chatgpt-web/shared'
import type { NextFunction, Request, Response } from 'express'
import { timingSafeEqual } from 'node:crypto'

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) {
    // Compare against self so the time is still constant for the length of bufA
    timingSafeEqual(bufA, bufA)
    return false
  }
  return timingSafeEqual(bufA, bufB)
}

async function auth(req: Request, res: Response, next: NextFunction) {
  const authSecretKey = process.env.AUTH_SECRET_KEY
  if (isNotEmptyString(authSecretKey)) {
    try {
      const authorization = req.header('Authorization')
      const token = authorization?.replace('Bearer ', '').trim() ?? ''
      if (!authorization || !safeEqual(token, authSecretKey.trim())) {
        throw new Error('Error: No access rights')
      }
      return next()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please authenticate.'
      return res.status(401).send({
        status: 'Unauthorized',
        message,
        data: null,
      })
    }
  } else {
    return next()
  }
}

export { auth, safeEqual }
