# Requirements Document

## Introduction

This document specifies the requirements for migrating the ChatGPT Web API service from Express.js framework to a native Node.js routing implementation. The migration aims to reduce third-party framework coupling, improve long-term maintainability and portability, while preserving all existing API behavior, security policies, and compatibility guarantees.

The Native_Router will be built using Node.js built-in `node:http2` module (with `node:http` fallback) without Express, creating a framework-agnostic abstraction layer. This is a one-way migration - once completed, Express dependencies will be completely removed from the codebase. The implementation will require Node.js 24.0.0 or higher as the minimum supported version and MAY leverage Node.js 24 LTS features where beneficial.

## Glossary

- **API_Service**: The backend Node.js application in apps/api that handles HTTP requests
- **Express_Framework**: The current Express.js web framework being replaced
- **Native_Router**: The target routing implementation using Node.js built-in `node:http2` module (with `node:http` fallback), creating a framework-agnostic abstraction layer without Express dependencies
- **Transport_Layer**: Abstract HTTP interfaces for request/response handling that decouple business logic from framework specifics
- **Security_Middleware**: Authentication, rate limiting, CSP headers, and validation components
- **Streaming_Interface**: The /chat-process endpoint that streams AI responses in chunks using HTTP/2 streams or res.write()/res.end()
- **Session_Manager**: Component managing user session state and cookies using native Redis client (not connect-redis)
- **Rate_Limiter**: Component enforcing request rate limits per endpoint (100 requests per hour general, 10 requests per 15 minutes for /verify)
- **Error_Handler**: Component mapping exceptions to HTTP status codes and responses with {status: 'Fail'|'Error', message, data, error?} structure
- **HTTP2_Adapter**: Implementation layer using Node.js 24 `node:http2` module for native routing
- **Node24_Features**: Modern JavaScript features available in Node.js 24 LTS that MAY be used where beneficial (native fetch, import attributes, WebSocket, etc.)

## Requirements

### Requirement 1: Remove Express Runtime Dependencies

**User Story:** As a developer, I want the API service to run without Express dependencies, so that the codebase is framework-agnostic and more maintainable.

#### Acceptance Criteria

1. THE API_Service SHALL NOT import express package at runtime
2. THE API_Service SHALL NOT import express-session package at runtime
3. THE API_Service SHALL NOT import express-rate-limit package at runtime
4. THE API_Service SHALL NOT import connect-redis package at runtime
5. THE API_Service SHALL NOT reference Express types (Request, Response, NextFunction) in any source file
6. WHEN package.json is inspected, THE dependencies section SHALL NOT contain express, express-\*, or connect-redis packages

### Requirement 2: Preserve API Route Compatibility

**User Story:** As a client application, I want all existing API routes to work identically, so that no frontend changes are required.

#### Acceptance Criteria

1. WHEN a request is made to GET /api/health, THE API_Service SHALL respond with status 200 and health data
2. WHEN a request is made to POST /api/chat-process, THE API_Service SHALL process chat requests identically to the current implementation
3. WHEN a request is made to POST /api/config, THE API_Service SHALL return configuration data
4. WHEN a request is made to POST /api/session, THE API_Service SHALL return {status: 'Success', message: '', data: {auth: boolean, model: string}}
5. WHEN a request is made to POST /api/verify with body {token: string}, THE API_Service SHALL perform authentication verification
6. THE API_Service SHALL support both /api/\* prefixed paths and root paths with identical behavior
7. FOR ALL existing API endpoints, THE response structure (status, message, data, error fields) SHALL remain semantically identical

### Requirement 3: Abstract HTTP Transport Layer

**User Story:** As a developer, I want business logic decoupled from framework specifics, so that routing can be changed without modifying handlers.

#### Acceptance Criteria

1. THE Transport_Layer SHALL define abstract interfaces for HTTP request context
2. THE Transport_Layer SHALL define abstract interfaces for HTTP response operations
3. THE Transport_Layer SHALL define abstract interfaces for middleware handlers
4. WHEN business logic handlers are implemented, THEY SHALL depend only on Transport_Layer interfaces
5. THE Transport_Layer SHALL support extracting request method, path, headers, query parameters, and body
6. THE Transport_Layer SHALL support setting response status, headers, and body
7. THE Transport_Layer SHALL support streaming response chunks

