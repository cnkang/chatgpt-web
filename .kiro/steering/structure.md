# Project Structure & Organization

## Root Directory Layout

```
chatgpt-web/
├── apps/                   # Monorepo applications
│   ├── web/               # Frontend Vue.js application
│   └── api/               # Backend Node.js service
├── packages/              # Shared packages (if any)
├── tools/                 # Build tools and utilities
├── docs/                  # Documentation and images
├── docker-compose/        # Docker deployment configuration
├── kubernetes/            # Kubernetes deployment manifests
├── .kiro/                 # Kiro IDE configuration and steering
├── .serena/               # Serena agent memories and cache
├── .husky/                # Git hooks configuration
├── .turbo/                # Turborepo cache
├── turbo.json             # Turborepo configuration
├── pnpm-workspace.yaml    # PNPM workspace configuration
└── [config files]         # Root-level configuration files
```

## Frontend Structure (`apps/web/src/`)

### Component Organization

```
apps/web/src/components/
├── common/                 # Reusable UI components
│   ├── HoverButton/       # Button with hover effects
│   ├── LoadingSpinner/    # Loading indicators
│   ├── NaiveProvider/     # UI library provider wrapper
│   ├── PromptStore/       # Prompt management component
│   ├── Setting/           # Settings panels (About, Advanced, General)
│   ├── SvgIcon/           # SVG icon component
│   └── UserAvatar/        # User avatar display
├── custom/                # Project-specific components
│   └── GithubSite.vue     # GitHub integration component
└── reasoning/             # AI reasoning model components
    ├── ModelSelector/     # Model selection interface
    ├── ReasoningLoader/   # Loading states for reasoning
    └── ReasoningSteps/    # Step-by-step reasoning display
```

### Application Architecture

```
apps/web/src/
├── views/                 # Page-level components
│   ├── chat/             # Main chat interface
│   │   ├── components/   # Chat-specific components (Header, Message)
│   │   ├── hooks/        # Chat-specific composables
│   │   └── layout/       # Chat layout components
│   └── exception/        # Error pages (404, 500)
├── store/                # Pinia state management
│   └── modules/          # Feature-based store modules
│       ├── app/          # Global app state
│       ├── auth/         # Authentication state
│       ├── chat/         # Chat session state
│       ├── prompt/       # Prompt templates
│       ├── settings/     # User preferences
│       └── user/         # User profile data
├── router/               # Vue Router configuration
├── hooks/                # Reusable composition functions
├── utils/                # Utility functions and helpers
├── api/                  # API client and endpoints
├── locales/              # Internationalization files
├── styles/               # Global styles and themes
├── typings/              # TypeScript type definitions
└── plugins/              # Vue plugins and setup
```

## Backend Structure (`apps/api/src/`)

### Service Architecture

```
apps/api/src/
├── chatgpt/              # AI provider implementations
│   ├── index.ts          # Legacy OpenAI implementation
│   ├── provider-adapter.ts # Modern provider abstraction
│   └── types.ts          # ChatGPT-specific types
├── providers/            # AI service providers
│   ├── base.ts           # Abstract provider interface
│   ├── openai.ts         # OpenAI API implementation
│   ├── azure.ts          # Azure OpenAI implementation
│   ├── factory.ts        # Provider factory pattern
│   └── config.ts         # Provider configuration
├── middleware/           # Express middleware
│   ├── auth.ts           # Authentication middleware
│   ├── limiter.ts        # Rate limiting
│   ├── security.ts       # Security headers and validation
│   └── validation.ts     # Request validation and sanitization
├── security/             # Security utilities
│   ├── auth-validator.ts # Authentication validation
│   └── validator.ts      # Security validation logic
├── utils/                # Utility functions
│   ├── error-handler.ts  # Error handling and logging
│   ├── logger.ts         # Structured logging
│   ├── retry.ts          # Retry logic and circuit breaker
│   └── is.ts             # Type checking utilities
├── validation/           # Input validation schemas
│   ├── schemas.ts        # Zod validation schemas
│   └── cleanup-validator.ts # Configuration cleanup
├── config/               # Configuration management
│   └── validator.ts      # Environment validation
└── test/                 # Test utilities and integration tests
```

