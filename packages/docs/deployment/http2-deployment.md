# HTTP/2 Deployment Guide

This guide covers HTTP/2 deployment configurations for the ChatGPT Web backend, including TLS setup, reverse proxy integration, and browser compatibility considerations.

## Overview

The ChatGPT Web backend uses native Node.js 24+ HTTP/2 with automatic HTTP/1.1 fallback. This provides:

- **Modern Protocol**: HTTP/2 multiplexing and server push capabilities
- **Backward Compatibility**: Automatic HTTP/1.1 fallback for older clients
- **Zero Dependencies**: No Express or framework dependencies
- **Production Ready**: Battle-tested native Node.js implementation

## HTTP/2 Requirements

### Node.js Version

**Node.js 24.0.0 or higher is required** for native HTTP/2 support.

```bash
# Check Node.js version
node --version  # Must be >= 24.0.0

# Install Node.js 24 if needed
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs

# macOS
brew install node@24
```

### TLS Requirements for Browser HTTP/2

**Important**: Browsers require TLS for HTTP/2 connections. HTTP/2 without TLS (h2c) has limited browser support.

| Deployment Scenario    | Protocol | Browser Support | Use Case                 |
| ---------------------- | -------- | --------------- | ------------------------ |
| Direct with TLS        | HTTP/2   | ✅ Full         | Production               |
| Direct without TLS     | HTTP/1.1 | ✅ Full         | Development              |
| Behind reverse proxy   | HTTP/1.1 | ✅ Full         | Production (recommended) |
| h2c (cleartext HTTP/2) | HTTP/2   | ⚠️ Limited      | Internal services only   |

## Deployment Scenarios

### Scenario 1: Development (No TLS)

For local development, the backend runs in HTTP/1.1 mode without TLS.

```bash
# Start development server
cd apps/api
pnpm dev

# Server starts on http://localhost:3002
# Uses HTTP/1.1 (no TLS required)
```

**Configuration:**

```bash
# apps/api/.env
NODE_ENV=development
PORT=3002
HOST=localhost

# No TLS configuration needed
```

**Warning Message:**

When TLS is not configured, the server logs:

```
⚠️  Warning: HTTP/2 without TLS (h2c) has limited browser support.
   Configure TLS for production use or deploy behind a reverse proxy.
```

This is expected in development and can be safely ignored.

### Scenario 2: Production with TLS (Direct)

For production deployment with direct TLS termination, configure TLS certificates.

#### Generate TLS Certificates

##### Option A: Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install certbot

# Generate certificate
sudo certbot certonly --standalone \
  -d your-domain.com \
  -d www.your-domain.com

# Certificates will be in:
# /etc/letsencrypt/live/your-domain.com/fullchain.pem
# /etc/letsencrypt/live/your-domain.com/privkey.pem
```

##### Option B: Self-Signed (Development/Testing)

```bash
# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -nodes \
  -keyout server-key.pem \
  -out server-cert.pem \
  -days 365 \
  -subj "/CN=localhost"
```

#### Configure Backend for TLS

```bash
# apps/api/.env
NODE_ENV=production
PORT=3002
HOST=0.0.0.0

# TLS Configuration
TLS_ENABLED=true
TLS_KEY_PATH=/etc/letsencrypt/live/your-domain.com/privkey.pem
TLS_CERT_PATH=/etc/letsencrypt/live/your-domain.com/fullchain.pem

# HTTP/2 Configuration
HTTP2_ENABLED=true
```

#### Start Server

```bash
cd apps/api
pnpm prod

# Server starts with:
# ✅ HTTP/2 enabled with TLS
# ✅ Listening on https://0.0.0.0:3002
```

#### Verify HTTP/2

```bash
# Check protocol version
curl -I --http2 https://your-domain.com:3002/health

# Should show: HTTP/2 200
```

### Scenario 3: Behind Reverse Proxy (Recommended)

For production, deploying behind a reverse proxy is recommended. The proxy handles TLS and HTTP/2, while the backend receives HTTP/1.1.

**Benefits:**

- Proxy handles TLS termination and certificate management
- Proxy handles HTTP/2 negotiation with browsers
- Backend runs in simpler HTTP/1.1 mode
- Easier to scale and load balance
- Better security isolation

#### Backend Configuration

```bash
# apps/api/.env
NODE_ENV=production
PORT=3002
HOST=127.0.0.1  # Only accept local connections

# No TLS configuration needed
# Proxy handles TLS
```

#### Nginx Configuration

**Install Nginx:**

```bash
# Ubuntu/Debian
sudo apt install nginx

