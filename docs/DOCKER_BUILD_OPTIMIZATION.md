# Docker 构建优化方案

## 问题背景

原有的构建流程使用 QEMU 模拟来构建多架构镜像，存在以下问题：
- 构建速度慢（QEMU 模拟开销大）
- 资源消耗高
- 构建时间不可预测

## 优化方案

### 方案对比

| 特性 | 原方案 (QEMU) | 优化方案 (原生Runner) |
|------|---------------|---------------------|
| 构建方式 | 单runner + QEMU模拟 | 并行原生runner |
| AMD64构建 | QEMU模拟 | ubuntu-latest (原生) |
| ARM64构建 | QEMU模拟 | ubuntu-24.04-arm64 (原生) |
| 构建速度 | 慢 (2-3倍开销) | 快 (原生性能) |
| 并行度 | 串行构建 | 完全并行 |
| 缓存策略 | 共享缓存 | 架构独立缓存 |
| 资源使用 | 高CPU/内存 | 优化的资源使用 |

### 性能提升预期

- **构建时间**: 减少 50-70%
- **资源消耗**: 减少 40-60%
- **并行度**: 2个架构同时构建
- **缓存效率**: 架构特定缓存，命中率更高

## 实现细节

### 1. 并行构建策略
```yaml
strategy:
  fail-fast: false
  matrix:
    include:
      - arch: amd64
        runner: ubuntu-latest
        platform: linux/amd64
      - arch: arm64
        runner: ubuntu-24.04-arm64
        platform: linux/arm64
```

### 2. 架构特定缓存
```yaml
cache-from: type=gha,scope=build-${{ matrix.arch }}
cache-to: type=gha,mode=max,scope=build-${{ matrix.arch }}
```

### 3. Digest管理
- 每个架构构建后导出digest
- 使用artifacts在job间传递
- 最终合并为多架构manifest

### 4. 错误处理
- `fail-fast: false` 确保一个架构失败不影响另一个
- 独立的AWS认证会话
- 详细的构建日志和摘要

## 使用方法

### 直接使用优化版本
优化版本已经直接替换了原有的 `build_docker.yml`，包含以下改进：

1. **并行构建**: AMD64和ARM64同时构建
2. **原生性能**: 使用GitHub原生ARM64 runner
3. **架构特定缓存**: 提高缓存命中率
4. **无QEMU开销**: 消除模拟性能损失

### 验证构建结果
- 检查生成的多架构镜像
- 验证在不同架构上的运行情况
- 观察构建时间的改善

## 注意事项

### GitHub Runner 可用性
- `ubuntu-24.04-arm64` 是 GitHub 提供的原生 ARM64 runner
- 如果不可用，workflow会失败，需要回退到QEMU方案

### 成本考虑
- ARM64 runner 可能有不同的计费标准
- 但由于构建时间大幅减少，总体成本通常更低

### 兼容性
- 完全兼容现有的 ECR 推送流程
- 生成的多架构镜像与原方案完全一致
- 支持所有现有的标签策略

## 监控和调试

### 构建时间对比
在 Actions 页面可以看到：
- 并行构建的时间线
- 每个架构的独立构建时间
- 总体构建时间的改善

### 缓存命中率
- 每个架构有独立的缓存空间
- 可以在构建日志中查看缓存命中情况

### 故障排除
如果遇到问题：
1. 检查 ARM64 runner 的可用性
2. 验证 AWS 权限配置
3. 查看 digest 传递是否正常

## 回滚方案

如果需要回滚到QEMU方案，可以从git历史恢复：
```bash
git show HEAD~1:.github/workflows/build_docker.yml > .github/workflows/build_docker_qemu.yml
```

## 未来优化

1. **条件构建**: 根据代码变更智能选择构建架构
2. **缓存预热**: 定期预热构建缓存
3. **构建矩阵扩展**: 支持更多架构（如 RISC-V）
4. **成本优化**: 根据使用情况动态选择runner类型

## 文件说明

- `build_docker.yml`: 优化后的原生runner构建方案
- `DOCKER_BUILD_OPTIMIZATION.md`: 本文档，详细说明优化方案