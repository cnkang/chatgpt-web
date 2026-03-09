/**
 * Transport Layer Abstraction Types
 *
 * Framework-agnostic HTTP interfaces that decouple business logic from
 * Express, HTTP/2, or any other HTTP framework specifics.
 */

/**
 * Session data stored for authenticated users
 */
export interface SessionData {
  /** Unique session identifier */
  id: string
  /** Session storage (user data, preferences) */
  data: Record<string, unknown>
  /** Expiration timestamp (milliseconds) */
  expires: number
}

/**
 * Abstract HTTP request interface
 *
 * Provides framework-agnostic access to HTTP request properties.
 * Implementations wrap native HTTP request objects (http.IncomingMessage,
 * http2.Http2ServerRequest, etc.) to provide a consistent interface.
 */
export interface TransportRequest {
  /** HTTP method (GET, POST, PUT, DELETE, etc.) */
  method: string

  /** Request path (e.g., "/api/health") */
  path: string

  /** Parsed URL with query parameters */
  url: URL

  /** Request headers (case-insensitive access) */
  headers: Headers

  /** Parsed request body (JSON or URL-encoded) */
  body: unknown

  /** Client IP address (for rate limiting) */
  ip: string

  /** Session data (if session middleware is active) */
  session?: SessionData

  /**
   * Internal: Native request object for middleware that needs direct access
   * @internal
   */
  _nativeRequest?: unknown

  /**
   * Get header value (case-insensitive)
   * @param name - Header name
   * @returns Header value or undefined if not present
   */
  getHeader(name: string): string | undefined

  /**
   * Get query parameter value
   * @param name - Query parameter name
   * @returns Query parameter value or undefined if not present
   */
  getQuery(name: string): string | undefined
}

/**
 * Abstract HTTP response interface
 *
 * Provides framework-agnostic methods for setting HTTP response properties.
 * Implementations wrap native HTTP response objects (http.ServerResponse,
 * http2.Http2ServerResponse, etc.) to provide a consistent interface.
 */
export interface TransportResponse {
  /**
   * Set HTTP status code
   * @param code - HTTP status code (200, 404, 500, etc.)
   * @returns this for method chaining
   */
  status(code: number): this

  /**
   * Set response header
   * @param name - Header name
   * @param value - Header value (string or array of strings)
   * @returns this for method chaining
   */
  setHeader(name: string, value: string | string[]): this

  /**
   * Get response header value
   * @param name - Header name
   * @returns Header value or undefined if not set
   */
  getHeader(name: string): string | string[] | undefined

  /**
   * Send JSON response
   * Sets Content-Type to application/json and ends the response.
   * @param data - Data to serialize as JSON
   */
  json(data: unknown): void

  /**
   * Send text or binary response
   * Sets appropriate Content-Type and ends the response.
   * @param data - String or Buffer to send
   */
  send(data: string | Buffer): void

  /**
   * Write streaming chunk
   * Used for streaming responses (SSE, chunked transfer encoding).
   * @param chunk - String or Buffer to write
   * @returns true if write buffer is not full, false if backpressure
   */
  write(chunk: string | Buffer): boolean

  /**
   * End streaming response
   * Optionally writes a final chunk before closing the connection.
   * @param chunk - Optional final chunk to write
   */
  end(chunk?: string | Buffer): void

  /** Whether response headers have been sent */
  readonly headersSent: boolean

  /** Whether response has been finished */
  readonly finished: boolean
}

/**
 * Function to call to pass control to the next middleware
 * @param error - Optional error to pass to error handler
 */
export type NextFunction = (error?: Error) => void

/**
 * Middleware handler function
 *
 * Middleware can:
 * - Modify request/response objects
 * - Call next() to pass control to the next middleware
 * - Call next(error) to pass error to error handler
 * - Send response directly (without calling next)
 */
export type MiddlewareHandler = (
  req: TransportRequest,
  res: TransportResponse,
  next: NextFunction,
) => void | Promise<void>

/**
 * Route handler function
 *
 * Route handlers are the final destination for a request.
 * They should send a response using res.json(), res.send(), or streaming methods.
 */
export type RouteHandler = (req: TransportRequest, res: TransportResponse) => void | Promise<void>

/**
 * Route definition
 *
 * Combines HTTP method, path pattern, middleware, and handler.
 */
export interface Route {
  /** HTTP method (GET, POST, PUT, DELETE, etc.) */
  method: string

  /** Route path pattern (e.g., "/api/health") */
  path: string

  /** Route-specific middleware (executed before handler) */
  middleware: MiddlewareHandler[]

  /** Route handler function */
  handler: RouteHandler
}

/**
 * Router interface
 *
 * Manages route registration and matching.
 */
export interface Router {
  /**
   * Register a route
   * @param route - Route definition
   * @returns this for method chaining
   */
  addRoute(route: Route): this

  /**
   * Register GET route
   * @param path - Route path
   * @param handlers - Middleware and/or route handler (last handler is the route handler)
   * @returns this for method chaining
   */
  get(path: string, ...handlers: (MiddlewareHandler | RouteHandler)[]): this

  /**
   * Register POST route
   * @param path - Route path
   * @param handlers - Middleware and/or route handler (last handler is the route handler)
   * @returns this for method chaining
   */
  post(path: string, ...handlers: (MiddlewareHandler | RouteHandler)[]): this

  /**
   * Register PUT route
   * @param path - Route path
   * @param handlers - Middleware and/or route handler (last handler is the route handler)
   * @returns this for method chaining
   */
  put(path: string, ...handlers: (MiddlewareHandler | RouteHandler)[]): this

  /**
   * Register DELETE route
   * @param path - Route path
   * @param handlers - Middleware and/or route handler (last handler is the route handler)
   * @returns this for method chaining
   */
  delete(path: string, ...handlers: (MiddlewareHandler | RouteHandler)[]): this

  /**
   * Match request to route
   * @param method - HTTP method
   * @param path - Request path
   * @returns Matched route or null if no match
   */
  match(method: string, path: string): Route | null
}

/**
 * Middleware chain interface
 *
 * Manages execution of middleware in sequence.
 */
export interface MiddlewareChain {
  /**
   * Add middleware to the chain
   * @param handler - Middleware handler function
   * @returns this for method chaining
   */
  use(handler: MiddlewareHandler): this

  /**
   * Execute middleware chain
   * Executes all middleware in order until one sends a response or an error occurs.
   * @param req - Transport request
   * @param res - Transport response
   */
  execute(req: TransportRequest, res: TransportResponse): Promise<void>
}