## Configuration Files

### Root Level Configuration

- `package.json` - Monorepo root dependencies and scripts
- `turbo.json` - Turborepo build pipeline configuration
- `pnpm-workspace.yaml` - PNPM workspace configuration
- `eslint.config.js` - ESLint configuration with @antfu/eslint-config
- `.prettierrc` - Prettier formatting rules
- `.env` - Environment variables (create from .env.example)

### Frontend Configuration (`apps/web/`)

- `package.json` - Frontend dependencies and scripts
- `vite.config.ts` - Vite build configuration with Node.js 24 optimizations
- `tsconfig.json` - TypeScript configuration for frontend
- `tailwind.config.js` - Tailwind CSS configuration
- `eslint.config.js` - Frontend-specific ESLint rules
- `.prettierrc` - Frontend-specific Prettier rules

### Backend Configuration (`apps/api/`)

- `package.json` - Backend dependencies and scripts
- `tsconfig.json` - TypeScript configuration for backend
- `tsup.config.ts` - Build configuration for backend
- `vitest.config.ts` - Test configuration
- `eslint.config.js` - Backend-specific ESLint rules
- `.env` - Backend environment variables (create from .env.example)

## File Naming Conventions

### Components

- **Vue Components**: PascalCase with `.vue` extension
- **Component Folders**: PascalCase matching component name
- **Index Files**: Always `index.vue` or `index.ts` for main exports

### TypeScript Files

- **Utilities**: camelCase (e.g., `errorHandler.ts`)
- **Types**: PascalCase or descriptive names (e.g., `types.ts`)
- **Configs**: descriptive names (e.g., `validator.ts`)

### Directories

- **Feature Directories**: camelCase (e.g., `chatgpt/`, `middleware/`)
- **Component Directories**: PascalCase (e.g., `HoverButton/`)

## Import Path Conventions

### Frontend Aliases

```typescript
// Use @ alias for src imports (in apps/web)
import { useChat } from '@/hooks/useChat'
import { ChatMessage } from '@/components/chat/Message'
```

### Backend Imports

```typescript
// Use relative imports with .js extension (ESM) (in apps/api)
import { logger } from './utils/logger.js'
import type { ChatMessage } from './chatgpt/types.js'
```

## Asset Organization

### Static Assets (`apps/web/public/`)

- `favicon.ico` / `favicon.svg` - Site icons
- `pwa-*.png` - Progressive Web App icons

### Source Assets (`apps/web/src/assets/`)

- `avatar.jpg` - Default user avatar
- `recommend.json` - Recommended prompts data

## Build Output Structure

### Frontend Build (`apps/web/dist/`)

```
apps/web/dist/
├── js/                   # JavaScript bundles with hash names
├── css/                  # CSS files with hash names
├── img/                  # Optimized images
├── fonts/                # Web fonts
└── index.html            # Main HTML file
```

### Backend Build (`apps/api/build/`)

```
apps/api/build/
├── index.js              # Main server entry point
├── [modules].js          # Compiled TypeScript modules
└── [assets]              # Any bundled assets
```

## Development Workflow Directories

### IDE Configuration (`.kiro/`)

- `steering/` - AI assistant guidance documents
- `settings/` - IDE-specific settings

### Agent Memory (`.serena/`)

- `memories/` - Persistent knowledge about the project
- `cache/` - Temporary analysis cache for TypeScript and Vue

## Key Architectural Principles

1. **Separation of Concerns**: Clear frontend/backend separation
2. **Feature-Based Organization**: Group related functionality together
3. **Modular Design**: Each module has clear responsibilities
4. **Type Safety**: Comprehensive TypeScript coverage
5. **Security First**: Dedicated security modules and validation
6. **Testability**: Clear separation for unit and integration testing
