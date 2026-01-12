# @chatgpt-web/shared

Shared utilities, types, and validation schemas for the ChatGPT Web monorepo.

## Overview

This package contains framework-agnostic utilities and types that are shared between the frontend and backend applications. It provides:

- **Common TypeScript types and interfaces**
- **Framework-agnostic utility functions**
- **Zod validation schemas**
- **Tree-shaking friendly exports**

## Installation

This package is part of the ChatGPT Web monorepo and is installed automatically when you install dependencies in the workspace.

```bash
# From the root of the monorepo
pnpm install
```

## Usage

### Importing Types

```typescript
import type { ApiResponse, ChatMessage, ChatProcessRequest } from '@chatgpt-web/shared'

// Or import from specific modules
import type { ChatMessage } from '@chatgpt-web/shared/types'
```

### Using Utilities

```typescript
import { formatTimestamp, generateId, validateApiKey } from '@chatgpt-web/shared'

// Or import from specific modules
import { validateApiKey } from '@chatgpt-web/shared/utils'
```

### Using Validation Schemas

```typescript
import { ChatMessageSchema, ChatProcessRequestSchema } from '@chatgpt-web/shared'

// Validate data
const result = ChatMessageSchema.safeParse(data)
if (result.success) {
  // Data is valid
  console.log(result.data)
} else {
  // Handle validation errors
  console.error(result.error)
}
```

## Package Structure

```
src/
├── types/          # TypeScript type definitions
├── utils/          # Framework-agnostic utility functions
├── validation/     # Zod validation schemas
└── index.ts        # Main exports
```

## Key Features

### Type Safety

All types are strictly typed with TypeScript and provide comprehensive coverage for:

- Chat messages and conversations
- API requests and responses
- Configuration objects
- Provider interfaces

### Framework Agnostic

All utilities are designed to work in both Node.js and browser environments without dependencies on specific frameworks.

### Validation

Comprehensive Zod schemas provide:

- Input sanitization
- XSS prevention
- Type coercion
- Custom validation rules

### Tree Shaking

The package is designed with tree-shaking in mind:

- Named exports only
- Modular structure
- ESM format
- Proper `sideEffects: false` configuration

## Development

### Building

```bash
# Build the package
pnpm build

# Watch mode for development
pnpm dev
```

### Testing

```bash
# Run tests
pnpm test

# Watch mode
pnpm test:watch
```

### Type Checking

```bash
# Type check without emitting files
pnpm type-check
```

### Linting and Formatting

```bash
# Lint and fix
pnpm lint

# Format code
pnpm format
```

## Contributing

When adding new shared functionality:

1. **Types**: Add to `src/types/index.ts`
2. **Utilities**: Add to `src/utils/index.ts`
3. **Validation**: Add to `src/validation/index.ts`
4. **Tests**: Add corresponding test files
5. **Exports**: Update main `src/index.ts` if needed

### Guidelines

- Keep utilities framework-agnostic
- Provide comprehensive TypeScript types
- Include Zod schemas for validation
- Write tests for all new functionality
- Follow existing naming conventions
- Document complex functions with JSDoc

## License

This package is part of the ChatGPT Web project and follows the same license terms.
