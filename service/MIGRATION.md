# Migration Guide: Unofficial API to Official OpenAI API

This guide helps you migrate from the deprecated ChatGPT Unofficial Proxy API to the official OpenAI API.

## Overview

The ChatGPT Web application no longer supports unofficial proxy APIs, including:

- ChatGPT Unofficial Proxy API (web accessToken)
- Reverse proxy configurations
- Web scraping or browser automation methods

**All users must migrate to the official OpenAI API for continued service.**

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

### Step 3: Restart the Application

After updating your configuration:

1. Save your `.env` file
2. Restart the application
3. The application will validate your configuration on startup

## Configuration Validation

The application now validates configuration at startup and will:

- ✅ **Pass**: If only official API configuration is present
- ❌ **Fail**: If deprecated configuration is detected
- ❌ **Fail**: If required `OPENAI_API_KEY` is missing

### Error Messages

If you see configuration errors, they will include:

- List of deprecated variables found
- Step-by-step migration instructions
- Links to get your API key
- Examples of correct configuration

## Supported Configuration Options

### Required

- `OPENAI_API_KEY`: Your official OpenAI API key

### Optional

- `OPENAI_API_BASE_URL`: Custom API endpoint (default: https://api.openai.com)
- `OPENAI_API_MODEL`: Model to use (default: gpt-4o)
- `OPENAI_API_DISABLE_DEBUG`: Disable debug logging (default: false)
- `TIMEOUT_MS`: Request timeout in milliseconds (default: 100000)
- `AUTH_SECRET_KEY`: Enable authentication (optional)
- `MAX_REQUEST_PER_HOUR`: Rate limiting (optional)

### Proxy Support (Retained)

The following proxy configurations are still supported:

- `SOCKS_PROXY_HOST`, `SOCKS_PROXY_PORT`
- `SOCKS_PROXY_USERNAME`, `SOCKS_PROXY_PASSWORD`
- `HTTPS_PROXY`

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

## Benefits of Migration

✅ **Security**: Official API is more secure and reliable
✅ **Stability**: No more proxy-related connection issues
✅ **Support**: Full OpenAI support and documentation
✅ **Features**: Access to latest models and features
✅ **Compliance**: Follows OpenAI's terms of service

## Getting Help

- **OpenAI API Documentation**: https://platform.openai.com/docs
- **Get API Keys**: https://platform.openai.com/api-keys
- **OpenAI Support**: https://help.openai.com/

## Migration Checklist

- [ ] Remove deprecated environment variables
- [ ] Get OpenAI API key from platform
- [ ] Set `OPENAI_API_KEY` in configuration
- [ ] Remove any reverse proxy configurations
- [ ] Test application startup (should show "Configuration validation passed")
- [ ] Verify chat functionality works
- [ ] Update any deployment scripts or documentation

---

**Need help?** Check the error messages during startup - they include specific migration steps for your configuration.
