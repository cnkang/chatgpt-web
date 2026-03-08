/**
 * Static File Middleware
 * Serves static files from a designated directory
 */

import { lookup as getMimeType } from 'mime-types'
import { createReadStream, statSync } from 'node:fs'
import { extname, join } from 'node:path'
import type { MiddlewareHandler } from '../transport/types.js'
import { logger } from '../utils/logger.js'

/**
 * Create static file serving middleware
 *
 * @param rootDir - Root directory to serve files from
 * @returns Middleware handler for static file serving
 */
export function createStaticFileMiddleware(rootDir: string): MiddlewareHandler {
  return async (req, res, next) => {
    // Only handle GET requests
    if (req.method !== 'GET') {
      return next()
    }

    try {
      // Resolve file path
      const filePath = join(rootDir, req.path)

      // Prevent directory traversal attacks
      if (!filePath.startsWith(rootDir)) {
        logger.warn('Directory traversal attempt detected', {
          requestedPath: req.path,
          resolvedPath: filePath,
          rootDir,
        })
        return next()
      }

      // Check if file exists and is a file (not directory)
      let stats: ReturnType<typeof statSync>
      try {
        stats = statSync(filePath)
      } catch {
        // File doesn't exist, pass to next handler
        return next()
      }

      if (!stats.isFile()) {
        return next()
      }

      // Determine Content-Type from file extension
      const ext = extname(filePath)
      const contentType = getMimeType(ext) || 'application/octet-stream'

      // Set response headers
      res.setHeader('Content-Type', contentType)
      res.setHeader('Content-Length', String(stats.size))
      res.setHeader('Cache-Control', 'public, max-age=31536000') // 1 year
      res.setHeader('ETag', `"${stats.mtime.getTime()}-${stats.size}"`)
      res.status(200)

      // Stream file to response
      const stream = createReadStream(filePath)

      stream.on('data', chunk => {
        res.write(chunk)
      })

      stream.on('end', () => {
        res.end()
      })

      stream.on('error', error => {
        logger.error('Error streaming static file', {
          filePath,
          error: error.message,
        })

        if (!res.headersSent) {
          res.status(500).json({
            status: 'Fail',
            message: 'Error reading file',
            data: null,
            error: {
              code: 'INTERNAL_ERROR',
              type: 'FileReadError',
              timestamp: new Date().toISOString(),
            },
          })
        }
      })
    } catch (error) {
      logger.error('Static file middleware error', {
        path: req.path,
        error: error instanceof Error ? error.message : String(error),
      })
      return next()
    }
  }
}