# CentOS/RHEL
sudo dnf install nginx
```

**Configure Nginx with HTTP/2:**

```nginx
# /etc/nginx/sites-available/chatgpt-web

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS with HTTP/2
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # TLS Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Backend
    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;

        # Forward client information
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;

        # Timeouts for streaming responses
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        proxy_send_timeout 300s;

        # Disable buffering for streaming
        proxy_buffering off;
        proxy_request_buffering off;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:3002/health;
        access_log off;
    }
}
```

**Enable and Test:**

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/chatgpt-web /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

**Verify HTTP/2:**

```bash
# Check protocol
curl -I --http2 https://your-domain.com/health

# Should show: HTTP/2 200
# Backend receives HTTP/1.1 from Nginx
```

#### CloudFlare Configuration

If using CloudFlare as a reverse proxy:

1. **CloudFlare Dashboard:**
   - Enable "HTTP/2" in Speed settings
   - Enable "HTTP/3 (with QUIC)" for even better performance
   - Set SSL/TLS mode to "Full" or "Full (strict)"

2. **Backend Configuration:**

```bash
# apps/api/.env
NODE_ENV=production
PORT=3002
HOST=127.0.0.1

# CloudFlare forwards HTTP/1.1 to origin
# No TLS configuration needed
```

3. **CloudFlare forwards these headers:**
   - `CF-Connecting-IP` - Real client IP
   - `X-Forwarded-For` - Proxy chain
   - `X-Forwarded-Proto` - Original protocol (https)

The backend automatically extracts client IP from these headers.

#### AWS Application Load Balancer (ALB)

**ALB Configuration:**

1. **Create Target Group:**
   - Protocol: HTTP
   - Port: 3002
   - Health check: `/health`

2. **Create Load Balancer:**
   - Type: Application Load Balancer
   - Listeners: HTTPS:443 (with ACM certificate)
   - Enable HTTP/2

3. **Backend Configuration:**

```bash
# apps/api/.env
NODE_ENV=production
PORT=3002
HOST=0.0.0.0

# ALB forwards HTTP/1.1 to targets
# No TLS configuration needed
```

**ALB forwards these headers:**

- `X-Forwarded-For` - Client IP
- `X-Forwarded-Proto` - Original protocol
- `X-Forwarded-Port` - Original port

### Scenario 4: Docker with TLS

#### Dockerfile with TLS Support

```dockerfile
FROM node:24-alpine AS base
WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/
COPY apps/ ./apps/

# Install dependencies
FROM base AS deps
RUN corepack enable pnpm
RUN pnpm install --frozen-lockfile

# Build
FROM deps AS builder
RUN pnpm build

# Production
FROM node:24-alpine AS runner
WORKDIR /app

# Copy built files
COPY --from=builder /app/apps/api/build ./
COPY --from=builder /app/apps/web/dist ./public

# Create directory for TLS certificates
RUN mkdir -p /app/certs

EXPOSE 3002

CMD ["node", "index.js"]
```

#### Docker Compose with TLS

```yaml
version: '3.8'

services:
  chatgpt-web:
    build: .
    image: chatgpt-web:local
    container_name: chatgpt-web
    restart: unless-stopped

    ports:
      - '443:3002'

    environment:
      NODE_ENV: production
      PORT: 3002
      HOST: 0.0.0.0

      # TLS Configuration
      TLS_ENABLED: 'true'
      TLS_KEY_PATH: /app/certs/server-key.pem
      TLS_CERT_PATH: /app/certs/server-cert.pem
      HTTP2_ENABLED: 'true'

      # API Configuration
      AI_PROVIDER: openai
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      DEFAULT_MODEL: gpt-5.4

    volumes:
      # Mount TLS certificates
      - ./certs/server-key.pem:/app/certs/server-key.pem:ro
      - ./certs/server-cert.pem:/app/certs/server-cert.pem:ro
      - ./logs:/app/logs

    healthcheck:
      test:
        ['CMD', 'wget', '--no-verbose', '--tries=1', '--spider', 'https://localhost:3002/health']
      interval: 30s
      timeout: 10s
      retries: 3
```

#### Run with Docker

```bash
# Generate certificates (if needed)
mkdir -p certs
openssl req -x509 -newkey rsa:4096 -nodes \
  -keyout certs/server-key.pem \
  -out certs/server-cert.pem \
  -days 365 \
  -subj "/CN=localhost"

# Start container
docker compose up -d --build

