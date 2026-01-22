#!/usr/bin/env tsx

/**
 * Configuration Update Script
 *
 * This script automates the update of configuration files for the monorepo structure:
 * - Updates TypeScript configurations with project references
 * - Updates ESLint and Prettier configurations
 * - Updates build tool configurations
 * - Updates Docker and deployment configurations
 * - Updates Kiro steering documents
 * - Updates Serena memory files
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

interface ConfigUpdate {
  file: string
  updater: (content: string) => string
  description: string
}

class ConfigurationUpdater {
  private updates: ConfigUpdate[] = []
  private log: string[] = []

  constructor() {
    this.setupConfigUpdates()
  }

  async updateAll(): Promise<void> {
    console.log('🔧 Starting configuration updates...\n')

    for (const update of this.updates) {
      await this.applyUpdate(update)
    }

    console.log('\n✅ Configuration updates completed!')
    this.printSummary()
  }

  private setupConfigUpdates(): void {
    // TypeScript configurations
    this.updates.push({
      file: 'tsconfig.base.json',
      updater: this.updateBaseTsConfig.bind(this),
      description: 'Update base TypeScript configuration for monorepo',
    })

    this.updates.push({
      file: 'apps/web/tsconfig.json',
      updater: this.updateWebTsConfig.bind(this),
      description: 'Update web app TypeScript configuration',
    })

    this.updates.push({
      file: 'apps/api/tsconfig.json',
      updater: this.updateApiTsConfig.bind(this),
      description: 'Update API TypeScript configuration',
    })

    this.updates.push({
      file: 'packages/shared/tsconfig.json',
      updater: this.updateSharedTsConfig.bind(this),
      description: 'Create shared package TypeScript configuration',
    })

    // Build configurations
    this.updates.push({
      file: 'turbo.json',
      updater: this.updateTurboConfig.bind(this),
      description: 'Update Turborepo configuration',
    })

    this.updates.push({
      file: 'packages/shared/tsup.config.ts',
      updater: this.createSharedTsupConfig.bind(this),
      description: 'Create shared package build configuration',
    })

    // Package configurations
    this.updates.push({
      file: 'apps/web/vite.config.ts',
      updater: this.updateViteConfig.bind(this),
      description: 'Update Vite configuration for monorepo',
    })

    // ESLint configurations
    this.updates.push({
      file: 'packages/config/eslint.config.js',
      updater: this.createSharedEslintConfig.bind(this),
      description: 'Create shared ESLint configuration',
    })

    // Docker configuration
    this.updates.push({
      file: 'Dockerfile',
      updater: this.updateDockerfile.bind(this),
      description: 'Update Dockerfile for monorepo structure',
    })

    // Kiro steering documents
    this.updates.push({
      file: '.kiro/steering/structure.md',
      updater: this.updateKiroStructure.bind(this),
      description: 'Update Kiro structure guidance',
    })

    this.updates.push({
      file: '.kiro/steering/tech.md',
      updater: this.updateKiroTech.bind(this),
      description: 'Update Kiro tech guidance',
    })

    // Serena memory files
    this.updates.push({
      file: '.serena/memories/project_overview.md',
      updater: this.updateSerenaProjectOverview.bind(this),
      description: 'Update Serena project overview',
    })

    this.updates.push({
      file: '.serena/memories/architecture_patterns.md',
      updater: this.updateSerenaArchitecture.bind(this),
      description: 'Update Serena architecture patterns',
    })
  }

  private async applyUpdate(update: ConfigUpdate): Promise<void> {
    console.log(`📝 ${update.description}...`)

    try {
      let content = ''

      if (existsSync(update.file)) {
        content = readFileSync(update.file, 'utf8')
      }

      const updatedContent = update.updater(content)

      // Ensure directory exists
      mkdirSync(dirname(update.file), { recursive: true })

      writeFileSync(update.file, updatedContent)
      this.log.push(`✅ Updated: ${update.file}`)
    } catch (error) {
      this.log.push(`❌ Failed to update ${update.file}: ${error}`)
      console.error(`   Error: ${error}`)
    }
  }

  private updateBaseTsConfig(content: string): string {
    const config = {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'bundler',
        allowImportingTsExtensions: true,
        strict: true,
        noEmit: true,
        useDefineForClassFields: true,
        lib: ['ES2022', 'DOM', 'DOM.Iterable'],
        skipLibCheck: true,
        allowSyntheticDefaultImports: true,
        resolveJsonModule: true,
        isolatedModules: true,
        esModuleInterop: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noImplicitReturns: true,
        declaration: true,
        declarationMap: true,
        composite: true,
      },
      references: [{ path: './packages/shared' }, { path: './apps/web' }, { path: './apps/api' }],
    }

    return JSON.stringify(config, null, 2)
  }

  private updateWebTsConfig(content: string): string {
    const config = {
      extends: '../../tsconfig.base.json',
      compilerOptions: {
        baseUrl: '.',
        paths: {
          '@/*': ['./src/*'],
        },
        types: ['vite/client', 'node'],
      },
      include: ['src/**/*.ts', 'src/**/*.d.ts', 'src/**/*.tsx', 'src/**/*.vue'],
      references: [{ path: '../../packages/shared' }],
    }

    return JSON.stringify(config, null, 2)
  }

  private updateApiTsConfig(content: string): string {
    const config = {
      extends: '../../tsconfig.base.json',
      compilerOptions: {
        module: 'ESNext',
        target: 'ES2022',
        moduleResolution: 'node',
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
        outDir: './build',
        rootDir: './src',
        types: ['node'],
      },
      include: ['src/**/*.ts'],
      exclude: ['node_modules', 'build'],
      references: [{ path: '../../packages/shared' }],
    }

    return JSON.stringify(config, null, 2)
  }

  private updateSharedTsConfig(content: string): string {
    const config = {
      extends: '../../tsconfig.base.json',
      compilerOptions: {
        outDir: './dist',
        rootDir: './src',
        declaration: true,
        declarationMap: true,
        composite: true,
      },
      include: ['src/**/*.ts'],
      exclude: ['node_modules', 'dist'],
    }

    return JSON.stringify(config, null, 2)
  }

  private updateTurboConfig(content: string): string {
    const config = {
      $schema: 'https://turbo.build/schema.json',
      pipeline: {
        build: {
          dependsOn: ['^build'],
          outputs: ['dist/**', 'build/**', '.next/**'],
        },
        dev: {
          cache: false,
          persistent: true,
        },
        lint: {
          outputs: [],
        },
        test: {
          dependsOn: ['^build'],
          outputs: [],
        },
        'type-check': {
          dependsOn: ['^build'],
          outputs: [],
        },
        clean: {
          cache: false,
        },
      },
    }

    return JSON.stringify(config, null, 2)
  }

  private createSharedTsupConfig(content: string): string {
    return `import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  external: ['zod']
})
`
  }

  private updateViteConfig(content: string): string {
    // Update existing Vite config to work with monorepo
    let updatedContent = content

    // Add alias for shared package if not present
    if (!content.includes('@chatgpt-web/shared')) {
      updatedContent = content.replace(
        /resolve:\s*{([^}]*)}/,
        `resolve: {
          alias: {
            '@': resolve(__dirname, 'src'),
            '@chatgpt-web/shared': resolve(__dirname, '../../packages/shared/src')
          }
        }`,
      )
    }

    return (
      updatedContent ||
      `import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@chatgpt-web/shared': resolve(__dirname, '../../packages/shared/src')
    }
  },
  server: {
    port: 1002
  }
})
`
    )
  }

  private createSharedEslintConfig(content: string): string {
    return `import antfu from '@antfu/eslint-config'

export default antfu({
  vue: true,
  typescript: true,
  ignores: [
    'dist',
    'build',
    'node_modules',
    '*.d.ts'
  ],
  rules: {
    'no-console': 'warn',
    '@typescript-eslint/no-unused-vars': 'error',
    'vue/multi-word-component-names': 'off'
  }
})
`
  }

  private updateDockerfile(content: string): string {
    return `# Multi-stage build for monorepo
FROM node:24-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build stage
FROM base AS builder

# Copy source code
COPY . .

# Build all packages
RUN pnpm build

# Production stage
FROM node:24-alpine AS production

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy built application
COPY --from=builder /app/apps/api/build ./
COPY --from=builder /app/apps/api/package.json ./package.json

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

EXPOSE 3002

CMD ["node", "index.js"]
`
  }

  private updateKiroStructure(content: string): string {
    return `# Project Structure & Organization

## Monorepo Architecture

The ChatGPT Web project uses a modern monorepo architecture with PNPM workspaces and Turborepo for coordinated builds.

## Root Directory Layout

\`\`\`
chatgpt-web/
├── apps/
│   ├── web/                # Frontend Vue.js application
│   └── api/                # Backend Node.js service
├── packages/
│   ├── shared/             # Common utilities and types
│   ├── docs/               # Documentation and images
│   └── config/             # Shared configuration files
├── tools/
│   └── scripts/            # Build and migration scripts
├── public/                 # Static assets (favicon, PWA icons)
├── docker-compose/         # Docker deployment configuration
├── kubernetes/             # Kubernetes deployment manifests
├── .kiro/                  # Kiro IDE configuration and steering
├── .serena/                # Serena agent memories and cache
├── .husky/                 # Git hooks configuration
└── [config files]          # Root-level configuration files
\`\`\`

## Package Structure

### Frontend Application (\`apps/web/\`)

- **Location**: \`apps/web/\`
- **Package Name**: \`@chatgpt-web/web\`
- **Dependencies**: Vue.js 3.5+, Vite, TypeScript, Naive UI
- **Build Output**: \`apps/web/dist/\`

### Backend Service (\`apps/api/\`)

- **Location**: \`apps/api/\`
- **Package Name**: \`@chatgpt-web/api\`
- **Dependencies**: Node.js 24+, Express.js 5+, TypeScript
- **Build Output**: \`apps/api/build/\`

### Shared Package (\`packages/shared/\`)

- **Location**: \`packages/shared/\`
- **Package Name**: \`@chatgpt-web/shared\`
- **Exports**: Common types, utilities, validation schemas
- **Build Output**: \`packages/shared/dist/\`

### Documentation Package (\`packages/docs/\`)

- **Location**: \`packages/docs/\`
- **Package Name**: \`@chatgpt-web/docs\`
- **Contents**: All project documentation, guides, API docs

### Configuration Package (\`packages/config/\`)

- **Location**: \`packages/config/\`
- **Package Name**: \`@chatgpt-web/config\`
- **Exports**: Shared ESLint, Prettier, TypeScript configurations

## Development Workflow

### Monorepo Commands

\`\`\`bash
# Install all dependencies
pnpm install

# Start all services in development mode
pnpm dev

# Build all packages
pnpm build

# Run tests across all packages
pnpm test

# Lint all packages
pnpm lint

# Type check all packages
pnpm type-check
\`\`\`

### Package-Specific Commands

\`\`\`bash
# Frontend development
pnpm --filter @chatgpt-web/web dev

# Backend development  
pnpm --filter @chatgpt-web/api dev

# Build shared package
pnpm --filter @chatgpt-web/shared build
\`\`\`

## Import Conventions

### Shared Package Imports

\`\`\`typescript
// Import from shared package
import { ChatMessage, ApiResponse } from '@chatgpt-web/shared'
import { validateApiKey } from '@chatgpt-web/shared'
\`\`\`

### Internal Package Imports

\`\`\`typescript
// Frontend internal imports
import { useChat } from '@/hooks/useChat'
import { ChatComponent } from '@/components/Chat'

// Backend internal imports
import { logger } from './utils/logger.js'
import type { ChatMessage } from './types.js'
\`\`\`

## Key Architectural Principles

1. **Package Separation**: Clear boundaries between frontend, backend, and shared code
2. **Dependency Management**: PNPM workspaces with workspace protocol for internal dependencies
3. **Build Coordination**: Turborepo orchestrates builds with proper dependency ordering
4. **Type Safety**: Shared TypeScript types ensure consistency across packages
5. **Configuration Consistency**: Shared configuration files maintain consistency
6. **Documentation Centralization**: All documentation organized in packages/docs
`
  }

  private updateKiroTech(content: string): string {
    return `# Technology Stack & Build System

## Monorepo Architecture

The project uses a modern monorepo architecture with:
- **PNPM Workspaces**: Package management and dependency resolution
- **Turborepo**: Build orchestration and caching
- **TypeScript Project References**: Fast incremental builds

## Core Technologies

### Frontend Stack (\`apps/web\`)

- **Vue.js 3.5+**: Composition API, reactive props destructuring
- **TypeScript 5.9+**: Strict configuration with zero errors policy
- **Vite 7+**: Build system optimized for Node.js 24
- **Naive UI 2.43+**: Primary UI component library
- **Pinia 3+**: State management with modular stores

### Backend Stack (\`apps/api\`)

- **Node.js 24+**: Required for native fetch and modern JS features
- **Express.js 5+**: Web framework with enhanced security
- **TypeScript 5.9+**: Strict type checking, zero errors
- **OpenAI SDK 6+**: Official OpenAI API integration

### Shared Package (\`packages/shared\`)

- **Zod 4+**: Runtime type validation and schema parsing
- **Framework-agnostic utilities**: Common helpers and types
- **Tree-shakeable exports**: Optimized for bundle size

## Monorepo Build System

### Turborepo Pipeline

\`\`\`bash
# Build all packages in dependency order
pnpm build                      # shared → api → web

# Development mode for all packages
pnpm dev                        # All services in parallel

# Run tests across all packages
pnpm test                       # Tests in all packages

# Lint all packages
pnpm lint                       # ESLint across monorepo

# Type check all packages
pnpm type-check                 # TypeScript validation
\`\`\`

### Package-Specific Commands

\`\`\`bash
# Frontend (apps/web)
pnpm --filter @chatgpt-web/web dev         # Start web dev server
pnpm --filter @chatgpt-web/web build       # Build web app
pnpm --filter @chatgpt-web/web preview     # Preview web build

# Backend (apps/api)
pnpm --filter @chatgpt-web/api dev         # Start API dev server
pnpm --filter @chatgpt-web/api build       # Build API
pnpm --filter @chatgpt-web/api test        # Run API tests

# Shared package (packages/shared)
pnpm --filter @chatgpt-web/shared build    # Build shared utilities
pnpm --filter @chatgpt-web/shared test     # Test shared utilities
\`\`\`

## Development Workflow

### Cross-Package Development

\`\`\`bash
# When modifying shared package
1. cd packages/shared
2. Make changes to types/utilities
3. pnpm build                    # Build shared package
4. pnpm dev                      # Start all services (auto-rebuilds)

# Adding new shared utilities
1. Add to packages/shared/src/
2. Export from packages/shared/src/index.ts
3. Import in apps: import { utility } from '@chatgpt-web/shared'
\`\`\`

### Dependency Management

\`\`\`bash
# Add dependency to specific package
pnpm --filter @chatgpt-web/web add vue-router
pnpm --filter @chatgpt-web/api add express

# Add shared dependency to root (dev tools)
pnpm add -D eslint prettier typescript

# Update workspace dependencies
pnpm --filter @chatgpt-web/web add @chatgpt-web/shared@workspace:*
\`\`\`

## Build Optimizations

### TypeScript Project References

- **Incremental Builds**: Only rebuild changed packages
- **Fast Type Checking**: Parallel type checking across packages
- **Dependency Ordering**: Shared packages built before consumers

### Turborepo Caching

- **Build Caching**: Reuse build outputs when inputs haven't changed
- **Remote Caching**: Share cache across team members (optional)
- **Parallel Execution**: Build independent packages in parallel

## Environment Requirements

### Node.js Version

- **Required**: Node.js 24.0.0+
- **Package Manager**: PNPM 10.0.0+
- **Reason**: Native fetch, modern JS features, performance

### Environment Variables

\`\`\`bash
# Backend (apps/api/.env)
OPENAI_API_KEY=sk-xxx                    # OpenAI API key
AI_PROVIDER=openai                       # or 'azure'

# Azure OpenAI (when AI_PROVIDER=azure)
AZURE_OPENAI_API_KEY=xxx
AZURE_OPENAI_ENDPOINT=https://xxx.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-4o-deployment
\`\`\`

## Troubleshooting

### Common Monorepo Issues

\`\`\`bash
# Clean all build outputs
pnpm clean                      # Removes all dist/build directories
pnpm install                    # Reinstall dependencies
pnpm build                      # Rebuild all packages

# Dependency resolution issues
rm -rf node_modules */node_modules
pnpm install                    # Fresh install

# TypeScript issues
rm -rf */tsconfig.tsbuildinfo
pnpm --filter @chatgpt-web/shared build    # Build dependencies first
pnpm type-check                             # Then check types
\`\`\`

### Hot Reload Issues

- **Shared Package Changes**: Automatically trigger rebuilds in consuming apps
- **Cross-Package Imports**: TypeScript project references enable fast incremental builds
- **Development Servers**: All services start in parallel with dependency watching
`
  }

  private updateSerenaProjectOverview(content: string): string {
    return `# ChatGPT Web - Monorepo Project Overview

## Architecture

This is a modern monorepo project using PNPM workspaces and Turborepo for coordinated builds. The project is organized into logical packages with clear separation of concerns.

## Package Structure

### Applications (\`apps/\`)

- **\`apps/web\`** (\`@chatgpt-web/web\`)
  - Vue.js 3.5+ frontend application
  - Vite build system with Node.js 24 optimizations
  - TypeScript with strict configuration
  - Naive UI component library
  - Port: 1002 (development)

- **\`apps/api\`** (\`@chatgpt-web/api\`)
  - Node.js 24+ Express.js backend service
  - OpenAI and Azure OpenAI integration
  - TypeScript with strict type checking
  - Port: 3002 (development and production)

### Packages (\`packages/\`)

- **\`packages/shared\`** (\`@chatgpt-web/shared\`)
  - Common TypeScript types and interfaces
  - Framework-agnostic utility functions
  - Zod validation schemas
  - Tree-shakeable exports

- **\`packages/docs\`** (\`@chatgpt-web/docs\`)
  - Centralized documentation
  - API documentation and guides
  - Setup and deployment instructions

- **\`packages/config\`** (\`@chatgpt-web/config\`)
  - Shared ESLint configuration
  - Shared Prettier configuration
  - Base TypeScript configuration

### Tools (\`tools/\`)

- **\`tools/scripts\`**
  - Migration and build automation scripts
  - Dependency validation utilities
  - Development workflow helpers

## Technology Stack

### Core Technologies
- **Node.js 24+**: Required for native fetch and modern features
- **PNPM 10+**: Package manager with workspace support
- **TypeScript 5.9+**: Strict type checking across all packages
- **Turborepo 2+**: Build orchestration and caching

### Frontend
- **Vue.js 3.5+**: Composition API with modern optimizations
- **Vite 7+**: Fast build system and dev server
- **Naive UI 2.43+**: Primary UI component library
- **Pinia 3+**: State management

### Backend
- **Express.js 5+**: Web framework with enhanced security
- **OpenAI SDK 6+**: Official OpenAI API integration
- **Zod 4+**: Runtime type validation

## Development Workflow

### Common Commands

\`\`\`bash
# Install all dependencies
pnpm install

# Start all services (web + api)
pnpm dev

# Build all packages
pnpm build

# Run tests across all packages
pnpm test

# Lint all packages
pnpm lint

# Type check all packages
pnpm type-check
\`\`\`

### Package-Specific Commands

\`\`\`bash
# Work on specific packages
pnpm --filter @chatgpt-web/web dev
pnpm --filter @chatgpt-web/api dev
pnpm --filter @chatgpt-web/shared build

# Add dependencies to specific packages
pnpm --filter @chatgpt-web/web add vue-router
pnpm --filter @chatgpt-web/api add express-rate-limit
\`\`\`

## Key Features

### Monorepo Benefits
- **Code Sharing**: Common types and utilities in \`packages/shared\`
- **Coordinated Builds**: Turborepo ensures proper build order
- **Consistent Tooling**: Shared configurations across all packages
- **Type Safety**: Shared TypeScript types prevent inconsistencies

### Development Experience
- **Hot Reload**: Cross-package changes trigger automatic rebuilds
- **Fast Builds**: TypeScript project references enable incremental builds
- **Parallel Development**: Work on multiple packages simultaneously
- **Unified Testing**: Run tests across all packages with single command

## Import Patterns

### Shared Package Imports
\`\`\`typescript
import { ChatMessage, ApiResponse } from '@chatgpt-web/shared'
import { validateApiKey, formatTimestamp } from '@chatgpt-web/shared'
\`\`\`

### Internal Package Imports
\`\`\`typescript
// Frontend
import { useChat } from '@/hooks/useChat'
import { ChatComponent } from '@/components/Chat'

// Backend
import { logger } from './utils/logger.js'
import type { ChatMessage } from './types.js'
\`\`\`

## Build System

### Turborepo Pipeline
- **Build Order**: \`shared\` → \`api\` → \`web\`
- **Caching**: Reuse build outputs when inputs unchanged
- **Parallel Execution**: Independent packages build simultaneously

### TypeScript Configuration
- **Project References**: Fast incremental compilation
- **Strict Mode**: Zero errors policy across all packages
- **Shared Base Config**: Consistent compiler options

## Deployment

### Docker
- Multi-stage build optimized for monorepo
- Builds all packages in correct dependency order
- Production image contains only necessary files

### Environment Variables
- **API**: OpenAI API key, provider configuration
- **Web**: Build-time configuration for API endpoints
- **Shared**: Common environment validation

This monorepo architecture provides a scalable, maintainable foundation for the ChatGPT Web application while enabling efficient development workflows and consistent code quality.
`
  }

  private updateSerenaArchitecture(content: string): string {
    return `# Architecture Patterns - Monorepo Edition

## Monorepo Architecture Pattern

The ChatGPT Web project follows a modern monorepo architecture pattern that provides:

### Package Separation Pattern
- **Applications**: Deployable services in \`apps/\` directory
- **Libraries**: Reusable packages in \`packages/\` directory  
- **Tools**: Build and development utilities in \`tools/\` directory

### Dependency Management Pattern
- **Workspace Protocol**: Internal dependencies use \`workspace:*\`
- **Hoisting**: Shared dependencies managed at root level
- **Isolation**: Package-specific dependencies in respective package.json

## Frontend Architecture (\`apps/web\`)

### Component Architecture
- **Atomic Design**: Components organized by complexity level
- **Feature-Based**: Related components grouped by functionality
- **Shared Components**: Reusable UI components in \`common/\`

### State Management Pattern
- **Pinia Stores**: Modular state management
- **Feature Stores**: Domain-specific state modules
- **Shared State**: Cross-feature state in shared stores

### Build Pattern
- **Vite**: Fast development and optimized production builds
- **Code Splitting**: Route-based and manual chunk splitting
- **Tree Shaking**: Eliminate unused code from bundles

## Backend Architecture (\`apps/api\`)

### Service Layer Pattern
- **Provider Pattern**: Abstracted AI service implementations
- **Middleware Pattern**: Composable request processing
- **Factory Pattern**: Dynamic provider instantiation

### Security Pattern
- **Defense in Depth**: Multiple security layers
- **Input Validation**: Zod schemas for request validation
- **Rate Limiting**: Per-endpoint and global rate limits

### Error Handling Pattern
- **Centralized**: Global error handler middleware
- **Typed Errors**: Structured error responses
- **Logging**: Comprehensive error logging and monitoring

## Shared Package Architecture (\`packages/shared\`)

### Export Pattern
- **Barrel Exports**: Single entry point with re-exports
- **Tree Shakeable**: Individual function exports
- **Type-Only Exports**: Separate type and runtime exports

### Validation Pattern
- **Zod Schemas**: Runtime type validation
- **Shared Schemas**: Common validation across frontend/backend
- **Type Generation**: TypeScript types from Zod schemas

### Utility Pattern
- **Framework Agnostic**: No framework-specific dependencies
- **Pure Functions**: Stateless, predictable utilities
- **Composable**: Small, focused utility functions

## Build System Architecture

### Turborepo Pattern
- **Pipeline Definition**: Declarative build orchestration
- **Dependency Graph**: Automatic build order resolution
- **Caching Strategy**: Intelligent build result caching

### TypeScript Project References
- **Incremental Builds**: Only rebuild changed projects
- **Type Checking**: Parallel type checking across packages
- **Composite Projects**: Enable project references

## Development Workflow Patterns

### Hot Reload Pattern
- **Cross-Package**: Changes in shared trigger rebuilds
- **Dependency Watching**: Monitor package dependencies
- **Fast Refresh**: Preserve component state during updates

### Testing Pattern
- **Package-Level**: Tests co-located with source code
- **Shared Utilities**: Common test helpers in shared package
- **Property-Based**: Comprehensive input validation testing

### Linting Pattern
- **Shared Configuration**: Consistent rules across packages
- **Package-Specific**: Override rules for specific needs
- **Pre-commit Hooks**: Automated quality checks

## Deployment Architecture

### Container Pattern
- **Multi-Stage**: Separate build and runtime stages
- **Layer Optimization**: Minimize image size and layers
- **Monorepo Aware**: Copy only necessary packages

### Environment Pattern
- **Package-Specific**: Environment variables per package
- **Shared Configuration**: Common environment validation
- **Runtime Configuration**: Dynamic configuration loading

## Data Flow Patterns

### Request Flow (API)
1. **Middleware**: Authentication, validation, rate limiting
2. **Controller**: Route handling and business logic
3. **Service**: Provider abstraction and external API calls
4. **Response**: Structured response formatting

### State Flow (Frontend)
1. **Component**: User interaction triggers action
2. **Store**: State mutation through Pinia actions
3. **API**: HTTP requests to backend services
4. **Update**: Reactive state updates trigger re-renders

### Type Flow (Shared)
1. **Definition**: Types defined in shared package
2. **Export**: Barrel exports from shared/index.ts
3. **Import**: Packages import shared types
4. **Validation**: Runtime validation with Zod schemas

## Configuration Patterns

### Shared Configuration
- **Base Configs**: Common TypeScript, ESLint, Prettier
- **Extension**: Package-specific configuration extends base
- **Override**: Package-level overrides for specific needs

### Build Configuration
- **Turborepo**: Pipeline and caching configuration
- **Package Tools**: Vite, tsup, vitest configurations
- **Environment**: Development vs production settings

## Security Patterns

### Input Validation
- **Schema Validation**: Zod schemas for all inputs
- **Sanitization**: Clean and normalize input data
- **Type Safety**: TypeScript prevents type-related vulnerabilities

### API Security
- **Authentication**: Token-based authentication
- **Authorization**: Role-based access control
- **Rate Limiting**: Prevent abuse and DoS attacks

### Build Security
- **Dependency Scanning**: Automated vulnerability detection
- **Secure Defaults**: Security-first configuration
- **Minimal Surface**: Reduce attack surface area

This architecture provides a robust, scalable foundation that enables:
- **Independent Development**: Teams can work on different packages
- **Shared Code Reuse**: Common utilities prevent duplication
- **Consistent Quality**: Shared tooling ensures consistency
- **Efficient Builds**: Optimized build pipeline with caching
- **Type Safety**: End-to-end type safety across packages
`
  }

  private printSummary(): void {
    console.log('\n📋 Configuration Update Summary:')
    for (const logEntry of this.log) {
      console.log(`   ${logEntry}`)
    }
  }
}

// CLI interface
async function main() {
  const updater = new ConfigurationUpdater()

  try {
    await updater.updateAll()
  } catch (error) {
    console.error('\n💥 Configuration update failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main().catch(console.error)
}

export { ConfigurationUpdater }
