import { describe, expect, it } from 'vitest'
import type { TransportRequest } from '../transport/types.js'
import {
  isTrustedForwardedHttps,
  parseTrustedProxyConfig,
  readForwardedClientIp,
} from './proxy-trust.js'

function createNativeRequest(headers: Record<string, string>, remoteAddress = 'trusted-proxy-hop') {
  return {
    headers,
    socket: {
      remoteAddress,
    },
  }
}

function createTransportRequest(
  headers: Record<string, string>,
  nativeRequest: Record<string, unknown>,
): TransportRequest {
  const headerMap = new Headers(Object.entries(headers))

  return {
    method: 'GET',
    path: '/health',
    url: new URL('https://example.com/health'),
    headers: headerMap,
    body: null,
    ip: '127.0.0.1',
    _nativeRequest: nativeRequest,
    getHeader(name: string) {
      return headerMap.get(name) || undefined
    },
    getQuery() {
      return undefined
    },
  }
}

describe('proxy trust utilities', () => {
  it('parses numeric TRUST_PROXY hop counts', () => {
    expect(parseTrustedProxyConfig('1')).toBe(1)
    expect(parseTrustedProxyConfig('2')).toBe(2)
  })

  it('distinguishes TRUST_PROXY=true from TRUST_PROXY=loopback', () => {
    expect(parseTrustedProxyConfig('true')).toBe(true)
    expect(parseTrustedProxyConfig('loopback')).toEqual(['127.0.0.1', '::1'])
  })

  it('uses numeric hop counts to extract the first untrusted forwarded IP', () => {
    const nativeRequest = createNativeRequest(
      {
        'x-forwarded-for': '198.51.100.8, 203.0.113.10, 192.0.2.44',
      },
      'trusted-proxy-hop',
    )

    expect(readForwardedClientIp(nativeRequest as never, 1)).toBe('203.0.113.10')
    expect(readForwardedClientIp(nativeRequest as never, 2)).toBe('198.51.100.8')
  })

  it('trusts forwarded HTTPS headers for non-loopback proxies when TRUST_PROXY=true', () => {
    const req = createTransportRequest(
      {
        'x-forwarded-proto': 'https',
      },
      createNativeRequest(
        {
          'x-forwarded-proto': 'https',
        },
        '10.0.0.10',
      ),
    )

    expect(isTrustedForwardedHttps(req, true)).toBe(true)
  })

  it('treats direct TLS requests as HTTPS even without proxy headers', () => {
    const req = createTransportRequest(
      {},
      {
        socket: {
          remoteAddress: 'direct-tls-socket',
          encrypted: true,
        },
      },
    )

    expect(isTrustedForwardedHttps(req, false)).toBe(true)
  })
})
