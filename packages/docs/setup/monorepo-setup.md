# Monorepo Setup Guide

This is the current, supported way to run ChatGPT Web locally.

## Prerequisites

- Node.js `>= 24.0.0`
- pnpm `>= 10.0.0`
- An official OpenAI API key (or Azure OpenAI credentials)

## 1. Clone the Repository

```bash
git clone https://github.com/cnkang/chatgpt-web.git
cd chatgpt-web
```

## 2. Install Dependencies

From the repository root:

```bash
pnpm install
pnpm bootstrap
```

Notes:

- `pnpm install` installs all workspace dependencies.
- `pnpm bootstrap` initializes Husky Git hooks.

## 3. Configure Environment Variables

Create both frontend and backend environment files:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
```

### Minimum backend configuration (`apps/api/.env`)

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-official-api-key
DEFAULT_MODEL=gpt-5.1
```

Notes:

- `DEFAULT_MODEL` is the preferred variable for the default model.
- `DEFAULT_MODEL` is also supported for compatibility.
- For Azure, set `AI_PROVIDER=azure` and provide the `AZURE_OPENAI_*` variables.

## 4. Start Development Servers

Recommended daily command:

```bash
pnpm dev:core
```

Other options:

```bash
pnpm dev        # all packages
pnpm dev:web    # frontend only (port 1002)
pnpm dev:api    # backend only (port 3002)
```

Expected local URLs:

- Frontend: http://localhost:1002
- Backend: http://localhost:3002
- API config (POST): http://localhost:3002/api/config

## 5. Verify the Setup

Quick checks:

```bash
curl http://localhost:3002/health
curl -X POST http://localhost:3002/api/config -H 'content-type: application/json' -d '{}'
```

Then open http://localhost:1002 and send a test message.

## Workspace Structure (Current)

```text
chatgpt-web/
├── apps/
│   ├── web/                   # Vue.js frontend
│   └── api/                   # Express backend
├── packages/
│   ├── shared/                # Shared types/utilities
│   ├── config/                # Shared config/tooling
│   └── docs/                  # Documentation package
├── tools/
│   └── scripts/               # Maintenance and migration scripts
├── package.json               # Root scripts (Turbo + pnpm)
├── pnpm-workspace.yaml        # Workspace config
└── turbo.json                 # Turborepo pipeline
```

## Key Commands (Accurate Root Scripts)

From the root:

```bash
# Development
pnpm dev
pnpm dev:core
pnpm dev:web
pnpm dev:api

# Build / preview
pnpm build
pnpm build:web
pnpm build:api
pnpm preview

# Quality / tests
pnpm lint
pnpm type-check
pnpm test
pnpm quality
```

Package-level commands via filters:

```bash
pnpm --filter @chatgpt-web/api dev
pnpm --filter @chatgpt-web/web dev
pnpm --filter @chatgpt-web/shared build
pnpm --filter @chatgpt-web/docs validate
pnpm --filter @chatgpt-web/docs serve
```
