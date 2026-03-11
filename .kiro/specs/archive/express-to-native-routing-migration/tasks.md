# Implementation Plan: Express to Native Routing Migration

## Overview

This plan implements the migration from Express.js to native Node.js 24 HTTP/2 routing. The implementation creates a Transport Layer abstraction that decouples business logic from HTTP framework specifics, then builds a native HTTP/2 adapter to replace Express. All API endpoints, security policies, and streaming behavior will be preserved with semantic compatibility.

## Tasks

- [x] 1. Create Transport Layer abstraction interfaces
  - Create `apps/api/src/transport/` directory structure
  - Define `TransportRequest` interface with method, path, url, headers, body, ip, session properties
  - Define `TransportResponse` interface with status(), setHeader(), json(), send(), write(), end() methods
  - Define `MiddlewareHandler` and `NextFunction` types
  - Define `RouteHandler` type
  - Define `Router` interface with addRoute(), get(), post(), match() methods
  - Define `MiddlewareChain` interface with use() and execute() methods
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 1.1 Write unit tests for Transport Layer interfaces
  - Test TransportRequest field extraction (method, path, headers, query, body)
  - Test TransportResponse field setting (status, headers, body)
  - Test middleware chain execution order
  - Test error propagation through middleware
  - _Requirements: 13.1_

- [ ] 2. Implement HTTP/2 Adapter
  - [x] 2.1 Create HTTP2Adapter class in `apps/api/src/adapters/http2-adapter.ts`
    - Implement server creation with HTTP/2 (node:http2) and HTTP/1.1 fallback (node:http)
    - Support TLS configuration with allowHTTP1 flag
    - Implement setupRequestHandler() for routing requests
    - _Requirements: 4.1, 4.2, 4.9, 22.5_

  - [x] 2.2 Implement request wrapping (wrapRequest method)
    - Extract method, path, URL from native request
    - Convert headers to Headers object
    - Extract client IP from X-Forwarded-For, X-Real-IP, or socket
    - Implement getHeader() and getQuery() methods
    - _Requirements: 3.5, 4.1_

  - [x] 2.3 Implement response wrapping (wrapResponse method)
    - Implement status() method to set status code
    - Implement setHeader() and getHeader() methods
    - Implement json() method with Content-Type: application/json
    - Implement send() method for text/buffer responses
    - Implement write() and end() methods for streaming
    - Track headersSent and finished state
    - _Requirements: 3.6, 3.7, 4.1_

  - [x] 2.4 Implement body parsing (parseBody method)
    - Parse JSON bodies with size limit enforcement (configurable, 1MB default)
    - Parse URL-encoded bodies with size limit enforcement (32KB default)
    - Throw AppError with 413 status when size limit exceeded
    - Throw AppError with 400 status for invalid JSON
    - Use async iteration over request chunks
    - _Requirements: 4.4, 4.5, 11.1, 11.2, 11.5_

  - [x] 2.5 Implement route matching and execution
    - Create Router implementation with route registration
    - Implement route matching by method and path
    - Execute global middleware chain before route matching
    - Execute route-specific middleware before handler
    - Handle 404 for unmatched routes with {status: 'Fail', message: 'Not Found', data: null}
    - _Requirements: 4.3, 4.7_

  - [x] 2.6 Implement error handling in adapter
    - Catch errors from middleware and handlers
    - Map errors to HTTP status codes (400, 401, 413, 429, 500, 502, 504)
    - Return error responses with {status: 'Fail'|'Error', message, data: null, error: {...}} structure
    - Handle errors after headers sent (log and close connection)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9_

  - [x] 2.7 Write unit tests for HTTP/2 Adapter
    - Test HTTP/2 server creation and binding
    - Test HTTP/1.1 fallback negotiation
    - Test request wrapping (all fields extracted correctly)
    - Test response wrapping (all methods work correctly)
    - Test body parsing for JSON and URL-encoded
    - Test body size limit enforcement (1MB, 32KB)
    - Test route matching and 404 handling
    - _Requirements: 13.1_

  - [x] 2.8 Implement dual path compatibility for routing
    - Implement path normalization to strip "/api" prefix
    - Register routes for both "/api/\*" and root paths
    - Ensure identical behavior for both path variants
    - Test that /api/health and /health produce identical responses
    - Test that /api/chat-process and /chat-process produce identical responses
    - _Requirements: 2.6_

