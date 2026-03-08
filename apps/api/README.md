# @chatgpt-web/api

Native Node.js 24+ HTTP/2 backend API service for ChatGPT Web.

## Architecture

This backend uses a modern, framework-agnostic architecture with zero web framework dependencies:

### Transport Layer

Framework-agnostic abstractions for HTTP operations:

- `TransportRequest` - Unified request interface (method, path, headers, body, query params)
- `TransportResponse` - Unified response interface (status, headers, JSON/streaming)
- `MiddlewareHandler` - Composable middleware pipeline
- `Router` - Route matching and execution

### HTTP/2 Adapter

Native Node.js HTTP/2 implementation:

- Uses `node:http2` module with HTTP/1.1 fallback
- Protocol-agnostic request/response wrapping
- Body parsing (JSON, URL-encoded) with size limits
- Static file serving with caching

### Security Components

Native middleware implementations:

- **Authentication**: Bearer token validation with timing-safe comparison
- **Rate Limiting**: Per-IP tracking (100 req/hour general, 10 req/15min auth)
- **Security Headers**: CSP, X-Frame-Options, HSTS, X-Content-Type-Options
- **CORS**: Origin validation with configurable allowed origins
- **Session Management**: Cookie-based sessions with Redis support
- **Input Validation**: Zod schemas with XSS sanitization

## Requirements

- **Node.js**: 24.0.0 or higher (required for native HTTP/2 and fetch)
- **Redis**: 5+ (optional, for distributed session storage)
- **TLS Certificates**: Required for HTTP/2 in browsers (production)

## Development

```bash
# Start development server (HTTP/1.1 mode)
pnpm dev

# Run tests
pnpm test

# Type check
pnpm type-check

# Lint
pnpm lint
```

## Build

```bash
# Build for production
pnpm build
```

## Production

```bash
# Run production build
pnpm prod
```

## HTTP/2 Deployment

### With TLS (Recommended for Production)

Requires valid TLS certificates for full HTTP/2 browser support:

```bash
# Set environment variables
export TLS_KEY_PATH=/path/to/server-key.pem
export TLS_CERT_PATH=/path/to/server-cert.pem
export HTTP2_ENABLED=true

pnpm prod
```

### Without TLS (Development or Behind Reverse Proxy)

HTTP/1.1 mode, suitable for:

- Local development
- Behind reverse proxy (nginx, CloudFlare, AWS ALB)

```bash
# Default mode (no TLS required)
pnpm dev
```

### Behind Reverse Proxy

When deployed behind a reverse proxy:

- Proxy handles TLS termination and HTTP/2
- Backend receives HTTP/1.1 (works seamlessly)
- Configure proxy to forward headers: `X-Forwarded-For`, `X-Real-IP`

Example nginx configuration:

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Host $host;
    }
}
```

## Environment Variables

Required:

```bash
OPENAI_API_KEY=sk-xxx          # OpenAI API key
AI_PROVIDER=openai             # or 'azure'
```

Optional:

```bash
AUTH_SECRET_KEY=xxx            # API authentication token
SESSION_SECRET=xxx             # Session encryption key
MAX_REQUEST_PER_HOUR=100       # Rate limit threshold
TIMEOUT_MS=60000               # Request timeout
ALLOWED_ORIGINS=http://localhost:1002,https://example.com
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=xxx
NODE_ENV=production            # Environment mode
```

For Azure OpenAI:

```bash
AI_PROVIDER=azure
AZURE_OPENAI_API_KEY=xxx
AZURE_OPENAI_ENDPOINT=https://xxx.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-4o-deployment
```

## API Endpoints

All endpoints support both `/api/*` and `/*` paths:

- `GET /api/health` - Health check
- `POST /api/chat-process` - Chat with streaming responses (requires auth)
- `POST /api/config` - Get configuration (requires auth)
- `POST /api/session` - Get session info
- `POST /api/verify` - Verify authentication token

## Migration from Express

This backend was migrated from Express.js to native Node.js HTTP/2:

**Removed Dependencies:**

- `express` → Native `node:http2` module
- `express-session` → Native session management
- `express-rate-limit` → Native rate limiter
- `helmet` → Native security headers
- `connect-redis` → Native `redis` client

**Benefits:**

- Zero framework dependencies
- Native HTTP/2 support
- Framework-agnostic architecture
- Improved maintainability

**Compatibility:**

- All API endpoints unchanged
- Response formats identical
- Security policies preserved
- 100% backward compatible

For technical details, see `.kiro/specs/express-to-native-routing-migration/`
