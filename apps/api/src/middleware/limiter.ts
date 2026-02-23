import { isNotEmptyString } from '@chatgpt-web/shared'
import { rateLimit } from 'express-rate-limit'

const { MAX_REQUEST_PER_HOUR } = process.env

const maxCount =
  isNotEmptyString(MAX_REQUEST_PER_HOUR) && !Number.isNaN(Number(MAX_REQUEST_PER_HOUR))
    ? Number.parseInt(MAX_REQUEST_PER_HOUR, 10)
    : 100 // Default: 100 requests per hour per IP

const windowMs = 60 * 60 * 1000 // 1 hour window

const limiter = rateLimit({
  windowMs,
  max: maxCount,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'Fail',
    message: `Too many requests from this IP, please try again after ${Math.ceil(windowMs / (60 * 1000))} minutes`,
    data: null,
  },
})

/**
 * Stricter rate limiter for authentication endpoints.
 * Security: Prevents brute-force attacks against the /verify endpoint
 * by limiting to 10 attempts per 15-minute window per IP.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute window
  max: 10, // 10 attempts per IP per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'Fail',
    message: 'Too many authentication attempts, please try again after 15 minutes',
    data: null,
  },
})

export { authLimiter, limiter }
