import type { NextFunction, Request, Response } from 'express'
import { isNotEmptyString } from '../utils/is'

async function auth(req: Request, res: Response, next: NextFunction) {
  const authSecretKey = process.env.AUTH_SECRET_KEY
  if (isNotEmptyString(authSecretKey)) {
    try {
      const authorization = req.header('Authorization')
      if (!authorization || authorization.replace('Bearer ', '').trim() !== authSecretKey.trim()) {
        throw new Error('Error: 无访问权限 | No access rights')
      }
      next()
    }
    catch (error) {
      const message = error instanceof Error ? error.message : 'Please authenticate.'
      res.send({
        status: 'Unauthorized',
        message,
        data: null,
      })
    }
  }
  else {
    next()
  }
}

export { auth }
