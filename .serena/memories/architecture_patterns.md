# 项目架构和设计模式

## 整体架构

ChatGPT Web 采用前后端分离的 Monorepo 架构：

- **前端**: Vue 3 + TypeScript + Vite (apps/web/, port 1002)
- **后端**: Node.js 24 + Native HTTP/2 + TypeScript (apps/api/, port 3002)
- **通信**: RESTful API + Vercel AI SDK streaming (UIMessage format)

## 前端架构模式 (apps/web/)

### 1. 组件化设计

```
components/
├── common/          # 可复用 UI（HoverButton, LoadingSpinner, NaiveProvider, Setting, SvgIcon, UserAvatar）
├── custom/          # 项目特定组件（GithubSite）
└── reasoning/       # AI 推理 UI（ModelSelector, ReasoningLoader, ReasoningSteps）
```

- **原子组件**: 基础 UI 组件
- **分子组件**: 组合组件
- **有机体组件**: 复杂业务组件
- **模板组件**: 页面布局
- **页面组件**: 完整页面

### 2. 状态管理 (Pinia 3+)

```
store/modules/
├── app/          # 应用全局状态
├── auth/         # 认证状态
├── chat/         # 聊天状态
├── settings/     # 设置状态
└── user/         # 用户状态
```

### 3. 路由设计

- 路由懒加载
- 权限守卫（router/permission.ts）
- 路由元信息

### 4. 组合式函数 (Composables)

```
hooks/
├── useBasicLayout.ts
├── useIconRender.ts
├── useLanguage.ts
├── useReasoning.ts
└── useTheme.ts

views/chat/hooks/    # Chat-specific hooks
```

### 5. AI SDK 集成

- **@ai-sdk/vue**: Chat class for streaming
- **UIMessage format**: 标准消息格式
- **NEVER custom streaming**: 使用 AI SDK UI

## 后端架构模式 (apps/api/)

### 1. 分层架构

```
src/
├── providers/           # AI provider implementations
├── chatgpt/            # Vercel AI SDK integration layer
├── routes/             # API route handlers
├── middleware-native/  # Native HTTP middleware
├── security/           # Security-critical validation
├── validation/         # Zod schemas
├── transport/          # Framework-agnostic abstractions
├── adapters/           # HTTP2Adapter (native HTTP/2 + HTTP/1.1)
├── utils/              # Shared utilities
└── config/             # Environment validation
```

### 2. Native HTTP/2 架构

**HTTP2Adapter** (adapters/http2-adapter.ts):
- Native Node.js `http2` module
- HTTP/1.1 fallback support
- No Express/Fastify/Koa

**Transport Layer** (transport/):
- Framework-agnostic abstractions
- TransportRequest/TransportResponse types
- RouterImpl for routing
- Middleware chain

### 3. AI Provider 模式

**Provider Pattern** (providers/):
```typescript
// base.ts - Abstract base
abstract class AIProvider {
  abstract chat(messages: Message[]): Promise<Response>
}

// openai.ts - OpenAI implementation
class OpenAIProvider extends AIProvider { }

// azure.ts - Azure OpenAI implementation
class AzureOpenAIProvider extends AIProvider { }

// factory.ts - Factory pattern
class AIProviderFactory {
  static create(type: 'openai' | 'azure'): AIProvider
}
```

**Vercel AI SDK Integration** (chatgpt/):
```typescript
// ai-sdk-chat.ts - Streaming chat
import { streamText } from 'ai'
import { pipeUIMessageStreamToResponse } from 'ai'

// provider-adapter.ts - Provider abstraction
```

### 4. Middleware 模式

Native HTTP middleware (middleware-native/):
- auth.ts - 认证
- body-parser.ts - 请求体解析
- cors.ts - CORS 处理
- rate-limiter.ts - 速率限制
- request-logger.ts - 请求日志
- security-headers.ts - 安全头
- session.ts - 会话管理
- static.ts - 静态文件
- validation.ts - 输入验证

### 5. 验证模式