# Verify HTTP/2
curl -I --http2 --insecure https://localhost/health
```

### Scenario 5: Kubernetes with Ingress

#### Backend Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: chatgpt-web
  namespace: default
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
          image: chatgpt-web:latest
          ports:
            - containerPort: 3002
              protocol: TCP
          env:
            - name: NODE_ENV
              value: 'production'
            - name: PORT
              value: '3002'
            - name: HOST
              value: '0.0.0.0'
            - name: OPENAI_API_KEY
              valueFrom:
                secretKeyRef:
                  name: chatgpt-web-secrets
                  key: openai-api-key
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
          resources:
            requests:
              memory: '512Mi'
              cpu: '500m'
            limits:
              memory: '1Gi'
              cpu: '1000m'
---
apiVersion: v1
kind: Service
metadata:
  name: chatgpt-web-service
  namespace: default
spec:
  selector:
    app: chatgpt-web
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3002
  type: ClusterIP
```

#### Ingress with HTTP/2

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: chatgpt-web-ingress
  namespace: default
  annotations:
    # Enable HTTP/2
    nginx.ingress.kubernetes.io/http2-push-preload: 'true'

    # TLS configuration
    cert-manager.io/cluster-issuer: 'letsencrypt-prod'

    # Security headers
    nginx.ingress.kubernetes.io/configuration-snippet: |
      add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
      add_header X-Frame-Options DENY always;
      add_header X-Content-Type-Options nosniff always;

    # Streaming support
    nginx.ingress.kubernetes.io/proxy-buffering: 'off'
    nginx.ingress.kubernetes.io/proxy-request-buffering: 'off'
    nginx.ingress.kubernetes.io/proxy-read-timeout: '300'
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - your-domain.com
      secretName: chatgpt-web-tls
  rules:
    - host: your-domain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: chatgpt-web-service
                port:
                  number: 80
```

## Environment Variables Reference

### TLS Configuration

```bash
# Enable TLS
TLS_ENABLED=true

# Certificate paths
TLS_KEY_PATH=/path/to/server-key.pem
TLS_CERT_PATH=/path/to/server-cert.pem

# Optional: CA certificate for client verification
TLS_CA_PATH=/path/to/ca-cert.pem

# Optional: Require client certificates
TLS_REQUEST_CERT=false
TLS_REJECT_UNAUTHORIZED=true
```

### HTTP/2 Configuration

```bash
# Enable HTTP/2 (requires TLS)
HTTP2_ENABLED=true

# HTTP/1.1 fallback is automatic
# No additional configuration needed
```

### Server Configuration

```bash
# Server binding
PORT=3002
HOST=0.0.0.0  # or 127.0.0.1 for local only

# Environment
NODE_ENV=production
```

## Troubleshooting

### Issue: "HTTP/2 without TLS" Warning

**Symptom:**

```
⚠️  Warning: HTTP/2 without TLS (h2c) has limited browser support.
   Configure TLS for production use or deploy behind a reverse proxy.
```

**Solution:**

This warning appears when TLS is not configured. Choose one:

1. **Development**: Ignore the warning (HTTP/1.1 works fine)
2. **Production**: Configure TLS certificates (see Scenario 2)
3. **Production**: Deploy behind reverse proxy (see Scenario 3)

### Issue: Browser Shows HTTP/1.1 Instead of HTTP/2

**Symptom:**

Browser developer tools show HTTP/1.1 protocol.

**Diagnosis:**

```bash
# Check if server supports HTTP/2
curl -I --http2 https://your-domain.com/health

# Check Nginx configuration
sudo nginx -T | grep http2
```

**Solutions:**

1. **Verify TLS is enabled**: HTTP/2 requires TLS in browsers
2. **Check Nginx config**: Ensure `listen 443 ssl http2;`
3. **Verify certificate**: Use valid TLS certificate
4. **Check browser**: Ensure browser supports HTTP/2 (all modern browsers do)

### Issue: Certificate Errors

**Symptom:**

```
Error: unable to verify the first certificate
```

**Solutions:**

1. **Self-signed certificate**: Add `NODE_TLS_REJECT_UNAUTHORIZED=0` (development only!)
2. **Let's Encrypt**: Ensure certificate chain is complete
3. **Corporate proxy**: Add corporate CA to system trust store

### Issue: Connection Refused

**Symptom:**

```
curl: (7) Failed to connect to localhost port 3002: Connection refused
```

**Diagnosis:**

```bash
# Check if server is running
ps aux | grep node

# Check if port is listening
sudo netstat -tulpn | grep 3002
sudo lsof -i :3002

