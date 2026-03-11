# 代码风格和约定

## 编程语言

- **主要语言**: TypeScript, Vue 3
- **文件编码**: UTF-8
- **模块系统**: ESM only (never CommonJS)

## 代码风格配置

### ESLint 配置

- 使用 `@antfu/eslint-config` 9+ 作为基础配置
- **零警告策略**: 所有警告都被视为错误
- 支持 TypeScript, Vue 3, CSS, HTML, Markdown

### 关键规则

- `no-console`: 'warn' - 控制台输出警告
- `no-debugger`: 'error' - 禁止 debugger
- `ts/no-unused-vars`: 'error' - 禁止未使用变量
- `vue/component-name-in-template-casing`: 'PascalCase' - 组件名使用 PascalCase
- `prefer-const`: 'error' - 优先使用 const
- `no-var`: 'error' - 禁止使用 var

### TypeScript 配置

- **严格模式启用**: strict: true
- `noUnusedLocals`: true - 检查未使用的局部变量
- `noUnusedParameters`: true - 检查未使用的参数
- **前端路径别名**: `@/*` 映射到 `./src/*`
- **后端 ESM**: ALL imports MUST include `.js` extension

## 命名约定

- **组件**: PascalCase (如 `UserAvatar.vue`, `ModelSelector.vue`)
- **文件夹**: 
  - Frontend: PascalCase for components (如 `HoverButton/`)
  - Backend: camelCase (如 `middleware-native/`, `chatgpt/`)
- **变量/函数**: camelCase
- **常量**: UPPER_SNAKE_CASE
- **类型/接口**: PascalCase

## 文件组织

### Frontend (apps/web/src/)

```
components/
├── common/          # PascalCase folders, index.vue main file
├── custom/          # Single .vue files or PascalCase folders
└── reasoning/       # PascalCase folders, index.vue main file

views/               # Page-level route components
├── chat/            # Feature-scoped: components/, hooks/, layout/
└── exception/       # Error pages (404, 500)

store/modules/       # camelCase folders, self-contained modules
hooks/               # camelCase files
utils/               # camelCase files, organized in subfolders
api/                 # camelCase files
locales/             # Language code files (en-US.ts, zh-CN.ts)
```

### Backend (apps/api/src/)

```
providers/           # AI provider implementations
chatgpt/            # Vercel AI SDK integration
routes/             # API route handlers
middleware-native/  # Native HTTP middleware
security/           # Security validation
validation/         # Zod schemas
transport/          # Framework-agnostic abstractions
adapters/           # HTTP2Adapter
utils/              # Shared utilities
config/             # Environment validation
test/               # Integration & performance tests
test-utils/         # Property-based testing utilities
*.test.ts           # Colocated unit tests
```

## Import 路径规则

### Frontend - ALWAYS use `@/` alias

```typescript
// ✅ CORRECT
import { useChat } from '@/hooks/useChat'
import { ChatMessage } from '@/components/chat/Message'
import type { User } from '@/typings/user'
import { Chat } from '@ai-sdk/vue'
import type { UIMessage } from 'ai'

// ❌ WRONG
import { useChat } from '../../hooks/useChat'
```

### Backend - ALWAYS use `.js` extension (ESM requirement)

```typescript
// ✅ CORRECT - Relative imports with .js extension
import { logger } from './utils/logger.js'
import { validateRequest } from '../middleware-native/validation.js'
import type { TransportRequest } from './transport/types.js'

// ❌ WRONG - Missing .js extension
import { logger } from './utils/logger'

// ❌ WRONG - Using .ts extension
import { logger } from './utils/logger.ts'
```

## Vue.js 约定

- **ALWAYS use Composition API** with `<script setup>` (never Options API)
- 组件名使用 PascalCase
- Props 使用 camelCase
- 事件名使用 kebab-case
- 样式使用 scoped CSS

```vue
<!-- ✅ CORRECT -->
<script setup lang="ts">
import { ref } from 'vue'
const count = ref(0)
</script>

<!-- ❌ WRONG - Options API -->
<script lang="ts">
export default {
  data() {
    return { count: 0 }
  }
}
</script>
```

## 国际化约定

- **ALL user-facing text MUST use i18n keys** (never hardcoded strings)
- 支持 7 种语言: en-US, es-ES, ko-KR, ru-RU, vi-VN, zh-CN, zh-TW

```typescript
// ✅ CORRECT
import { t } from '@/locales'
const message = t('chat.sendMessage')

// ❌ WRONG - Hardcoded string
const message = 'Send Message'
```

## AI SDK 约定

### Backend - Vercel AI SDK

```typescript
// ✅ CORRECT - Use Vercel AI SDK
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { azure } from '@ai-sdk/azure'
import { pipeUIMessageStreamToResponse } from 'ai'

// ❌ WRONG - OpenAI SDK directly
import OpenAI from 'openai'
```

### Frontend - AI SDK UI

```typescript
// ✅ CORRECT - Use @ai-sdk/vue
import { Chat } from '@ai-sdk/vue'
import type { UIMessage } from 'ai'

// ❌ WRONG - Custom message format
interface CustomMessage { ... }
```

## 提交信息规范

使用 Conventional Commits 规范：

- `feat:` 新功能
- `fix:` 修复
- `docs:` 文档
- `style:` 格式化
- `refactor:` 重构
- `test:` 测试
- `chore:` 构建/工具

```bash
# ✅ CORRECT
git commit -m "feat: add reasoning model support"
git commit -m "fix: resolve streaming issue"

# ❌ WRONG
git commit -m "added feature"
```

## 代码质量标准

### 零容忍策略

- ✅ TypeScript errors: 0
- ✅ ESLint warnings: 0 (warnings treated as errors)
- ✅ Prettier formatting: enforced via pre-commit hooks
- ✅ All tests passing

### Pre-commit 检查

```bash
# 自动运行（Husky）
pnpm lint:fix      # 自动修复 lint 问题
pnpm format        # 自动格式化代码
```

## 禁止模式

### Backend

```typescript
// ❌ WRONG - CommonJS
const express = require('express')
module.exports = { ... }

// ✅ CORRECT - ESM with .js extension
import { logger } from './utils/logger.js'
export { logger }

// ❌ WRONG - Express framework
import express from 'express'
const app = express()

// ✅ CORRECT - Native HTTP/2
import { HTTP2Adapter } from './adapters/http2-adapter.js'

// ❌ WRONG - axios, node-fetch
import axios from 'axios'
import fetch from 'node-fetch'

// ✅ CORRECT - Native fetch (Node.js 24+)
const response = await fetch(url)

// ❌ WRONG - OpenAI SDK directly
import OpenAI from 'openai'

// ✅ CORRECT - Vercel AI SDK
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
```

### Frontend

```typescript
// ❌ WRONG - Options API
export default {
  data() { return { count: 0 } }
}

// ✅ CORRECT - Composition API with <script setup>
<script setup lang="ts">
const count = ref(0)
</script>

// ❌ WRONG - Vuex
import { createStore } from 'vuex'

// ✅ CORRECT - Pinia
import { defineStore } from 'pinia'

// ❌ WRONG - Hardcoded strings
const message = 'Hello World'

// ✅ CORRECT - i18n keys
const message = t('common.hello')

// ❌ WRONG - Relative imports
import { useChat } from '../../hooks/useChat'

// ✅ CORRECT - @ alias
import { useChat } from '@/hooks/useChat'
```

## Package Manager

```bash
# ✅ CORRECT - ALWAYS use pnpm
pnpm install
pnpm dev
pnpm build

# ❌ WRONG - Never use npm or yarn
npm install
yarn install
```
