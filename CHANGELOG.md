## v3.0.1

`2026-01-13`

### 🎯 User Interface Improvements

#### PromptStore Feature Removal

- **Removed PromptStore Component**: Eliminated the "提示词商店" (Prompt Store) feature for a cleaner, more focused interface
- **Simplified Chat Input**: Replaced autocomplete input with standard textarea for better user experience
- **Cleaner Sidebar**: Removed PromptStore button from sidebar navigation
- **Reduced Dependencies**: Removed unused NAutoComplete component and related dependencies

#### Development Experience Enhancements

- **New Development Commands**: Added `pnpm dev:core` for starting only essential services (frontend + backend)
- **Improved Documentation Server**: Documentation server now runs only when explicitly needed
- **Cleaner Console Output**: Reduced noise from unnecessary services during development
- **Better Service Management**: Clear separation between core services and optional documentation

### 🛠 Technical Changes

#### Frontend Optimizations

- **Component Cleanup**: Removed PromptStore-related components and state management
- **Import Optimization**: Cleaned up unused imports and dependencies
- **Translation Updates**: Removed PromptStore-related translations from all language files
- **State Management**: Simplified store structure by removing prompt module

#### Development Workflow

- **Enhanced Scripts**: New `dev:core` script for focused development
- **Service Ports**: Clear documentation of service ports (Web: 1002, API: 3002, Docs: 8080)
- **Documentation Updates**: Updated all development guides with new command structure

### 📚 Documentation Updates

- **README Improvements**: Updated development commands and workflow instructions
- **Development Guide**: Enhanced workflow documentation with command usage guidelines
- **Setup Guide**: Improved monorepo setup instructions with new development commands

### 🔧 Configuration Changes

- **Package Scripts**: Added `dev:core` script to root package.json
- **Documentation Service**: Modified docs package to avoid unnecessary Python server startup
- **Turbo Configuration**: Maintained existing Turbo configuration for compatibility

### ⚡ Performance Improvements

- **Faster Development Startup**: `pnpm dev:core` starts only essential services
- **Reduced Resource Usage**: No unnecessary documentation server during development
- **Cleaner Build Process**: Removed unused components from build pipeline

### 📋 Migration Notes

For developers upgrading from previous versions:

1. **New Development Command**: Use `pnpm dev:core` for daily development instead of `pnpm dev`
2. **PromptStore Removal**: Any custom integrations with PromptStore will need to be removed
3. **Updated Documentation**: Review updated development workflow documentation

### 🎉 Benefits

- **Cleaner Interface**: Simplified chat interface without prompt autocomplete distractions
- **Faster Development**: Quicker startup time with essential services only
- **Better Focus**: Developers can focus on core functionality without unnecessary features
- **Improved Maintainability**: Reduced codebase complexity and dependencies

## v3.0.0

`2026-01-09`

### 🚀 Major Modernization Release

This release represents a complete modernization of the ChatGPT Web application, upgrading to the latest technologies and implementing comprehensive security enhancements.

### ⚡ Breaking Changes

- **Node.js 24 Required**: Upgraded to Node.js 24 with modern JavaScript features
- **Vue.js 3.5+ Migration**: Complete migration to Composition API with `<script setup>` syntax
- **OpenAI API v1**: Full migration to OpenAI API v1 with official client library
- **Removed Legacy Dependencies**: Replaced axios with native fetch API

### 🎯 New Features

#### AI Provider Architecture

- **Multi-Provider Support**: Abstract AI provider layer supporting OpenAI and Azure OpenAI
- **Reasoning Models**: Full support for OpenAI o1 and o1-mini reasoning models
- **Streaming Responses**: Enhanced streaming support for real-time conversations
- **Provider Switching**: Dynamic switching between different AI providers

#### Modern Frontend

- **Vue.js 3.5+ Features**: Reactive props destructuring, defineModel, and defineEmits
- **Route-Based Code Splitting**: Optimized bundle splitting with lazy loading
- **Reasoning UI Components**: Dedicated components for reasoning model interactions
- **Suspense Integration**: Async component loading with proper loading states

#### Security Enhancements

- **Comprehensive Input Validation**: Joi/Zod schema validation for all endpoints
- **Security Headers**: CSP, HSTS, X-Frame-Options, and XSS protection
- **Rate Limiting**: Advanced rate limiting with express-rate-limit
- **Session Security**: Secure session management and API key protection

