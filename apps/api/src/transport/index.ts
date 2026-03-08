/**
 * Transport Layer Abstraction
 *
 * Framework-agnostic HTTP interfaces for request/response handling.
 * These interfaces decouple business logic from Express, HTTP/2, or any
 * other HTTP framework specifics.
 *
 * @module transport
 */

export type {
  MiddlewareChain,
  MiddlewareHandler,
  NextFunction,
  Route,
  RouteHandler,
  Router,
  SessionData,
  TransportRequest,
  TransportResponse,
} from './types.js'

export { MiddlewareChainImpl } from './middleware-chain.js'
export { RouterImpl } from './router.js'
