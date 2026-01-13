# Development Workflow

This guide covers the day-to-day development workflow for the ChatGPT Web monorepo.

## Daily Development Process

### 1. Starting Development

```bash
# Pull latest changes
git pull origin main

# Install any new dependencies
pnpm install

# Start development servers (recommended)
pnpm dev:core
```

### Development Commands

The project provides several development commands for different scenarios:

```bash
# Start both frontend and backend (recommended for development)
pnpm dev:core

# Start all services including documentation
pnpm dev

# Start only frontend (port 1002)
pnpm dev:web

# Start only backend (port 3002)
pnpm dev:api
```

**Command Usage Guidelines:**

- **`pnpm dev:core`** - **Recommended for daily development**
  - Starts only essential frontend and backend services
  - Faster startup time
  - Cleaner console output
  - No unnecessary documentation server

- **`pnpm dev`** - **For full development environment**
  - Starts all services including documentation server
  - Use when you need to access documentation at http://localhost:8080
  - May have more verbose console output due to multiple services

- **Individual commands** - **For debugging and focused development**
  - `pnpm dev:web` - Frontend only development
  - `pnpm dev:api` - Backend only development

### Service Ports

- **Frontend Web Interface**: http://localhost:1002
- **Backend API Service**: http://localhost:3002
- **Documentation Server**: http://localhost:8080 (only with `pnpm dev`)

### 2. Making Changes

#### Frontend Development (apps/web)

```bash
# Work on frontend only
pnpm dev:web

# Run frontend tests
pnpm --filter @chatgpt-web/web test

# Build frontend
pnpm --filter @chatgpt-web/web build
```

#### Backend Development (apps/api)

```bash
# Work on backend only
pnpm dev:api

# Run backend tests
pnpm --filter @chatgpt-web/api test

# Build backend
pnpm --filter @chatgpt-web/api build
```

#### Shared Package Development (packages/shared)

```bash
# Build shared package
pnpm --filter @chatgpt-web/shared build

# Test shared package
pnpm --filter @chatgpt-web/shared test

# Watch mode for shared package
pnpm --filter @chatgpt-web/shared dev
```

### 3. Code Quality Checks

Before committing, run quality checks:

```bash
# Type checking
pnpm type-check

# Linting
pnpm lint

# Fix linting issues
pnpm lint:fix

# Run all tests
pnpm test
```

### 4. Committing Changes

Follow conventional commit format:

```bash
# Stage changes
git add .

# Commit with conventional format
git commit -m "feat(api): add reasoning model support"

# Push changes
git push origin feature-branch
```

## Monorepo Workflow

### Working with Multiple Packages

#### Cross-Package Development

When working on features that span multiple packages:

1. **Start with shared package changes:**

   ```bash
   # Make changes to packages/shared
   pnpm --filter @chatgpt-web/shared build
   ```

2. **Update consuming packages:**

   ```bash
   # Frontend will automatically use updated shared package
   pnpm dev:web

   # Backend will automatically use updated shared package
   pnpm dev:api
   ```

3. **Test integration:**

   ```bash
   # Test all packages together
   pnpm test
   ```

#### Package Dependencies

Understanding the dependency flow:

```
apps/web     ──┐
               ├──► packages/shared
apps/api     ──┘

packages/config ──► All packages (dev dependency)
```

### Turborepo Integration

The monorepo uses Turborepo for efficient builds:

```bash
# Build with caching
pnpm build

# Force rebuild without cache
pnpm build --force

# Build specific package and its dependencies
pnpm --filter @chatgpt-web/web build
```

## Development Modes

### Hot Reloading

- **Frontend**: Vite provides instant hot reloading
- **Backend**: Nodemon restarts on file changes
- **Shared Package**: Changes trigger rebuilds in consuming packages

### Debug Mode

#### Frontend Debugging

```bash
# Start with debug mode
pnpm dev:web --debug

# Or use VS Code debugger
# See .vscode/launch.json for configuration
```

#### Backend Debugging

```bash
# Start with Node.js inspector
pnpm dev:api --inspect

# Or use VS Code debugger
# Attach to process on port 9229
```

### Testing Modes

```bash
# Run tests once
pnpm test

# Watch mode for development
pnpm test:watch

# Coverage report
pnpm test:coverage

# Specific package tests
pnpm --filter @chatgpt-web/api test
```

