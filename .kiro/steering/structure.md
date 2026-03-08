---
inclusion: always
---

# Project Structure & Organization

## Monorepo Architecture

This is a PNPM workspace monorepo with two main applications:

- `apps/web/` - Vue.js 3 frontend (port 1002)
- `apps/api/` - Node.js 24 backend (port 3002)

When creating new files, always place them in the appropriate workspace based on their purpose.

## Frontend Structure (`apps/web/src/`)

### Where to Place New Frontend Code

**Components** (`apps/web/src/components/`):

- `common/` - Reusable UI components (buttons, loaders, icons, settings panels)
- `custom/` - Project-specific components (GitHub integration, etc.)
- `reasoning/` - AI reasoning model UI (model selector, reasoning steps display)
- Use PascalCase folder names matching component name
- Always create `index.vue` as the main component file

**Views** (`apps/web/src/views/`):

- Page-level components that map to routes
- `chat/` contains the main chat interface with its own `components/`, `hooks/`, and `layout/` subdirectories
- `exception/` for error pages (404, 500)

**State Management** (`apps/web/src/store/modules/`):

- Create feature-based Pinia stores: `app/`, `auth/`, `chat/`, `prompt/`, `settings/`, `user/`
- Each store module should be self-contained with its own state, getters, and actions

**Composables** (`apps/web/src/hooks/`):

- Reusable Vue composition functions
- Chat-specific composables go in `views/chat/hooks/`

**Utilities** (`apps/web/src/utils/`):

- Pure functions and helper utilities
- Keep framework-agnostic when possible

**API Client** (`apps/web/src/api/`):

- API endpoint definitions and client configuration
- Use TypeScript interfaces for request/response types

**Internationalization** (`apps/web/src/locales/`):

- All user-facing text must use i18n keys
- Add translations for all supported languages

## Backend Structure (`apps/api/src/`)

### Where to Place New Backend Code

**AI Providers** (`apps/api/src/providers/`):

- `base.ts` - Abstract provider interface (extend for new providers)
- `openai.ts`, `azure.ts` - Concrete provider implementations
- `factory.ts` - Provider factory pattern (modify when adding new providers)
- `config.ts` - Provider configuration and validation

**Middleware** (`apps/api/src/middleware/`):

- `auth.ts` - Authentication and authorization
- `limiter.ts` - Rate limiting logic
- `security.ts` - Security headers, XSS protection, input sanitization
- `validation.ts` - Request validation using Zod schemas
- All middleware must be Express 5 compatible

**Security** (`apps/api/src/security/`):

- Security-critical validation logic
- Authentication validators
- Keep security logic separate from business logic

**Validation** (`apps/api/src/validation/`):

- Zod schemas for request/response validation
- Configuration cleanup and validation
- All user inputs must be validated here

**Utilities** (`apps/api/src/utils/`):

- `error-handler.ts` - Centralized error handling
- `logger.ts` - Structured logging (use for all logging)
- `retry.ts` - Retry logic with circuit breaker pattern
- `is.ts` - Type checking utilities

**Configuration** (`apps/api/src/config/`):

- Environment variable validation
- Startup configuration checks

**Tests** (`apps/api/src/test/` or colocated `*.test.ts`):

- Unit tests colocated with source files
- Integration tests in `test/` directory
- Use Vitest with fast-check for property-based testing

## File Naming Conventions

**Frontend (Vue.js)**:

- Vue components: PascalCase with `.vue` extension (`UserAvatar.vue`)
- Component folders: PascalCase matching component name (`UserAvatar/`)
- Main component export: Always `index.vue` or `index.ts`
- TypeScript utilities: camelCase (e.g., `formatMessage.ts`)
- Type definitions: `types.ts` or descriptive names

**Backend (Node.js)**:

- TypeScript files: camelCase (e.g., `errorHandler.ts`, `authValidator.ts`)
- Test files: Same name as source with `.test.ts` suffix (`validator.test.ts`)
- Type files: `types.ts` or descriptive names
- Config files: descriptive names (`validator.ts`, `config.ts`)

**Directories**:

- Feature directories: camelCase (`chatgpt/`, `middleware/`, `providers/`)
- Component directories: PascalCase (`HoverButton/`, `ModelSelector/`)

## Import Path Conventions

**Frontend** (`apps/web/`):

```typescript
// ALWAYS use @ alias for src imports
import { useChat } from '@/hooks/useChat'
import { ChatMessage } from '@/components/chat/Message'
import type { User } from '@/typings/user'
```

**Backend** (`apps/api/`):

```typescript
// ALWAYS use relative imports with .js extension (ESM requirement)
import { logger } from './utils/logger.js'
import { validateRequest } from '../middleware/validation.js'
import type { ChatMessage } from './chatgpt/types.js'

// Type-only imports use 'type' keyword
import type { Request, Response } from 'express'
```

**Critical**: Backend imports MUST include `.js` extension even though source files are `.ts` - this is required for ESM compatibility.

## Code Organization Principles

**Separation of Concerns**:

- Keep frontend and backend completely separate
- No shared code between `apps/web/` and `apps/api/` (use `packages/` if needed)
- Business logic separate from presentation logic

**Feature-Based Organization**:

- Group related files together (components, hooks, types)
- Chat feature has its own subdirectory with components, hooks, and layout
- Provider implementations grouped in `providers/` directory

**Modular Design**:

- Each module has a single, clear responsibility
- Use factory pattern for provider selection
- Middleware functions are composable and reusable

**Type Safety**:

- Comprehensive TypeScript coverage (zero errors policy)
- Define types in `types.ts` files or colocated with implementation
- Use Zod for runtime validation, TypeScript for compile-time types

**Security First**:

- All security logic in dedicated `security/` and `middleware/` directories
- Validate all inputs in `validation/` using Zod schemas
- Never mix security logic with business logic

**Testability**:

- Colocate unit tests with source files (`*.test.ts`)
- Integration tests in `test/` directory
- Use dependency injection for easier mocking
- Property-based tests for validation logic

## Quick Reference: Where to Add New Code

**New Vue Component**: `apps/web/src/components/common/` or `components/custom/`
**New Page/View**: `apps/web/src/views/`
**New Pinia Store**: `apps/web/src/store/modules/{feature}/`
**New Composable**: `apps/web/src/hooks/` (or `views/chat/hooks/` if chat-specific)
**New API Endpoint**: `apps/web/src/api/`
**New i18n Translation**: `apps/web/src/locales/`

**New Backend Route**: Add to `apps/api/src/index.ts` with appropriate middleware
**New AI Provider**: `apps/api/src/providers/` (extend `base.ts`, update `factory.ts`)
**New Middleware**: `apps/api/src/middleware/`
**New Validation Schema**: `apps/api/src/validation/schemas.ts`
**New Utility Function**: `apps/api/src/utils/`
**New Test**: Colocate as `*.test.ts` or add to `apps/api/src/test/`

## Configuration Files Reference

**Root**: `turbo.json`, `pnpm-workspace.yaml`, `eslint.config.js`, `.prettierrc`
**Frontend**: `apps/web/vite.config.ts`, `apps/web/tsconfig.json`
**Backend**: `apps/api/tsconfig.json`, `apps/api/tsup.config.ts`, `apps/api/vitest.config.ts`
**Environment**: `apps/api/.env` (create from `.env.example`)