#### Developer Experience

- **Zero-Warning Policy**: ESLint configuration with zero warnings enforcement
- **Modern Tooling**: Prettier, Husky pre-commit hooks, and automated formatting
- **Property-Based Testing**: Fast-check integration for comprehensive testing
- **Hot Module Replacement**: Enhanced development experience with Vite

### 🔧 Technical Improvements

#### Backend Modernization

- **TypeScript Generics**: Provider factory with advanced TypeScript patterns
- **Error Handling**: Exponential backoff and circuit breaker patterns
- **Logging System**: Structured logging with request/response tracking
- **Configuration Management**: Centralized configuration with validation

#### Frontend Optimization

- **Native Fetch**: Complete replacement of axios with native fetch API
- **Bundle Optimization**: Improved code splitting and tree shaking
- **Modern Browser Targets**: Optimized for latest browser features
- **Performance Monitoring**: Enhanced performance tracking and optimization

#### Infrastructure Updates

- **Docker Optimization**: Multi-stage builds with Node.js 24 support
- **Kubernetes Ready**: Updated deployment manifests for production
- **CI/CD Enhancement**: Improved GitHub Actions workflows
- **Security Scanning**: Automated security audits and dependency checks

### 📚 Documentation & Migration

#### Comprehensive Documentation

- **API Documentation**: Complete OpenAI v1 API integration guide
- **Deployment Guides**: AWS ECR, Docker, and Kubernetes deployment instructions
- **Migration Guide**: Step-by-step upgrade instructions from v2.x
- **Configuration Examples**: Environment variable and setup examples

#### Developer Resources

- **Contributing Guidelines**: Updated for modern development workflow
- **Code Standards**: ESLint and Prettier configuration documentation
- **Testing Guide**: Property-based and unit testing best practices
- **Troubleshooting**: Common issues and solutions

### 🛡️ Security & Compliance

- **Input Sanitization**: XSS protection and input validation
- **API Key Security**: Secure handling and storage of API credentials
- **CORS Configuration**: Proper cross-origin resource sharing setup
- **Audit Logging**: Comprehensive request and error logging

### 🌐 Internationalization

- **Enhanced i18n**: Improved translation system with better language support
- **RTL Support**: Right-to-left language support improvements
- **Locale Management**: Centralized locale configuration and loading

### 🧪 Testing & Quality Assurance

- **Property-Based Testing**: Fast-check integration for robust testing
- **Unit Test Coverage**: Comprehensive test suite for critical functionality
- **Integration Testing**: End-to-end testing for complete workflows
- **Performance Testing**: Load testing and performance benchmarking

### 📦 Dependencies

- **Node.js**: Upgraded to v24.x
- **Vue.js**: Upgraded to v3.5+
- **TypeScript**: Latest version with strict configuration
- **Vite**: Latest version with optimized configuration
- **OpenAI**: Official v4.x client library
- **Express**: Latest version with security middleware

### 🚀 Performance Improvements

- **Bundle Size**: Reduced bundle size through better code splitting
- **Loading Speed**: Improved initial load time with lazy loading
- **Memory Usage**: Optimized memory consumption and garbage collection
- **API Response Time**: Enhanced API response handling and caching

### 📋 Migration Guide

For detailed migration instructions from v2.x to v3.0.0, please refer to:

- [DEPLOYMENT_MIGRATION_GUIDE.md](DEPLOYMENT_MIGRATION_GUIDE.md)
- [DEPLOYMENT_READINESS.md](DEPLOYMENT_READINESS.md)
- [service/MIGRATION.md](service/MIGRATION.md)

### 🙏 Acknowledgments

This release represents months of development work focused on modernization, security, and performance. Special thanks to all contributors and the community for their feedback and support.

## v2.11.1

`2023-10-11`

## Enhancement

- 优化打字机光标效果
- 清空聊天历史按钮
- 更新文档

## BugFix

- 修复移动端上的问题
- 修复不规范的引入导致的问题

## v2.11.0

`2023-04-26`

