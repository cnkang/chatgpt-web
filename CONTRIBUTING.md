# 贡献指南

感谢你为本项目做出贡献。

## 分支与 Pull Request

1. Fork [cnkang/chatgpt-web](https://github.com/cnkang/chatgpt-web)，并从 `main` 创建分支。
2. 保持单次 PR 目标聚焦，提交到 `main`。
3. 如有关联 Issue，请在 PR 描述中链接说明。

## 本地环境准备

```bash
nvm install
nvm use
corepack enable
corepack prepare pnpm@10.29.2 --activate
pnpm bootstrap
pnpm --dir service install
```

## 开发命令

```bash
# 前端
pnpm dev

# 后端（监听模式）
pnpm --dir service dev
```

## 提交前检查

请在发起 PR 前执行：

```bash
pnpm lint
pnpm type-check
pnpm secrets:scan
```

如果包含后端改动，建议额外验证生产构建：

```bash
pnpm --dir service build
```

## Commit 规范

请遵循 [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)：

```text
<type>[optional scope]: <description>
```

常用类型：

- `feat`：新功能
- `fix`：缺陷修复
- `docs`：文档更新
- `refactor`：重构
- `perf`：性能优化
- `test`：测试
- `chore`：工具链或维护性调整

## License

提交代码即表示你同意该贡献以 [MIT License](./LICENSE) 授权。
