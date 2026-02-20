# 贡献指南

感谢你为 ChatGPT Web 做出贡献。以下内容基于当前 Monorepo 结构整理。

## 仓库与前置要求

- 仓库地址：https://github.com/cnkang/chatgpt-web
- Node.js：`>= 24.0.0`
- pnpm：`>= 10.0.0`

## 本地开发环境准备

在仓库根目录执行：

```bash
pnpm install
pnpm bootstrap

cp .env.example .env
cp apps/api/.env.example apps/api/.env
```

后端最小配置（`apps/api/.env`）：

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-official-api-key
DEFAULT_MODEL=gpt-5.1
```

## 开发与校验命令

日常开发推荐：

```bash
pnpm dev:core
```

提交 PR 前建议执行：

```bash
pnpm quality
pnpm test
pnpm --filter @chatgpt-web/docs validate
```

## Pull Request 流程建议

1. Fork 仓库并从 `main` 创建分支。
2. 保持变更聚焦、提交信息清晰。
3. 运行质量检查与测试。
4. 提交 PR，并关联相关 Issue（如有）。

## Commit 规范（Conventional Commits）

请尽量遵循：

```bash
<type>[optional scope]: <description>
```

常见类型：

- `feat`：新功能
- `fix`：修复问题
- `docs`：文档修改
- `refactor`：重构（无行为变更）
- `test`：测试相关
- `chore`：维护性变更
