# Monorepo 测试和部署策略

## Monorepo 结构

PNPM workspace with two apps:
- `apps/web/` - Vue 3 frontend (port 1002)
- `apps/api/` - Node.js 24 backend (port 3002)

## 测试策略

### 分层测试架构

#### 1. 应用级测试

```bash
# 前端测试（如果配置）
cd apps/web && pnpm test

# 后端测试
cd apps/api && pnpm test            # Run all tests
cd apps/api && pnpm test:watch      # Watch mode
cd apps/api && pnpm test:ui         # Vitest UI
```

#### 2. 集成测试

```bash
# 后端集成测试
cd apps/api && pnpm test:integration

# 跨应用集成测试（如果配置）
pnpm test:integration
```

#### 3. 性能测试

```bash
# 后端性能测试
cd apps/api && pnpm test:performance
```

#### 4. 属性测试

使用 Fast-check 进行属性测试：

```typescript
// apps/api/src/validation/schemas.test.ts
import fc from 'fast-check'
import { ChatMessageSchema } from './schemas.js'

test('ChatMessage schema validation', () => {
  fc.assert(
    fc.property(
      fc.record({
        id: fc.string(),
        content: fc.string(),
        role: fc.constantFrom('user', 'assistant'),
        timestamp: fc.date(),
      }),
      message => {
        const result = ChatMessageSchema.safeParse(message)
        expect(result.success).toBe(true)
      },
    ),
  )
})
```

### 测试工具和配置

#### Vitest 配置

```typescript
// apps/api/vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
  },
})
```

#### 共享测试工具

```typescript
// apps/api/src/test-utils/property-generators.ts
export const generateChatMessage = (): ChatMessage => ({
  id: crypto.randomUUID(),
  content: 'Test message',
  role: 'user',
  timestamp: new Date(),
})
```

### 测试执行策略

#### 并行测试

```bash
# 并行运行独立应用的测试
pnpm --parallel --filter "./apps/*" test

# 串行运行有依赖关系的测试
pnpm test                                    # 按依赖顺序运行
```

#### CI/CD 测试流水线

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install --frozen-lockfile
      - run: pnpm build # 构建所有应用
      - run: pnpm test # 运行所有测试
      - run: pnpm quality # 代码质量检查
```

## 部署策略

### 独立应用部署

#### 前端部署 (apps/web)

```bash
# 构建前端应用
cd apps/web && pnpm build

# 部署到静态托管
# 输出目录: apps/web/dist/
# 支持: Vercel, Netlify, Cloudflare Pages, etc.
```

#### 后端部署 (apps/api)

```bash
# 构建后端应用
cd apps/api && pnpm build

# 运行生产服务器
cd apps/api && pnpm start
# 或
cd apps/api && pnpm prod
```

### Docker 部署策略

#### 多阶段构建

```dockerfile
# Dockerfile
FROM node:24-alpine AS base
WORKDIR /app

# 复制 workspace 配置
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/ ./apps/

# 安装依赖
FROM base AS deps
RUN corepack enable pnpm
RUN pnpm install --frozen-lockfile

# 构建阶段
FROM deps AS builder
RUN pnpm build

# 生产阶段 - 后端
FROM node:24-alpine AS runner
WORKDIR /app
COPY --from=builder /app/apps/api/build ./
COPY --from=builder /app/apps/web/dist ./public
EXPOSE 3002
CMD ["node", "index.js"]
```

#### 优化的 Docker 构建

```bash
# 利用 Turborepo 缓存
docker build --target builder -t chatgpt-web-builder .
docker build --target runner -t chatgpt-web .

# 运行容器
docker run --name chatgpt-web -d -p 127.0.0.1:3002:3002 \
  --env OPENAI_API_KEY=sk-xxx \
  --env AI_PROVIDER=openai \
  --env AUTH_SECRET_KEY=xxx \
  chatgpt-web
```

### 环境特定部署

#### 开发环境

```bash
# 启动所有服务（两个终端）
# Terminal 1: Frontend (port 1002)
pnpm dev

# Terminal 2: Backend (port 3002)
cd apps/api && pnpm dev

# 环境变量
cp apps/api/.env.example apps/api/.env
# 配置开发环境的 API 密钥和设置
```

#### 生产环境

```bash
# 构建所有应用
pnpm build

# 生产环境变量
export NODE_ENV=production
export OPENAI_API_KEY=sk-xxx
export AI_PROVIDER=openai
export AUTH_SECRET_KEY=xxx
export MAX_REQUEST_PER_HOUR=100
export TIMEOUT_MS=60000
export PORT=3002

