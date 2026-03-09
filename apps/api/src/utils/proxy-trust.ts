import type { IncomingMessage } from 'node:http'
import type { Http2ServerRequest } from 'node:http2'
import type { TransportRequest } from '../transport/types.js'

export type TrustedProxyConfig = boolean | string[]

const LOOPBACK_ADDRESSES = new Set(['127.0.0.1', '::1'])

export function parseTrustedProxyConfig(value: string | undefined): TrustedProxyConfig {
  if (!value || value.toLowerCase() === 'false') {
    return false
  }

  const normalizedValue = value.toLowerCase()
  if (normalizedValue === 'true' || normalizedValue === 'loopback') {
    return true
  }

  return value
    .split(',')
    .map(entry => normalizeIpAddress(entry.trim()))
    .filter(Boolean)
}

export function normalizeIpAddress(value: string | undefined): string {
  if (!value) {
    return ''
  }

  if (value.startsWith('::ffff:')) {
    return value.slice('::ffff:'.length)
  }

  return value
}

export function isTrustedProxyAddress(
  remoteAddress: string | undefined,
  trustedProxy: TrustedProxyConfig,
): boolean {
  const normalizedRemoteAddress = normalizeIpAddress(remoteAddress)
  if (!normalizedRemoteAddress) {
    return false
  }

  if (trustedProxy === true) {
    return LOOPBACK_ADDRESSES.has(normalizedRemoteAddress)
  }

  if (Array.isArray(trustedProxy)) {
    return trustedProxy.includes(normalizedRemoteAddress)
  }

  return false
}

export function readForwardedClientIp(
  req: IncomingMessage | Http2ServerRequest,
  trustedProxy: TrustedProxyConfig,
): string | undefined {
  if (!isTrustedProxyAddress(req.socket.remoteAddress, trustedProxy)) {
    return undefined
  }

  const forwarded = req.headers['x-forwarded-for']
  if (forwarded) {
    const value = Array.isArray(forwarded) ? forwarded[0] : forwarded
    const firstForwardedIp = value.split(',')[0]?.trim()
    if (firstForwardedIp) {
      return normalizeIpAddress(firstForwardedIp)
    }
  }

  const realIp = req.headers['x-real-ip']
  if (realIp) {
    const value = Array.isArray(realIp) ? realIp[0] : realIp
    return normalizeIpAddress(value)
  }

  return undefined
}

export function isTrustedForwardedHttps(
  req: TransportRequest,
  trustedProxy: TrustedProxyConfig,
): boolean {
  if (trustedProxy === false) {
    return false
  }

  const nativeRequest = req._nativeRequest as (IncomingMessage | Http2ServerRequest) | undefined

  if (!isTrustedProxyAddress(nativeRequest?.socket?.remoteAddress, trustedProxy)) {
    return false
  }

  return req.getHeader('x-forwarded-proto') === 'https'
}
