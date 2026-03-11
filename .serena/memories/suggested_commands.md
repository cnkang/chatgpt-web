# 建议的开发命令

## 项目依赖安装

```bash
# 安装所有依赖（在项目根目录）
pnpm install

# 或使用 bootstrap（如果配置了）
pnpm bootstrap
```

## 开发服务器

```bash
# 从根目录启动前端开发服务器（port 1002）
pnpm dev

# 从 apps/web/ 启动前端
cd apps/web && pnpm dev

# 从 apps/api/ 启动后端开发服务器（port 3002）
cd apps/api && pnpm dev        # Watch mode
cd apps/api && pnpm start      # Without watch
```

## 构建和打包

```bash
# 从根目录构建所有应用
pnpm build

# 构建前端（从 apps/web/）
cd apps/web && pnpm build           # Type-check + build
cd apps/web && pnpm build-only      # Build without type-check
cd apps/web && pnpm preview         # Preview production build

# 构建后端（从 apps/api/）
cd apps/api && pnpm build           # Build to ./build directory
cd apps/api && pnpm prod            # Run production build
```

## 代码质量检查

```bash
# 从根目录运行所有应用的质量检查
pnpm quality                        # Type-check + lint + format check
pnpm quality:fix                    # Auto-fix all issues

# 单独检查（从根目录或各应用目录）
pnpm type-check                     # TypeScript 类型检查
pnpm lint                           # ESLint 检查
pnpm lint:fix                       # 自动修复 ESLint 问题
pnpm format                         # Prettier 格式化
pnpm format:check                   # 检查格式化

# 前端质量检查（从 apps/web/）
cd apps/web && pnpm quality
cd apps/web && pnpm quality:fix

# 后端质量检查（从 apps/api/）
cd apps/api && pnpm quality
cd apps/api && pnpm quality:fix
```

## 测试

```bash
# 后端测试（从 apps/api/）
cd apps/api && pnpm test            # Run all tests
cd apps/api && pnpm test:watch      # Watch mode
cd apps/api && pnpm test:ui         # Vitest UI
cd apps/api && pnpm test:integration    # Integration tests
cd apps/api && pnpm test:performance    # Performance tests
```

## Git 和提交

```bash
# Git 基本操作
git status
git add .
git commit -m "feat: add new feature"
git push

# 提交信息格式（Conventional Commits）
git commit -m "feat: add reasoning model support"
git commit -m "fix: resolve streaming issue"
git commit -m "docs: update README"
git commit -m "style: format code"
git commit -m "refactor: migrate to native HTTP/2"
git commit -m "test: add integration tests"
git commit -m "chore: update dependencies"

# Husky 会自动运行 pre-commit hooks
# 包括 lint:fix 和 format
```

## 清理和重置

```bash
# 清理依赖（从根目录）
pnpm common:cleanup

# 清理前端依赖
cd apps/web && pnpm common:cleanup

# 清理后端依赖和构建文件
cd apps/api && pnpm common:cleanup
cd apps/api && pnpm clean
```

## Docker 相关

```bash
# 构建 Docker 镜像
docker build -t chatgpt-web .

# 运行 Docker 容器
docker run --name chatgpt-web -d -p 127.0.0.1:3002:3002 \
  --env OPENAI_API_KEY=your_api_key \
  chatgpt-web

# 使用 Docker Compose
cd docker-compose && docker-compose up -d
```

## 环境配置

```bash
# 检查 Node.js 版本（需要 24+）
node -v

# 检查 pnpm 版本（需要 10+）
pnpm -v

# 设置后端环境变量
cp apps/api/.env.example apps/api/.env
# 编辑 apps/api/.env 配置 API keys

# 必需的环境变量
# OPENAI_API_KEY=sk-xxx
# AI_PROVIDER=openai  # or 'azure'
# AUTH_SECRET_KEY=xxx
# MAX_REQUEST_PER_HOUR=100
# TIMEOUT_MS=60000
```

## 系统工具命令 (macOS/Darwin)

```bash
# 文件操作
ls -la                          # 列出文件
find . -name "*.vue"            # 查找文件
grep -r "search" .              # 搜索文本
cat file.txt                    # 查看文件内容

# 进程管理
ps aux | grep node              # 查看 Node.js 进程
lsof -i :1002                   # 查看前端端口占用
lsof -i :3002                   # 查看后端端口占用
kill -9 PID                     # 终止进程

# 网络测试
curl http://localhost:3002/health    # 测试后端健康检查
curl http://localhost:3002/api/chat  # 测试 API

# 包管理
which node                      # 查看 Node.js 路径
which pnpm                      # 查看 pnpm 路径
```

## Monorepo 特定命令

```bash
# 使用 pnpm filter 运行特定应用的命令
pnpm --filter @chatgpt-web/web dev
pnpm --filter @chatgpt-web/api dev
pnpm --filter @chatgpt-web/web build
pnpm --filter @chatgpt-web/api build

# 并行运行命令
pnpm --parallel --filter "./apps/*" build

# Turborepo 命令
pnpm turbo run build            # 使用 Turborepo 构建
pnpm turbo run build --force    # 跳过缓存
pnpm turbo run dev              # 开发模式
```

## 快速开发流程

```bash
# 1. 克隆项目
git clone <repo-url>
cd chatgpt-web

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp apps/api/.env.example apps/api/.env
# 编辑 apps/api/.env

# 4. 启动开发服务器（两个终端）
# Terminal 1: Frontend
pnpm dev

# Terminal 2: Backend
cd apps/api && pnpm dev

# 5. 访问应用
# Frontend: http://localhost:1002
# Backend: http://localhost:3002
```

## 部署前检查

```bash
# 完整的质量检查流程（从根目录）
pnpm quality

# 构建测试
pnpm build

# 后端测试
cd apps/api && pnpm test

# 环境变量检查
# 确保 apps/api/.env 配置正确
# 确保生产环境变量设置正确
```

## 常见问题排查

```bash
# 端口被占用
lsof -i :1002                   # 查看前端端口
lsof -i :3002                   # 查看后端端口
kill -9 <PID>                   # 终止占用进程

# 依赖问题
rm -rf node_modules apps/*/node_modules
pnpm install

# 构建缓存问题
rm -rf .turbo apps/*/.turbo
pnpm build

# TypeScript 错误
pnpm type-check                 # 查看详细错误
```
