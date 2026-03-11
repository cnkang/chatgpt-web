# AI SDK Integration Guide

This guide explains how ChatGPT Web integrates with Vercel AI SDK for AI-powered chat functionality.

## Overview

ChatGPT Web uses [Vercel AI SDK](https://sdk.vercel.ai/) for all AI interactions, providing:

- **Type-safe AI integration** with TypeScript support
- **Standardized message format** (UIMessage) across frontend and backend
- **Built-in streaming** with automatic state management
- **Provider abstraction** supporting OpenAI and Azure OpenAI
- **Framework-agnostic** backend implementation

## Architecture

```
Frontend (Vue 3)                Backend (Node.js 24)
┌─────────────────┐            ┌──────────────────┐
│  @ai-sdk/vue    │            │   ai (core)      │
│  Chat class     │  ←HTTP→    │   streamText()   │
│  UIMessage[]    │            │   @ai-sdk/openai │
└─────────────────┘            │   @ai-sdk/azure  │
                               └──────────────────┘
```

## Frontend Integration

### Dependencies

```json
{
  "@ai-sdk/vue": "^3.0.116",
  "ai": "^6.0.116"
}
```

### Chat Hook Implementation

**File**: `apps/web/src/views/chat/hooks/useAiSdkChatConversationFlow.ts`

```typescript
import { Chat } from '@ai-sdk/vue'
import { DefaultChatTransport, type UIMessage } from 'ai'

// Create transport for API communication
const transport = new DefaultChatTransport({
  api: '/api/chat-process',
  headers: () => ({
    Authorization: `Bearer ${authStore.token}`,
  }),
  body: () => ({
    systemMessage: settingStore.systemMessage,
    temperature: settingStore.temperature,
    top_p: settingStore.top_p,
    usingContext: usingContext.value,
  }),
})

// Create Chat instance
const chat = new Chat<UIMessage>({
  id: conversationId,
  messages: initialMessages,
  transport,
})

// Send message
await chat.sendMessage({ text: userInput })

// Access messages
const messages = chat.messages // UIMessage[]

// Check status
const isLoading = chat.status === 'submitted' || chat.status === 'streaming'

// Stop streaming
chat.stop()

// Regenerate last response
await chat.regenerate()
```

### UIMessage Format

```typescript
interface UIMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  parts: Array<{
    type: 'text'
    text: string
  }>
  metadata?: {
    dateTime?: string
    [key: string]: unknown
  }
}
```

### Message Conversion

Convert between Pinia store format and UIMessage:

```typescript
// Store → UIMessage
function toUIMessages(storedChats: StoredChat[]): UIMessage[] {
  return storedChats.map((chat, index) => ({
    id: chat.id ?? `msg-${Date.now()}-${index}`,
    role: chat.inversion ? 'user' : 'assistant',
    metadata: { dateTime: chat.dateTime },
    parts: [{ type: 'text', text: chat.text }],
  }))
}

// UIMessage → Store
function toStoredChats(messages: UIMessage[]): StoredChat[] {
  return messages.map(message => ({
    id: message.id,
    dateTime: message.metadata?.dateTime ?? new Date().toLocaleString(),
    text: message.parts
      .filter(p => p.type === 'text')
      .map(p => p.text)
      .join(''),
    inversion: message.role === 'user',
    error: false,
    loading: false,
  }))
}
```

### Chat Lifecycle

```typescript
// 1. Initialize
const chat = new Chat<UIMessage>({ id, messages, transport })

// 2. Send message
await chat.sendMessage({ text: 'Hello' })

// 3. Monitor status
watch(
  () => chat.status,
  status => {
    if (status === 'streaming') {
      // Update UI for streaming
    } else if (status === 'error') {
      // Handle error
    }
  },
)

// 4. Cleanup
onUnmounted(() => {
  chat.stop()
})
```

## Backend Integration

### Dependencies

```json
{
  "ai": "^6.0.116",
  "@ai-sdk/openai": "^3.0.41",
  "@ai-sdk/azure": "^3.0.42"
}
```

### Streaming Implementation

**File**: `apps/api/src/chatgpt/ai-sdk-chat.ts`

```typescript
import { streamText, convertToModelMessages } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createAzure } from '@ai-sdk/azure'
import type { ServerResponse } from 'node:http'

// OpenAI Provider
function buildOpenAIModel() {
  const provider = createOpenAI({
    apiKey: config.ai.openai.apiKey,
    baseURL: config.ai.openai.baseUrl,
    organization: config.ai.openai.organization,
  })
  return provider.chat(config.ai.defaultModel)
}

// Azure Provider
function buildAzureModel() {
  const provider = createAzure({
    apiKey: config.ai.azure.apiKey,
    apiVersion: config.ai.azure.apiVersion,
    baseURL: normalizeAzureBaseUrl(config.ai.azure.endpoint),
    useDeploymentBasedUrls: !config.ai.azure.useResponsesAPI,
  })

  if (config.ai.azure.useResponsesAPI) {
    return provider(config.ai.defaultModel)
  }
  return provider.chat(config.ai.defaultModel)
}

// Stream chat response
export async function pipeUIChatResponse(
  response: ServerResponse,
  options: {
    messages: UIMessage[]
    systemMessage?: string
    temperature?: number
    top_p?: number
    usingContext?: boolean
  },
) {
  const result = await streamText({
    model: resolveLanguageModel(),
    system: options.systemMessage,
    temperature: options.temperature,
    topP: options.top_p,
    messages: await convertToModelMessages(options.messages),
  })

  // Pipe to HTTP response
  result.pipeUIMessageStreamToResponse(response)
}
```

### Route Handler

**File**: `apps/api/src/routes/chat.ts`

```typescript
import type { UIMessage } from 'ai'
import { pipeUIChatResponse } from '../chatgpt/ai-sdk-chat.js'

export const chatProcessHandler: RouteHandler = async (req, res) => {
  const body = req.body as {
    messages?: UIMessage[]
    systemMessage?: string
    temperature?: number
    top_p?: number
    usingContext?: boolean
  }

  // Validate messages
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    throw createValidationError('Validation error: messages are required')
  }

  // Stream response
  await pipeUIChatResponse(res._nativeResponse, {
    messages: body.messages,
    systemMessage: body.systemMessage,
    temperature: body.temperature,
    top_p: body.top_p,
    usingContext: body.usingContext,
  })
}
```

### Context Selection

Control whether to use full conversation history or just the last message:

```typescript
function selectConversationMessages(messages: UIMessage[], usingContext = true) {
  if (usingContext) {
    return messages // Use full history
  }

  // Use only last user message
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')

  return lastUserMessage ? [lastUserMessage] : messages
}
```

## Provider Configuration

### OpenAI

```bash
# .env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-key
DEFAULT_MODEL=gpt-4o

# Optional: OpenAI-compatible endpoint
OPENAI_API_BASE_URL=https://api.example.com/v1
SKIP_API_DOMAIN_CHECK=true
```

### Azure OpenAI

```bash
# .env
AI_PROVIDER=azure
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-4o
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# Optional: Enable Responses API
AZURE_OPENAI_USE_RESPONSES_API=true
```

## Error Handling

### Frontend

```typescript
// Monitor chat status
const error = computed(() => {
  if (chat.value.status === 'error') {
    return chat.value.error?.message || 'Unknown error'
  }
  return null
})

// Clear error
chat.value.clearError()
```

### Backend

Errors are automatically handled by the AI SDK and returned as standard error responses:

```typescript
try {
  await pipeUIChatResponse(response, options)
} catch (error) {
  // AI SDK errors are caught and formatted
  throw createExternalAPIError(error.message)
}
```

## Testing

### Frontend Tests

```typescript
import { describe, it, expect, vi } from 'vitest'
import { Chat } from '@ai-sdk/vue'

describe('Chat Integration', () => {
  it('should send message', async () => {
    const chat = new Chat({
      id: 'test',
      messages: [],
      transport: mockTransport,
    })

    await chat.sendMessage({ text: 'Hello' })

    expect(chat.messages).toHaveLength(1)
    expect(chat.messages[0].role).toBe('user')
  })
})
```

### Backend Tests

```typescript
import { describe, it, expect } from 'vitest'
import { streamText } from 'ai'

describe('AI SDK Integration', () => {
  it('should stream response', async () => {
    const result = await streamText({
      model: mockModel,
      messages: [{ role: 'user', content: 'Hello' }],
    })

    expect(result).toBeDefined()
    expect(typeof result.pipeUIMessageStreamToResponse).toBe('function')
  })
})
```

## Performance Optimization

### Throttled Store Updates

Avoid excessive store updates during streaming:

```typescript
import { throttle } from '@chatgpt-web/shared'

const throttledSyncStore = throttle(syncStore, 500)

watch(
  () => chat.value.messages,
  () => {
    if (loading.value) {
      throttledSyncStore() // Throttled during streaming
    } else {
      syncStore() // Immediate when not streaming
    }
  },
)
```

### Message Caching

Cache message timestamps to avoid recomputation:

```typescript
const timestampCache = new Map<string, string>()

function getMessageDateTime(message: UIMessage) {
  if (timestampCache.has(message.id)) {
    return timestampCache.get(message.id)!
  }

  const timestamp = message.metadata?.dateTime ?? new Date().toLocaleString()
  timestampCache.set(message.id, timestamp)
  return timestamp
}
```

## Migration from Custom Implementation

If migrating from a custom streaming implementation:

1. **Install AI SDK packages**

   ```bash
   pnpm add ai @ai-sdk/vue @ai-sdk/openai @ai-sdk/azure
   ```

2. **Update message format** to UIMessage
3. **Replace custom fetch** with Chat class
4. **Replace custom streaming** with streamText
5. **Update route handlers** to use pipeUIMessageStreamToResponse
6. **Test thoroughly** with existing conversations

See [AI SDK UI Migration Report](../../docs/archive/reports/2026-03-10-ai-sdk-ui-migration.md) for detailed migration guide.

## Best Practices

### 1. Type Safety

Always use TypeScript and the UIMessage type:

```typescript
import type { UIMessage } from 'ai'

const messages: UIMessage[] = [...]
```

### 2. Error Handling

Always handle chat errors:

```typescript
if (chat.status === 'error') {
  console.error('Chat error:', chat.error)
  // Show user-friendly error message
}
```

### 3. Cleanup

Always stop streaming on component unmount:

```typescript
onUnmounted(() => {
  chat.stop()
})
```

### 4. Context Management

Be mindful of context usage:

```typescript
// Full context (more tokens, better continuity)
usingContext: true

// Last message only (fewer tokens, less context)
usingContext: false
```

### 5. Rate Limiting

Respect rate limits and handle 429 responses:

```typescript
if (response.status === 429) {
  // Show rate limit message
  // Retry after delay
}
```

## Troubleshooting

### Issue: Messages not streaming

**Solution**: Ensure response is not buffered:

```typescript
// Backend: Use native ServerResponse
result.pipeUIMessageStreamToResponse(nativeResponse)

// Frontend: Ensure transport is configured correctly
const transport = new DefaultChatTransport({ api: '/api/chat-process' })
```

### Issue: Type errors with UIMessage

**Solution**: Ensure correct import:

```typescript
import type { UIMessage } from 'ai' // Not from @ai-sdk/vue
```

### Issue: Azure provider not working

**Solution**: Check endpoint normalization:

```typescript
// Endpoint must end with /openai
const endpoint = 'https://resource.openai.azure.com/openai'
```

## Resources

- [Vercel AI SDK Documentation](https://sdk.vercel.ai/docs)
- [AI SDK UI (Vue)](https://sdk.vercel.ai/docs/ai-sdk-ui/vue)
- [AI SDK Core](https://sdk.vercel.ai/docs/ai-sdk-core)
- [Migration Report](../../docs/archive/reports/2026-03-10-ai-sdk-ui-migration.md)
- [API Reference](../api/api-reference.md)

## Summary

Vercel AI SDK provides a robust, type-safe foundation for AI chat functionality in ChatGPT Web. The standardized UIMessage format ensures consistency across frontend and backend, while the built-in streaming support simplifies implementation and improves maintainability.

For questions or issues, refer to the [Troubleshooting Guide](./troubleshooting.md) or [Vercel AI SDK documentation](https://sdk.vercel.ai/docs).
