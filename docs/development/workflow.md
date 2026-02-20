# Development Workflow Guide

This workflow is aligned with the current monorepo scripts.

## Initial Setup

From the repository root:

```bash
pnpm install
pnpm bootstrap

cp .env.example .env
cp apps/api/.env.example apps/api/.env
```

Minimum backend configuration (`apps/api/.env`):

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-official-api-key
DEFAULT_MODEL=gpt-5.1
```

## Daily Development

Recommended (frontend + backend only):

```bash
pnpm dev:core
```

Other options:

```bash
pnpm dev        # all packages
pnpm dev:web    # frontend only (port 1002)
pnpm dev:api    # backend only (port 3002)
```

## Quality Checks

Run these before committing:

```bash
pnpm quality
pnpm test
pnpm --filter @chatgpt-web/docs validate
```

## Package-Level Commands

Use filters when you want to target a single package:

```bash
pnpm --filter @chatgpt-web/api dev
pnpm --filter @chatgpt-web/api dev:debug
pnpm --filter @chatgpt-web/web dev
pnpm --filter @chatgpt-web/docs serve
```

## Useful URLs

- Frontend: http://localhost:1002
- Backend: http://localhost:3002
- API config (POST): http://localhost:3002/api/config
