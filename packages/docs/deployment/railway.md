# Railway Deployment Guide

This guide covers deploying ChatGPT Web on Railway, a modern deployment platform that simplifies application hosting.

## Prerequisites

- Railway account (sign up at [railway.app](https://railway.app))
- GitHub repository with your ChatGPT Web code
- OpenAI API key

## Quick Deployment

### 1. Deploy from Template

The fastest way to deploy is using Railway's template system:

1. Visit the [ChatGPT Web Railway Template](https://railway.app/template/chatgpt-web)
2. Click "Deploy Now"
3. Connect your GitHub account
4. Configure environment variables
5. Deploy!

### 2. Deploy from GitHub Repository

#### Connect Repository

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your ChatGPT Web repository
5. Railway will automatically detect the Node.js application

#### Configure Build Settings

Railway automatically detects the build configuration, but you can customize:

```json
// package.json
{
  "scripts": {
    "build": "pnpm build",
    "start": "cd service && pnpm prod",
    "railway:build": "pnpm install && pnpm build && cd service && pnpm install && pnpm build",
    "railway:start": "cd service && pnpm prod"
  }
}
```

## Environment Configuration

### Required Environment Variables

Set these in Railway's environment variables section:

```bash
# Core Configuration
NODE_ENV=production
PORT=3002

# AI Provider Configuration
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_API_MODEL=gpt-4o

# Security
AUTH_SECRET_KEY=your-secure-secret-key-here
MAX_REQUEST_PER_HOUR=500

# Railway Optimizations
TIMEOUT_MS=25000  # Railway has 30s timeout limit
RETRY_MAX_ATTEMPTS=2
RETRY_BASE_DELAY=1000
```

### Optional Environment Variables

```bash
# Azure OpenAI (if using Azure)
AZURE_OPENAI_API_KEY=your-azure-api-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=your-deployment-name
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# Performance Tuning
ENABLE_COMPRESSION=true
ENABLE_HEALTH_CHECKS=true
HEALTH_CHECK_PATH=/health

# Logging
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=3600000
RATE_LIMIT_MAX_REQUESTS=500
```

## Railway Configuration Files

### railway.toml

Create a `railway.toml` file in your project root for advanced configuration:

```toml
[build]
builder = "nixpacks"
buildCommand = "pnpm install && pnpm build && cd service && pnpm install && pnpm build"

[deploy]
startCommand = "cd service && pnpm prod"
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3

[environments.production]
variables = { NODE_ENV = "production" }

[environments.staging]
variables = { NODE_ENV = "staging" }
```

### Nixpacks Configuration

Create a `nixpacks.toml` file for custom build configuration:

```toml
[phases.setup]
nixPkgs = ["nodejs_20", "pnpm"]

[phases.install]
cmds = [
  "corepack enable pnpm",
  "pnpm install --frozen-lockfile"
]

[phases.build]
cmds = [
  "pnpm build",
  "cd service && pnpm install --frozen-lockfile",
  "cd service && pnpm build"
]

[start]
cmd = "cd service && pnpm prod"
```

## Deployment Strategies

### Automatic Deployments

Railway automatically deploys when you push to your connected branch:

1. **Main Branch**: Production deployments
2. **Develop Branch**: Staging deployments
3. **Feature Branches**: Preview deployments

### Manual Deployments

Deploy manually from the Railway dashboard:

1. Go to your project dashboard
2. Click "Deploy"
3. Select the branch/commit to deploy
4. Monitor deployment logs

### Preview Deployments

Railway creates preview deployments for pull requests:

```yaml
# .github/workflows/railway-preview.yml
name: Railway Preview

on:
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Railway
        uses: railway/cli@v3
        with:
          command: up --service preview
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

## Custom Domains

### Add Custom Domain

1. Go to your service settings in Railway
2. Click "Domains"
3. Click "Custom Domain"
4. Enter your domain (e.g., `chatgpt.yourdomain.com`)
5. Update your DNS records as instructed

### DNS Configuration

Add a CNAME record pointing to Railway:

```
Type: CNAME
Name: chatgpt (or your subdomain)
Value: your-app.railway.app
TTL: 300
```

### SSL Certificates

Railway automatically provisions SSL certificates for custom domains using Let's Encrypt.

## Database Integration

### Add PostgreSQL Database

If you need persistent storage:

1. In your Railway project, click "New"
2. Select "Database" → "PostgreSQL"
3. Railway will create a database and provide connection details
4. Use the provided `DATABASE_URL` environment variable

```bash
# Database configuration
DATABASE_URL=postgresql://username:password@host:port/database
```

### Add Redis Cache

For session storage and caching:

1. Click "New" → "Database" → "Redis"
2. Use the provided `REDIS_URL` environment variable

```bash
# Redis configuration
REDIS_URL=redis://username:password@host:port
```

## Monitoring and Logging

### Built-in Monitoring

Railway provides built-in monitoring:

- **Metrics**: CPU, memory, network usage
- **Logs**: Real-time application logs
- **Deployments**: Deployment history and status
- **Health Checks**: Automatic health monitoring

### Custom Health Checks

Implement health checks in your application:

```typescript
// service/src/routes/health.ts
import { Router } from 'express'

const router = Router()

router.get('/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV,
  }

  res.json(health)
})

export default router
```

### Log Aggregation

Configure structured logging for better observability:

```typescript
// service/src/utils/logger.ts
import winston from 'winston'

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
})

