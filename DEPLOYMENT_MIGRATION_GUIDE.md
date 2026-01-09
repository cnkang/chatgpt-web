# Deployment and Migration Guide

## Overview

This guide provides instructions for deploying the ChatGPT Web application after the removal of unofficial proxy API support. The application now exclusively supports official OpenAI API access methods.

## Breaking Changes

### Removed Features

- ❌ ChatGPT Unofficial Proxy API (web accessToken) support
- ❌ Reverse proxy configuration options
- ❌ Web scraping and browser automation functionality
- ❌ Access token-based authentication

### Supported Features

- ✅ Official OpenAI API v1
- ✅ Azure OpenAI Service
- ✅ Secure API key authentication
- ✅ Enhanced security and reliability

## Migration Requirements

### Environment Variables

#### Required Changes

Remove these deprecated variables from your environment:

```bash
# REMOVE THESE - No longer supported
OPENAI_ACCESS_TOKEN=your_access_token
API_REVERSE_PROXY=https://your-proxy.com
REVERSE_PROXY_URL=https://your-proxy.com
CHATGPT_ACCESS_TOKEN=your_token
```

#### Required Configuration

Add these official API variables:

```bash
# REQUIRED - Official OpenAI API
OPENAI_API_KEY=sk-your_official_api_key_here

# OPTIONAL - Custom API endpoint
OPENAI_API_BASE_URL=https://api.openai.com

# OPTIONAL - Model selection (defaults to gpt-5.2)
OPENAI_API_MODEL=gpt-5.2
```

### Migration Steps

