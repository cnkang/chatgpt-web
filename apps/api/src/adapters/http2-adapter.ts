/**
 * HTTP/2 Adapter Implementation
 *
 * Translates between Node.js native HTTP/2 APIs and Transport Layer interfaces.
 * Supports HTTP/2 with TLS, HTTP/2 cleartext (h2c), and HTTP/1.1 fallback.
 *
 * @module adapters/http2-adapter
 */

import type { Server as HttpServer, IncomingMessage, ServerResponse } from 'node:http'
import { createServer as createHttpServer } from 'node:http'
import type {
  Http2SecureServer,
  Http2Server,
  Http2ServerRequest,
  Http2ServerResponse,
} from 'node:http2'
import { createSecureServer, createServer } from 'node:http2'
import type {
  MiddlewareChain,
  Route,
  Router,
  TransportRequest,
  TransportResponse,
} from '../transport/index.js'
import {
  normalizeIpAddress,
  readForwardedClientIp,
  type TrustedProxyConfig,
} from '../utils/proxy-trust.js'
import { logger } from '../utils/logger.js'

/**
 * TLS configuration for HTTPS/HTTP2
 */
export interface TLSConfig {
  /** Private key (PEM format) */
  key: Buffer | string
  /** Certificate (PEM format) */
  cert: Buffer | string
}

/**
 * HTTP/2 Adapter configuration options
 */
export interface AdapterOptions {
  /** Enable HTTP/2 protocol (if false, uses HTTP/1.1 only) */
  http2?: boolean

  /** TLS configuration (required for HTTPS/HTTP2 with browser support) */
  tls?: TLSConfig

  /** Body size limits */
  bodyLimit?: {
    /** Maximum JSON body size in bytes (default: 1MB) */
    json?: number
    /** Maximum URL-encoded body size in bytes (default: 32KB) */
    urlencoded?: number
  }

  /** Static file directory (optional) */
  staticDir?: string

  /** Trusted proxy configuration for forwarded headers */
  trustProxy?: TrustedProxyConfig
}

type NativeServer = Http2SecureServer | Http2Server | HttpServer
type NativeResponse = ServerResponse | Http2ServerResponse

interface AdapterErrorContext {
  details?: unknown
  errorCode: string
  errorType: string
  message: string
  statusCode: number
}

/**
 * HTTP/2 Adapter
 *
 * Implements the Transport Layer abstraction using Node.js native HTTP/2 module.
 * Supports HTTP/2 with TLS (recommended), HTTP/2 cleartext (h2c), and HTTP/1.1 fallback.
 */
export class HTTP2Adapter {
  private readonly server: NativeServer
  private readonly router: Router
  private readonly middleware: MiddlewareChain
  private readonly options: Required<Omit<AdapterOptions, 'tls' | 'staticDir'>> & {
    tls?: TLSConfig
    staticDir?: string
    trustProxy: TrustedProxyConfig
  }

  /**
   * Create HTTP/2 Adapter
   *
   * @param router - Router instance for route matching
   * @param middleware - Global middleware chain
   * @param options - Adapter configuration options
   */
  constructor(router: Router, middleware: MiddlewareChain, options: AdapterOptions = {}) {
    this.router = router
    this.middleware = middleware

    // Set default options
    this.options = {
      http2: options.http2 ?? true,
      tls: options.tls,
      bodyLimit: {
        json: options.bodyLimit?.json ?? 1048576, // 1MB default
        urlencoded: options.bodyLimit?.urlencoded ?? 32768, // 32KB default
      },
      staticDir: options.staticDir,
      trustProxy: options.trustProxy ?? false,
    }

    // Create server based on configuration
    this.server = this.createServer()

    // Setup request handler
    this.setupRequestHandler()
  }