export { logger }
```

## Performance Optimization

### Railway-Specific Optimizations

```bash
# Environment variables for Railway
TIMEOUT_MS=25000          # Railway has 30s timeout
ENABLE_COMPRESSION=true   # Enable gzip compression
KEEP_ALIVE_TIMEOUT=5000   # Connection keep-alive
MAX_REQUEST_SIZE=1mb      # Limit request size

# Memory optimization
NODE_OPTIONS="--max-old-space-size=512"
```

### Build Optimization

```json
// package.json
{
  "scripts": {
    "railway:build": "pnpm install --frozen-lockfile && pnpm build:optimized",
    "build:optimized": "NODE_ENV=production pnpm build && cd service && pnpm install --frozen-lockfile --prod && pnpm build"
  }
}
```

### Caching Strategy

```typescript
// Implement response caching
import NodeCache from 'node-cache'

const cache = new NodeCache({
  stdTTL: 300, // 5 minutes
  checkperiod: 60, // Check for expired keys every minute
})

// Cache middleware
export const cacheMiddleware = (duration: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.originalUrl
    const cached = cache.get(key)

    if (cached) {
      return res.json(cached)
    }

    const originalSend = res.json
    res.json = function (data) {
      cache.set(key, data, duration)
      return originalSend.call(this, data)
    }

    next()
  }
}
```

## Scaling and Resources

### Vertical Scaling

Railway automatically scales resources based on usage:

- **Hobby Plan**: Up to 512MB RAM, 1 vCPU
- **Pro Plan**: Up to 8GB RAM, 8 vCPU
- **Team Plan**: Custom resource allocation

### Horizontal Scaling

For high-traffic applications, consider:

1. **Load Balancing**: Use Railway's built-in load balancing
2. **Multiple Services**: Split frontend and backend
3. **Database Scaling**: Use read replicas for databases

### Resource Monitoring

Monitor resource usage in Railway dashboard:

```typescript
// Add resource monitoring endpoint
app.get('/metrics', (req, res) => {
  const metrics = {
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  }

  res.json(metrics)
})
```

## Security Best Practices

### Environment Variables

- Never commit API keys to version control
- Use Railway's environment variable management
- Rotate API keys regularly

### Network Security

```typescript
// Security middleware
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  }),
)

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
})

app.use('/api', limiter)
```

### Input Validation

```typescript
import { z } from 'zod'

const chatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string().min(1).max(4000),
    }),
  ),
  model: z.string().optional(),
})

app.post('/api/chat', (req, res) => {
  try {
    const validatedData = chatRequestSchema.parse(req.body)
    // Process request
  } catch (error) {
    res.status(400).json({ error: 'Invalid request data' })
  }
})
```

## Troubleshooting

### Common Issues

#### Build Failures

```bash
# Check build logs in Railway dashboard
# Common solutions:

# 1. Node.js version mismatch
echo "20" > .nvmrc

# 2. Missing dependencies
pnpm install --frozen-lockfile

# 3. Build timeout
# Optimize build process or contact Railway support
```

#### Runtime Errors

```bash
# Check application logs in Railway dashboard
# Common solutions:

# 1. Environment variables not set
# Verify all required env vars in Railway dashboard

# 2. Port configuration
PORT=3002  # Railway automatically sets PORT

# 3. Timeout issues
TIMEOUT_MS=25000  # Railway has 30s timeout limit
```

#### Performance Issues

```bash
# Monitor resource usage
# Solutions:

# 1. Increase memory limit (Pro plan)
NODE_OPTIONS="--max-old-space-size=1024"

# 2. Enable compression
ENABLE_COMPRESSION=true

# 3. Implement caching
# Add Redis for caching
```

### Debugging Tools

```typescript
// Add debug endpoints (development only)
if (process.env.NODE_ENV === 'development') {
  app.get('/debug/env', (req, res) => {
    const safeEnv = Object.keys(process.env)
      .filter(key => !key.includes('KEY') && !key.includes('SECRET'))
      .reduce((obj, key) => {
        obj[key] = process.env[key]
        return obj
      }, {})

    res.json(safeEnv)
  })

  app.get('/debug/health', (req, res) => {
    res.json({
      status: 'ok',
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      version: process.version,
    })
  })
}
```

## Migration from Other Platforms

### From Vercel

1. Export environment variables from Vercel
2. Create new Railway project
3. Import environment variables
4. Update build commands if necessary

### From Heroku

1. Export Heroku config vars: `heroku config -a your-app`
2. Create Railway project
3. Set environment variables in Railway
4. Update any Heroku-specific configurations

### From Docker

Railway can deploy Docker containers:

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --frozen-lockfile

COPY . .
RUN npm run build

EXPOSE 3002

CMD ["npm", "start"]
```

## Cost Optimization

### Resource Management

- **Hobby Plan**: $5/month, suitable for personal projects
- **Pro Plan**: $20/month + usage, better for production
- **Team Plan**: Custom pricing for teams

### Usage Optimization

```bash
# Optimize for Railway's pricing model
ENABLE_COMPRESSION=true      # Reduce bandwidth usage
TIMEOUT_MS=25000            # Prevent long-running requests
MAX_REQUEST_SIZE=1mb        # Limit request size
ENABLE_CACHING=true         # Reduce API calls
```

This Railway deployment guide provides comprehensive instructions for deploying ChatGPT Web on Railway with optimal configuration for performance, security, and cost-effectiveness.
