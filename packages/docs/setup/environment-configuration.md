# Environment Configuration

This guide covers all environment variables and configuration options for the ChatGPT Web monorepo.

## Configuration Files

### Backend Configuration (`apps/api/.env`)

The backend service requires configuration for API access, security, and performance.

#### Required Variables

```bash
# OpenAI API Key - Get from https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your_official_api_key_here
```

#### Provider Configuration

**OpenAI Configuration:**

```bash
# Provider selection
AI_PROVIDER=openai

# OpenAI API settings
OPENAI_API_KEY=sk-your_official_api_key_here
OPENAI_API_MODEL=gpt-4o
OPENAI_API_BASE_URL=https://api.openai.com
OPENAI_API_DISABLE_DEBUG=false
```

**Azure OpenAI Configuration:**

```bash
# Provider selection
AI_PROVIDER=azure

# Azure OpenAI settings
AZURE_OPENAI_API_KEY=your_azure_api_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-4o-deployment
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# Enable v1 Responses API (recommended)
AZURE_OPENAI_USE_RESPONSES_API=true
```

#### Security Configuration

```bash
# Access control (optional)
AUTH_SECRET_KEY=your_secret_key_here

# Rate limiting
MAX_REQUEST_PER_HOUR=100
RATE_LIMIT_WINDOW_MS=3600000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Performance Configuration

```bash
# Request timeout
TIMEOUT_MS=60000

# Retry configuration
RETRY_MAX_ATTEMPTS=3
RETRY_BASE_DELAY=1000

# Reasoning models
ENABLE_REASONING_MODELS=true
REASONING_MODEL_TIMEOUT_MS=120000
```

#### Proxy Configuration

```bash
# SOCKS proxy
SOCKS_PROXY_HOST=your-socks-proxy
SOCKS_PROXY_PORT=1080
SOCKS_PROXY_USERNAME=username
SOCKS_PROXY_PASSWORD=password

# HTTP/HTTPS proxy
HTTPS_PROXY=http://proxy:8080
ALL_PROXY=http://proxy:8080
```

#### Development Configuration

```bash
# Environment mode
NODE_ENV=development  # or 'production', 'test'

# Logging
LOG_LEVEL=info  # error, warn, info, debug

# CORS (development only)
ENABLE_CORS=true
```

### Frontend Configuration (`apps/web/.env`)

The frontend application requires minimal configuration.

```bash
# API endpoint
VITE_GLOB_API_URL=http://localhost:3002

# PWA settings
VITE_GLOB_APP_PWA=false

# App information
VITE_GLOB_APP_TITLE=ChatGPT Web
VITE_GLOB_APP_DESCRIPTION=ChatGPT Web Application
```

## Environment-Specific Configurations

### Development Environment

**Backend (`apps/api/.env.development`):**

```bash
NODE_ENV=development
LOG_LEVEL=debug
ENABLE_CORS=true
TIMEOUT_MS=30000

# Use development API key
OPENAI_API_KEY=sk-dev-key-here
```

**Frontend (`apps/web/.env.development`):**

```bash
VITE_GLOB_API_URL=http://localhost:3002
VITE_GLOB_APP_PWA=false
```

### Production Environment

**Backend (`apps/api/.env.production`):**

```bash
NODE_ENV=production
LOG_LEVEL=warn
ENABLE_CORS=false
TIMEOUT_MS=60000

# Use production API key
OPENAI_API_KEY=sk-prod-key-here

# Security settings
AUTH_SECRET_KEY=strong-production-secret
MAX_REQUEST_PER_HOUR=1000
```

**Frontend (`apps/web/.env.production`):**

```bash
VITE_GLOB_API_URL=https://your-api-domain.com
VITE_GLOB_APP_PWA=true
```

### Testing Environment

**Backend (`apps/api/.env.test`):**

```bash
NODE_ENV=test
LOG_LEVEL=error

