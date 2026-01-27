# Environment Configuration

This guide documents the environment variables that are actually read by the current codebase.

The canonical templates are:

- Backend: `apps/api/.env.example`
- Frontend: `.env.example`

## Where to Put Variables

From the repository root:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
```

## Backend (`apps/api/.env`)

### Minimal OpenAI Setup

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-official-api-key
DEFAULT_MODEL=gpt-4o
```

### Minimal Azure OpenAI Setup

```bash
AI_PROVIDER=azure
AZURE_OPENAI_API_KEY=your-azure-api-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=your-deployment-name
AZURE_OPENAI_API_VERSION=2024-02-15-preview
AZURE_OPENAI_USE_RESPONSES_API=true
```

## Backend Variables (Accurate Reference)

These variables are read directly by the backend code.

### Provider and Model

```bash
AI_PROVIDER=openai
DEFAULT_MODEL=gpt-4o
OPENAI_API_MODEL=gpt-4o   # Compatibility alias (also used by legacy paths)
```

Notes:

- Prefer `DEFAULT_MODEL`.
- `OPENAI_API_MODEL` is also supported and is still used in legacy code paths.

### OpenAI Configuration

```bash
OPENAI_API_KEY=sk-your-official-api-key
OPENAI_API_BASE_URL=https://api.openai.com
OPENAI_API_DISABLE_DEBUG=false
OPENAI_ORGANIZATION=org-your-org-id
```

### Azure OpenAI Configuration

```bash
AZURE_OPENAI_API_KEY=your-azure-api-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=your-deployment-name
AZURE_OPENAI_API_VERSION=2024-02-15-preview
AZURE_OPENAI_USE_RESPONSES_API=true
```

### Security and Access Control

```bash
AUTH_SECRET_KEY=your-access-password
SESSION_SECRET=replace-with-a-long-random-string
MAX_REQUEST_PER_HOUR=100
ALLOWED_ORIGINS=https://your-app.example.com
CORS_CREDENTIALS=true
```

Notes:

- `AUTH_SECRET_KEY` enables simple access control.
- `SESSION_SECRET` is strongly recommended in production.
- `ALLOWED_ORIGINS` restricts CORS in production.

### Server and Logging

```bash
NODE_ENV=production
PORT=3002
HOST=0.0.0.0
LOG_LEVEL=info
```

### Performance and Networking

```bash
TIMEOUT_MS=60000
HTTPS_PROXY=http://proxy.example.com:8080
ALL_PROXY=socks5://proxy.example.com:1080
SOCKS_PROXY_HOST=proxy.example.com
SOCKS_PROXY_PORT=1080
SOCKS_PROXY_USERNAME=username
SOCKS_PROXY_PASSWORD=password
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password
```

### Advanced / Compatibility Variables

These are read by the provider configuration layer and kept for flexibility:

```bash
RATE_LIMIT_WINDOW_MS=3600000
RATE_LIMIT_MAX_REQUESTS=100
ENABLE_RATE_LIMIT=true
ENABLE_CSP=true
ENABLE_HSTS=true
API_KEY_HEADER=authorization
CORS_ORIGIN=https://your-app.example.com
ENABLE_REASONING_MODELS=true
ENABLE_REASONING=true
```

Notes:

- `ALLOWED_ORIGINS` and `CORS_ORIGIN` are treated as aliases by the current config loader.
- `ENABLE_REASONING_MODELS` and `ENABLE_REASONING` are treated as aliases.

## Frontend (`.env` at Repo Root)

The frontend reads variables from the root `.env` file.

```bash
VITE_GLOB_API_URL=/api
VITE_APP_API_BASE_URL=http://127.0.0.1:3002/
VITE_GLOB_OPEN_LONG_REPLY=false
VITE_GLOB_APP_PWA=false
```

## Verify Your Configuration

Useful local checks:

```bash
pnpm dev:core
curl http://localhost:3002/health
curl -X POST http://localhost:3002/api/config -H 'content-type: application/json' -d '{}'
```

## Docker Example (Source Build)

```yaml
version: '3.8'

services:
  chatgpt-web:
    build: .
    image: chatgpt-web:local
    ports:
      - '3002:3002'
    environment:
      AI_PROVIDER: openai
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      DEFAULT_MODEL: ${DEFAULT_MODEL:-gpt-4o}
      SESSION_SECRET: ${SESSION_SECRET}
      NODE_ENV: production
```

Then:

```bash
docker compose up -d --build
```
