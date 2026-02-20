# API Reference

This document provides comprehensive API documentation for the ChatGPT Web application, including all endpoints, request/response formats, and configuration examples.

## Table of Contents

- [Base URL](#base-url)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Endpoints](#endpoints)
- [Provider Configuration](#provider-configuration)
- [Request/Response Examples](#requestresponse-examples)
- [Error Codes](#error-codes)
- [Security Headers](#security-headers)

## Base URL

```
http://localhost:3002
```

All API endpoints are available under both the root path and `/api` prefix:

- `http://localhost:3002/endpoint`
- `http://localhost:3002/api/endpoint`

## Authentication

The API supports optional authentication using a secret key:

```bash
# Set in environment variables
AUTH_SECRET_KEY=your_secret_key_here
```

When authentication is enabled, include the token in your requests:

```bash
curl -X POST http://localhost:3002/api/verify \
  -H "Content-Type: application/json" \
  -d '{"token": "your_secret_key_here"}'
```

## Rate Limiting

Rate limiting is configurable per hour:

```bash
# Environment variables
MAX_REQUEST_PER_HOUR=100
RATE_LIMIT_WINDOW_MS=3600000
RATE_LIMIT_MAX_REQUESTS=100
```

Rate limit headers are included in responses:

- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when the rate limit resets

## Error Handling

All API responses follow a consistent error format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {},
    "timestamp": 1640995200000,
    "requestId": "req_123456789"
  }
}
```

## Endpoints

### Health Check

Check if the service is running and healthy.

**Endpoint:** `GET /health`

**Response:**

```json
{
  "uptime": 3600.123,
  "message": "OK",
  "timestamp": 1640995200000
}
```

### Session Management

Get session information including authentication status and current model.

**Endpoint:** `POST /session`

**Response:**

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

### Token Verification

Verify authentication token when auth is enabled.

**Endpoint:** `POST /verify`

**Request:**

```json
{
  "token": "your_secret_key_here"
}
```

**Response:**

```json
{
  "status": "Success",
  "message": "Verify successfully",
  "data": null
}
```

### Chat Processing

Process chat messages with streaming response support.

**Endpoint:** `POST /chat-process`

**Request:**

```json
{
  "prompt": "Hello, how are you?",
  "options": {
    "parentMessageId": "msg_123",
    "conversationId": "conv_456"
  },
  "systemMessage": "You are a helpful assistant.",
  "temperature": 0.7,
  "top_p": 0.9
}
```

**Response:** Streaming JSON objects separated by newlines

```jsonl
{"id": "msg_789", "text": "Hello!", "delta": "Hello!", "detail": {"usage": {"total_tokens": 25}}}
{"id": "msg_789", "text": "Hello! I'm", "delta": " I'm", "detail": {"usage": {"total_tokens": 27}}}
{"id": "msg_789", "text": "Hello! I'm doing well, thank you!", "delta": " doing well, thank you!", "detail": {"usage": {"total_tokens": 35}}}
```

### Configuration

Get current configuration and usage information.

**Endpoint:** `POST /config`

**Response:**

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

### Migration Info

Get migration guidance and current configuration validation results.

**Endpoint:** `GET /migration-info`

**Response (shape):**

```json
{
  "status": "Success",
  "message": "Migration information retrieved",
  "data": {
    "migration": {},
    "validation": {}
  }
}
```

### Security Status

Run a security validation pass and return a risk summary.

**Endpoint:** `GET /security-status`

**Response (shape):**

```json
{
  "status": "Success",
  "message": "Security validation completed",
  "data": {
    "isSecure": true,
    "risks": [],
    "summary": {
      "totalRisks": 0,
      "highSeverity": 0,
      "mediumSeverity": 0,
      "lowSeverity": 0
    }
  }
}
```

### Circuit Breaker Status

Inspect the current circuit breaker state used around provider calls.

**Endpoint:** `GET /circuit-breaker-status`

**Response (shape):**

```json
{
  "status": "Success",
  "message": "Circuit breaker status retrieved",
  "data": {
    "state": "CLOSED",
    "failureCount": 0,
    "lastFailureTime": null,
    "successCount": 150
  }
}
```

## Provider Configuration

### OpenAI Provider

Configure the application to use OpenAI API (official or compatible):

```bash
# Environment Variables
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your_official_api_key_here
OPENAI_API_BASE_URL=https://api.openai.com
SKIP_API_DOMAIN_CHECK=false
DEFAULT_MODEL=gpt-5.1
```

If you use an OpenAI-compatible third-party endpoint, set:

```bash
OPENAI_API_BASE_URL=https://your-compatible-provider.example.com/v1
SKIP_API_DOMAIN_CHECK=true
```

`SKIP_API_DOMAIN_CHECK` only applies to `AI_PROVIDER=openai`. Azure endpoint checks remain strict.

**Supported Models:**

- `gpt-4o`, `gpt-4o-mini` - Latest GPT-4o models
- `gpt-4-turbo`, `gpt-4-turbo-preview` - GPT-4 Turbo models
- `gpt-4`, `gpt-4-32k` - Standard GPT-4 models
- `o1`, `o1-preview`, `o1-mini` - Reasoning models

### Azure OpenAI Provider

Configure the application to use Azure OpenAI Service:

```bash
# Environment Variables
AI_PROVIDER=azure
AZURE_OPENAI_API_KEY=your_azure_api_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-4o-deployment
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# Enable v1 Responses API (recommended)
AZURE_OPENAI_USE_RESPONSES_API=true
```

## Request/Response Examples

### Chat Completion Request

**Basic Chat Request:**

```bash
curl -X POST http://localhost:3002/api/chat-process \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_secret_key" \
  -d '{
    "prompt": "Explain quantum computing in simple terms",
    "options": {},
    "systemMessage": "You are a helpful science teacher.",
    "temperature": 0.7
  }'
```

### Streaming Chat Response

The chat endpoint returns streaming responses. Each line contains a JSON object:

```jsonl
{"id": "chatcmpl-123", "text": "Quantum", "delta": "Quantum", "detail": {"usage": {"total_tokens": 1}}}
{"id": "chatcmpl-123", "text": "Quantum computing", "delta": " computing", "detail": {"usage": {"total_tokens": 3}}}
{"id": "chatcmpl-123", "text": "Quantum computing is", "delta": " is", "detail": {"usage": {"total_tokens": 5}}}
```

### Reasoning Model Response

When using reasoning models (o1, o1-preview, o1-mini), responses include reasoning steps:

```json
{
  "id": "chatcmpl-reasoning-123",
  "text": "Let me think through this step by step...",
  "reasoning": [
    {
      "step": 1,
      "thought": "First, I need to understand what quantum computing is fundamentally about.",
      "confidence": 95
    },
    {
      "step": 2,
      "thought": "Then I should explain it in terms that are accessible to a general audience.",
      "confidence": 90
    }
  ],
  "detail": {
    "usage": {
      "total_tokens": 150,
      "reasoning_tokens": 75,
      "completion_tokens": 75
    }
  }
}
```

## Error Codes

| Code                    | Description                       | HTTP Status |
| ----------------------- | --------------------------------- | ----------- |
| `INVALID_REQUEST`       | Request validation failed         | 400         |
| `AUTHENTICATION_FAILED` | Invalid or missing authentication | 401         |
| `AUTHORIZATION_FAILED`  | Insufficient permissions          | 403         |
| `RATE_LIMIT_EXCEEDED`   | Too many requests                 | 429         |
| `EXTERNAL_API_ERROR`    | OpenAI/Azure API error            | 502         |
| `NETWORK_ERROR`         | Network connectivity issue        | 503         |
| `TIMEOUT_ERROR`         | Request timeout                   | 504         |
| `INTERNAL_ERROR`        | Internal server error             | 500         |

## Security Headers

The application automatically includes security headers in all responses:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

**Rate Limiting Headers:**

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640998800
```

**Request ID Header:**

```
X-Request-ID: req_1640995200_abc123
```

This ensures secure communication and helps with debugging and monitoring.
