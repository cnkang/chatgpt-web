# Troubleshooting Guide

This guide helps you diagnose and resolve common issues when developing or deploying ChatGPT Web.

## Development Issues

### Node.js and Dependencies

#### Node.js Version Issues

**Problem**: Build fails with Node.js version errors

```bash
Error: This package requires Node.js 24.0.0 or higher
```

**Solution**:

```bash
# Check current Node.js version
node --version

# Install Node.js 24 using nvm
nvm install 24.12.0
nvm use 24.12.0

# Or update .nvmrc and use
echo "24.12.0" > .nvmrc
nvm use
```

#### PNPM Issues

**Problem**: Package installation fails

```bash
ERR_PNPM_PEER_DEP_ISSUES
```

**Solution**:

```bash
# Clear PNPM cache
pnpm store prune

# Delete node_modules and lock file
rm -rf node_modules pnpm-lock.yaml

# Reinstall with strict peer dependencies disabled
echo "strict-peer-dependencies=false" > .pnpmrc
pnpm install
```

#### Dependency Conflicts

**Problem**: Conflicting dependency versions

**Solution**:

```bash
# Use pnpm overrides in package.json
{
  "pnpm": {
    "overrides": {
      "source-map@0.8.0-beta.0": "^0.7.6",
      "sourcemap-codec@1.4.8": "@jridgewell/sourcemap-codec@^1.5.5"
    }
  }
}

# Reinstall dependencies
pnpm install
```

### TypeScript Issues

#### Type Checking Errors

**Problem**: TypeScript compilation fails

```bash
error TS2307: Cannot find module '@/types/chat'
```

**Solution**:

```bash
# Check tsconfig.json paths configuration
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}

# Clear TypeScript cache
rm -rf node_modules/.cache
pnpm run type-check --force
```

#### Vue Component Type Issues

**Problem**: Vue component props not properly typed

**Solution**:

```vue
<script setup lang="ts">
// ✅ Use explicit interface
interface Props {
  message: ChatMessage
  loading?: boolean
}

const props = defineProps<Props>()

// ❌ Avoid runtime props with TypeScript
const props = defineProps({
  message: Object,
  loading: Boolean,
})
</script>
```

### Build Issues

#### Vite Build Failures

**Problem**: Build fails with module resolution errors

**Solution**:

```typescript
// vite.config.ts
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      external: ['fsevents'], // Exclude problematic dependencies
    },
  },
})
```

#### Tailwind CSS Issues

**Problem**: Tailwind styles not applying

**Solution**:

```javascript
// postcss.config.js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {}
  }
}

// Ensure Tailwind directives in main CSS
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### ESLint and Formatting

#### ESLint Configuration Errors

**Problem**: ESLint fails to parse files

**Solution**:

```javascript
// eslint.config.js
import antfu from '@antfu/eslint-config'

export default antfu({
  vue: true,
  typescript: true,
  ignores: ['dist/**', 'node_modules/**', 'apps/api/build/**'],
})
```

#### Prettier Conflicts

**Problem**: ESLint and Prettier formatting conflicts

**Solution**:

```bash
# Use ESLint's built-in formatting
pnpm lint:fix

# Or configure Prettier to work with ESLint
# .prettierrc
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "none"
}
```

## Runtime Issues

### Frontend Issues

#### Vue Router Navigation Errors

**Problem**: Navigation fails with route not found

**Solution**:

```typescript
// router/index.ts
const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/chat/index.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/exception/404.vue'),
  },
]
```

#### Pinia Store Issues

**Problem**: Store state not persisting

**Solution**:

```typescript
// store/modules/chat.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useChatStore = defineStore(
  'chat',
  () => {
    const messages = ref<ChatMessage[]>([])

    // Ensure proper reactivity
    function addMessage(message: ChatMessage) {
      messages.value.push(message)
    }

    return {
      messages: readonly(messages),
      addMessage,
    }
  },
  {
    persist: true, // Enable persistence
  },
)
```

#### API Request Failures

**Problem**: API requests fail with CORS errors

**Solution**:

```typescript
// vite.config.ts - Development proxy
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
    },
  },
})

