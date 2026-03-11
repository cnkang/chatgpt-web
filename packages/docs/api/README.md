# API Documentation

This directory contains comprehensive API documentation for the ChatGPT Web backend service.

## Available Documentation

- **[API Reference](./api-reference.md)** - Complete API endpoint documentation with streaming protocol details and AI SDK UI integration
- **[Authentication](./authentication.md)** - API authentication and security
- **[Error Handling](./error-handling.md)** - Error response structure and codes
- **[Rate Limiting](./rate-limiting.md)** - Rate limiting thresholds and configuration
- **[Provider Integration](./providers.md)** - OpenAI and Azure OpenAI provider details

## API Overview

The ChatGPT Web API provides a secure, rate-limited interface to OpenAI and Azure OpenAI services.

### Architecture

Built on Node.js 24+ native HTTP/2 with zero framework dependencies:

- **Transport Layer**: Framework-agnostic HTTP abstractions
- **HTTP/2 Support**: Native `node:http2` module with HTTP/1.1 fallback
- **Security-First**: Native middleware for auth, rate limiting, CORS, validation
- **Streaming Responses**: Real-time AI responses via newline-delimited JSON

### Endpoints

The API provides 5 endpoints:

1. **GET /health** - Health check (no auth, general rate limit)
2. **POST /session** - Session info (no auth, general rate limit)
3. **POST /verify** - Token verification (strict rate limit: 10 req/15min)
4. **POST /chat-process** - Chat with streaming (auth required, general rate limit)
5. **POST /config** - Configuration (auth required, general rate limit)

All endpoints support both `/endpoint` and `/api/endpoint` paths.

## Base URL

- **Development**: `http://localhost:3002`
- **Production**: `https://your-domain.com`

## Authentication

Optional Bearer token authentication:

```bash
# Enable authentication
AUTH_SECRET_KEY=your_secret_key_here
```

Protected endpoints require `Authorization: Bearer <token>` header.

## Rate Limiting

Two-tier rate limiting:

- **General**: 100 requests per hour (configurable via `MAX_REQUEST_PER_HOUR`)
- **Strict**: 10 requests per 15 minutes (for `/verify` endpoint)

All responses include `X-RateLimit-*` headers.

## Error Response Structure

Consistent error format across all endpoints:

```json
{
  "status": "Fail" | "Error",
  "message": "Human-readable error message",
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "type": "ErrorType",
    "timestamp": "2026-01-27T12:00:00.000Z"
  }
}
```

- `"Fail"`: Client errors (4xx)
- `"Error"`: Server errors (5xx)

## Streaming Protocol

The `/chat-process` endpoint streams responses as newline-delimited JSON:

```
Content-Type: application/octet-stream
```

Each chunk is a complete JSON object:

```json
{"id":"chatcmpl-123","text":"Hello","delta":"Hello","detail":{"usage":{"total_tokens":1}}}
{"id":"chatcmpl-123","text":"Hello!","delta":"!","detail":{"usage":{"total_tokens":2}}}
```

- First chunk: No leading newline
- Subsequent chunks: `\n` + JSON object
- Connection closes when complete

## Quick Examples

### Health Check

```bash
curl http://localhost:3002/api/health
```

### Chat Request

```bash
curl -X POST http://localhost:3002/api/chat-process \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_secret_key" \
  -d '{
    "prompt": "Hello, how are you?",
    "systemMessage": "You are a helpful assistant.",
    "temperature": 0.7
  }'
```

### Verify Token

```bash
curl -X POST http://localhost:3002/api/verify \
  -H "Content-Type: application/json" \
  -d '{
    "token": "your_secret_key"
  }'
```

### Get Session Info

```bash
curl -X POST http://localhost:3002/api/session \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Body Size Limits

Different endpoints have different body size limits:

| Endpoint        | Body Limit | Reason                   |
| --------------- | ---------- | ------------------------ |
| `/chat-process` | 1MB        | Accommodate long prompts |
| `/verify`       | 1KB        | Token verification only  |
| Other endpoints | 1MB        | Default limit            |

## Security Headers

All responses include security headers:

- Content-Security-Policy
- Strict-Transport-Security
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy
- Permissions-Policy

## Migration Notes

The backend was migrated from Express.js to native Node.js HTTP/2:

**Removed Dependencies:**

- `express` → Native `node:http2` module
- `express-session` → Native session management
- `express-rate-limit` → Native rate limiter
- `helmet` → Native security headers
- `connect-redis` → Native `redis` client

**Benefits:**

- Zero framework dependencies
- Native HTTP/2 support
- Framework-agnostic architecture
- Improved maintainability

**Compatibility:**

- All API endpoints unchanged
- Response formats identical
- Security policies preserved
- 100% backward compatible

For detailed information, see the specific documentation files in this directory.
