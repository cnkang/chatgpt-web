# Docker Deployment Guide

This guide covers deploying the ChatGPT Web monorepo using Docker containers.

## Quick Start

### Using Docker Compose (Recommended)

1. **Create docker-compose.yml:**

```yaml
version: '3.8'

services:
  chatgpt-web:
    image: chenzhaoyu94/chatgpt-web:latest
    container_name: chatgpt-web
    restart: unless-stopped

    ports:
      - '127.0.0.1:3002:3002'

    environment:
      # Required: OpenAI API Configuration
      OPENAI_API_KEY: sk-your_official_api_key_here
      AI_PROVIDER: openai
      OPENAI_API_MODEL: gpt-4o

      # Optional: Security
      AUTH_SECRET_KEY: your_secret_key
      MAX_REQUEST_PER_HOUR: 100

      # Optional: Performance
      TIMEOUT_MS: 60000
      RETRY_MAX_ATTEMPTS: 3

      # Environment
      NODE_ENV: production
      LOG_LEVEL: info

    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3002/health']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

2. **Start the service:**

```bash
docker-compose up -d
```

3. **Access the application:**

Open <http://localhost:3002> in your browser.

### Using Docker Run

```bash
# Basic deployment
docker run -d \
  --name chatgpt-web \
  --restart unless-stopped \
  -p 127.0.0.1:3002:3002 \
  -e OPENAI_API_KEY=sk-your_api_key_here \
  -e AI_PROVIDER=openai \
  -e NODE_ENV=production \
  chenzhaoyu94/chatgpt-web:latest

# With additional configuration
docker run -d \
  --name chatgpt-web \
  --restart unless-stopped \
  -p 127.0.0.1:3002:3002 \
  -e OPENAI_API_KEY=sk-your_api_key_here \
  -e AI_PROVIDER=openai \
  -e OPENAI_API_MODEL=gpt-4o \
  -e AUTH_SECRET_KEY=your_secret_key \
  -e MAX_REQUEST_PER_HOUR=100 \
  -e TIMEOUT_MS=60000 \
  -e NODE_ENV=production \
  -e LOG_LEVEL=info \
  chenzhaoyu94/chatgpt-web:latest
```

## Environment Configuration

### Required Variables

```yaml
environment:
  # OpenAI API Key (Required)
  OPENAI_API_KEY: sk-your_official_api_key_here
```

### Provider Configuration

**OpenAI Configuration:**

```yaml
environment:
  AI_PROVIDER: openai
  OPENAI_API_KEY: sk-your_api_key_here
  OPENAI_API_MODEL: gpt-4o
  OPENAI_API_BASE_URL: https://api.openai.com
```

**Azure OpenAI Configuration:**

```yaml
environment:
  AI_PROVIDER: azure
  AZURE_OPENAI_API_KEY: your_azure_api_key
  AZURE_OPENAI_ENDPOINT: https://your-resource.openai.azure.com
  AZURE_OPENAI_DEPLOYMENT: gpt-4o-deployment
  AZURE_OPENAI_API_VERSION: 2024-02-15-preview
```

### Security Configuration

```yaml
environment:
  # Authentication
  AUTH_SECRET_KEY: your_secure_secret_key

  # Rate Limiting
  MAX_REQUEST_PER_HOUR: 100
  RATE_LIMIT_WINDOW_MS: 3600000
  RATE_LIMIT_MAX_REQUESTS: 100
```

### Performance Configuration

```yaml
environment:
  # Timeouts
  TIMEOUT_MS: 60000
  REASONING_MODEL_TIMEOUT_MS: 120000

  # Retry Logic
  RETRY_MAX_ATTEMPTS: 3
  RETRY_BASE_DELAY: 1000

  # Features
  ENABLE_REASONING_MODELS: true
```

## Production Deployment

### Production Docker Compose

```yaml
version: '3.8'

services:
  chatgpt-web:
    image: chenzhaoyu94/chatgpt-web:latest
    container_name: chatgpt-web-prod
    restart: unless-stopped

    environment:
      # Provider Configuration
      AI_PROVIDER: ${AI_PROVIDER:-openai}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      OPENAI_API_MODEL: ${OPENAI_API_MODEL:-gpt-4o}

      # Security
      AUTH_SECRET_KEY: ${AUTH_SECRET_KEY}
      MAX_REQUEST_PER_HOUR: ${MAX_REQUEST_PER_HOUR:-1000}

      # Performance
      TIMEOUT_MS: ${TIMEOUT_MS:-30000}
      RETRY_MAX_ATTEMPTS: ${RETRY_MAX_ATTEMPTS:-3}

      # Production Settings
      NODE_ENV: production
      LOG_LEVEL: warn

    ports:
      - '127.0.0.1:3002:3002'

    volumes:
      - ./logs:/app/logs
      - ./config:/app/config

    networks:
      - chatgpt-network

    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3002/health']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M

  nginx:
    image: nginx:alpine
    container_name: chatgpt-nginx
    restart: unless-stopped

    ports:
      - '80:80'
      - '443:443'

    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro

    depends_on:
      - chatgpt-web

    networks:
      - chatgpt-network

networks:
  chatgpt-network:
    driver: bridge

volumes:
  logs:
  config:
```

### Environment File (.env)

```bash
# Provider Configuration
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your_production_api_key_here
OPENAI_API_MODEL=gpt-4o

# Security
AUTH_SECRET_KEY=your_very_secure_production_key
MAX_REQUEST_PER_HOUR=1000

