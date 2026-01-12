# Environment Configuration Guide

This guide covers all environment variables and configuration options for ChatGPT Web deployment across different environments.

## Environment Files Structure

```
chatgpt-web/
├── .env                    # Frontend environment variables
├── .env.example           # Frontend environment template
├── service/
│   ├── .env              # Backend environment variables
│   └── .env.example      # Backend environment template
```

## Core Configuration

### AI Provider Settings

#### OpenAI Configuration

```bash
# Required
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-openai-api-key-here

# Optional
OPENAI_API_MODEL=gpt-4o                    # Default model
OPENAI_API_BASE_URL=https://api.openai.com # API endpoint
OPENAI_API_DISABLE_DEBUG=false            # Enable debug mode
```

#### Azure OpenAI Configuration

```bash
# Required
AI_PROVIDER=azure
AZURE_OPENAI_API_KEY=your-azure-api-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=your-deployment-name

# Optional
AZURE_OPENAI_API_VERSION=2024-02-15-preview
AZURE_OPENAI_MODEL=gpt-4o                 # Override deployment model
```

### Security Configuration

```bash
# Authentication
AUTH_SECRET_KEY=your-secure-secret-key-here  # Required for access control

# Rate Limiting
MAX_REQUEST_PER_HOUR=1000                    # Requests per hour per IP
RATE_LIMIT_WINDOW_MS=3600000                 # Rate limit window (1 hour)
RATE_LIMIT_MAX_REQUESTS=1000                 # Max requests per window

# Security Headers
ENABLE_SECURITY_HEADERS=true                 # Enable security headers
CSP_POLICY=default-src 'self'               # Content Security Policy
HSTS_MAX_AGE=31536000                       # HSTS max age
```

### Server Configuration

```bash
# Basic Server Settings
NODE_ENV=production                          # Environment mode
PORT=3002                                   # Server port
HOST=0.0.0.0                               # Bind address

# Performance
TIMEOUT_MS=30000                            # Request timeout
RETRY_MAX_ATTEMPTS=3                        # Max retry attempts
RETRY_BASE_DELAY=1000                       # Base retry delay (ms)

# Logging
LOG_LEVEL=info                              # Log level (error, warn, info, debug)
ENABLE_REQUEST_LOGGING=true                 # Log HTTP requests
ENABLE_ERROR_LOGGING=true                   # Log errors
```

## Advanced Configuration

### Reasoning Models

```bash
# Reasoning Model Support
ENABLE_REASONING_MODELS=true                # Enable o1 series models
REASONING_MODEL_TIMEOUT_MS=300000           # 5 minutes for reasoning
DEFAULT_REASONING_MODEL=o1-preview          # Default reasoning model
FALLBACK_MODEL=gpt-4o                       # Fallback for reasoning failures
```

### Proxy Configuration

```bash
# HTTP/HTTPS Proxy
HTTPS_PROXY=http://proxy.company.com:8080
HTTP_PROXY=http://proxy.company.com:8080
ALL_PROXY=http://proxy.company.com:8080

# Proxy Authentication
PROXY_USERNAME=proxy_user
PROXY_PASSWORD=proxy_password

# Proxy Bypass
NO_PROXY=localhost,127.0.0.1,.company.com
```

### SOCKS Proxy

```bash
# SOCKS Proxy Configuration
SOCKS_PROXY_HOST=socks.proxy.com
SOCKS_PROXY_PORT=1080
SOCKS_PROXY_USERNAME=socks_user
SOCKS_PROXY_PASSWORD=socks_password
SOCKS_PROXY_TYPE=5                          # SOCKS version (4 or 5)
```

### CORS Configuration

```bash
# CORS Settings
ENABLE_CORS=true                            # Enable CORS
CORS_ORIGIN=https://yourdomain.com          # Allowed origins
CORS_METHODS=GET,POST,PUT,DELETE            # Allowed methods
CORS_HEADERS=Content-Type,Authorization     # Allowed headers
CORS_CREDENTIALS=true                       # Allow credentials
```

### Database Configuration

```bash
# PostgreSQL (if using database)
DATABASE_URL=postgresql://user:password@host:port/database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chatgpt_web
DB_USER=chatgpt_user
DB_PASSWORD=secure_password
DB_SSL=true

# Connection Pool
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_POOL_IDLE_TIMEOUT=30000
```

### Redis Configuration

```bash
# Redis (for caching and sessions)
REDIS_URL=redis://username:password@host:port
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_password
REDIS_DB=0

# Redis Options
REDIS_CONNECT_TIMEOUT=10000
REDIS_COMMAND_TIMEOUT=5000
REDIS_RETRY_ATTEMPTS=3
```

### Session Management

```bash
# Session Configuration
SESSION_SECRET=your-session-secret-key
SESSION_MAX_AGE=86400000                    # 24 hours
SESSION_STORE=memory                        # memory, redis, database
SESSION_SECURE=true                         # HTTPS only
SESSION_HTTP_ONLY=true                      # HTTP only cookies
```

