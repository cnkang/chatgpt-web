# Migration Guide: Unofficial APIs to Official OpenAI API

ChatGPT Web now supports official provider APIs only. Unofficial proxy flows (such as access-token-based ChatGPT proxies) are not supported.

This guide helps you remove deprecated configuration and switch to the official OpenAI API.

## 1. Remove Deprecated Variables

Delete the following variables anywhere they appear (for example in `apps/api/.env` or deployment configs):

```bash
OPENAI_ACCESS_TOKEN=
API_REVERSE_PROXY=
CHATGPT_ACCESS_TOKEN=
REVERSE_PROXY_URL=
```

## 2. Configure the Official OpenAI Provider

Add or update the backend environment variables in `apps/api/.env`:

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-api-key
SESSION_SECRET=replace-with-a-long-random-string

# Optional but recommended
DEFAULT_MODEL=gpt-5.1
OPENAI_API_BASE_URL=https://api.openai.com
```

Notes:

- `AI_PROVIDER` should be `openai` for the standard OpenAI API.
- `SESSION_SECRET` is required for secure session handling.
- `DEFAULT_MODEL` controls the default model shown to users.

## 3. (Optional) Verify Frontend-to-Backend URL

If your frontend runs separately from the backend, make sure the frontend points at the correct API base URL from a root-level env file such as `.env.development`:

```bash
VITE_GLOB_API_URL=http://127.0.0.1:3002/
# Or:
VITE_APP_API_BASE_URL=http://127.0.0.1:3002/
```

## 4. Validate the Migration Locally

From the repo root:

```bash
pnpm install
pnpm dev
```

In a separate terminal, check health and config:

```bash
curl http://localhost:3002/health
curl -X POST http://localhost:3002/api/config -H 'content-type: application/json' -d '{}'
```

If both succeed and the UI can send messages, the migration is complete.

## Related References

- Backend environment variables: `packages/docs/deployment/environment.md`
- Setup environment configuration: `packages/docs/setup/environment-configuration.md`
- Docker deployment: `packages/docs/deployment/docker.md`
