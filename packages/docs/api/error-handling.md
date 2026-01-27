# Error Handling

The backend uses a centralized error handler to provide consistent JSON error responses and structured logging.

Key implementation files:

- `apps/api/src/utils/error-handler.ts`
- `apps/api/src/providers/base.ts`
- `apps/api/src/index.ts`

## Error Response Shape

All errors are returned as JSON:

```json
{
  "status": "Fail",
  "message": "Human-readable message",
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "type": "AppError",
    "details": {},
    "timestamp": "2026-01-27T00:00:00.000Z",
    "requestId": "req_..."
  }
}
```

Notes:

- `status` is `Fail` for operational 4xx errors and `Error` for 5xx errors.
- `requestId` is taken from `x-request-id` if provided, otherwise generated.

## Error Types

`AppError` is used for classified operational errors. Error codes come from `ErrorType`:

- `VALIDATION_ERROR`
- `AUTHENTICATION_ERROR`
- `AUTHORIZATION_ERROR`
- `NOT_FOUND_ERROR`
- `RATE_LIMIT_ERROR`
- `EXTERNAL_API_ERROR`
- `NETWORK_ERROR`
- `TIMEOUT_ERROR`
- `INTERNAL_ERROR`
- `CONFIGURATION_ERROR`

## Throwing Errors in Routes

Use the helpers in `error-handler.ts` or throw `AppError` directly:

```ts
import { createValidationError } from './utils/error-handler'

if (!req.body.prompt) {
  throw createValidationError('prompt is required')
}
```

## Provider Errors

Provider implementations can throw structured errors via the base provider class in `apps/api/src/providers/base.ts`.

## Logging Behavior

The global error handler logs:

- Request metadata (method, URL, IP, user agent)
- Error type and message
- Stack traces only when `NODE_ENV=development`

## Extending Error Reporting

There is no built-in external error reporting service. If you want Sentry, webhooks, or similar integrations, wrap or extend the global `errorHandler` in `apps/api/src/index.ts`.
