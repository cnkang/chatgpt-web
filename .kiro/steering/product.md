# Product Overview

## ChatGPT Web

A modern, secure ChatGPT web application providing a clean interface for interacting with OpenAI's official ChatGPT API and Azure OpenAI services.

## Core Purpose

Provides developers and users with a reliable, feature-rich web interface for ChatGPT that emphasizes:

- **Security**: Official API integration only, comprehensive input validation, security headers
- **Modern Architecture**: Node.js 24, Vue.js 3.5+, TypeScript with zero errors
- **AI Model Support**: Full support for latest OpenAI models including reasoning models (o1 series)
- **Enterprise Ready**: Azure OpenAI integration, rate limiting, session management

## Key Features

- **Multi-Provider Support**: Seamless switching between OpenAI and Azure OpenAI
- **Reasoning Models**: Full support for o1, o1-preview, o1-mini with step-by-step display
- **Streaming Responses**: Real-time message streaming for both providers
- **Rich Content**: Markdown rendering, code highlighting, math formulas (KaTeX), diagrams (Mermaid)
- **Internationalization**: Multi-language support with Vue i18n
- **Session Management**: Multi-session storage with context preservation
- **Security First**: Comprehensive validation, XSS protection, secure headers
- **Developer Experience**: Hot reload, TypeScript strict mode, zero-warning ESLint policy

## Target Users

- Developers needing a reliable ChatGPT interface
- Organizations requiring Azure OpenAI integration
- Teams wanting self-hosted ChatGPT solutions
- Users needing advanced features like reasoning model support

## Deployment Options

- Docker containers with comprehensive environment configuration
- Kubernetes deployments with provided manifests
- Railway/Sealos cloud deployments
- Manual deployment with Node.js 24+ environments
