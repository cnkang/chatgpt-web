# ChatGPT Web

> Disclaimer: This project is based on the original open source project with modifications and optimizations, following the MIT license, free and for open source learning usage. And there will be no any form of account selling, paid service, discussion group, discussion group and other behaviors. Beware of being deceived.

> Original project: https://github.com/Chanzhaoyu/chatgpt-web

[中文](README.zh.md)

![cover](./docs/c1.png)
![cover2](./docs/c2.png)

- [ChatGPT Web](#chatgpt-web)
  - [Introduction](#introduction)
  - [New Features](#new-features)
  - [Roadmap](#roadmap)
  - [Prerequisites](#prerequisites)
    - [Node](#node)
    - [PNPM](#pnpm)
    - [Filling in the Key](#filling-in-the-key)
  - [Install Dependencies](#install-dependencies)
    - [Backend](#backend)
    - [Frontend](#frontend)
  - [Run in Test Environment](#run-in-test-environment)
    - [Backend Service](#backend-service)
    - [Frontend Webpage](#frontend-webpage)
  - [Environment Variables](#environment-variables)
  - [Packaging](#packaging)
    - [Use Docker](#use-docker)
      - [Docker Parameter Examples](#docker-parameter-examples)
      - [Docker build \& Run](#docker-build--run)
      - [Docker compose](#docker-compose)
      - [Prevent Crawlers](#prevent-crawlers)
    - [Deploy with Railway](#deploy-with-railway)
      - [Railway Environment Variables](#railway-environment-variables)
    - [Deploy with Sealos](#deploy-with-sealos)
    - [Package Manually](#package-manually)
      - [Backend Service](#backend-service-1)
      - [Frontend Webpage](#frontend-webpage-1)
  - [FAQ](#faq)
  - [Contributing](#contributing)
  - [Acknowledgements](#acknowledgements)
  - [Sponsors](#sponsors)
  - [License](#license)

## Introduction

This ChatGPT Web application provides a clean, modern interface for interacting with OpenAI's official ChatGPT API. The application has been completely modernized with Node.js 24, Vue.js 3.5+, and the latest OpenAI API v1 with native Azure OpenAI support.

**Supported API Methods:**

- **OpenAI Official API v1**: Uses the latest OpenAI API v1 with support for `gpt-5.2`, `gpt-5.1`, `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`, and reasoning models (`o1`, `o1-preview`, `o1-mini`)
- **Azure OpenAI**: Native Azure OpenAI Service integration for enterprise deployments with v1 responses API support
- **Reasoning Models**: Full support for OpenAI's reasoning models with step-by-step thought display

**Security and Reliability:**

- Only official API methods are supported for maximum security
- Comprehensive input validation and sanitization
- Security headers (CSP, HSTS, X-Frame-Options) implementation
- Rate limiting and request throttling
- Secure API key handling and session management
- Zero TypeScript errors and ESLint warnings

**Modern Architecture:**

- **Node.js 24**: Latest Node.js features and performance improvements
- **Vue.js 3.5+**: Modern Vue.js with Composition API and performance optimizations
- **TypeScript**: Strict type checking with zero errors
- **Provider Abstraction**: Seamless switching between OpenAI and Azure OpenAI
- **Native Fetch**: Uses Node.js native fetch instead of external HTTP libraries
- **Property-Based Testing**: Comprehensive testing with Fast-check library

**Setup:**

1. Enter the `service/.env.example` file, copy the contents to the `service/.env` file
2. Fill in the `OPENAI_API_KEY` field with your official OpenAI API key [(get apiKey)](https://platform.openai.com/api-keys)
3. Optionally configure Azure OpenAI or other provider settings

**Migration from Unofficial API:**

If you were previously using the unofficial proxy API (accessToken method), you need to migrate to the official API:

1. **Remove deprecated variables** from your `.env` file:
   - `OPENAI_ACCESS_TOKEN`
   - `API_REVERSE_PROXY`

2. **Add official API configuration**:
   - `OPENAI_API_KEY=sk-your_official_api_key_here`
   - Optionally: `OPENAI_API_BASE_URL=https://api.openai.com` (if using custom endpoint)

3. **Get your official API key**: Visit [OpenAI API Keys](https://platform.openai.com/api-keys) to create your API key

4. **Important**: The unofficial proxy API method has been completely removed for security and reliability reasons

Environment variables:

See all parameter variables [here](#environment-variables)

## New Features

**🚀 Latest Technology Stack:**

- Node.js 24 with native fetch and modern JavaScript features
- Vue.js 3.5+ with Composition API and reactive props destructuring
- TypeScript 5.9+ with strict configuration and zero errors
- Vite build system optimized for Node.js 24

**🤖 Advanced AI Features:**

- OpenAI API v1 native integration with all endpoints
- Reasoning models support (o1, o1-preview, o1-mini) with step-by-step display
- Azure OpenAI native integration with v1 responses API for enhanced reasoning and context retention
- Streaming responses for both OpenAI and Azure providers
- Provider abstraction layer for seamless switching

**🔒 Enhanced Security:**

- Comprehensive input validation and XSS protection
- Security headers implementation (CSP, HSTS, X-Frame-Options)
- Rate limiting and request throttling
- Secure API key handling with no client-side exposure
- Session management with secure cookies

**⚡ Performance Optimizations:**

- Route-based code splitting and lazy loading
- Bundle optimization and modern browser targets
- Hot module replacement for development
- Optimized build analysis and caching strategies

**🧪 Quality Assurance:**

- Property-based testing with Fast-check
- Zero TypeScript errors and ESLint warnings
- Comprehensive test coverage for all providers
- Pre-commit hooks for code quality validation

**🛠 Developer Experience:**

- Modern ESLint configuration with zero warnings policy
- Prettier integration with consistent formatting
- Conventional commit message standards
- Comprehensive error handling and retry logic

## Roadmap

[✓] Dual models

[✓] Multi-session storage and context logic

[✓] Formatting and beautification of code and other message types

[✓] Access control

[✓] Data import/export

[✓] Save messages as local images

[✓] Multilingual interface

[✓] Interface themes

[✗] More...

## Prerequisites

### Node

`node` requires version `^24.0.0` (Node.js 24 or higher), use [nvm](https://github.com/nvm-sh/nvm) to manage multiple local `node` versions

```shell
node -v
```

**Important**: This application requires Node.js 24 for:

- Native fetch API support
- Modern JavaScript features and performance improvements
- Enhanced security and stability
- Optimized build processes

### PNPM

If you haven't installed `pnpm` (version 10.0.0 or higher required)

```shell
npm install pnpm@latest -g
```

### Filling in the Key

Get your official `OpenAI API Key` and fill in the local environment variables. Visit [OpenAI API Keys](https://platform.openai.com/api-keys) to create your API key.

```
# service/.env file

# OpenAI API Key - https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your_official_api_key_here

# Optional: Custom API base URL (for Azure OpenAI or other compatible endpoints)
OPENAI_API_BASE_URL=https://api.openai.com

# Optional: Azure OpenAI Configuration
AZURE_OPENAI_API_KEY=your_azure_api_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=your-deployment-name
AZURE_OPENAI_API_VERSION=2024-02-15-preview
```

**Migration Notice**: If you were previously using `OPENAI_ACCESS_TOKEN` or `API_REVERSE_PROXY`, these are no longer supported. Please migrate to the official API key method above.

## Install Dependencies

> For the convenience of "backend developers" to understand the burden, the front-end "workspace" mode is not adopted, but separate folders are used to store them. If you only need to do secondary development of the front-end page, delete the `service` folder.

### Backend

Enter the folder `/service` and run the following commands

```shell
pnpm install
```

### Frontend

Run the following commands at the root directory

```shell
pnpm bootstrap
```

## Run in Test Environment

### Backend Service

Enter the folder `/service` and run the following commands

```shell
pnpm start
```

### Frontend Webpage

Run the following commands at the root directory

```shell
pnpm dev
```

## Environment Variables

**Required Variables:**

- `OPENAI_API_KEY` - Your official OpenAI API key [(get apiKey)](https://platform.openai.com/api-keys)

**OpenAI API Configuration:**

- `OPENAI_API_MODEL` - Set model, optional, default: `gpt-4o`
- `OPENAI_API_BASE_URL` - Set interface address, optional, default: `https://api.openai.com`
- `OPENAI_API_DISABLE_DEBUG` - Set interface to close debug logs, optional, default: empty does not close

**Azure OpenAI Configuration:**

- `AZURE_OPENAI_API_KEY` - Your Azure OpenAI API key
- `AZURE_OPENAI_ENDPOINT` - Your Azure OpenAI endpoint (e.g., `https://your-resource.openai.azure.com`)
- `AZURE_OPENAI_DEPLOYMENT` - Your Azure OpenAI deployment name
- `AZURE_OPENAI_API_VERSION` - Azure OpenAI API version, default: `2024-02-15-preview`

**Provider Selection:**

- `AI_PROVIDER` - Choose AI provider: `openai` (default) or `azure`

**Security Configuration:**

- `AUTH_SECRET_KEY` - Access permission key, optional
- `MAX_REQUEST_PER_HOUR` - Maximum number of requests per hour, optional, unlimited by default
- `RATE_LIMIT_WINDOW_MS` - Rate limiting window in milliseconds, default: 3600000 (1 hour)
- `RATE_LIMIT_MAX_REQUESTS` - Maximum requests per window, default: 100

**Performance Configuration:**

- `TIMEOUT_MS` - Timeout, unit milliseconds, optional, default: 60000
- `RETRY_MAX_ATTEMPTS` - Maximum retry attempts for failed requests, default: 3
- `RETRY_BASE_DELAY` - Base delay between retries in milliseconds, default: 1000

**Proxy Configuration:**

- `SOCKS_PROXY_HOST` and `SOCKS_PROXY_PORT` - Socks proxy configuration, both required together, optional
- `SOCKS_PROXY_USERNAME` and `SOCKS_PROXY_PASSWORD` - Socks proxy authentication, optional
- `HTTPS_PROXY` - Support `http`, `https`, `socks5`, optional
- `ALL_PROXY` - Support `http`, `https`, `socks5`, optional

**Development Configuration:**

- `NODE_ENV` - Environment mode: `development`, `production`, or `test`
- `LOG_LEVEL` - Logging level: `error`, `warn`, `info`, `debug`
- `ENABLE_CORS` - Enable CORS for development, default: `true` in development

**Reasoning Models Configuration:**

- `ENABLE_REASONING_MODELS` - Enable reasoning models (o1, o1-preview, o1-mini), default: `true`
- `REASONING_MODEL_TIMEOUT_MS` - Timeout for reasoning models, default: 120000 (2 minutes)

**Deprecated Variables (No Longer Supported):**

The following environment variables have been removed and are no longer supported:

- ~~`OPENAI_ACCESS_TOKEN`~~ - Use `OPENAI_API_KEY` instead
- ~~`API_REVERSE_PROXY`~~ - No longer needed with official API

**Migration Guide:**

If you have any of the deprecated variables in your configuration:

1. **Remove** these variables from your `.env` file:

   ```bash
   # Remove these lines
   OPENAI_ACCESS_TOKEN=xxx
   API_REVERSE_PROXY=xxx
   ```

2. **Add** the official API key:

   ```bash
   # Add this line
   OPENAI_API_KEY=sk-your_official_api_key_here
   ```

3. **Get your API key** from [OpenAI API Keys](https://platform.openai.com/api-keys)

**Example Configuration Files:**

**OpenAI Configuration (.env):**

```bash
# OpenAI Provider Configuration
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your_official_api_key_here
OPENAI_API_MODEL=gpt-4o
OPENAI_API_BASE_URL=https://api.openai.com

# Security
AUTH_SECRET_KEY=your_secret_key
MAX_REQUEST_PER_HOUR=100

# Performance
TIMEOUT_MS=60000
RETRY_MAX_ATTEMPTS=3
```

**Azure OpenAI Configuration (.env):**

```bash
# Azure OpenAI Provider Configuration
AI_PROVIDER=azure
AZURE_OPENAI_API_KEY=your_azure_api_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-4o-deployment
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# Security
AUTH_SECRET_KEY=your_secret_key
MAX_REQUEST_PER_HOUR=100

# Performance
TIMEOUT_MS=60000
RETRY_MAX_ATTEMPTS=3
```

## Packaging

### Use Docker

#### Docker Parameter Examples

![docker](./docs/docker.png)

#### Docker build & Run

```bash
docker build -t chatgpt-web .

# Foreground running
docker run --name chatgpt-web --rm -it -p 127.0.0.1:3002:3002 --env OPENAI_API_KEY=your_api_key chatgpt-web

# Background running
docker run --name chatgpt-web -d -p 127.0.0.1:3002:3002 --env OPENAI_API_KEY=your_api_key chatgpt-web

# Run address
http://localhost:3002/
```

#### Docker compose

[Hub address](https://hub.docker.com/repository/docker/chenzhaoyu94/chatgpt-web/general)

```yml
version: '3'

services:
  app:
    image: chenzhaoyu94/chatgpt-web # always use latest, pull the tag image again to update
    ports:
      - 127.0.0.1:3002:3002
    environment:
      # Required: Choose AI Provider
      AI_PROVIDER: openai # or 'azure'

      # OpenAI Configuration (when AI_PROVIDER=openai)
      OPENAI_API_KEY: sk-your_official_api_key_here
      OPENAI_API_BASE_URL: https://api.openai.com
      OPENAI_API_MODEL: gpt-4o # Latest model with reasoning support

      # Azure OpenAI Configuration (when AI_PROVIDER=azure)
      # AZURE_OPENAI_API_KEY: your_azure_api_key
      # AZURE_OPENAI_ENDPOINT: https://your-resource.openai.azure.com
      # AZURE_OPENAI_DEPLOYMENT: gpt-4o-deployment
      # AZURE_OPENAI_API_VERSION: 2024-02-15-preview

      # Security Configuration
      AUTH_SECRET_KEY: your_secret_key
      MAX_REQUEST_PER_HOUR: 100
      RATE_LIMIT_WINDOW_MS: 3600000
      RATE_LIMIT_MAX_REQUESTS: 100

      # Performance Configuration
      TIMEOUT_MS: 60000
      RETRY_MAX_ATTEMPTS: 3
      RETRY_BASE_DELAY: 1000

      # Reasoning Models (optional)
      ENABLE_REASONING_MODELS: true
      REASONING_MODEL_TIMEOUT_MS: 120000

      # Proxy Configuration (optional)
      # SOCKS_PROXY_HOST: xxx
      # SOCKS_PROXY_PORT: xxx
      # SOCKS_PROXY_USERNAME: xxx
      # SOCKS_PROXY_PASSWORD: xxx
      # HTTPS_PROXY: http://xxx:7890

      # Development Configuration
      NODE_ENV: production
      LOG_LEVEL: info
```

**Supported Models:**

**OpenAI Models:**

- `gpt-4o`, `gpt-4o-mini` - Latest GPT-4o models with enhanced capabilities
- `gpt-4-turbo`, `gpt-4-turbo-preview` - GPT-4 Turbo models
- `gpt-4`, `gpt-4-32k` - Standard GPT-4 models
- `gpt-3.5-turbo`, `gpt-3.5-turbo-16k` - Legacy GPT-3.5 Turbo models (not recommended)
- `o1`, `o1-preview`, `o1-mini` - Reasoning models with step-by-step thinking

**Azure OpenAI Models:**

- Use your deployment names configured in Azure OpenAI Studio
- Supports all models available in your Azure OpenAI resource

**Note**: This application now supports both OpenAI API v1 and Azure OpenAI with native integration, reasoning models, and enhanced security features.

#### Prevent Crawlers

**nginx**

Fill in the following configuration in the nginx configuration file to prevent crawlers. You can refer to the `docker-compose/nginx/nginx.conf` file to add anti-crawler methods

```
    # Prevent crawlers
    if ($http_user_agent ~* "360Spider|JikeSpider|Spider|spider|bot|Bot|2345Explorer|curl|wget|webZIP|qihoobot|Baiduspider|Googlebot|Googlebot-Mobile|Googlebot-Image|Mediapartners-Google|Adsbot-Google|Feedfetcher-Google|Yahoo! Slurp|Yahoo! Slurp China|YoudaoBot|Sosospider|Sogou spider|Sogou web spider|MSNBot|ia_archiver|Tomato Bot|NSPlayer|bingbot")
    {
      return 403;
    }
```

### Deploy with Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template/yytmgc)

#### Railway Environment Variables

| Environment variable name    | Required | Remarks                                                                      |
| ---------------------------- | -------- | ---------------------------------------------------------------------------- |
| `PORT`                       | Required | Default `3002`                                                               |
| `AI_PROVIDER`                | Optional | Choose provider: `openai` (default) or `azure`                               |
| `OPENAI_API_KEY`             | Required | Official OpenAI API key [(get apiKey)](https://platform.openai.com/api-keys) |
| `OPENAI_API_BASE_URL`        | Optional | API interface address, default: `https://api.openai.com`                     |
| `OPENAI_API_MODEL`           | Optional | API model, default: `gpt-4o`                                                 |
| `AZURE_OPENAI_API_KEY`       | Optional | Azure OpenAI API key (required when `AI_PROVIDER=azure`)                     |
| `AZURE_OPENAI_ENDPOINT`      | Optional | Azure OpenAI endpoint (required when `AI_PROVIDER=azure`)                    |
| `AZURE_OPENAI_DEPLOYMENT`    | Optional | Azure OpenAI deployment name (required when `AI_PROVIDER=azure`)             |
| `AZURE_OPENAI_API_VERSION`   | Optional | Azure OpenAI API version, default: `2024-02-15-preview`                      |
| `AUTH_SECRET_KEY`            | Optional | Access permission key                                                        |
| `MAX_REQUEST_PER_HOUR`       | Optional | Maximum number of requests per hour, optional, unlimited by default          |
| `RATE_LIMIT_WINDOW_MS`       | Optional | Rate limiting window in milliseconds, default: 3600000                       |
| `RATE_LIMIT_MAX_REQUESTS`    | Optional | Maximum requests per window, default: 100                                    |
| `TIMEOUT_MS`                 | Optional | Timeout, unit milliseconds, default: 60000                                   |
| `RETRY_MAX_ATTEMPTS`         | Optional | Maximum retry attempts, default: 3                                           |
| `RETRY_BASE_DELAY`           | Optional | Base delay between retries in milliseconds, default: 1000                    |
| `ENABLE_REASONING_MODELS`    | Optional | Enable reasoning models, default: `true`                                     |
| `REASONING_MODEL_TIMEOUT_MS` | Optional | Timeout for reasoning models, default: 120000                                |
| `SOCKS_PROXY_HOST`           | Optional | Socks proxy, take effect with `SOCKS_PROXY_PORT`                             |
| `SOCKS_PROXY_PORT`           | Optional | Socks proxy port, take effect with `SOCKS_PROXY_HOST`                        |
| `SOCKS_PROXY_USERNAME`       | Optional | Socks proxy username, take effect with `SOCKS_PROXY_HOST`                    |
| `SOCKS_PROXY_PASSWORD`       | Optional | Socks proxy password, take effect with `SOCKS_PROXY_HOST`                    |
| `HTTPS_PROXY`                | Optional | HTTPS proxy, support http,https, socks5                                      |
| `ALL_PROXY`                  | Optional | All proxies, support http,https, socks5                                      |
| `NODE_ENV`                   | Optional | Environment mode: `production` (recommended for Railway)                     |
| `LOG_LEVEL`                  | Optional | Logging level: `error`, `warn`, `info`, `debug`                              |

**Migration Notice**: The following variables are no longer supported:

- ~~`OPENAI_ACCESS_TOKEN`~~ - Use `OPENAI_API_KEY` instead
- ~~`API_REVERSE_PROXY`~~ - No longer needed with official API

**Provider Configuration Examples:**

**OpenAI Configuration:**

```
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your_official_api_key_here
OPENAI_API_MODEL=gpt-4o
```

**Azure OpenAI Configuration:**

```
AI_PROVIDER=azure
AZURE_OPENAI_API_KEY=your_azure_api_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-4o-deployment
AZURE_OPENAI_API_VERSION=2024-02-15-preview
```

> Note: Modifying environment variables on `Railway` will re-`Deploy`

### Deploy with Sealos

[![](https://raw.githubusercontent.com/labring-actions/templates/main/Deploy-on-Sealos.svg)](https://cloud.sealos.io/?openapp=system-fastdeploy%3FtemplateName%3Dchatgpt-web)

> Environment variables are consistent with Docker environment variables

### Package Manually

#### Backend Service

> If you don't need the `node` interface of this project, you can omit the following operations

Copy the `service` folder to the server where you have the `node` service environment.

```shell
# Install
pnpm install

# Pack
pnpm build

# Run
pnpm prod
```

PS: It is also okay to run `pnpm start` directly on the server without packing

#### Frontend Webpage

1. Modify the `VITE_GLOB_API_URL` field in the `.env` file at the root directory to your actual backend interface address

2. Run the following commands at the root directory, then copy the files in the `dist` folder to the root directory of your website service

[Reference](https://cn.vitejs.dev/guide/static -deploy.html#building-the-app)

```shell
pnpm build
```

## FAQ

Q: Why does `Git` commit always report errors?

A: Because there is a commit message verification, please follow the [Commit Guide](./CONTRIBUTING.md)

Q: Where to change the request interface if only the front-end page is used?

A: The `VITE_GLOB_API_URL` field in the `.env` file at the root directory.

Q: All files explode red when saving?

A: `vscode` please install the recommended plug-ins for the project, or manually install the `Eslint` plug-in.

Q: No typewriter effect on the front end?

A: One possible reason is that after Nginx reverse proxy, buffer is turned on, then Nginx will try to buffer some data from the backend before sending it to the browser. Please try adding `proxy_buffering off; ` after the reverse proxy parameter, then reload Nginx. Other web server configurations are similar.

## Contributing

Please read the [Contributing Guide](./CONTRIBUTING.md) before contributing

Thanks to everyone who has contributed!

<a href="https://github.com/cnkang/chatgpt-web/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=cnkang/chatgpt-web" />
</a>

## Acknowledgements

Thanks to [JetBrains](https://www.jetbrains.com/) SoftWare for providing free Open Source license for this project.

Thanks to the original author [ChenZhaoYu](https://github.com/Chanzhaoyu) for creating this excellent open source project.

## License

MIT © [Kang Liu](./license)

Based on original project: MIT © [ChenZhaoYu](https://github.com/Chanzhaoyu/chatgpt-web)
