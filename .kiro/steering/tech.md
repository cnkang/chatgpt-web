---
inclusion: always
---

# Technology Stack & Build System

## Monorepo Structure

PNPM workspace with two apps:

- `apps/web/` - Vue 3 frontend (port 1002)
- `apps/api/` - Node.js 24 backend (port 3002)

Package manager: ALWAYS use `pnpm` (never npm/yarn)

## Critical Technology Requirements

### Frontend (apps/web/)

**Framework & Language:**

- Vue 3 Composition API with `<script setup>` (never Options API)
- TypeScript 5.9+ strict mode (zero errors tolerated)
- Vite 7+ for build tooling

**State & Routing:**

- Pinia 3+ for state management (never Vuex)
- Vue Router 4+ for routing
- Vue i18n 11+ for internationalization

**AI Integration:**

- Vercel AI SDK UI (`@ai-sdk/vue`) 3+ for chat streaming and message handling
- Use `UIMessage` format for all chat messages (never custom message formats)
- NEVER use custom chat streaming implementations

**UI & Styling:**

- Naive UI 2.43+ components (never custom reimplementations)
- All user-facing text MUST use i18n keys from `@/locales/` (never hardcoded strings)

**Import Rules:**

- ALWAYS use `@/` alias for src imports
- NEVER use relative paths like `../../`

```typescript
// ✅ CORRECT
import { useChat } from '@/hooks/useChat'
import type { User } from '@/typings/user'
import { Chat } from '@ai-sdk/vue'
import type { UIMessage } from 'ai'

// ❌ WRONG
import { useChat } from '../../hooks/useChat'
```

### Backend (apps/api/)

**Runtime & Server:**

- Node.js 24+ (required for native fetch and HTTP/2)
- Native HTTP/2 server with HTTP/1.1 fallback (never Express/Fastify/Koa)
- Native fetch API (never axios, node-fetch, got, or other HTTP libraries)

**AI Integration:**

- Vercel AI SDK (ai package) 6+ with @ai-sdk/openai and @ai-sdk/azure
- NEVER use OpenAI SDK directly
- Backend: Use `streamText` and `pipeUIMessageStreamToResponse` for streaming
- Frontend: Use `@ai-sdk/vue` Chat class with `UIMessage` format
- NEVER implement custom streaming or message handling

**Module System:**

- ESM only (never CommonJS)
- ALL imports MUST include `.js` extension even for `.ts` files
- Transport Layer abstractions for framework-agnostic middleware

**Validation & Security:**

- Zod 4+ schemas for ALL input validation
- Redis 5+ for session storage

**Import Rules:**

```typescript
// ✅ CORRECT - Relative imports with .js extension
import { logger } from './utils/logger.js'
import type { TransportRequest } from './transport/types.js'

// ❌ WRONG - Missing .js extension
import { logger } from './utils/logger'

// ❌ WRONG - Using .ts extension
import { logger } from './utils/logger.ts'
```

## Forbidden Patterns

When writing code, NEVER use:

- ❌ CommonJS (`require`/`module.exports`)
- ❌ Express, Fastify, Koa, or any web framework
- ❌ axios, node-fetch, got, or external HTTP libraries
- ❌ OpenAI SDK directly (use Vercel AI SDK)
- ❌ Unofficial ChatGPT APIs or proxy services
- ❌ Custom chat streaming implementations (use AI SDK UI)
- ❌ Custom message formats (use `UIMessage` from ai package)
- ❌ Vue Options API
- ❌ Vuex (use Pinia)
- ❌ Hardcoded user-facing strings (use i18n)
- ❌ Relative imports without `.js` extension in backend
- ❌ npm or yarn commands (use pnpm)

## Development Workflow

### Starting Servers

```bash
# Frontend (from root or apps/web/)
pnpm dev                 # Port 1002

# Backend (from apps/api/)
pnpm dev                 # Port 3002 with watch mode
pnpm start               # Port 3002 without watch
```

### Code Quality (MUST pass before committing)

```bash
# From root - checks both apps
pnpm quality             # Type-check + lint + format check
pnpm quality:fix         # Auto-fix all issues
```

**Zero tolerance policy:**

- TypeScript errors: 0
- ESLint warnings: 0 (warnings treated as errors)
- Prettier formatting: enforced via pre-commit hooks

### Testing

```bash
# Backend tests (from apps/api/)
pnpm test                # Run all tests
pnpm test:watch          # Watch mode
pnpm test:ui             # Vitest UI
```

Use fast-check for property-based testing of validation logic.

### Building

```bash
# Frontend (from apps/web/)
pnpm build               # Type-check + build
pnpm build-only          # Build without type-check
pnpm preview             # Preview production build

# Backend (from apps/api/)
pnpm build               # Build to ./build directory
pnpm prod                # Run production build
```

## Environment Configuration

Backend requires `apps/api/.env` (create from `.env.example`):

```bash
# Required
OPENAI_API_KEY=sk-xxx
AI_PROVIDER=openai                       # or 'azure'

# Azure OpenAI (when AI_PROVIDER=azure)
AZURE_OPENAI_API_KEY=xxx
AZURE_OPENAI_ENDPOINT=https://xxx.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-4o-deployment

# Security
AUTH_SECRET_KEY=xxx
MAX_REQUEST_PER_HOUR=100
TIMEOUT_MS=60000
```

ALWAYS validate environment variables on startup using Zod schemas.

## Build Targets & Performance

### Frontend

- Target: ESNext, Chrome 131+, Firefox 133+, Safari 18+
- Code splitting: Route-based lazy loading
- Bundle size: Main chunk < 500KB
- Manual chunks: Vue ecosystem, UI libraries, utilities

### Backend

- Target: Node.js 24 ESM
- Streaming: AI SDK's streamText and pipeUIMessageStreamToResponse
- Circuit breaker: Fault tolerance for external APIs
- Retry logic: Exponential backoff
- API response: < 200ms (excluding AI provider latency)

## Key Technology Versions

**Frontend:** Vue 3.5+, TypeScript 5.9+, Vite 7+, Naive UI 2.43+, Pinia 3+, Vue Router 4+, Vue i18n 11+, @ai-sdk/vue 3+, ai 6+

**Backend:** Node.js 24+, Vercel AI SDK 6+, @ai-sdk/openai 3+, @ai-sdk/azure 3+, TypeScript 5.9+, Zod 4+, Redis 5+

**Tools:** PNPM 10+, ESLint 9+ (@antfu/eslint-config), Prettier 3+, Vitest 4+ with fast-check, Husky 9+