### Requirement 4: Implement Native HTTP/2 Router Adapter

**User Story:** As a developer, I want a native HTTP/2 routing implementation, so that the API service runs on modern Node.js 24 without Express.

#### Acceptance Criteria

1. THE HTTP2_Adapter SHALL implement Transport_Layer interfaces using Node.js 24 `node:http2` module
2. THE HTTP2_Adapter SHALL prioritize HTTP/2 protocol and fallback to HTTP/1.1 when necessary
3. THE HTTP2_Adapter SHALL mount routes defined in abstract format
4. THE HTTP2_Adapter SHALL parse JSON request bodies with configurable size limits (1MB default) using native streams
5. THE HTTP2_Adapter SHALL parse URL-encoded request bodies with configurable size limits (32KB default)
6. THE HTTP2_Adapter SHALL serve static files from designated directories
7. THE HTTP2_Adapter SHALL handle routing errors and return appropriate HTTP status codes
8. THE HTTP2_Adapter MAY leverage Node.js 24 features (native fetch, import attributes, etc.) where beneficial
9. WHEN the API_Service starts, THE HTTP2_Adapter SHALL bind to the configured port and accept connections
10. THE API_Service SHALL require Node.js 24.0.0 or higher as the minimum supported version

### Requirement 5: Preserve Authentication Middleware

**User Story:** As a system administrator, I want authentication to work identically after migration, so that security policies are not weakened.

#### Acceptance Criteria

1. WHEN AUTH_SECRET_KEY is configured, THE Security_Middleware SHALL enforce authentication on protected endpoints
2. WHEN a request lacks valid authentication, THE Security_Middleware SHALL return HTTP 401
3. WHEN a request has valid authentication, THE Security_Middleware SHALL allow the request to proceed
4. THE Security_Middleware SHALL validate authentication tokens using the same algorithm as current implementation
5. FOR ALL protected endpoints, THE authentication behavior SHALL remain identical before and after migration

### Requirement 6: Preserve Rate Limiting Behavior

**User Story:** As a system administrator, I want rate limiting to work identically after migration, so that abuse prevention is maintained.

#### Acceptance Criteria

1. WHEN MAX_REQUEST_PER_HOUR is configured, THE Rate_Limiter SHALL enforce the limit (default 100 requests per hour) on general endpoints
2. WHEN a client exceeds the rate limit, THE Rate_Limiter SHALL return HTTP 429
3. WHEN a request is made to /api/verify, THE Rate_Limiter SHALL apply strict rate limiting (10 requests per 15-minute window)
4. THE Rate_Limiter SHALL track request counts per client IP address or session
5. THE Rate_Limiter SHALL reset counters after the configured time window (1 hour for general, 15 minutes for /verify)
6. FOR ALL rate-limited endpoints, THE threshold values SHALL match current implementation exactly

### Requirement 7: Preserve Security Headers

**User Story:** As a security engineer, I want security headers maintained after migration, so that XSS and injection protections remain effective.

#### Acceptance Criteria

1. THE Security_Middleware SHALL set Content-Security-Policy headers on all responses with directives matching current implementation (unsafe-eval for Mermaid, unsafe-inline for Naive UI)
2. THE Security_Middleware SHALL set X-Content-Type-Options: nosniff on all responses
3. THE Security_Middleware SHALL set X-Frame-Options headers on all responses
4. WHEN in production mode, THE Security_Middleware SHALL enforce strict CSP policies
5. THE Security_Middleware SHALL set Strict-Transport-Security headers when HTTPS is enabled
6. THE Security_Middleware SHALL provide capability equivalence to current helmet configuration
7. FOR ALL security headers, THE protection level SHALL be at least as strict as current implementation

### Requirement 8: Preserve Session Management

**User Story:** As a user, I want my session to persist across requests after migration, so that I don't need to re-authenticate frequently.