  /**
   * Create HTTP server based on configuration
   *
   * Priority:
   * 1. HTTP/2 with TLS (createSecureServer) - recommended for production
   * 2. HTTP/2 cleartext (createServer) - limited browser support
   * 3. HTTP/1.1 (createHttpServer) - fallback
   *
   * @returns HTTP server instance
   */
  private createServer(): NativeServer {
    if (this.options.http2 && this.options.tls) {
      // HTTP/2 with TLS (HTTPS) - recommended for production
      // Supports HTTP/1.1 fallback via ALPN negotiation
      return createSecureServer({
        key: this.options.tls.key,
        cert: this.options.tls.cert,
        allowHTTP1: true, // Enable HTTP/1.1 fallback for compatibility
      })
    }

    if (this.options.http2) {
      // HTTP/2 cleartext (h2c) - limited browser support
      // Browsers typically require TLS for HTTP/2
      console.warn(
        'Warning: HTTP/2 without TLS (h2c) has limited browser support. ' +
          'Configure TLS for production use.',
      )
      return createServer()
    }

    // HTTP/1.1 fallback
    return createHttpServer()
  }

  /**
   * Setup request handler
   *
   * Attaches request event listener that:
   * 1. Wraps native request/response in Transport Layer interfaces
   * 2. Executes global middleware chain
   * 3. Matches and executes route handler
   * 4. Handles errors
   */
  private setupRequestHandler(): void {
    this.server.on('request', async (req, res) => {
      try {
        // Wrap native request/response in Transport Layer interfaces
        const transportReq = this.wrapRequest(req)
        const transportRes = this.wrapResponse(res)

        // Execute global middleware chain
        await this.middleware.execute(transportReq, transportRes)

        // Check if response was already sent by middleware
        if (transportRes.finished || transportRes.headersSent) {
          return
        }

        // Match request to route
        const route = this.router.match(transportReq.method, transportReq.path)

        if (route) {
          // Execute route-specific middleware
          await this.executeRouteMiddleware(route, transportReq, transportRes)

          // Check if response was sent by route middleware
          if (transportRes.finished || transportRes.headersSent) {
            return
          }

          // Execute route handler
          await route.handler(transportReq, transportRes)
        } else {
          // 404 Not Found
          transportRes.status(404).json({
            status: 'Fail',
            message: 'Not Found',
            data: null,
          })
        }
      } catch (error) {
        this.handleError(error, res)
      }
    })
  }

  /**
   * Execute route-specific middleware
   *
   * @param route - Matched route
   * @param req - Transport request
   * @param res - Transport response
   */
  private async executeRouteMiddleware(
    route: Route,
    req: TransportRequest,
    res: TransportResponse,
  ): Promise<void> {
    for (const mw of route.middleware) {
      // Check if response was already sent
      if (res.finished || res.headersSent) {
        return
      }

      // Execute middleware
      await new Promise<void>((resolve, reject) => {
        let nextCalled = false

        const next = (error?: Error) => {
          if (nextCalled) {
            return
          }
          nextCalled = true

          if (error) {
            reject(error)
          } else {
            resolve()
          }
        }

        try {
          const result = mw(req, res, next)

          if (result instanceof Promise) {
            result
              .then(() => {
                if (!nextCalled) {
                  nextCalled = true
                  resolve()
                }
              })
              .catch(reject)
          } else {
            setImmediate(() => {
              if (!nextCalled) {
                nextCalled = true
                resolve()
              }
            })
          }
        } catch (error) {
          reject(error)
        }
      })

      if (!res.finished && !res.headersSent) {
        continue
      }

      return
    }
  }

  /**
   * Wrap native request in Transport Layer interface
   *
   * @param req - Native HTTP request
   * @returns Transport request
   */
  private wrapRequest(req: IncomingMessage | Http2ServerRequest): TransportRequest {
    // Parse URL with query parameters
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)

    // Convert headers to Headers object
    const headers = new Headers()
    for (const [key, value] of Object.entries(req.headers)) {
      if (!key.startsWith(':') && value !== undefined) {
        // Handle both string and string[] header values
        const headerValue = Array.isArray(value) ? value.join(', ') : value
        headers.set(key, headerValue)
      }
    }

    // Extract client IP address
    const ip = this.extractIP(req)

