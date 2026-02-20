import type { Request, Response } from 'express'
import { rateLimit } from 'express-rate-limit'
import { isNotEmptyString } from '../utils/is'

const { MAX_REQUEST_PER_HOUR } = process.env

const maxCount =
  isNotEmptyString(MAX_REQUEST_PER_HOUR) && !Number.isNaN(Number(MAX_REQUEST_PER_HOUR))
    ? Number.parseInt(MAX_REQUEST_PER_HOUR, 10)
    : 100 // 如果没有设置环境变量，默认限制每小时每IP 100条请求

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时窗口
  max: maxCount,
  standardHeaders: true,
  legacyHeaders: false,
  message: async (_req: Request, res: Response) => {
    res.status(429).json({
      status: 'Fail',
      message: `Too many requests from this IP, please try again after ${Math.ceil(60)} minutes`,
      data: null,
    })
  },
})

/**
 * Stricter rate limiter for authentication endpoints.
 * Security: Prevents brute-force attacks against the /verify endpoint
 * by limiting to 10 attempts per 15-minute window per IP.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟窗口
  max: 10, // 每个IP每15分钟最多10次尝试
  standardHeaders: true,
  legacyHeaders: false,
  message: async (_req: Request, res: Response) => {
    res.status(429).json({
      status: 'Fail',
      message: 'Too many authentication attempts, please try again after 15 minutes',
      data: null,
    })
  },
})

export { authLimiter, limiter }
