# Prerequisites

This document outlines the system requirements and dependencies needed to run the ChatGPT Web monorepo.

## System Requirements

### Node.js

**Required Version**: Node.js 24.0.0 or higher

```bash
node -v  # Should show v24.x.x or higher
```

**Why Node.js 24?**

- Native fetch API support (no external HTTP libraries needed)
- Modern JavaScript features and performance improvements
- Enhanced security and stability
- Optimized build processes

**Installation**:

Using nvm (recommended):

```bash
# Install nvm if not already installed
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install and use Node.js 24
nvm install 24
nvm use 24
nvm alias default 24
```

Direct installation:

- Download from [nodejs.org](https://nodejs.org/)
- Choose the LTS version 24.x.x

### PNPM

**Required Version**: PNPM 10.0.0 or higher

```bash
pnpm -v  # Should show 10.x.x or higher
```

**Installation**:

```bash
# Install globally via npm
npm install -g pnpm@latest

# Or via curl (Unix/macOS)
curl -fsSL https://get.pnpm.io/install.sh | sh -

# Or via PowerShell (Windows)
iwr https://get.pnpm.io/install.ps1 -useb | iex
```

**Why PNPM?**

- Efficient disk space usage with content-addressable storage
- Fast installation with hard linking
- Strict dependency resolution
- Excellent monorepo support

### Git

**Required**: Any recent version of Git

```bash
git --version
```

**Installation**:

- **macOS**: `brew install git` or download from [git-scm.com](https://git-scm.com/)
- **Ubuntu/Debian**: `sudo apt-get install git`
- **Windows**: Download from [git-scm.com](https://git-scm.com/)

## API Requirements

### OpenAI API Key

**Required**: Official OpenAI API key

1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key (starts with `sk-`)

**Important**:

- Only official OpenAI API keys are supported
- Unofficial proxy APIs are no longer supported
- Ensure your account has sufficient credits

### Azure OpenAI (Optional)

If using Azure OpenAI Service:

1. Azure subscription with OpenAI resource
2. API key from Azure portal
3. Endpoint URL
4. Deployment name

## Development Tools (Recommended)

### Code Editor

**Recommended**: Visual Studio Code with extensions:

```bash
# Install VS Code extensions
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension Vue.vscode-vue
code --install-extension esbenp.prettier-vscode
code --install-extension ms-vscode.vscode-eslint
```

**Alternative editors**:

- WebStorm (with Vue.js and TypeScript plugins)
- Neovim (with appropriate language servers)

### Browser

**Recommended**: Modern browsers for development:

- Chrome 131+ (recommended for development tools)
- Firefox 133+
- Safari 18+
- Edge 131+

## Optional Tools

### Docker (For Containerized Development)

```bash
# Check Docker installation
docker --version
docker-compose --version
```

**Installation**:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/macOS)
- Docker Engine (Linux)

### Kubernetes (For Production Deployment)

```bash
# Check kubectl installation
kubectl version --client
```

**Installation**:

- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- Local cluster: [minikube](https://minikube.sigs.k8s.io/) or [kind](https://kind.sigs.k8s.io/)

## Environment Setup

### Shell Configuration

Add to your shell profile (`.bashrc`, `.zshrc`, etc.):

```bash
# Node.js and PNPM
export PATH="$HOME/.local/share/pnpm:$PATH"

# NVM (if using)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

### Environment Variables

Create a `.env` file template:

```bash
# Copy example environment files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

## Verification

### Check All Prerequisites

Run this verification script:

```bash
#!/bin/bash

echo "Checking prerequisites..."

# Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 24 ]; then
    echo "✅ Node.js: $(node -v)"
else
    echo "❌ Node.js: $(node -v) (requires v24+)"
fi

# PNPM version
PNPM_VERSION=$(pnpm -v | cut -d'.' -f1)
if [ "$PNPM_VERSION" -ge 10 ]; then
    echo "✅ PNPM: $(pnpm -v)"
else
    echo "❌ PNPM: $(pnpm -v) (requires v10+)"
fi

# Git
if command -v git &> /dev/null; then
    echo "✅ Git: $(git --version)"
else
    echo "❌ Git: Not installed"
fi

# API Key check
if [ -f "apps/api/.env" ] && grep -q "OPENAI_API_KEY=sk-" apps/api/.env; then
    echo "✅ OpenAI API Key: Configured"
else
    echo "⚠️  OpenAI API Key: Not configured"
fi

echo "Verification complete!"
```

### Test Installation

After installing prerequisites:

```bash
# Clone and test the project
git clone https://github.com/your-org/chatgpt-web.git
cd chatgpt-web
pnpm install
pnpm build:shared
```

## Troubleshooting

### Node.js Issues

**Problem**: `node: command not found`
**Solution**: Install Node.js or check PATH configuration

**Problem**: Wrong Node.js version
**Solution**: Use nvm to install and switch to Node.js 24

### PNPM Issues

**Problem**: `pnpm: command not found`
**Solution**: Install PNPM globally or check PATH

**Problem**: Permission errors
**Solution**: Use `npm config set prefix ~/.npm-global` and update PATH

### API Key Issues

**Problem**: Invalid API key format
**Solution**: Ensure key starts with `sk-` and is from OpenAI platform

**Problem**: API key not working
**Solution**: Check key is active and account has credits

## Next Steps

After verifying all prerequisites:

1. Continue with [Monorepo Setup Guide](./monorepo-setup.md)
2. Configure your [Environment](./environment-configuration.md)
3. Review [Development Workflow](../development/workflow.md)

## Support

If you encounter issues with prerequisites:

1. Check the specific error messages
2. Verify versions meet minimum requirements
3. Review installation documentation for each tool
4. Check system-specific installation guides
