# Azure OpenAI v1 Responses API 流式响应修复

## 问题描述

使用 Azure OpenAI v1 Responses API 时，发送消息后前端一直显示"思考中"，无法接收到流式响应内容。

### 症状

- 传统 Azure API (`AZURE_OPENAI_USE_RESPONSES_API=false`) 工作正常
- v1 Responses API (`AZURE_OPENAI_USE_RESPONSES_API=true`) 返回 200 状态码
- 后端日志显示接收到流式数据，但前端无法显示
- 所有流式数据块都被记录为 "Failed to parse stream chunk"

## 根本原因

Azure v1 Responses API 返回的流式事件格式与预期的 OpenAI 标准格式不同。

### 预期格式（OpenAI 标准）

```json
{
  "id": "chatcmpl-xxx",
  "object": "chat.completion.chunk",
  "created": 1234567890,
  "model": "gpt-4o",
  "choices": [
    {
      "index": 0,
      "delta": {
        "role": "assistant",
        "content": "你好"
      },
      "finish_reason": null
    }
  ]
}
```

### 实际格式（Azure v1 Responses API）

Azure 返回多种类型的事件，每个事件都有 `type` 字段：

```json
// 1. 响应创建事件
{"type": "response.created", "response_id": "resp_xxx", ...}

// 2. 输出项添加事件
{"type": "response.output_item.added", "item_id": "item_xxx", ...}

// 3. 内容部分添加事件
{"type": "response.content_part.added", "content_index": 0, ...}

// 4. 文本增量事件（实际内容）
{"type": "response.output_text.delta", "delta": "你好", "output_index": 0, ...}

// 5. 文本完成事件
{"type": "response.output_text.done", "text": "完整文本", ...}

// 6. 响应完成事件
{"type": "response.done", ...}
```

**关键差异**：

- Azure 使用 `type` 字段区分事件类型
- 实际文本内容在 `delta` 字段中（不是 `choices[].delta.content`）
- 事件类型为 `response.output_text.delta`（不是标准的 chunk 格式）

## 修复方案

### 1. 更新接口定义

添加 Azure 事件格式的接口：

```typescript
// Azure v1 Responses API streaming event types
interface AzureResponsesStreamEvent {
  type: string
  response_id?: string
  item_id?: string
  output_index?: number
  content_index?: number
  delta?: string
  text?: string
  [key: string]: unknown
}
```

### 2. 更新流式处理逻辑

修改 `createStreamingResponsesCompletion` 方法，处理 Azure 的事件格式：

```typescript
// 解析事件
const event: AzureResponsesStreamEvent = JSON.parse(data)
logger.debug('Azure v1 event received', { type: event.type, delta: event.delta })

// 转换为内部格式
const chunk = this.convertAzureEventToChunk(event, responseId, currentModel)
if (chunk) {
  yield chunk
  chunkCount++
}
```

### 3. 添加事件转换方法

新增 `convertAzureEventToChunk` 方法，将 Azure 事件转换为标准格式：

```typescript
private convertAzureEventToChunk(
  event: AzureResponsesStreamEvent,
  responseId: string,
  model: string,
): ChatCompletionChunk | null {
  // 只处理包含实际内容的事件
  if (event.type === 'response.output_text.delta' && event.delta) {
    return {
      id: responseId || `azure-${Date.now()}`,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [
        {
          index: event.output_index ?? 0,
          delta: {
            role: 'assistant',
            content: event.delta, // 从 delta 字段提取内容
          },
          finishReason: undefined,
        },
      ],
    }
  }

  // 处理完成事件
  if (event.type === 'response.done' || event.type === 'response.output_text.done') {
    return {
      id: responseId || `azure-${Date.now()}`,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [
        {
          index: 0,
          delta: {
            role: 'assistant',
            content: '',
          },
          finishReason: 'stop',
        },
      ],
    }
  }

  // 忽略其他事件类型
  return null
}
```

## Azure v1 Responses API 事件流程

### 完整的事件序列