### File Upload Configuration

```bash
# File Upload Settings
MAX_FILE_SIZE=10485760                      # 10MB in bytes
ALLOWED_FILE_TYPES=image/jpeg,image/png,text/plain
UPLOAD_DIR=./uploads
ENABLE_FILE_UPLOAD=false                    # Disable by default
```

## Environment-Specific Configurations

### Development Environment

```bash
# Development Settings
NODE_ENV=development
LOG_LEVEL=debug
ENABLE_CORS=true
OPENAI_API_DISABLE_DEBUG=false

# Relaxed Security
AUTH_SECRET_KEY=dev-secret-key
MAX_REQUEST_PER_HOUR=100
TIMEOUT_MS=120000

# Development Features
ENABLE_HOT_RELOAD=true
ENABLE_SOURCE_MAPS=true
ENABLE_VERBOSE_LOGGING=true
```

### Staging Environment

```bash
# Staging Settings
NODE_ENV=staging
LOG_LEVEL=info
ENABLE_CORS=false

# Moderate Security
AUTH_SECRET_KEY=staging-secret-key
MAX_REQUEST_PER_HOUR=500
TIMEOUT_MS=60000

# Staging Features
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_ERROR_REPORTING=true
```

### Production Environment

```bash
# Production Settings
NODE_ENV=production
LOG_LEVEL=warn
ENABLE_CORS=false

# High Security
AUTH_SECRET_KEY=production-ultra-secure-key
MAX_REQUEST_PER_HOUR=1000
TIMEOUT_MS=30000

# Production Features
ENABLE_SECURITY_HEADERS=true
ENABLE_RATE_LIMITING=true
ENABLE_MONITORING=true
ENABLE_HEALTH_CHECKS=true
```

## Platform-Specific Configurations

### Docker Environment

```bash
# Docker-specific settings
PORT=3002                                   # Container port
HOST=0.0.0.0                               # Bind to all interfaces

# Docker health checks
ENABLE_HEALTH_CHECKS=true
HEALTH_CHECK_PATH=/health
HEALTH_CHECK_TIMEOUT=5000

# Container optimization
NODE_OPTIONS=--max-old-space-size=1024
ENABLE_COMPRESSION=true
```

### Kubernetes Environment

```bash
# Kubernetes-specific settings
K8S_NAMESPACE=chatgpt-web
K8S_SERVICE_NAME=chatgpt-web-service
K8S_POD_NAME=${HOSTNAME}

# Kubernetes health checks
READINESS_PROBE_PATH=/ready
LIVENESS_PROBE_PATH=/health
STARTUP_PROBE_PATH=/startup

# Resource limits
MEMORY_LIMIT=1Gi
CPU_LIMIT=1000m
```

### Railway Environment

```bash
# Railway-specific optimizations
TIMEOUT_MS=25000                            # Railway 30s limit
ENABLE_COMPRESSION=true
RETRY_MAX_ATTEMPTS=2

# Railway monitoring
ENABLE_HEALTH_CHECKS=true
HEALTH_CHECK_PATH=/health
```

### Vercel Environment

```bash
# Vercel-specific settings (frontend only)
VERCEL_URL=${VERCEL_URL}
VERCEL_ENV=${VERCEL_ENV}

# API endpoint
VITE_API_BASE_URL=https://your-backend.railway.app
```

## Monitoring and Observability

### Logging Configuration

```bash
# Log Configuration
LOG_LEVEL=info                              # error, warn, info, debug
LOG_FORMAT=json                             # json, simple
LOG_TIMESTAMP=true
LOG_COLORIZE=false                          # Disable in production

# Log Destinations
ENABLE_CONSOLE_LOGGING=true
ENABLE_FILE_LOGGING=true
LOG_FILE_PATH=./logs/app.log
LOG_MAX_SIZE=100MB
LOG_MAX_FILES=10

# Remote Logging
ENABLE_REMOTE_LOGGING=false
REMOTE_LOG_ENDPOINT=https://logs.company.com/api
REMOTE_LOG_API_KEY=your-logging-api-key
```

### Metrics and Monitoring

```bash
# Metrics Configuration
ENABLE_METRICS=true
METRICS_PORT=9090
METRICS_PATH=/metrics

# Performance Monitoring
ENABLE_PERFORMANCE_MONITORING=true
PERFORMANCE_SAMPLE_RATE=0.1

# Error Tracking
ENABLE_ERROR_TRACKING=true
SENTRY_DSN=https://your-sentry-dsn
ERROR_SAMPLE_RATE=1.0
```

### Health Checks

```bash
# Health Check Configuration
ENABLE_HEALTH_CHECKS=true
HEALTH_CHECK_PATH=/health
HEALTH_CHECK_TIMEOUT=5000

# Detailed Health Checks
HEALTH_CHECK_DATABASE=true
HEALTH_CHECK_REDIS=true
HEALTH_CHECK_EXTERNAL_APIS=true
```

