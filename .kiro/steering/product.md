---
inclusion: always
---

# Product Context & Conventions

## Application Identity

ChatGPT Web - A security-focused, self-hosted ChatGPT interface supporting OpenAI and Azure OpenAI APIs with advanced reasoning model capabilities.

## Core Product Principles

When working on this codebase, always prioritize:

1. **Security First**: Never compromise on input validation, XSS protection, or API security
2. **Official APIs Only**: Use OpenAI SDK v6+ and official Azure OpenAI endpoints exclusively
3. **Zero Tolerance**: Maintain zero TypeScript errors and zero ESLint warnings
4. **Modern Standards**: Target Node.js 24+ features, ESNext syntax, latest browser APIs

## Supported AI Capabilities

### Provider Support

- OpenAI API (primary): GPT-4o, GPT-4o-mini, o3, o3-mini, o4-mini
- Azure OpenAI (enterprise): Same models via Azure endpoints
- Provider switching must be seamless with no data loss

### Reasoning Models (o3/o4 series)

- Display step-by-step reasoning process in UI
- Handle extended response times gracefully
- Preserve reasoning steps in session history
- Support streaming for reasoning content

### Response Handling

- All responses must support streaming
- Markdown rendering with syntax highlighting (highlight.js)
- Math formulas via KaTeX
- Diagrams via Mermaid
- Preserve formatting across sessions

## Feature Boundaries

### What This Product Does

- Provides web interface for ChatGPT API interactions
- Manages multi-session conversations with context
- Handles authentication and rate limiting
- Supports internationalization (i18n)
- Offers prompt templates and management

### What This Product Does NOT Do

- Does not use unofficial/proxy APIs (removed in recent migration)
- Does not store conversation data in external databases (session-based only)
- Does not provide model training or fine-tuning
- Does not implement custom AI models

## User Experience Conventions

### Session Management

- Support multiple concurrent chat sessions
- Preserve context within sessions
- Allow session export/import
- Clear session boundaries in UI

### Internationalization

- All user-facing text must use i18n keys
- Support language switching without reload
- Maintain translations in `apps/web/src/locales/`

### Error Handling

- Display user-friendly error messages
- Log detailed errors server-side only
- Provide actionable recovery steps
- Never expose API keys or internal details

## Security Requirements

### Input Validation

- Validate all user inputs with Zod schemas
- Sanitize inputs before processing
- Reject malformed requests early
- Use middleware validation consistently

### API Security

- Require authentication for all API endpoints
- Implement rate limiting (default: 100 req/hour)
- Use secure headers (Helmet middleware)
- Validate API keys on startup

### Content Security

- Prevent XSS in rendered markdown
- Sanitize user-generated content
- Use CSP headers appropriately
- Escape special characters in outputs

## Deployment Constraints

### Environment Requirements

- Node.js 24.0.0+ (required for native fetch)
- PNPM 10.0.0+ (required package manager)
- Redis 5+ (for session storage)
- HTTPS in production (required)

### Configuration

- All secrets via environment variables
- No hardcoded credentials
- Validate environment on startup
- Provide clear .env.example templates

### Scaling Considerations

- Stateless backend design
- Session storage in Redis
- Support horizontal scaling
- Connection pooling for external APIs

## Development Workflow

### Code Quality Gates

- TypeScript strict mode must pass
- ESLint must show zero warnings
- Prettier formatting enforced
- Pre-commit hooks validate all changes

### Testing Requirements

- Unit tests for business logic
- Property-based tests (fast-check) for validation
- Integration tests for API endpoints
- Test coverage for security-critical paths

### Performance Targets

- Frontend: First contentful paint < 1.5s
- Backend: API response time < 200ms (excluding AI provider)
- Bundle size: Keep main chunk < 500KB
- Code splitting: Route-based lazy loading

## Integration Points

### External Services

- OpenAI API: Official SDK v6+, streaming support
- Azure OpenAI: Compatible with OpenAI SDK
- Redis: Session storage and caching
- No other external dependencies

### API Contracts

- RESTful endpoints for chat operations
- Streaming responses via Server-Sent Events
- JSON request/response format
- Consistent error response structure

## Migration Context

### Recent Changes

- Removed unofficial ChatGPT proxy API support
- Migrated to official OpenAI SDK v6+
- Upgraded to Node.js 24 for native fetch
- Modernized Express routing patterns

### Deprecated Patterns

- Do not use `chatgpt` npm package (unofficial)
- Avoid `node-fetch` (use native fetch)
- Do not use Express 4 patterns (use Express 5)
- Avoid CommonJS (use ESM exclusively)
