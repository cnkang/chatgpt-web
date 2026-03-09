/**
 * Router Implementation
 *
 * Manages route registration and matching for the Transport Layer.
 * Supports dual path compatibility (/api/* and root paths).
 *
 * @module transport/router
 */

import type { MiddlewareHandler, Route, RouteHandler, Router } from './types.js'

/**
 * Router implementation
 *
 * Registers routes and matches incoming requests to handlers.
 * Supports path normalization for dual path compatibility.
 */
export class RouterImpl implements Router {
  private readonly routes: Route[] = []

  /**
   * Register a route
   *
   * @param route - Route definition
   * @returns this for method chaining
   */
  addRoute(route: Route): this {
    this.routes.push(route)
    return this
  }

  /**
   * Register GET route
   *
   * @param path - Route path
   * @param handlers - Middleware and/or route handler (last handler is the route handler)
   * @returns this for method chaining
   */
  get(path: string, ...handlers: (MiddlewareHandler | RouteHandler)[]): this {
    return this.registerRoute('GET', path, handlers)
  }

  /**
   * Register POST route
   *
   * @param path - Route path
   * @param handlers - Middleware and/or route handler (last handler is the route handler)
   * @returns this for method chaining
   */
  post(path: string, ...handlers: (MiddlewareHandler | RouteHandler)[]): this {
    return this.registerRoute('POST', path, handlers)
  }

  /**
   * Register PUT route
   *
   * @param path - Route path
   * @param handlers - Middleware and/or route handler (last handler is the route handler)
   * @returns this for method chaining
   */
  put(path: string, ...handlers: (MiddlewareHandler | RouteHandler)[]): this {
    return this.registerRoute('PUT', path, handlers)
  }

  /**
   * Register DELETE route
   *
   * @param path - Route path
   * @param handlers - Middleware and/or route handler (last handler is the route handler)
   * @returns this for method chaining
   */
  delete(path: string, ...handlers: (MiddlewareHandler | RouteHandler)[]): this {
    return this.registerRoute('DELETE', path, handlers)
  }

  /**
   * Helper method to register routes with method and handlers
   *
   * @param method - HTTP method
   * @param path - Route path
   * @param handlers - Array of middleware and route handler
   * @returns this for method chaining
   */
  private registerRoute(
    method: string,
    path: string,
    handlers: (MiddlewareHandler | RouteHandler)[],
  ): this {
    if (handlers.length === 0) {
      throw new Error(`Route ${method} ${path} must have at least one handler`)
    }

    // Last handler is the route handler, rest are middleware
    const handler = handlers.at(-1) as RouteHandler
    const middleware = handlers.slice(0, -1) as MiddlewareHandler[]

    return this.addRoute({
      method,
      path,
      middleware,
      handler,
    })
  }

  /**
   * Match request to route
   *
   * Supports dual path compatibility by checking both normalized and original paths.
   * Normalization strips "/api" prefix to support both /api/* and root paths.
   *
   * @param method - HTTP method
   * @param path - Request path
   * @returns Matched route or null if no match
   */
  match(method: string, path: string): Route | null {
    // Normalize request path by stripping "/api" prefix
    const normalizedRequestPath = this.normalizePath(path)

    // Try to match with both normalized and original paths
    for (const route of this.routes) {
      // Check if method matches (case-insensitive)
      if (route.method.toUpperCase() !== method.toUpperCase()) {
        continue
      }

      // Normalize route path as well for comparison
      const normalizedRoutePath = this.normalizePath(route.path)

      // Check if path matches (exact match for now, no pattern matching)
      // Match if either:
      // 1. Exact match with original paths
      // 2. Normalized paths match (enables /api/path <-> /path compatibility)
      if (
        route.path === path ||
        route.path === normalizedRequestPath ||
        normalizedRoutePath === path ||
        normalizedRoutePath === normalizedRequestPath
      ) {
        return route
      }
    }

    return null
  }

  /**
   * Normalize path by stripping "/api" prefix
   *
   * This enables dual path compatibility:
   * - /api/health -> /health
   * - /health -> /health
   *
   * @param path - Original request path
   * @returns Normalized path without /api prefix
   */
  private normalizePath(path: string): string {
    // Strip "/api" prefix if present
    if (path.startsWith('/api/')) {
      return path.substring(4) // Remove "/api"
    }
    if (path === '/api') {
      return '/'
    }
    return path
  }
}