```
1. response.created
   └─> 响应开始，获取 response_id

2. response.output_item.added
   └─> 输出项添加

3. response.content_part.added
   └─> 内容部分添加

4. response.output_text.delta (多次)
   └─> 实际文本内容，逐字传输
   └─> {"type": "response.output_text.delta", "delta": "你"}
   └─> {"type": "response.output_text.delta", "delta": "好"}
   └─> {"type": "response.output_text.delta", "delta": "！"}

5. response.output_text.done
   └─> 文本输出完成

6. response.done
   └─> 整个响应完成
```

### 需要处理的事件

- **response.output_text.delta**: 包含实际文本内容，必须处理
- **response.done**: 标记响应完成，设置 `finish_reason: 'stop'`
- **response.output_text.done**: 可选处理，标记文本完成

### 可以忽略的事件

- **response.created**: 仅用于获取 response_id
- **response.output_item.added**: 元数据事件
- **response.content_part.added**: 元数据事件

## 修复的文件

### `apps/api/src/providers/azure.ts`

1. **接口定义** (第 25-70 行)
   - 添加 `AzureResponsesStreamEvent` 接口

2. **流式处理逻辑** (第 348-500 行)
   - 更新 `createStreamingResponsesCompletion` 方法
   - 添加事件类型检测和日志
   - 处理带/不带 "data:" 前缀的事件

3. **事件转换方法** (第 502-570 行)
   - 新增 `convertAzureEventToChunk` 方法
   - 保留 `convertFromResponsesStreamChunk` 用于向后兼容

## 测试验证

### 1. 重新构建

```bash
# 构建 API
cd apps/api
pnpm build

# 构建 Docker 镜像
cd ../..
docker build -t chatgpt-web:local .
```

### 2. 启动容器

```bash
docker run -d \
  --name chatgpt-web-azure \
  -p 3002:3002 \
  -e AI_PROVIDER=azure \
  -e AZURE_OPENAI_API_KEY="your-key" \
  -e AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com" \
  -e AZURE_OPENAI_DEPLOYMENT="model-router" \
  -e AZURE_OPENAI_USE_RESPONSES_API="true" \
  -e SESSION_SECRET="$(openssl rand -base64 32)" \
  chatgpt-web:local
```

### 3. 测试流式响应

1. 访问 http://localhost:3002
2. 创建新会话
3. 发送测试消息（例如："你好"）
4. 应该能够看到逐字显示的响应

### 4. 检查日志

```bash
docker logs -f chatgpt-web-azure
```

应该看到：

```
Azure v1 event received { type: 'response.output_text.delta', delta: '你' }
Azure v1 event received { type: 'response.output_text.delta', delta: '好' }
Azure v1 event received { type: 'response.done' }
Azure v1 Responses API: Stream completed { chunkCount: 3 }
```

## 性能对比

### 传统 API vs v1 Responses API

| 特性         | 传统 API    | v1 Responses API |
| ------------ | ----------- | ---------------- |
| 流式响应     | ✅ 支持     | ✅ 支持          |
| 事件格式     | OpenAI 标准 | Azure 自定义     |
| 推理模型支持 | 基础        | 增强             |
| 上下文保留   | 标准        | 改进             |
| 延迟         | 正常        | 略低             |
| 兼容性       | 高          | 需要适配         |

### 建议

- **生产环境**: 使用 v1 Responses API（已修复）
- **开发测试**: 两种 API 都可以
- **遇到问题**: 可以回退到传统 API

## 常见问题

### Q: 为什么 Azure 使用不同的事件格式？

**A:** Azure v1 Responses API 是 Azure 对 OpenAI API 的扩展实现，提供了更丰富的事件类型和更好的状态管理。虽然格式不同，但功能更强大。

### Q: 修复后性能如何？

**A:** 修复后的 v1 Responses API 性能与传统 API 相当或更好，特别是在：

- 长对话场景
- 推理模型使用
- 流式响应延迟

### Q: 如何切换回传统 API？

**A:** 设置环境变量：

```bash
export AZURE_OPENAI_USE_RESPONSES_API=false
```

