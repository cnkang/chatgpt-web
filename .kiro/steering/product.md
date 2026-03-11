---
inclusion: always
---

# Product Context & Conventions

ChatGPT Web is a security-focused, self-hosted ChatGPT interface supporting OpenAI and Azure OpenAI APIs with advanced reasoning model capabilities.

## Core Principles (Non-Negotiable)

1. **Security First**: All user inputs validated with Zod, XSS prevention mandatory, API keys never exposed
2. **Official APIs Only**: Vercel AI SDK (ai package) with @ai-sdk/openai and @ai-sdk/azure - no unofficial/proxy APIs
3. **Zero Tolerance**: Zero TypeScript errors, zero ESLint warnings before commit
4. **Modern Standards**: Node.js 24+ native HTTP server (no Express), ESNext syntax, latest browser APIs

## Supported Features

### AI Provider Support

**OpenAI API** (primary): GPT-4o, GPT-4o-mini, GPT-5, GPT-5.1, GPT-5.2, o3, o3-mini, o4-mini
**Azure OpenAI** (enterprise): Same models via Azure endpoints with Responses API support
**Provider Switching**: Must be seamless with zero data loss
**AI SDK**: Vercel AI SDK (ai package v6+) with @ai-sdk/openai and @ai-sdk/azure providers

### Reasoning Models (o3/o4 series)

When implementing reasoning model features:

- Display step-by-step reasoning process in UI components
- Handle extended response times with loading states
- Preserve reasoning steps in session history
- Support streaming for reasoning content

### Response Rendering

All chat responses must support:

- Streaming via Vercel AI SDK's `streamText` and `pipeUIMessageStreamToResponse`
- UI Message format from AI SDK for frontend compatibility
- Markdown with syntax highlighting (highlight.js)
- Math formulas (KaTeX)
- Diagrams (Mermaid)
- D2 diagrams (deployment opt-in only, not default)

## Product Scope

### In Scope

- Web interface for ChatGPT API interactions
- Multi-session conversation management with context preservation
- Authentication and rate limiting (default: 100 req/hour)
- Internationalization (i18n) with runtime language switching
- Session export/import functionality

### Out of Scope

- Unofficial/proxy APIs (removed in migration)
- External database storage (session-based only via Redis)
- Model training or fine-tuning
- Custom AI model implementations

## Security Requirements (Mandatory)

### Input Validation

When handling user input:

- Validate ALL inputs with Zod schemas in `apps/api/src/validation/`
- Sanitize before processing using security middleware
- Reject malformed requests at middleware layer
- Never trust client-side validation alone

### API Security

For all API endpoints:

- Require authentication via native middleware in `apps/api/src/middleware-native/`
- Apply rate limiting via `limiter.ts` middleware
- Use security headers middleware for CSP, HSTS, etc.
- Validate API keys on application startup

### Content Security

When rendering user content:

- Prevent XSS in markdown rendering
- Sanitize user-generated content before display
- Apply CSP headers appropriately
- Escape special characters in all outputs
- Never expose API keys, secrets, or internal errors to users

## User Experience Patterns

### Session Management

When implementing session features:

- Support multiple concurrent chat sessions
- Preserve context within each session
- Provide session export/import functionality
- Display clear session boundaries in UI

### Internationalization

For all user-facing text:

- Use i18n keys from `apps/web/src/locales/` (never hardcoded strings)
- Support runtime language switching without page reload
- Add translations for all supported languages when adding new text

### Error Handling

When errors occur:

- Display user-friendly messages in UI
- Log detailed errors server-side only (use `logger.ts`)
- Provide actionable recovery steps
- Never expose API keys, secrets, or stack traces to users

## Deployment Requirements

### Environment

- Node.js 24.0.0+ (required for native fetch)
- PNPM 10.0.0+ (only supported package manager)
- Redis 5+ (session storage)
- HTTPS in production (mandatory)

### Configuration

When adding configuration:

- Use environment variables for all secrets
- Never hardcode credentials
- Validate environment on startup with Zod
- Update `.env.example` templates

### Scaling

Architecture must support:

- Stateless backend design
- Session storage in Redis (not in-memory)
- Horizontal scaling
- Connection pooling for external APIs

## Code Quality Standards

### Pre-Commit Requirements

Before committing code:

- TypeScript strict mode passes with zero errors
- ESLint shows zero warnings (warnings = errors)
- Prettier formatting applied
- Pre-commit hooks validate all changes

### Testing Requirements

When implementing features:

- Unit tests for business logic
- Property-based tests (fast-check) for validation logic
- Integration tests for API endpoints
- Test coverage for all security-critical paths

### Performance Targets

Maintain these benchmarks:

- Frontend: First contentful paint < 1.5s
- Backend: API response < 200ms (excluding AI provider latency)
- Bundle size: Main chunk < 500KB
- Use route-based code splitting and lazy loading

## External Integrations

### Supported Services

- **Vercel AI SDK**: ai package v6+ with @ai-sdk/openai and @ai-sdk/azure providers
- **OpenAI API**: Via @ai-sdk/openai, streaming support required
- **Azure OpenAI**: Via @ai-sdk/azure with Responses API support
- **Redis**: Session storage and caching only
- No other external dependencies allowed

### API Contracts

All API endpoints must follow:

- Native Node.js HTTP/HTTP2 server patterns
- Streaming responses via AI SDK's `pipeUIMessageStreamToResponse`
- UI Message format from Vercel AI SDK
- JSON request/response format
- Consistent error response structure

## Migration Context & Deprecated Patterns

### Recent Architectural Changes

- Removed Express framework, migrated to native Node.js HTTP/HTTP2 server
- Removed unofficial ChatGPT proxy API support
- Migrated to Vercel AI SDK (ai package) with @ai-sdk/openai and @ai-sdk/azure
- Upgraded to Node.js 24 for native fetch and modern APIs
- Implemented custom middleware chain and router for native HTTP server

### Forbidden Patterns (Do Not Use)

When writing code, never use:

- ❌ Express framework (removed, use native HTTP server)
- ❌ `chatgpt` npm package (unofficial, removed)
- ❌ `node-fetch`, `axios`, `got` (use native fetch)
- ❌ OpenAI SDK directly (use Vercel AI SDK instead)
- ❌ CommonJS `require`/`module.exports` (use ESM)
- ❌ Unofficial/proxy APIs for ChatGPT
- ❌ Hardcoded user-facing strings (use i18n keys)
- ❌ Relative imports without `.js` extension in backend

### Correct Patterns (Always Use)

When writing code, always use:

- ✅ Vercel AI SDK (ai package) with @ai-sdk/openai and @ai-sdk/azure
- ✅ Native Node.js HTTP/HTTP2 server (HTTP2Adapter)
- ✅ Node.js 24 native fetch
- ✅ Custom middleware chain in `apps/api/src/middleware-native/`
- ✅ RouterImpl for routing in `apps/api/src/transport/`
- ✅ ESM with `.js` extensions in backend imports
- ✅ Zod schemas for all validation
- ✅ i18n keys for all user-facing text
- ✅ `@/` alias for frontend imports