#### Acceptance Criteria

1. THE Session_Manager SHALL create session cookies with the same name as current implementation
2. THE Session_Manager SHALL set httpOnly flag on session cookies
3. THE Session_Manager SHALL set secure flag on session cookies when HTTPS is enabled
4. THE Session_Manager SHALL set sameSite policy on session cookies matching current implementation
5. WHEN a session expires, THE Session_Manager SHALL require re-authentication with identical timeout behavior
6. THE Session_Manager SHALL support optional Redis store integration using native Redis client (redis package) with same connection semantics
7. THE Session_Manager SHALL NOT use connect-redis or express-session packages
8. FOR ALL session operations, THE cookie attributes, expiration behavior, and authentication experience SHALL remain identical

### Requirement 9: Preserve Streaming Response Interface

**User Story:** As a frontend developer, I want streaming responses to work identically after migration, so that real-time chat updates continue functioning.

#### Acceptance Criteria

1. WHEN /api/chat-process receives a request, THE Streaming_Interface SHALL stream response chunks in real-time using res.write() semantics
2. THE Streaming_Interface SHALL send the first chunk within the same timeframe as current implementation
3. THE Streaming_Interface SHALL send subsequent chunks with identical format (newline-delimited JSON) and timing
4. THE Streaming_Interface SHALL signal response completion using res.end() semantics matching current protocol
5. WHEN an error occurs during streaming, THE Streaming_Interface SHALL handle it identically to current implementation
6. FOR ALL streaming responses, THE chunk format, Content-Type headers, and connection end behavior SHALL be semantically compatible with current implementation

### Requirement 10: Preserve Error Handling Behavior

**User Story:** As a client application, I want error responses to have identical status codes and structure after migration, so that error handling logic doesn't break.

#### Acceptance Criteria

1. WHEN a validation error occurs, THE Error_Handler SHALL return HTTP 400 with {status: 'Fail', message: string, data: null, error?: {...}} structure
2. WHEN an authentication error occurs, THE Error_Handler SHALL return HTTP 401 with {status: 'Fail', message: string, data: null, error?: {...}} structure
3. WHEN a request body exceeds size limits, THE Error_Handler SHALL return HTTP 413 with {status: 'Fail', message: string, data: null, error?: {...}} structure
4. WHEN rate limiting is triggered, THE Error_Handler SHALL return HTTP 429 with {status: 'Fail', message: string, data: null, error?: {...}} structure
5. WHEN an internal error occurs, THE Error_Handler SHALL return HTTP 500 with {status: 'Error', message: string, data: null, error?: {...}} structure
6. WHEN an upstream OpenAI/Azure service fails, THE Error_Handler SHALL return HTTP 502 with {status: 'Error', message: string, data: null, error?: {...}} structure
7. WHEN an upstream service times out, THE Error_Handler SHALL return HTTP 504 with {status: 'Error', message: string, data: null, error?: {...}} structure
8. THE Error_Handler SHALL log errors with the same detail level as current implementation
9. FOR ALL error responses, THE status codes and response structure SHALL remain identical
10. THE error.details field SHALL only be included for 4xx client errors, not for 5xx server errors

#### Error Mapping Matrix

