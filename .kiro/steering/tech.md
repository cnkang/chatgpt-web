# Technology Stack & Build System

## Core Technologies

### Frontend Stack

- **Vue.js 3.5+**: Composition API, reactive props destructuring, modern optimizations
- **TypeScript 5.9+**: Strict configuration with zero errors policy
- **Vite 7+**: Build system optimized for Node.js 24 with ESNext targets
- **Naive UI 2.43+**: Primary UI component library
- **Pinia 3+**: State management with modular store architecture
- **Vue Router 4+**: Client-side routing with lazy loading
- **Vue i18n 11+**: Internationalization support

### Backend Stack

- **Node.js 24+**: Required for native fetch, modern JS features, performance
- **Express.js 5+**: Web framework with enhanced security middleware
- **TypeScript 5.9+**: Strict type checking, zero errors
- **OpenAI SDK 6+**: Official OpenAI API v1 integration
- **Zod 4+**: Runtime type validation and schema parsing
- **Redis 5+**: Session storage and caching

### Development Tools

- **PNPM 10+**: Package manager (required)
- **ESLint 9+**: Code linting with @antfu/eslint-config, zero-warning policy
- **Prettier 3+**: Code formatting with consistent style
- **Vitest 4+**: Testing framework with Fast-check property testing
- **Husky 9+**: Git hooks for pre-commit validation

## Build System

### Frontend Build (Vite)

```bash
# Development
pnpm dev                 # Start dev server on port 1002

# Production Build
pnpm build              # Type check + build
pnpm build-only         # Build without type check
pnpm preview            # Preview production build
```

### Backend Build (tsup)

```bash
# Development
pnpm start              # Start with esno (development)
pnpm dev                # Watch mode with esno

# Production Build
pnpm build              # Build to ./build directory
pnpm prod               # Run production build
```

## Common Commands

### Project Setup

```bash
# Initial setup (root directory)
pnpm bootstrap          # Install deps + prepare husky

# Backend setup
cd service && pnpm install
```

### Development Workflow

```bash
# Start both services
pnpm dev                # Frontend (port 1002)
cd service && pnpm dev  # Backend (port 3002)

# Code quality
pnpm quality            # Run type-check + lint + format check
pnpm quality:fix        # Auto-fix lint + format + type-check
```

### Testing

```bash
# Backend tests only
cd service && pnpm test          # Run tests
cd service && pnpm test:watch    # Watch mode
cd service && pnpm test:ui       # Vitest UI
```

### Production Deployment

```bash
# Manual deployment
pnpm build                       # Build frontend
cd service && pnpm build         # Build backend
cd service && pnpm prod          # Run production server

# Docker deployment
docker build -t chatgpt-web .
docker run -p 3002:3002 --env OPENAI_API_KEY=sk-xxx chatgpt-web
```

## Environment Requirements

### Node.js Version

- **Required**: Node.js 24.0.0+
- **Package Manager**: PNPM 10.0.0+
- **Reason**: Native fetch, modern JS features, performance optimizations

### Environment Variables

```bash
# Required (service/.env)
OPENAI_API_KEY=sk-xxx                    # OpenAI API key
AI_PROVIDER=openai                       # or 'azure'

# Azure OpenAI (when AI_PROVIDER=azure)
AZURE_OPENAI_API_KEY=xxx
AZURE_OPENAI_ENDPOINT=https://xxx.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-4o-deployment

# Security & Performance
AUTH_SECRET_KEY=xxx                      # Access control
MAX_REQUEST_PER_HOUR=100                # Rate limiting
TIMEOUT_MS=60000                        # Request timeout
```

## Build Optimizations

### Frontend Optimizations

- **Target**: ESNext, Chrome 131+, Firefox 133+, Safari 18+
- **Code Splitting**: Manual chunks for Vue ecosystem, UI libraries, utilities
- **Tree Shaking**: Aggressive with manual pure functions
- **Bundle Analysis**: Optimized chunk sizes, asset inlining

### Backend Optimizations

- **Native Fetch**: No external HTTP libraries
- **Circuit Breaker**: Fault tolerance for external APIs
- **Retry Logic**: Exponential backoff for failed requests
- **Security**: Helmet, CORS, rate limiting, input validation

## Development Guidelines

### Code Quality Standards

- **Zero TypeScript Errors**: Strict configuration enforced
- **Zero ESLint Warnings**: All warnings treated as errors
- **Consistent Formatting**: Prettier with pre-commit hooks
- **Property Testing**: Fast-check for comprehensive validation

### Performance Targets

- **Frontend**: Route-based code splitting, lazy loading
- **Backend**: Connection pooling, response streaming
- **Build**: Optimized for modern browsers, minimal bundle size
