# Configuration Examples

This document provides comprehensive configuration examples for different deployment scenarios and use cases.

## Table of Contents

- [Configuration Examples](#configuration-examples)
  - [Table of Contents](#table-of-contents)
  - [Basic Configurations](#basic-configurations)
    - [OpenAI Configuration](#openai-configuration)
    - [Azure OpenAI Configuration](#azure-openai-configuration)
  - [Advanced Configurations](#advanced-configurations)
    - [Production Configuration](#production-configuration)
    - [Development Configuration](#development-configuration)
    - [High-Security Configuration](#high-security-configuration)
  - [Provider-Specific Examples](#provider-specific-examples)
    - [OpenAI with Reasoning Models](#openai-with-reasoning-models)
    - [Azure OpenAI Enterprise Setup](#azure-openai-enterprise-setup)
    - [Multi-Provider Fallback](#multi-provider-fallback)
  - [Deployment Configurations](#deployment-configurations)
    - [Docker Configuration](#docker-configuration)
    - [Kubernetes Configuration](#kubernetes-configuration)
    - [Railway Configuration](#railway-configuration)
  - [Proxy Configurations](#proxy-configurations)
    - [HTTP/HTTPS Proxy](#httphttps-proxy)
    - [SOCKS Proxy](#socks-proxy)
    - [Corporate Firewall Setup](#corporate-firewall-setup)
  - [Performance Tuning](#performance-tuning)
    - [High-Traffic Configuration](#high-traffic-configuration)
    - [Low-Latency Configuration](#low-latency-configuration)
    - [Resource-Constrained Environment](#resource-constrained-environment)
  - [Security Configurations](#security-configurations)
    - [Maximum Security Setup](#maximum-security-setup)
    - [API Key Rotation](#api-key-rotation)
    - [Rate Limiting Strategies](#rate-limiting-strategies)
  - [Troubleshooting Configurations](#troubleshooting-configurations)
    - [Debug Configuration](#debug-configuration)
    - [Logging Configuration](#logging-configuration)
    - [Error Recovery Configuration](#error-recovery-configuration)

## Basic Configurations

### OpenAI Configuration

**Minimal Setup (.env):**

```bash
# Basic OpenAI configuration
OPENAI_API_KEY=sk-your_official_api_key_here
```

**Recommended Setup (.env):**

```bash
# OpenAI Provider Configuration
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your_official_api_key_here
OPENAI_API_MODEL=gpt-4o
OPENAI_API_BASE_URL=https://api.openai.com

# Basic Security
AUTH_SECRET_KEY=your_secure_secret_key_here
MAX_REQUEST_PER_HOUR=100

# Performance
TIMEOUT_MS=60000
NODE_ENV=production
```

### Azure OpenAI Configuration

**Basic Azure Setup (.env):**

```bash
# Azure OpenAI Provider Configuration
AI_PROVIDER=azure
AZURE_OPENAI_API_KEY=your_azure_api_key_here
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-4o-deployment
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# Security
AUTH_SECRET_KEY=your_secure_secret_key_here
MAX_REQUEST_PER_HOUR=200

# Performance
TIMEOUT_MS=90000
NODE_ENV=production
```

## Advanced Configurations

### Production Configuration

**High-Performance Production (.env):**

```bash
# Provider Configuration
AI_PROVIDER=openai
OPENAI_API_KEY=sk-prod_api_key_here
OPENAI_API_MODEL=gpt-4o
OPENAI_API_BASE_URL=https://api.openai.com

# Security Configuration
AUTH_SECRET_KEY=super_secure_production_key_with_high_entropy
MAX_REQUEST_PER_HOUR=1000
RATE_LIMIT_WINDOW_MS=3600000
RATE_LIMIT_MAX_REQUESTS=1000

# Performance Configuration
TIMEOUT_MS=30000
RETRY_MAX_ATTEMPTS=5
RETRY_BASE_DELAY=2000

# Reasoning Models
ENABLE_REASONING_MODELS=true
REASONING_MODEL_TIMEOUT_MS=180000

# Production Environment
NODE_ENV=production
LOG_LEVEL=warn
ENABLE_CORS=false

# Security Headers
ENABLE_SECURITY_HEADERS=true
CSP_POLICY=strict
HSTS_MAX_AGE=31536000
```

### Development Configuration

**Developer-Friendly Setup (.env):**

```bash
# Provider Configuration
AI_PROVIDER=openai
OPENAI_API_KEY=sk-dev_api_key_here
OPENAI_API_MODEL=gpt-4o-mini
OPENAI_API_BASE_URL=https://api.openai.com

# Relaxed Security for Development
AUTH_SECRET_KEY=dev_secret_key
MAX_REQUEST_PER_HOUR=50

# Development-Optimized Performance
TIMEOUT_MS=120000
RETRY_MAX_ATTEMPTS=2
RETRY_BASE_DELAY=500

# Development Environment
NODE_ENV=development
LOG_LEVEL=debug
ENABLE_CORS=true
OPENAI_API_DISABLE_DEBUG=false

# Development Features
ENABLE_REASONING_MODELS=true
REASONING_MODEL_TIMEOUT_MS=300000
```

### High-Security Configuration

**Maximum Security Setup (.env):**

```bash
# Provider Configuration
AI_PROVIDER=azure
AZURE_OPENAI_API_KEY=highly_secure_azure_key
AZURE_OPENAI_ENDPOINT=https://secure-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=secure-gpt-4o-deployment
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# Maximum Security
AUTH_SECRET_KEY=extremely_long_and_secure_key_with_special_chars_123!@#
MAX_REQUEST_PER_HOUR=100
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=25   # Very restrictive

# Strict Performance Limits
TIMEOUT_MS=15000
RETRY_MAX_ATTEMPTS=1
RETRY_BASE_DELAY=5000

# Security Environment
NODE_ENV=production
LOG_LEVEL=error
ENABLE_CORS=false

# Enhanced Security Features
ENABLE_SECURITY_HEADERS=true
STRICT_CSP=true
DISABLE_X_POWERED_BY=true
ENABLE_REQUEST_LOGGING=false  # Disable for privacy
```

## Provider-Specific Examples

### OpenAI with Reasoning Models

**Reasoning-Optimized Configuration (.env):**

```bash
# OpenAI with Reasoning Focus
AI_PROVIDER=openai
OPENAI_API_KEY=sk-reasoning_optimized_key_here
OPENAI_API_MODEL=o1-preview
OPENAI_API_BASE_URL=https://api.openai.com

# Reasoning Model Configuration
ENABLE_REASONING_MODELS=true
REASONING_MODEL_TIMEOUT_MS=300000  # 5 minutes for complex reasoning
DEFAULT_REASONING_MODEL=o1-preview
FALLBACK_MODEL=gpt-4o

# Optimized for Reasoning Workloads
TIMEOUT_MS=300000
RETRY_MAX_ATTEMPTS=2
RETRY_BASE_DELAY=10000

# Rate Limiting for Reasoning Models
MAX_REQUEST_PER_HOUR=20  # Lower limit for expensive reasoning models
RATE_LIMIT_WINDOW_MS=3600000

# Performance
NODE_ENV=production
LOG_LEVEL=info
```

### Azure OpenAI Enterprise Setup

**Enterprise Azure Configuration (.env):**

```bash
# Azure OpenAI Enterprise Configuration
AI_PROVIDER=azure
AZURE_OPENAI_API_KEY=enterprise_azure_key_with_managed_identity
AZURE_OPENAI_ENDPOINT=https://enterprise-openai.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=enterprise-gpt-4o-deployment
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# Enterprise Security
AUTH_SECRET_KEY=enterprise_grade_secret_key_with_rotation
MAX_REQUEST_PER_HOUR=5000
RATE_LIMIT_WINDOW_MS=3600000
RATE_LIMIT_MAX_REQUESTS=5000

# Enterprise Performance
TIMEOUT_MS=45000
RETRY_MAX_ATTEMPTS=3
RETRY_BASE_DELAY=1000

# Enterprise Features
ENABLE_REASONING_MODELS=true
REASONING_MODEL_TIMEOUT_MS=120000
ENABLE_AUDIT_LOGGING=true
ENABLE_COMPLIANCE_MODE=true

# Enterprise Environment
NODE_ENV=production
LOG_LEVEL=info
ENABLE_METRICS=true
ENABLE_HEALTH_CHECKS=true

# Azure-Specific Configuration
AZURE_MANAGED_IDENTITY=true
AZURE_TENANT_ID=your_tenant_id
AZURE_SUBSCRIPTION_ID=your_subscription_id
```

### Multi-Provider Fallback

**Fallback Configuration (docker-compose.yml):**

```yaml
version: 3.8

services:
  chatgpt-web-primary:
    image: chenzhaoyu94/chatgpt-web
    environment:
      # Primary: OpenAI
      AI_PROVIDER: openai
      OPENAI_API_KEY: sk-primary_openai_key
      OPENAI_API_MODEL: gpt-4o

      # Fallback Configuration
      ENABLE_PROVIDER_FALLBACK: true
      FALLBACK_PROVIDER: azure
      AZURE_OPENAI_API_KEY: fallback_azure_key
      AZURE_OPENAI_ENDPOINT: https://fallback.openai.azure.com
      AZURE_OPENAI_DEPLOYMENT: fallback-deployment

      # Health Check Configuration
      HEALTH_CHECK_INTERVAL: 30000
      PROVIDER_HEALTH_TIMEOUT: 5000

    ports:
      - 3002:3002
    restart: unless-stopped
    healthcheck:
      test:
        - CMD
        - curl
        - -f
        - http://localhost:3002/health
      interval: 30s
      timeout: 10s
      retries: 3
```

## Deployment Configurations

### Docker Configuration

**Production Docker Setup (docker-compose.yml):**

```yaml
version: 3.8

services:
  chatgpt-web:
    image: chenzhaoyu94/chatgpt-web:latest
    container_name: chatgpt-web-prod
    restart: unless-stopped

    environment:
      # Provider Configuration
      AI_PROVIDER: openai
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      OPENAI_API_MODEL: gpt-4o

      # Security
      AUTH_SECRET_KEY: ${AUTH_SECRET_KEY}
      MAX_REQUEST_PER_HOUR: 1000

      # Performance
      TIMEOUT_MS: 30000
      RETRY_MAX_ATTEMPTS: 3

      # Production Settings
      NODE_ENV: production
      LOG_LEVEL: warn

    ports:
      - 127.0.0.1:3002:3002

    volumes:
      - ./logs:/app/logs
      - ./config:/app/config

    networks:
      - chatgpt-network

    healthcheck:
      test:
        - CMD
        - curl
        - -f
        - http://localhost:3002/health
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

    deploy:
      resources:
        limits:
          cpus: 2.0
          memory: 1G
        reservations:
          cpus: 0.5
          memory: 512M

  nginx:
    image: nginx:alpine
    container_name: chatgpt-nginx
    restart: unless-stopped

    ports:
      - 80:80
      - 443:443

    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl

    depends_on:
      - chatgpt-web

    networks:
      - chatgpt-network

networks:
  chatgpt-network:
    driver: bridge
```

### Kubernetes Configuration

**Kubernetes Deployment (k8s-deployment.yaml):**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: chatgpt-web
  labels:
    app: chatgpt-web
spec:
  replicas: 3
  selector:
    matchLabels:
      app: chatgpt-web
  template:
    metadata:
      labels:
        app: chatgpt-web
    spec:
      containers:
        - name: chatgpt-web
          image: chenzhaoyu94/chatgpt-web:latest
          ports:
            - containerPort: 3002
          env:
            - name: AI_PROVIDER
              value: openai
            - name: OPENAI_API_KEY
              valueFrom:
                secretKeyRef:
                  name: chatgpt-secrets
                  key: openai-api-key
            - name: AUTH_SECRET_KEY
              valueFrom:
                secretKeyRef:
                  name: chatgpt-secrets
                  key: auth-secret-key
            - name: NODE_ENV
              value: production
            - name: MAX_REQUEST_PER_HOUR
              value: 1000
            - name: TIMEOUT_MS
              value: 30000

          resources:
            requests:
              memory: 256Mi
              cpu: 250m
            limits:
              memory: 512Mi
              cpu: 500m

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

---
apiVersion: v1
kind: Service
metadata:
  name: chatgpt-web-service
spec:
  selector:
    app: chatgpt-web
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3002
  type: LoadBalancer

---
apiVersion: v1
kind: Secret
metadata:
  name: chatgpt-secrets
type: Opaque
data:
  openai-api-key: <base64-encoded-api-key>
  auth-secret-key: <base64-encoded-secret-key>
```

### Railway Configuration

**Railway Configuration (.env):**

```bash
# Railway-Optimized Configuration
PORT=3002
AI_PROVIDER=openai
OPENAI_API_KEY=sk-railway_deployment_key
OPENAI_API_MODEL=gpt-4o

# Railway-Specific Settings
NODE_ENV=production
LOG_LEVEL=info
TIMEOUT_MS=25000  # Railway has 30s timeout limit

# Security for Railway
AUTH_SECRET_KEY=railway_secure_key
MAX_REQUEST_PER_HOUR=500

# Railway Performance Optimization
RETRY_MAX_ATTEMPTS=2
RETRY_BASE_DELAY=1000
ENABLE_COMPRESSION=true

# Railway Monitoring
ENABLE_HEALTH_CHECKS=true
HEALTH_CHECK_PATH=/health
```

## Proxy Configurations

### HTTP/HTTPS Proxy

**Corporate Proxy Setup (.env):**

```bash
# Provider Configuration
AI_PROVIDER=openai
OPENAI_API_KEY=sk-corporate_api_key
OPENAI_API_MODEL=gpt-4o

# HTTP/HTTPS Proxy Configuration
HTTPS_PROXY=http://proxy.company.com:8080
HTTP_PROXY=http://proxy.company.com:8080
ALL_PROXY=http://proxy.company.com:8080

# Proxy Authentication (if required)
PROXY_USERNAME=corporate_user
PROXY_PASSWORD=corporate_password

# Corporate Security
AUTH_SECRET_KEY=corporate_secret_key
MAX_REQUEST_PER_HOUR=200
TIMEOUT_MS=45000  # Longer timeout for proxy

# Corporate Environment
NODE_ENV=production
LOG_LEVEL=info
ENABLE_PROXY_LOGGING=true
```

### SOCKS Proxy

**SOCKS Proxy Configuration (.env):**

```bash
# Provider Configuration
AI_PROVIDER=openai
OPENAI_API_KEY=sk-socks_proxy_key
OPENAI_API_MODEL=gpt-4o

# SOCKS Proxy Configuration
SOCKS_PROXY_HOST=socks.proxy.com
SOCKS_PROXY_PORT=1080
SOCKS_PROXY_USERNAME=socks_user
SOCKS_PROXY_PASSWORD=socks_password

# SOCKS-Optimized Settings
TIMEOUT_MS=60000
RETRY_MAX_ATTEMPTS=3
RETRY_BASE_DELAY=2000

# Security
AUTH_SECRET_KEY=socks_secure_key
MAX_REQUEST_PER_HOUR=100

# Environment
NODE_ENV=production
LOG_LEVEL=info
```

### Corporate Firewall Setup

**Firewall-Friendly Configuration (.env):**

```bash
# Provider Configuration
AI_PROVIDER=azure  # Often better for corporate environments
AZURE_OPENAI_API_KEY=corporate_azure_key
AZURE_OPENAI_ENDPOINT=https://corporate.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=corporate-gpt-4o
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# Firewall Configuration
HTTPS_PROXY=http://firewall.company.com:3128
NO_PROXY=localhost,127.0.0.1,.company.com
PROXY_BYPASS_LIST=internal.company.com,*.local

# Corporate Security Requirements
AUTH_SECRET_KEY=firewall_compliant_key
MAX_REQUEST_PER_HOUR=50
ENABLE_REQUEST_LOGGING=true
ENABLE_AUDIT_TRAIL=true

# Firewall-Friendly Timeouts
TIMEOUT_MS=90000
RETRY_MAX_ATTEMPTS=2
RETRY_BASE_DELAY=5000

# Corporate Compliance
NODE_ENV=production
LOG_LEVEL=info
ENABLE_COMPLIANCE_MODE=true
DATA_RESIDENCY=EU  # or US, APAC as required
```

## Performance Tuning

### High-Traffic Configuration

**High-Throughput Setup (.env):**

```bash
# Provider Configuration
AI_PROVIDER=openai
OPENAI_API_KEY=sk-high_traffic_key
OPENAI_API_MODEL=gpt-4o-mini  # Faster model for high traffic

# High-Traffic Rate Limiting
MAX_REQUEST_PER_HOUR=10000
RATE_LIMIT_WINDOW_MS=60000  # 1-minute windows
RATE_LIMIT_MAX_REQUESTS=200  # 200 requests per minute

# Performance Optimization
TIMEOUT_MS=15000  # Shorter timeout for faster failover
RETRY_MAX_ATTEMPTS=2
RETRY_BASE_DELAY=500

# High-Traffic Features
ENABLE_CONNECTION_POOLING=true
CONNECTION_POOL_SIZE=50
KEEP_ALIVE_TIMEOUT=30000

# Caching Configuration
ENABLE_RESPONSE_CACHING=true
CACHE_TTL=300000  # 5 minutes
CACHE_MAX_SIZE=1000

# Environment
NODE_ENV=production
LOG_LEVEL=warn  # Reduce logging overhead
ENABLE_METRICS=true
```

### Low-Latency Configuration

**Latency-Optimized Setup (.env):**

```bash
# Provider Configuration
AI_PROVIDER=openai
OPENAI_API_KEY=sk-low_latency_key
OPENAI_API_MODEL=gpt-4o-mini
OPENAI_API_BASE_URL=https://api.openai.com

# Low-Latency Settings
TIMEOUT_MS=5000  # Very short timeout
RETRY_MAX_ATTEMPTS=1  # No retries for lowest latency
RETRY_BASE_DELAY=0

# Connection Optimization
ENABLE_HTTP2=true
KEEP_ALIVE=true
KEEP_ALIVE_TIMEOUT=5000
CONNECTION_TIMEOUT=2000

# Minimal Processing
ENABLE_REQUEST_VALIDATION=false  # Skip non-essential validation
ENABLE_RESPONSE_PROCESSING=false
ENABLE_LOGGING=false

# Performance
NODE_ENV=production
LOG_LEVEL=error
ENABLE_COMPRESSION=false  # Skip compression for speed
```

### Resource-Constrained Environment

**Low-Resource Configuration (.env):**

```bash
# Provider Configuration
AI_PROVIDER=openai
OPENAI_API_KEY=sk-resource_constrained_key
# Resource Constraints
OPENAI_API_MODEL=gpt-4o-mini  # Cost-effective model for resource-constrained environments
MAX_REQUEST_PER_HOUR=50
RATE_LIMIT_WINDOW_MS=3600000
RATE_LIMIT_MAX_REQUESTS=50

# Memory Optimization
TIMEOUT_MS=30000
RETRY_MAX_ATTEMPTS=1
RETRY_BASE_DELAY=1000

# Minimal Features
ENABLE_REASONING_MODELS=false
ENABLE_CACHING=false
ENABLE_METRICS=false
ENABLE_DETAILED_LOGGING=false

# Resource-Friendly Settings
NODE_ENV=production
LOG_LEVEL=error
GC_INTERVAL=60000  # Frequent garbage collection
MEMORY_LIMIT=256  # MB
```

## Security Configurations

### Maximum Security Setup

**Ultra-Secure Configuration (.env):**

```bash
# Provider Configuration (Azure for enterprise security)
AI_PROVIDER=azure
AZURE_OPENAI_API_KEY=ultra_secure_azure_key
AZURE_OPENAI_ENDPOINT=https://secure.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=secure-deployment
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# Maximum Security
AUTH_SECRET_KEY=ultra_long_secure_key_with_entropy_123456789!@#$%^&*()
MAX_REQUEST_PER_HOUR=10
RATE_LIMIT_WINDOW_MS=3600000
RATE_LIMIT_MAX_REQUESTS=10

# Security Headers
ENABLE_SECURITY_HEADERS=true
CSP_POLICY=strict-dynamic
HSTS_MAX_AGE=63072000  # 2 years
ENABLE_REFERRER_POLICY=true
ENABLE_PERMISSIONS_POLICY=true

# Request Security
ENABLE_INPUT_SANITIZATION=true
ENABLE_XSS_PROTECTION=true
ENABLE_SQL_INJECTION_PROTECTION=true
MAX_REQUEST_SIZE=1024  # 1KB limit

# Audit and Monitoring
ENABLE_AUDIT_LOGGING=true
ENABLE_SECURITY_MONITORING=true
ENABLE_INTRUSION_DETECTION=true
LOG_SECURITY_EVENTS=true

# Environment
NODE_ENV=production
LOG_LEVEL=warn
DISABLE_X_POWERED_BY=true
HIDE_SERVER_HEADER=true
```

### API Key Rotation

**Key Rotation Configuration (.env):**

```bash
# Primary Provider Configuration
AI_PROVIDER=openai
OPENAI_API_KEY=sk-current_primary_key
OPENAI_API_KEY_BACKUP=sk-backup_key_for_rotation

# Key Rotation Settings
ENABLE_KEY_ROTATION=true
KEY_ROTATION_INTERVAL=86400000  # 24 hours
KEY_ROTATION_OVERLAP=3600000    # 1 hour overlap

# Rotation Monitoring
ENABLE_KEY_HEALTH_CHECK=true
KEY_HEALTH_CHECK_INTERVAL=300000  # 5 minutes
KEY_FAILURE_THRESHOLD=3

# Security During Rotation
ENABLE_ROTATION_LOGGING=true
ROTATION_NOTIFICATION_WEBHOOK=https://alerts.company.com/webhook
ENABLE_ROTATION_ALERTS=true

# Environment
NODE_ENV=production
LOG_LEVEL=info
```

### Rate Limiting Strategies

**Advanced Rate Limiting (.env):**

```bash
# Provider Configuration
AI_PROVIDER=openai
OPENAI_API_KEY=sk-rate_limited_key
OPENAI_API_MODEL=gpt-4o

# Tiered Rate Limiting
ENABLE_TIERED_RATE_LIMITING=true

# Tier 1: Basic Users
TIER1_MAX_REQUESTS_PER_HOUR=10
TIER1_MAX_REQUESTS_PER_MINUTE=2
TIER1_BURST_LIMIT=5

# Tier 2: Premium Users
TIER2_MAX_REQUESTS_PER_HOUR=100
TIER2_MAX_REQUESTS_PER_MINUTE=10
TIER2_BURST_LIMIT=20

# Tier 3: Enterprise Users
TIER3_MAX_REQUESTS_PER_HOUR=1000
TIER3_MAX_REQUESTS_PER_MINUTE=50
TIER3_BURST_LIMIT=100

# Rate Limiting Behavior
RATE_LIMIT_STRATEGY=sliding_window
RATE_LIMIT_REDIS_URL=redis://localhost:6379
ENABLE_RATE_LIMIT_HEADERS=true
RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS=false

# Environment
NODE_ENV=production
LOG_LEVEL=info
```

## Troubleshooting Configurations

### Debug Configuration

**Full Debug Setup (.env):**

```bash
# Provider Configuration
AI_PROVIDER=openai
OPENAI_API_KEY=sk-debug_key
OPENAI_API_MODEL=gpt-4o
OPENAI_API_DISABLE_DEBUG=false

# Debug Settings
NODE_ENV=development
LOG_LEVEL=debug
ENABLE_VERBOSE_LOGGING=true
ENABLE_REQUEST_RESPONSE_LOGGING=true

# Debug Features
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_MEMORY_MONITORING=true
ENABLE_ERROR_STACK_TRACES=true
ENABLE_DEBUG_ENDPOINTS=true

# Extended Timeouts for Debugging
TIMEOUT_MS=300000  # 5 minutes
RETRY_MAX_ATTEMPTS=1  # No retries to see original errors
RETRY_BASE_DELAY=0

# Debug Security (Relaxed)
AUTH_SECRET_KEY=debug_key
MAX_REQUEST_PER_HOUR=1000
ENABLE_CORS=true

# Debug Output
ENABLE_CONSOLE_LOGGING=true
ENABLE_FILE_LOGGING=true
LOG_FILE_PATH=./logs/debug.log
LOG_ROTATION=daily
```

### Logging Configuration

**Comprehensive Logging (.env):**

```bash
# Provider Configuration
AI_PROVIDER=openai
OPENAI_API_KEY=sk-logging_key
OPENAI_API_MODEL=gpt-4o

# Logging Configuration
LOG_LEVEL=info
ENABLE_STRUCTURED_LOGGING=true
LOG_FORMAT=json

# Log Destinations
ENABLE_CONSOLE_LOGGING=true
ENABLE_FILE_LOGGING=true
ENABLE_SYSLOG=true
ENABLE_REMOTE_LOGGING=true

# File Logging
LOG_FILE_PATH=./logs/app.log
LOG_MAX_SIZE=100MB
LOG_MAX_FILES=10
LOG_ROTATION=daily

# Remote Logging
REMOTE_LOG_ENDPOINT=https://logs.company.com/api/logs
REMOTE_LOG_API_KEY=remote_logging_key
REMOTE_LOG_BATCH_SIZE=100

# Log Content
LOG_REQUESTS=true
LOG_RESPONSES=false  # Don't log response content for privacy
LOG_ERRORS=true
LOG_PERFORMANCE=true
LOG_SECURITY_EVENTS=true

# Environment
NODE_ENV=production
```

### Error Recovery Configuration

**Resilient Configuration (.env):**

```bash
# Provider Configuration with Fallback
AI_PROVIDER=openai
OPENAI_API_KEY=sk-primary_key
OPENAI_API_MODEL=gpt-4o

# Fallback Configuration
ENABLE_PROVIDER_FALLBACK=true
FALLBACK_PROVIDER=azure
AZURE_OPENAI_API_KEY=fallback_azure_key
AZURE_OPENAI_ENDPOINT=https://fallback.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=fallback-deployment

# Error Recovery
RETRY_MAX_ATTEMPTS=5
RETRY_BASE_DELAY=1000
RETRY_EXPONENTIAL_BACKOFF=true
RETRY_MAX_DELAY=30000
RETRY_JITTER=true

# Circuit Breaker
ENABLE_CIRCUIT_BREAKER=true
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_RECOVERY_TIMEOUT=60000
CIRCUIT_BREAKER_MONITORING_PERIOD=10000

# Health Checks
ENABLE_HEALTH_CHECKS=true
HEALTH_CHECK_INTERVAL=30000
HEALTH_CHECK_TIMEOUT=5000
HEALTH_CHECK_RETRIES=3

# Graceful Degradation
ENABLE_GRACEFUL_DEGRADATION=true
DEGRADED_MODE_TIMEOUT=10000
DEGRADED_MODE_MAX_REQUESTS=10

# Environment
NODE_ENV=production
LOG_LEVEL=info
ENABLE_ERROR_RECOVERY_LOGGING=true
```

These configuration examples cover a wide range of deployment scenarios and use cases. Choose the configuration that best matches your requirements and modify as needed for your specific environment.
