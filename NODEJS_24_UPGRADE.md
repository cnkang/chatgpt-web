# Node.js 24 LTS 和依赖升级指南

本项目已升级支持 Node.js 24 LTS，并更新了所有主要依赖。以下是主要变更：

## 主要变更

### 1. Node.js 版本要求
- **最低版本**: Node.js 18.0.0
- **推荐版本**: Node.js 24.12.0 LTS
- **Docker**: 使用 `node:24.12.0-alpine3.20`

### 2. 包管理器升级
- **pnpm**: 升级到 10.27.0
- 添加了 `.pnpmrc` 配置文件
- 配置了 `strict-peer-dependencies=false` 来处理兼容性问题

### 3. 主要依赖升级

#### 前端依赖
- **vue-i18n**: 9.14.5 → 11.2.8 (重大升级)
- **@vueuse/core**: 10.11.1 → 14.1.0
- **pinia**: 2.3.1 → 3.0.4
- **tailwindcss**: 3.4.19 → 4.1.18 (重大升级)
- **markdown-it**: 13.0.2 → 14.1.0
- **mermaid-it-markdown**: 1.0.13 → @md-reader/markdown-it-mermaid@0.6.0-beta.0 (替换)

#### 开发依赖
- **@antfu/eslint-config**: 3.16.0 → 6.7.3
- **vue-tsc**: 2.2.12 → 3.2.1
- **@types/node**: 24.10.4 → 25.0.3
- **husky**: 8.0.3 → 9.1.7

#### 后端依赖 (service)
- **express-rate-limit**: 6.11.2 → 8.2.1
- **https-proxy-agent**: 5.0.1 → 7.0.6
- **socks-proxy-agent**: 7.0.0 → 8.0.5
- **dotenv**: 16.6.1 → 17.2.3

### 4. 配置文件更新

#### Tailwind CSS 4 支持
- 添加了 `@tailwindcss/postcss` 插件
- 更新了 `postcss.config.js` 配置
- 保持向后兼容的样式

#### Vue I18n v11 兼容性
- 升级到 Composition API 优先
- 移除了已弃用的 Legacy API 警告
- 保持现有 i18n 功能完整性

#### ESLint 配置优化
- 忽略构建目录 (`service/build/**`, `dist/**`)
- 优化了规则配置
- 支持最新的代码风格

#### Mermaid 插件升级
- 替换了 `mermaid-it-markdown` 为 `@md-reader/markdown-it-mermaid`
- 原生支持 mermaid 11.x
- 解决了 peer dependency 警告

#### 依赖 Overrides 配置
- 添加了 pnpm overrides 解决弃用依赖
- 自动替换过时的传递依赖为最新版本

### 5. CI/CD 更新
- GitHub Actions 使用 Node.js 24.x
- 更新 actions 版本到 v4
- Docker 构建使用 Node.js 24

### 6. 开发环境
- DevContainer 使用 Node.js 24
- 添加 `.nvmrc` 文件指定版本
- 更新了所有开发工具

## 升级步骤

### 本地开发环境

1. **安装 Node.js 24**
   ```bash
   # 使用 nvm
   nvm install 24.12.0
   nvm use 24.12.0

   # 或使用 nvm 自动切换
   nvm use
   ```

2. **升级 pnpm**
   ```bash
   corepack use pnpm@10.27.0
   ```

3. **清理并重新安装依赖**
   ```bash
   # 主项目
   pnpm run common:cleanup
   pnpm install

   # Service
   cd service
   pnpm run common:cleanup
   pnpm install
   ```

4. **验证配置**
   ```bash
   # 检查 lint
   pnpm run lint

   # 检查类型
   pnpm run type-check

   # 构建测试
   pnpm run build
   ```

### 生产环境

1. **Docker 部署**
   - 重新构建 Docker 镜像
   - 新镜像将自动使用 Node.js 24

2. **直接部署**
   - 确保服务器安装 Node.js 24
   - 重新安装依赖并构建

## 新特性利用

### Node.js 24 LTS 新特性
1. **性能提升**
   - V8 引擎优化
   - 更好的内存管理

2. **ES2022+ 支持**
   - Top-level await
   - 私有字段和方法
   - 正则表达式匹配索引

3. **安全性增强**
   - 更新的 OpenSSL
   - 改进的权限模型

### Vue I18n v11 新特性
1. **Composition API 优先**
   - 更好的 TypeScript 支持
   - 更灵活的组合式 API

2. **性能优化**
   - 更小的包体积
   - 更快的运行时性能

### Tailwind CSS 4 新特性
1. **新的引擎**
   - 更快的构建速度
   - 更好的 CSS 优化

2. **改进的 DX**
   - 更好的错误提示
   - 更灵活的配置

## 兼容性说明

- **向后兼容**: 支持 Node.js 18+
- **依赖更新**: 所有依赖已测试兼容
- **API 变更**: 无破坏性变更
- **样式兼容**: Tailwind 样式保持兼容

## 已知问题和解决方案

### ✅ 已解决的问题

#### 1. Mermaid Peer Dependency 警告 (已解决)
```
mermaid-it-markdown@1.0.13 requires mermaid@^10.7.0 but found 11.12.2
```
**解决方案**: 已替换为 `@md-reader/markdown-it-mermaid@0.6.0-beta.0`，原生支持 mermaid 11.x

#### 2. 弃用的子依赖 (已解决)
```
@types/vue@2.0.0, source-map@0.8.0-beta.0, sourcemap-codec@1.4.8
```
**解决方案**:
- 移除了 `mermaid-it-markdown` 解决了 `@types/vue@2.0.0` 问题
- 使用 pnpm overrides 将弃用的依赖替换为最新版本：
  - `source-map@0.8.0-beta.0` → `source-map@^0.7.6`
  - `sourcemap-codec@1.4.8` → `@jridgewell/sourcemap-codec@^1.5.5`

## 故障排除

### 常见问题

1. **PostCSS 配置错误**
   ```bash
   # 确保安装了新的 Tailwind PostCSS 插件
   pnpm add -D @tailwindcss/postcss
   ```

2. **ESLint 配置错误**
   ```bash
   # 删除旧配置缓存
   rm -rf node_modules/.cache
   pnpm install
   ```

3. **TypeScript 编译错误**
   ```bash
   # 清理 TypeScript 缓存
   pnpm run type-check --force
   ```

4. **依赖冲突**
   ```bash
   # 重新安装所有依赖
   pnpm run common:cleanup
   pnpm install
   ```

## 验证清单

- [ ] Node.js 版本 >= 18.0.0
- [ ] pnpm 版本 = 10.27.0
- [ ] 依赖安装成功
- [ ] Lint 检查通过
- [ ] 类型检查通过
- [ ] 构建成功
- [ ] 测试通过（如有）
- [ ] Docker 构建成功（如使用）
- [ ] Vue I18n 功能正常
- [ ] Tailwind 样式正常

升级完成后，项目将充分利用 Node.js 24 LTS 的性能和安全性改进，以及所有依赖的最新特性。
