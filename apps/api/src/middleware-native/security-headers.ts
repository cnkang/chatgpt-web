/**
 * Security headers middleware for native routing
 * Implements comprehensive security headers without Helmet dependency
 */

import type { MiddlewareHandler } from '../transport/types.js'

/**
 * Creates security headers middleware with environment-aware CSP configuration.
 *
 * CSP justification for relaxed directives:
 * - unsafe-eval in script-src: Required by Mermaid diagram rendering library
 *   which uses dynamic code evaluation for diagram parsing.
 * - unsafe-inline in script-src: Required for the inline theme-detection script
 *   in index.html that prevents flash of unstyled content (FOUC). Vite may also
 *   inject inline scripts during build. A nonce-based approach would require
 *   server-side rendering of the HTML which is not supported in this static SPA.
 * - unsafe-inline in style-src: Required by Naive UI component library which
 *   injects dynamic inline styles for component rendering.
 */
export function createSecurityHeadersMiddleware(): MiddlewareHandler {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const isProduction = process.env.NODE_ENV === 'production'

  return async (req, res, next) => {
    // Content Security Policy
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // unsafe-eval for Mermaid, unsafe-inline for theme script
      "style-src 'self' 'unsafe-inline'", // unsafe-inline for Naive UI
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      isDevelopment
        ? "connect-src 'self' https: wss: http://localhost:* ws://localhost:*"
        : "connect-src 'self' https: wss:",
      "worker-src 'self' blob:",
      "child-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "script-src-attr 'none'",
    ]

    if (isProduction) {
      cspDirectives.push('upgrade-insecure-requests')
    }

    res.setHeader('Content-Security-Policy', cspDirectives.join('; '))

    // X-Content-Type-Options: Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff')

    // X-Frame-Options: Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY')

    // Referrer-Policy: Control referrer information
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')

    // X-Permitted-Cross-Domain-Policies: Restrict cross-domain policy files
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none')

    // Strict-Transport-Security: only emit when the request is effectively HTTPS.
    const isHttpsRequest = req.getHeader('x-forwarded-proto') === 'https'
    if (isProduction && isHttpsRequest) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
    }

    next()
  }
}
