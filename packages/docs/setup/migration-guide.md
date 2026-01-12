# Migration Guide: Unofficial API to Official OpenAI API

This guide helps you migrate from the deprecated ChatGPT Unofficial Proxy API to the official OpenAI API.

## Overview

The ChatGPT Web application no longer supports unofficial proxy APIs, including:

- ChatGPT Unofficial Proxy API (web accessToken)
- Reverse proxy configurations
- Web scraping or browser automation methods

**All users must migrate to the official OpenAI API for continued service.**

## Why Migrate?

### Security Benefits

- ✅ Official API is more secure and reliable
- ✅ No more proxy-related security vulnerabilities
- ✅ Secure API key authentication only
- ✅ No browser automation risks

### Reliability Benefits

- ✅ No more proxy-related connection issues
- ✅ Stable API with official support
- ✅ Consistent performance and availability
- ✅ Access to latest models and features

### Compliance Benefits

- ✅ Follows OpenAI's terms of service
- ✅ Official support and documentation
- ✅ No risk of service interruption

## Migration Steps

### Step 1: Remove Deprecated Configuration

Remove the following environment variables from your `.env` file:

```bash
# REMOVE THESE - No longer supported
OPENAI_ACCESS_TOKEN=
API_REVERSE_PROXY=
CHATGPT_ACCESS_TOKEN=
REVERSE_PROXY_URL=
```

### Step 2: Set Up Official OpenAI API

