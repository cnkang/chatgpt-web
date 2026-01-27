# Railway Deployment

This guide shows a minimal, accurate setup for deploying the monorepo on Railway.

## Recommended Commands

Railway should run from the repository root.

- Build command:

```bash
pnpm install --frozen-lockfile && pnpm build
```

- Start command:

```bash
pnpm --filter @chatgpt-web/api prod
```

## Required Environment Variables

Set these in Railway's environment settings:

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-official-api-key
DEFAULT_MODEL=gpt-4o

NODE_ENV=production
PORT=3002
HOST=0.0.0.0

SESSION_SECRET=replace-with-a-long-random-string
ALLOWED_ORIGINS=https://your-railway-domain.up.railway.app
```

Optional:

```bash
AUTH_SECRET_KEY=optional-access-password
MAX_REQUEST_PER_HOUR=500
TIMEOUT_MS=25000
LOG_LEVEL=info
```

## railway.toml (Optional)

```toml
[build]
builder = "nixpacks"
buildCommand = "pnpm install --frozen-lockfile && pnpm build"

[deploy]
startCommand = "pnpm --filter @chatgpt-web/api prod"
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3
```

## References

- `apps/api/.env.example`
- `packages/docs/deployment/environment.md`
- `packages/docs/setup/environment-configuration.md`
