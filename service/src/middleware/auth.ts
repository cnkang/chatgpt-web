import type { RequestHandler } from 'express'
import { isNotEmptyString } from '../utils/is'
import { safeEqualSecret } from '../utils/security'

const auth: RequestHandler = (req, res, next) => {
  const authSecret = process.env.AUTH_SECRET_KEY
  if (!isNotEmptyString(authSecret)) {
    next()
    return
  }

  const authorization = req.header('Authorization')
  const token = authorization?.replace(/^Bearer\s+/i, '').trim() ?? ''

  if (!token || !safeEqualSecret(authSecret, token)) {
    res.status(401).send({ status: 'Unauthorized', message: 'Please authenticate.', data: null })
    return
  }

  next()
}

export { auth }
