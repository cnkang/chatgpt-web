import { rateLimit } from 'express-rate-limit'
import { isNotEmptyString } from '../utils/is'

const MAX_REQUEST_PER_HOUR = process.env.MAX_REQUEST_PER_HOUR
const MAX_VERIFY_PER_HOUR = process.env.MAX_VERIFY_PER_HOUR

function parseMaxCount(value: string | undefined, defaultValue: number) {
  if (!isNotEmptyString(value))
    return defaultValue
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed) || parsed < 0)
    return defaultValue
  return parsed
}

function createLimiter(max: number, message: string) {
  if (max === 0) {
    return (_req, _res, next) => {
      next()
    }
  }

  return rateLimit({
    windowMs: 60 * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 429,
    handler: (_req, res) => {
      res.status(429).send({ status: 'Fail', message, data: null })
    },
  })
}

const requestMaxCount = parseMaxCount(MAX_REQUEST_PER_HOUR, 60)
const verifyMaxCount = parseMaxCount(MAX_VERIFY_PER_HOUR, 20)

const limiter = createLimiter(requestMaxCount, 'Too many requests from this IP in 1 hour')
const verifyLimiter = createLimiter(verifyMaxCount, 'Too many verification attempts from this IP in 1 hour')

export { limiter, verifyLimiter }
