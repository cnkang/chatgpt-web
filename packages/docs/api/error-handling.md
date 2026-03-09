# Error Handling

The backend uses a consistent error response structure across all endpoints to provide predictable error handling for clients.

## Error Response Structure

All errors are returned as JSON with the following format:

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

### Status Field

- `"Fail"`: Client errors (4xx status codes) - validation, authentication, authorization, rate limiting
- `"Error"`: Server errors (5xx status codes) - internal errors, external API failures, timeouts

### Error Object Fields

- `code`: Machine-readable error code (see Error Codes below)
- `type`: Error class name (e.g., "ValidationError", "AuthenticationError")
- `timestamp`: ISO 8601 timestamp when error occurred

## Error Codes

The following error codes are used throughout the API:

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
| `CONFIGURATION_ERROR`  | Invalid configuration             | 500         | Error        |

## Example Error Responses

### Validation Error (400)

Returned when request body is invalid or missing required fields:

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

### Authentication Error (401)

Returned when authentication token is invalid or missing:

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

### Rate Limit Error (429)

Returned when rate limit is exceeded:

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

### Internal Error (500)

Returned when an unexpected server error occurs:

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

## Error Handling in Streaming Responses

The `/chat-process` endpoint uses streaming responses, which requires special error handling:

### Before Streaming Starts

If an error occurs before headers are sent (e.g., validation error):

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

### After Streaming Starts

If an error occurs after streaming has begun:

- Headers are already sent (HTTP 200)
- Connection closes immediately
- No error JSON is sent
- Client must handle unexpected connection closure

## Implementation Details

Key implementation files:

- `apps/api/src/routes/*.ts` - Route handlers with error responses
- `apps/api/src/middleware-native/rate-limiter.ts` - Rate limiting errors
- `apps/api/src/middleware-native/auth.ts` - Authentication errors
- `apps/api/src/utils/error-handler.ts` - Centralized error handling utilities

## Client Error Handling Best Practices

When consuming this API, clients should:

1. **Check HTTP status code** first (4xx vs 5xx)
2. **Parse error response** to get `status`, `message`, and `error.code`
3. **Handle specific error codes** with appropriate UI feedback
4. **Display user-friendly messages** based on error type
5. **Implement retry logic** for 5xx errors with exponential backoff
6. **Never retry** 4xx errors without fixing the request
7. **Handle streaming errors** by detecting unexpected connection closure

## Logging Behavior

The backend logs all errors with:

- Request metadata (method, URL, IP, user agent)
- Error type and message
- Stack traces (only in development mode)
- Timestamp and request ID (if available)

Error logs are structured JSON for easy parsing and monitoring.
