# AI Providers

The backend uses a provider abstraction layer to support official OpenAI and Azure OpenAI.

Key files:

- `apps/api/src/providers/config.ts`
- `apps/api/src/providers/factory.ts`
- `apps/api/src/providers/openai.ts`
- `apps/api/src/providers/azure.ts`
- `apps/api/src/chatgpt/provider-adapter.ts`

## Supported Providers

- `openai`
- `azure`

## Environment Variables

### OpenAI

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-official-api-key
DEFAULT_MODEL=gpt-4o
OPENAI_API_BASE_URL=https://api.openai.com
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

## Notes

- Prefer `DEFAULT_MODEL`.
- `OPENAI_API_MODEL` is also supported for compatibility.
- Fallback providers and multi-provider routing are not wired into the current runtime.
