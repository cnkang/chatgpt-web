# API Reference

This document provides comprehensive API documentation for the ChatGPT Web backend API, including all endpoints, request/response formats, streaming protocol, and rate limiting details.

## Table of Contents

- [Base URL](#base-url)
- [Architecture](#architecture)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Streaming Protocol](#streaming-protocol)
- [Endpoints](#endpoints)
- [Provider Configuration](#provider-configuration)
- [Request/Response Examples](#requestresponse-examples)
- [Security Headers](#security-headers)

## Base URL

**Development:**

```
http://localhost:3002
```

**Production:**

```
https://your-domain.com
```

All API endpoints support dual path access:

- Direct: `http://localhost:3002/health`
- Prefixed: `http://localhost:3002/api/health`

Both paths work identically and route to the same handlers.

## Architecture

The backend uses a modern, framework-agnostic architecture built on Node.js 24+ native HTTP/2:

- **Transport Layer**: Framework-agnostic abstractions for HTTP operations
- **HTTP/2 Support**: Native `node:http2` module with HTTP/1.1 fallback
- **Zero Framework Dependencies**: No Express, helmet, or other web framework dependencies
- **Security-First**: Native middleware for authentication, rate limiting, CORS, and validation

### HTTP/2 Deployment

- **With TLS (Recommended)**: Full HTTP/2 support in browsers, requires valid TLS certificates
- **Without TLS (h2c)**: Limited browser support, suitable for development or behind reverse proxies
- **Reverse Proxy**: Works seamlessly behind nginx, CloudFlare, AWS ALB (receives HTTP/1.1)

## Authentication

The API supports optional authentication using a Bearer token:

```bash
# Set in environment variables
AUTH_SECRET_KEY=your_secret_key_here
```

When authentication is enabled, protected endpoints require the `Authorization` header:

```bash
curl -X POST http://localhost:3002/api/chat-process \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_secret_key_here" \
  -d '{"prompt": "Hello"}'
```

**Protected Endpoints:**

- `POST /chat-process` - Requires Bearer token
- `POST /config` - Requires Bearer token

**Public Endpoints:**

- `GET /health` - No authentication required
- `POST /session` - No authentication required
- `POST /verify` - Token in request body (not header)

## Rate Limiting

The API implements two rate limiting tiers:

### General Rate Limit

Applied to most endpoints:

- **Limit**: 100 requests per hour (configurable via `MAX_REQUEST_PER_HOUR`)
- **Window**: 60 minutes (3600000 ms)
- **Applies to**: `/health`, `/chat-process`, `/config`, `/session`

### Strict Rate Limit

Applied to authentication endpoint:

- **Limit**: 10 requests per 15 minutes
- **Window**: 15 minutes (900000 ms)
- **Applies to**: `/verify`

### Rate Limit Headers

All responses include rate limit information:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640998800
```

- `X-RateLimit-Limit`: Maximum requests allowed in window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Unix timestamp (seconds) when limit resets

### Rate Limit Exceeded Response

When rate limit is exceeded, the API returns HTTP 429:

```json
{
  "status": "Fail",
  "message": "Too many requests from this IP, please try again after 60 minutes",
  "data": null,
  "error": {
    "code": "RATE_LIMIT_ERROR",
    "type": "RateLimitError",
    "timestamp": "2026-01-27T12:00:00.000Z"
  }
}
```

### Configuration

Configure rate limiting via environment variables:

```bash
# General rate limit (default: 100)
MAX_REQUEST_PER_HOUR=200
```

The strict rate limit for `/verify` is hardcoded to 10 requests per 15 minutes for security.

## Error Handling

All API errors follow a consistent JSON response structure:

### Error Response Format

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

### Status Field Values

- `"Fail"`: Client errors (4xx status codes) - validation, authentication, rate limiting
- `"Error"`: Server errors (5xx status codes) - internal errors, external API failures

### Error Codes

| Code                   | Description                       | HTTP Status | Status Field |
| ---------------------- | --------------------------------- | ----------- | ------------ |
| `VALIDATION_ERROR`     | Request validation failed         | 400         | Fail         |
| `AUTHENTICATION_ERROR` | Invalid or missing authentication | 401         | Fail         |
| `AUTHORIZATION_ERROR`  | Insufficient permissions          | 403         | Fail         |
| `RATE_LIMIT_ERROR`     | Too many requests                 | 429         | Fail         |
| `INTERNAL_ERROR`       | Internal server error             | 500         | Error        |
| `EXTERNAL_API_ERROR`   | OpenAI/Azure API error            | 502         | Error        |
| `NETWORK_ERROR`        | Network connectivity issue        | 503         | Error        |
| `TIMEOUT_ERROR`        | Request timeout                   | 504         | Error        |

### Example Error Responses

**Validation Error (400):**

```json
{
  "status": "Fail",
  "message": "Validation error: prompt is required",
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "type": "ValidationError",
    "timestamp": "2026-01-27T12:00:00.000Z"
  }
}
```

**Authentication Error (401):**

```json
{
  "status": "Fail",
  "message": "Invalid authentication token",
  "data": null,
  "error": {
    "code": "AUTHENTICATION_ERROR",
    "type": "AuthenticationError",
    "timestamp": "2026-01-27T12:00:00.000Z"
  }
}
```

**Rate Limit Error (429):**

```json
{
  "status": "Fail",
  "message": "Too many requests from this IP, please try again after 60 minutes",
  "data": null,
  "error": {
    "code": "RATE_LIMIT_ERROR",
    "type": "RateLimitError",
    "timestamp": "2026-01-27T12:00:00.000Z"
  }
}
```

**Internal Error (500):**

```json
{
  "status": "Error",
  "message": "Internal server error",
  "data": null,
  "error": {
    "code": "INTERNAL_ERROR",
    "type": "Error",
    "timestamp": "2026-01-27T12:00:00.000Z"
  }
}
```

## Streaming Protocol

The `/chat-process` endpoint uses streaming responses to deliver AI-generated content in real-time.

### Streaming Headers

```
Content-Type: application/octet-stream
Cache-Control: no-cache
Connection: keep-alive
```

### Streaming Format

Responses are sent as **newline-delimited JSON** (NDJSON):

- First chunk: JSON object with no leading newline
- Subsequent chunks: `\n` + JSON object
- Each chunk is a complete JSON object
- Connection closes when response is complete

### Chunk Structure

Each streaming chunk contains:

```json
{
  "id": "chatcmpl-123",
  "text": "Accumulated text so far",
  "delta": "New text in this chunk",
  "detail": {
    "usage": {
      "total_tokens": 25
    }
  }
}
```

### Example Streaming Response

```
{"id":"chatcmpl-123","text":"Hello","delta":"Hello","detail":{"usage":{"total_tokens":1}}}
{"id":"chatcmpl-123","text":"Hello!","delta":"!","detail":{"usage":{"total_tokens":2}}}
{"id":"chatcmpl-123","text":"Hello! How","delta":" How","detail":{"usage":{"total_tokens":4}}}
{"id":"chatcmpl-123","text":"Hello! How can","delta":" can","detail":{"usage":{"total_tokens":6}}}
{"id":"chatcmpl-123","text":"Hello! How can I","delta":" I","detail":{"usage":{"total_tokens":8}}}
{"id":"chatcmpl-123","text":"Hello! How can I help","delta":" help","detail":{"usage":{"total_tokens":10}}}
{"id":"chatcmpl-123","text":"Hello! How can I help you","delta":" you","detail":{"usage":{"total_tokens":12}}}
{"id":"chatcmpl-123","text":"Hello! How can I help you today","delta":" today","detail":{"usage":{"total_tokens":14}}}
{"id":"chatcmpl-123","text":"Hello! How can I help you today?","delta":"?","detail":{"usage":{"total_tokens":15}}}
```

### Client Implementation

To consume streaming responses:

1. Make POST request to `/chat-process`
2. Read response as stream (not buffered)
3. Split on newline characters (`\n`)
4. Parse each line as JSON
5. Update UI with `delta` field for incremental updates
6. Use `text` field for complete accumulated text

### Error Handling During Streaming

If an error occurs after streaming starts:

- If headers not sent: Returns standard error JSON response
- If headers already sent: Connection closes immediately
- Client should handle unexpected connection closure

## Endpoints

### GET /health

Health check endpoint to verify server status.

**Path:** `GET /health` or `GET /api/health`

**Authentication:** None required

**Rate Limit:** General (100 req/hour)

**Response (200 OK):**

```json
{
  "uptime": 3600.123,
  "message": "OK",
  "timestamp": 1640995200000
}
```

**Fields:**

- `uptime`: Server uptime in seconds
- `message`: Status message (always "OK" when healthy)
- `timestamp`: Current Unix timestamp in milliseconds

---

### POST /session

Get session information including authentication status and current model.

**Path:** `POST /session` or `POST /api/session`

**Authentication:** None required

**Rate Limit:** General (100 req/hour)

**Request Body:** Empty object `{}`

**Response (200 OK):**

```json
{
  "status": "Success",
  "message": "",
  "data": {
    "auth": true,
    "model": "gpt-4o"
  }
}
```

**Fields:**

- `auth`: Boolean indicating if authentication is enabled
- `model`: Current AI model being used

---

### POST /verify

Verify authentication token.

**Path:** `POST /verify` or `POST /api/verify`

**Authentication:** Token in request body

**Rate Limit:** Strict (10 req/15min)

**Body Limit:** 1KB (1024 bytes)

**Request Body:**

```json
{
  "token": "your_secret_key_here"
}
```

**Success Response (200 OK):**

```json
{
  "status": "Success",
  "message": "Verify successfully",
  "data": null
}
```

**Error Response (401 Unauthorized):**

```json
{
  "status": "Fail",
  "message": "Invalid authentication token",
  "data": null,
  "error": {
    "code": "AUTHENTICATION_ERROR",
    "type": "AuthenticationError",
    "timestamp": "2026-01-27T12:00:00.000Z"
  }
}
```

---

### POST /chat-process

Process chat messages with streaming AI responses using Vercel AI SDK UI format.

**Path:** `POST /chat-process` or `POST /api/chat-process`

**Authentication:** Required (Bearer token in Authorization header)

**Rate Limit:** General (100 req/hour)

**Body Limit:** 1MB (1048576 bytes)

**AI SDK Integration:** This endpoint uses Vercel AI SDK (`streamText` and `pipeUIMessageStreamToResponse`) for streaming responses.

**Request Body:**

```json
{
  "messages": [
    {
      "id": "msg-1",
      "role": "user",
      "parts": [
        {
          "type": "text",
          "text": "Hello, how are you?"
        }
      ]
    }
  ],
  "systemMessage": "You are a helpful assistant.",
  "temperature": 0.7,
  "top_p": 0.9,
  "usingContext": true
}
```

**Request Fields:**

- `messages` (required): Array of UIMessage objects following AI SDK UI format
  - `id` (string): Unique message identifier
  - `role` (string): Message role - `"user"`, `"assistant"`, or `"system"`
  - `parts` (array): Message content parts
    - `type` (string): Part type - currently only `"text"` supported
    - `text` (string): Text content
  - `metadata` (optional): Additional message metadata
- `systemMessage` (optional): System prompt to guide AI behavior
- `temperature` (optional): Sampling temperature (0.0-2.0)
- `top_p` (optional): Nucleus sampling parameter (0.0-1.0)
- `usingContext` (optional): Whether to use conversation context (default: true)

**Response:** Streaming newline-delimited JSON (see [Streaming Protocol](#streaming-protocol))

**Example Streaming Response:**

```
{"id":"chatcmpl-123","text":"Hello","delta":"Hello","detail":{"usage":{"total_tokens":1}}}
{"id":"chatcmpl-123","text":"Hello!","delta":"!","detail":{"usage":{"total_tokens":2}}}
{"id":"chatcmpl-123","text":"Hello! How can I help you?","delta":" How can I help you?","detail":{"usage":{"total_tokens":8}}}
```

---

### POST /config

Get current provider configuration and usage information.

**Path:** `POST /config` or `POST /api/config`

**Authentication:** Required (Bearer token in Authorization header)

**Rate Limit:** General (100 req/hour)

**Request Body:** Empty object `{}`

**Response (200 OK):**

```json
{
  "status": "Success",
  "data": {
    "apiModel": "ChatGPTAPI",
    "timeoutMs": 60000,
    "socksProxy": "-",
    "httpsProxy": "-",
    "usage": "15.23"
  }
}
```

**Fields:**

- `apiModel`: API model type being used
- `timeoutMs`: Request timeout in milliseconds
- `socksProxy`: SOCKS proxy configuration (or "-" if not configured)
- `httpsProxy`: HTTPS proxy configuration (or "-" if not configured)
- `usage`: Usage statistics (format varies by provider)

## Provider Configuration

### OpenAI Provider

Configure the application to use OpenAI API (official or compatible):

```bash
# Environment Variables
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your_official_api_key_here
DEFAULT_MODEL=gpt-4o
```

**Optional - OpenAI-Compatible Third-Party Endpoints:**

```bash
OPENAI_API_BASE_URL=https://your-compatible-provider.example.com/v1
SKIP_API_DOMAIN_CHECK=true
```

Note: `SKIP_API_DOMAIN_CHECK` only applies to `AI_PROVIDER=openai`. Azure endpoint validation remains strict.

**Supported Models:**

- `gpt-4o`, `gpt-4o-mini` - Latest GPT-4o models
- `o3`, `o3-mini`, `o4-mini` - Reasoning models with step-by-step thinking

### Azure OpenAI Provider

Configure the application to use Azure OpenAI Service:

```bash
# Environment Variables
AI_PROVIDER=azure
AZURE_OPENAI_API_KEY=your_azure_api_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-4o-deployment
AZURE_OPENAI_API_VERSION=2024-02-15-preview
```

**Optional - Enable v1 Responses API:**

```bash
AZURE_OPENAI_USE_RESPONSES_API=true
```

## Request/Response Examples

### Basic Chat Request (AI SDK UI Format)

```bash
curl -X POST http://localhost:3002/api/chat-process \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_secret_key" \
  -d '{
    "messages": [
      {
        "id": "msg-1",
        "role": "user",
        "parts": [
          {
            "type": "text",
            "text": "Explain quantum computing in simple terms"
          }
        ]
      }
    ],
    "systemMessage": "You are a helpful science teacher.",
    "temperature": 0.7
  }'
```

### Chat with Conversation Context

```bash
curl -X POST http://localhost:3002/api/chat-process \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_secret_key" \
  -d '{
    "messages": [
      {
        "id": "msg-1",
        "role": "user",
        "parts": [{"type": "text", "text": "What is quantum computing?"}]
      },
      {
        "id": "msg-2",
        "role": "assistant",
        "parts": [{"type": "text", "text": "Quantum computing is..."}]
      },
      {
        "id": "msg-3",
        "role": "user",
        "parts": [{"type": "text", "text": "Can you explain more?"}]
      }
    ],
    "usingContext": true
  }'
```

### Verify Authentication

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

### Get Configuration

```bash
curl -X POST http://localhost:3002/api/config \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_secret_key" \
  -d '{}'
```

### Health Check

```bash
curl http://localhost:3002/api/health
```

### Streaming Response Example

When calling `/chat-process`, the response streams as newline-delimited JSON:

```
{"id":"chatcmpl-123","text":"Quantum","delta":"Quantum","detail":{"usage":{"total_tokens":1}}}
{"id":"chatcmpl-123","text":"Quantum computing","delta":" computing","detail":{"usage":{"total_tokens":3}}}
{"id":"chatcmpl-123","text":"Quantum computing is","delta":" is","detail":{"usage":{"total_tokens":5}}}
{"id":"chatcmpl-123","text":"Quantum computing is a","delta":" a","detail":{"usage":{"total_tokens":7}}}
{"id":"chatcmpl-123","text":"Quantum computing is a revolutionary","delta":" revolutionary","detail":{"usage":{"total_tokens":9}}}
```

Each line is a complete JSON object that can be parsed independently.

## Security Headers

The API automatically includes security headers in all responses:

### Standard Security Headers

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

### Rate Limiting Headers

Included in all responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640998800
```

### CORS Headers

Configurable via `ALLOWED_ORIGINS` environment variable:

```
Access-Control-Allow-Origin: http://localhost:1002
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

### Request Tracking

Each request can include an optional request ID:

```
X-Request-ID: req_1640995200_abc123
```

If not provided by client, the server may generate one for logging purposes.

## Body Size Limits

Different endpoints have different body size limits for security:

| Endpoint        | Body Limit | Reason                   |
| --------------- | ---------- | ------------------------ |
| `/chat-process` | 1MB        | Accommodate long prompts |
| `/verify`       | 1KB        | Token verification only  |
| `/config`       | Default    | Empty body expected      |
| `/session`      | Default    | Empty body expected      |
| Other endpoints | 1MB        | Default limit            |

Requests exceeding body limits will be rejected with HTTP 413 (Payload Too Large).

## Summary

This API provides a secure, rate-limited interface to OpenAI and Azure OpenAI services with:

- **5 endpoints**: health, session, verify, chat-process, config
- **Dual path support**: Both `/endpoint` and `/api/endpoint` work
- **Streaming responses**: Real-time AI responses via newline-delimited JSON
- **Consistent error format**: Structured error responses with codes and timestamps
- **Two-tier rate limiting**: 100 req/hour general, 10 req/15min for auth
- **Security-first design**: Native middleware, input validation, secure headers
- **Framework-agnostic**: Built on Node.js 24+ native HTTP/2

For implementation details, see:

- [Error Handling](./error-handling.md)
- [Rate Limiting](./rate-limiting.md)
- [Authentication](./authentication.md)
- [Provider Integration](./providers.md)
