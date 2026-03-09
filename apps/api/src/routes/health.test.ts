/**
 * Health Route Tests
 */

import { describe, expect, it } from 'vitest'
import { createMockRequest, createMockResponse } from '../test/test-helpers.js'
import { healthHandler } from './health.js'

async function executeHealthRequest() {
  const req = createMockRequest({ path: '/api/health' })
  const res = createMockResponse()

  await healthHandler(req, res)

  return res._capture
}

describe('Health Route', () => {
  it('should return 200 with health data', async () => {
    const response = await executeHealthRequest()

    expect(response.statusCode).toBe(200)
    expect(response.body).toMatchObject({
      uptime: expect.any(Number),
      message: 'OK',
      timestamp: expect.any(Number),
    })
  })

  it('should return uptime greater than 0', async () => {
    const response = await executeHealthRequest()

    expect(response.body).toHaveProperty('uptime')
    expect((response.body as { uptime: number }).uptime).toBeGreaterThan(0)
  })
})