> [chatgpt-web-plus](https://github.com/Chanzhaoyu/chatgpt-web-plus) 新界面、完整用户管理

## Enhancement

- 更新默认 `accessToken` 反代地址为 [[pengzhile](https://github.com/pengzhile)] 的 `https://ai.fakeopen.com/api/conversation` [[24min](https://github.com/Chanzhaoyu/chatgpt-web/pull/1567/files)]
- 添加自定义 `temperature` 和 `top_p` [[quzard](https://github.com/Chanzhaoyu/chatgpt-web/pull/1260)]
- 优化代码 [[shunyue1320](https://github.com/Chanzhaoyu/chatgpt-web/pull/1328)]
- 优化复制代码反馈效果

## BugFix

- 修复余额查询和文案 [[luckywangxi](https://github.com/Chanzhaoyu/chatgpt-web/pull/1174)][[zuoning777](https://github.com/Chanzhaoyu/chatgpt-web/pull/1296)]
- 修复默认语言错误 [[idawnwon](https://github.com/Chanzhaoyu/chatgpt-web/pull/1352)]
- 修复 `onRegenerate` 下问题 [[leafsummer](https://github.com/Chanzhaoyu/chatgpt-web/pull/1188)]

## Other

- 引导用户触发提示词 [[RyanXinOne](https://github.com/Chanzhaoyu/chatgpt-web/pull/1183)]
- 添加韩语翻译 [[Kamilake](https://github.com/Chanzhaoyu/chatgpt-web/pull/1372)]
- 添加俄语翻译 [[aquaratixc](https://github.com/Chanzhaoyu/chatgpt-web/pull/1571)]
- 优化翻译和文本检查 [[PeterDaveHello](https://github.com/Chanzhaoyu/chatgpt-web/pull/1460)]
- 移除无用文件

## v2.10.9

`2023-04-03`

> 更新默认 `accessToken` 反代地址为 [[pengzhile](https://github.com/pengzhile)] 的 `https://ai.fakeopen.com/api/conversation`

## Enhancement

- 添加 `socks5` 代理认证 [[yimiaoxiehou](https://github.com/Chanzhaoyu/chatgpt-web/pull/999)]
- 添加 `socks` 代理用户名密码的配置 [[hank-cp](https://github.com/Chanzhaoyu/chatgpt-web/pull/890)]
- 添加可选日志打印 [[zcong1993](https://github.com/Chanzhaoyu/chatgpt-web/pull/1041)]
- 更新侧边栏按钮本地化[[simonwu53](https://github.com/Chanzhaoyu/chatgpt-web/pull/911)]
- 优化代码块滚动条高度 [[Fog3211](https://github.com/Chanzhaoyu/chatgpt-web/pull/1153)]

## BugFix

- 修复 `PWA` 问题 [[bingo235](https://github.com/Chanzhaoyu/chatgpt-web/pull/807)]
- 修复 `ESM` 错误 [[kidonng](https://github.com/Chanzhaoyu/chatgpt-web/pull/826)]
- 修复反向代理开启时限流失效的问题 [[gitgitgogogo](https://github.com/Chanzhaoyu/chatgpt-web/pull/863)]
- 修复 `docker` 构建时 `.env` 可能被忽略的问题 [[zaiMoe](https://github.com/Chanzhaoyu/chatgpt-web/pull/877)]
- 修复导出异常错误 [[KingTwinkle](https://github.com/Chanzhaoyu/chatgpt-web/pull/938)]
- 修复空值异常 [[vchenpeng](https://github.com/Chanzhaoyu/chatgpt-web/pull/1103)]
- 移动端上的体验问题

## Other

- `Docker` 容器名字名义 [[LOVECHEN](https://github.com/Chanzhaoyu/chatgpt-web/pull/1035)]
- `kubernetes` 部署配置 [[CaoYunzhou](https://github.com/Chanzhaoyu/chatgpt-web/pull/1001)]
- 感谢 [[assassinliujie](https://github.com/Chanzhaoyu/chatgpt-web/pull/962)] 和 [[puppywang](https://github.com/Chanzhaoyu/chatgpt-web/pull/1017)] 的某些贡献
- 更新 `kubernetes/deploy.yaml` [[idawnwon](https://github.com/Chanzhaoyu/chatgpt-web/pull/1085)]
- 文档更新 [[#yi-ge](https://github.com/Chanzhaoyu/chatgpt-web/pull/883)]
- 文档更新 [[weifeng12x](https://github.com/Chanzhaoyu/chatgpt-web/pull/880)]
- 依赖更新

## v2.10.8

`2023-03-23`

如遇问题，请删除 `node_modules` 重新安装依赖。

## Feature

- 显示回复消息原文的选项 [[yilozt](https://github.com/Chanzhaoyu/chatgpt-web/pull/672)]
- 添加单 `IP` 每小时请求限制。环境变量： `MAX_REQUEST_PER_HOUR` [[zhuxindong ](https://github.com/Chanzhaoyu/chatgpt-web/pull/718)]
- 前端添加角色设定，仅 `API` 方式可见 [[quzard](https://github.com/Chanzhaoyu/chatgpt-web/pull/768)]
- `OPENAI_API_MODEL` 变量现在对 `ChatGPTUnofficialProxyAPI` 也生效，注意：`Token` 和 `API` 的模型命名不一致，不能直接填入 `gpt-3.5` 或者 `gpt-4` [[hncboy](https://github.com/Chanzhaoyu/chatgpt-web/pull/632)]
- 添加繁体中文 `Prompts` [[PeterDaveHello](https://github.com/Chanzhaoyu/chatgpt-web/pull/796)]

## Enhancement

- 重置回答时滚动定位至该回答 [[shunyue1320](https://github.com/Chanzhaoyu/chatgpt-web/pull/781)]
- 当 `API` 是 `gpt-4` 时增加可用的 `Max Tokens` [[simonwu53](https://github.com/Chanzhaoyu/chatgpt-web/pull/729)]
- 判断和忽略回复字符 [[liut](https://github.com/Chanzhaoyu/chatgpt-web/pull/474)]
- 切换会话时，自动聚焦输入框 [[JS-an](https://github.com/Chanzhaoyu/chatgpt-web/pull/735)]
- 渲染的链接新窗口打开
- 查询余额可选 `API_BASE_URL` 代理地址
- `config` 接口添加验证防止被无限制调用
- `PWA` 默认不开启，现在需手动修改 `.env` 文件 `VITE_GLOB_APP_PWA` 变量
- 当网络连接时，刷新页面，`500` 错误页自动跳转到主页

## BugFix

- `scrollToBottom` 调回 `scrollToBottomIfAtBottom` [[shunyue1320](https://github.com/Chanzhaoyu/chatgpt-web/pull/771)]
- 重置异常的 `loading` 会话

## Common

- 创建 `start.cmd` 在 `windows` 下也可以运行 [vulgatecnn](https://github.com/Chanzhaoyu/chatgpt-web/pull/656)]
- 添加 `visual-studio-code` 中调试配置 [[ChandlerVer5](https://github.com/Chanzhaoyu/chatgpt-web/pull/296)]
- 修复文档中 `docker` 端口为本地 [[kilvn](https://github.com/Chanzhaoyu/chatgpt-web/pull/802)]

## Other

- 依赖更新

## v2.10.7

`2023-03-17`

## BugFix

- 回退 `chatgpt` 版本，原因：导致 `OPENAI_API_BASE_URL` 代理失效
- 修复缺省状态的 `usingContext` 默认值

## v2.10.6

`2023-03-17`

## Feature

- 显示 `API` 余额 [[pzcn](https://github.com/Chanzhaoyu/chatgpt-web/pull/582)]

## Enhancement

- 美化滚动条样式和 `UI` 保持一致 [[haydenull](https://github.com/Chanzhaoyu/chatgpt-web/pull/617)]
- 优化移动端 `Prompt` 样式 [[CornerSkyless](https://github.com/Chanzhaoyu/chatgpt-web/pull/608)]
- 上下文开关改为全局开关，现在记录在本地缓存中
- 配置信息按接口类型显示

## Perf

- 优化函数方法 [[kirklin](https://github.com/Chanzhaoyu/chatgpt-web/pull/583)]
- 字符错误 [[pdsuwwz](https://github.com/Chanzhaoyu/chatgpt-web/pull/585)]
- 文档描述错误 [[lizhongyuan3](https://github.com/Chanzhaoyu/chatgpt-web/pull/636)]

## BugFix

- 修复 `Prompt` 导入、导出兼容性错误
- 修复 `highlight.js` 控制台兼容性警告

## Other

- 依赖更新

## v2.10.5

`2023-03-13`

更新依赖，`access_token` 默认代理为 [pengzhile](https://github.com/pengzhile) 的 `https://bypass.duti.tech/api/conversation`

## Feature

- `Prompt` 商店在线导入可以导入两种 `recommend.json`里提到的模板 [simonwu53](https://github.com/Chanzhaoyu/chatgpt-web/pull/521)
- 支持 `HTTPS_PROXY` [whatwewant](https://github.com/Chanzhaoyu/chatgpt-web/pull/308)
- `Prompt` 添加查询筛选

## Enhancement

- 调整输入框最大行数 [yi-ge](https://github.com/Chanzhaoyu/chatgpt-web/pull/502)
- 优化 `docker` 打包 [whatwewant](https://github.com/Chanzhaoyu/chatgpt-web/pull/520)
- `Prompt` 添加翻译和优化布局
- 「繁体中文」补全和审阅 [PeterDaveHello](https://github.com/Chanzhaoyu/chatgpt-web/pull/542)
- 语言选择调整为下路框形式
- 权限输入框类型调整为密码形式

## BugFix

- `JSON` 导入检查 [Nothing1024](https://github.com/Chanzhaoyu/chatgpt-web/pull/523)
- 修复 `AUTH_SECRET_KEY` 模式下跨域异常并添加对 `node.js 19` 版本的支持 [yi-ge](https://github.com/Chanzhaoyu/chatgpt-web/pull/499)
- 确定清空上下文时不应该重置会话标题

## Other

- 调整文档
- 更新依赖

## v2.10.4

`2023-03-11`

## Feature

- 感谢 [Nothing1024](https://github.com/Chanzhaoyu/chatgpt-web/pull/268) 添加 `Prompt` 模板和 `Prompt` 商店支持

## Enhancement

- 设置添加关闭按钮[#495]

## Demo

![Prompt](https://camo.githubusercontent.com/6a51af751eb29238cb7ef4f8fbd89f63db837562f97f33273095424e62dc9194/68747470733a2f2f73312e6c6f63696d672e636f6d2f323032332f30332f30342f333036326665633163613562632e676966)

## v2.10.3

`2023-03-10`

> 声明：除 `ChatGPTUnofficialProxyAPI` 使用的非官方代理外，本项目代码包括上游引用包均开源在 `GitHub`，如果你觉得本项目有监控后门或有问题导致你的账号、API被封，那我很抱歉。我可能`BUG`写的多，但我不缺德。此次主要为前端界面调整，周末愉快。

## Feature

- 支持长回复 [[yi-ge](https://github.com/Chanzhaoyu/chatgpt-web/pull/450)][[详情](https://github.com/Chanzhaoyu/chatgpt-web/pull/450)]
- 支持 `PWA` [[chenxch](https://github.com/Chanzhaoyu/chatgpt-web/pull/452)]

## Enhancement

- 调整移动端按钮和优化布局
- 调整 `iOS` 上安全距离
- 简化 `docker-compose` 部署 [[cloudGrin](https://github.com/Chanzhaoyu/chatgpt-web/pull/466)]

## BugFix

- 修复清空会话侧边栏标题不会重置的问题 [[RyanXinOne](https://github.com/Chanzhaoyu/chatgpt-web/pull/453)]
- 修复设置文字过长时导致的设置按钮消失的问题

## Other

- 更新依赖

## v2.10.2

`2023-03-09`

衔接 `2.10.1` 版本[详情](https://github.com/Chanzhaoyu/chatgpt-web/releases/tag/v2.10.1)

## Enhancement

- 移动端下输入框获得焦点时左侧按钮隐藏

## BugFix

- 修复 `2.10.1` 中添加 `OPENAI_API_MODEL` 变量的判断错误，会导致默认模型指定失效，抱歉
- 回退 `2.10.1` 中前端变量影响 `Docker` 打包

## v2.10.1

`2023-03-09`

注意：删除了 `.env` 文件改用 `.env.example` 代替，如果是手动部署的同学现在需要手动创建 `.env` 文件并从 `.env.example` 中复制需要的变量，并且 `.env` 文件现在会在 `Git` 提交中被忽略，原因如下：

- 在项目中添加 `.env` 从一开始就是个错误的示范
- 如果是 `Fork` 项目进行修改测试总是会被 `Git` 修改提示给打扰
- 感谢 [yi-ge](https://github.com/Chanzhaoyu/chatgpt-web/pull/395) 的提醒和修改

这两天开始，官方已经开始对第三方代理进行了拉闸， `accessToken` 即将或已经开始可能会不可使用。异常 `API` 使用也开始封号，封号缘由不明，如果出现使用 `API` 提示错误，请查看后端控制台信息，或留意邮箱。

## Feature

- 感谢 [CornerSkyless](https://github.com/Chanzhaoyu/chatgpt-web/pull/393) 添加是否发送上下文开关功能

## Enhancement

- 感谢 [nagaame](https://github.com/Chanzhaoyu/chatgpt-web/pull/415) 优化`docker`打包镜像文件过大的问题
- 感谢 [xieccc](https://github.com/Chanzhaoyu/chatgpt-web/pull/404) 新增 `API` 模型配置变量 `OPENAI_API_MODEL`
- 感谢 [acongee](https://github.com/Chanzhaoyu/chatgpt-web/pull/394) 优化输出时滚动条问题

## BugFix

- 感谢 [CornerSkyless](https://github.com/Chanzhaoyu/chatgpt-web/pull/392) 修复导出图片会丢失头像的问题
- 修复深色模式导出图片的样式问题

## v2.10.0

`2023-03-07`

- 老规矩，手动部署的同学需要删除 `node_modules` 安装包重新安装降低出错概率，其他部署不受影响，但是可能会有缓存问题。
- 虽然说了更新放缓，但是 `issues` 不看， `PR` 不改我睡不着，我的邮箱从每天早上`8`点到凌晨`12`永远在滴滴滴，所以求求各位，超时的`issues`自己关闭下哈，我真的需要缓冲一下。
- 演示图片请看最后

## Feature

- 添加权限功能，用法：`service/.env` 中的 `AUTH_SECRET_KEY` 变量添加密码
- 感谢 [PeterDaveHello](https://github.com/Chanzhaoyu/chatgpt-web/pull/348) 添加「繁体中文」翻译
- 感谢 [GermMC](https://github.com/Chanzhaoyu/chatgpt-web/pull/369) 添加聊天记录导入、导出、清空的功能
- 感谢 [CornerSkyless](https://github.com/Chanzhaoyu/chatgpt-web/pull/374) 添加会话保存为本地图片的功能

## Enhancement

- 感谢 [CornerSkyless](https://github.com/Chanzhaoyu/chatgpt-web/pull/363) 添加 `ctrl+enter` 发送消息
- 现在新消息只有在结束了之后才滚动到底部，而不是之前的强制性
- 优化部分代码

## BugFix

- 转义状态码前端显示，防止直接暴露 `key`（我可能需要更多的状态码补充）

## Other

- 更新依赖到最新

## 演示

> 不是界面最新效果，有美化改动

权限

![权限](https://user-images.githubusercontent.com/24789441/223438518-80d58d42-e344-4e39-b87c-251ff73925ed.png)

聊天记录导出

![聊天记录导出](https://user-images.githubusercontent.com/57023771/223372153-6d8e9ec1-d82c-42af-b4bd-232e50504a25.gif)

保存图片到本地

![保存图片到本地](https://user-images.githubusercontent.com/13901424/223423555-b69b95ef-8bcf-4951-a7c9-98aff2677e18.gif)

## v2.9.3

`2023-03-06`

## Enhancement

- 感谢 [ChandlerVer5](https://github.com/Chanzhaoyu/chatgpt-web/pull/305) 使用 `markdown-it` 替换 `marked`，解决代码块闪烁的问题
- 感谢 [shansing](https://github.com/Chanzhaoyu/chatgpt-web/pull/277) 改善文档
- 感谢 [nalf3in](https://github.com/Chanzhaoyu/chatgpt-web/pull/293) 添加英文翻译

## BugFix

- 感谢[sepcnt ](https://github.com/Chanzhaoyu/chatgpt-web/pull/279) 修复切换记录时编辑状态未关闭的问题
- 修复复制代码的兼容性报错问题
- 修复部分优化小问题

## v2.9.2

`2023-03-04`

手动部署的同学，务必删除根目录和`service`中的`node_modules`重新安装依赖，降低出现问题的概率，自动部署的不需要做改动。

### Feature

- 感谢 [hyln9](https://github.com/Chanzhaoyu/chatgpt-web/pull/247) 添加对渲染 `LaTex` 数学公式的支持
- 感谢 [ottocsb](https://github.com/Chanzhaoyu/chatgpt-web/pull/227) 添加支持 `webAPP` (苹果添加到主页书签访问)支持
- 添加 `OPENAI_API_BASE_URL` 可选环境变量[#249]

## Enhancement

- 优化在高分屏上主题内容的最大宽度[#257]
- 现在文字按单词截断[#215][#225]

### BugFix

- 修复动态生成时代码块不能被复制的问题[#251][#260]
- 修复 `iOS` 移动端输入框不会被键盘顶起的问题[#256]
- 修复控制台渲染警告

## Other

- 更新依赖至最新
- 修改 `README` 内容

## v2.9.1

`2023-03-02`

### Feature

- 代码块添加当前代码语言显示和复制功能[#197][#196]
- 完善多语言，现在可以切换中英文显示

## Enhancement

- 由[Zo3i](https://github.com/Chanzhaoyu/chatgpt-web/pull/187) 完善 `docker-compose` 部署文档

### BugFix

- 由 [ottocsb](https://github.com/Chanzhaoyu/chatgpt-web/pull/200) 修复头像修改不同步的问题

## Other

- 更新依赖至最新
- 修改 `README` 内容

## v2.9.0

`2023-03-02`

### Feature

- 现在能复制带格式的消息文本
- 新设计的设定页面，可以自定义姓名、描述、头像（链接方式）
- 新增`403`和`404`页面以便扩展

## Enhancement

- 更新 `chatgpt` 使 `ChatGPTAPI` 支持 `gpt-3.5-turbo-0301`（默认）
- 取消了前端超时限制设定

## v2.8.3

`2023-03-01`

### Feature

- 消息已输出内容不会因为中断而消失[#167]
- 添加复制消息按钮[#133]

### Other

- `README` 添加声明内容

## v2.8.2

`2023-02-28`

### Enhancement

- 代码主题调整为 `One Dark - light|dark` 适配深色模式

### BugFix

- 修复普通文本代码渲染和深色模式下的问题[#139][#154]

## v2.8.1

`2023-02-27`

### BugFix

- 修复 `API` 版本不是 `Markdown` 时，普通 `HTML` 代码会被渲染的问题 [#146]

## v2.8.0

`2023-02-27`

- 感谢 [puppywang](https://github.com/Chanzhaoyu/chatgpt-web/commit/628187f5c3348bda0d0518f90699a86525d19018) 修复了 `2.7.0` 版本中关于流输出数据的问题（使用 `nginx` 需要自行配置 `octet-stream` 相关内容）

- 关于为什么使用 `octet-stream` 而不是 `sse`，是因为更好的兼容之前的模式。

- 建议更新到此版本获得比较完整的体验

### Enhancement

- 优化了部份代码和类型提示
- 输入框添加换行提示
- 移动端输入框现在回车为换行，而不是直接提交
- 移动端双击标题返回顶部，箭头返回底部

### BugFix

- 流输出数据下的问题[#122]
- 修复了 `API Key` 下部份代码不换行的问题
- 修复移动端深色模式部份样式问题[#123][#126]
- 修复主题模式图标不一致的问题[#126]

## v2.7.3

`2023-02-25`

### Feature

- 适配系统深色模式 [#118](https://github.com/Chanzhaoyu/chatgpt-web/issues/103)

### BugFix

- 修复用户消息能被渲染为 `HTML` 问题 [#117](https://github.com/Chanzhaoyu/chatgpt-web/issues/117)

## v2.7.2

`2023-02-24`

### Enhancement

- 消息使用 [github-markdown-css](https://www.npmjs.com/package/github-markdown-css) 进行美化，现在支持全语法
- 移除测试无用函数

## v2.7.1

`2023-02-23`

因为消息流在 `accessToken` 中存在解析失败和消息不完整等一系列的问题，调整回正常消息形式

### Feature

- 现在可以中断请求过长没有答复的消息
- 现在可以删除单条消息
- 设置中显示当前版本信息

### BugFix

- 回退 `2.7.0` 的消息不稳定的问题

## v2.7.0

`2023-02-23`

### Feature

- 使用消息流返回信息，反应更迅速

### Enhancement

- 样式的一点小改动

## v2.6.2

`2023-02-22`

### BugFix

- 还原修改代理导致的异常问题

## v2.6.1

`2023-02-22`

### Feature

- 新增 `Railway` 部署模版

### BugFix

- 手动打包 `Proxy` 问题

## v2.6.0

`2023-02-21`

### Feature

- 新增对 `网页 accessToken` 调用 `ChatGPT`，更智能不过不太稳定 [#51](https://github.com/Chanzhaoyu/chatgpt-web/issues/51)
- 前端页面设置按钮显示查看当前后端服务配置

### Enhancement

- 新增 `TIMEOUT_MS` 环境变量设定后端超时时常（单位：毫秒）[#62](https://github.com/Chanzhaoyu/chatgpt-web/issues/62)

## v2.5.2

`2023-02-21`

### Feature

- 增加对 `markdown` 格式的支持 [Demo](https://github.com/Chanzhaoyu/chatgpt-web/pull/77)

### BugFix

- 重载会话时滚动条保持

## v2.5.1

`2023-02-21`

### Enhancement

- 调整路由模式为 `hash`
- 调整新增会话添加到
- 调整移动端样式

## v2.5.0

`2023-02-20`

### Feature

- 会话 `loading` 现在显示为光标动画
- 会话现在可以再次生成回复
- 会话异常可以再次进行请求
- 所有删除选项添加确认操作

### Enhancement

- 调整 `chat` 为路由页面而不是组件形式
- 更新依赖至最新
- 调整移动端体验

### BugFix

- 修复移动端左侧菜单显示不完整的问题

## v2.4.1

`2023-02-18`

### Enhancement

- 调整部份移动端上的样式
- 输入框支持换行

## v2.4.0

`2023-02-17`

### Feature

- 响应式支持移动端

### Enhancement

- 修改部份描述错误

## v2.3.3

`2023-02-16`

### Feature

- 添加 `README` 部份说明和贡献列表
- 添加 `docker` 镜像
- 添加 `GitHub Action` 自动化构建

### BugFix

- 回退依赖更新导致的 [Eslint 报错](https://github.com/eslint/eslint/issues/16896)

## v2.3.2

`2023-02-16`

### Enhancement

- 更新依赖至最新
- 优化部份内容

## v2.3.1

`2023-02-15`

### BugFix

- 修复多会话状态下一些意想不到的问题

## v2.3.0

`2023-02-15`

### Feature

- 代码类型信息高亮显示
- 支持 `node ^16` 版本
- 移动端响应式初步支持
- `vite` 中 `proxy` 代理

### Enhancement

- 调整超时处理范围

### BugFix

- 修复取消请求错误提示会添加到信息中
- 修复部份情况下提交请求不可用
- 修复侧边栏宽度变化闪烁的问题

## v2.2.0

`2023-02-14`

### Feature

- 会话和上下文本地储存
- 侧边栏本地储存

## v2.1.0

`2023-02-14`

### Enhancement

- 更新依赖至最新
- 联想功能移动至前端提交，后端只做转发

### BugFix

- 修复部份项目检测有关 `Bug`
- 修复清除上下文按钮失效

## v2.0.0

`2023-02-13`

### Refactor

重构并优化大部分内容

## v1.0.5

`2023-02-12`

### Enhancement

- 输入框焦点，连续提交

### BugFix

- 修复信息框样式问题
- 修复中文输入法提交问题

## v1.0.4

`2023-02-11`

### Feature

- 支持上下文联想

## v1.0.3

`2023-02-11`

### Enhancement

- 拆分 `service` 文件以便扩展
- 调整 `Eslint` 相关验证

### BugFix

- 修复部份控制台报错

## v1.0.2

`2023-02-10`

### BugFix

- 修复新增信息容器不会自动滚动到问题
- 修复文本过长不换行到问题 [#1](https://github.com/Chanzhaoyu/chatgpt-web/issues/1)