# Use test API key or mock
OPENAI_API_KEY=sk-test-key-here
TIMEOUT_MS=10000
```

## Configuration Validation

The application validates configuration on startup:

### Valid Configuration

```bash
✅ Configuration validated successfully
✅ Official OpenAI API connection established
✅ All required environment variables present
```

### Invalid Configuration

```bash
❌ Deprecated configuration detected: OPENAI_ACCESS_TOKEN
❌ Please migrate to official OpenAI API
❌ Missing required configuration: OPENAI_API_KEY
```

## Docker Configuration

### Docker Compose Environment

```yaml
# docker-compose.yml
version: '3.8'
services:
  chatgpt-web:
    image: chatgpt-web:latest
    environment:
      # Required
      - OPENAI_API_KEY=${OPENAI_API_KEY}

      # Optional
      - AI_PROVIDER=${AI_PROVIDER:-openai}
      - OPENAI_API_MODEL=${OPENAI_API_MODEL:-gpt-4o}
      - AUTH_SECRET_KEY=${AUTH_SECRET_KEY}
      - MAX_REQUEST_PER_HOUR=${MAX_REQUEST_PER_HOUR:-100}
      - TIMEOUT_MS=${TIMEOUT_MS:-60000}

    env_file:
      - .env
```

### Docker Environment File

```bash
# .env for Docker
OPENAI_API_KEY=sk-your-key-here
AI_PROVIDER=openai
OPENAI_API_MODEL=gpt-4o
AUTH_SECRET_KEY=your-secret-key
MAX_REQUEST_PER_HOUR=100
NODE_ENV=production
```

## Kubernetes Configuration

### ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: chatgpt-web-config
data:
  AI_PROVIDER: 'openai'
  OPENAI_API_MODEL: 'gpt-4o'
  OPENAI_API_BASE_URL: 'https://api.openai.com'
  TIMEOUT_MS: '60000'
  MAX_REQUEST_PER_HOUR: '100'
  NODE_ENV: 'production'
```

### Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: chatgpt-web-secrets
type: Opaque
stringData:
  OPENAI_API_KEY: sk-your-key-here
  AUTH_SECRET_KEY: your-secret-key
```

## Configuration Best Practices

### Security

1. **Never commit secrets to version control**

   ```bash
   # Add to .gitignore
   .env
   .env.local
   .env.production
   ```

2. **Use environment-specific keys**
   - Development: Limited quota keys
   - Production: Full quota keys
   - Testing: Mock or test keys

3. **Rotate secrets regularly**
   - API keys every 90 days
   - Auth secrets every 30 days

### Performance

1. **Optimize timeouts**
   - Development: Shorter timeouts for faster feedback
   - Production: Longer timeouts for reliability

2. **Configure rate limiting**
   - Match your API quota
   - Consider user load

3. **Enable appropriate logging**
   - Development: Debug level
   - Production: Warn level

### Monitoring

1. **Health check endpoints**

   ```bash
   # Check configuration
   curl http://localhost:3002/api/config
   ```

2. **Log monitoring**
   ```bash
   # Check logs for configuration issues
   tail -f logs/app.log | grep -i config
   ```

## Troubleshooting

### Common Configuration Issues

#### Missing API Key

```
Error: Missing required configuration: OPENAI_API_KEY
```

**Solution**: Add your OpenAI API key to the environment file.

#### Invalid API Key Format

```
Error: Invalid API key format
```

**Solution**: Ensure the key starts with `sk-` and is from OpenAI platform.

#### Deprecated Configuration

```
Error: Deprecated configuration detected
```

**Solution**: Remove old variables and use official API configuration.

#### Environment File Not Found

```
Error: Cannot load environment file
```

**Solution**: Ensure `.env` files exist and are in the correct locations.

### Configuration Testing

Test your configuration:

```bash
# Backend configuration test
cd apps/api
pnpm run validate-config

# Full application test
pnpm dev
```

## Migration from Legacy Configuration

If migrating from older versions:

1. **Remove deprecated variables:**

   ```bash
   # Remove these from .env
   OPENAI_ACCESS_TOKEN=
   API_REVERSE_PROXY=
   CHATGPT_ACCESS_TOKEN=
   ```

2. **Add official API configuration:**

   ```bash
   # Add these to .env
   OPENAI_API_KEY=sk-your-key-here
   AI_PROVIDER=openai
   ```

3. **Update deployment scripts:**
   - Docker compose files
   - Kubernetes manifests
   - CI/CD pipelines

## Next Steps

After configuring your environment:

1. Test the configuration with [Monorepo Setup](./monorepo-setup.md)
2. Review [Development Workflow](../development/workflow.md)
3. Set up [Deployment](../deployment/README.md) for your target environment
