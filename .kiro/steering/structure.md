---
inclusion: always
---

# Project Structure & File Organization

## Monorepo Layout

PNPM workspace with two apps:

- `apps/web/` - Vue 3 frontend (port 1002)
- `apps/api/` - Node.js 24 backend (port 3002)

## Frontend Directory Map (`apps/web/src/`)

| Path                    | Purpose                                                                                   | Naming Convention                                     |
| ----------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `components/common/`    | Reusable UI (HoverButton, LoadingSpinner, NaiveProvider, Setting, SvgIcon, UserAvatar)    | PascalCase folders, `index.vue` main file             |
| `components/custom/`    | Project-specific components (GithubSite)                                                  | Single `.vue` files or PascalCase folders             |
| `components/reasoning/` | AI reasoning UI (ModelSelector, ReasoningLoader, ReasoningSteps)                          | PascalCase folders, `index.vue` main file             |
| `views/`                | Page-level route components                                                               | PascalCase, `chat/` and `exception/` have structure   |
| `views/chat/`           | Chat interface with `components/`, `hooks/`, `layout/`                                    | Feature-scoped organization                           |
| `views/exception/`      | Error pages (404, 500)                                                                    | PascalCase folders with `index.vue`                   |
| `store/modules/`        | Pinia stores (`app/`, `auth/`, `chat/`, `settings/`, `user/`)                             | camelCase folders, self-contained modules             |
| `hooks/`                | Reusable composables (useBasicLayout, useIconRender, useLanguage, useReasoning, useTheme) | camelCase files, chat-specific in `views/chat/hooks/` |
| `utils/`                | Pure helper functions                                                                     | camelCase files, organized in subfolders              |
| `api/`                  | API client and endpoint definitions                                                       | camelCase files, TypeScript interfaces                |
| `locales/`              | i18n translations (ALL user text) - en-US, es-ES, ko-KR, ru-RU, vi-VN, zh-CN, zh-TW       | Language code files (e.g., `en-US.ts`)                |
| `plugins/`              | Vue plugins (assets, markstream, scrollbar)                                               | camelCase files                                       |
| `router/`               | Vue Router configuration                                                                  | `index.ts` (routes), `permission.ts` (guards)         |
| `typings/`              | TypeScript type definitions                                                               | `.d.ts` files                                         |

## Backend Directory Map (`apps/api/src/`)

| Path                 | Purpose                          | Key Files                                                                                                                                         |
| -------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `providers/`         | AI provider implementations      | `base.ts` (abstract), `openai.ts`, `azure.ts`, `factory.ts`, `config.ts`, `index.ts`                                                              |
| `chatgpt/`           | Vercel AI SDK integration layer  | `ai-sdk-chat.ts` (streaming chat), `provider-adapter.ts` (provider abstraction)                                                                   |
| `routes/`            | API route handlers               | `chat.ts`, `config.ts`, `health.ts`, `session.ts`, `verify.ts`, `index.ts`                                                                        |
| `middleware-native/` | Native HTTP middleware           | `auth.ts`, `body-parser.ts`, `cors.ts`, `rate-limiter.ts`, `request-logger.ts`, `security-headers.ts`, `session.ts`, `static.ts`, `validation.ts` |
| `security/`          | Security-critical validation     | `auth-validator.ts`, `validator.ts`, `index.ts`                                                                                                   |
| `validation/`        | Zod schemas                      | `schemas.ts` (ALL user input validation), `cleanup-validator.ts`, `configuration-validation.ts`, `index.ts`                                       |
| `utils/`             | Shared utilities                 | `logger.ts` (use for ALL logging), `error-handler.ts`, `retry.ts`, `async-handler.ts`, `graceful-shutdown.ts`, `sse-parser.ts`, etc.              |
| `config/`            | Environment validation           | `validator.ts` (startup checks, env var validation)                                                                                               |
| `transport/`         | Framework-agnostic abstractions  | `types.ts`, `router.ts`, `middleware-chain.ts`, `index.ts`                                                                                        |
| `adapters/`          | HTTP server adapters             | `http2-adapter.ts` (native HTTP/2 + HTTP/1.1 fallback), `error-handling.test.ts`, `index.ts`                                                      |
| `test/`              | Integration & performance tests  | `integration/`, `performance/`, `api-compatibility.test.ts`, `security-policies.test.ts`, `test-helpers.ts`                                       |
| `test-utils/`        | Property-based testing utilities | `property-generators.ts`, `property-test-utils.ts`, `index.ts`                                                                                    |
| `*.test.ts`          | Colocated unit tests             | Test files alongside implementation (e.g., `auth.test.ts`, `router.test.ts`)                                                                      |

## File Naming Rules

**Frontend:**

- Components: `UserAvatar.vue` (PascalCase), folder `UserAvatar/` with `index.vue`
- Utils/hooks: `formatMessage.ts` (camelCase)
- Types: `types.ts` or descriptive names

**Backend:**

- Source files: `errorHandler.ts` (camelCase)
- Test files: `validator.test.ts` (same name + `.test.ts`)
- Types: `types.ts` or descriptive names

**Directories:**

