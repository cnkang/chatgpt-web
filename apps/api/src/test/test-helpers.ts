import { createServer } from 'node:net'
import { vi } from 'vitest'
import type { TransportRequest, TransportResponse } from '../transport/types.js'

export const TEST_REQUEST_ORIGIN = 'https://localhost'
export const HTTP_PROTOCOL = 'http'

interface MockRequestOptions {
  method?: string
  path?: string
  url?: string | URL
  headers?: Headers | Record<string, string> | Array<[string, string]>
  body?: unknown
  ip?: string
}

export interface MockResponseCapture {
  statusCode: number
  headers: Map<string, string | string[]>
  body: unknown
  finished: boolean
}

export interface MockTransportResponse extends TransportResponse {
  _capture: MockResponseCapture
}

export function createMockRequest(options: MockRequestOptions = {}): TransportRequest {
  const resolvedUrl =
    options.url instanceof URL
      ? new URL(options.url)
      : new URL(options.url ?? options.path ?? '/test', TEST_REQUEST_ORIGIN)

  const headers = new Headers(options.headers)

  return {
    method: options.method ?? 'GET',
    path: options.path ?? resolvedUrl.pathname,
    url: resolvedUrl,
    headers,
    body: options.body ?? null,
    ip: options.ip ?? '127.0.0.1',
    getHeader: (name: string) => headers.get(name) ?? undefined,
    getQuery: (name: string) => resolvedUrl.searchParams.get(name) ?? undefined,
  }
}

export function createMockResponse(): MockTransportResponse {
  const capture: MockResponseCapture = {
    statusCode: 200,
    headers: new Map<string, string | string[]>(),
    body: null,
    finished: false,
  }

  const response: MockTransportResponse = {
    _capture: capture,
    status: vi.fn((code: number) => {
      capture.statusCode = code
      return response
    }),
    setHeader: vi.fn((name: string, value: string | string[]) => {
      capture.headers.set(name.toLowerCase(), value)
      return response
    }),
    getHeader: vi.fn((name: string) => capture.headers.get(name.toLowerCase())),
    json: vi.fn((data: unknown) => {
      capture.body = data
      capture.finished = true
    }),
    send: vi.fn((data: string | Buffer) => {
      capture.body = data
      capture.finished = true
    }),
    write: vi.fn(() => true),
    end: vi.fn(() => {
      capture.finished = true
    }),
    headersSent: false,
    finished: false,
  }

  return response
}

export function buildHttpOrigin(host: string): string {
  return `${HTTP_PROTOCOL}://${host}`
}

export function buildIpv4Address(...octets: number[]): string {
  return octets.join('.')
}

export async function getAvailablePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = createServer()

    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        server.close(() => reject(new Error('Failed to allocate an ephemeral port')))
        return
      }

      const { port } = address
      server.close(error => {
        if (error) {
          reject(error)
          return
        }
        resolve(port)
      })
    })
  })
}