// Or configure backend CORS
app.use(
  cors({
    origin: process.env.NODE_ENV === 'development' ? 'http://localhost:1002' : false,
  }),
)
```

### Backend Issues

#### Express Server Startup Failures

**Problem**: Server fails to start

```bash
Error: listen EADDRINUSE: address already in use :::3002
```

**Solution**:

```bash
# Find and kill process using port
lsof -ti:3002 | xargs kill -9

# Or use different port
PORT=3003 pnpm dev:api
```

#### OpenAI API Errors

**Problem**: OpenAI API requests fail

```bash
Error: 401 Unauthorized
```

**Solution**:

```bash
# Check API key format
echo $OPENAI_API_KEY | grep -E '^sk-[a-zA-Z0-9]{48}$'

# Test API key
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models
```

#### Azure OpenAI Configuration

**Problem**: Azure OpenAI requests fail

**Solution**:

```bash
# Verify Azure configuration
AI_PROVIDER=azure
AZURE_OPENAI_API_KEY=your_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=your-deployment-name
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# Test Azure endpoint
curl -H "api-key: $AZURE_OPENAI_API_KEY" \
  "$AZURE_OPENAI_ENDPOINT/openai/deployments?api-version=$AZURE_OPENAI_API_VERSION"
```

#### Rate Limiting Issues

**Problem**: Too many requests error

**Solution**:

```typescript
// Adjust rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
})
```

## Deployment Issues

### Docker Issues

#### Build Context Problems

**Problem**: Docker build fails with file not found

**Solution**:

```dockerfile
# Ensure proper build context
FROM node:24.12.0-alpine3.20

WORKDIR /app

# Copy package files first
COPY package*.json pnpm-lock.yaml ./
COPY apps/api/package*.json ./apps/api/

# Install dependencies
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN pnpm build
```

#### Multi-architecture Build Issues

**Problem**: ARM64 build fails

**Solution**:

```yaml
# .github/workflows/build_docker.yml
strategy:
  matrix:
    include:
      - arch: amd64
        runner: ubuntu-latest
      - arch: arm64
        runner: ubuntu-24.04-arm64

# Use native runners instead of QEMU emulation
```

### Kubernetes Issues

#### Pod Startup Failures

**Problem**: Pods fail to start

**Solution**:

```yaml
# k8s/deployment.yaml
spec:
  containers:
    - name: chatgpt-web
      image: your-image:tag
      resources:
        requests:
          memory: '256Mi'
          cpu: '250m'
        limits:
          memory: '512Mi'
          cpu: '500m'
      livenessProbe:
        httpGet:
          path: /health
          port: 3002
        initialDelaySeconds: 30
        periodSeconds: 10
      readinessProbe:
        httpGet:
          path: /health
          port: 3002
        initialDelaySeconds: 5
        periodSeconds: 5
```

#### ConfigMap and Secret Issues

**Problem**: Environment variables not loading

**Solution**:

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: chatgpt-config
data:
  NODE_ENV: 'production'
  AI_PROVIDER: 'openai'

---
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: chatgpt-secrets
type: Opaque
data:
  OPENAI_API_KEY: <base64-encoded-key>
```

### Cloud Platform Issues

#### Railway Deployment

**Problem**: Build timeout on Railway

**Solution**:

```json
// package.json
{
  "scripts": {
    "build": "pnpm build:frontend && pnpm build:backend",
    "build:frontend": "vite build",
    "build:backend": "cd apps/api && pnpm build"
  }
}

// Optimize build for Railway's time limits
```

#### Vercel/Netlify Issues

**Problem**: Static site deployment fails

**Solution**:

```javascript
// vite.config.ts
export default defineConfig({
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia'],
          ui: ['naive-ui'],
        },
      },
    },
  },
})
```

## Performance Issues

### Frontend Performance

