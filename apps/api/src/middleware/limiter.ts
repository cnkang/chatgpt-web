import type { Request, Response } from 'express'
import { rateLimit } from 'express-rate-limit'
import { isNotEmptyString } from '../utils/is'

const MAX_REQUEST_PER_HOUR = process.env.MAX_REQUEST_PER_HOUR

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

export { limiter }
