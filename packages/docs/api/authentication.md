# Authentication

ChatGPT Web uses a simple shared-secret mechanism. Authentication is optional and is enabled by setting `AUTH_SECRET_KEY`.

## How It Works

- If `AUTH_SECRET_KEY` is **not** set, the API is open (no auth required).
- If `AUTH_SECRET_KEY` **is** set, protected routes require an `Authorization` header:

```http
Authorization: Bearer <AUTH_SECRET_KEY>
```

## Enable Authentication

Set the secret in `apps/api/.env` (and in your deployment environment):

```bash
AUTH_SECRET_KEY=replace-with-a-long-random-string
SESSION_SECRET=replace-with-a-different-long-random-string
```

Notes:

- `AUTH_SECRET_KEY` protects API routes.
- `SESSION_SECRET` is required for secure session handling.

## Verify the Secret

When authentication is enabled, you can verify the secret with the `/verify` endpoint:

```bash
curl -X POST http://localhost:3002/api/verify \
  -H "Content-Type: application/json" \
  -d '{"token":"replace-with-a-long-random-string"}'
```

A successful response looks like:

```json
{
  "status": "Success",
  "message": "Verify successfully",
  "data": null
}
```

## Authenticated Chat Request Example

```bash
curl -X POST http://localhost:3002/api/chat-process \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer replace-with-a-long-random-string" \
  -d '{"prompt":"Hello"}'
```

## Related References

- API reference: `packages/docs/api/api-reference.md`
- Environment variables: `packages/docs/deployment/environment.md`
