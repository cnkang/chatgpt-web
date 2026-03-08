/**
 * Property-Based Test: Request Field Extraction
 *
 * **Validates: Requirements 3.5**
 *
 * Tests that TransportRequest correctly extracts method, path, headers, query, body
 * from native Node.js HTTP requests. This ensures the HTTP2Adapter properly wraps
 * native requests into the Transport Layer abstraction.
 */

import * as fc from 'fast-check'
import type { IncomingHttpHeaders } from 'node:http'
import { describe, expect, it } from 'vitest'
import { HTTP2Adapter } from '../../adapters/http2-adapter.js'
import { MiddlewareChainImpl } from '../../transport/middleware-chain.js'
import { RouterImpl } from '../../transport/router.js'

// ============================================================================
// Test Configuration
// ============================================================================

const PROPERTY_TEST_RUNS = 100

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a test HTTP2Adapter instance
 */
function createTestAdapter() {
  return new HTTP2Adapter(new RouterImpl(), new MiddlewareChainImpl(), {
    bodyLimit: { json: 1048576, urlencoded: 32768 },
  })
}

// ============================================================================
// Property-Based Test Generators
// ============================================================================

/**
 * Generate valid HTTP methods
 */
const httpMethodGenerator = fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS')

/**
 * Generate valid URL paths
 * Filter out paths that would create invalid URLs (backslashes, spaces, etc.)
 */
const urlPathGenerator = fc
  .array(
    fc
      .string({ minLength: 1, maxLength: 20 })
      .filter(
        s =>
          !s.includes('/') &&
          !s.includes('?') &&
          !s.includes('\\') &&
          !s.includes(' ') &&
          !s.includes('#'),
      ),
    { minLength: 1, maxLength: 5 },
  )
  .map(parts => `/${parts.join('/')}`)

/**
 * Generate query parameters
 * Filter out keys/values that would cause URL parsing issues
 */
const queryParamsGenerator = fc.dictionary(
  fc
    .string({ minLength: 1, maxLength: 20 })
    .filter(s => !s.includes('=') && !s.includes('&') && !s.includes('#') && s.trim().length > 0),
  fc.string({ minLength: 0, maxLength: 50 }).filter(s => !s.includes('#')),
  { minKeys: 0, maxKeys: 5 },
)

/**
 * Generate HTTP headers
 * Filter out whitespace-only values since they get trimmed
 */
const httpHeadersGenerator = fc.dictionary(
  fc
    .string({ minLength: 1, maxLength: 30 })
    .filter(s => /^[a-z0-9-]+$/i.test(s))
    .map(s => s.toLowerCase()),
  fc.oneof(
    fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    fc
      .array(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        {
          minLength: 1,
          maxLength: 3,
        },
      )
      .filter(arr => arr.length > 0),
  ),
  { minKeys: 0, maxKeys: 10 },
)

/**
 * Generate client IP addresses
 */
const ipAddressGenerator = fc.oneof(
  fc.ipV4(),
  fc.ipV6(),
  fc.constant('::1'),
  fc.constant('127.0.0.1'),
)

/**
 * Generate complete HTTP request configuration
 */
const httpRequestGenerator = fc.record({
  method: httpMethodGenerator,
  path: urlPathGenerator,
  query: queryParamsGenerator,
  headers: httpHeadersGenerator,
  ip: ipAddressGenerator,
  host: fc.constantFrom('localhost', 'example.com', '127.0.0.1'),
})

// ============================================================================
// Mock Request Factory
// ============================================================================

/**
 * Create a mock native HTTP request
 */