| Error Type             | HTTP Status | Response Structure                                                                                                                                    | Test Scenario                   |
| ---------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Invalid JSON body      | 400         | {status: 'Fail', message: 'Invalid JSON payload', data: null, error: {code: 'VALIDATION_ERROR', type: string, timestamp: string, requestId?: string}} | Send malformed JSON             |
| Missing required field | 400         | {status: 'Fail', message: 'Validation error: ...', data: null, error: {code: 'VALIDATION_ERROR', type: string, details?: unknown, timestamp: string}} | Omit required parameter         |
| Invalid field type     | 400         | {status: 'Fail', message: 'Validation error: ...', data: null, error: {code: 'VALIDATION_ERROR', type: string, details?: unknown, timestamp: string}} | Send string for number field    |
| Missing auth token     | 401         | {status: 'Fail', message: 'Authentication required', data: null, error: {code: 'AUTHENTICATION_ERROR', type: string, timestamp: string}}              | Request without AUTH_SECRET_KEY |
| Invalid auth token     | 401         | {status: 'Fail', message: string, data: null, error: {code: 'AUTHENTICATION_ERROR', type: string, timestamp: string}}                                 | Request with wrong token        |
| Body size exceeded     | 413         | {status: 'Fail', message: 'Request entity too large', data: null, error: {code: 'PAYLOAD_TOO_LARGE_ERROR', type: string, timestamp: string}}          | Send >1MB payload               |
| Rate limit exceeded    | 429         | {status: 'Fail', message: 'Rate limit exceeded', data: null, error: {code: 'RATE_LIMIT_ERROR', type: string, timestamp: string}}                      | Exceed MAX_REQUEST_PER_HOUR     |
| Unhandled exception    | 500         | {status: 'Error', message: 'Internal server error', data: null, error: {code: 'INTERNAL_ERROR', type: string, timestamp: string}}                     | Trigger unexpected error        |
| OpenAI API error       | 502         | {status: 'Error', message: 'Upstream service request failed', data: null, error: {code: 'EXTERNAL_API_ERROR', type: string, timestamp: string}}       | Mock OpenAI 500 response        |
| OpenAI timeout         | 504         | {status: 'Error', message: 'Request timeout', data: null, error: {code: 'TIMEOUT_ERROR', type: string, timestamp: string}}                            | Mock OpenAI timeout             |

### Requirement 11: Preserve Request Body Size Limits

**User Story:** As a system administrator, I want request size limits enforced after migration, so that memory exhaustion attacks are prevented.

#### Acceptance Criteria

1. THE Native_Router SHALL enforce a maximum JSON body size limit of 1MB (1048576 bytes) by default
2. THE Native_Router SHALL enforce a maximum URL-encoded body size limit of 32KB (32768 bytes) by default
3. THE Native_Router SHALL enforce a 1MB limit specifically for /api/chat-process endpoint
4. THE Native_Router SHALL enforce a 1KB (1024 bytes) limit specifically for /api/verify endpoint
5. WHEN a request exceeds the body size limit, THE Native_Router SHALL return HTTP 413
6. THE body size limits SHALL be configurable via environment variables or configuration files
7. THE default body size limits SHALL match current implementation exactly

### Requirement 12: Maintain Input Validation

**User Story:** As a security engineer, I want input validation to work identically after migration, so that injection attacks are prevented.

#### Acceptance Criteria

1. THE Security_Middleware SHALL validate all request inputs using the same schemas as current implementation
2. WHEN invalid input is detected, THE Security_Middleware SHALL return HTTP 400 with validation errors
3. THE Security_Middleware SHALL sanitize inputs to prevent XSS attacks
4. THE Security_Middleware SHALL validate Content-Type headers
5. THE Security_Middleware SHALL reject requests with malformed JSON
6. FOR ALL validation rules, THE strictness SHALL NOT be reduced from current implementation

### Requirement 13: Maintain Test Coverage

**User Story:** As a developer, I want comprehensive tests after migration, so that regressions are caught automatically.

#### Acceptance Criteria

1. THE test suite SHALL include unit tests for all migrated middleware components (auth, rate limiting, security headers, validation)
2. THE test suite SHALL include streaming contract tests verifying res.write() and res.end() semantics
3. THE test suite SHALL include session behavior tests covering cookie attributes, expiration, and Redis integration
4. THE test suite SHALL include rate limiting threshold tests verifying 100 req/hour general and 10 req/15min for /verify
5. THE test suite SHALL include error mapping tests for all status codes in the Error Mapping Matrix (400, 401, 413, 429, 500, 502, 503)
6. THE test suite SHALL include integration tests for all API endpoints (/health, /chat-process, /config, /session, /verify)
7. THE test suite SHALL NOT depend on Express types or test utilities
8. WHEN tests are executed in CI, THE build SHALL fail if any test fails
9. THE test suite SHALL verify CORS behavior with ALLOWED_ORIGINS validation

#### Test Coverage Matrix

