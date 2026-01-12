# API Documentation

This directory contains API documentation and references for the ChatGPT Web backend service.

## Available Documentation

- **[API Reference](./api-reference.md)** - Complete API endpoint documentation
- **[Authentication](./authentication.md)** - API authentication and security
- **[Error Handling](./error-handling.md)** - Error codes and handling
- **[Rate Limiting](./rate-limiting.md)** - Rate limiting and quotas
- **[Provider Integration](./providers.md)** - AI provider integration details

## API Overview

The ChatGPT Web API provides endpoints for:

- **Chat Processing** - Send messages and receive AI responses
- **Configuration** - Get system configuration and status
- **Session Management** - Manage chat sessions and context
- **Provider Management** - Switch between AI providers

## Base URL

- **Development**: `http://localhost:3002`
- **Production**: `https://your-domain.com`

## Authentication

The API supports optional authentication via:

- **Secret Key** - Set `AUTH_SECRET_KEY` environment variable
- **Request Headers** - Include `Authorization: Bearer <key>` header

## Quick Examples

### Chat Request

```bash
curl -X POST http://localhost:3002/api/chat-process \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Hello, how are you?",
    "options": {
      "conversationId": "uuid-here",
      "parentMessageId": "uuid-here"
    }
  }'
```

### Configuration Check

```bash
curl http://localhost:3002/api/config
```

## Response Format

All API responses follow this format:

```json
{
  "status": "Success" | "Fail",
  "message": "Response message",
  "data": "Response data"
}
```

## Error Handling

Errors are returned with appropriate HTTP status codes and descriptive messages:

```json
{
  "status": "Fail",
  "message": "Error description",
  "data": null
}
```

## Rate Limiting

The API implements rate limiting:

- **Default**: 100 requests per hour per IP
- **Configurable**: Set `MAX_REQUEST_PER_HOUR` environment variable
- **Headers**: Rate limit info included in response headers

For detailed information, see the specific documentation files in this directory.
