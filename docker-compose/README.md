# Docker Compose Deployment

This compose setup builds the image from the current repository and runs the full app on port `3002`.

## Prerequisites

- Docker with Compose plugin (`docker compose`)
- `service/.env` exists and includes at least one of:
  - `OPENAI_API_KEY`
  - `OPENAI_ACCESS_TOKEN`

## Steps

From repository root:

```bash
cp service/.env.example service/.env
# edit service/.env

docker compose -f docker-compose/docker-compose.yml up -d --build
```

Check status:

```bash
docker compose -f docker-compose/docker-compose.yml ps
```

View logs:

```bash
docker compose -f docker-compose/docker-compose.yml logs -f app
```

Stop and remove:

```bash
docker compose -f docker-compose/docker-compose.yml down
```

## Access

- App: `http://127.0.0.1:3002`
- Health check: `http://127.0.0.1:3002/health`

## Security/Runtime Notes

- The default compose setup is direct access to the app container, so keep `TRUST_PROXY=false` in `service/.env`.
- If you place this stack behind another reverse proxy, set `TRUST_PROXY=1` (or your actual proxy-hop count).
- Optional request-boundary hardening knobs in `service/.env`:
  - `JSON_BODY_LIMIT` (default example: `1mb`)
  - `MAX_PROMPT_CHARS` (default example: `32000`)
  - `MAX_SYSTEM_MESSAGE_CHARS` (default example: `8000`)
  - `MAX_VERIFY_TOKEN_CHARS` (default example: `1024`)
