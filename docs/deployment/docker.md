# Docker Deployment (Legacy Index)

The canonical Docker deployment guides live in:

- `packages/docs/deployment/docker.md`
- `docker-compose/README.md`
- `packages/docs/deployment/environment.md`

## Quick Start (Source Build)

From the repository root:

```bash
docker build -t chatgpt-web:local .

docker run --rm -it \
  -p 3002:3002 \
  -e AI_PROVIDER=openai \
  -e OPENAI_API_KEY=sk-your-official-api-key \
  -e SESSION_SECRET=replace-with-a-long-random-string \
  chatgpt-web:local
```

Then open http://localhost:3002.

## Docker Compose

From the `docker-compose/` directory:

```bash
docker compose up -d --build
```