function createMockNativeRequest(config: {
  method: string
  path: string
  query: Record<string, string>
  headers: Record<string, string | string[]>
  ip: string
  host: string
}) {
  // Build URL with query parameters
  const queryString = Object.entries(config.query)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&')
  const url = queryString ? `${config.path}?${queryString}` : config.path

  // Prepare headers with host
  const headers: IncomingHttpHeaders = {
    ...config.headers,
    host: config.host,
  }

  return {
    method: config.method,
    url,
    headers,
    socket: {
      remoteAddress: config.ip,
    },
  }
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Property 3: Request Field Extraction', () => {
  /**
   * Property: HTTP method is correctly extracted
   */
  it('should correctly extract HTTP method from native request', async () => {
    await fc.assert(
      fc.asyncProperty(httpRequestGenerator, async config => {
        const adapter = createTestAdapter()
        const mockReq = createMockNativeRequest(config)
        const transportReq = (adapter as any).wrapRequest(mockReq)

        expect(transportReq.method).toBe(config.method)
      }),
      { numRuns: PROPERTY_TEST_RUNS },
    )
  })

  /**
   * Property: Request path is correctly extracted
   * Note: URL parsing normalizes paths, so we compare the normalized version
   */
  it('should correctly extract request path from native request', async () => {
    await fc.assert(
      fc.asyncProperty(httpRequestGenerator, async config => {
        const adapter = createTestAdapter()
        const mockReq = createMockNativeRequest(config)
        const transportReq = (adapter as any).wrapRequest(mockReq)

        // URL parsing normalizes the path, so we need to compare with the normalized version
        const expectedPath = new URL(config.path, 'http://localhost').pathname
        expect(transportReq.path).toBe(expectedPath)
      }),
      { numRuns: PROPERTY_TEST_RUNS },
    )
  })

  /**
   * Property: URL object is correctly created with query parameters
   * Note: URL parsing normalizes paths
   */
  it('should correctly create URL object with query parameters', async () => {
    await fc.assert(
      fc.asyncProperty(httpRequestGenerator, async config => {
        const adapter = createTestAdapter()
        const mockReq = createMockNativeRequest(config)
        const transportReq = (adapter as any).wrapRequest(mockReq)

        // Verify URL object exists
        expect(transportReq.url).toBeInstanceOf(URL)

        // URL parsing normalizes the path
        const expectedPath = new URL(config.path, 'http://localhost').pathname
        expect(transportReq.url.pathname).toBe(expectedPath)

        // Verify all query parameters are accessible
        for (const [key, value] of Object.entries(config.query)) {
          expect(transportReq.url.searchParams.get(key)).toBe(value)
        }
      }),
      { numRuns: PROPERTY_TEST_RUNS },
    )
  })

  /**
   * Property: Headers are correctly extracted and accessible
   * Note: Headers API trims leading/trailing whitespace from values
   */
  it('should correctly extract headers from native request', async () => {
    await fc.assert(
      fc.asyncProperty(httpRequestGenerator, async config => {
        const adapter = createTestAdapter()
        const mockReq = createMockNativeRequest(config)
        const transportReq = (adapter as any).wrapRequest(mockReq)

        // Verify headers object exists
        expect(transportReq.headers).toBeInstanceOf(Headers)

        // Verify all headers are accessible (case-insensitive)
        for (const [key, value] of Object.entries(config.headers)) {
          const headerValue = transportReq.headers.get(key)
          expect(headerValue).toBeDefined()

          // Handle both string and string[] values
          // Headers API trims leading/trailing whitespace
          if (Array.isArray(value)) {
            const joined = value.map(v => String(v)).join(', ')
            const expected = joined.trim()
            expect(headerValue).toBe(expected)
          } else {
            const expected = String(value).trim()
            expect(headerValue).toBe(expected)
          }
        }
      }),
      { numRuns: PROPERTY_TEST_RUNS },
    )
  })

  /**
   * Property: getHeader() method works correctly (case-insensitive)
   */
  it('should provide case-insensitive header access via getHeader()', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          method: httpMethodGenerator,
          path: urlPathGenerator,
          query: fc.constant({}),
          headers: fc.constant({
            'content-type': 'application/json',
            authorization: 'Bearer token123',
            'x-custom-header': 'custom-value',
          }),
          ip: ipAddressGenerator,
          host: fc.constant('localhost'),
        }),
        async config => {
          const adapter = createTestAdapter()
          const mockReq = createMockNativeRequest(config)
          const transportReq = (adapter as any).wrapRequest(mockReq)

          // Test case-insensitive access
          expect(transportReq.getHeader('content-type')).toBe('application/json')
          expect(transportReq.getHeader('Content-Type')).toBe('application/json')
          expect(transportReq.getHeader('CONTENT-TYPE')).toBe('application/json')

          expect(transportReq.getHeader('authorization')).toBe('Bearer token123')
          expect(transportReq.getHeader('Authorization')).toBe('Bearer token123')

          expect(transportReq.getHeader('x-custom-header')).toBe('custom-value')
          expect(transportReq.getHeader('X-Custom-Header')).toBe('custom-value')

          // Test missing header
          expect(transportReq.getHeader('non-existent')).toBeUndefined()
        },
      ),
      { numRuns: PROPERTY_TEST_RUNS },
    )
  })

  /**
   * Property: getQuery() method works correctly
   * Note: URLSearchParams.get() returns null for missing keys, empty string for keys with no value
   * The || undefined converts null to undefined, but also converts empty string to undefined
   */
  it('should provide query parameter access via getQuery()', async () => {
    await fc.assert(
      fc.asyncProperty(httpRequestGenerator, async config => {
        const adapter = createTestAdapter()
        const mockReq = createMockNativeRequest(config)
        const transportReq = (adapter as any).wrapRequest(mockReq)

        // Verify all query parameters are accessible via getQuery()
        for (const [key, value] of Object.entries(config.query)) {
          const result = transportReq.getQuery(key)
          // The implementation uses: url.searchParams.get(name) || undefined
          // This converts empty strings to undefined
          if (value === '') {
            expect(result).toBeUndefined()
          } else {
            expect(result).toBe(value)
          }
        }

        // Test missing query parameter
        expect(transportReq.getQuery('non-existent-param')).toBeUndefined()
      }),
      { numRuns: PROPERTY_TEST_RUNS },
    )
  })

  /**
   * Property: Client IP is correctly extracted
   */
  it('should correctly extract client IP address', async () => {
    await fc.assert(
      fc.asyncProperty(httpRequestGenerator, async config => {
        const adapter = createTestAdapter()
        const mockReq = createMockNativeRequest(config)
        const transportReq = (adapter as any).wrapRequest(mockReq)

        expect(transportReq.ip).toBe(config.ip)
      }),
      { numRuns: PROPERTY_TEST_RUNS },
    )
  })

  /**
   * Property: X-Forwarded-For header takes precedence for IP extraction
   */
  it('should extract IP from X-Forwarded-For header when present', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          method: httpMethodGenerator,
          path: urlPathGenerator,
          query: fc.constant({}),
          forwardedIp: ipAddressGenerator,
          socketIp: ipAddressGenerator,
          host: fc.constant('localhost'),
        }),
        async config => {
          const adapter = createTestAdapter()
          const mockReq = createMockNativeRequest({
            method: config.method,
            path: config.path,
            query: config.query,
            headers: {
              'x-forwarded-for': config.forwardedIp,
            },
            ip: config.socketIp,
            host: config.host,
          })

          const transportReq = (adapter as any).wrapRequest(mockReq)

          // X-Forwarded-For should take precedence
          expect(transportReq.ip).toBe(config.forwardedIp)
        },
      ),
      { numRuns: PROPERTY_TEST_RUNS },
    )
  })

  /**
   * Property: X-Real-IP header is used as fallback
   */
  it('should extract IP from X-Real-IP header when X-Forwarded-For is absent', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          method: httpMethodGenerator,
          path: urlPathGenerator,
          query: fc.constant({}),
          realIp: ipAddressGenerator,
          socketIp: ipAddressGenerator,
          host: fc.constant('localhost'),
        }),
        async config => {
          const adapter = createTestAdapter()
          const mockReq = createMockNativeRequest({
            method: config.method,
            path: config.path,
            query: config.query,
            headers: {
              'x-real-ip': config.realIp,
            },
            ip: config.socketIp,
            host: config.host,
          })

          const transportReq = (adapter as any).wrapRequest(mockReq)

          // X-Real-IP should be used
          expect(transportReq.ip).toBe(config.realIp)
        },
      ),
      { numRuns: PROPERTY_TEST_RUNS },
    )
  })

  /**
   * Property: Body is initially null (populated by middleware)
   */
  it('should initialize body as null before body parser middleware', async () => {
    await fc.assert(
      fc.asyncProperty(httpRequestGenerator, async config => {
        const adapter = createTestAdapter()
        const mockReq = createMockNativeRequest(config)
        const transportReq = (adapter as any).wrapRequest(mockReq)

        expect(transportReq.body).toBeNull()
      }),
      { numRuns: PROPERTY_TEST_RUNS },
    )
  })

  /**
   * Property: Session is initially undefined (populated by middleware)
   */
  it('should initialize session as undefined before session middleware', async () => {
    await fc.assert(
      fc.asyncProperty(httpRequestGenerator, async config => {
        const adapter = createTestAdapter()
        const mockReq = createMockNativeRequest(config)
        const transportReq = (adapter as any).wrapRequest(mockReq)

        expect(transportReq.session).toBeUndefined()
      }),
      { numRuns: PROPERTY_TEST_RUNS },
    )
  })

  /**
   * Property: Empty query string results in empty query parameters
   */
  it('should handle requests with no query parameters', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          method: httpMethodGenerator,
          path: urlPathGenerator,
          query: fc.constant({}),
          headers: httpHeadersGenerator,
          ip: ipAddressGenerator,
          host: fc.constant('localhost'),
        }),
        async config => {
          const adapter = createTestAdapter()
          const mockReq = createMockNativeRequest(config)
          const transportReq = (adapter as any).wrapRequest(mockReq)

          // URL should have no query parameters
          expect(Array.from(transportReq.url.searchParams.keys())).toHaveLength(0)
        },
      ),
      { numRuns: PROPERTY_TEST_RUNS },
    )
  })

  /**
   * Property: Special characters in query parameters are correctly decoded
   */
  it('should correctly handle special characters in query parameters', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          method: httpMethodGenerator,
          path: urlPathGenerator,
          query: fc.constant({
            message: 'Hello World!',
            email: 'test@example.com',
            path: '/api/test',
            special: '&=?#',
          }),
          headers: fc.constant({}),
          ip: ipAddressGenerator,
          host: fc.constant('localhost'),
        }),
        async config => {
          const adapter = createTestAdapter()
          const mockReq = createMockNativeRequest(config)
          const transportReq = (adapter as any).wrapRequest(mockReq)

          // Verify special characters are correctly decoded
          expect(transportReq.getQuery('message')).toBe('Hello World!')
          expect(transportReq.getQuery('email')).toBe('test@example.com')
          expect(transportReq.getQuery('path')).toBe('/api/test')
          expect(transportReq.getQuery('special')).toBe('&=?#')
        },
      ),
      { numRuns: PROPERTY_TEST_RUNS },
    )
  })

  /**
   * Property: Missing URL defaults to root path
   */
  it('should handle missing URL by defaulting to root path', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          method: httpMethodGenerator,
          ip: ipAddressGenerator,
        }),
        async config => {
          const adapter = createTestAdapter()
          const mockReq = {
            method: config.method,
            url: undefined, // Missing URL
            headers: { host: 'localhost' },
            socket: { remoteAddress: config.ip },
          }

          const transportReq = (adapter as any).wrapRequest(mockReq)

          expect(transportReq.path).toBe('/')
        },
      ),
      { numRuns: PROPERTY_TEST_RUNS },
    )
  })

  /**
   * Property: Missing host header defaults to localhost
   */
  it('should handle missing host header by defaulting to localhost', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          method: httpMethodGenerator,
          path: urlPathGenerator,
          ip: ipAddressGenerator,
        }),
        async config => {
          const adapter = createTestAdapter()
          const mockReq = {
            method: config.method,
            url: config.path,
            headers: {}, // Missing host header
            socket: { remoteAddress: config.ip },
          }

          const transportReq = (adapter as any).wrapRequest(mockReq)

          expect(transportReq.url.host).toBe('localhost')
        },
      ),
      { numRuns: PROPERTY_TEST_RUNS },
    )
  })

  /**
   * Property: Array header values are joined with comma-space
   * Note: Headers API trims leading/trailing whitespace from the entire value
   */
  it('should join array header values with comma-space', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          method: httpMethodGenerator,
          path: urlPathGenerator,
          query: fc.constant({}),
          headerValues: fc.array(
            fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
            {
              minLength: 2,
              maxLength: 4,
            },
          ),
          ip: ipAddressGenerator,
          host: fc.constant('localhost'),
        }),
        async config => {
          const adapter = createTestAdapter()
          const mockReq = createMockNativeRequest({
            method: config.method,
            path: config.path,
            query: config.query,
            headers: {
              accept: config.headerValues,
            },
            ip: config.ip,
            host: config.host,
          })

          const transportReq = (adapter as any).wrapRequest(mockReq)

          // Headers API trims leading/trailing whitespace from the entire value
          const joined = config.headerValues.map(v => String(v)).join(', ')
          const expected = joined.trim()
          expect(transportReq.getHeader('accept')).toBe(expected)
        },
      ),
      { numRuns: PROPERTY_TEST_RUNS },
    )
  })
})
