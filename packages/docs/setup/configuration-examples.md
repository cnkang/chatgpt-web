# Configuration Examples

This page provides short, accurate examples that match the current environment variables used by the codebase.

The source of truth is still:

- `apps/api/.env.example`
- `.env.example`

## OpenAI (Recommended Local Setup)

`apps/api/.env`:

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-official-api-key
DEFAULT_MODEL=gpt-4o
OPENAI_API_BASE_URL=https://api.openai.com
SESSION_SECRET=replace-with-a-long-random-string
```

Repo root `.env`:

```bash
VITE_GLOB_API_URL=/api
VITE_APP_API_BASE_URL=http://127.0.0.1:3002/
VITE_GLOB_OPEN_LONG_REPLY=false
VITE_GLOB_APP_PWA=false
```

## Azure OpenAI

`apps/api/.env`:

```bash
AI_PROVIDER=azure
AZURE_OPENAI_API_KEY=your-azure-api-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=your-deployment-name
AZURE_OPENAI_API_VERSION=2024-02-15-preview
AZURE_OPENAI_USE_RESPONSES_API=true
DEFAULT_MODEL=your-deployment-name
SESSION_SECRET=replace-with-a-long-random-string
```

## Production-Hardened Baseline

`apps/api/.env`:

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-official-api-key
DEFAULT_MODEL=gpt-4o

NODE_ENV=production
LOG_LEVEL=info
PORT=3002
HOST=0.0.0.0

SESSION_SECRET=replace-with-a-long-random-string
AUTH_SECRET_KEY=optional-access-password
MAX_REQUEST_PER_HOUR=200
ALLOWED_ORIGINS=https://your-app.example.com
CORS_CREDENTIALS=true

TIMEOUT_MS=60000
OPENAI_API_DISABLE_DEBUG=true
```

## Corporate Proxy / Restricted Network

`apps/api/.env`:

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-official-api-key
DEFAULT_MODEL=gpt-4o

# Prefer HTTPS proxies
HTTPS_PROXY=http://proxy.company.com:8080
ALL_PROXY=socks5://proxy.company.com:1080

# SOCKS proxy (host + port required together)
SOCKS_PROXY_HOST=proxy.company.com
SOCKS_PROXY_PORT=1080
SOCKS_PROXY_USERNAME=optional-username
SOCKS_PROXY_PASSWORD=optional-password
```

## Docker Compose (Build From Source)

`docker-compose.yml`:

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

Then run:

```bash
docker compose up -d --build
```

## Compatibility Aliases

These are supported by the current configuration loader:

```bash
# Model alias
DEFAULT_MODEL=gpt-4o
OPENAI_API_MODEL=gpt-4o

# CORS alias
ALLOWED_ORIGINS=https://your-app.example.com
CORS_ORIGIN=https://your-app.example.com

# Reasoning alias
ENABLE_REASONING_MODELS=true
ENABLE_REASONING=true
```
