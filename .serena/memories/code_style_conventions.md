# 代码风格和约定

## 编程语言

- **主要语言**: TypeScript, Vue.js
- **文件编码**: UTF-8

## 代码风格配置

### ESLint 配置

- 使用 `@antfu/eslint-config` 作为基础配置
- 零警告策略：所有警告都被视为错误
- 支持 TypeScript, Vue.js, CSS, HTML, Markdown

### 关键规则

- `no-console`: 'warn' - 控制台输出警告
- `no-debugger`: 'error' - 禁止 debugger
- `ts/no-unused-vars`: 'error' - 禁止未使用变量
- `vue/component-name-in-template-casing`: 'PascalCase' - 组件名使用 PascalCase
- `prefer-const`: 'error' - 优先使用 const
- `no-var`: 'error' - 禁止使用 var

### TypeScript 配置

- 严格模式启用
- `noImplicitAny`: false - 允许隐式 any（临时）
- `noUnusedLocals`: true - 检查未使用的局部变量
- `noUnusedParameters`: true - 检查未使用的参数
- 路径别名: `@/*` 映射到 `./src/*`

## 命名约定

- **组件**: PascalCase (如 `UserAvatar.vue`)
- **文件夹**: kebab-case (如 `chat-components`)
- **变量/函数**: camelCase
- **常量**: UPPER_SNAKE_CASE
- **类型/接口**: PascalCase

## 文件组织

- Vue 组件放在 `src/components/` 下，按功能分组
- 页面组件放在 `src/views/` 下
- 工具函数放在 `src/utils/` 下
- 类型定义放在 `src/typings/` 下
- 每个组件文件夹包含 `index.vue` 和相关文件

## Vue.js 约定

- 使用 Composition API
- 组件名使用 PascalCase
- Props 使用 camelCase
- 事件名使用 kebab-case
- 使用 `<script setup>` 语法
- 样式使用 scoped CSS 或 CSS modules

## 提交信息规范

使用 Conventional Commits 规范：

- `feat:` 新功能
- `fix:` 修复
- `docs:` 文档
- `style:` 格式化
- `refactor:` 重构
- `test:` 测试
- `chore:` 构建/工具

## 代码质量

- 所有代码必须通过 ESLint 检查（零警告）
- 所有代码必须通过 Prettier 格式化
- TypeScript 必须零错误
- 提交前自动运行 lint 和格式化
