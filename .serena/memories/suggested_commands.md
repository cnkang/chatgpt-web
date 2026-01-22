# 建议的开发命令

## 项目依赖安装

```bash
# 安装前端依赖（在项目根目录）
pnpm bootstrap

# 安装后端依赖（在 service 目录）
cd service && pnpm install
```

## 开发服务器

```bash
# 启动前端开发服务器（在项目根目录）
pnpm dev

# 启动后端开发服务器（在 service 目录）
cd service && pnpm dev
# 或者
cd service && pnpm start
```

## 构建和打包

```bash
# 构建前端（在项目根目录）
pnpm build

# 构建后端（在 service 目录）
cd service && pnpm build

# 运行生产版本后端
cd service && pnpm prod
```

## 代码质量检查

```bash
# 前端代码检查和格式化（在项目根目录）
pnpm lint              # ESLint 检查
pnpm lint:fix          # 自动修复 ESLint 问题
pnpm format            # Prettier 格式化
pnpm format:check      # 检查格式化
pnpm type-check        # TypeScript 类型检查
pnpm quality           # 运行所有质量检查
pnpm quality:fix       # 自动修复并检查

# 后端代码检查和格式化（在 service 目录）
cd service && pnpm lint
cd service && pnpm lint:fix
cd service && pnpm format
cd service && pnpm format:check
cd service && pnpm type-check
cd service && pnpm quality
cd service && pnpm quality:fix
```

## 测试

```bash
# 后端测试（在 service 目录）
cd service && pnpm test          # 运行测试
cd service && pnpm test:watch    # 监视模式测试
cd service && pnpm test:ui       # UI 测试界面
```

## Git 和提交

```bash
# Git 基本操作
git status
git add .
git commit -m "feat: add new feature"
git push

# 提交信息会自动通过 commitlint 验证
# 使用 Conventional Commits 格式
```

## 清理和重置

```bash
# 清理前端依赖
pnpm common:cleanup

# 清理后端依赖
cd service && pnpm common:cleanup

# 清理构建文件
cd service && pnpm clean
```

## Docker 相关

```bash
# 构建 Docker 镜像
docker build -t chatgpt-web .

# 运行 Docker 容器
docker run --name chatgpt-web -d -p 127.0.0.1:3002:3002 --env OPENAI_API_KEY=your_api_key chatgpt-web

# 使用 Docker Compose
cd docker-compose && docker-compose up -d
```

## 系统工具命令 (macOS/Darwin)

```bash
# 文件操作
ls -la                 # 列出文件
find . -name "*.vue"   # 查找文件
grep -r "search" .     # 搜索文本
cat file.txt          # 查看文件内容

# 进程管理
ps aux | grep node    # 查看 Node.js 进程
kill -9 PID          # 终止进程

# 网络
lsof -i :3000        # 查看端口占用
curl http://localhost:3002  # 测试 API

# 包管理
which node           # 查看 Node.js 路径
node -v             # 查看 Node.js 版本
pnpm -v             # 查看 pnpm 版本
```

## 环境配置

```bash
# 检查 Node.js 版本（需要 24+）
node -v

# 检查 pnpm 版本（需要 10+）
pnpm -v

# 设置环境变量（复制 .env.example 到 .env）
cp service/.env.example service/.env
```