- Features: `chatgpt/`, `middleware/` (camelCase)
- Components: `HoverButton/`, `ModelSelector/` (PascalCase)

## Import Path Rules

**Frontend - ALWAYS use `@/` alias:**

```typescript
import { useChat } from '@/hooks/useChat'
import { ChatMessage } from '@/components/chat/Message'
import type { User } from '@/typings/user'
```

**Backend - ALWAYS use `.js` extension (ESM requirement):**

```typescript
import { logger } from './utils/logger.js'
import { validateRequest } from '../middleware-native/validation.js'
import type { TransportRequest } from './transport/types.js'
```

## Architecture Patterns

**Separation of Concerns:**

- Frontend and backend are completely isolated
- No shared code between `apps/web/` and `apps/api/` (use `packages/` if needed)
- Business logic separate from presentation

**Feature-Based Organization:**

- Group related files (components, hooks, types) together
- Chat feature: self-contained with `components/`, `hooks/`, `layout/`
- Providers: grouped in `providers/` with factory pattern
- Routes: organized by feature in `routes/` directory

**Type Safety:**

- Zero TypeScript errors policy
- Zod for runtime validation, TypeScript for compile-time
- Types in `types.ts` or colocated with implementation

**Security:**

- All security logic in `security/` and `middleware-native/`
- ALL inputs validated in `validation/` with Zod
- Never mix security with business logic

**Testing:**

- Unit tests colocated (`*.test.ts`)
- Integration tests in `test/integration/`
- Performance tests in `test/performance/`
- Property-based tests (fast-check) in `test-utils/`

## Key Architectural Decisions

### Backend

- **Native HTTP/2 + HTTP/1.1 fallback**: No Express/Fastify, direct Node.js `http2` module via `adapters/http2-adapter.ts`
- **Framework-agnostic transport layer**: Abstractions in `transport/` allow swapping HTTP implementations
- **Vercel AI SDK integration**: `chatgpt/` layer wraps AI SDK for streaming responses with `ai-sdk-chat.ts` and `provider-adapter.ts`
- **Zod for ALL validation**: Input validation in `validation/schemas.ts`, config in `config/validator.ts`, environment in `startup-validation.ts`
- **Centralized logging**: `utils/logger.ts` for ALL log output
- **Security-first**: Separate `security/` for auth validators, rate limiting in `middleware-native/rate-limiter.ts`
- **Property-based testing**: Use fast-check via `test-utils/` for robust test coverage

### Frontend

- **Vue 3 Composition API**: All components use `<script setup>`
- **Pinia for state**: Modular stores in `store/modules/` (app, auth, chat, settings, user)
- **i18n for ALL text**: NEVER hardcode user-facing strings, use `locales/` with 7 languages (en-US, es-ES, ko-KR, ru-RU, vi-VN, zh-CN, zh-TW)
- **Naive UI**: Component library, customized in `components/common/`
- **Feature-scoped organization**: Chat UI has its own `components/`, `hooks/`, `layout/`
- **TypeScript strict mode**: Type safety enforced with `.d.ts` files in `typings/`
- **Plugin architecture**: Extensible via `plugins/` (assets, markstream, scrollbar)

## Quick Decision Tree

**Adding frontend code:**

- Reusable UI component → `components/common/` (HoverButton, LoadingSpinner, etc.)
- Project-specific component → `components/custom/` (like GithubSite)
- AI reasoning UI → `components/reasoning/` (ModelSelector, ReasoningLoader, ReasoningSteps)
- New page → `views/` (chat or exception)
- State management → `store/modules/{feature}/` (app, auth, chat, settings, user)
- Composable → `hooks/` (or `views/chat/hooks/` if chat-only)
- API client → `api/index.ts`
- User-facing text → `locales/` (NEVER hardcode, add to all 7 languages)
- Plugin → `plugins/` (assets, markstream, scrollbar)
- Type definitions → `typings/` (`.d.ts` files)

**Adding backend code:**

- New AI provider → `providers/` (extend `base.ts`, update `factory.ts`)
- AI SDK integration → `chatgpt/` (streaming, provider adapter)
- New route → `routes/` + register in `routes/index.ts`
- Middleware → `middleware-native/` (auth, cors, rate-limiter, etc.)
- Input validation → `validation/schemas.ts` (Zod schemas)
- Security validator → `security/` (auth-validator, validator)
- Utility → `utils/` (logger, error-handler, retry, etc.)
- Config validation → `config/validator.ts` or `startup-validation.ts`
- Transport abstraction → `transport/` (types, router, middleware-chain)
- HTTP adapter → `adapters/http2-adapter.ts`
- Unit test → Colocate as `*.test.ts` next to implementation
- Integration test → `test/integration/`
- Performance test → `test/performance/`
- Property-based test utilities → `test-utils/`

## Configuration Files

- Root: `turbo.json`, `pnpm-workspace.yaml`, `eslint.config.js`, `.prettierrc`
- Frontend: `apps/web/vite.config.ts`, `apps/web/tsconfig.json`
- Backend: `apps/api/tsconfig.json`, `apps/api/tsup.config.ts`, `apps/api/vitest.config.ts`
- Environment: `apps/api/.env` (create from `.env.example`)