# 启动生产服务器
cd apps/api && pnpm start
```

### 云平台部署

#### Railway 部署

```json
// railway.json
{
  "build": {
    "builder": "nixpacks",
    "buildCommand": "pnpm install && pnpm build"
  },
  "deploy": {
    "startCommand": "cd apps/api && pnpm start",
    "healthcheckPath": "/health"
  }
}
```

#### Vercel 部署

```json
// vercel.json
{
  "buildCommand": "pnpm build",
  "outputDirectory": "apps/web/dist",
  "framework": "vite"
}
```

#### Kubernetes 部署

```yaml
# k8s/deployment.yaml
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
          image: chatgpt-web:latest
          ports:
            - containerPort: 3002
          env:
            - name: OPENAI_API_KEY
              valueFrom:
                secretKeyRef:
                  name: chatgpt-web-secrets
                  key: openai-api-key
            - name: AI_PROVIDER
              value: "openai"
            - name: AUTH_SECRET_KEY
              valueFrom:
                secretKeyRef:
                  name: chatgpt-web-secrets
                  key: auth-secret-key
```

### 部署验证

#### 健康检查

```typescript
// apps/api/src/routes/health.ts
export const healthCheck = async (): Promise<HealthStatus> => {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    dependencies: {
      ai_provider: await checkAIProvider(),
      redis: await checkRedis(),
    },
  }
}
```

#### 部署后测试

```bash
# 验证部署
curl http://localhost:3002/health         # 健康检查
curl http://localhost:3002/api/config     # 配置检查

# 前端访问
open http://localhost:1002                # 或访问部署的 URL

# 集成测试
cd apps/api && pnpm test:integration
```

## 监控和日志

### 应用监控

```typescript
// apps/api/src/middleware-native/request-logger.ts
import { logger } from '../utils/logger.js'

export const requestLoggerMiddleware = (req, res, next) => {
  const start = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - start
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
    })
  })

  next()
}
```

### 错误追踪

```typescript
// apps/api/src/utils/error-handler.ts
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public context?: Record<string, any>,
  ) {
    super(message)
    this.name = 'APIError'
  }
}

// 使用 logger.ts 记录所有错误
logger.error('API Error', { error, context })
```

## 性能优化

### 构建优化

```bash
# Turborepo 缓存
pnpm build                               # 利用缓存
pnpm build --force                       # 跳过缓存

# 并行构建
pnpm --parallel --filter "./apps/*" build
```

### Frontend 优化

```typescript
// apps/web/vite.config.ts
export default defineConfig({
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          'ui-vendor': ['naive-ui'],
          'ai-vendor': ['@ai-sdk/vue', 'ai'],
        },
      },
    },
  },
})
```

### Backend 优化

- **Native HTTP/2**: Multiplexing support
- **Streaming**: AI SDK's streamText and pipeUIMessageStreamToResponse
- **Circuit breaker**: Fault tolerance for external APIs
- **Retry logic**: Exponential backoff (utils/retry.ts)
- **Connection pooling**: Redis connection pool

### 部署优化

- **CDN**: 静态资源使用 CDN 分发
- **缓存**: 合理设置 HTTP 缓存头
- **压缩**: 启用 gzip/brotli 压缩
- **负载均衡**: 多实例部署和负载均衡
- **Redis**: Session storage and caching

## Monorepo 特定考虑

### 依赖管理

- Frontend 和 backend 完全隔离
- No shared code between apps/web/ and apps/api/
- Use packages/ if shared code needed
- PNPM workspace for dependency management

### 构建顺序

```json
// turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "build/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"]
    }
  }
}
```

### 环境变量管理

```bash
# 前端环境变量（apps/web/.env）
VITE_API_BASE_URL=http://localhost:3002

# 后端环境变量（apps/api/.env）
OPENAI_API_KEY=sk-xxx
AI_PROVIDER=openai
AUTH_SECRET_KEY=xxx
MAX_REQUEST_PER_HOUR=100
TIMEOUT_MS=60000
PORT=3002
```

## 性能基准

### Frontend
- First contentful paint < 1.5s
- Main chunk < 500KB
- Route-based code splitting
- Lazy loading for components

### Backend
- API response < 200ms (excluding AI provider latency)
- Streaming responses via AI SDK
- Circuit breaker for external APIs
- Retry logic with exponential backoff
