# Configuration Examples (Legacy Index)

The maintained configuration examples now live in:

- `packages/docs/setup/configuration-examples.md`
- `packages/docs/setup/environment-configuration.md`
- `apps/api/.env.example`
- `.env.example`

## Minimal OpenAI Example

`apps/api/.env`:

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-official-api-key
DEFAULT_MODEL=gpt-5.1
SESSION_SECRET=replace-with-a-long-random-string
```

Repo root `.env`:

```bash
VITE_GLOB_API_URL=/api
VITE_APP_API_BASE_URL=http://127.0.0.1:3002/
```
