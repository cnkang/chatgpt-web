# 文档索引（Docs Index）

此目录中的文档仍然有效，但**当前的主文档中心在 `packages/docs/`**。如果你在找最新的安装、配置或部署说明，请优先查看 `packages/docs`。

## 推荐阅读顺序

- 快速上手（英文，最新）：`packages/docs/setup/monorepo-setup.md`
- 环境变量与配置：`packages/docs/deployment/environment.md`
- 贡献指南：`packages/docs/development/contributing.md`
- 部署指南：`packages/docs/deployment/docker.md`

根目录 README：

- 英文：`README.md`
- 中文：`README.zh.md`

## 本地查看文档

在仓库根目录执行：

```bash
pnpm --filter @chatgpt-web/docs serve
```

然后访问：http://localhost:8080

## 说明

- `docs/` 更偏向补充说明与历史文档。
- `packages/docs/` 是当前维护最活跃、结构最完整的文档集合。