# Check firewall
sudo ufw status
sudo firewall-cmd --list-all
```

**Solutions:**

1. **Start server**: `cd apps/api && pnpm prod`
2. **Check HOST binding**: Ensure `HOST=0.0.0.0` not `127.0.0.1`
3. **Open firewall**: `sudo ufw allow 3002/tcp`

### Issue: Streaming Responses Not Working

**Symptom:**

Chat responses don't stream, arrive all at once.

**Diagnosis:**

```bash
# Check Nginx buffering
sudo nginx -T | grep buffering

# Test streaming directly
curl -N http://localhost:3002/api/chat-process \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Hello"}'
```

**Solutions:**

1. **Disable Nginx buffering**:

   ```nginx
   proxy_buffering off;
   proxy_request_buffering off;
   ```

2. **Increase timeouts**:

   ```nginx
   proxy_read_timeout 300s;
   proxy_send_timeout 300s;
   ```

3. **Check backend**: Ensure backend uses `res.write()` for streaming

## Performance Optimization

### HTTP/2 Server Push

HTTP/2 server push can preload critical resources:

```nginx
# Nginx configuration
location / {
    proxy_pass http://127.0.0.1:3002;

    # Push critical resources
    http2_push /static/main.js;
    http2_push /static/main.css;
}
```

### Connection Pooling

For high-traffic deployments:

```nginx
upstream chatgpt-backend {
    least_conn;
    keepalive 32;

    server 127.0.0.1:3002 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3003 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3004 max_fails=3 fail_timeout=30s;
}

server {
    location / {
        proxy_pass http://chatgpt-backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }
}
```

### TLS Session Resumption

Improve TLS handshake performance:

```nginx
ssl_session_cache shared:SSL:50m;
ssl_session_timeout 1d;
ssl_session_tickets off;
```

## Security Best Practices

### TLS Configuration

1. **Use strong ciphers**:

   ```nginx
   ssl_protocols TLSv1.2 TLSv1.3;
   ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
   ssl_prefer_server_ciphers off;
   ```

2. **Enable HSTS**:

   ```nginx
   add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
   ```

3. **Use OCSP stapling**:
   ```nginx
   ssl_stapling on;
   ssl_stapling_verify on;
   ssl_trusted_certificate /path/to/chain.pem;
   ```

### Certificate Management

1. **Automate renewal**:

   ```bash
   # Certbot automatic renewal
   sudo certbot renew --dry-run

   # Add to crontab
   0 0 * * * certbot renew --quiet --post-hook "systemctl reload nginx"
   ```

2. **Monitor expiration**:
   ```bash
   # Check certificate expiration
   echo | openssl s_client -connect your-domain.com:443 2>/dev/null | \
     openssl x509 -noout -dates
   ```

### Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## Monitoring

### Health Checks

```bash
# HTTP/2 health check
curl -I --http2 https://your-domain.com/health

# Expected response:
# HTTP/2 200
# content-type: application/json
```

### Protocol Verification

```bash
# Check protocol negotiation
openssl s_client -connect your-domain.com:443 -alpn h2,http/1.1

# Should show: ALPN protocol: h2
```

### Performance Monitoring

```bash
# Measure TLS handshake time
curl -w "@curl-format.txt" -o /dev/null -s https://your-domain.com/health

# curl-format.txt:
# time_namelookup:  %{time_namelookup}\n
# time_connect:     %{time_connect}\n
# time_appconnect:  %{time_appconnect}\n
# time_pretransfer: %{time_pretransfer}\n
# time_starttransfer: %{time_starttransfer}\n
# time_total:       %{time_total}\n
```

## Summary

| Scenario          | Protocol | TLS        | Browser Support | Recommended For          |
| ----------------- | -------- | ---------- | --------------- | ------------------------ |
| Development       | HTTP/1.1 | No         | ✅ Full         | Local development        |
| Direct with TLS   | HTTP/2   | Yes        | ✅ Full         | Small deployments        |
| Behind Nginx      | HTTP/2   | Nginx      | ✅ Full         | Production (recommended) |
| Behind CloudFlare | HTTP/2   | CloudFlare | ✅ Full         | Production               |
| Behind AWS ALB    | HTTP/2   | ALB        | ✅ Full         | AWS deployments          |
| Docker with TLS   | HTTP/2   | Yes        | ✅ Full         | Containerized production |
| Kubernetes        | HTTP/2   | Ingress    | ✅ Full         | Scalable production      |

**Recommendation**: For production, deploy behind a reverse proxy (Nginx, CloudFlare, or AWS ALB) that handles TLS and HTTP/2. This provides the best balance of performance, security, and maintainability.
