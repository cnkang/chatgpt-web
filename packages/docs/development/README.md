# Development Documentation

This directory contains guides and references for developing with the ChatGPT Web monorepo.

## Available Guides

- **[Development Workflow](./workflow.md)** - Day-to-day development processes
- **[Code Style Guide](./code-style.md)** - Coding standards and conventions
- **[Testing Guide](./testing.md)** - Testing strategies and best practices
- **[Contributing Guide](./contributing.md)** - How to contribute to the project
- **[Troubleshooting](./troubleshooting.md)** - Common issues and solutions

## Quick Reference

### Common Commands

```bash
# Development
pnpm dev                # Start all packages
pnpm dev:core           # Start frontend + backend only (recommended)
pnpm dev:web            # Start frontend only
pnpm dev:api            # Start backend only

# Building
pnpm build              # Build all packages
pnpm build:web          # Build frontend only
pnpm build:api          # Build backend only

# Code Quality
pnpm lint               # Lint all code
pnpm lint:fix           # Fix linting issues
pnpm type-check         # TypeScript type checking
pnpm test               # Run tests
pnpm quality            # Run the full quality pipeline

# Target a single package (examples)
pnpm --filter @chatgpt-web/shared build
pnpm --filter @chatgpt-web/docs validate
```

### Project Structure

```
apps/
├── web/                # Vue.js frontend
└── api/                # Express.js backend

packages/
├── shared/             # Common utilities and types
├── docs/               # Documentation
└── config/             # Shared configuration
```

## Development Environment

- **Node.js 24+** - Required for modern features
- **PNPM 10+** - Package manager
- **TypeScript 5.9+** - Type safety
- **Vue.js 3.5+** - Frontend framework
- **Express.js 5+** - Backend framework

## Getting Started

1. Follow the [Setup Guide](../setup/monorepo-setup.md)
2. Review the [Development Workflow](./workflow.md)
3. Check the [Code Style Guide](./code-style.md)
4. Start developing!
