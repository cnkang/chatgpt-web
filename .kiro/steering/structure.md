# Project Structure & Organization

## Root Directory Layout

```
chatgpt-web/
├── src/                    # Frontend Vue.js application
├── service/                # Backend Node.js service
├── public/                 # Static assets (favicon, PWA icons)
├── docs/                   # Documentation and images
├── docker-compose/         # Docker deployment configuration
├── kubernetes/             # Kubernetes deployment manifests
├── dist/                   # Frontend build output (generated)
├── .kiro/                  # Kiro IDE configuration and steering
├── .serena/                # Serena agent memories and cache
├── .husky/                 # Git hooks configuration
└── [config files]          # Root-level configuration files
```

## Frontend Structure (`src/`)

### Component Organization

```
src/components/
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
src/
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

## Backend Structure (`service/src/`)

### Service Architecture

```
service/src/
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

- `package.json` - Frontend dependencies and scripts
- `vite.config.ts` - Vite build configuration with Node.js 24 optimizations
- `tsconfig.json` - TypeScript configuration for frontend
- `tailwind.config.js` - Tailwind CSS configuration
- `eslint.config.js` - ESLint configuration with @antfu/eslint-config
- `.prettierrc` - Prettier formatting rules
- `.env` - Environment variables (create from .env.example)

### Service Configuration

- `service/package.json` - Backend dependencies and scripts
- `service/tsconfig.json` - TypeScript configuration for backend
- `service/tsup.config.ts` - Build configuration for backend
- `service/vitest.config.ts` - Test configuration
- `service/.env` - Backend environment variables

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
// Use @ alias for src imports
import { useChat } from '@/hooks/useChat'
import { ChatMessage } from '@/components/chat/Message'
```

### Backend Imports

```typescript
// Use relative imports with .js extension (ESM)
import { logger } from './utils/logger.js'
import type { ChatMessage } from './chatgpt/types.js'
```

## Asset Organization

### Static Assets (`public/`)

- `favicon.ico` / `favicon.svg` - Site icons
- `pwa-*.png` - Progressive Web App icons

### Source Assets (`src/assets/`)

- `avatar.jpg` - Default user avatar
- `recommend.json` - Recommended prompts data

## Build Output Structure

### Frontend Build (`dist/`)

```
dist/
├── js/                   # JavaScript bundles with hash names
├── css/                  # CSS files with hash names
├── img/                  # Optimized images
├── fonts/                # Web fonts
└── index.html            # Main HTML file
```

### Backend Build (`service/build/`)

```
build/
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