## Security and Compliance

### API Key Management

```bash
# API Key Rotation
ENABLE_KEY_ROTATION=false
KEY_ROTATION_INTERVAL=86400000              # 24 hours
KEY_ROTATION_OVERLAP=3600000                # 1 hour overlap

# Key Validation
VALIDATE_API_KEYS=true
API_KEY_MIN_LENGTH=40
API_KEY_PATTERN=^sk-[a-zA-Z0-9]{48}$
```

### Data Protection

```bash
# Data Encryption
ENABLE_DATA_ENCRYPTION=true
ENCRYPTION_KEY=your-encryption-key
ENCRYPTION_ALGORITHM=aes-256-gcm

# Data Retention
DATA_RETENTION_DAYS=30
ENABLE_DATA_CLEANUP=true
CLEANUP_INTERVAL=86400000                   # Daily cleanup
```

### Compliance

```bash
# Compliance Settings
ENABLE_AUDIT_LOGGING=true
AUDIT_LOG_PATH=./logs/audit.log
ENABLE_GDPR_COMPLIANCE=true
ENABLE_HIPAA_COMPLIANCE=false

# Data Residency
DATA_RESIDENCY=US                           # US, EU, APAC
ENABLE_DATA_LOCALIZATION=true
```

## Performance Optimization

### Caching Configuration

```bash
# Response Caching
ENABLE_RESPONSE_CACHING=true
CACHE_TTL=300000                            # 5 minutes
CACHE_MAX_SIZE=1000
CACHE_STRATEGY=lru                          # lru, fifo

# API Response Caching
ENABLE_API_CACHING=true
API_CACHE_TTL=60000                         # 1 minute
API_CACHE_MAX_SIZE=500
```

### Connection Pooling

```bash
# HTTP Connection Pooling
ENABLE_CONNECTION_POOLING=true
CONNECTION_POOL_SIZE=50
KEEP_ALIVE_TIMEOUT=30000
CONNECTION_TIMEOUT=10000

# Database Connection Pooling
DB_POOL_SIZE=10
DB_POOL_TIMEOUT=30000
DB_POOL_IDLE_TIMEOUT=600000
```

### Resource Limits

```bash
# Memory Management
NODE_OPTIONS=--max-old-space-size=2048
MEMORY_LIMIT=2048                           # MB
ENABLE_MEMORY_MONITORING=true

# Request Limits
MAX_REQUEST_SIZE=1048576                    # 1MB
MAX_JSON_SIZE=1048576                       # 1MB
MAX_URL_LENGTH=2048
```

## Validation and Testing

### Environment Validation

```bash
# Validation Settings
ENABLE_ENV_VALIDATION=true
STRICT_ENV_VALIDATION=false
REQUIRED_ENV_VARS=OPENAI_API_KEY,AUTH_SECRET_KEY

# Testing Configuration
ENABLE_TEST_MODE=false
TEST_API_KEY=sk-test-key-for-testing
MOCK_EXTERNAL_APIS=false
```

### Configuration Templates

#### Minimal Configuration (.env.minimal)

```bash
# Minimal required configuration
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-api-key-here
AUTH_SECRET_KEY=your-secret-key
NODE_ENV=production
PORT=3002
```

#### Complete Configuration (.env.complete)

```bash
# Complete configuration with all options
# Copy and modify as needed

# AI Provider
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_API_MODEL=gpt-4o
OPENAI_API_BASE_URL=https://api.openai.com

# Security
AUTH_SECRET_KEY=your-ultra-secure-secret-key
MAX_REQUEST_PER_HOUR=1000
RATE_LIMIT_WINDOW_MS=3600000
ENABLE_SECURITY_HEADERS=true

# Server
NODE_ENV=production
PORT=3002
HOST=0.0.0.0
TIMEOUT_MS=30000

# Logging
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true
LOG_FILE_PATH=./logs/app.log

# Performance
ENABLE_COMPRESSION=true
ENABLE_CACHING=true
CACHE_TTL=300000

# Monitoring
ENABLE_HEALTH_CHECKS=true
ENABLE_METRICS=true
HEALTH_CHECK_PATH=/health
```

## Environment Variable Precedence

1. **Command Line Arguments** (highest priority)
2. **Environment Variables**
3. **`.env` files**
4. **Default Values** (lowest priority)

## Best Practices

### Security Best Practices

- Never commit `.env` files to version control
- Use strong, unique secret keys
- Rotate API keys regularly
- Use environment-specific configurations
- Validate all environment variables

### Performance Best Practices

- Set appropriate timeout values
- Enable compression in production
- Use connection pooling
- Configure proper cache settings
- Monitor resource usage

### Operational Best Practices

- Use consistent naming conventions
- Document all environment variables
- Validate configuration on startup
- Use configuration templates
- Monitor configuration changes

This environment configuration guide provides comprehensive coverage of all configuration options for deploying ChatGPT Web across different environments and platforms.
