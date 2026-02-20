# ChatGPT Web

> Disclaimer: This project is based on the original open source project with modifications and optimizations. It follows the MIT license and is provided for open source learning use only. There will be no account selling, paid services, or paid discussion groups. Beware of scams.

> Original project: https://github.com/Chanzhaoyu/chatgpt-web

[中文](README.zh.md)

![cover](./docs/images/screenshots/c1.png)
![cover2](./docs/images/screenshots/c2.png)

## Overview

ChatGPT Web is a modern, monorepo-based web application for OpenAI-compatible APIs and Azure OpenAI:

- Frontend: Vue 3.5+ (`apps/web`)
- Backend: Express 5 (`apps/api`)
- Shared types/utilities: `packages/shared`
- Documentation: `packages/docs`

## Highlights

- OpenAI/Azure provider support with optional OpenAI-compatible third-party endpoint mode
- Clean UI with streaming responses
- Monorepo scripts via pnpm + Turborepo
- Production-ready Dockerfile included

## Quick Start (Local Development)

### 1. Prerequisites

- Node.js `>= 24.0.0`
- pnpm `>= 10.0.0`

```bash
node -v
pnpm -v
```

### 2. Install Dependencies

From the repository root:

```bash
pnpm install
pnpm bootstrap
```

### 3. Configure Environment Variables

Create both frontend and backend env files:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
```

Minimum backend config in `apps/api/.env`:

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-official-api-key
DEFAULT_MODEL=gpt-5.1
```

Optional (OpenAI-compatible third-party endpoint):

```bash
OPENAI_API_BASE_URL=https://your-compatible-provider.example.com/v1
SKIP_API_DOMAIN_CHECK=true
```

Note: `SKIP_API_DOMAIN_CHECK` only affects the `openai` provider path. Azure endpoint validation remains strict.

### 4. Start the App

Recommended (frontend + backend only):

```bash
pnpm dev:core
```

Local URLs:

- App: http://localhost:1002
- API: http://localhost:3002
- API config (POST): http://localhost:3002/api/config

## Docs (Start Here)

If you only read one doc, read this:

- `packages/docs/setup/monorepo-setup.md`

Core documentation indexes:

- `packages/docs/README.md`
- `packages/docs/deployment/environment.md`
- `packages/docs/deployment/docker.md`
- `packages/docs/development/contributing.md`

Serve docs locally:

```bash
pnpm --filter @chatgpt-web/docs serve
```

## Deployment (Docker)

Build and run from this repository:

```bash
docker build -t chatgpt-web .

docker run --rm -it \
  -p 3002:3002 \
  -e AI_PROVIDER=openai \
  -e OPENAI_API_KEY=sk-your-official-api-key \
  -e SESSION_SECRET=change-me-in-production \
  chatgpt-web
```

Then open: http://localhost:3002

For more options:

- `packages/docs/deployment/docker.md`
- `docker-compose/README.md`
- `packages/docs/deployment/kubernetes.md`

## Common Commands

From the repository root:

```bash
pnpm dev
pnpm dev:core
pnpm dev:web
pnpm dev:api

pnpm lint
pnpm type-check
pnpm test
```

## Contributing

Please read:

- `docs/development/contributing.md`
- `packages/docs/development/contributing.md`

## License

MIT © [Kang Liu](./license)

Based on original project: MIT © [ChenZhaoYu](https://github.com/Chanzhaoyu/chatgpt-web)