1. **Get Official API Key**
   - Visit [OpenAI Platform](https://platform.openai.com/api-keys)
   - Create a new API key
   - Copy the key (starts with `sk-`)

2. **Update Environment Configuration**

   ```bash
   # Remove deprecated variables
   unset OPENAI_ACCESS_TOKEN
   unset API_REVERSE_PROXY
   unset REVERSE_PROXY_URL
   unset CHATGPT_ACCESS_TOKEN

   # Set official API key
   export OPENAI_API_KEY=sk-your_official_api_key_here
   ```

3. **Update Configuration Files**
   - Update `.env` files
   - Update Docker environment files
   - Update Kubernetes ConfigMaps/Secrets
   - Update CI/CD pipeline variables

4. **Verify Configuration**
   ```bash
   # The application will validate configuration on startup
   npm start
   ```

## Deployment Instructions

### Docker Deployment

#### Environment File (.env)

```bash
# Official OpenAI API Configuration
OPENAI_API_KEY=sk-your_official_api_key_here
OPENAI_API_BASE_URL=https://api.openai.com
OPENAI_API_MODEL=gpt-5.2

# Optional: Timeout configuration
TIMEOUT_MS=100000

# Optional: Rate limiting
MAX_REQUEST_PER_HOUR=1000

# Optional: Authentication
AUTH_SECRET_KEY=your_secret_key_here

# Optional: Proxy settings (for outbound requests)
HTTPS_PROXY=http://your-proxy:8080
SOCKS_PROXY_HOST=your-socks-proxy
SOCKS_PROXY_PORT=1080
```

#### Docker Compose

```yaml
version: '3.8'
services:
  chatgpt-web:
    image: your-registry/chatgpt-web:latest
    ports:
      - '3002:3002'
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - OPENAI_API_BASE_URL=${OPENAI_API_BASE_URL}
      - OPENAI_API_MODEL=${OPENAI_API_MODEL}
      - TIMEOUT_MS=${TIMEOUT_MS}
      - AUTH_SECRET_KEY=${AUTH_SECRET_KEY}
    restart: unless-stopped
```

### Kubernetes Deployment

#### Secret Configuration

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: chatgpt-web-secrets
type: Opaque
stringData:
  OPENAI_API_KEY: sk-your_official_api_key_here
  AUTH_SECRET_KEY: your_secret_key_here
```

#### ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: chatgpt-web-config
data:
  OPENAI_API_BASE_URL: 'https://api.openai.com'
  OPENAI_API_MODEL: gpt-5.2
  TIMEOUT_MS: '100000'
  MAX_REQUEST_PER_HOUR: '1000'
```

#### Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: chatgpt-web
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
          image: your-registry/chatgpt-web:latest
          ports:
            - containerPort: 3002
          envFrom:
            - configMapRef:
                name: chatgpt-web-config
            - secretRef:
                name: chatgpt-web-secrets
          livenessProbe:
            httpGet:
              path: /api/config
              port: 3002
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /api/config
              port: 3002
            initialDelaySeconds: 5
            periodSeconds: 5
```

### Azure OpenAI Configuration

For Azure OpenAI Service, use these environment variables:

```bash
# Azure OpenAI Configuration
OPENAI_API_KEY=your_azure_api_key
OPENAI_API_BASE_URL=https://your-resource.openai.azure.com
OPENAI_API_MODEL=model-router  # Use Azure model router for optimal model selection

# Azure OpenAI Provider Configuration
AI_PROVIDER=azure
AZURE_OPENAI_API_KEY=your_azure_api_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=model-router
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# Enable v1 Responses API for enhanced features (recommended)
AZURE_OPENAI_USE_RESPONSES_API=true
```

**Benefits of v1 Responses API:**

- Enhanced reasoning capabilities with step-by-step thought display
- Better context retention across conversations
- Support for advanced model features like computer-use-preview
- Unified interface combining chat completions and assistants capabilities

````

## Validation and Testing

### Configuration Validation

The application automatically validates configuration on startup:

```bash
# Valid configuration - application starts successfully
✅ Configuration validated successfully
✅ Official OpenAI API connection established

# Invalid configuration - application fails with helpful error
❌ Deprecated configuration detected: OPENAI_ACCESS_TOKEN
❌ Please migrate to official OpenAI API
````

### Health Checks

Test your deployment:

```bash
# Check configuration endpoint
curl http://localhost:3002/api/config

# Expected response (official API only):
{
  "type": "Success",
  "data": {
    "apiModel": "ChatGPTAPI",
    "timeoutMs": 100000,
    "socksProxy": "-",
    "httpsProxy": "-",
    "usage": "..."
  }
}
```

### Test Chat Functionality

```bash
# Test chat endpoint
curl -X POST http://localhost:3002/api/chat-process \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello, how are you?", "options": {}}'
```

## Troubleshooting

### Common Migration Issues

#### 1. Deprecated Configuration Error

```
Error: Deprecated configuration detected: OPENAI_ACCESS_TOKEN
```

**Solution:** Remove all deprecated environment variables and set `OPENAI_API_KEY`

#### 2. Missing API Key Error

```
Error: Missing required configuration: OPENAI_API_KEY
```

**Solution:** Set the `OPENAI_API_KEY` environment variable with your official OpenAI API key

#### 3. Invalid API Key Error

```
Error: Invalid API key provided
```

**Solution:** Verify your API key is correct and has sufficient credits

#### 4. Rate Limiting

```
Error: Rate limit exceeded
```

**Solution:** Check your OpenAI usage limits and consider upgrading your plan

### Configuration Validation Script

Run the validation script to check your configuration:

```bash
cd service
npm run validate-cleanup
```

### Logs and Monitoring

Monitor application logs for:

- Configuration validation messages
- API connection status
- Error messages and migration guidance
- Performance metrics

## Security Improvements

### Enhanced Security Features

- ✅ Removed web scraping security risks
- ✅ Eliminated unofficial token handling
- ✅ Secure official API key authentication only
- ✅ Validated configuration on startup
- ✅ No browser automation vulnerabilities

### Security Best Practices

1. **API Key Management**
   - Store API keys in secure secret management systems
   - Rotate API keys regularly
   - Use environment-specific keys

2. **Network Security**
   - Use HTTPS for all API communications
   - Configure proper firewall rules
   - Monitor API usage and access patterns

3. **Access Control**
   - Implement proper authentication mechanisms
   - Use rate limiting to prevent abuse
   - Monitor and log all API access

## Support and Resources

### Official Documentation

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Azure OpenAI Documentation](https://docs.microsoft.com/en-us/azure/cognitive-services/openai/)

### Migration Support

- Check application logs for detailed error messages
- Use the built-in configuration validation
- Review the comprehensive cleanup validation results

### Getting Help

If you encounter issues during migration:

1. Check the troubleshooting section above
2. Review application logs for specific error messages
3. Verify your API key and configuration
4. Test with the provided health check endpoints

---

**Note:** This migration removes all unofficial API support permanently. Ensure you have a valid OpenAI API key before deploying the updated application.