## Feature Development Workflow

### 1. Planning

Before starting a new feature:

1. Create or review the feature specification
2. Identify which packages will be affected
3. Plan the implementation order (usually: shared → backend → frontend)

### 2. Implementation Order

**Recommended order for cross-package features:**

1. **Shared Package** - Add types, utilities, validation schemas
2. **Backend Package** - Implement API endpoints and business logic
3. **Frontend Package** - Implement UI and integrate with backend
4. **Documentation** - Update relevant documentation

### 3. Testing Strategy

```bash
# Unit tests for individual packages
pnpm --filter @chatgpt-web/shared test
pnpm --filter @chatgpt-web/api test
pnpm --filter @chatgpt-web/web test

# Integration tests
pnpm test:integration

# End-to-end tests
pnpm test:e2e
```

## Code Organization

### File Structure Conventions

```
apps/web/src/
├── components/         # Vue components
├── composables/        # Vue composition functions
├── stores/            # Pinia stores
├── utils/             # Frontend-specific utilities
└── types/             # Frontend-specific types

apps/api/src/
├── routes/            # Express routes
├── middleware/        # Express middleware
├── services/          # Business logic
├── utils/             # Backend-specific utilities
└── types/             # Backend-specific types

packages/shared/src/
├── types/             # Shared TypeScript types
├── utils/             # Shared utilities
├── validation/        # Shared validation schemas
└── constants/         # Shared constants
```

### Import Conventions

```typescript
// Shared package imports
import { ChatMessage } from '@chatgpt-web/shared'
import { validateApiKey } from '@chatgpt-web/shared/utils'

// Relative imports within package
import { logger } from '../utils/logger'
import type { ApiResponse } from '../types'
```

## Environment Management

### Development Environment

```bash
# Backend development
cp apps/api/.env.example apps/api/.env.development

# Frontend development
cp apps/web/.env.example apps/web/.env.development
```

### Environment Switching

```bash
# Use specific environment
NODE_ENV=development pnpm dev

# Or set in .env files
echo "NODE_ENV=development" >> apps/api/.env
```

## Performance Optimization

### Build Performance

```bash
# Parallel builds (default)
pnpm build

# Check build times
pnpm build --verbose

# Analyze bundle size
pnpm --filter @chatgpt-web/web build:analyze
```

### Development Performance

```bash
# Skip type checking for faster builds
pnpm dev --skip-type-check

# Use specific port to avoid conflicts
pnpm dev:web --port 3000
```

## Troubleshooting Development Issues

### Common Issues

#### Port Conflicts

```bash
# Kill process on port
lsof -ti:3002 | xargs kill -9

# Use different port
pnpm dev:api --port 3003
```

#### Dependency Issues

```bash
# Clean install
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install

# Clear package caches
pnpm store prune
```

#### TypeScript Issues

```bash
# Check types across all packages
pnpm type-check

# Restart TypeScript server in VS Code
# Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
```

#### Build Issues

```bash
# Clean build
pnpm clean
pnpm build

# Force rebuild
pnpm build --force
```

## Git Workflow

### Branch Naming

```bash
# Feature branches
git checkout -b feature/add-reasoning-models

# Bug fix branches
git checkout -b fix/api-timeout-issue

# Documentation branches
git checkout -b docs/update-setup-guide
```

### Commit Messages

Follow conventional commits:

```bash
# Features
git commit -m "feat(api): add Azure OpenAI support"

# Bug fixes
git commit -m "fix(web): resolve chat input focus issue"

# Documentation
git commit -m "docs(setup): update environment configuration"

# Refactoring
git commit -m "refactor(shared): improve type definitions"
```

### Pull Request Process

1. Create feature branch
2. Make changes and commit
3. Run quality checks: `pnpm lint && pnpm type-check && pnpm test`
4. Push branch and create PR
5. Address review feedback
6. Merge after approval

## IDE Configuration

### VS Code Setup

Recommended extensions:

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "Vue.vscode-vue",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "bradlc.vscode-tailwindcss"
  ]
}
```

### Settings

```json
{
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

## Next Steps

- Review [Code Style Guide](./code-style.md) for coding standards
- Check [Testing Guide](./testing.md) for testing best practices
- See [Contributing Guide](./contributing.md) for contribution guidelines
