# Deployment Overview (Legacy Index)

For the current, maintained deployment documentation, start here:

- `packages/docs/deployment/environment.md`
- `packages/docs/deployment/docker.md`
- `packages/docs/deployment/kubernetes.md`
- `packages/docs/deployment/manual.md`
- `packages/docs/deployment/railway.md`

## Fastest Working Path (Docker)

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

Or with Compose from `docker-compose/`:

```bash
docker compose up -d --build
```