#### Large Bundle Size

**Problem**: JavaScript bundle too large

**Solution**:

```typescript
// Implement code splitting
const ChatView = defineAsyncComponent(() => import('@/views/chat/index.vue'))
const SettingsView = defineAsyncComponent(() => import('@/views/settings/index.vue'))

// Use dynamic imports for heavy libraries
async function loadMermaid() {
  const { default: mermaid } = await import('mermaid')
  return mermaid
}
```

#### Memory Leaks

**Problem**: Memory usage increases over time

**Solution**:

```vue
<script setup lang="ts">
import { onUnmounted } from 'vue'

// Clean up intervals
const intervalId = setInterval(() => {
  // Periodic task
}, 1000)

onUnmounted(() => {
  clearInterval(intervalId)
})

// Clean up event listeners
const handleResize = () => {
  // Handle resize
}

window.addEventListener('resize', handleResize)

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>
```

### Backend Performance

#### High Memory Usage

**Problem**: Node.js process uses too much memory

**Solution**:

```bash
# Monitor memory usage
node --max-old-space-size=512 --inspect server.js

# Enable garbage collection logging
node --trace-gc server.js

# Use PM2 for process management
pm2 start server.js --max-memory-restart 500M
```

#### Slow API Responses

**Problem**: API requests take too long

**Solution**:

```typescript
// Implement request timeout
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 30000)

try {
  const response = await fetch(url, {
    signal: controller.signal,
    // ... other options
  })
  clearTimeout(timeoutId)
  return response
} catch (error) {
  clearTimeout(timeoutId)
  throw error
}

// Add response caching
const cache = new Map()
const cacheKey = `${method}:${url}:${JSON.stringify(body)}`

if (cache.has(cacheKey)) {
  return cache.get(cacheKey)
}

const response = await makeRequest()
cache.set(cacheKey, response)
return response
```

## Debugging Tools

### Development Tools

#### Browser DevTools

```javascript
// Enable Vue DevTools
if (process.env.NODE_ENV === 'development') {
  window.__VUE_DEVTOOLS_GLOBAL_HOOK__ = true
}

// Debug reactive state
import { watchEffect } from 'vue'

watchEffect(() => {
  console.log('Messages updated:', messages.value)
})
```

#### Network Debugging

```typescript
// Log all API requests
const originalFetch = window.fetch
window.fetch = async (...args) => {
  console.log('Fetch request:', args)
  const response = await originalFetch(...args)
  console.log('Fetch response:', response)
  return response
}
```

### Production Debugging

#### Logging Configuration

```typescript
// apps/api/src/utils/logger.ts
import winston from 'winston'

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
})

export { logger }
```

#### Health Checks

```typescript
// Add health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version,
  }

  res.json(health)
})
```

## Getting Help

### Community Resources

- **GitHub Issues**: Report bugs and request features
- **GitHub Discussions**: Ask questions and share ideas
- **Documentation**: Check the comprehensive docs

### Diagnostic Information

When reporting issues, include:

```bash
# System information
node --version
pnpm --version
npm list --depth=0

# Environment variables (sanitized)
env | grep -E '^(NODE_|AI_|OPENAI_|AZURE_)' | sed 's/=.*/=***/'

# Error logs
tail -n 50 error.log

# Build information
pnpm run build 2>&1 | tail -n 20
```

### Issue Template

```markdown
**Environment:**

- OS: [e.g., macOS 14.0, Ubuntu 22.04]
- Node.js: [e.g., 24.12.0]
- PNPM: [e.g., 10.27.0]
- Browser: [e.g., Chrome 120]

**Steps to Reproduce:**

1. Step one
2. Step two
3. Step three

**Expected Behavior:**
What you expected to happen

**Actual Behavior:**
What actually happened

**Error Messages:**
```

Paste error messages here

```

**Additional Context:**
Any other relevant information
```

This troubleshooting guide should help you resolve most common issues. If you encounter problems not covered here, please create an issue with detailed information.
