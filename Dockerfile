# Multi-stage build for ChatGPT Web monorepo

# Build frontend (apps/web)
FROM node:24-alpine AS frontend

# Build arguments for frontend configuration
ARG VITE_GLOB_API_URL=/api
ARG VITE_GLOB_OPEN_LONG_REPLY=false
ARG VITE_GLOB_APP_PWA=false

RUN npm install pnpm -g

WORKDIR /app

# Copy root package files
COPY ./package.json ./pnpm-lock.yaml ./pnpm-workspace.yaml ./turbo.json ./

# Copy shared packages
COPY ./packages ./packages

# Copy web app
COPY ./apps/web ./apps/web

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build frontend with environment variables from build args
ENV VITE_GLOB_API_URL=${VITE_GLOB_API_URL}
ENV VITE_GLOB_OPEN_LONG_REPLY=${VITE_GLOB_OPEN_LONG_REPLY}
ENV VITE_GLOB_APP_PWA=${VITE_GLOB_APP_PWA}

RUN cd apps/web && pnpm build

# Build backend (apps/api)
FROM node:24-alpine AS backend

RUN npm install pnpm -g

WORKDIR /app

# Copy root package files
COPY ./package.json ./pnpm-lock.yaml ./pnpm-workspace.yaml ./turbo.json ./

# Copy shared packages
COPY ./packages ./packages

# Copy API app
COPY ./apps/api ./apps/api

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build backend
RUN cd apps/api && pnpm build

# Production runtime
FROM node:24-alpine

RUN npm install pnpm -g

WORKDIR /app

# Copy root package files
COPY ./package.json ./pnpm-lock.yaml ./pnpm-workspace.yaml ./

# Copy shared packages
COPY ./packages ./packages

# Copy API app
COPY ./apps/api ./apps/api

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built frontend to serve as static files
COPY --from=frontend /app/apps/web/dist ./apps/api/public

# Copy built backend
COPY --from=backend /app/apps/api/build ./apps/api/build

# Set working directory to API
WORKDIR /app/apps/api

# Declare environment variables for documentation and runtime
ENV NODE_ENV=production
ENV PORT=3002

# AI Provider Configuration
ENV AI_PROVIDER=openai

# OpenAI Configuration
ENV OPENAI_API_KEY=
ENV OPENAI_API_BASE_URL=https://api.openai.com

# Default Model Configuration
ENV DEFAULT_MODEL=gpt-4o

# Azure OpenAI Configuration
ENV AZURE_OPENAI_API_KEY=
ENV AZURE_OPENAI_ENDPOINT=
ENV AZURE_OPENAI_DEPLOYMENT=
ENV AZURE_OPENAI_API_VERSION=2024-02-15-preview
ENV AZURE_OPENAI_USE_RESPONSES_API=true

# Security Configuration
ENV AUTH_SECRET_KEY=
ENV SESSION_SECRET=
ENV MAX_REQUEST_PER_HOUR=100
ENV RATE_LIMIT_WINDOW_MS=3600000
ENV RATE_LIMIT_MAX_REQUESTS=100

# Performance Configuration
ENV TIMEOUT_MS=60000
ENV RETRY_MAX_ATTEMPTS=3
ENV RETRY_BASE_DELAY=1000

# Reasoning Models Configuration
ENV ENABLE_REASONING_MODELS=true
ENV REASONING_MODEL_TIMEOUT_MS=120000

# Logging Configuration
ENV LOG_LEVEL=info
ENV ENABLE_REQUEST_LOGGING=false

# HTTPS Configuration (Production)
ENV HTTPS=
ENV SSL_CERT_PATH=
ENV SSL_KEY_PATH=

# CORS Configuration
ENV ALLOWED_ORIGINS=
ENV CORS_CREDENTIALS=true

# Proxy Configuration (optional)
ENV SOCKS_PROXY_HOST=
ENV SOCKS_PROXY_PORT=
ENV SOCKS_PROXY_USERNAME=
ENV SOCKS_PROXY_PASSWORD=
ENV HTTPS_PROXY=
ENV ALL_PROXY=

EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

CMD ["pnpm", "run", "prod"]