# Performance
TIMEOUT_MS=30000
RETRY_MAX_ATTEMPTS=3

# Optional: Proxy Configuration
# HTTPS_PROXY=http://proxy:8080
# SOCKS_PROXY_HOST=proxy
# SOCKS_PROXY_PORT=1080
```

## Nginx Configuration

### Basic Nginx Configuration

Create `nginx/nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream chatgpt-web {
        server chatgpt-web:3002;
    }

    server {
        listen 80;
        server_name your-domain.com;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";

        # Proxy configuration
        location / {
            proxy_pass http://chatgpt-web;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;

            # Disable buffering for streaming responses
            proxy_buffering off;
        }

        # Anti-crawler protection
        if ($http_user_agent ~* "bot|crawler|spider|scraper") {
            return 403;
        }
    }
}
```

### SSL Configuration

For HTTPS support, add SSL configuration:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # ... rest of configuration
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

## Building Custom Images

### Build from Source

1. **Clone the repository:**

```bash
git clone https://github.com/your-org/chatgpt-web.git
cd chatgpt-web
```

2. **Build the image:**

```bash
# Build for current architecture
docker build -t chatgpt-web:local .

# Build for multiple architectures
docker buildx build --platform linux/amd64,linux/arm64 -t chatgpt-web:multi-arch .
```

3. **Run your custom image:**

```bash
docker run -d \
  --name chatgpt-web-custom \
  -p 3002:3002 \
  -e OPENAI_API_KEY=sk-your_key_here \
  chatgpt-web:local
```

### Multi-stage Build Optimization

The included Dockerfile uses multi-stage builds for optimization:

```dockerfile
# Build stage
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Production stage
FROM node:24-alpine AS production
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3002
CMD ["npm", "start"]
```

## Monitoring and Logging

### Health Checks

The container includes health check endpoints:

```bash
# Check container health
docker ps

# Manual health check
curl http://localhost:3002/health
```

### Log Management

```bash
# View logs
docker logs chatgpt-web

# Follow logs
docker logs -f chatgpt-web

# View logs with timestamps
docker logs -t chatgpt-web
```

### Log Rotation

Configure log rotation in docker-compose.yml:

```yaml
services:
  chatgpt-web:
    logging:
      driver: 'json-file'
      options:
        max-size: '10m'
        max-file: '3'
```

## Scaling and Load Balancing

### Multiple Instances

```yaml
version: '3.8'

services:
  chatgpt-web:
    image: chenzhaoyu94/chatgpt-web:latest
    deploy:
      replicas: 3
    environment:
      # ... configuration
    networks:
      - chatgpt-network

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx-lb.conf:/etc/nginx/nginx.conf:ro
    ports:
      - '80:80'
    depends_on:
      - chatgpt-web
    networks:
      - chatgpt-network
```

### Load Balancer Configuration

Create `nginx-lb.conf`:

```nginx
upstream chatgpt-backend {
    least_conn;
    server chatgpt-web_chatgpt-web_1:3002;
    server chatgpt-web_chatgpt-web_2:3002;
    server chatgpt-web_chatgpt-web_3:3002;
}

server {
    listen 80;

    location / {
        proxy_pass http://chatgpt-backend;
        # ... proxy configuration
    }
}
```

## Troubleshooting

### Common Issues

#### Container Won't Start

```bash
# Check logs
docker logs chatgpt-web

# Check environment variables
docker exec chatgpt-web env | grep -E "(OPENAI|AZURE)"

# Verify configuration
docker exec chatgpt-web curl -f http://localhost:3002/health
```

#### API Connection Issues

```bash
# Test API connectivity from container
docker exec chatgpt-web curl -I https://api.openai.com

# Check proxy configuration
docker exec chatgpt-web env | grep -i proxy
```

#### Performance Issues

```bash
# Check resource usage
docker stats chatgpt-web

# Check container limits
docker inspect chatgpt-web | grep -A 10 "Resources"
```

### Debug Mode

Run container in debug mode:

```bash
docker run -it --rm \
  -e NODE_ENV=development \
  -e LOG_LEVEL=debug \
  -e OPENAI_API_KEY=sk-your_key_here \
  chenzhaoyu94/chatgpt-web:latest
```

## Security Considerations

### Container Security

1. **Run as non-root user:**

```dockerfile
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs
```

2. **Use specific image tags:**

```yaml
services:
  chatgpt-web:
    image: chenzhaoyu94/chatgpt-web:v2.11.1 # Specific version
```

3. **Limit container resources:**

```yaml
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 512M
```

### Network Security

1. **Bind to localhost only:**

```yaml
ports:
  - '127.0.0.1:3002:3002' # Only accessible from localhost
```

2. **Use custom networks:**

```yaml
networks:
  chatgpt-network:
    driver: bridge
    internal: true # No external access
```

3. **Environment variable security:**

```bash
# Use Docker secrets for sensitive data
echo "sk-your_api_key" | docker secret create openai_key -
```

## Backup and Recovery

### Data Backup

```bash
# Backup logs
docker cp chatgpt-web:/app/logs ./backup/logs-$(date +%Y%m%d)

# Backup configuration
docker cp chatgpt-web:/app/config ./backup/config-$(date +%Y%m%d)
```

### Container Recovery

```bash
# Stop and remove container
docker stop chatgpt-web
docker rm chatgpt-web

# Recreate with same configuration
docker-compose up -d
```

This guide provides comprehensive Docker deployment options for the ChatGPT Web monorepo, from simple single-container deployments to production-ready multi-container setups with load balancing and monitoring.
