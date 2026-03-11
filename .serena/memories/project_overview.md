# ChatGPT Web 项目概览

## 项目目的

ChatGPT Web 是一个安全优先、自托管的 ChatGPT 界面，支持 OpenAI 和 Azure OpenAI API，具备高级推理模型能力。

## 技术栈

### 前端 (apps/web/)

- **Vue 3.5+**: Composition API with `<script setup>` (never Options API)
- **TypeScript 5.9+**: 严格模式，零错误容忍
- **Vite 7+**: 构建工具
- **Naive UI 2.43+**: UI 组件库（never custom reimplementations）
- **Pinia 3+**: 状态管理（never Vuex）
- **Vue Router 4+**: 路由管理
- **Vue i18n 11+**: 国际化支持（ALL user-facing text MUST use i18n keys）
- **Vercel AI SDK UI (@ai-sdk/vue 3+)**: Chat streaming and message handling
- **UIMessage format**: 标准消息格式（never custom message formats）

### 后端 (apps/api/)

- **Node.js 24+**: Native fetch and HTTP/2 support
- **Native HTTP/2 server**: HTTP/1.1 fallback (never Express/Fastify/Koa)
- **TypeScript 5.9+**: ESM only with `.js` extensions
- **Vercel AI SDK (ai 6+)**: @ai-sdk/openai 3+, @ai-sdk/azure 3+
- **streamText & pipeUIMessageStreamToResponse**: AI streaming (never custom implementations)
- **Zod 4+**: ALL input validation
- **Redis 5+**: Session storage

### Monorepo 工具

- **PNPM 10+**: Package manager (ALWAYS use pnpm, never npm/yarn)
- **Turborepo 2+**: Build system
- **ESLint 9+**: @antfu/eslint-config
- **Prettier 3+**: Code formatting
- **Vitest 4+**: Testing with fast-check
- **Husky 9+**: Git hooks

## 项目结构

```
chatgpt-web/
├── apps/
│   ├── web/                # Vue 3 frontend (port 1002)
│   │   ├── src/
│   │   │   ├── components/ # UI components
│   │   │   ├── views/      # Page components
│   │   │   ├── store/      # Pinia stores
│   │   │   ├── router/     # Vue Router
│   │   │   ├── api/        # API client
│   │   │   ├── hooks/      # Composables
│   │   │   ├── locales/    # i18n translations
│   │   │   └── utils/      # Helper functions
│   │   └── vite.config.ts
│   └── api/                # Node.js 24 backend (port 3002)
│       ├── src/
│       │   ├── providers/  # AI provider implementations
│       │   ├── chatgpt/    # Vercel AI SDK integration
│       │   ├── routes/     # API route handlers
│       │   ├── middleware-native/ # Native HTTP middleware
│       │   ├── security/   # Security validation
│       │   ├── validation/ # Zod schemas
│       │   ├── transport/  # Framework-agnostic abstractions
│       │   ├── adapters/   # HTTP2Adapter
│       │   └── utils/      # Shared utilities
│       └── tsup.config.ts
├── pnpm-workspace.yaml
└── turbo.json
```

## 支持的 AI 模型

### OpenAI API
- GPT-4o, GPT-4o-mini
- GPT-5, GPT-5.1, GPT-5.2
- o3, o3-mini, o4-mini (reasoning models)

### Azure OpenAI
- Same models via Azure endpoints
- Responses API support

## 核心特性

- **推理模型支持**: o3/o4 系列，显示步骤式推理过程
- **AI SDK 流式响应**: streamText + pipeUIMessageStreamToResponse
- **UIMessage 格式**: 标准化消息处理
- **多会话管理**: 上下文保留
- **Markdown 渲染**: 语法高亮（highlight.js）、数学公式（KaTeX）、图表（Mermaid）
- **国际化**: 7 种语言（en-US, es-ES, ko-KR, ru-RU, vi-VN, zh-CN, zh-TW）
- **安全优先**: Zod 验证、XSS 防护、速率限制
- **会话导入/导出**: 数据可移植性

## 架构决策

### 后端架构
- **Native HTTP/2 + HTTP/1.1 fallback**: 直接使用 Node.js `http2` 模块
- **Framework-agnostic transport layer**: 可切换 HTTP 实现
- **Vercel AI SDK integration**: chatgpt/ 层封装 AI SDK
- **Zod for ALL validation**: 输入、配置、环境变量
- **Centralized logging**: utils/logger.ts

### 前端架构
- **Vue 3 Composition API**: 所有组件使用 `<script setup>`
- **Pinia for state**: 模块化 stores（app, auth, chat, settings, user）
- **i18n for ALL text**: NEVER hardcode strings
- **Naive UI**: 组件库
- **Feature-scoped organization**: Chat UI 有独立的 components/, hooks/, layout/

## 禁止模式

NEVER use:
- ❌ CommonJS (require/module.exports)
- ❌ Express, Fastify, Koa
- ❌ axios, node-fetch, got
- ❌ OpenAI SDK directly (use Vercel AI SDK)
- ❌ Custom chat streaming implementations
- ❌ Custom message formats (use UIMessage)
- ❌ Vue Options API
- ❌ Vuex (use Pinia)
- ❌ Hardcoded user-facing strings (use i18n)
- ❌ Relative imports without .js extension in backend
- ❌ npm or yarn commands (use pnpm)

## 开发端口

- Frontend: http://localhost:1002
- Backend: http://localhost:3002
