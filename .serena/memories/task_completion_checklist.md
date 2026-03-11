# 任务完成后的检查清单

## 代码质量检查

在完成任何开发任务后，必须执行以下检查：

### 1. 从根目录运行质量检查

```bash
# 运行完整的质量检查（检查所有应用）
pnpm quality

# 如果有问题，运行自动修复
pnpm quality:fix

# 单独检查项目
pnpm type-check     # TypeScript 类型检查
pnpm lint           # ESLint 检查
pnpm format:check   # Prettier 格式检查
```

### 2. 前端检查（apps/web/）

```bash
cd apps/web

# 运行完整的质量检查
pnpm quality

# 如果有问题，运行自动修复
pnpm quality:fix

# 单独检查
pnpm type-check     # TypeScript 类型检查
pnpm lint           # ESLint 检查
pnpm format:check   # Prettier 格式检查
```

### 3. 后端检查（apps/api/）

```bash
cd apps/api

# 运行完整的质量检查
pnpm quality

# 如果有问题，运行自动修复
pnpm quality:fix

# 运行测试
pnpm test

# 单独检查
pnpm type-check     # TypeScript 类型检查
pnpm lint           # ESLint 检查
pnpm format:check   # Prettier 格式检查
```

### 4. 构建测试

```bash
# 从根目录测试所有应用的构建
pnpm build

# 测试前端构建
cd apps/web && pnpm build

# 测试后端构建
cd apps/api && pnpm build
```

## 必须通过的标准

- ✅ **零 TypeScript 错误**: `pnpm type-check` 必须无错误
- ✅ **零 ESLint 警告**: `pnpm lint` 必须无警告（warnings = errors）
- ✅ **代码格式正确**: `pnpm format:check` 必须通过
- ✅ **所有测试通过**: `pnpm test` 必须通过（后端）
- ✅ **构建成功**: `pnpm build` 必须成功

## Git 提交前检查

```bash
# Husky 会自动运行这些检查，但可以手动运行：
pnpm lint:fix      # 自动修复 lint 问题
pnpm format        # 自动格式化代码

# 提交信息必须符合 Conventional Commits 规范
git commit -m "feat: add new feature"
git commit -m "fix: resolve login issue"
git commit -m "docs: update README"
git commit -m "refactor: migrate to native HTTP/2"
git commit -m "test: add integration tests"
```

## 功能测试

- 🧪 **手动测试**: 在浏览器中测试新功能
  - Frontend: http://localhost:1002
  - Backend: http://localhost:3002
- 🧪 **API 测试**: 测试后端 API 端点
  - Health check: `curl http://localhost:3002/health`
  - Chat API: `curl http://localhost:3002/api/chat`
- 🧪 **跨浏览器测试**: 确保在主要浏览器中工作
  - Chrome 131+, Firefox 133+, Safari 18+
- 🧪 **响应式测试**: 测试移动端和桌面端

## 性能检查

- ⚡ **构建大小**: 检查 bundle 大小是否合理
  - Main chunk < 500KB
  - Check `apps/web/dist/` after build
- ⚡ **加载时间**: 确保页面加载速度
  - First contentful paint < 1.5s
- ⚡ **API 响应时间**: 检查后端性能
  - API response < 200ms (excluding AI provider latency)
- ⚡ **内存使用**: 检查是否有内存泄漏

## 安全检查

- 🔒 **依赖安全**: 检查是否有安全漏洞
  - `pnpm audit`
- 🔒 **API 安全**: 确保 API 密钥不暴露
  - Never expose OPENAI_API_KEY, AUTH_SECRET_KEY
  - Check .env files are in .gitignore
- 🔒 **输入验证**: 确保用户输入得到验证
  - ALL inputs validated with Zod schemas
  - Check validation/schemas.ts
- 🔒 **XSS 防护**: 确保 markdown 渲染安全
  - Sanitize user-generated content

## 代码规范检查

### Frontend 规范

- ✅ 使用 Composition API with `<script setup>` (never Options API)
- ✅ 使用 `@/` alias for imports (never relative paths)
- ✅ 使用 i18n keys for ALL user-facing text (never hardcoded strings)
- ✅ 使用 Pinia for state (never Vuex)
- ✅ 使用 @ai-sdk/vue for chat streaming (never custom implementations)
- ✅ 使用 UIMessage format (never custom message formats)

### Backend 规范

- ✅ 使用 ESM with `.js` extensions (never CommonJS)
- ✅ 使用 Native HTTP/2 (never Express/Fastify/Koa)
- ✅ 使用 Native fetch (never axios/node-fetch)
- ✅ 使用 Vercel AI SDK (never OpenAI SDK directly)
- ✅ 使用 streamText + pipeUIMessageStreamToResponse (never custom streaming)
- ✅ 使用 Zod for ALL validation
- ✅ 使用 logger.ts for ALL logging

## 文档更新

- 📝 **代码注释**: 确保复杂逻辑有注释
- 📝 **README 更新**: 如果有新功能，更新文档
- 📝 **API 文档**: 如果有 API 变更，更新文档
- 📝 **i18n 更新**: 如果有新文本，添加到所有 7 种语言
  - en-US, es-ES, ko-KR, ru-RU, vi-VN, zh-CN, zh-TW

## 部署前最终检查

```bash
# 完整的质量检查流程（从根目录）
pnpm quality

# 后端测试
cd apps/api && pnpm test

# 构建测试
pnpm build

# 环境变量检查
# 确保 apps/api/.env 文件配置正确
# 确保生产环境变量设置正确

# 必需的环境变量：
# - OPENAI_API_KEY
# - AI_PROVIDER (openai or azure)
# - AUTH_SECRET_KEY
# - MAX_REQUEST_PER_HOUR
# - TIMEOUT_MS
```

## 失败处理

如果任何检查失败：

1. 查看错误信息
2. 运行 `pnpm quality:fix` 尝试自动修复
3. 手动修复剩余问题
4. 重新运行检查
5. 重复直到所有检查通过

## Monorepo 特定检查

- ✅ 确保 pnpm-workspace.yaml 配置正确
- ✅ 确保 turbo.json 配置正确
- ✅ 确保 apps/web/ 和 apps/api/ 完全隔离
- ✅ 确保没有跨应用的直接依赖
- ✅ 如果需要共享代码，使用 packages/

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
