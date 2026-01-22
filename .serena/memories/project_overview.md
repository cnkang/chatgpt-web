# ChatGPT Web 项目概览

## 项目目的

ChatGPT Web 是一个现代化的 ChatGPT 网页应用，提供干净、现代的界面来与 OpenAI 的官方 ChatGPT API 交互。

## 技术栈

### 前端

- **Vue.js 3.5+**: 使用 Composition API 和响应式 props 解构
- **TypeScript 5.9+**: 严格配置，零错误
- **Vite**: 构建系统，针对 Node.js 24 优化
- **Naive UI**: UI 组件库
- **Pinia**: 状态管理
- **Vue Router**: 路由管理
- **Vue i18n**: 国际化支持
- **Tailwind CSS**: 样式框架
- **Markdown-it**: Markdown 渲染
- **Mermaid**: 图表支持
- **KaTeX**: 数学公式渲染

### 后端

- **Node.js 24**: 使用原生 fetch 和现代 JavaScript 特性
- **Express.js 5**: Web 框架
- **TypeScript**: 严格类型检查
- **OpenAI API v1**: 官方 API 集成
- **Azure OpenAI**: 原生 Azure OpenAI 支持
- **Redis**: 会话存储
- **Zod**: 数据验证

### 开发工具

- **ESLint**: 代码检查，使用 @antfu/eslint-config
- **Prettier**: 代码格式化
- **Husky**: Git hooks
- **Commitlint**: 提交信息规范
- **Vitest**: 测试框架
- **Fast-check**: 属性测试

## 项目结构

```
chatgpt-web/
├── src/                    # 前端源码
│   ├── components/         # Vue 组件
│   ├── views/             # 页面视图
│   ├── store/             # Pinia 状态管理
│   ├── router/            # 路由配置
│   ├── api/               # API 接口
│   ├── utils/             # 工具函数
│   ├── hooks/             # Vue 组合式函数
│   ├── locales/           # 国际化文件
│   └── styles/            # 样式文件
├── service/               # 后端服务
│   └── src/               # 后端源码
├── public/                # 静态资源
├── docs/                  # 文档
├── docker-compose/        # Docker 配置
└── kubernetes/            # K8s 配置
```

## 支持的 AI 模型

- OpenAI: gpt-4o, gpt-4o-mini, gpt-4-turbo, o1, o1-preview, o1-mini
- Azure OpenAI: 支持所有在 Azure OpenAI 资源中可用的模型

## 特性

- 推理模型支持（o1 系列）
- 流式响应
- 多会话管理
- 代码高亮和格式化
- 数学公式渲染
- 图表支持
- 多语言界面
- 主题切换
- 访问控制
- 数据导入/导出
- 消息保存为图片
