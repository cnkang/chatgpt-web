/**
 * Middleware Chain Implementation
 *
 * Manages execution of middleware in sequence for the Transport Layer.
 *
 * @module transport/middleware-chain
 */

import type {
  MiddlewareChain,
  MiddlewareHandler,
  TransportRequest,
  TransportResponse,
} from './types.js'

/**
 * Middleware chain implementation
 *
 * Executes middleware handlers in sequence until one sends a response or an error occurs.
 */
export class MiddlewareChainImpl implements MiddlewareChain {
  private readonly handlers: MiddlewareHandler[] = []

  /**
   * Add middleware to the chain
   *
   * @param handler - Middleware handler function
   * @returns this for method chaining
   */
  use(handler: MiddlewareHandler): this {
    this.handlers.push(handler)
    return this
  }

  /**
   * Execute middleware chain
   *
   * Executes all middleware in order until:
   * - One sends a response (headersSent or finished)
   * - An error occurs (thrown or passed to next(error))
   * - A middleware doesn't call next() (stops the chain)
   * - All middleware complete successfully
   *
   * @param req - Transport request
   * @param res - Transport response
   * @throws Error if middleware calls next(error)
   */
  async execute(req: TransportRequest, res: TransportResponse): Promise<void> {
    let index = 0

    const executeNext = async (): Promise<void> => {
      // Check if response was already sent
      if (res.finished || res.headersSent) {
        return
      }

      // Check if all middleware have been executed
      if (index >= this.handlers.length) {
        return
      }

      // Get current middleware
      const handler = this.handlers[index++]

      // Track whether next() was called
      let nextCalled = false
      let nextCalledSync = false

      // Execute middleware and wait for next() to be called
      await new Promise<void>((resolve, reject) => {
        const next = (error?: Error) => {
          if (nextCalled) {
            // Prevent multiple calls to next()
            return
          }
          nextCalled = true
          nextCalledSync = true

          if (error) {
            reject(error)
          } else {
            resolve()
          }
        }

        try {
          const result = handler(req, res, next)

          // Handle async middleware
          if (result instanceof Promise) {
            result
              .then(() => {
                // If async middleware completes without calling next, stop the chain
                if (!nextCalled) {
                  nextCalled = true
                  resolve()
                }
              })
              .catch(reject)
          } else {
            // For sync middleware, check if next was called synchronously
            // Use setImmediate to allow synchronous next() calls to complete
            setImmediate(() => {
              if (!nextCalled) {
                // Middleware completed without calling next - stop the chain
                nextCalled = true
                resolve()
              }
            })
          }
        } catch (error) {
          reject(error)
        }
      })

      // Continue to next middleware only if next() was explicitly called
      // and response hasn't been sent
      if (nextCalledSync && !res.finished && !res.headersSent) {
        await executeNext()
      }
    }

    await executeNext()
  }
}
