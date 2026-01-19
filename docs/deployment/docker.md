# Docker Deployment Guide

This guide covers deploying ChatGPT Web using Docker with proper environment variable configuration.

## Quick Start

### 1. Using Docker Compose (Recommended)

Create a `.env` file in the `docker-compose/` directory:

```bash
# Required: AI Provider Configuration
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-openai-api-key-here

# Required: Security Configuration
SESSION_SECRET=your-secure-random-session-secret-32-chars-minimum

# Optional: Rate Limiting
MAX_REQUEST_PER_HOUR=100

# Optional: CORS Configuration
ALLOWED_ORIGINS=https://yourdomain.com
```

Run with Docker Compose:

```bash
cd docker-compose
docker-compose up -d
```

### 2. Using Docker Run

```bash
docker run -d \
  --name chatgpt-web \
  -p 3002:3002 \
  -e AI_PROVIDER=openai \
  -e OPENAI_API_KEY=sk-your-api-key \
  -e SESSION_SECRET=your-secure-session-secret \
  -e MAX_REQUEST_PER_HOUR=100 \
  chatgpt-web
```

## Environment Variables

### Required Variables

| Variable         | Description            | Example                        |
| ---------------- | ---------------------- | ------------------------------ |
| `AI_PROVIDER`    | AI service provider    | `openai` or `azure`            |
| `SESSION_SECRET` | Session encryption key | `secure-random-32-char-string` |

### OpenAI Configuration

| Variable              | Description          | Default                  | Required |
| --------------------- | -------------------- | ------------------------ | -------- |
| `OPENAI_API_KEY`      | OpenAI API key       | -                        | ✅       |
| `OPENAI_API_BASE_URL` | OpenAI API endpoint  | `https://api.openai.com` | ❌       |
| `DEFAULT_MODEL`       | Default model to use | `gpt-4o`                 | ❌       |

### Azure OpenAI Configuration

| Variable                         | Description          | Default              | Required |
| -------------------------------- | -------------------- | -------------------- | -------- |
| `AZURE_OPENAI_API_KEY`           | Azure API key        | -                    | ✅       |
| `AZURE_OPENAI_ENDPOINT`          | Azure endpoint       | -                    | ✅       |
| `AZURE_OPENAI_DEPLOYMENT`        | Deployment name      | -                    | ✅       |
| `AZURE_OPENAI_API_VERSION`       | API version          | `2024-02-15-preview` | ❌       |
| `AZURE_OPENAI_USE_RESPONSES_API` | Use v1 responses API | `true`               | ❌       |

### Security Configuration

| Variable                  | Description             | Default | Required |
| ------------------------- | ----------------------- | ------- | -------- |
| `AUTH_SECRET_KEY`         | Authentication key      | -       | ❌       |
| `MAX_REQUEST_PER_HOUR`    | Rate limit per IP       | `100`   | ❌       |
| `ALLOWED_ORIGINS`         | CORS allowed origins    | -       | ❌       |
| `ENABLE_SECURITY_HEADERS` | Enable security headers | `true`  | ❌       |

## Configuration Examples

### OpenAI Configuration

```bash
# .env file for OpenAI
AI_PROVIDER=openai
OPENAI_API_KEY=sk-proj-your-api-key-here
DEFAULT_MODEL=gpt-4o
SESSION_SECRET=secure-random-session-secret-32-chars-minimum
MAX_REQUEST_PER_HOUR=100
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

### Azure OpenAI Configuration

```bash
# .env file for Azure OpenAI
AI_PROVIDER=azure
AZURE_OPENAI_API_KEY=your-azure-api-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-4o-deployment
AZURE_OPENAI_API_VERSION=2024-02-15-preview
AZURE_OPENAI_USE_RESPONSES_API=true
SESSION_SECRET=secure-random-session-secret-32-chars-minimum
MAX_REQUEST_PER_HOUR=100
```

## Production Deployment

### Security Considerations

1. **Session Secret**: Use a cryptographically secure random string (minimum 32 characters)
2. **HTTPS**: Enable HTTPS in production environments
3. **CORS**: Configure `ALLOWED_ORIGINS` to restrict access
4. **Rate Limiting**: Set appropriate `MAX_REQUEST_PER_HOUR` limits
5. **API Keys**: Never commit API keys to version control

### Example Production Configuration

```bash
# Production .env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-proj-production-api-key
SESSION_SECRET=cryptographically-secure-random-session-secret-64-chars
MAX_REQUEST_PER_HOUR=500
ALLOWED_ORIGINS=https://chat.yourdomain.com
HTTPS=true
ENABLE_SECURITY_HEADERS=true
LOG_LEVEL=warn
```

### Health Check

The container includes a health check endpoint at `/health`. You can verify the deployment:

```bash
curl http://localhost:3002/health
```

### Logs

View container logs:

```bash
docker logs chatgpt-web
```

## Troubleshooting

### Common Issues

1. **"SESSION_SECRET should be set"**: Set the `SESSION_SECRET` environment variable
2. **"Missing OpenAI API key"**: Set `OPENAI_API_KEY` for OpenAI or Azure credentials for Azure
3. **"Configuration validation failed"**: Check all required environment variables are set
4. **"Security environment validation failed"**: Ensure `SESSION_SECRET` is set in production

### Validation

The application performs comprehensive validation on startup:

- ✅ Configuration validation
- ✅ Security validation
- ✅ Security environment validation
- ✅ Provider configuration validation

Any validation failures will be logged with specific error messages and mitigation steps.

## Development

For development with hot reloading:

```bash
cd docker-compose
docker-compose -f docker-compose.dev.yml up
```

This uses volume mounts for live code updates and disables rate limiting.
