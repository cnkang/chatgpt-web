# Monorepo Setup Guide

This guide walks you through setting up the ChatGPT Web monorepo from scratch.

## Prerequisites

Before starting, ensure you have:

- **Node.js 24+** - Required for modern JavaScript features and native fetch
- **PNPM 10+** - Package manager for monorepo workspace management
- **Git** - Version control
- **OpenAI API Key** - Official OpenAI API access

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/chatgpt-web.git
cd chatgpt-web
```

### 2. Install Dependencies

Install all workspace dependencies:

```bash
pnpm install
```

This will install dependencies for all packages in the monorepo.

### 3. Environment Configuration

#### Backend Configuration

Create the backend environment file:

```bash
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env` with your configuration:

```bash
# Required: OpenAI API Key
OPENAI_API_KEY=sk-your_official_api_key_here

# Optional: Provider Selection
AI_PROVIDER=openai  # or 'azure'

# Optional: API Configuration
OPENAI_API_MODEL=gpt-4o
OPENAI_API_BASE_URL=https://api.openai.com

# Optional: Security
AUTH_SECRET_KEY=your_secret_key
MAX_REQUEST_PER_HOUR=100

# Optional: Performance
TIMEOUT_MS=60000
RETRY_MAX_ATTEMPTS=3
```

#### Frontend Configuration

Create the frontend environment file:

```bash
cp apps/web/.env.example apps/web/.env
```

Edit `apps/web/.env`:

```bash
# API endpoint (adjust if needed)
VITE_GLOB_API_URL=http://localhost:3002

# Optional: PWA settings
VITE_GLOB_APP_PWA=false
```

### 4. Build Shared Packages

Build shared packages first:

```bash
pnpm build:shared
```

### 5. Development Mode

Start services in development mode:

```bash
# Recommended: Start core services only (frontend + backend)
pnpm dev:core

# Alternative: Start all services including documentation
pnpm dev

# Individual services
pnpm dev:web    # Frontend only
pnpm dev:api    # Backend only
```

**Development Command Guide:**

- **`pnpm dev:core`** - **Recommended for daily development**
  - Starts frontend (port 1002) and backend (port 3002)
  - Faster startup and cleaner console output
  - No documentation server

- **`pnpm dev`** - **Full development environment**
  - Starts all services including documentation server (port 8080)
  - Use when you need access to documentation

This will start:

- Frontend development server on http://localhost:1002
- Backend API server on http://localhost:3002
- Documentation server on http://localhost:8080 (with `pnpm dev` only)

### 6. Production Build

Build all packages for production:

```bash
pnpm build
```

## Workspace Structure

```
chatgpt-web/
├── apps/
│   ├── web/                    # Vue.js frontend application
│   └── api/                    # Express.js backend service
├── packages/
│   ├── shared/                 # Common utilities and types
│   ├── docs/                   # Documentation package
│   └── config/                 # Shared configuration files
├── tools/
│   └── scripts/                # Build and migration scripts
├── pnpm-workspace.yaml         # PNPM workspace configuration
├── package.json                # Root package with workspace scripts
├── turbo.json                  # Turborepo pipeline configuration
└── tsconfig.base.json          # Base TypeScript configuration
```

## Available Scripts

### Root Level Scripts

```bash
# Development
pnpm dev                 # Start all services in development mode
pnpm dev:core           # Start core services only (frontend + backend) - Recommended
pnpm dev:web            # Start only frontend
pnpm dev:api            # Start only backend

# Building
pnpm build              # Build all packages
pnpm build:shared       # Build only shared packages
pnpm build:web          # Build only frontend
pnpm build:api          # Build only backend

# Testing
pnpm test               # Run all tests
pnpm test:web           # Test frontend only
pnpm test:api           # Test backend only

# Code Quality
pnpm lint               # Lint all packages
pnpm lint:fix           # Fix linting issues
pnpm type-check         # TypeScript type checking
```

### Package-Specific Scripts

Run commands in specific packages:

```bash
# Frontend (apps/web)
pnpm --filter @chatgpt-web/web dev
pnpm --filter @chatgpt-web/web build

# Backend (apps/api)
pnpm --filter @chatgpt-web/api dev
pnpm --filter @chatgpt-web/api build

# Shared package
pnpm --filter @chatgpt-web/shared build
```

## Verification

### 1. Check Services

Verify services are running:

```bash
# Frontend should be accessible
curl http://localhost:1002

# Backend API should respond
curl http://localhost:3002/api/config
```

### 2. Test Chat Functionality

1. Open http://localhost:1002 in your browser
2. Enter a test message
3. Verify you receive a response from the AI

### 3. Check Build Output

Verify production builds work:

```bash
pnpm build

# Check build outputs
ls -la apps/web/dist/
ls -la apps/api/build/
```

## Troubleshooting

### Common Issues

#### Node.js Version Error

```
Error: This application requires Node.js 24+
```

**Solution**: Install Node.js 24 using nvm:

```bash
nvm install 24
nvm use 24
```

#### PNPM Not Found

```
Command 'pnpm' not found
```

**Solution**: Install PNPM globally:

```bash
npm install -g pnpm@latest
```

#### API Key Issues

```
Error: Missing required configuration: OPENAI_API_KEY
```

**Solution**:

1. Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Add it to `apps/api/.env`

#### Port Already in Use

```
Error: Port 3002 is already in use
```

**Solution**: Kill the process using the port:

```bash
lsof -ti:3002 | xargs kill -9
```

#### TypeScript Errors

```
Error: Type checking failed
```

**Solution**: Run type checking to see specific errors:

```bash
pnpm type-check
```

### Getting Help

- Check the [Development Guide](../development/README.md) for development workflows
- See [Deployment Guide](../deployment/README.md) for production deployment
- Review [API Documentation](../api/README.md) for API details

## Next Steps

After successful setup:

1. Review the [Development Workflow](../development/workflow.md)
2. Explore the [Package Documentation](../packages/README.md)
3. Set up your [Deployment Environment](../deployment/README.md)

## Security Notes

- Never commit `.env` files to version control
- Use environment-specific API keys
- Enable authentication in production environments
- Regularly rotate API keys and secrets
