# 项目架构和设计模式

## 整体架构
ChatGPT Web 采用前后端分离架构：
- **前端**: Vue.js 3 + TypeScript + Vite
- **后端**: Node.js 24 + Express.js + TypeScript
- **通信**: RESTful API + Server-Sent Events (SSE) 流式响应

## 前端架构模式

### 1. 组件化设计
- **原子组件**: 基础 UI 组件（Button, Input, Avatar）
- **分子组件**: 组合组件（Message, Header）
- **有机体组件**: 复杂业务组件（Chat, Sidebar）
- **模板组件**: 页面布局组件（Layout）
- **页面组件**: 完整页面（Chat, Settings）

### 2. 状态管理 (Pinia)
```
store/
├── modules/
│   ├── app/          # 应用全局状态
│   ├── auth/         # 认证状态
│   ├── chat/         # 聊天状态
│   ├── settings/     # 设置状态
│   ├── user/         # 用户状态
│   └── prompt/       # 提示词状态
```

### 3. 路由设计
- 路由懒加载
- 权限守卫
- 路由元信息

### 4. 组合式函数 (Composables)
- `useChat`: 聊天逻辑
- `useTheme`: 主题切换
- `useLanguage`: 国际化
- `useReasoning`: 推理模型支持

## 后端架构模式

### 1. 分层架构
```
service/src/
├── controllers/      # 控制器层
├── services/        # 业务逻辑层
├── models/          # 数据模型层
├── middleware/      # 中间件
├── routes/          # 路由定义
├── utils/           # 工具函数
└── types/           # 类型定义
```

### 2. 提供者模式 (Provider Pattern)
- **AIProvider**: AI 服务抽象接口
- **OpenAIProvider**: OpenAI API 实现
- **AzureOpenAIProvider**: Azure OpenAI 实现

### 3. 中间件模式
- 认证中间件
- 限流中间件
- 错误处理中间件
- 安全头中间件

## 设计模式

### 1. 工厂模式
用于创建不同的 AI 提供者：
```typescript
class AIProviderFactory {
  static create(type: 'openai' | 'azure'): AIProvider
}
```

### 2. 策略模式
用于不同的消息处理策略：
- 普通消息处理
- 推理模型消息处理
- 流式响应处理

### 3. 观察者模式
用于状态变化通知：
- Pinia 状态订阅
- 事件总线

### 4. 适配器模式
用于适配不同的 API 响应格式：
- OpenAI API 适配器
- Azure OpenAI API 适配器

### 5. 装饰器模式
用于增强功能：
- API 重试装饰器
- 缓存装饰器
- 日志装饰器

## 数据流设计

### 1. 前端数据流
```
用户输入 → Action → Store → API → Response → Store → UI 更新
```

### 2. 后端数据流
```
HTTP 请求 → 中间件 → 控制器 → 服务层 → AI Provider → 响应
```

### 3. 流式响应
```
AI Provider → Stream → SSE → 前端 → 实时 UI 更新
```

## 错误处理策略

### 1. 前端错误处理
- 全局错误边界
- API 错误拦截
- 用户友好的错误提示

### 2. 后端错误处理
- 统一错误响应格式
- 错误日志记录
- 优雅降级

## 性能优化策略

### 1. 前端优化
- 路由懒加载
- 组件懒加载
- 虚拟滚动
- 防抖和节流

### 2. 后端优化
- 连接池
- 缓存策略
- 请求限流
- 响应压缩

## 安全设计

### 1. 前端安全
- XSS 防护
- CSRF 防护
- 内容安全策略 (CSP)

### 2. 后端安全
- API 密钥保护
- 请求验证
- 安全头设置
- 会话管理

## 测试策略

### 1. 单元测试
- 工具函数测试
- 组件测试
- 服务层测试

### 2. 集成测试
- API 集成测试
- 端到端测试

### 3. 属性测试
- 使用 Fast-check 进行属性测试
- 边界条件测试