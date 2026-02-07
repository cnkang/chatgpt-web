import { isNotEmptyString } from '../utils/is'
import { safeEqualSecret } from '../utils/security'

async function auth(req, res, next) {
  const AUTH_SECRET_KEY = process.env.AUTH_SECRET_KEY
  if (isNotEmptyString(AUTH_SECRET_KEY)) {
    const authorization = req.header('Authorization')
    const token = authorization?.replace(/^Bearer\s+/i, '').trim() ?? ''
    if (!token || !safeEqualSecret(AUTH_SECRET_KEY, token)) {
      res.status(401).send({ status: 'Unauthorized', message: 'Please authenticate.', data: null })
      return
    }
    next()
  }
  else {
    next()
  }
}

export { auth }
