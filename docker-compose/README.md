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
