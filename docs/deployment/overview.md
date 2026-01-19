# Deployment Guide

This guide covers deployment options for the ChatGPT Web monorepo application.

## Quick Start

### Development Mode

```bash
# Using start scripts
./start.sh              # Linux/macOS
start.cmd               # Windows

# Using pnpm directly
pnpm dev                # Start all services
pnpm dev:web            # Frontend only
pnpm dev:api            # Backend only
```

### Production Mode

```bash
# Using start scripts
./start-prod.sh         # Linux/macOS
start-prod.cmd          # Windows

# Using pnpm directly
pnpm build              # Build all packages
pnpm start              # Start production server
```

## Docker Deployment

### Production Docker

```bash
# Build and run with Docker Compose
cd docker-compose
docker-compose up -d

# Or build manually
docker build -t chatgpt-web .
docker run -p 3002:3002 \
  -e OPENAI_API_KEY=sk-xxx \
  -e AI_PROVIDER=openai \
  chatgpt-web
```

### Development Docker

```bash
# Development with hot reloading
cd docker-compose
docker-compose -f docker-compose.dev.yml up -d
```

### Environment Variables

Create a `.env` file in the project root:

```bash
# AI Provider Configuration
AI_PROVIDER=openai                    # 'openai' or 'azure'

# OpenAI Configuration (when AI_PROVIDER=openai)
OPENAI_API_KEY=sk-xxx                 # Required: Your OpenAI API key
OPENAI_API_BASE_URL=https://api.openai.com  # Optional: Custom base URL
OPENAI_API_MODEL=gpt-4o               # Optional: Default model

# Azure OpenAI Configuration (when AI_PROVIDER=azure)
AZURE_OPENAI_API_KEY=xxx              # Required for Azure
AZURE_OPENAI_ENDPOINT=https://xxx.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-4o-deployment

# Security Configuration
AUTH_SECRET_KEY=your-secret-key       # Optional: Access control

# Rate Limiting
MAX_REQUEST_PER_HOUR=100              # Optional: Rate limit (0 = unlimited)

# Timeout Configuration
TIMEOUT_MS=60000                      # Request timeout in milliseconds

# Proxy Configuration (optional)
SOCKS_PROXY_HOST=
SOCKS_PROXY_PORT=
SOCKS_PROXY_USERNAME=
SOCKS_PROXY_PASSWORD=
HTTPS_PROXY=
```

## Kubernetes Deployment

### Prerequisites

- Kubernetes cluster (1.19+)
- kubectl configured
- NGINX Ingress Controller (optional)

### Deploy to Kubernetes

```bash
# Create secrets first
kubectl create secret generic chatgpt-web-secrets \
  --from-literal=openai-api-key=sk-xxx \
  --from-literal=auth-secret-key=your-secret-key

# Deploy application
kubectl apply -f kubernetes/deploy.yaml

# Deploy ingress (optional)
kubectl apply -f kubernetes/ingress.yaml
```

### Configuration

Edit `kubernetes/deploy.yaml` to configure:

- Environment variables
- Resource limits
- Replica count
- Health check endpoints

Edit `kubernetes/ingress.yaml` to configure:

- Domain name
- TLS certificates
- Rate limiting
- Security headers

## Cloud Platform Deployment

### Railway

1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Railway will automatically detect and deploy the monorepo

### Vercel (Frontend Only)

```bash
# Deploy frontend to Vercel
cd apps/web
vercel --prod
```

### Heroku

```bash
# Create Heroku app
heroku create your-app-name

# Set environment variables
heroku config:set OPENAI_API_KEY=sk-xxx
heroku config:set AI_PROVIDER=openai

# Deploy
git push heroku main
```

## Manual Deployment

### Prerequisites

- Node.js 24.0.0+
- PNPM 10.0.0+

### Steps

```bash
# 1. Clone and install
git clone <repository>
cd chatgpt-web
pnpm install

# 2. Build all packages
pnpm build

# 3. Start production server
cd apps/api
pnpm prod
```

### Process Management

Use PM2 for production process management:

```bash
# Install PM2
npm install -g pm2

# Start with PM2
cd apps/api
pm2 start build/index.js --name chatgpt-web

# Save PM2 configuration
pm2 save
pm2 startup
```

## Nginx Configuration

Example Nginx configuration for reverse proxy:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL configuration
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to application
    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

## Monitoring and Logging

### Health Checks

The application provides health check endpoints:

- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Detailed system status

### Logging

Logs are written to:

- Development: Console output
- Production: Structured JSON logs
- Docker: Container logs (`docker logs chatgpt-web`)

### Monitoring

Consider using:

- **Prometheus + Grafana** for metrics
- **ELK Stack** for log aggregation
- **Sentry** for error tracking
- **Uptime monitoring** for availability

## Troubleshooting

### Common Issues

1. **Build Failures**

   ```bash
   # Clean and rebuild
   pnpm clean
   pnpm install
   pnpm build
   ```

2. **Port Conflicts**

   ```bash
   # Check what's using the ports
   lsof -i :3002  # API port
   lsof -i :1002  # Web dev port
   ```

3. **Environment Variables**

   ```bash
   # Verify environment variables are loaded
   cd apps/api
   node -e "console.log(process.env.OPENAI_API_KEY)"
   ```

4. **Docker Issues**

   ```bash
   # Rebuild Docker image
   docker build --no-cache -t chatgpt-web .

   # Check container logs
   docker logs chatgpt-web
   ```

### Performance Optimization

1. **Enable Gzip Compression** in your reverse proxy
2. **Use CDN** for static assets
3. **Configure Caching** headers
4. **Monitor Resource Usage** and scale accordingly

## Security Considerations

1. **Always use HTTPS** in production
2. **Set strong AUTH_SECRET_KEY** if using authentication
3. **Configure rate limiting** to prevent abuse
4. **Keep dependencies updated** regularly
5. **Use secrets management** for sensitive data
6. **Enable security headers** in your reverse proxy

## Backup and Recovery

1. **Environment Configuration**: Backup your `.env` files
2. **Application State**: No persistent data by default
3. **Logs**: Configure log rotation and archival
4. **Database**: If using Redis, backup Redis data

For more detailed information, see the individual package documentation in `packages/docs/`.
