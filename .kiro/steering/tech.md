---
inclusion: always
---

# Technology Stack & Build System

## Critical Technology Constraints

When writing code for this project, you MUST adhere to these requirements:

### Frontend Requirements

- Use Vue 3 Composition API (not Options API)
- TypeScript strict mode - zero errors tolerated
- Use `@/` alias for all src imports (never relative paths like `../../`)
- All user-facing text must use i18n keys from `@/locales/`
- Use Naive UI components (not custom implementations)
- Pinia stores for state management (not Vuex)

### Backend Requirements

- Node.js 24+ native fetch (never use axios, node-fetch, or other HTTP libraries)
- ESM modules only - all imports MUST include `.js` extension even for `.ts` files
- Express 5 patterns (not Express 4)
- OpenAI SDK v6+ official API (never unofficial/proxy APIs)
- Zod schemas for ALL input validation
- All middleware must be Express 5 compatible

### Forbidden Patterns

- ❌ CommonJS (require/module.exports)
- ❌ Unofficial ChatGPT APIs or proxy services
- ❌ External HTTP libraries (axios, node-fetch, got, etc.)
- ❌ Express 4 patterns
- ❌ Options API in Vue components
- ❌ Hardcoded strings instead of i18n keys
- ❌ Relative imports without `.js` extension in backend

## Package Manager

ALWAYS use `pnpm` commands, never npm or yarn:

- Install: `pnpm install` (not `npm install`)
- Add dependency: `pnpm add <package>` (not `npm install <package>`)
- Run scripts: `pnpm <script>` (not `npm run <script>`)

## Monorepo Structure

This is a PNPM workspace with two apps:

- `apps/web/` - Frontend (Vue 3, port 1002)
- `apps/api/` - Backend (Node.js 24, port 3002)

When running commands:

- Frontend: Run from `apps/web/` or root with `pnpm dev`
- Backend: Run from `apps/api/` (paths like `cd service` are legacy references to `apps/api`)

## Development Commands

### Starting Development Servers

```bash
# Frontend (from root or apps/web/)
pnpm dev                 # Port 1002

# Backend (from apps/api/)
pnpm dev                 # Port 3002 with watch mode
pnpm start               # Port 3002 without watch
```

### Code Quality (run before committing)

```bash
# From root - checks both apps
pnpm quality             # Type-check + lint + format check
pnpm quality:fix         # Auto-fix all issues

# These commands MUST pass with zero errors/warnings
```

### Testing

```bash
# Backend tests (from apps/api/)
pnpm test                # Run all tests
pnpm test:watch          # Watch mode
pnpm test:ui             # Vitest UI

# Use fast-check for property-based testing
```

### Building for Production

```bash
# Frontend (from apps/web/)
pnpm build               # Type-check + build
pnpm build-only          # Build without type-check
pnpm preview             # Preview production build

# Backend (from apps/api/)
pnpm build               # Build to ./build directory
pnpm prod                # Run production build
```

## Code Quality Standards

Before suggesting any code changes, ensure:

1. **TypeScript**: Strict mode enabled, zero errors
2. **ESLint**: Zero warnings (warnings treated as errors)
3. **Formatting**: Prettier enforced via pre-commit hooks
4. **Testing**: Property-based tests for validation logic
5. **Security**: All inputs validated with Zod schemas

## Import Conventions

### Frontend (apps/web/)

```typescript
// ✅ CORRECT - Use @ alias
import { useChat } from '@/hooks/useChat'
import { ChatMessage } from '@/components/chat/Message'
import type { User } from '@/typings/user'

// ❌ WRONG - Never use relative paths
import { useChat } from '../../hooks/useChat'
```

### Backend (apps/api/)

```typescript
// ✅ CORRECT - Relative imports with .js extension
import { logger } from './utils/logger.js'
import { validateRequest } from '../middleware/validation.js'
import type { Request, Response } from 'express'

// ❌ WRONG - Missing .js extension
import { logger } from './utils/logger'

// ❌ WRONG - Using .ts extension
import { logger } from './utils/logger.ts'
```

## Environment Configuration

Backend requires these environment variables in `apps/api/.env`:

```bash
# Required
OPENAI_API_KEY=sk-xxx                    # OpenAI API key
AI_PROVIDER=openai                       # or 'azure'

# Azure OpenAI (when AI_PROVIDER=azure)
AZURE_OPENAI_API_KEY=xxx
AZURE_OPENAI_ENDPOINT=https://xxx.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-4o-deployment

# Security
AUTH_SECRET_KEY=xxx                      # Access control
MAX_REQUEST_PER_HOUR=100                # Rate limiting
TIMEOUT_MS=60000                        # Request timeout
```

Always validate environment variables on startup using Zod schemas.

## Technology Versions

### Frontend Stack

- Vue.js 3.5+ (Composition API)
- TypeScript 5.9+
- Vite 7+
- Naive UI 2.43+
- Pinia 3+
- Vue Router 4+
- Vue i18n 11+

### Backend Stack

- Node.js 24+ (required for native fetch)
- Express.js 5+
- TypeScript 5.9+
- OpenAI SDK 6+
- Zod 4+
- Redis 5+

### Development Tools

- PNPM 10+ (required)
- ESLint 9+ (@antfu/eslint-config)
- Prettier 3+
- Vitest 4+ with fast-check
- Husky 9+

## Build Targets

### Frontend

- Target: ESNext, Chrome 131+, Firefox 133+, Safari 18+
- Code splitting: Route-based lazy loading
- Manual chunks: Vue ecosystem, UI libraries, utilities
- Tree shaking: Aggressive with manual pure annotations

### Backend

- Target: Node.js 24 ESM
- Native fetch: No external HTTP libraries
- Circuit breaker: Fault tolerance for external APIs
- Retry logic: Exponential backoff

## Performance Guidelines

When implementing features:

- Frontend: Use route-based code splitting and lazy loading
- Backend: Stream responses, use connection pooling
- Bundle size: Keep main chunk < 500KB
- API response: < 200ms (excluding AI provider latency)