| Test Category            | Test Cases                                                                                         | Pass Criteria                    |
| ------------------------ | -------------------------------------------------------------------------------------------------- | -------------------------------- |
| Middleware Unit Tests    | Auth validation, rate limiter logic, security header setting, input sanitization                   | All assertions pass              |
| Streaming Contract Tests | First chunk timing, chunk format (newline-delimited JSON), res.end() behavior, error during stream | Protocol semantically compatible |
| Session Behavior Tests   | Cookie creation, httpOnly/secure/sameSite flags, expiration timeout, Redis store connection        | Identical to current             |
| Rate Limiting Tests      | General 100/hour threshold, /verify 10/15min threshold, counter reset, 429 response                | Thresholds match exactly         |
| Error Mapping Tests      | All 10 scenarios from Error Mapping Matrix with correct error structure                            | Status codes and structure match |
| Integration Tests        | All 6 endpoints with valid/invalid inputs, auth required/optional, streaming/non-streaming         | Response equivalence             |
| Body Limit Tests         | 1MB JSON limit, 32KB form limit, 1MB /chat-process limit, 1KB /verify limit                        | Correct 413 responses            |
| CI Gate Requirements     | Zero test failures, zero TypeScript errors, zero linting warnings                                  | Build passes                     |

### Requirement 14: Provide Migration Documentation

**User Story:** As a developer, I want clear migration documentation, so that I can understand how to run and debug the new implementation.

#### Acceptance Criteria

1. THE documentation SHALL explain how to start the migrated API service
2. THE documentation SHALL list all removed dependencies
3. THE documentation SHALL explain configuration changes if any
4. THE documentation SHALL provide debugging guidance for common issues
5. THE documentation SHALL include a comparison of old vs new architecture
6. THE documentation SHALL explain how to verify the migration was successful

### Requirement 15: Support Graceful Shutdown

**User Story:** As a system administrator, I want graceful shutdown to work after migration, so that in-flight requests complete before the server stops.

#### Acceptance Criteria

1. WHEN a shutdown signal is received, THE API_Service SHALL stop accepting new connections
2. WHEN a shutdown signal is received, THE API_Service SHALL wait for in-flight requests to complete
3. WHEN a shutdown timeout is reached, THE API_Service SHALL force-close remaining connections
4. THE API_Service SHALL log shutdown events
5. THE graceful shutdown behavior SHALL be identical to current implementation

### Requirement 16: Maintain Static File Serving

**User Story:** As a frontend developer, I want static files served identically after migration, so that assets load correctly.

#### Acceptance Criteria

1. THE Native_Router SHALL serve static files from the configured directory
2. THE Native_Router SHALL set appropriate Content-Type headers for static files
3. THE Native_Router SHALL support caching headers for static files
4. WHEN a static file is not found, THE Native_Router SHALL return HTTP 404
5. THE static file serving behavior SHALL be identical to current implementation

### Requirement 17: Support CORS Configuration

**User Story:** As a frontend developer, I want CORS to work identically after migration, so that cross-origin requests succeed.

#### Acceptance Criteria

1. THE Security_Middleware SHALL set CORS headers based on configuration
2. THE Security_Middleware SHALL handle preflight OPTIONS requests
3. THE Security_Middleware SHALL allow configured origins
4. THE Security_Middleware SHALL set appropriate Access-Control-Allow-\* headers
5. THE CORS behavior SHALL be identical to current implementation

### Requirement 18: Maintain Logging Behavior

**User Story:** As a system administrator, I want logging to work identically after migration, so that debugging and monitoring continue functioning.

#### Acceptance Criteria

1. THE API_Service SHALL log request details at the same verbosity level as current implementation
2. THE API_Service SHALL log error details with stack traces
3. THE API_Service SHALL log performance metrics if currently enabled
4. THE API_Service SHALL use the same log format as current implementation
5. THE API_Service SHALL support the same log output destinations (console, file) as current implementation

### Requirement 19: Support Environment Configuration

**User Story:** As a system administrator, I want environment configuration to work identically after migration, so that deployment scripts don't break.