**Zod for ALL validation**:
```typescript
// validation/schemas.ts - ALL user input validation
import { z } from 'zod'

export const ChatRequestSchema = z.object({
  message: z.string().min(1).max(10000),
  sessionId: z.string().uuid(),
})

// config/validator.ts - Config validation
// startup-validation.ts - Environment validation
```

## 设计模式

### 1. 工厂模式

AI Provider 创建：
```typescript
// providers/factory.ts
class AIProviderFactory {
  static create(type: 'openai' | 'azure'): AIProvider {
    switch (type) {
      case 'openai': return new OpenAIProvider()
      case 'azure': return new AzureOpenAIProvider()
    }
  }
}
```

### 2. 适配器模式

HTTP 服务器适配：
```typescript
// adapters/http2-adapter.ts
class HTTP2Adapter {
  // Adapts native HTTP/2 to Transport Layer
  handle(req: http2.Http2ServerRequest, res: http2.Http2ServerResponse)
}
```

### 3. 策略模式

消息处理策略：
- 普通消息处理
- 推理模型消息处理（reasoning models）
- 流式响应处理（streamText + pipeUIMessageStreamToResponse）

### 4. 观察者模式

状态变化通知：
- Pinia 状态订阅
- Vue 响应式系统

### 5. 装饰器模式

功能增强：
- API 重试装饰器（utils/retry.ts）
- 日志装饰器（utils/logger.ts）
- 错误处理装饰器（utils/error-handler.ts）

## 数据流设计

### 1. 前端数据流

```
用户输入 → Action → Store → API Client → Backend
         ← UIMessage ← AI SDK Stream ← Response
```

### 2. 后端数据流

```
HTTP Request → Middleware Chain → Router → Route Handler
            → Service Layer → AI Provider (Vercel AI SDK)
            → streamText → pipeUIMessageStreamToResponse
            → UIMessage Stream → Frontend
```

### 3. AI SDK 流式响应

```
AI Provider → streamText (Vercel AI SDK)
           → pipeUIMessageStreamToResponse
           → UIMessage format
           → Frontend (@ai-sdk/vue)
           → Real-time UI update
```

## 错误处理策略

### 1. 前端错误处理

- 全局错误边界
- API 错误拦截
- 用户友好的错误提示（i18n keys）

### 2. 后端错误处理

- 统一错误响应格式（utils/error-handler.ts）
- 错误日志记录（utils/logger.ts）
- 优雅降级
- Circuit breaker for external APIs
- Retry logic with exponential backoff

## 性能优化策略

### 1. 前端优化

- 路由懒加载
- 组件懒加载
- Code splitting: Route-based
- Bundle size: Main chunk < 500KB
- Manual chunks: Vue ecosystem, UI libraries, utilities

### 2. 后端优化

- Native HTTP/2 multiplexing
- Streaming: AI SDK's streamText
- Connection pooling
- Response compression
- API response: < 200ms (excluding AI provider latency)

## 安全设计

### 1. 前端安全

- XSS 防护（markdown rendering）
- CSRF 防护
- Content Security Policy (CSP)
- Sanitize user-generated content

### 2. 后端安全

- API 密钥保护（never exposed）
- Zod 验证 ALL inputs（validation/schemas.ts）
- Security headers（middleware-native/security-headers.ts）
- Rate limiting（middleware-native/rate-limiter.ts）
- Session management（Redis）

## 测试策略

### 1. 单元测试

- Colocated tests (*.test.ts)
- 工具函数测试
- 组件测试
- 服务层测试

### 2. 集成测试

- API 集成测试（test/integration/）
- 端到端测试

### 3. 属性测试

- Fast-check for validation logic（test-utils/）
- 边界条件测试
- Property-based testing

## Monorepo 架构

### PNPM Workspace

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### Turborepo

```json
// turbo.json
{
  "pipeline": {
    "build": { "dependsOn": ["^build"] },
    "dev": { "cache": false },
    "test": { "dependsOn": ["build"] }
  }
}
```

### 依赖管理

- Frontend 和 backend 完全隔离
- No shared code between apps/web/ and apps/api/
- Use packages/ if shared code needed
