# Development Workflow Guide

This guide covers the optimized development workflows for the ChatGPT Web monorepo.

## Quick Start

### Initial Setup

```bash
# Clone and setup the development environment
git clone <repository-url>
cd chatgpt-web
pnpm setup:dev  # Optimized setup script
```

### Daily Development

```bash
# Start all services (recommended)
pnpm dev

# Or start individual services
pnpm dev:web    # Frontend only (port 1002)
pnpm dev:api    # Backend only (port 3002)
```

## Development Commands

### Package Management

```bash
# Fast dependency installation
pnpm deps:install:fast

# Update dependencies
pnpm deps:update

# Deduplicate dependencies
pnpm deps:dedupe

# Audit dependencies
pnpm deps:audit
```

### Building

```bash
# Build all packages
pnpm build

# Incremental build (faster)
pnpm build:incremental

# Force rebuild (ignores cache)
pnpm build:force

# Build specific packages
pnpm build:web
pnpm build:api
pnpm build:shared
```

### Testing

```bash
# Run all tests
pnpm test

# Watch mode for all packages
pnpm test:watch

# Test only changed files
pnpm test:changed

# Test specific packages
pnpm test:web
pnpm test:api
pnpm test:shared
```

### Code Quality

```bash
# Lint all packages
pnpm lint

# Fix linting issues
pnpm lint:fix

# Lint only changed files
pnpm lint:changed

# Type checking
pnpm type-check

# Incremental type checking
pnpm type-check:incremental

# Full quality check
pnpm quality

# Fix all quality issues
pnpm quality:fix
```

## Cross-Package Development

### Hot Reloading

The monorepo is configured for efficient hot reloading across packages:

1. **Shared Package Changes**: Automatically rebuilds and triggers hot reload in consuming apps
2. **Config Changes**: Notifies dependent packages (may require restart)
3. **Cross-Package Imports**: TypeScript project references enable fast incremental builds

### Debugging

#### VS Code Debugging

Use the provided launch configurations:

- **Debug API Server**: Debug the backend service
- **Debug Web App (Chrome)**: Debug the frontend in Chrome
- **Debug Full Stack**: Debug both frontend and backend simultaneously

#### Command Line Debugging

```bash
# Debug API with inspector
pnpm debug:api

# Debug web with verbose output
pnpm debug:web
```

### Workspace Commands

```bash
# View dependency graph
pnpm workspace:graph

# Show workspace info
pnpm workspace:info

# Check why a package is installed
pnpm workspace:why <package-name>
```

## Performance Optimization

### Build Performance

```bash
# Analyze build performance
pnpm perf:build

# Analyze development performance
pnpm perf:dev

# Clean build cache
pnpm clean:cache
```

### Development Performance

- **Incremental Builds**: TypeScript project references enable fast rebuilds
- **Selective Testing**: Run tests only on changed packages
- **Efficient Watching**: Turborepo watches only relevant files per package
- **Dependency Hoisting**: PNPM optimizations reduce installation time

## Troubleshooting

### Common Issues

#### Build Failures

```bash
# Clean and rebuild everything
pnpm clean:all
pnpm setup:dev
```

#### Dependency Issues

```bash
# Check dependency conflicts
pnpm workspace:info

# Fix dependency resolution
pnpm deps:dedupe
pnpm install
```

#### TypeScript Issues

```bash
# Clear TypeScript cache
rm -rf */tsconfig.tsbuildinfo
pnpm type-check
```

#### Hot Reload Not Working

```bash
# Force restart all services
pnpm dev:force

# Rebuild shared package
pnpm build:shared
pnpm dev
```

### Performance Issues

#### Slow Builds

```bash
# Use incremental builds
pnpm build:incremental

# Check build cache
pnpm clean:cache
pnpm build
```

#### Slow Development Server

```bash
# Use individual services
pnpm dev:web  # Frontend only
pnpm dev:api  # Backend only

# Check for port conflicts
lsof -i :1002  # Frontend port
lsof -i :3002  # Backend port
```

## VS Code Integration

### Recommended Extensions

- ESLint
- Prettier
- Vue Language Features (Volar)
- TypeScript Importer
- Turbo Console Log

### Workspace Settings

The workspace is pre-configured with:

- Automatic formatting on save
- ESLint integration
- TypeScript optimizations
- Debugging configurations
- Task definitions

### Tasks

Use Ctrl+Shift+P → "Tasks: Run Task" to access:

- Install Dependencies (Fast)
- Dev: Start All Services
- Build: All Packages
- Test: All Packages
- Lint: All Packages
- Clean: All Build Outputs

## Advanced Workflows

### Cross-Package Development

When working on features that span multiple packages:

1. Start with shared package changes
2. Build shared package: `pnpm build:shared`
3. Start development servers: `pnpm dev`
4. Changes in shared package will trigger automatic rebuilds

### Testing Across Packages

```bash
# Test all packages
pnpm test

# Test with coverage
pnpm test --coverage

# Test specific functionality across packages
pnpm test --grep "authentication"
```

### Deployment Preparation

```bash
# Full quality check
pnpm quality

# Build for production
pnpm build

# Validate deployment readiness
pnpm deps:validate
```

## Environment Variables

### Development

Create `.env` files in each package as needed:

- `apps/web/.env` - Frontend environment variables
- `apps/api/.env` - Backend environment variables

### Production

Ensure all required environment variables are set:

- `OPENAI_API_KEY` - OpenAI API key
- `AI_PROVIDER` - AI provider (openai/azure)
- `NODE_ENV=production` - Production mode

## Monitoring and Debugging

### Workspace Monitoring

```bash
# Monitor cross-package changes
pnpm watch:workspace
```

### Performance Monitoring

```bash
# Build performance analysis
pnpm perf:build

# Development performance analysis
pnpm perf:dev
```

### Dependency Analysis

```bash
# Validate dependencies
pnpm deps:validate

# Optimize dependencies
pnpm deps:optimize
```

This workflow guide ensures efficient development across the monorepo with optimized build times, hot reloading, and comprehensive debugging support.
