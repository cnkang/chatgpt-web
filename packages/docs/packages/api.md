# API Package (@chatgpt-web/api)

The API package is the backend service for ChatGPT Web. It exposes the HTTP API, integrates with AI providers, and serves configuration to the frontend.

## Location

- Package: `apps/api`
- Entry point: `apps/api/src/index.ts`
- Env example: `apps/api/.env.example`

## Key Scripts

Run these from the repository root:

```bash
# Development (watch mode)
pnpm --filter @chatgpt-web/api dev

# Build
pnpm --filter @chatgpt-web/api build

# Production (after build)
pnpm --filter @chatgpt-web/api prod

# Type-check and tests
pnpm --filter @chatgpt-web/api type-check
pnpm --filter @chatgpt-web/api test
```

## Runtime Configuration

Configuration is read from environment variables (via `dotenv`).

Start here:

- Deployment reference: `packages/docs/deployment/environment.md`
- Setup guide: `packages/docs/setup/environment-configuration.md`

Minimum required variables for the common OpenAI setup:

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-api-key
SESSION_SECRET=replace-with-a-long-random-string
```

## HTTP Endpoints

The router is mounted at both `/` and `/api`, so the following work with or without the `/api` prefix:

- `GET /health`
- `POST /config`
- `POST /verify`
- `POST /chat-process`
- `GET /migration-info`
- `GET /security-status`
- `GET /circuit-breaker-status`

## How It Fits the Monorepo

- The frontend (`apps/web`) calls the backend for chat, config, and verification.
- Shared types and utilities live in `packages/shared`.
- Root-level scripts like `pnpm dev` start the full stack.