#### Acceptance Criteria

1. THE API_Service SHALL read configuration from environment variables
2. THE API_Service SHALL support the same environment variables as current implementation
3. THE API_Service SHALL validate required environment variables on startup
4. WHEN required configuration is missing, THE API_Service SHALL fail to start with a clear error message
5. THE configuration loading behavior SHALL be identical to current implementation

### Requirement 20: Ensure Type Safety

**User Story:** As a developer, I want full TypeScript type safety after migration, so that type errors are caught at compile time.

#### Acceptance Criteria

1. THE API_Service SHALL compile with zero TypeScript errors
2. THE API_Service SHALL use strict TypeScript configuration
3. THE Transport_Layer interfaces SHALL be fully typed
4. THE Migration_Adapter SHALL implement all interface types correctly
5. THE test files SHALL compile with zero TypeScript errors
6. THE codebase SHALL NOT use 'any' type except where absolutely necessary with justification

### Requirement 21: Leverage Node.js 24 LTS Features

**User Story:** As a developer, I want the implementation to use modern Node.js 24 features where beneficial, so that the codebase is optimized for performance and maintainability.

#### Acceptance Criteria

1. THE API_Service SHALL require Node.js 24.0.0 or higher as the minimum supported version
2. THE HTTP2_Adapter SHALL use `node:http2` module for HTTP/2 protocol support
3. THE API_Service MAY use native `fetch()` API where beneficial instead of external HTTP libraries
4. THE API_Service MAY use import attributes for JSON imports where beneficial
5. THE API_Service MAY leverage native WebSocket support if WebSocket functionality is needed
6. THE API_Service MAY use modern JavaScript features available in Node.js 24 (top-level await, etc.) where beneficial
7. THE package.json SHALL specify `"engines": { "node": ">=24.0.0" }`
8. THE documentation SHALL clearly state Node.js 24 LTS as the minimum requirement
9. THE migration SHALL NOT require mandatory refactoring of stable code to use Node.js 24 features unless directly related to routing

### Requirement 22: HTTP/2 Deployment Constraints

**User Story:** As a system administrator, I want clear documentation about HTTP/2 deployment requirements, so that I can configure the service correctly for my environment.

#### Acceptance Criteria

1. THE documentation SHALL explain that HTTP/2 requires TLS for browser compatibility
2. THE documentation SHALL explain that h2c (cleartext HTTP/2) has poor browser support
3. THE documentation SHALL document reverse proxy considerations (nginx, CloudFlare may terminate HTTP/2)
4. THE documentation SHALL provide HTTP/1.1 fallback configuration guidance
5. THE HTTP2_Adapter SHALL support HTTP/1.1 fallback when HTTP/2 is not available
6. THE documentation SHALL include deployment examples for common scenarios (direct TLS, reverse proxy, development)
7. WHEN TLS is not configured, THE HTTP2_Adapter SHALL log a warning about browser HTTP/2 limitations

#### Migration Verification Checklist

| Verification Item        | Test Method                    | Success Criteria            |
| ------------------------ | ------------------------------ | --------------------------- |
| All routes accessible    | Automated endpoint tests       | 100% pass rate              |
| Authentication working   | Auth token validation tests    | Identical behavior          |
| Rate limiting enforced   | Load tests at thresholds       | 429 at correct limits       |
| Security headers present | Header inspection tests        | All required headers set    |
| Session persistence      | Multi-request session tests    | Cookies work identically    |
| Streaming functional     | /chat-process integration test | Chunks stream correctly     |
| Error codes correct      | Error scenario tests           | All error types match       |
| Performance acceptable   | Load testing comparison        | Latency within 10%          |
| Memory usage stable      | 24-hour soak test              | No memory leaks             |
| Graceful shutdown works  | SIGTERM signal test            | In-flight requests complete |
| HTTP/2 protocol working  | Protocol inspection tests      | HTTP/2 or HTTP/1.1 working  |
| Node.js 24 compatible    | Version check                  | Runs on Node.js 24+         |
| HTTP/2 deployment docs   | Documentation review           | TLS requirements documented |
