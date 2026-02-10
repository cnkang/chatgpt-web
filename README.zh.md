# ChatGPT Web

> 声明：本项目仅以开源形式发布在 GitHub，并基于 MIT License。请勿用于账号售卖、付费倒卖或非官方收费服务。

[English](./README.md)

![cover](./docs/c1.png)
![cover2](./docs/c2.png)

## 项目简介

这是一个基于 `Vue 3 + Vite`（前端）与 `Express + TypeScript`（后端）的 ChatGPT Web 客户端。

通过 `chatgpt` 包支持两种运行模式：

- `OPENAI_API_KEY` 模式（`ChatGPTAPI`）
- `OPENAI_ACCESS_TOKEN` 模式（`ChatGPTUnofficialProxyAPI`）

## 当前能力

- 多会话管理与上下文续聊
- Markdown / 代码高亮、KaTeX 数学公式、Mermaid 渲染
- 会话导入导出、消息导出图片
- 多语言界面与主题切换
- `AUTH_SECRET_KEY` 鉴权与请求限流
- 面向生产的安全默认值（`AUTH_REQUIRED_IN_PRODUCTION`、CORS 白名单）

## 目录结构

- `src/`：前端应用（Vue 3 + Vite）
- `service/`：后端服务（Express + TypeScript）
- `docker-compose/`：Compose 部署示例
- `kubernetes/`：K8s 部署清单
- `docs/releases/`：版本发布说明

## 维护者说明

- 当前维护者：`Kang`（仓库不公开直接联系方式）
- 项目原作者：[ChenZhaoYu](https://github.com/Chanzhaoyu)

## 环境要求

- Node.js：`24 (LTS)`（通过 `nvm` 和 `.nvmrc`）
- PNPM：`10.x`（与 `packageManager` 一致）

## 快速开始

### 1）切换到要求的运行时

```bash
nvm install
nvm use
corepack enable
corepack prepare pnpm@10.29.2 --activate
```

### 2）安装依赖

```bash
pnpm bootstrap
pnpm --dir service install
```

### 3）配置后端环境变量

```bash
cp service/.env.example service/.env
```

`service/.env` 至少配置以下二选一：

- `OPENAI_API_KEY`
- `OPENAI_ACCESS_TOKEN`

### 4）配置前端环境变量（推荐）

在仓库根目录创建 `.env.local`：

```bash
VITE_GLOB_API_URL=/api
VITE_APP_API_BASE_URL=http://127.0.0.1:3002
VITE_GLOB_OPEN_LONG_REPLY=false
VITE_GLOB_APP_PWA=false
```

### 5）启动服务

终端 A（后端）：

```bash
pnpm --dir service dev
```

终端 B（前端）：

```bash
pnpm dev
```

默认访问地址：

- 前端：`http://127.0.0.1:1002`
- 后端健康检查：`http://127.0.0.1:3002/health`

## 后端环境变量

| 变量名 | 必填 | 说明 |
| --- | --- | --- |
| `OPENAI_API_KEY` | 二选一 | OpenAI API Key |
| `OPENAI_ACCESS_TOKEN` | 二选一 | Access Token 模式 |
| `OPENAI_API_BASE_URL` | 可选 | 自定义 OpenAI 兼容接口地址 |
| `OPENAI_API_MODEL` | 可选 | 模型名称 |
| `OPENAI_API_DISABLE_DEBUG` | 可选 | 设为 `false` 可开启 API 调试日志 |
| `API_REVERSE_PROXY` | 可选 | Access Token 模式下的反向代理地址 |
| `TIMEOUT_MS` | 可选 | 请求超时时间（毫秒） |
| `MAX_REQUEST_PER_HOUR` | 可选 | 每 IP 每小时请求上限（`0` 为不限） |
| `MAX_VERIFY_PER_HOUR` | 可选 | 每 IP 每小时验证接口上限（`0` 为不限） |
| `AUTH_SECRET_KEY` | 可选 | 受保护接口的 Bearer 鉴权密钥 |
| `AUTH_REQUIRED_IN_PRODUCTION` | 可选 | 默认 `true`，生产环境强制要求 `AUTH_SECRET_KEY` |
| `CORS_ALLOW_ORIGIN` | 可选 | 逗号分隔的 CORS 白名单 |
| `SOCKS_PROXY_HOST` / `SOCKS_PROXY_PORT` | 可选 | SOCKS 代理主机与端口（需同时配置） |
| `SOCKS_PROXY_USERNAME` / `SOCKS_PROXY_PASSWORD` | 可选 | SOCKS 代理认证信息 |
| `HTTPS_PROXY` | 可选 | HTTPS 代理 |
| `ALL_PROXY` | 可选 | 兜底代理地址 |

## 前端环境变量

| 变量名 | 必填 | 说明 |
| --- | --- | --- |
| `VITE_GLOB_API_URL` | 推荐 | 浏览器请求的 API 前缀（通常为 `/api`） |
| `VITE_APP_API_BASE_URL` | 开发环境推荐 | Vite 本地代理转发目标 |
| `VITE_GLOB_OPEN_LONG_REPLY` | 可选 | 当返回 `length` 时自动续写长回复 |
| `VITE_GLOB_APP_PWA` | 可选 | 启用/禁用 PWA 构建 |

## 构建

```bash
pnpm build
pnpm --dir service build
```

生产运行后端：

```bash
pnpm --dir service prod
```

## 部署

### Docker

```bash
docker build -t chatgpt-web .
docker run --name chatgpt-web --rm -it -p 3002:3002 --env-file service/.env chatgpt-web
```

### Docker Compose

参见：[docker-compose/README.md](./docker-compose/README.md)

### Kubernetes

参见：[kubernetes/README.md](./kubernetes/README.md)

## 质量检查

```bash
pnpm lint
pnpm type-check
pnpm secrets:scan
```

## 参与贡献

提交 PR 前请阅读：[CONTRIBUTING.md](./CONTRIBUTING.md)

## 致谢

向项目原作者 [ChenZhaoYu](https://github.com/Chanzhaoyu) 致敬，感谢其创建并开源了本项目的基础版本。

感谢 [JetBrains](https://www.jetbrains.com/) 对开源开发的支持。

感谢所有贡献者：

<a href="https://github.com/cnkang/chatgpt-web/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=cnkang/chatgpt-web" alt="Contributors" />
</a>

## License

本项目采用 MIT License，详见 [LICENSE](./LICENSE)。