1. **Get your OpenAI API key:**
   - Visit [OpenAI Platform](https://platform.openai.com/api-keys)
   - Create a new API key
   - Copy the key (starts with `sk-`)

2. **Update your configuration:**

   ```bash
   # REQUIRED - Your official OpenAI API key
   OPENAI_API_KEY=sk-your-api-key-here

   # OPTIONAL - Custom API endpoint (defaults to https://api.openai.com)
   OPENAI_API_BASE_URL=https://api.openai.com

   # OPTIONAL - Model to use (defaults to gpt-4o)
   OPENAI_API_MODEL=gpt-4o
   ```

### Step 3: Update Provider Configuration

If you were using specific provider settings:

**Before (Deprecated):**

```bash
API_REVERSE_PROXY=https://your-proxy.com
OPENAI_ACCESS_TOKEN=your-token
```

**After (Official API):**

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-key-here
OPENAI_API_MODEL=gpt-4o
```

### Step 4: Restart the Application

After updating your configuration:

1. Save your `.env` file
2. Restart the application
3. The application will validate your configuration on startup

## Configuration Validation

The application now validates configuration at startup and will:

- ✅ **Pass**: If only official API configuration is present
- ❌ **Fail**: If deprecated configuration is detected
- ❌ **Fail**: If required `OPENAI_API_KEY` is missing

### Success Messages

```bash
✅ Configuration validated successfully
✅ Official OpenAI API connection established
✅ Provider: OpenAI (gpt-4o)
```

### Error Messages

If you see configuration errors, they will include:

- List of deprecated variables found
- Step-by-step migration instructions
- Links to get your API key
- Examples of correct configuration

## Supported Configuration Options

### Required

- `OPENAI_API_KEY`: Your official OpenAI API key

### Optional OpenAI Settings

- `OPENAI_API_BASE_URL`: Custom API endpoint (default: https://api.openai.com)
- `OPENAI_API_MODEL`: Model to use (default: gpt-4o)
- `OPENAI_API_DISABLE_DEBUG`: Disable debug logging (default: false)

### Optional General Settings

- `TIMEOUT_MS`: Request timeout in milliseconds (default: 60000)
- `AUTH_SECRET_KEY`: Enable authentication (optional)
- `MAX_REQUEST_PER_HOUR`: Rate limiting (optional)

### Proxy Support (Retained)

The following proxy configurations are still supported for outbound requests:

- `SOCKS_PROXY_HOST`, `SOCKS_PROXY_PORT`
- `SOCKS_PROXY_USERNAME`, `SOCKS_PROXY_PASSWORD`
- `HTTPS_PROXY`

## Azure OpenAI Migration

If you want to use Azure OpenAI instead:

```bash
# Azure OpenAI Configuration
AI_PROVIDER=azure
AZURE_OPENAI_API_KEY=your_azure_api_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-4o-deployment
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# Enable v1 Responses API (recommended)
AZURE_OPENAI_USE_RESPONSES_API=true
```

## Docker Migration

### Before (Deprecated)

```yaml
version: '3'
services:
  app:
    image: chatgpt-web:latest
    environment:
      - OPENAI_ACCESS_TOKEN=your-token
      - API_REVERSE_PROXY=https://proxy.com
```

### After (Official API)

```yaml
version: '3'
services:
  app:
    image: chatgpt-web:latest
    environment:
      - OPENAI_API_KEY=sk-your-key-here
      - AI_PROVIDER=openai
      - OPENAI_API_MODEL=gpt-4o
```

## Kubernetes Migration

### Before (Deprecated)

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: chatgpt-config
data:
  API_REVERSE_PROXY: 'https://proxy.com'
---
apiVersion: v1
kind: Secret
metadata:
  name: chatgpt-secrets
stringData:
  OPENAI_ACCESS_TOKEN: 'your-token'
```

### After (Official API)

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: chatgpt-config
data:
  AI_PROVIDER: 'openai'
  OPENAI_API_MODEL: 'gpt-4o'
---
apiVersion: v1
kind: Secret
metadata:
  name: chatgpt-secrets
stringData:
  OPENAI_API_KEY: 'sk-your-key-here'
```

## Troubleshooting

### "Deprecated configuration detected" Error

**Problem**: You have old configuration variables in your environment.

**Solution**:

1. Remove all deprecated variables listed in the error message
2. Set `OPENAI_API_KEY` with your official API key
3. Restart the application

### "Missing OPENAI_API_KEY" Error

**Problem**: No API key is configured.

**Solution**:

1. Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Set `OPENAI_API_KEY=sk-your-key-here` in your `.env` file
3. Restart the application

### API Key Format Issues

**Problem**: Invalid API key format.

**Solution**:

- Ensure your API key starts with `sk-`
- Check for extra spaces or characters
- Verify the key is active on the OpenAI platform

### Connection Issues

**Problem**: Cannot connect to OpenAI API.

**Solution**:

1. Check your internet connection
2. Verify API key is valid and has credits
3. Check if you need proxy configuration for outbound requests

### Rate Limiting Issues

**Problem**: Too many requests error.

**Solution**:

1. Check your OpenAI usage limits
2. Configure `MAX_REQUEST_PER_HOUR` appropriately
3. Consider upgrading your OpenAI plan

## Testing Your Migration

### 1. Configuration Test

```bash
# Check configuration validation
pnpm dev

# Should see:
# ✅ Configuration validated successfully
# ✅ Official OpenAI API connection established
```

### 2. API Connection Test

```bash
# Test API endpoint
curl -X POST http://localhost:3002/api/chat-process \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello, how are you?", "options": {}}'
```

### 3. Frontend Test

1. Open http://localhost:1002 in your browser
2. Enter a test message
3. Verify you receive a response from the AI

## Migration Checklist

- [ ] Remove deprecated environment variables
- [ ] Get OpenAI API key from platform
- [ ] Set `OPENAI_API_KEY` in configuration
- [ ] Remove any reverse proxy configurations
- [ ] Update Docker/Kubernetes configurations
- [ ] Test application startup (should show "Configuration validation passed")
- [ ] Verify chat functionality works
- [ ] Update any deployment scripts or documentation
- [ ] Update CI/CD pipeline variables
- [ ] Notify team members of configuration changes

## Getting Help

### Resources

- **OpenAI API Documentation**: https://platform.openai.com/docs
- **Get API Keys**: https://platform.openai.com/api-keys
- **OpenAI Support**: https://help.openai.com/

### Common Support Issues

1. **API Key Issues**: Check the OpenAI platform for key status and usage
2. **Rate Limiting**: Review your usage limits and upgrade if needed
3. **Model Access**: Ensure your account has access to the models you're trying to use

### Error Log Analysis

Check application logs for specific error messages:

```bash
# Check backend logs
tail -f apps/api/logs/app.log

# Look for configuration validation messages
grep -i "config" apps/api/logs/app.log
```

## Post-Migration Benefits

After successful migration, you'll have:

- ✅ Enhanced security with official API only
- ✅ Reliable service with no proxy dependencies
- ✅ Access to latest OpenAI models and features
- ✅ Official support and documentation
- ✅ Compliance with OpenAI terms of service
- ✅ Better error handling and debugging

---

**Need help?** Check the error messages during startup - they include specific migration steps for your configuration.
