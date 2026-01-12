# Docker Build Optimization Guide

## Problem Background

The original build process used QEMU emulation to build multi-architecture images, which had the following issues:

- Slow build speed (high QEMU emulation overhead)
- High resource consumption
- Unpredictable build times

## Optimization Solution

### Solution Comparison

| Feature        | Original (QEMU)      | Optimized (Native Runners)     |
| -------------- | -------------------- | ------------------------------ |
| Build Method   | Single runner + QEMU | Parallel native runners        |
| AMD64 Build    | QEMU emulation       | ubuntu-latest (native)         |
| ARM64 Build    | QEMU emulation       | ubuntu-24.04-arm64 (native)    |
| Build Speed    | Slow (2-3x overhead) | Fast (native performance)      |
| Parallelism    | Serial build         | Fully parallel                 |
| Cache Strategy | Shared cache         | Architecture-independent cache |
| Resource Usage | High CPU/Memory      | Optimized resource usage       |

### Expected Performance Improvements

- **Build Time**: 50-70% reduction
- **Resource Consumption**: 40-60% reduction
- **Parallelism**: 2 architectures building simultaneously
- **Cache Efficiency**: Architecture-specific cache with higher hit rates

## Implementation Details

### 1. Parallel Build Strategy

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

### 2. Architecture-Specific Caching

```yaml
cache-from: type=gha,scope=build-${{ matrix.arch }}
cache-to: type=gha,mode=max,scope=build-${{ matrix.arch }}
```

### 3. Digest Management

- Export digest after each architecture build
- Use artifacts to pass between jobs
- Finally merge into multi-architecture manifest

### 4. Error Handling

- `fail-fast: false` ensures one architecture failure doesn't affect the other
- Independent AWS authentication sessions
- Detailed build logs and summaries

## Usage

### Direct Use of Optimized Version

The optimized version has directly replaced the original `build_docker.yml`, including the following improvements:

1. **Parallel Build**: AMD64 and ARM64 build simultaneously
2. **Native Performance**: Uses GitHub native ARM64 runner
3. **Architecture-Specific Cache**: Improves cache hit rates
4. **No QEMU Overhead**: Eliminates emulation performance loss

### Verify Build Results

- Check generated multi-architecture images
- Verify running on different architectures
- Observe build time improvements

## Considerations

### GitHub Runner Availability

- `ubuntu-24.04-arm64` is GitHub's native ARM64 runner
- If unavailable, workflow will fail and needs to fallback to QEMU solution

### Cost Considerations

- ARM64 runner may have different billing standards
- But due to significantly reduced build time, overall cost is usually lower

### Compatibility

- Fully compatible with existing ECR push process
- Generated multi-architecture images are identical to original solution
- Supports all existing tagging strategies

## Monitoring and Debugging

### Build Time Comparison

In the Actions page you can see:

- Timeline of parallel builds
- Independent build time for each architecture
- Overall build time improvements

### Cache Hit Rate

- Each architecture has independent cache space
- Cache hit status can be viewed in build logs

### Troubleshooting

If you encounter issues:

1. Check ARM64 runner availability
2. Verify AWS permission configuration
3. Check if digest passing is working properly

## Rollback Plan

If you need to rollback to the QEMU solution, you can restore from git history:

```bash
git show HEAD~1:.github/workflows/build_docker.yml > .github/workflows/build_docker_qemu.yml
```

## Future Optimizations

1. **Conditional Building**: Intelligently choose build architectures based on code changes
2. **Cache Prewarming**: Regularly prewarm build cache
3. **Build Matrix Extension**: Support more architectures (like RISC-V)
4. **Cost Optimization**: Dynamically choose runner types based on usage

## File Description

- `build_docker.yml`: Optimized native runner build solution
- `DOCKER_BUILD_OPTIMIZATION.md`: This document, detailed optimization solution
