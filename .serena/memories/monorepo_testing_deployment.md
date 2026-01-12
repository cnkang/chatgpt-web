# Monorepo 测试和部署策略

## 测试策略

### 分层测试架构

#### 1. 包级测试

每个包维护自己的测试套件：

```bash
# 包特定测试
pnpm --filter @chatgpt-web/shared test      # 共享包测试
pnpm --filter @chatgpt-web/api test         # 后端测试
pnpm --filter @chatgpt-web/web test         # 前端测试（如果有）
```

#### 2. 集成测试

跨包功能的端到端测试：

```bash
# 集成测试
pnpm test:integration                        # 跨包集成测试
pnpm --filter @chatgpt-web/api test:integration    # API 集成测试
```

#### 3. 属性测试

使用 Fast-check 进行属性测试：

```typescript
// packages/shared/src/validation/schemas.test.ts
import fc from 'fast-check'
import { ChatMessageSchema } from './schemas'

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
// vitest.config.ts (根目录)
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
// packages/shared/src/test-utils/generators.ts
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
# 并行运行独立包的测试
pnpm --parallel --filter "./packages/*" test

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
      - run: pnpm build # 构建所有包
      - run: pnpm test # 运行所有测试
      - run: pnpm lint # 代码质量检查
```

## 部署策略

### 独立应用部署

#### 前端部署 (apps/web)

```bash
# 构建前端应用
pnpm --filter @chatgpt-web/web build

# 部署到静态托管
# 输出目录: apps/web/dist/
```

#### 后端部署 (apps/api)

```bash
# 构建后端应用
pnpm --filter @chatgpt-web/api build

# 运行生产服务器
pnpm --filter @chatgpt-web/api start
```

### Docker 部署策略

#### 多阶段构建

```dockerfile
# Dockerfile
FROM node:24-alpine AS base
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/
COPY apps/ ./apps/

# 安装依赖
FROM base AS deps
RUN corepack enable pnpm
RUN pnpm install --frozen-lockfile

# 构建阶段
FROM deps AS builder
RUN pnpm build

# 生产阶段
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
```

### 环境特定部署

#### 开发环境

```bash
# 启动所有服务
pnpm dev                                     # 前端 + 后端开发服务器

# 环境变量
cp apps/api/.env.example apps/api/.env
# 配置开发环境的 API 密钥和设置
```

#### 生产环境

```bash
# 构建所有包
pnpm build

# 生产环境变量
export NODE_ENV=production
export OPENAI_API_KEY=sk-xxx
export PORT=3002

# 启动生产服务器
pnpm --filter @chatgpt-web/api start
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
    "startCommand": "pnpm --filter @chatgpt-web/api start",
    "healthcheckPath": "/health"
  }
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
```

### 部署验证

#### 健康检查

```typescript
// apps/api/src/health.ts
export const healthCheck = async (): Promise<HealthStatus> => {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    dependencies: {
      shared: await checkSharedPackage(),
      database: await checkDatabase(),
      ai_provider: await checkAIProvider(),
    },
  }
}
```

#### 部署后测试

```bash
# 验证部署
curl http://localhost:3002/health         # 健康检查
curl http://localhost:3002/api/chat       # API 测试

# 集成测试
pnpm test:e2e                            # 端到端测试
```

## 监控和日志

### 应用监控

```typescript
// apps/api/src/monitoring.ts
import { logger } from '@chatgpt-web/shared'

export const monitoringMiddleware = (req, res, next) => {
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
// packages/shared/src/error-tracking.ts
export class MonorepoError extends Error {
  constructor(
    message: string,
    public package: string,
    public context?: Record<string, any>,
  ) {
    super(message)
    this.name = 'MonorepoError'
  }
}
```

## 性能优化

### 构建优化

```bash
# Turborepo 缓存
pnpm build                               # 利用缓存
pnpm build --force                       # 跳过缓存

# 并行构建
pnpm --parallel --filter "./packages/*" build
```

### 运行时优化

```typescript
// 共享包的树摇优化
// packages/shared/package.json
{
  "sideEffects": false,
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  }
}
```

### 部署优化

- **CDN**: 静态资源使用 CDN 分发
- **缓存**: 合理设置 HTTP 缓存头
- **压缩**: 启用 gzip/brotli 压缩
- **负载均衡**: 多实例部署和负载均衡
