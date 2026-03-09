/**
 * Static File Middleware
 * Serves static files from a designated directory
 */

import { createReadStream, statSync } from 'node:fs'
import { extname, resolve, sep } from 'node:path'
import type { MiddlewareHandler } from '../transport/types.js'
import { logger } from '../utils/logger.js'

const MIME_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.htm': 'text/html; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
}

/**
 * Create static file serving middleware
 *
 * @param rootDir - Root directory to serve files from
 * @returns Middleware handler for static file serving
 */
export function createStaticFileMiddleware(rootDir: string): MiddlewareHandler {
  const absoluteRootDir = resolve(rootDir)

  return async (req, res, next) => {
    // Only handle GET requests
    if (req.method !== 'GET') {
      return next()
    }

    try {
      // Resolve the requested file relative to the configured static root.
      const decodedPath = decodeURIComponent(req.path)
      const filePath = resolve(absoluteRootDir, `.${decodedPath}`)

      // Prevent directory traversal attacks
      if (filePath !== absoluteRootDir && !filePath.startsWith(`${absoluteRootDir}${sep}`)) {
        logger.warn('Directory traversal attempt detected', {
          requestedPath: req.path,
          resolvedPath: filePath,
          rootDir: absoluteRootDir,
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
      const contentType = MIME_TYPES[ext.toLowerCase()] || 'application/octet-stream'

      // Set response headers
      res.setHeader('Content-Type', contentType)
      res.setHeader('Content-Length', String(stats.size))
      res.setHeader('Cache-Control', 'public, max-age=31536000') // 1 year
      res.setHeader('ETag', `"${stats.mtime.getTime()}-${stats.size}"`)
      res.status(200)

      // Stream file to response
      const stream = createReadStream(filePath)
      await new Promise<void>(resolveStream => {
        stream.on('data', chunk => {
          res.write(chunk)
        })

        stream.on('end', () => {
          res.end()
          resolveStream()
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
          } else if (!res.finished) {
            res.end()
          }

          resolveStream()
        })
      })
      return
    } catch (error) {
      logger.error('Static file middleware error', {
        path: req.path,
        error: error instanceof Error ? error.message : String(error),
      })
      return next()
    }
  }
}
