import type { IncomingMessage } from 'node:http'
import type { Http2ServerRequest } from 'node:http2'
import type { TransportRequest } from '../transport/types.js'

export type TrustedProxyConfig = boolean | number | string[]

const LOOPBACK_ADDRESSES = new Set(['127.0.0.1', '::1'])

export function parseTrustedProxyConfig(value: string | undefined): TrustedProxyConfig {
  if (!value || value.toLowerCase() === 'false') {
    return false
  }

  const normalizedValue = value.toLowerCase()
  if (normalizedValue === 'true' || normalizedValue === 'loopback') {
    return true
  }

  if (/^\d+$/.test(value.trim())) {
    return Number.parseInt(value, 10)
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

  if (typeof trustedProxy === 'number') {
    return trustedProxy > 0
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
    const forwardedIps = value
      .split(',')
      .map(entry => normalizeIpAddress(entry.trim()))
      .filter(Boolean)

    if (forwardedIps.length > 0) {
      if (typeof trustedProxy === 'number') {
        const clientIndex = Math.max(0, forwardedIps.length - trustedProxy)
        return forwardedIps[clientIndex]
      }

      return forwardedIps[0]
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
  const nativeRequest = req._nativeRequest as (IncomingMessage | Http2ServerRequest) | undefined
  if (isDirectHttpsRequest(nativeRequest)) {
    return true
  }

  if (trustedProxy === false) {
    return false
  }

  if (!isTrustedProxyAddress(nativeRequest?.socket?.remoteAddress, trustedProxy)) {
    return false
  }

  const forwardedProto = req.getHeader('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase()
  return forwardedProto === 'https'
}

function isDirectHttpsRequest(req: (IncomingMessage | Http2ServerRequest) | undefined): boolean {
  return Boolean(req?.socket && 'encrypted' in req.socket && req.socket.encrypted)
}
