# Configuration Reference

Complete reference for all environment variables and configuration options in ChatGPT Web with native Node.js HTTP/2 implementation.

## Table of Contents

- [Overview](#overview)
- [Required Configuration](#required-configuration)
- [AI Provider Configuration](#ai-provider-configuration)
- [Security Configuration](#security-configuration)
- [Rate Limiting](#rate-limiting)
- [Session Management](#session-management)
- [Redis Configuration](#redis-configuration)
- [Body Size Limits](#body-size-limits)
- [HTTP/2 and TLS](#http2-and-tls)
- [Server Configuration](#server-configuration)
- [Network and Proxy](#network-and-proxy)
- [Logging and Debugging](#logging-and-debugging)
- [Advanced Options](#advanced-options)

## Overview

Configuration is managed through environment variables in `apps/api/.env`. Copy `apps/api/.env.example` to get started:

```bash
cp apps/api/.env.example apps/api/.env
```

**Required Node.js Version**: 24.0.0 or higher

## Required Configuration

### Minimal Setup (OpenAI)

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-official-api-key
DEFAULT_MODEL=gpt-5.4
SESSION_SECRET=replace-with-a-long-random-string
```

### Minimal Setup (Azure OpenAI)

```bash
AI_PROVIDER=azure
AZURE_OPENAI_API_KEY=your-azure-api-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=your-deployment-name
SESSION_SECRET=replace-with-a-long-random-string
```

## AI Provider Configuration

### OpenAI Configuration

| Variable                   | Required    | Default                  | Description                                         |
| -------------------------- | ----------- | ------------------------ | --------------------------------------------------- |
| `AI_PROVIDER`              | Yes         | `openai`                 | AI provider selection: `openai` or `azure`          |
| `OPENAI_API_KEY`           | Yes\*       | -                        | OpenAI API key (format: `sk-...`)                   |
| `DEFAULT_MODEL`            | Recommended | `gpt-5.4`                | Default model for chat completions                  |
| `OPENAI_API_BASE_URL`      | No          | `https://api.openai.com` | Custom API base URL for OpenAI-compatible endpoints |
| `SKIP_API_DOMAIN_CHECK`    | No          | `false`                  | Skip strict domain validation (use with caution)    |
| `OPENAI_API_DISABLE_DEBUG` | No          | `false`                  | Disable debug logging for OpenAI SDK                |
| `OPENAI_ORGANIZATION`      | No          | -                        | OpenAI organization ID (format: `org-...`)          |
| `OPENAI_API_MODEL`         | No          | -                        | Legacy alias for `DEFAULT_MODEL`                    |

\*Required when `AI_PROVIDER=openai`

**Example Configuration:**

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=sk-proj-abc123...
DEFAULT_MODEL=gpt-5.4
OPENAI_API_BASE_URL=https://api.openai.com
SKIP_API_DOMAIN_CHECK=false
OPENAI_API_DISABLE_DEBUG=true
```

**Security Notes:**

- `SKIP_API_DOMAIN_CHECK=true` allows third-party OpenAI-compatible endpoints but bypasses security validation
- Only use with trusted endpoints
- Azure endpoint validation remains strict regardless of this setting

### Azure OpenAI Configuration

| Variable                         | Required | Default              | Description               |
| -------------------------------- | -------- | -------------------- | ------------------------- |
| `AI_PROVIDER`                    | Yes      | -                    | Must be set to `azure`    |
| `AZURE_OPENAI_API_KEY`           | Yes\*    | -                    | Azure OpenAI API key      |
| `AZURE_OPENAI_ENDPOINT`          | Yes\*    | -                    | Azure OpenAI endpoint URL |
| `AZURE_OPENAI_DEPLOYMENT`        | Yes\*    | -                    | Deployment name in Azure  |
| `AZURE_OPENAI_API_VERSION`       | No       | `2024-02-15-preview` | Azure API version         |
| `AZURE_OPENAI_USE_RESPONSES_API` | No       | `true`               | Use responses API format  |

\*Required when `AI_PROVIDER=azure`

**Example Configuration:**

```bash
AI_PROVIDER=azure
AZURE_OPENAI_API_KEY=abc123def456...
AZURE_OPENAI_ENDPOINT=https://my-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-4o-deployment
AZURE_OPENAI_API_VERSION=2024-02-15-preview
AZURE_OPENAI_USE_RESPONSES_API=true
DEFAULT_MODEL=gpt-4o-deployment
```

## Security Configuration

### Authentication and Access Control

| Variable           | Required                 | Default | Description                                             |
| ------------------ | ------------------------ | ------- | ------------------------------------------------------- |
| `AUTH_SECRET_KEY`  | No                       | -       | Simple access password for API endpoints                |
| `SESSION_SECRET`   | **Strongly Recommended** | -       | Secret key for session signing (use long random string) |
| `ALLOWED_ORIGINS`  | Recommended              | -       | Comma-separated list of allowed CORS origins            |
| `CORS_ORIGIN`      | No                       | -       | Alias for `ALLOWED_ORIGINS`                             |
| `CORS_CREDENTIALS` | No                       | `true`  | Allow credentials in CORS responses                     |
| `HTTPS`            | No                       | -       | Production HTTPS flag (used by security validation)     |
| `TRUST_PROXY`      | No                       | `1`     | Number of proxy hops to trust for IP extraction         |

**Example Configuration:**

```bash
# Simple access password (optional)
AUTH_SECRET_KEY=my-secure-password-123

# Session secret (REQUIRED in production)
SESSION_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6

# CORS restrictions (recommended in production)
ALLOWED_ORIGINS=https://chat.example.com,https://app.example.com
CORS_CREDENTIALS=true

# Production HTTPS flag
HTTPS=true

# Reverse proxy configuration
TRUST_PROXY=1
```

**Security Best Practices:**

1. **SESSION_SECRET**: Generate a cryptographically secure random string (64+ characters)

   ```bash
   # Generate secure session secret
   openssl rand -base64 64
   ```

2. **AUTH_SECRET_KEY**: If enabled, use a strong password and rotate regularly

3. **ALLOWED_ORIGINS**: Always restrict CORS in production to specific domains

4. **TRUST_PROXY**: Set to match your deployment topology:
   - `1` - Single reverse proxy (nginx, Docker)
   - `2` - Two proxies (load balancer + nginx)
   - `false` - No proxy (direct connection)

### Security Headers

The server automatically applies security headers via native middleware:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (when HTTPS enabled)
- Content Security Policy (CSP)

## Rate Limiting

The native implementation includes two rate limiting strategies:

### General Rate Limiting

Applied to most API endpoints (`/chat-process`, `/config`, `/session`, `/health`).

| Variable               | Default | Description                              |
| ---------------------- | ------- | ---------------------------------------- |
| `MAX_REQUEST_PER_HOUR` | `100`   | Maximum requests per IP address per hour |

**Configuration:**

```bash
# Allow 200 requests per hour per IP
MAX_REQUEST_PER_HOUR=200
```

**Behavior:**

- **Window**: 1 hour (3600000 milliseconds)
- **Tracking**: Per client IP address
- **Storage**: In-memory Map (automatically cleaned up)
- **Response**: HTTP 429 with retry-after headers when limit exceeded

**Response Headers:**

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067200
```

**Error Response (429):**

```json
{
  "status": "Fail",
  "message": "Too many requests from this IP, please try again after 60 minutes",
  "data": null,
  "error": {
    "code": "RATE_LIMIT_ERROR",
    "type": "RateLimitError",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### Strict Rate Limiting (Authentication)

Applied to `/verify` endpoint for token verification.

**Fixed Configuration:**

- **Window**: 15 minutes (900000 milliseconds)
- **Limit**: 10 requests per IP
- **Purpose**: Prevent brute-force authentication attempts

**Error Response (429):**

```json
{
  "status": "Fail",
  "message": "Too many authentication attempts, please try again after 15 minutes",
  "data": null,
  "error": {
    "code": "RATE_LIMIT_ERROR",
    "type": "RateLimitError",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### Legacy Variables (Not Used)

These variables exist in provider configuration but are not actively used by the native rate limiter:

```bash
ENABLE_RATE_LIMIT=true           # Rate limiting always enabled
RATE_LIMIT_WINDOW_MS=3600000     # Use MAX_REQUEST_PER_HOUR instead
RATE_LIMIT_MAX_REQUESTS=100      # Use MAX_REQUEST_PER_HOUR instead
```

## Session Management

Sessions are managed using cookie-based session IDs with configurable storage backends.

### Session Configuration

| Variable         | Required                 | Default | Description                    |
| ---------------- | ------------------------ | ------- | ------------------------------ |
| `SESSION_SECRET` | **Strongly Recommended** | -       | Secret key for session signing |

**Default Session Settings:**

```typescript
{
  name: 'sessionId',              // Cookie name
  maxAge: 24 * 60 * 60 * 1000,   // 24 hours
  secure: false,                  // Set true in production with HTTPS
  httpOnly: true,                 // Prevent JavaScript access
  sameSite: 'strict'              // CSRF protection
}
```

### Session Storage Backends

#### In-Memory Storage (Development)

**Default behavior** when no Redis configuration is provided.

**Characteristics:**

- Fast and simple
- No external dependencies
- Sessions lost on server restart
- Not suitable for multi-instance deployments

**Use Case:** Development and single-instance deployments

#### Redis Storage (Production)

**Recommended for production** - provides persistent, scalable session storage.

**Configuration:** See [Redis Configuration](#redis-configuration) section below.

**Characteristics:**

- Persistent across server restarts
- Supports horizontal scaling
- Automatic TTL-based expiration
- Shared sessions across multiple instances

**Use Case:** Production and multi-instance deployments

### Session Cookie Attributes

| Attribute  | Value               | Purpose                                     |
| ---------- | ------------------- | ------------------------------------------- |
| `Max-Age`  | 86400 (24 hours)    | Cookie expiration time                      |
| `Path`     | `/`                 | Cookie available for all paths              |
| `Secure`   | `true` (production) | Requires HTTPS                              |
| `HttpOnly` | `true`              | Prevents JavaScript access (XSS protection) |
| `SameSite` | `Strict`            | CSRF protection                             |

### Session Data Structure

```typescript
interface SessionData {
  id: string // Unique session ID (64-char hex)
  data: Record<string, unknown> // User session data
  expires: number // Expiration timestamp (milliseconds)
}
```

### Session Lifecycle

1. **Creation**: New session created on first request without valid session cookie
2. **Storage**: Session saved to store (memory or Redis) on response
3. **Cookie**: Session ID sent to client via `Set-Cookie` header
4. **Validation**: Session loaded from store on subsequent requests
5. **Expiration**: Sessions automatically expire after 24 hours
6. **Cleanup**: Expired sessions removed automatically (Redis TTL or memory cleanup)

## Redis Configuration

Redis provides persistent session storage for production deployments. The native implementation uses the **native `redis` package** (not `connect-redis`).

### Redis Environment Variables

| Variable         | Required | Default | Description                   |
| ---------------- | -------- | ------- | ----------------------------- |
| `REDIS_URL`      | No       | -       | Redis connection URL          |
| `REDIS_PASSWORD` | No       | -       | Redis authentication password |

### Configuration Examples

#### Basic Redis Connection

```bash
REDIS_URL=redis://localhost:6379
```

#### Redis with Authentication

```bash
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-secure-redis-password
```

#### Redis with Custom Host/Port

```bash
REDIS_URL=redis://redis.example.com:6380
REDIS_PASSWORD=your-secure-redis-password
```

#### Redis Cloud Services

```bash
# Redis Cloud
REDIS_URL=redis://redis-12345.c1.us-east-1-1.ec2.cloud.redislabs.com:12345
REDIS_PASSWORD=your-cloud-password

# AWS ElastiCache
REDIS_URL=redis://my-cluster.abc123.0001.use1.cache.amazonaws.com:6379

# Azure Cache for Redis
REDIS_URL=redis://my-cache.redis.cache.windows.net:6380
REDIS_PASSWORD=your-azure-access-key
```

### Redis Session Store Implementation

**Native redis Package:**

```typescript
import { createClient } from 'redis'

const client = createClient({
  url: process.env.REDIS_URL,
  password: process.env.REDIS_PASSWORD,
})

await client.connect()
```

**Key Features:**

- Automatic TTL-based expiration
- Session keys prefixed with `session:`
- JSON serialization for session data
- Error handling with fallback behavior
- Graceful connection management

### Redis Session Storage Format

**Key Pattern:** `session:{sessionId}`

**Example:**

```
Key: session:a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
Value: {"id":"a1b2...","data":{},"expires":1704067200000}
TTL: 86400 seconds (24 hours)
```

### Redis Connection Handling

**Connection Events:**

- `connect` - Successfully connected to Redis
- `error` - Connection or operation error (logged, non-fatal)
- `ready` - Client ready to accept commands

**Error Behavior:**

- Connection errors are logged but don't crash the server
- Failed operations fall back gracefully
- Sessions may fall back to memory storage on Redis failure

### Redis Requirements

**Minimum Version:** Redis 5.0+

**Required Commands:**

- `GET` - Retrieve session data
- `SETEX` - Store session with TTL
- `DEL` - Delete session

**Memory Considerations:**

- Each session: ~200-500 bytes
- 10,000 sessions: ~5 MB
- Configure `maxmemory-policy` appropriately (e.g., `allkeys-lru`)

### Production Recommendations

1. **Use Redis for production** - Enables horizontal scaling and persistence
2. **Enable authentication** - Always set `REDIS_PASSWORD` in production
3. **Use TLS** - For Redis connections over public networks
4. **Monitor memory** - Set appropriate `maxmemory` limits
5. **Configure persistence** - Enable RDB or AOF for data durability
6. **Use connection pooling** - Native client handles this automatically

## Body Size Limits

The native implementation enforces strict body size limits to prevent abuse and resource exhaustion.

### Default Limits

| Content Type                        | Default Limit          | Applied To       |
| ----------------------------------- | ---------------------- | ---------------- |
| `application/json`                  | 1 MB (1,048,576 bytes) | Most endpoints   |
| `application/x-www-form-urlencoded` | 32 KB (32,768 bytes)   | Form submissions |

### Endpoint-Specific Limits

#### General Endpoints (1 MB)

Applied to: `/chat-process`, `/config`

```typescript
// Configuration
{
  jsonLimit: 1048576,      // 1 MB
  urlencodedLimit: 32768   // 32 KB
}
```

**Rationale:** Chat messages and configuration can be large (long prompts, context)

#### Strict Endpoints (1 KB)

Applied to: `/verify`

```typescript
// Configuration
{
  jsonLimit: 1024,         // 1 KB
  urlencodedLimit: 1024    // 1 KB
}
```

**Rationale:** Authentication tokens are small; strict limit prevents abuse

### Error Response (413 Payload Too Large)

When body size exceeds the limit:

```json
{
  "status": "Fail",
  "message": "Request entity too large",
  "data": null,
  "error": {
    "code": "PAYLOAD_TOO_LARGE",
    "type": "PayloadTooLarge",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

**HTTP Status:** 413 Payload Too Large

### Implementation Details

**Body Parser Behavior:**

1. Reads request body in chunks using async iteration
2. Tracks cumulative size during streaming
3. Rejects request immediately when limit exceeded
4. Parses body based on `Content-Type` header
5. Attaches parsed body to `req.body`

**Supported Content Types:**

- `application/json` - Parsed as JSON object
- `application/x-www-form-urlencoded` - Parsed as key-value object
- Other types - Returned as raw string

### Configuration (Not Customizable via Environment)

Body size limits are **hardcoded in the implementation** for security reasons. To modify:

1. Edit `apps/api/src/index.ts`
2. Modify `createBodyParserWithLimit()` calls
3. Rebuild and redeploy

**Example modification:**

```typescript
// Increase /chat-process limit to 2 MB
const chatBodyParser = createBodyParserWithLimit(2097152) // 2 MB

router.post(
  '/chat-process',
  authMiddleware,
  generalRateLimiter.middleware(),
  chatBodyParser,
  asyncHandler(chatProcessHandler),
)
```

### Security Considerations

1. **DoS Prevention**: Limits prevent memory exhaustion attacks
2. **Early Rejection**: Requests rejected before full body read
3. **Per-Endpoint Limits**: Strict limits on sensitive endpoints
4. **No Buffering**: Streaming parser prevents memory spikes

## HTTP/2 and TLS

The native implementation supports HTTP/2 with optional TLS configuration.

### HTTP/2 Configuration

**Default Behavior:**

- HTTP/2 enabled by default
- TLS optional (h2c mode without TLS)
- Automatic fallback to HTTP/1.1 for non-HTTP/2 clients

### TLS Configuration

TLS is **configured programmatically** in the HTTP2Adapter, not via environment variables.

**TLS Configuration Interface:**

```typescript
interface TLSConfig {
  key: Buffer | string // Private key (PEM format)
  cert: Buffer | string // Certificate (PEM format)
}
```

**Example Implementation:**

```typescript
import { readFileSync } from 'node:fs'

const adapter = new HTTP2Adapter(router, middleware, {
  http2: true,
  tls: {
    key: readFileSync('/path/to/server-key.pem'),
    cert: readFileSync('/path/to/server-cert.pem'),
  },
})
```

### Deployment Modes

#### Development (HTTP/1.1, No TLS)

```typescript
const adapter = new HTTP2Adapter(router, middleware, {
  http2: false, // Disable HTTP/2
  tls: undefined, // No TLS
})
```

**Characteristics:**

- Simple setup, no certificates needed
- HTTP/1.1 only
- Suitable for local development

#### Production with TLS (HTTP/2 + HTTPS)

```typescript
const adapter = new HTTP2Adapter(router, middleware, {
  http2: true,
  tls: {
    key: readFileSync(process.env.TLS_KEY_PATH),
    cert: readFileSync(process.env.TLS_CERT_PATH),
  },
})
```

**Characteristics:**

- Full HTTP/2 support with browser compatibility
- Encrypted connections
- Recommended for production

#### Production with Reverse Proxy (HTTP/1.1)

```typescript
const adapter = new HTTP2Adapter(router, middleware, {
  http2: false, // Proxy handles HTTP/2
  tls: undefined, // Proxy handles TLS
})
```

**Characteristics:**

- Reverse proxy (nginx, Caddy) handles TLS and HTTP/2
- Backend uses HTTP/1.1
- **Recommended approach** for most deployments

### HTTP/2 Without TLS (h2c)

**Warning:** HTTP/2 cleartext (h2c) has **limited browser support**.

```typescript
const adapter = new HTTP2Adapter(router, middleware, {
  http2: true,
  tls: undefined, // No TLS = h2c mode
})
```

**Server Warning:**

```
Warning: HTTP/2 without TLS (h2c) has limited browser support.
Configure TLS for production use.
```

**Browser Support:**

- Chrome/Edge: No support for h2c
- Firefox: No support for h2c
- Safari: No support for h2c
- curl/API clients: Full support

### TLS Certificate Requirements

**Certificate Format:** PEM (Privacy Enhanced Mail)

**Required Files:**

- Private key: `server-key.pem`
- Certificate: `server-cert.pem`

**Generate Self-Signed Certificate (Development):**

```bash
openssl req -x509 -newkey rsa:4096 -keyout server-key.pem \
  -out server-cert.pem -days 365 -nodes \
  -subj "/CN=localhost"
```

**Production Certificates:**

- Use Let's Encrypt (free, automated)
- Use commercial CA (DigiCert, GlobalSign)
- Use internal CA for enterprise deployments

### Reverse Proxy Configuration

**Recommended:** Use reverse proxy for TLS termination.

**nginx Example:**

```nginx
server {
  listen 443 ssl http2;
  server_name chat.example.com;

  ssl_certificate /etc/ssl/certs/server-cert.pem;
  ssl_certificate_key /etc/ssl/private/server-key.pem;

  location / {
    proxy_pass http://localhost:3002;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

**Backend Configuration:**

```bash
# Trust proxy for IP extraction
TRUST_PROXY=1

# HTTPS flag for security validation
HTTPS=true
```

### Security Recommendations

1. **Use TLS in production** - Always encrypt traffic
2. **Use reverse proxy** - Simplifies certificate management
3. **Enable HSTS** - Automatically enabled when HTTPS detected
4. **Use strong ciphers** - Configure in reverse proxy
5. **Rotate certificates** - Automate with Let's Encrypt

## Server Configuration

### Basic Server Settings

| Variable    | Required | Default       | Description                                           |
| ----------- | -------- | ------------- | ----------------------------------------------------- |
| `NODE_ENV`  | No       | `development` | Environment mode: `development`, `production`, `test` |
| `PORT`      | No       | `3002`        | Server listening port                                 |
| `HOST`      | No       | `0.0.0.0`     | Server listening host (0.0.0.0 = all interfaces)      |
| `LOG_LEVEL` | No       | `info`        | Logging level: `error`, `warn`, `info`, `debug`       |

**Example Configuration:**

```bash
NODE_ENV=production
PORT=3002
HOST=0.0.0.0
LOG_LEVEL=info
```

### Environment Modes

#### Development

```bash
NODE_ENV=development
LOG_LEVEL=debug
```

**Behavior:**

- Verbose logging
- Detailed error messages
- Hot reload support (if configured)
- Relaxed security validation

#### Production

```bash
NODE_ENV=production
LOG_LEVEL=info
```

**Behavior:**

- Minimal logging
- Generic error messages
- Strict security validation
- Performance optimizations

#### Test

```bash
NODE_ENV=test
LOG_LEVEL=error
```

**Behavior:**

- Minimal logging (errors only)
- Test-specific configurations
- Mock external services

### Port Configuration

**Default Port:** 3002

**Common Scenarios:**

```bash
# Development (default)
PORT=3002

# Production (behind reverse proxy)
PORT=3002

# Custom port
PORT=8080

# Multiple instances (load balancing)
PORT=3002  # Instance 1
PORT=3003  # Instance 2
PORT=3004  # Instance 3
```

### Host Configuration

**Default Host:** `0.0.0.0` (all network interfaces)

**Options:**

```bash
# All interfaces (default, recommended)
HOST=0.0.0.0

# Localhost only (development)
HOST=127.0.0.1

# Specific interface
HOST=192.168.1.100
```

**Security Note:** Use `127.0.0.1` for local-only access, `0.0.0.0` for network access.

### Logging Levels

| Level   | Description                | Use Case                     |
| ------- | -------------------------- | ---------------------------- |
| `error` | Errors only                | Production (minimal logging) |
| `warn`  | Warnings and errors        | Production (standard)        |
| `info`  | Informational messages     | Production (verbose)         |
| `debug` | Detailed debug information | Development                  |

**Log Output Format:**

```json
{
  "level": "info",
  "message": "Server started successfully",
  "port": 3002,
  "environment": "production",
  "nodeVersion": "v24.0.0",
  "http2": true,
  "tls": false,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Graceful Shutdown

**Automatic Configuration:**

- Timeout: 30 seconds
- Signals: `SIGTERM`, `SIGINT`
- Behavior: Finish in-flight requests, close connections, exit cleanly

**Shutdown Sequence:**

1. Receive shutdown signal (SIGTERM/SIGINT)
2. Stop accepting new connections
3. Wait for in-flight requests (max 30s)
4. Close server and cleanup resources
5. Exit process

## Network and Proxy

### Proxy Configuration

#### HTTP/HTTPS Proxy

| Variable      | Description             | Example                           |
| ------------- | ----------------------- | --------------------------------- |
| `HTTPS_PROXY` | HTTPS proxy URL         | `http://proxy.example.com:8080`   |
| `ALL_PROXY`   | Proxy for all protocols | `socks5://proxy.example.com:1080` |

**Example Configuration:**

```bash
# HTTP/HTTPS proxy
HTTPS_PROXY=http://proxy.example.com:8080

# SOCKS5 proxy
ALL_PROXY=socks5://proxy.example.com:1080
```

#### SOCKS Proxy

| Variable               | Description                   | Example             |
| ---------------------- | ----------------------------- | ------------------- |
| `SOCKS_PROXY_HOST`     | SOCKS proxy hostname          | `proxy.example.com` |
| `SOCKS_PROXY_PORT`     | SOCKS proxy port              | `1080`              |
| `SOCKS_PROXY_USERNAME` | SOCKS authentication username | `user`              |
| `SOCKS_PROXY_PASSWORD` | SOCKS authentication password | `pass`              |

**Example Configuration:**

```bash
SOCKS_PROXY_HOST=proxy.example.com
SOCKS_PROXY_PORT=1080
SOCKS_PROXY_USERNAME=myuser
SOCKS_PROXY_PASSWORD=mypassword
```

### Reverse Proxy Trust

| Variable      | Default | Description                                     |
| ------------- | ------- | ----------------------------------------------- |
| `TRUST_PROXY` | `1`     | Number of proxy hops to trust for IP extraction |

**Configuration Examples:**

```bash
# Single reverse proxy (nginx, Docker)
TRUST_PROXY=1

# Two proxies (load balancer + nginx)
TRUST_PROXY=2

# No proxy (direct connection)
TRUST_PROXY=false

# Trust all proxies (not recommended)
TRUST_PROXY=true
```

**Impact on IP Extraction:**

The `TRUST_PROXY` setting determines how the server extracts the client's real IP address from proxy headers:

```typescript
// TRUST_PROXY=1
// X-Forwarded-For: client, proxy1, proxy2
// Extracted IP: proxy1 (trust 1 hop back)

// TRUST_PROXY=2
// X-Forwarded-For: client, proxy1, proxy2
// Extracted IP: client (trust 2 hops back)
```

**Headers Checked (in order):**

1. `X-Forwarded-For` (most common)
2. `X-Real-IP` (nginx)
3. `socket.remoteAddress` (fallback)

### Network Timeouts

| Variable     | Default | Description                     |
| ------------ | ------- | ------------------------------- |
| `TIMEOUT_MS` | `60000` | Request timeout in milliseconds |

**Example Configuration:**

```bash
# 60 second timeout (default)
TIMEOUT_MS=60000

# 2 minute timeout (for long AI responses)
TIMEOUT_MS=120000

# 30 second timeout (strict)
TIMEOUT_MS=30000
```

**Note:** This timeout applies to provider configuration but may not be actively enforced by all middleware.

## Logging and Debugging

### Logging Configuration

| Variable    | Default | Description                                         |
| ----------- | ------- | --------------------------------------------------- |
| `LOG_LEVEL` | `info`  | Logging verbosity: `error`, `warn`, `info`, `debug` |
| `DEBUG`     | -       | Enable debug mode (provider configuration)          |

**Example Configuration:**

```bash
# Production logging
LOG_LEVEL=info

# Development logging
LOG_LEVEL=debug
DEBUG=true

# Minimal logging
LOG_LEVEL=error
```

### Log Output

**Structured JSON Logging:**

```json
{
  "level": "info",
  "message": "Request completed",
  "method": "POST",
  "path": "/chat-process",
  "status": 200,
  "duration": 1234,
  "ip": "192.168.1.100",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Log Levels:**

```typescript
// Error - Critical failures
logger.error('Configuration validation failed', { error: err.message })

// Warn - Non-critical issues
logger.warn('Redis connection failed, using memory store')

// Info - Important events
logger.info('Server started successfully', { port: 3002 })

// Debug - Detailed information
logger.debug('Processing chat request', { model: 'gpt-4o', tokens: 150 })
```

### Request Logging

**Automatic Request Logging:**

Every request is logged with:

- HTTP method
- Request path
- Status code
- Response time
- Client IP address
- User agent (if available)

**Example Log:**

```json
{
  "level": "info",
  "message": "POST /chat-process 200 1234ms",
  "method": "POST",
  "path": "/chat-process",
  "status": 200,
  "duration": 1234,
  "ip": "192.168.1.100",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Debug Mode

**Enable Debug Mode:**

```bash
DEBUG=true
OPENAI_API_DISABLE_DEBUG=false
LOG_LEVEL=debug
```

**Debug Output Includes:**

- Detailed request/response logging
- Provider API calls
- Middleware execution flow
- Session management operations
- Rate limiter state

**Warning:** Debug mode may expose sensitive information. Never use in production.

## Advanced Options

### Provider Compatibility Flags

These variables are read by the provider configuration layer for compatibility with legacy code paths:

| Variable                  | Default         | Description                                    |
| ------------------------- | --------------- | ---------------------------------------------- |
| `ENABLE_RATE_LIMIT`       | `true`          | Legacy flag (rate limiting always enabled)     |
| `ENABLE_CSP`              | `true`          | Legacy flag (CSP always enabled)               |
| `ENABLE_HSTS`             | `true`          | Legacy flag (HSTS enabled when HTTPS detected) |
| `ENABLE_REASONING_MODELS` | `true`          | Enable reasoning model support (o3/o4 series)  |
| `ENABLE_REASONING`        | `true`          | Alias for `ENABLE_REASONING_MODELS`            |
| `API_KEY_HEADER`          | `authorization` | Legacy header name configuration               |
| `HOT_RELOAD`              | -               | Development hot reload flag                    |

**Example Configuration:**

```bash
# Reasoning model support (enabled by default)
ENABLE_REASONING_MODELS=true
ENABLE_REASONING=true

# Development flags
DEBUG=true
HOT_RELOAD=true
```

**Note:** Most of these flags are maintained for backward compatibility but don't affect the native routing implementation.

### Deprecated Variables (Do Not Use)

These variables are **no longer supported** and will cause validation errors:

```bash
# ❌ REMOVED - Unofficial API support
OPENAI_ACCESS_TOKEN=
API_REVERSE_PROXY=
CHATGPT_ACCESS_TOKEN=
REVERSE_PROXY_URL=

# ❌ REMOVED - Not implemented in native routing
RETRY_MAX_ATTEMPTS=
RETRY_BASE_DELAY=
REASONING_MODEL_TIMEOUT_MS=
```

**Migration:** Use official OpenAI API with `OPENAI_API_KEY` instead.

## Complete Configuration Examples

### Development Setup

```bash
# apps/api/.env

# Provider
AI_PROVIDER=openai
OPENAI_API_KEY=sk-proj-abc123...
DEFAULT_MODEL=gpt-5.4

# Server
NODE_ENV=development
PORT=3002
HOST=127.0.0.1
LOG_LEVEL=debug

# Security (relaxed for development)
SESSION_SECRET=dev-secret-change-in-production
AUTH_SECRET_KEY=dev-password
CORS_CREDENTIALS=true

# Rate limiting (generous for development)
MAX_REQUEST_PER_HOUR=1000

# Debug
DEBUG=true
```

### Production Setup (OpenAI)

```bash
# apps/api/.env

# Provider
AI_PROVIDER=openai
OPENAI_API_KEY=sk-proj-abc123...
DEFAULT_MODEL=gpt-5.4
OPENAI_API_DISABLE_DEBUG=true

# Server
NODE_ENV=production
PORT=3002
HOST=0.0.0.0
LOG_LEVEL=info

# Security
SESSION_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
AUTH_SECRET_KEY=your-secure-password-here
ALLOWED_ORIGINS=https://chat.example.com,https://app.example.com
CORS_CREDENTIALS=true
HTTPS=true
TRUST_PROXY=1

# Rate limiting
MAX_REQUEST_PER_HOUR=100

# Redis session storage
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password
```

### Production Setup (Azure OpenAI)

```bash
# apps/api/.env

# Provider
AI_PROVIDER=azure
AZURE_OPENAI_API_KEY=abc123def456...
AZURE_OPENAI_ENDPOINT=https://my-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-4o-deployment
AZURE_OPENAI_API_VERSION=2024-02-15-preview
AZURE_OPENAI_USE_RESPONSES_API=true
DEFAULT_MODEL=gpt-4o-deployment

# Server
NODE_ENV=production
PORT=3002
HOST=0.0.0.0
LOG_LEVEL=info

# Security
SESSION_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
AUTH_SECRET_KEY=your-secure-password-here
ALLOWED_ORIGINS=https://chat.example.com
CORS_CREDENTIALS=true
HTTPS=true
TRUST_PROXY=1

# Rate limiting
MAX_REQUEST_PER_HOUR=100

# Redis session storage
REDIS_URL=redis://my-cache.redis.cache.windows.net:6380
REDIS_PASSWORD=your-azure-access-key
```

### Production with Proxy

```bash
# apps/api/.env

# Provider
AI_PROVIDER=openai
OPENAI_API_KEY=sk-proj-abc123...
DEFAULT_MODEL=gpt-5.4

# Server
NODE_ENV=production
PORT=3002
HOST=0.0.0.0
LOG_LEVEL=info

# Security
SESSION_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
AUTH_SECRET_KEY=your-secure-password-here
ALLOWED_ORIGINS=https://chat.example.com
CORS_CREDENTIALS=true
HTTPS=true
TRUST_PROXY=1

# Rate limiting
MAX_REQUEST_PER_HOUR=100

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password

# Corporate proxy
HTTPS_PROXY=http://proxy.corp.example.com:8080
```

### Docker Compose Setup

```yaml
# docker-compose.yml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    command: redis-server --requirepass your-redis-password
    ports:
      - '6379:6379'
    volumes:
      - redis-data:/data

  chatgpt-web:
    build: .
    image: chatgpt-web:local
    ports:
      - '3002:3002'
    environment:
      # Provider
      AI_PROVIDER: openai
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      DEFAULT_MODEL: gpt-5.4

      # Server
      NODE_ENV: production
      PORT: 3002
      HOST: 0.0.0.0
      LOG_LEVEL: info

      # Security
      SESSION_SECRET: ${SESSION_SECRET}
      AUTH_SECRET_KEY: ${AUTH_SECRET_KEY}
      ALLOWED_ORIGINS: ${ALLOWED_ORIGINS}
      CORS_CREDENTIALS: 'true'
      HTTPS: 'true'
      TRUST_PROXY: '1'

      # Rate limiting
      MAX_REQUEST_PER_HOUR: 100

      # Redis
      REDIS_URL: redis://redis:6379
      REDIS_PASSWORD: your-redis-password
    depends_on:
      - redis

volumes:
  redis-data:
```

**Environment file (.env):**

```bash
OPENAI_API_KEY=sk-proj-abc123...
SESSION_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
AUTH_SECRET_KEY=your-secure-password-here
ALLOWED_ORIGINS=https://chat.example.com
```

**Start services:**

```bash
docker compose up -d
```

## Configuration Validation

### Startup Validation

The server performs comprehensive validation on startup:

1. **Node.js Version Check**
   - Requires Node.js 24.0.0 or higher
   - Exits with error if version requirement not met

2. **Environment Configuration Validation**
   - Validates required variables based on `AI_PROVIDER`
   - Checks API key format and endpoint URLs
   - Validates deprecated variable usage

3. **Security Validation**
   - Checks for production security requirements
   - Validates CORS configuration
   - Verifies session secret in production

**Validation Errors:**

```
Configuration validation failed
Error: OPENAI_API_KEY is required when AI_PROVIDER=openai
```

**Security Warnings:**

```
[HIGH] SESSION_SECRET not set - sessions will not persist across restarts
Mitigation: Set SESSION_SECRET environment variable to a long random string
```

### Configuration Validator

**Programmatic Validation:**

```typescript
import { ConfigurationValidator } from './config/validator.js'

// Validate and exit on failure
ConfigurationValidator.validateEnvironment()

// Safe validation (returns result)
const result = ConfigurationValidator.validateSafely()
if (!result.isValid) {
  console.error('Validation errors:', result.errors)
  console.warn('Validation warnings:', result.warnings)
}

// Get validated configuration
const config = ConfigurationValidator.getValidatedConfig()
```

**Validation Result:**

```typescript
interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  config: ValidatedConfig | null
}
```

### Common Validation Errors

#### Missing API Key

```
Error: OPENAI_API_KEY is required when AI_PROVIDER=openai
```

**Solution:** Set `OPENAI_API_KEY` in `apps/api/.env`

#### Invalid Provider

```
Error: AI_PROVIDER must be 'openai' or 'azure'
```

**Solution:** Set `AI_PROVIDER=openai` or `AI_PROVIDER=azure`

#### Deprecated Variables

```
Error: Deprecated variables detected: OPENAI_ACCESS_TOKEN, API_REVERSE_PROXY
These variables are no longer supported. Use OPENAI_API_KEY instead.
```

**Solution:** Remove deprecated variables and use official API configuration

#### Azure Configuration Incomplete

```
Error: AZURE_OPENAI_ENDPOINT is required when AI_PROVIDER=azure
```

**Solution:** Set all required Azure variables:

- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_DEPLOYMENT`

### Environment Variable Precedence

1. **Process environment** (highest priority)
2. **`.env` file** in `apps/api/`
3. **Default values** (lowest priority)

**Example:**

```bash
# .env file
PORT=3002

# Command line (overrides .env)
PORT=8080 pnpm start

# Result: Server starts on port 8080
```

### Verification Commands

**Check configuration:**

```bash
# Start server and check logs
cd apps/api
pnpm start

# Expected output:
# Node.js version check passed { version: 'v24.0.0' }
# Configuration validation passed
# Security validation passed
# Server started successfully { port: 3002, environment: 'production' }
```

**Test health endpoint:**

```bash
curl http://localhost:3002/health

# Expected response:
# {"status":"Success","message":"OK","data":{"status":"healthy"}}
```

**Test configuration endpoint:**

```bash
curl -X POST http://localhost:3002/config \
  -H 'Content-Type: application/json' \
  -d '{}'

# Expected response (if AUTH_SECRET_KEY not set):
# {"status":"Success","message":"OK","data":{"auth":false}}
```

## Security Best Practices

### Production Checklist

- [ ] Set strong `SESSION_SECRET` (64+ characters, cryptographically random)
- [ ] Set strong `AUTH_SECRET_KEY` if using access control
- [ ] Configure `ALLOWED_ORIGINS` to restrict CORS
- [ ] Enable HTTPS (`HTTPS=true`)
- [ ] Use Redis for session storage (`REDIS_URL`)
- [ ] Set appropriate `TRUST_PROXY` value
- [ ] Set `NODE_ENV=production`
- [ ] Use `LOG_LEVEL=info` or `LOG_LEVEL=warn`
- [ ] Disable debug mode (`DEBUG` not set)
- [ ] Configure rate limiting (`MAX_REQUEST_PER_HOUR`)
- [ ] Use reverse proxy for TLS termination
- [ ] Rotate API keys regularly
- [ ] Monitor logs for security events

### Secret Management

**Generate Secure Secrets:**

```bash
# Generate SESSION_SECRET (64 characters)
openssl rand -base64 64

# Generate AUTH_SECRET_KEY (32 characters)
openssl rand -base64 32

# Generate Redis password (32 characters)
openssl rand -base64 32
```

**Store Secrets Securely:**

1. **Development:** Use `.env` file (add to `.gitignore`)
2. **Production:** Use environment variables or secret management service
3. **Docker:** Use Docker secrets or environment files
4. **Kubernetes:** Use Kubernetes secrets
5. **Cloud:** Use AWS Secrets Manager, Azure Key Vault, etc.

**Never:**

- Commit secrets to version control
- Share secrets in plain text
- Use default or weak secrets in production
- Log secrets in application logs

### CORS Configuration

**Development (permissive):**

```bash
# Allow all origins (development only)
ALLOWED_ORIGINS=
CORS_CREDENTIALS=true
```

**Production (restrictive):**

```bash
# Specific domains only
ALLOWED_ORIGINS=https://chat.example.com,https://app.example.com
CORS_CREDENTIALS=true
```

**Security Impact:**

- Restricts which domains can make API requests
- Prevents unauthorized cross-origin access
- Required for production deployments

### Rate Limiting Strategy

**Conservative (default):**

```bash
MAX_REQUEST_PER_HOUR=100
```

**Generous (trusted users):**

```bash
MAX_REQUEST_PER_HOUR=500
```

**Strict (public access):**

```bash
MAX_REQUEST_PER_HOUR=50
```

**Considerations:**

- Balance user experience vs. abuse prevention
- Monitor rate limit hits in logs
- Adjust based on usage patterns
- Consider per-user limits for authenticated users

### Redis Security

**Authentication:**

```bash
# Always use password in production
REDIS_PASSWORD=your-secure-redis-password
```

**Network Security:**

- Use private network for Redis connections
- Enable TLS for Redis over public networks
- Restrict Redis port (6379) with firewall rules
- Use Redis ACLs for fine-grained access control

**Redis Configuration:**

```redis
# redis.conf

# Require password
requirepass your-secure-redis-password

# Bind to specific interface
bind 127.0.0.1

# Disable dangerous commands
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command CONFIG ""

# Enable persistence
save 900 1
save 300 10
save 60 10000
```

### Monitoring and Alerting

**Key Metrics to Monitor:**

1. **Rate Limit Hits**
   - Track 429 responses
   - Alert on unusual patterns

2. **Authentication Failures**
   - Monitor failed `/verify` attempts
   - Alert on brute-force patterns

3. **Error Rates**
   - Track 4xx and 5xx responses
   - Alert on elevated error rates

4. **Response Times**
   - Monitor API latency
   - Alert on performance degradation

5. **Resource Usage**
   - CPU and memory utilization
   - Redis memory usage
   - Connection pool exhaustion

**Log Analysis:**

```bash
# Find rate limit violations
grep "RATE_LIMIT_ERROR" logs/app.log

# Find authentication failures
grep "AUTH_ERROR" logs/app.log

# Find slow requests (>5s)
grep "duration.*[5-9][0-9][0-9][0-9]" logs/app.log
```

## Troubleshooting

### Common Issues

#### Server Won't Start

**Symptom:** Server exits immediately on startup

**Possible Causes:**

1. **Node.js version too old**

   ```
   Error: Node.js 24.0.0 or higher is required. Current version: v20.0.0
   ```

   **Solution:** Upgrade to Node.js 24+

2. **Missing API key**

   ```
   Error: OPENAI_API_KEY is required when AI_PROVIDER=openai
   ```

   **Solution:** Set `OPENAI_API_KEY` in `.env`

3. **Port already in use**

   ```
   Error: listen EADDRINUSE: address already in use :::3002
   ```

   **Solution:** Change `PORT` or stop conflicting process

4. **Invalid configuration**
   ```
   Configuration validation failed
   ```
   **Solution:** Check logs for specific validation errors

#### Redis Connection Fails

**Symptom:** Warning about Redis connection in logs

```
Redis connection error: Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Solutions:**

1. **Start Redis:**

   ```bash
   # macOS
   brew services start redis

   # Linux
   sudo systemctl start redis

   # Docker
   docker run -d -p 6379:6379 redis:7-alpine
   ```

2. **Check Redis URL:**

   ```bash
   REDIS_URL=redis://localhost:6379
   ```

3. **Verify Redis password:**
   ```bash
   redis-cli -a your-redis-password ping
   # Expected: PONG
   ```

**Fallback Behavior:** Server continues with in-memory sessions if Redis fails

#### Rate Limit Issues

**Symptom:** Users getting 429 errors frequently

**Solutions:**

1. **Increase limit:**

   ```bash
   MAX_REQUEST_PER_HOUR=200
   ```

2. **Check IP extraction:**
   - Verify `TRUST_PROXY` setting matches deployment
   - Check `X-Forwarded-For` headers in logs

3. **Clear rate limit state:**
   - Restart server (in-memory state cleared)
   - Flush Redis keys: `redis-cli KEYS "ratelimit:*" | xargs redis-cli DEL`

#### CORS Errors

**Symptom:** Browser console shows CORS errors

```
Access to fetch at 'http://localhost:3002/chat-process' from origin
'http://localhost:1002' has been blocked by CORS policy
```

**Solutions:**

1. **Add origin to allowlist:**

   ```bash
   ALLOWED_ORIGINS=http://localhost:1002,https://chat.example.com
   ```

2. **Enable credentials:**

   ```bash
   CORS_CREDENTIALS=true
   ```

3. **Check preflight requests:**
   - Ensure OPTIONS requests return 200
   - Verify CORS headers in response

#### Session Issues

**Symptom:** Users logged out frequently or sessions not persisting

**Solutions:**

1. **Set SESSION_SECRET:**

   ```bash
   SESSION_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
   ```

2. **Use Redis for persistence:**

   ```bash
   REDIS_URL=redis://localhost:6379
   ```

3. **Check cookie settings:**
   - Verify `secure` flag matches HTTPS usage
   - Check `sameSite` attribute compatibility

4. **Verify session expiration:**
   - Default: 24 hours
   - Check Redis TTL: `redis-cli TTL session:abc123...`

#### Body Size Limit Errors

**Symptom:** 413 Payload Too Large errors

```json
{
  "status": "Fail",
  "message": "Request entity too large",
  "error": {
    "code": "PAYLOAD_TOO_LARGE"
  }
}
```

**Solutions:**

1. **For /chat-process (1 MB limit):**
   - Reduce message size
   - Split large prompts into smaller chunks

2. **For /verify (1 KB limit):**
   - Ensure token is not excessively large
   - Check request format

3. **Modify limits (requires code change):**
   - Edit `apps/api/src/index.ts`
   - Adjust `createBodyParserWithLimit()` values
   - Rebuild and redeploy

### Debug Mode

**Enable comprehensive debugging:**

```bash
NODE_ENV=development
LOG_LEVEL=debug
DEBUG=true
OPENAI_API_DISABLE_DEBUG=false
```

**Debug output includes:**

- Request/response details
- Middleware execution flow
- Provider API calls
- Session operations
- Rate limiter state

**Disable in production** - may expose sensitive information

### Health Check

**Verify server health:**

```bash
curl http://localhost:3002/health

# Expected response:
{
  "status": "Success",
  "message": "OK",
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

**Health check includes:**

- Server responsiveness
- Basic routing functionality
- No authentication required

### Configuration Dump

**View current configuration (safe):**

```bash
curl -X POST http://localhost:3002/config \
  -H 'Content-Type: application/json' \
  -d '{}'

# Response includes:
{
  "status": "Success",
  "data": {
    "auth": false,
    "model": "gpt-5.4",
    "provider": "openai"
  }
}
```

**Note:** Sensitive values (API keys, secrets) are never exposed

### Getting Help

**Check logs:**

```bash
# View recent logs
tail -f logs/app.log

# Search for errors
grep "ERROR" logs/app.log

# Search for specific endpoint
grep "/chat-process" logs/app.log
```

**Verify environment:**

```bash
# Check Node.js version
node --version

# Check environment variables (safe subset)
env | grep -E "NODE_ENV|PORT|AI_PROVIDER|LOG_LEVEL"

# Test Redis connection
redis-cli -a "$REDIS_PASSWORD" ping
```

**Report issues:**

- Include Node.js version
- Include relevant log excerpts (redact secrets)
- Describe expected vs. actual behavior
- Provide minimal reproduction steps

## Quick Reference

### Environment Variables Summary

| Category       | Variable                  | Required    | Default                  | Description                   |
| -------------- | ------------------------- | ----------- | ------------------------ | ----------------------------- |
| **Provider**   | `AI_PROVIDER`             | Yes         | `openai`                 | Provider: `openai` or `azure` |
|                | `DEFAULT_MODEL`           | Recommended | `gpt-5.4`                | Default AI model              |
| **OpenAI**     | `OPENAI_API_KEY`          | Yes\*       | -                        | OpenAI API key                |
|                | `OPENAI_API_BASE_URL`     | No          | `https://api.openai.com` | API base URL                  |
|                | `SKIP_API_DOMAIN_CHECK`   | No          | `false`                  | Skip domain validation        |
| **Azure**      | `AZURE_OPENAI_API_KEY`    | Yes\*\*     | -                        | Azure API key                 |
|                | `AZURE_OPENAI_ENDPOINT`   | Yes\*\*     | -                        | Azure endpoint URL            |
|                | `AZURE_OPENAI_DEPLOYMENT` | Yes\*\*     | -                        | Azure deployment name         |
| **Security**   | `SESSION_SECRET`          | Recommended | -                        | Session signing secret        |
|                | `AUTH_SECRET_KEY`         | No          | -                        | Access password               |
|                | `ALLOWED_ORIGINS`         | Recommended | -                        | CORS allowlist                |
|                | `TRUST_PROXY`             | No          | `1`                      | Proxy hop count               |
| **Rate Limit** | `MAX_REQUEST_PER_HOUR`    | No          | `100`                    | Requests per hour per IP      |
| **Redis**      | `REDIS_URL`               | No          | -                        | Redis connection URL          |
|                | `REDIS_PASSWORD`          | No          | -                        | Redis password                |
| **Server**     | `NODE_ENV`                | No          | `development`            | Environment mode              |
|                | `PORT`                    | No          | `3002`                   | Server port                   |
|                | `HOST`                    | No          | `0.0.0.0`                | Server host                   |
|                | `LOG_LEVEL`               | No          | `info`                   | Logging level                 |

\*Required when `AI_PROVIDER=openai`  
\*\*Required when `AI_PROVIDER=azure`

### Body Size Limits

| Endpoint        | JSON Limit | URL-Encoded Limit |
| --------------- | ---------- | ----------------- |
| `/chat-process` | 1 MB       | 32 KB             |
| `/config`       | 1 MB       | 32 KB             |
| `/session`      | 1 MB       | 32 KB             |
| `/verify`       | 1 KB       | 1 KB              |
| `/health`       | N/A        | N/A               |

### Rate Limits

| Endpoint        | Window | Limit                  | Configurable |
| --------------- | ------ | ---------------------- | ------------ |
| `/chat-process` | 1 hour | `MAX_REQUEST_PER_HOUR` | Yes          |
| `/config`       | 1 hour | `MAX_REQUEST_PER_HOUR` | Yes          |
| `/session`      | 1 hour | `MAX_REQUEST_PER_HOUR` | Yes          |
| `/health`       | 1 hour | `MAX_REQUEST_PER_HOUR` | Yes          |
| `/verify`       | 15 min | 10                     | No           |

### Default Ports

| Service     | Port | Protocol   |
| ----------- | ---- | ---------- |
| Backend API | 3002 | HTTP/HTTP2 |
| Frontend    | 1002 | HTTP       |
| Redis       | 6379 | TCP        |

### File Locations

| Purpose         | Path                    |
| --------------- | ----------------------- |
| Backend env     | `apps/api/.env`         |
| Frontend env    | `.env`                  |
| Backend source  | `apps/api/src/`         |
| Frontend source | `apps/web/src/`         |
| Documentation   | `packages/docs/`        |
| Logs            | `logs/` (if configured) |

### Useful Commands

```bash
# Start development server
cd apps/api && pnpm dev

# Start production server
cd apps/api && pnpm start

# Build for production
cd apps/api && pnpm build

# Run tests
cd apps/api && pnpm test

# Check configuration
curl http://localhost:3002/health

# Generate session secret
openssl rand -base64 64

# Check Redis connection
redis-cli -a "$REDIS_PASSWORD" ping

# View logs
tail -f logs/app.log
```

### Related Documentation

- [Environment Configuration](../setup/environment-configuration.md) - Setup guide
- [Deployment Environment](./environment.md) - Deployment-specific configuration
- [HTTP/2 Deployment Guide](./http2-deployment.md) - HTTP/2 and TLS setup
- [API Documentation](../api/endpoints.md) - API endpoint reference
- [Security Guide](../security/best-practices.md) - Security best practices

---

**Last Updated:** 2024-01-01  
**Version:** Native Node.js HTTP/2 Implementation  
**Node.js Requirement:** 24.0.0+