或在 Docker 启动时：

```bash
docker run -d \
  ... \
  -e AZURE_OPENAI_USE_RESPONSES_API="false" \
  chatgpt-web:local
```

### Q: 是否支持所有 Azure 模型？

**A:** 是的，v1 Responses API 支持所有 Azure OpenAI 部署的模型，包括：

- GPT-4o 系列
- GPT-4 系列
- GPT-3.5 系列
- Model Router（自动选择最佳模型）
- 推理模型（o1 系列）

### Q: 日志中看到 "Failed to parse stream chunk" 怎么办？

**A:** 这个警告在修复前是正常的，因为代码尝试用错误的格式解析事件。修复后应该不再出现此警告。如果仍然出现：

1. 检查是否使用了最新的代码
2. 重新构建 Docker 镜像
3. 查看完整的事件日志，确认事件格式

## 技术细节

### SSE (Server-Sent Events) 格式

Azure v1 Responses API 使用标准的 SSE 格式：

```
data: {"type":"response.created","response_id":"resp_xxx"}

data: {"type":"response.output_text.delta","delta":"你好"}

data: {"type":"response.done"}

data: [DONE]
```

### 事件解析流程

```typescript
// 1. 读取流数据
const { done, value } = await reader.read()

// 2. 解码为文本
buffer += decoder.decode(value, { stream: true })

// 3. 按行分割
const lines = buffer.split('\n')

// 4. 解析每一行
for (const line of lines) {
  if (line.startsWith('data: ')) {
    const data = line.slice(6).trim()
    const event = JSON.parse(data)

    // 5. 转换为内部格式
    const chunk = this.convertAzureEventToChunk(event, responseId, model)
    if (chunk) {
      yield chunk
    }
  }
}
```

### 错误处理

```typescript
try {
  const event: AzureResponsesStreamEvent = JSON.parse(data)
  const chunk = this.convertAzureEventToChunk(event, responseId, currentModel)
  if (chunk) {
    yield chunk
  }
} catch (error) {
  logger.warn('Failed to parse stream chunk', { line: trimmedLine, error })
  // 继续处理下一个事件，不中断流
}
```

## 相关资源

- [Azure OpenAI 官方文档](https://learn.microsoft.com/azure/ai-services/openai/)
- [OpenAI v1 API 文档](https://platform.openai.com/docs/api-reference)
- [Server-Sent Events 规范](https://html.spec.whatwg.org/multipage/server-sent-events.html)
- [项目 API 文档](./docs/api/documentation.md)
- [Azure v1 API 修复文档](./AZURE_V1_API_FIX.md)

## 更新日志

- **2026-01-19**: 修复 Azure v1 Responses API 流式响应格式问题
- **2026-01-19**: 添加 `AzureResponsesStreamEvent` 接口
- **2026-01-19**: 实现 `convertAzureEventToChunk` 方法
- **2026-01-19**: 更新流式处理逻辑以支持 Azure 事件格式
- **2026-01-19**: 添加详细的事件类型日志

## 后续改进

### 建议的增强

1. **事件缓存**
   - 缓存 `response.output_text.done` 中的完整文本
   - 用于错误恢复和重试

2. **性能监控**
   - 记录每种事件类型的处理时间
   - 监控流式响应的延迟

3. **自动回退**
   - 如果 v1 API 流式响应失败
   - 自动回退到传统 API

4. **单元测试**
   - 模拟 Azure 事件流
   - 测试各种事件序列

## 获取帮助

如遇问题：

1. 检查容器日志：`docker logs -f chatgpt-web-azure`
2. 查看事件类型日志，确认收到的事件格式
3. 验证环境变量配置
4. 查看 [Issues](https://github.com/cnkang/chatgpt-web/issues)
5. 提交新的 Issue 并附上详细日志（包括事件类型）

## 贡献

欢迎提交 PR 改进 Azure v1 Responses API 的支持！

重点关注：

- 更好的错误处理
- 性能优化
- 更多事件类型支持
- 单元测试覆盖