    return {
      method: req.method || 'GET',
      path: url.pathname,
      url,
      headers,
      body: null, // Populated by body parser middleware
      ip,
      session: undefined, // Populated by session middleware
      _nativeRequest: req, // Internal: expose native request for body parser middleware

      getHeader(name: string): string | undefined {
        return headers.get(name) || undefined
      },

      getQuery(name: string): string | undefined {
        return url.searchParams.get(name) || undefined
      },
    }
  }

  /**
   * Extract client IP address from request
   *
   * Checks headers in order:
   * 1. X-Forwarded-For (proxy/load balancer)
   * 2. X-Real-IP (alternative proxy header)
   * 3. Socket remote address (direct connection)
   *
   * @param req - Native HTTP request
   * @returns Client IP address
   */
  private extractIP(req: IncomingMessage | Http2ServerRequest): string {
    const forwardedClientIp = readForwardedClientIp(req, this.options.trustProxy)
    if (forwardedClientIp) {
      return forwardedClientIp
    }

    // Fall back to socket address
    return normalizeIpAddress(req.socket.remoteAddress) || '0.0.0.0'
  }

  /**
   * Wrap native response in Transport Layer interface
   *
   * @param res - Native HTTP response
   * @returns Transport response
   */
  private wrapResponse(res: NativeResponse): TransportResponse {
    let statusCode = 200

    const wrapped: TransportResponse = {
      status(code: number) {
        statusCode = code
        return this
      },

      setHeader(name: string, value: string | string[]) {
        res.setHeader(name, value)
        return this
      },

      getHeader(name: string) {
        const value = res.getHeader(name)
        // Node.js getHeader can return number for certain headers like Content-Length
        // Convert to string to match TransportResponse interface
        if (typeof value === 'number') {
          return String(value)
        }
        return value
      },

      json(data: unknown) {
        if (!res.headersSent) {
          res.statusCode = statusCode
          res.setHeader('Content-Type', 'application/json')
        }
        wrapped.end(JSON.stringify(data))
      },

      send(data: string | Buffer) {
        if (!res.headersSent) {
          res.statusCode = statusCode
          res.setHeader(
            'Content-Type',
            typeof data === 'string' ? 'text/plain' : 'application/octet-stream',
          )
        }
        wrapped.end(data)
      },

      write(chunk: string | Buffer) {
        if (!res.headersSent) {
          res.statusCode = statusCode
        }
        // Type assertion needed due to union type incompatibility
        return (res.write as (chunk: string | Buffer) => boolean)(chunk)
      },

      end(chunk?: string | Buffer) {
        if (!res.headersSent) {
          res.statusCode = statusCode
        }
        if (chunk === undefined) {
          res.end()
          return
        }

        // biome-ignore lint/suspicious/noExplicitAny: Node.js http2 response.end() accepts Buffer but types are restrictive
        res.end(chunk as any)
      },

      get headersSent() {
        return res.headersSent
      },

      get finished() {
        return res.writableEnded
      },
    }

    // Store reference to native response for logging middleware
    // biome-ignore lint/suspicious/noExplicitAny: Attaching internal property to wrapped response for middleware access
    ;(wrapped as any)._nativeResponse = res

    return wrapped
  }

  /**
   * Handle errors during request processing
   *
   * Maps errors to appropriate HTTP status codes and error response structure.
   * Follows the error mapping matrix from requirements:
   * - 400: Validation errors (invalid JSON, missing fields, invalid types)
   * - 401: Authentication errors (missing/invalid token)
   * - 413: Payload too large errors
   * - 429: Rate limit errors
   * - 500: Internal server errors
   * - 502: External API errors (OpenAI/Azure)
   * - 504: Timeout errors
   *
   * @param error - Error that occurred
   * @param res - Native HTTP response
   */
  // biome-ignore lint/suspicious/noExplicitAny: Native HTTP response type varies between HTTP/1.1 and HTTP/2
  private handleError(error: unknown, res: any): void {
    // Don't send error if response already sent
    if (res.headersSent || res.writableEnded) {
      logger.error('Error after response sent', { error: String(error) })
      return
    }

    const errorContext = this.buildErrorContext(error)

    // Log error with structured data using logger
    logger.error('Request error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      statusCode: errorContext.statusCode,
      errorCode: errorContext.errorCode,
    })

    // Build error response following the standard structure
    const errorResponse = {
      status: errorContext.statusCode < 500 ? 'Fail' : 'Error',
      message: errorContext.message,
      data: null,
      error: {
        code: errorContext.errorCode,
        type: errorContext.errorType,
        details: errorContext.statusCode < 500 ? errorContext.details : undefined,
        timestamp: new Date().toISOString(),
      },
    }

    // Send error response
    res.statusCode = errorContext.statusCode
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(errorResponse))
  }

  private buildErrorContext(error: unknown): AdapterErrorContext {
    const defaultContext: AdapterErrorContext = {
      errorCode: 'INTERNAL_ERROR',
      errorType: 'Error',
      message: 'Internal server error',
      statusCode: 500,
    }

    if (!(error instanceof Error)) {
      return defaultContext
    }

    const appErrorContext = this.readAppErrorContext(error)
    if (appErrorContext) {
      return appErrorContext
    }

    return this.readGenericErrorContext(error)
  }

  private readAppErrorContext(error: Error): AdapterErrorContext | null {
    // biome-ignore lint/suspicious/noExplicitAny: Type narrowing for AppError properties
    const appError = error as any
    if (!appError.type || !appError.statusCode) {
      return null
    }

    return {
      details: appError.details,
      errorCode: appError.type,
      errorType: error.constructor.name,
      message: this.getAppErrorMessage(error.message, appError.type, appError.statusCode),
      statusCode: appError.statusCode,
    }
  }

  private getAppErrorMessage(message: string, type: string, statusCode: number): string {
    if (statusCode < 500) {
      return message
    }

    if (type === 'TIMEOUT_ERROR') {
      return 'Request timeout'
    }

    if (type === 'EXTERNAL_API_ERROR' || type === 'NETWORK_ERROR') {
      return 'Upstream service request failed'
    }

    return 'Internal server error'
  }

  private readGenericErrorContext(error: Error): AdapterErrorContext {
    const errorMessage = error.message.toLowerCase()

    if (
      errorMessage.includes('request entity too large') ||
      errorMessage.includes('payload too large')
    ) {
      return this.createErrorContext(413, 'PAYLOAD_TOO_LARGE_ERROR', 'Request entity too large')
    }

    if (errorMessage.includes('invalid json')) {
      return this.createErrorContext(400, 'VALIDATION_ERROR', 'Invalid JSON payload')
    }

    if (errorMessage.includes('validation')) {
      return this.createErrorContext(400, 'VALIDATION_ERROR', error.message)
    }

    if (errorMessage.includes('authentication') || errorMessage.includes('no access rights')) {
      return this.createErrorContext(401, 'AUTHENTICATION_ERROR', error.message)
    }

    if (errorMessage.includes('rate limit')) {
      return this.createErrorContext(429, 'RATE_LIMIT_ERROR', 'Rate limit exceeded')
    }

    if (errorMessage.includes('upstream') || errorMessage.includes('external api')) {
      return this.createErrorContext(502, 'EXTERNAL_API_ERROR', 'Upstream service request failed')
    }

    if (errorMessage.includes('timeout')) {
      return this.createErrorContext(504, 'TIMEOUT_ERROR', 'Request timeout')
    }

    return {
      errorCode: 'INTERNAL_ERROR',
      errorType: error.constructor.name,
      message: 'Internal server error',
      statusCode: 500,
    }
  }

  private createErrorContext(
    statusCode: number,
    errorCode: string,
    message: string,
  ): AdapterErrorContext {
    return {
      errorCode,
      errorType: 'Error',
      message,
      statusCode,
    }
  }

  /**
   * Start listening for connections
   *
   * @param port - Port number to listen on
   * @param hostname - Hostname to bind to (default: '0.0.0.0')
   * @returns Promise that resolves when server is listening
   */
  listen(port: number, hostname = '0.0.0.0'): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(port, hostname, () => {
        resolve()
      })

      this.server.on('error', reject)
    })
  }

  /**
   * Stop accepting new connections and close server
   *
   * @returns Promise that resolves when server is closed
   */
  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.close(err => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  /**
   * Get the underlying server instance
   *
   * @returns Native HTTP server instance
   */
  getServer(): Http2SecureServer | Http2Server | HttpServer {
    return this.server
  }
}
