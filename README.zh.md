# ChatGPT Web

> 声明：此项目基于原开源项目进行修改和优化，遵循 MIT 协议，免费且用于开源学习。不会提供卖号、付费服务或付费讨论群等行为，请谨防受骗。

> 原项目地址：https://github.com/Chanzhaoyu/chatgpt-web

[English](README.md)

![cover](./docs/images/screenshots/c1.png)
![cover2](./docs/images/screenshots/c2.png)

## 概览

ChatGPT Web 是一个基于 Monorepo 的现代化应用，支持 OpenAI 兼容 API 与 Azure OpenAI：

- 前端：Vue 3.5+（`apps/web`）
- 后端：Express 5（`apps/api`）
- 共享类型与工具：`packages/shared`
- 文档中心：`packages/docs`

## 亮点

- 支持 OpenAI/Azure Provider，并可按需启用 OpenAI 兼容第三方端点
- 支持流式响应与现代化 UI
- 使用 pnpm + Turborepo 管理 Monorepo
- 内置生产可用 Dockerfile

## 快速开始（本地开发）

### 1. 前置要求

- Node.js `>= 24.0.0`
- pnpm `>= 10.0.0`

```bash
node -v
pnpm -v
```

### 2. 安装依赖

在仓库根目录执行：

```bash
pnpm install
pnpm bootstrap
```

### 3. 配置环境变量

同时创建前端与后端环境文件：

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
```

后端最小配置（`apps/api/.env`）：

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-official-api-key
DEFAULT_MODEL=gpt-5.1
```

可选（OpenAI 兼容第三方端点）：

```bash
OPENAI_API_BASE_URL=https://your-compatible-provider.example.com/v1
SKIP_API_DOMAIN_CHECK=true
```

说明：`SKIP_API_DOMAIN_CHECK` 仅对 `openai` provider 生效，Azure 端点校验仍然保持严格模式。

### 4. 启动应用

推荐（仅前端 + 后端）：

```bash
pnpm dev:core
```

本地地址：

- 应用：http://localhost:1002
- API：http://localhost:3002
- 配置接口（POST）：http://localhost:3002/api/config

## 文档（建议从这里开始）

如果只读一篇文档，推荐：

- `packages/docs/setup/monorepo-setup.md`

核心文档入口：

- `packages/docs/README.md`
- `packages/docs/deployment/environment.md`
- `packages/docs/deployment/docker.md`
- `packages/docs/development/contributing.md`

本地查看文档：

```bash
pnpm --filter @chatgpt-web/docs serve
```

## 部署（Docker）

从当前仓库构建并运行：

```bash
docker build -t chatgpt-web .

docker run --rm -it \
  -p 3002:3002 \
  -e AI_PROVIDER=openai \
  -e OPENAI_API_KEY=sk-your-official-api-key \
  -e SESSION_SECRET=change-me-in-production \
  chatgpt-web
```

然后访问：http://localhost:3002

更多部署方案：

- `packages/docs/deployment/docker.md`
- `docker-compose/README.md`
- `packages/docs/deployment/kubernetes.md`

## 常用命令

在仓库根目录执行：

```bash
pnpm dev
pnpm dev:core
pnpm dev:web
pnpm dev:api

pnpm lint
pnpm type-check
pnpm test
```

## 参与贡献

建议先阅读：

- `docs/development/contributing.zh.md`
- `packages/docs/development/contributing.md`

## License

MIT © [Kang Liu](./license)

基于原项目：MIT © [ChenZhaoYu](https://github.com/Chanzhaoyu/chatgpt-web)