- [ ] 3. Implement security middleware components
  - [x] 3.1 Create authentication middleware in `apps/api/src/middleware-native/auth.ts`
    - Extract AUTH_SECRET_KEY from environment
    - Extract Bearer token from Authorization header
    - Use timingSafeEqual for constant-time comparison
    - Return 401 with {status: 'Fail', message: 'Error: No access rights', data: null, error: {code: 'AUTHENTICATION_ERROR', ...}} for invalid auth
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 10.2_

  - [x] 3.2 Create rate limiting middleware in `apps/api/src/middleware-native/rate-limiter.ts`
    - Implement RateLimiter class with in-memory Map storage
    - Track requests per IP with count and resetTime
    - Enforce general limit (100 req/hour from MAX_REQUEST_PER_HOUR)
    - Enforce strict limit for /verify (10 req/15min)
    - Set X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset headers
    - Return 429 with {status: 'Fail', message: 'Too many requests...', data: null, error: {code: 'RATE_LIMIT_ERROR', ...}} when exceeded
    - Implement cleanup() to remove expired entries
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 10.4_

  - [x] 3.3 Create security headers middleware in `apps/api/src/middleware-native/security-headers.ts`
    - Set Content-Security-Policy with unsafe-eval for Mermaid, unsafe-inline for Naive UI
    - Set X-Content-Type-Options: nosniff
    - Set X-Frame-Options: DENY
    - Set Referrer-Policy: strict-origin-when-cross-origin
    - Set X-Permitted-Cross-Domain-Policies: none
    - Set Strict-Transport-Security in production
    - Add upgrade-insecure-requests directive in production
    - Support different CSP for development (localhost WebSocket)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 3.4 Create CORS middleware in `apps/api/src/middleware-native/cors.ts`
    - Parse ALLOWED_ORIGINS from environment (comma-separated)
    - Block wildcard (\*) origins in production
    - Default to localhost:1002 in development
    - Validate Origin header against allowed list
    - Set Access-Control-Allow-Origin only for allowed origins
    - Set Access-Control-Allow-Credentials: true
    - Set Vary: Origin header
    - Handle OPTIONS preflight requests (return 200 or 403)
    - Set Access-Control-Allow-Headers and Access-Control-Allow-Methods
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

  - [x] 3.5 Create session middleware in `apps/api/src/middleware-native/session.ts`
    - Define SessionData interface (id, data, expires)
    - Implement MemorySessionStore with Map storage
    - Implement RedisSessionStore using native redis package (not connect-redis)
    - Parse session cookie from Cookie header
    - Load existing session or create new session with randomBytes(32)
    - Wrap res.end() to save session and set cookie
    - Set cookie with httpOnly, secure (if HTTPS), sameSite: strict, path: /
    - Set Max-Age based on configured maxAge
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [x] 3.6 Create input validation middleware in `apps/api/src/middleware-native/validation.ts`
    - Implement createValidationMiddleware<T>(schema: ZodSchema<T>)
    - Sanitize request body with sanitizeObject() (XSS prevention)
    - Validate sanitized body with Zod schema
    - Return 400 with {status: 'Fail', message: 'Validation failed', data: null, errors: [...]} for validation errors
    - Implement sanitizeString() to escape HTML entities (&, <, >, ", ')
    - Block **proto**, prototype, constructor keys
    - Normalize strings with NFKC and remove null bytes
    - _Requirements: 12.1, 12.2, 12.3, 12.5, 10.1_

  - [x] 3.7 Create body parser middleware in `apps/api/src/middleware-native/body-parser.ts`
    - Implement JSON body parser with configurable size limit
    - Implement URL-encoded body parser with configurable size limit
    - Attach parsed body to req.body
    - Call next() after parsing
    - _Requirements: 4.4, 4.5_

  - [x] 3.8 Write unit tests for security middleware
    - Test authentication with valid/invalid/missing tokens
    - Test rate limiting threshold enforcement and counter reset
    - Test security headers presence and values
    - Test CORS origin validation and preflight handling
    - Test session creation, cookie attributes, and expiration
    - Test input sanitization for XSS patterns
    - Test Zod schema validation
    - _Requirements: 13.1_

- [ ] 4. Migrate route handlers to Transport Layer
  - [x] 4.1 Create health endpoint in `apps/api/src/routes/health.ts`
    - Implement GET /api/health handler
    - Return {uptime: process.uptime(), message: 'OK', timestamp: Date.now()}
    - Use TransportRequest and TransportResponse interfaces
    - _Requirements: 2.1_

  - [x] 4.2 Create chat endpoint in `apps/api/src/routes/chat.ts`
    - Implement POST /api/chat-process handler
    - Set Content-Type: application/octet-stream
    - Set Cache-Control: no-cache, Connection: keep-alive
    - Stream response chunks using res.write()
    - Format first chunk without leading newline
    - Format subsequent chunks with \n prefix (newline-delimited JSON)
    - Handle backpressure if write buffer is full
    - Call res.end() to complete streaming
    - Handle errors during streaming (log and close if headers sent)
    - _Requirements: 2.2, 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 4.3 Create config endpoint in `apps/api/src/routes/config.ts`
    - Implement POST /api/config handler
    - Require authentication (apply auth middleware)
    - Return {status: 'Success', message: string, data: {...}} with provider config
    - _Requirements: 2.3_

  - [x] 4.4 Create session endpoint in `apps/api/src/routes/session.ts`
    - Implement POST /api/session handler
    - Return {status: 'Success', message: '', data: {auth: boolean, model: string}}
    - Set auth: true if AUTH_SECRET_KEY is configured
    - Get model from current AI provider configuration
    - _Requirements: 2.4_

  - [x] 4.5 Create verify endpoint in `apps/api/src/routes/verify.ts`
    - Implement POST /api/verify handler
    - Apply strict rate limiting (10 req/15min)
    - Enforce 1KB body size limit
    - Validate {token: string} body with Zod schema
    - Compare token with AUTH_SECRET_KEY using timingSafeEqual
    - Return {status: 'Success', message: 'Verify successfully', data: null} for valid token
    - Return 401 with {status: 'Fail', message: string, data: null, error: {code: 'AUTHENTICATION_ERROR', ...}} for invalid token
    - _Requirements: 2.5, 11.4_

  - [x] 4.6 Create static file middleware in `apps/api/src/middleware-native/static.ts`
    - Implement createStaticFileMiddleware(rootDir: string)
    - Only handle GET requests
    - Resolve file path and prevent directory traversal
    - Check if file exists with statSync()
    - Determine Content-Type from file extension using mime-types
    - Set Content-Length, Cache-Control, ETag headers
    - Stream file using createReadStream() and pipe to response
    - Return 404 for missing files (call next())
    - _Requirements: 16.1, 16.2, 16.3, 16.4_

  - [x] 4.7 Write integration tests for all routes
    - Test GET /api/health returns 200 with health data
    - Test POST /api/chat-process streams response correctly
    - Test POST /api/config requires auth and returns config
    - Test POST /api/session returns auth status and model
    - Test POST /api/verify with valid/invalid tokens
    - Test static file serving with correct Content-Type
    - Test 404 for missing static files
    - _Requirements: 13.6_

- [ ] 5. Create new native entry point and logging infrastructure
  - [x] 5.1 Create `apps/api/src/index-native.ts`
    - Import HTTP2Adapter and all middleware
    - Validate environment variables (OPENAI_API_KEY, AI_PROVIDER, Node.js 24+)
    - Create HTTP2Adapter with configuration (http2: true, tls if configured, bodyLimit)
    - Register global middleware (CORS, security headers, body parser)
    - Register routes with correct methods and middleware
    - Apply auth middleware to /config, /chat-process
    - Apply general rate limiter to most endpoints
    - Apply strict rate limiter to /verify
    - Apply 1MB body limit to /chat-process
    - Apply 1KB body limit to /verify
    - Register static file middleware
    - Setup error handler
    - Setup graceful shutdown (SIGTERM, SIGINT)
    - Start server on configured port
    - Log startup message with Node.js version and HTTP/2 status
    - Output warning if TLS not configured: "Warning: HTTP/2 without TLS (h2c) has limited browser support. Configure TLS for production use."
    - _Requirements: 4.9, 15.1, 15.2, 15.3, 15.4, 19.1, 19.2, 19.3, 19.4, 21.1, 21.2, 22.5_

  - [x] 5.2 Implement graceful shutdown in `apps/api/src/utils/graceful-shutdown.ts`
    - Listen for SIGTERM and SIGINT signals
    - Stop accepting new connections (server.close())
    - Wait for in-flight requests to complete
    - Force close after 30-second timeout
    - Log shutdown events
    - Exit with code 0 on success, 1 on timeout
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [x] 5.3 Implement error handler in `apps/api/src/utils/error-handler.ts`
    - Define ErrorResponse interface
    - Map error messages to HTTP status codes
    - Map error types to error codes (VALIDATION_ERROR, AUTHENTICATION_ERROR, etc.)
    - Return {status: 'Fail'|'Error', message, data: null, error: {...}} structure
    - Include error.details only for 4xx errors
    - Log errors with structured data (timestamp, method, path, ip, error, stack)
    - Handle errors after headers sent (log and return without sending)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10_

  - [x] 5.4 Implement asyncHandler wrapper in `apps/api/src/utils/async-handler.ts`
    - Wrap async route handlers to catch errors
    - Pass errors to error handler
    - _Requirements: 10.5_

  - [x] 5.5 Migrate logging infrastructure
    - Preserve existing logger.ts functionality (request logs, error logs, performance metrics)
    - Ensure log format remains unchanged (JSON structured logging)
    - Preserve log output targets (console, file if configured)
    - Add request logging middleware to capture method, path, status, duration
    - Add error logging to error handler with stack traces
    - Add performance metrics logging (response time, memory usage)
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

  - [x] 5.6 Write startup tests
    - Test server starts successfully
    - Test server binds to configured port
    - Test server accepts HTTP/2 connections (if TLS configured)
    - Test server accepts HTTP/1.1 connections
    - Test graceful shutdown completes in-flight requests
    - Test h2c warning is logged when TLS not configured
    - _Requirements: 13.8, 22.5_

- [x] 6. Checkpoint - Validate native implementation
  - Run complete test suite on native implementation
  - Verify all API endpoints return correct responses
  - Verify error responses match expected structure
  - Verify body size limits enforced (1MB, 32KB, 1MB, 1KB)
  - Verify streaming protocol is semantically compatible
  - Verify rate limiting thresholds (100/hour, 10/15min)
  - Run load tests to establish performance baseline
  - Ensure all tests pass, ask the user if questions arise

- [ ] 7. Write property-based tests for correctness properties
  - [x] 7.1 Property 1: Route Path Normalization
    - **Property 1: Route Path Normalization**
    - **Validates: Requirements 2.6**
    - Test that /api/path and /path produce identical responses
    - Use fast-check with 100 iterations
    - Test all endpoints: /health, /chat-process, /config, /session, /verify

  - [x] 7.2 Property 2: Response Structure Consistency
    - **Property 2: Response Structure Consistency**
    - **Validates: Requirements 2.7**
    - Test that all responses contain {status, message, data} fields
    - Use fast-check with 100 iterations
    - Test all endpoints with valid and invalid inputs

  - [x] 7.3 Property 3: Request Field Extraction
    - **Property 3: Request Field Extraction**
    - **Validates: Requirements 3.5**
    - Test that TransportRequest correctly extracts method, path, headers, query, body from native request
    - Use fast-check with 100 iterations
    - Generate random HTTP requests with various field combinations

  - [~] 7.4 Property 4: Response Field Setting
    - **Property 4: Response Field Setting**
    - **Validates: Requirements 3.6**
    - Test that TransportResponse correctly sets status, headers, body on native response
    - Use fast-check with 100 iterations
    - Generate random response configurations

  - [~] 7.5 Property 5: Streaming Order Preservation
    - **Property 5: Streaming Order Preservation**
    - **Validates: Requirements 9.2, 9.4**
    - Test that streaming chunks arrive in FIFO order
    - Use fast-check with 100 iterations
    - Generate random sequences of chunks and verify order

  - [~] 7.6 Property 6: JSON Body Size Limit Enforcement
    - **Property 6: JSON Body Size Limit Enforcement**
    - **Validates: Requirements 4.4, 11.1, 11.3**
    - Test that bodies >1MB return 413, bodies ≤1MB succeed
    - Use fast-check with 100 iterations
    - Generate random body sizes from 0 to 2MB

  - [~] 7.7 Property 7: URL-Encoded Body Parsing Round Trip
    - **Property 7: URL-Encoded Body Parsing Round Trip**
    - **Validates: Requirements 4.5, 11.2**
    - Test that parsing and re-encoding produces equivalent key-value pairs
    - Use fast-check with 100 iterations

  - [~] 7.8 Property 8: Static File Integrity
    - **Property 8: Static File Integrity**
    - **Validates: Requirements 16.1, 16.2, 16.3**
    - Test that served static files match source files byte-for-byte
    - Test that Content-Type headers match file extensions
    - Use fast-check with 100 iterations

  - [~] 7.9 Property 9: Authentication Enforcement
    - **Property 9: Authentication Enforcement**
    - **Validates: Requirements 5.1, 5.2, 5.3**
    - Test that valid tokens succeed, invalid tokens return 401
    - Use fast-check with 100 iterations
    - Test all protected endpoints

  - [~] 7.10 Property 10: Rate Limit Enforcement and Reset
    - **Property 10: Rate Limit Enforcement and Reset**
    - **Validates: Requirements 6.1, 6.2, 6.4, 6.5**
    - Test that rate limits are enforced per IP
    - Test that counters reset after time window
    - Use fast-check with 100 iterations

  - [~] 7.11 Property 11: Security Headers Presence
    - **Property 11: Security Headers Presence**
    - **Validates: Requirements 7.1, 7.2, 7.3**
    - Test that all responses have required security headers
    - Use fast-check with 100 iterations

  - [~] 7.12 Property 12: Session Cookie Attributes
    - **Property 12: Session Cookie Attributes**
    - **Validates: Requirements 8.1, 8.2, 8.4**
    - Test that session cookies have correct attributes
    - Use fast-check with 100 iterations

  - [~] 7.13 Property 13: Session Expiration
    - **Property 13: Session Expiration**
    - **Validates: Requirements 8.3, 8.7**
    - Test that expired sessions are not loaded
    - Test that session maxAge is enforced correctly
    - Use fast-check with 100 iterations

  - [~] 7.14 Property 14: Streaming Response Format
    - **Property 14: Streaming Response Format**
    - **Validates: Requirements 9.1, 9.3, 9.4**
    - Test that streaming chunks are newline-delimited JSON
    - Test that first chunk has no leading newline
    - Test that response ends with res.end()
    - Use fast-check with 100 iterations

  - [~] 7.15 Property 15: Error Response Mapping
    - **Property 15: Error Response Mapping**
    - **Validates: Requirements 10.1-10.7**
    - Test all error scenarios from Error Mapping Matrix
    - Test correct HTTP status codes and error structure
    - Use fast-check with 100 iterations

  - [~] 7.16 Property 16: Input Sanitization
    - **Property 16: Input Sanitization**
    - **Validates: Requirements 12.3**
    - Test that XSS patterns are escaped or removed
    - Use fast-check with 100 iterations

  - [~] 7.17 Property 17: Content-Type Validation
    - **Property 17: Content-Type Validation**
    - **Validates: Requirements 11.6**
    - Test that requests with invalid Content-Type are rejected
    - Test that application/json and application/x-www-form-urlencoded are accepted
    - Use fast-check with 100 iterations

  - [~] 7.18 Property 18: Invalid JSON Handling
    - **Property 18: Invalid JSON Handling**
    - **Validates: Requirements 11.5**
    - Test that malformed JSON returns 400 with VALIDATION_ERROR
    - Use fast-check with 100 iterations
    - Generate random invalid JSON strings

  - [~] 7.19 Property 19: Static 404 Handling
    - **Property 19: Static 404 Handling**
    - **Validates: Requirements 16.4**
    - Test that requests for non-existent static files return 404
    - Use fast-check with 100 iterations

  - [~] 7.20 Property 20: Cache Header Correctness
    - **Property 20: Cache Header Correctness**
    - **Validates: Requirements 16.3**
    - Test that static files have correct Cache-Control and ETag headers
    - Use fast-check with 100 iterations

  - [~] 7.21 Property 21: CORS Origin Validation
    - **Property 21: CORS Origin Validation**
    - **Validates: Requirements 17.1, 17.3, 17.4**
    - Test that allowed origins get CORS headers
    - Test that disallowed origins don't get CORS headers
    - Use fast-check with 100 iterations

- [ ] 8. Write streaming contract tests
  - Test first chunk timing (within acceptable latency)
  - Test chunk format (first without \n, subsequent with \n prefix)
  - Test chunk ordering (FIFO)
  - Test connection close (res.end() semantics)
  - Test error handling during streaming
  - Test Content-Type: application/octet-stream header
  - _Requirements: 13.2_

- [ ] 9. Write error mapping tests
  - Test invalid JSON body → 400 with VALIDATION_ERROR
  - Test missing required field → 400 with VALIDATION_ERROR
  - Test invalid field type → 400 with VALIDATION_ERROR
  - Test missing auth token → 401 with AUTHENTICATION_ERROR
  - Test invalid auth token → 401 with AUTHENTICATION_ERROR
  - Test body size exceeded → 413 with PAYLOAD_TOO_LARGE_ERROR
  - Test rate limit exceeded → 429 with RATE_LIMIT_ERROR
  - Test unhandled exception → 500 with INTERNAL_ERROR
  - Test OpenAI API error → 502 with EXTERNAL_API_ERROR
  - Test OpenAI timeout → 504 with TIMEOUT_ERROR
  - Verify error.details only included for 4xx errors
  - _Requirements: 13.5_

- [ ] 10. Write body limit tests
  - Test 1MB JSON limit on general endpoints
  - Test 32KB URL-encoded limit
  - Test 1MB limit on /chat-process
  - Test 1KB limit on /verify
  - Test 413 response with correct error structure
  - _Requirements: 13.7_

- [ ] 11. Pre-migration validation gate
  - [x] 11.1 Run complete test suite
    - Execute all unit tests
    - Execute all integration tests
    - Execute all property-based tests
    - Execute streaming contract tests
    - Execute error mapping tests
    - Execute body limit tests
    - Verify zero test failures

  - [x] 11.2 Verify API compatibility
    - Test all 6 endpoints accessible
    - Test response structures match specification
    - Test error structures match specification
    - Test streaming protocol semantically compatible

  - [x] 11.3 Verify security policies
    - Test authentication working identically
    - Test rate limiting at correct thresholds (100/hour, 10/15min)
    - Test security headers present on all responses
    - Test session persistence working
    - Test CORS working with allowed origins

  - [x] 11.4 Verify performance baseline
    - Run load tests on current Express implementation
    - Run load tests on native implementation
    - Compare latency (p50, p95, p99)
    - Compare throughput (requests per second)
    - Verify performance within 10% of baseline

  - [x] 11.5 Verify code quality and configuration
    - Run TypeScript compiler (zero errors in source and test files)
    - Run ESLint (zero warnings)
    - Run Prettier check
    - Verify no Express imports in codebase
    - Audit tsconfig.json for strict mode settings
    - Audit codebase for 'any' usage and minimize where possible
    - Update package.json engines.node to ">=24.0.0"
    - Verify environment variable compatibility with existing .env files
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 20.1, 20.2, 20.3, 21.1, 21.2_

  - [x] 11.6 Verify code coverage
    - Run test suite with coverage reporting
    - Verify code coverage >80% for new code
    - Identify untested code paths
    - Add tests for critical paths if coverage below threshold
    - _Requirements: 13.9_

  - [x] 11.7 Document validation results
    - Document any differences or limitations
    - Document HTTP/2 deployment constraints
    - Document TLS requirements for browser HTTP/2
    - Document reverse proxy considerations
    - Document h2c browser limitations and warning behavior

- [ ] 12. Switch to native implementation
  - [x] 12.1 Backup Express implementation
    - Rename `apps/api/src/index.ts` to `apps/api/src/index-express.ts`
    - Commit backup to version control

  - [x] 12.2 Activate native implementation
    - Rename `apps/api/src/index-native.ts` to `apps/api/src/index.ts`
    - Update `apps/api/package.json` scripts if needed
    - Update build configuration if needed

  - [x] 12.3 Verify switch successful
    - Run full test suite
    - Start server and verify it accepts connections
    - Test all endpoints manually
    - Check logs for errors or warnings

- [ ] 13. Remove Express dependencies
  - [x] 13.1 Remove packages from package.json
    - Remove `express` from dependencies
    - Remove `express-session` from dependencies
    - Remove `express-rate-limit` from dependencies
    - Remove `helmet` from dependencies
    - Remove `connect-redis` from dependencies
    - Remove `@types/express` from devDependencies

  - [x] 13.2 Clean up old code
    - Delete `apps/api/src/middleware/` directory (old Express middleware)
    - Delete `apps/api/src/index-express.ts` (backup)
    - Remove any remaining Express imports
    - Remove any remaining Express types

  - [x] 13.3 Update lockfile
    - Run `pnpm install` to update pnpm-lock.yaml
    - Verify no Express packages in lockfile
    - Commit updated lockfile

  - [x] 13.4 Verify clean removal
    - Search codebase for "express" imports
    - Search codebase for Express types (Request, Response, NextFunction)
    - Verify zero matches

- [ ] 14. Update documentation
  - [x] 14.1 Update README.md
    - Document new architecture (Transport Layer + HTTP/2 Adapter)
    - Document Node.js 24+ requirement
    - Document HTTP/2 deployment scenarios
    - Document TLS requirements for browser HTTP/2
    - Document reverse proxy considerations
    - List removed dependencies

  - [x] 14.2 Update API documentation
    - Verify all endpoint documentation is accurate
    - Document error response structure
    - Document streaming protocol
    - Document rate limiting thresholds

  - [x] 14.3 Create migration notes
    - Document migration process
    - Document validation gates
    - Document performance comparison
    - Document any breaking changes (if any)

  - [x] 14.4 Update deployment guides
    - Document HTTP/2 with TLS configuration
    - Document HTTP/1.1 fallback configuration
    - Document development setup (no TLS)
    - Document reverse proxy setup
    - Add warning about h2c browser limitations

  - [x] 14.5 Update configuration documentation
    - Document all environment variables
    - Document body size limit configuration
    - Document rate limit configuration
    - Document session configuration
    - Document Redis configuration (native client)

- [ ] 15. Final validation and cleanup
  - [ ] 15.1 Run final test suite
    - Execute all tests
    - Verify zero failures
    - Verify zero TypeScript errors
    - Verify zero linting warnings

  - [ ] 15.2 Run 24-hour soak test
    - Start server with production configuration
    - Run continuous load for 24 hours
    - Monitor memory usage for leaks
    - Monitor error logs
    - Verify graceful shutdown works

  - [ ] 15.3 Verify HTTP/2 protocol
    - Test HTTP/2 with TLS (if configured)
    - Test HTTP/1.1 fallback
    - Test h2c (cleartext HTTP/2) if applicable
    - Document protocol negotiation behavior

  - [ ] 15.4 Final code cleanup
    - Remove any commented-out code
    - Remove any TODO comments
    - Run Prettier formatting
    - Run ESLint auto-fix

  - [ ] 15.5 Final documentation review
    - Review all updated documentation
    - Verify accuracy of all examples
    - Verify completeness of migration notes
    - Verify HTTP/2 deployment constraints documented

## Notes

- All testing tasks are REQUIRED per requirements.md and design.md (SHALL requirements)
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation before proceeding
- Property tests validate universal correctness properties with 100 iterations minimum
- Unit tests validate specific examples and edge cases
- Code coverage must exceed 80% for new code
- The migration is one-way with comprehensive pre-migration validation gates
- HTTP/2 requires TLS for browser compatibility; h2c has limited support
- Warning logged at startup when TLS not configured: "Warning: HTTP/2 without TLS (h2c) has limited browser support. Configure TLS for production use."
- Node.js 24.0.0+ is required for native HTTP/2 and modern features (enforced in package.json engines)
- All error responses follow {status: 'Fail'|'Error', message, data: null, error?: {...}} structure
- Body size limits: 1MB JSON, 32KB URL-encoded, 1MB /chat-process, 1KB /verify
- Rate limits: 100 req/hour general, 10 req/15min for /verify
- Streaming uses application/octet-stream with newline-delimited JSON
- Session management uses native redis client, not connect-redis
- All security policies (auth, rate limiting, CSP, CORS) preserved identically
- Logging infrastructure (request logs, error logs, performance metrics, format, output targets) preserved from existing logger.ts
- TypeScript strict mode enforced with zero errors in source and test files
- Minimize 'any' usage throughout codebase
- Environment variable compatibility maintained with existing .env files
- Dual path support: both "/api/\*" and root paths produce identical responses
