# Docker Deployment Guide

## Overview

This guide explains how to deploy ChatGPT Web using Docker, with specific instructions for AWS App Runner and other container platforms.

## Architecture

The Docker image contains both frontend and backend in a single container:

- **Frontend**: Built Vue.js application served as static files from `/apps/api/public`
- **Backend**: Node.js Express server running on port 3002
- **API Routes**: Available at both `/api/*` and `/*` paths

## Environment Configuration

### Frontend Build-Time Variables (IMPORTANT!)

**Critical**: Frontend environment variables are **build-time only** and must be set during Docker image build, not at runtime.

The frontend is built with these environment variables:

```bash
# API endpoint - MUST use relative path for same-origin deployment
VITE_GLOB_API_URL=/api

# Feature flags
VITE_GLOB_OPEN_LONG_REPLY=false
VITE_GLOB_APP_PWA=false
```

**Why build-time only?**

- Vite bundles these values into the JavaScript files during `pnpm build`
- The generated static files (HTML/JS/CSS) have these values hardcoded
- Setting these in App Runner or Docker runtime **will not work**

**How to configure:**

1. **Default**: The Dockerfile sets `VITE_GLOB_API_URL=/api` automatically
2. **Custom**: Use Docker build args to override:
   ```bash
   docker build \
     --build-arg VITE_GLOB_API_URL=/api \
     --build-arg VITE_GLOB_APP_PWA=true \
     -t chatgpt-web:latest .
   ```

**Important**: The frontend uses `/api` as a relative path, which means API requests go to the same origin as the frontend. This avoids CORS issues.

### Backend Runtime Variables

Required environment variables for the backend:

```bash
# Server Configuration
NODE_ENV=production
PORT=3002

# AI Provider (openai or azure)
AI_PROVIDER=openai

# OpenAI Configuration
OPENAI_API_KEY=your-api-key-here
OPENAI_API_BASE_URL=https://api.openai.com
DEFAULT_MODEL=gpt-4o

# Azure OpenAI Configuration (if using Azure)
AZURE_OPENAI_API_KEY=your-azure-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=your-deployment-name
AZURE_OPENAI_API_VERSION=2024-02-15-preview
AZURE_OPENAI_USE_RESPONSES_API=true

# Security
AUTH_SECRET_KEY=your-secret-key-here
SESSION_SECRET=your-session-secret
MAX_REQUEST_PER_HOUR=100

# Performance
TIMEOUT_MS=60000
RETRY_MAX_ATTEMPTS=3

# Logging
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=false
```

## Building the Docker Image

### Local Build

```bash
# Build the image
docker build -t chatgpt-web:latest .

# Run locally for testing
docker run -p 3002:3002 \
  -e OPENAI_API_KEY=your-key \
  -e AI_PROVIDER=openai \
  chatgpt-web:latest
```

### Production Build

```bash
# Build with version tag
docker build -t chatgpt-web:v2.11.1 .

# Tag for registry
docker tag chatgpt-web:v2.11.1 your-registry/chatgpt-web:v2.11.1

# Push to registry
docker push your-registry/chatgpt-web:v2.11.1
```

## Deployment Platforms

### AWS App Runner

1. **Push image to ECR**:

```bash
# Authenticate to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin your-account.dkr.ecr.us-east-1.amazonaws.com

# Tag and push
docker tag chatgpt-web:latest your-account.dkr.ecr.us-east-1.amazonaws.com/chatgpt-web:latest
docker push your-account.dkr.ecr.us-east-1.amazonaws.com/chatgpt-web:latest
```

2. **Create App Runner service**:
   - Source: Container registry (ECR)
   - Port: 3002
   - Environment variables: Add all required variables from above
   - Health check path: `/health`

3. **Important App Runner Settings**:
   - **Port**: Must be 3002
   - **Health check**: `/health` endpoint
   - **CPU/Memory**: Minimum 1 vCPU, 2 GB RAM recommended
   - **Auto-scaling**: Configure based on your needs

