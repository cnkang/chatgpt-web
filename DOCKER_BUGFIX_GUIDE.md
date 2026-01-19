# Docker 部署 Bug 修复指南

## 问题描述

在 Docker 容器中运行时，访问 `/api/session` 等端点会返回 500 错误：

```
Sanitization error: TypeError: Cannot set property query of #<IncomingMessage> which has only a getter
at sanitizeRequest (file:///app/apps/api/build/index.js:2993:17)
```

## 根本原因

`sanitizeRequest` 中间件试图直接设置 `req.query` 和 `req.params` 属性，但在某些 Node.js 版本和路由库组合中，这些属性是只读的（只有 getter）。

## 修复方案

已更新 `apps/api/src/middleware/validation.ts` 中的 `sanitizeRequest` 函数，使用 `Object.defineProperty` 来处理只读属性。

### 修复前的代码

```typescript
export function sanitizeRequest(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.body) {
      req.body = sanitizeObject(req.body)
    }

    if (req.query) {
      req.query = sanitizeObject(req.query) as Request['query'] // ❌ 失败
    }

    if (req.params) {
      req.params = sanitizeObject(req.params) as Record<string, string> // ❌ 失败
    }

    next()
  } catch (error) {
    // ...
  }
}
```

### 修复后的代码

```typescript
export function sanitizeRequest(req: Request, res: Response, next: NextFunction) {
  try {
    // Sanitize request body
    if (req.body) {
      req.body = sanitizeObject(req.body)
    }

    // Sanitize query parameters - use Object.defineProperty
    if (req.query && Object.keys(req.query).length > 0) {
      try {
        const sanitizedQuery = sanitizeObject(req.query) as Request['query']
        Object.defineProperty(req, 'query', {
          value: sanitizedQuery,
          writable: true,
          enumerable: true,
          configurable: true,
        })
      } catch (queryError) {
        // Fallback: sanitize in place
        Object.keys(req.query).forEach(key => {
          const value = req.query[key]
          if (typeof value === 'string') {
            ;(req.query as any)[key] = sanitizeString(value)
          }
        })
      }
    }

    // Similar handling for params
    if (req.params && Object.keys(req.params).length > 0) {
      try {
        const sanitizedParams = sanitizeObject(req.params) as Record<string, string>
        Object.defineProperty(req, 'params', {
          value: sanitizedParams,
          writable: true,
          enumerable: true,
          configurable: true,
        })
      } catch (paramsError) {
        // Fallback: sanitize in place
        Object.keys(req.params).forEach(key => {
          const value = req.params[key]
          if (typeof value === 'string') {
            req.params[key] = sanitizeString(value)
          }
        })
      }
    }

    next()
  } catch (error) {
    console.error('Sanitization error:', error)
    const response: ValidationErrorResponse = {
      status: 'Fail',
      message: 'Request sanitization failed',
      data: null,
    }

    return res.status(500).json(response)
  }
}
```

## 重新部署步骤

### 1. 重新构建代码

```bash
# 构建 API
cd apps/api
pnpm build
cd ../..
```

### 2. 重新构建 Docker 镜像

```bash
docker build -t chatgpt-web:local .
```

### 3. 停止旧容器

```bash
# 查找容器 ID
docker ps -a | grep chatgpt-web

# 停止并删除
docker stop <container-id>
docker rm <container-id>
```

### 4. 启动新容器

#### 方法 A: 使用启动脚本

```bash
# 设置环境变量
export AZURE_OPENAI_API_KEY="your-key"
export AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com"
export AZURE_OPENAI_DEPLOYMENT="gpt-4o"

# 启动
./docker-run-azure.sh
```

#### 方法 B: 直接使用 Docker 命令

```bash
docker run -d \
  --name chatgpt-web-azure \
  -p 3002:3002 \
  -e AI_PROVIDER=azure \
  -e AZURE_OPENAI_API_KEY="your-key" \
  -e AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com" \
  -e AZURE_OPENAI_DEPLOYMENT="gpt-4o" \
  -e SESSION_SECRET="$(openssl rand -base64 32)" \
  --restart unless-stopped \
  chatgpt-web:local
```

## 验证修复

### 1. 检查容器日志

```bash
docker logs -f chatgpt-web-azure
```

应该看到：

```
✓ AI Provider initialized: azure
Server is running on port 3002
```

### 2. 测试健康检查

```bash
curl http://localhost:3002/health
```

应该返回：

```json
{ "status": "ok", "timestamp": "..." }
```

### 3. 测试会话端点

```bash
curl -X POST http://localhost:3002/api/session \
  -H "Content-Type: application/json"
```

应该返回会话信息，而不是 500 错误。

### 4. 浏览器测试

访问 http://localhost:3002，应该能够：

- 正常加载页面
- 创建新会话
- 发送消息（如果配置了有效的 Azure OpenAI 凭据）

## 常见问题

### Q: 容器启动后立即退出

**A:** 检查日志查看错误信息：

```bash
docker logs chatgpt-web-azure
```

常见原因：

- Azure OpenAI 配置错误
- 端口被占用
- 环境变量格式错误

### Q: 仍然看到 500 错误

**A:** 确认已重新构建：

1. 检查源代码是否已更新
2. 重新运行 `pnpm build`
3. 重新构建 Docker 镜像
4. 确保使用新镜像启动容器

### Q: 如何查看详细日志

**A:** 设置 LOG_LEVEL 为 debug：

```bash
docker run -d \
  ... \
  -e LOG_LEVEL="debug" \
  chatgpt-web:local
```

## 技术细节

### 为什么会出现这个问题？

1. **Express.js 的请求对象**：Express 的 `Request` 对象继承自 Node.js 的 `IncomingMessage`
2. **只读属性**：某些中间件或路由库会将 `query` 和 `params` 定义为只读属性
3. **直接赋值失败**：尝试 `req.query = newValue` 会抛出 TypeError

### 解决方案的工作原理

1. **Object.defineProperty**：重新定义属性描述符，使其可写
2. **Try-Catch 保护**：如果重定义失败，回退到原地修改
3. **保持兼容性**：两种方法都能确保数据被正确清理

### 相关文件

- `apps/api/src/middleware/validation.ts` - 修复的主要文件
- `apps/api/src/middleware/validation.test.ts` - 单元测试
- `apps/api/src/index.ts` - 中间件使用位置

## 后续改进

### 建议的测试

1. 添加针对只读属性的单元测试
2. 在 CI/CD 中添加 Docker 集成测试
3. 测试不同 Node.js 版本的兼容性

### 代码质量

1. 考虑使用代理对象而不是直接修改请求对象
2. 添加更详细的错误日志
3. 考虑使用 TypeScript 的类型守卫

## 相关资源

- [Node.js IncomingMessage 文档](https://nodejs.org/api/http.html#class-httpincomingmessage)
- [Object.defineProperty MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty)
- [Express Request 对象](https://expressjs.com/en/api.html#req)

## 更新日志

- **2026-01-19**: 修复 sanitizeRequest 中间件的只读属性问题
- **2026-01-19**: 更新 Docker 镜像和部署脚本
