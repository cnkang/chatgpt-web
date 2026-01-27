# Rate Limiting

This document reflects the rate limiting that is actually wired into the current backend.

## What Is Enforced Today

The Express middleware limiter uses a simple per-IP hourly cap:

- Variable: `MAX_REQUEST_PER_HOUR`
- Default: `100`
- Implementation: `apps/api/src/middleware/limiter.ts`

Example:

```bash
MAX_REQUEST_PER_HOUR=200
```

## Additional Compatibility Flags

The provider configuration layer also reads these variables, although they are not the primary limiter used by the Express middleware:

```bash
ENABLE_RATE_LIMIT=true
RATE_LIMIT_WINDOW_MS=3600000
RATE_LIMIT_MAX_REQUESTS=100
```

These are parsed by:

- `apps/api/src/providers/config.ts`

## Recommended Production Baseline

```bash
MAX_REQUEST_PER_HOUR=200
ALLOWED_ORIGINS=https://your-app.example.com
SESSION_SECRET=replace-with-a-long-random-string
```