### Docker Compose

```yaml
version: '3.8'

services:
  chatgpt-web:
    image: chatgpt-web:latest
    ports:
      - '3002:3002'
    environment:
      - NODE_ENV=production
      - PORT=3002
      - AI_PROVIDER=openai
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - DEFAULT_MODEL=gpt-4o
      - AUTH_SECRET_KEY=${AUTH_SECRET_KEY}
      - SESSION_SECRET=${SESSION_SECRET}
    restart: unless-stopped
    healthcheck:
      test:
        [
          'CMD',
          'node',
          '-e',
          "require('http').get('http://localhost:3002/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })",
        ]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 5s
```

### Kubernetes

See `kubernetes/deploy.yaml` for full Kubernetes deployment configuration.

Key points:

- Service exposes port 3002
- ConfigMap for non-sensitive configuration
- Secret for API keys and sensitive data
- Liveness and readiness probes on `/health`

## Troubleshooting

### CORS Errors

**Problem**: `Fetch API cannot load http://localhost:3002/api/session due to access control checks`

**Solution**: This happens when the frontend is trying to access a hardcoded localhost URL. The fix is already implemented:

- Frontend uses `/api` relative path (configured in `.env.production`)
- Backend serves frontend static files and API on the same origin
- No CORS configuration needed

### Frontend Shows Blank Page

**Checklist**:

1. Verify frontend files are in `/app/apps/api/public` in the container
2. Check backend logs for static file serving errors
3. Ensure `express.static('public')` is configured in backend
4. Verify build completed successfully in Docker build logs

### API Requests Fail

**Checklist**:

1. Verify environment variables are set correctly
2. Check `/health` endpoint returns 200
3. Review backend logs for errors
4. Ensure OPENAI_API_KEY or AZURE_OPENAI_API_KEY is valid
5. Check network connectivity to OpenAI/Azure endpoints

### Health Check Fails

**Common causes**:

- Backend not fully started (increase `start_period`)
- Port mismatch (must be 3002)
- Missing required environment variables
- OpenAI API key validation failing

## Security Best Practices

1. **Never commit secrets**: Use environment variables or secrets management
2. **Use HTTPS**: Always deploy behind HTTPS in production
3. **Set AUTH_SECRET_KEY**: Required for authentication features
4. **Configure rate limiting**: Adjust `MAX_REQUEST_PER_HOUR` based on needs
5. **Enable logging**: Set `LOG_LEVEL=info` for production monitoring
6. **Regular updates**: Keep dependencies and base image updated

## Monitoring

### Health Check Endpoint

```bash
curl http://your-domain:3002/health
```

Expected response:

```json
{
  "status": "ok",
  "timestamp": "2024-01-19T12:00:00.000Z"
}
```

### Logs

View container logs:

```bash
docker logs -f container-id
```

Key log patterns to monitor:

- `Server started successfully` - Startup confirmation
- `Error:` - Application errors
- `WARN:` - Warnings that may need attention

## Performance Tuning

### Resource Allocation

Recommended minimum:

- **CPU**: 1 vCPU
- **Memory**: 2 GB RAM
- **Storage**: 1 GB (for container image)

For high traffic:

- **CPU**: 2-4 vCPU
- **Memory**: 4-8 GB RAM
- **Auto-scaling**: Configure based on CPU/memory metrics

### Environment Variables

```bash
# Increase timeout for reasoning models
REASONING_MODEL_TIMEOUT_MS=120000

# Adjust retry behavior
RETRY_MAX_ATTEMPTS=3
RETRY_BASE_DELAY=1000

# Rate limiting
MAX_REQUEST_PER_HOUR=100
RATE_LIMIT_WINDOW_MS=3600000
```

## Support

For issues or questions:

- GitHub Issues: https://github.com/cnkang/chatgpt-web/issues
- Documentation: https://github.com/cnkang/chatgpt-web/tree/main/docs
