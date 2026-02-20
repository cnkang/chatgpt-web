# Docker Compose Deployment

This directory contains Docker Compose examples for this monorepo.

## Recommended Flow

From the `docker-compose/` directory:

```bash
# Build the image from the repository root and start
# (build context is set to .. in docker-compose.yml)
docker compose up -d --build
```

Useful commands:

```bash
# Check status
docker compose ps

# Stop and remove
docker compose down
```

## Environment Variables

Create a `.env` file next to `docker-compose.yml` (inside `docker-compose/`) and set at least:

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-official-api-key
SESSION_SECRET=replace-with-a-long-random-string
DEFAULT_MODEL=gpt-5.1
# Optional for OpenAI-compatible third-party endpoints:
# OPENAI_API_BASE_URL=https://your-compatible-provider.example.com/v1
# SKIP_API_DOMAIN_CHECK=true
```
