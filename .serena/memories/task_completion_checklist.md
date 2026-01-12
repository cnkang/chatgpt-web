# 任务完成后的检查清单

## 代码质量检查
在完成任何开发任务后，必须执行以下检查：

### 1. 前端检查（在项目根目录）
```bash
# 运行完整的质量检查
pnpm quality

# 如果有问题，运行自动修复
pnpm quality:fix

# 单独检查项目
pnpm type-check     # TypeScript 类型检查
pnpm lint          # ESLint 检查
pnpm format:check  # Prettier 格式检查
```

### 2. 后端检查（在 service 目录）
```bash
cd service

# 运行完整的质量检查
pnpm quality

# 如果有问题，运行自动修复
pnpm quality:fix

# 运行测试
pnpm test

# 单独检查项目
pnpm type-check     # TypeScript 类型检查
pnpm lint          # ESLint 检查
pnpm format:check  # Prettier 格式检查
```

### 3. 构建测试
```bash
# 测试前端构建
pnpm build

# 测试后端构建
cd service && pnpm build
```

## 必须通过的标准
- ✅ **零 TypeScript 错误**: `pnpm type-check` 必须无错误
- ✅ **零 ESLint 警告**: `pnpm lint` 必须无警告
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
```

## 功能测试
- 🧪 **手动测试**: 在浏览器中测试新功能
- 🧪 **API 测试**: 测试后端 API 端点
- 🧪 **跨浏览器测试**: 确保在主要浏览器中工作
- 🧪 **响应式测试**: 测试移动端和桌面端

## 性能检查
- ⚡ **构建大小**: 检查 bundle 大小是否合理
- ⚡ **加载时间**: 确保页面加载速度
- ⚡ **内存使用**: 检查是否有内存泄漏

## 安全检查
- 🔒 **依赖安全**: 检查是否有安全漏洞
- 🔒 **API 安全**: 确保 API 密钥不暴露
- 🔒 **输入验证**: 确保用户输入得到验证

## 文档更新
- 📝 **代码注释**: 确保复杂逻辑有注释
- 📝 **README 更新**: 如果有新功能，更新文档
- 📝 **API 文档**: 如果有 API 变更，更新文档

## 部署前最终检查
```bash
# 完整的质量检查流程
pnpm quality && cd service && pnpm quality && pnpm test

# 构建测试
pnpm build && cd service && pnpm build

# 环境变量检查
# 确保 .env 文件配置正确
# 确保生产环境变量设置正确
```

## 失败处理
如果任何检查失败：
1. 查看错误信息
2. 运行 `pnpm quality:fix` 尝试自动修复
3. 手动修复剩余问题
4. 重新运行检查
5. 重复直到所有检查通过