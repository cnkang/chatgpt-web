# Deployment Environment Configuration

This guide lists the environment variables that are actually read by the current backend runtime.

Canonical references:

- `apps/api/.env.example`
- `packages/docs/setup/environment-configuration.md`

## Files and Locations

```text
chatgpt-web/
├── .env                 # Frontend (Vite) env
└── apps/api/.env        # Backend env
```

## Minimal Production Baseline

`apps/api/.env`:

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-official-api-key
DEFAULT_MODEL=gpt-4o

NODE_ENV=production
PORT=3002
HOST=0.0.0.0
LOG_LEVEL=info

SESSION_SECRET=replace-with-a-long-random-string
ALLOWED_ORIGINS=https://your-app.example.com
CORS_CREDENTIALS=true
```

## Provider Configuration

### OpenAI

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-official-api-key
DEFAULT_MODEL=gpt-4o
OPENAI_API_BASE_URL=https://api.openai.com
OPENAI_API_DISABLE_DEBUG=true
OPENAI_ORGANIZATION=org-your-org-id
```

### Azure OpenAI

```bash
AI_PROVIDER=azure
AZURE_OPENAI_API_KEY=your-azure-api-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=your-deployment-name
AZURE_OPENAI_API_VERSION=2024-02-15-preview
AZURE_OPENAI_USE_RESPONSES_API=true
DEFAULT_MODEL=your-deployment-name
```

## Security and Access Control

```bash
# Optional access password
AUTH_SECRET_KEY=your-access-password

# Strongly recommended in production
SESSION_SECRET=replace-with-a-long-random-string

# Per-IP rate limit (simple limiter)
MAX_REQUEST_PER_HOUR=200

# CORS restrictions
ALLOWED_ORIGINS=https://your-app.example.com
CORS_ORIGIN=https://your-app.example.com  # Alias for ALLOWED_ORIGINS
CORS_CREDENTIALS=true

# Security validation signal
HTTPS=true
```

Optional Redis session store:

```bash
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password
```

## Server and Logging

```bash
NODE_ENV=production
PORT=3002
HOST=0.0.0.0
LOG_LEVEL=info
```

## Proxies and Networking

```bash
# HTTPS / all-proxy
HTTPS_PROXY=http://proxy.example.com:8080
ALL_PROXY=socks5://proxy.example.com:1080

# SOCKS proxy
SOCKS_PROXY_HOST=proxy.example.com
SOCKS_PROXY_PORT=1080
SOCKS_PROXY_USERNAME=username
SOCKS_PROXY_PASSWORD=password
```

## Compatibility and Advanced Flags

These variables are read by the provider configuration layer and are safe to set, but not all of them affect the current Express middleware directly:

```bash
DEFAULT_MODEL=gpt-4o
OPENAI_API_MODEL=gpt-4o

ENABLE_RATE_LIMIT=true
RATE_LIMIT_WINDOW_MS=3600000
RATE_LIMIT_MAX_REQUESTS=100

ENABLE_CSP=true
ENABLE_HSTS=true
API_KEY_HEADER=authorization

ENABLE_REASONING_MODELS=true
ENABLE_REASONING=true

DEBUG=true
HOT_RELOAD=true
```

## Docker Compose (Source Build)

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

## Removed / Not Wired Variables

These show up in older docs but are not currently read by the runtime:

- `RETRY_MAX_ATTEMPTS`, `RETRY_BASE_DELAY`
- `REASONING_MODEL_TIMEOUT_MS`
