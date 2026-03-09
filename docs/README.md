# ChatGPT Web Documentation

Welcome to the ChatGPT Web documentation. This directory serves as the documentation hub for the project.

## 📚 Documentation Structure

The project documentation is organized as follows:

### Main Documentation (`packages/docs/`)

The **primary and maintained documentation** is located in `packages/docs/`. This follows monorepo best practices and contains the most up-to-date guides:

- **[Setup Guides](../packages/docs/setup/)** - Installation, configuration, and getting started
- **[Development Guides](../packages/docs/development/)** - Development workflow, coding standards, testing
- **[Deployment Guides](../packages/docs/deployment/)** - Docker, Kubernetes, cloud deployment
- **[API Documentation](../packages/docs/api/)** - API reference, authentication, providers
- **[Package Documentation](../packages/docs/packages/)** - Individual package documentation

👉 **Start here**: [packages/docs/README.md](../packages/docs/README.md)

### Changelog (`docs/changelog/`)

- **[CHANGELOG.md](./changelog/CHANGELOG.md)** - Version history and release notes

### Archive (`docs/archive/`)

Historical documentation and completed migration reports:

- **[Archive Index](./archive/README.md)** - Overview of archived documents
- **Migration Reports** - Express to Native HTTP/2, Monorepo migration
- **Historical Status Reports** - Project snapshots from previous milestones

## 🚀 Quick Links

### For New Users

1. [Prerequisites](../packages/docs/setup/prerequisites.md) - System requirements
2. [Monorepo Setup](../packages/docs/setup/monorepo-setup.md) - Initial setup
3. [Environment Configuration](../packages/docs/setup/environment-configuration.md) - Configure your environment
4. [Configuration Examples](../packages/docs/setup/configuration-examples.md) - Quick start configs

### For Developers

1. [Development Workflow](../packages/docs/development/workflow.md) - Daily development process
2. [Contributing Guide](../packages/docs/development/contributing.md) - How to contribute
3. [Code Style Guide](../packages/docs/development/code-style.md) - Coding standards
4. [Testing Guide](../packages/docs/development/testing.md) - Testing practices

### For Deployment

1. [Docker Deployment](../packages/docs/deployment/docker.md) - Container deployment
2. [Kubernetes Deployment](../packages/docs/deployment/kubernetes.md) - K8s deployment
3. [Environment Configuration](../packages/docs/deployment/environment.md) - Production config
4. [HTTP/2 Deployment](../packages/docs/deployment/http2-deployment.md) - HTTP/2 and TLS setup

### For API Integration

1. [API Reference](../packages/docs/api/api-reference.md) - Complete API documentation
2. [Authentication](../packages/docs/api/authentication.md) - Auth mechanisms
3. [Providers](../packages/docs/api/providers.md) - OpenAI and Azure OpenAI
4. [Error Handling](../packages/docs/api/error-handling.md) - Error codes and handling

## 📖 Documentation Principles

### Single Source of Truth

- **`packages/docs/`** is the authoritative documentation location
- **`docs/`** contains only changelog and archives
- All guides are maintained in one place to avoid duplication

### Documentation Organization

```
project-root/
├── README.md                    # Project overview
├── README.zh.md                 # Chinese README
├── docs/
│   ├── README.md               # This file - documentation hub
│   ├── changelog/              # Version history
│   │   └── CHANGELOG.md
│   └── archive/                # Historical documents
│       ├── README.md
│       ├── reports/            # Migration and status reports
│       └── guides/             # Archived guides
└── packages/docs/              # ⭐ Main documentation
    ├── README.md               # Documentation home
    ├── setup/                  # Setup and configuration
    ├── development/            # Development guides
    ├── deployment/             # Deployment guides
    ├── api/                    # API documentation
    └── packages/               # Package-specific docs
```

## 🔍 Finding Documentation

### By Topic

- **Getting Started**: `packages/docs/setup/`
- **Development**: `packages/docs/development/`
- **Deployment**: `packages/docs/deployment/`
- **API**: `packages/docs/api/`
- **Troubleshooting**: `packages/docs/development/troubleshooting.md`

### By Task

- **Install the project**: [Monorepo Setup](../packages/docs/setup/monorepo-setup.md)
- **Configure environment**: [Environment Configuration](../packages/docs/setup/environment-configuration.md)
- **Start development**: [Development Workflow](../packages/docs/development/workflow.md)
- **Deploy with Docker**: [Docker Deployment](../packages/docs/deployment/docker.md)
- **Deploy to Kubernetes**: [Kubernetes Deployment](../packages/docs/deployment/kubernetes.md)
- **Integrate with API**: [API Reference](../packages/docs/api/api-reference.md)

### By Package

- **Frontend (apps/web)**: [Web Package](../packages/docs/packages/web.md)
- **Backend (apps/api)**: [API Package](../packages/docs/packages/api.md)
- **Shared Code**: [Shared Package](../packages/docs/packages/shared.md)
- **Configuration**: [Config Package](../packages/docs/packages/config.md)

## 📝 Contributing to Documentation

Documentation improvements are always welcome! See:

- [Contributing Guide](../packages/docs/development/contributing.md)
- [Documentation Standards](../packages/docs/development/code-style.md#documentation-standards)

### Documentation Guidelines

1. **Update in `packages/docs/`** - This is the maintained location
2. **Keep it current** - Update docs when code changes
3. **Be clear and concise** - Write for developers of all levels
4. **Include examples** - Show, don't just tell
5. **Test your examples** - Ensure code examples work

## 🗂️ Archive Policy

Documents are archived when:

- ✅ Task or migration is complete
- ✅ Information is integrated into main documentation
- ✅ Document is kept only for historical reference
- ✅ No longer requires regular maintenance

See [Archive README](./archive/README.md) for details.

## 📊 Documentation Status

| Category     | Location                     | Status      | Last Updated |
| ------------ | ---------------------------- | ----------- | ------------ |
| Setup Guides | `packages/docs/setup/`       | ✅ Current  | 2026-03      |
| Development  | `packages/docs/development/` | ✅ Current  | 2026-03      |
| Deployment   | `packages/docs/deployment/`  | ✅ Current  | 2026-03      |
| API Docs     | `packages/docs/api/`         | ✅ Current  | 2026-03      |
| Changelog    | `docs/changelog/`            | ✅ Current  | 2026-03      |
| Archives     | `docs/archive/`              | 📦 Archived | Various      |

## 🆘 Need Help?

- 📖 [Documentation Home](../packages/docs/README.md)
- 🐛 [Issue Tracker](https://github.com/cnkang/chatgpt-web/issues)
- 💬 [Discussions](https://github.com/cnkang/chatgpt-web/discussions)
- 🤝 [Contributing Guide](../packages/docs/development/contributing.md)

---

**Note**: This documentation structure was established in March 2026 as part of the monorepo consolidation. All legacy documentation has been archived or migrated to `packages/docs/`.
