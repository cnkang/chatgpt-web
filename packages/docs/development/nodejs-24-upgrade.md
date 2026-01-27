# Node.js 24 LTS and Dependencies Upgrade Guide

This project has been upgraded to support Node.js 24 LTS and updated all major dependencies. Here are the main changes:

## Major Changes

### 1. Node.js Version Requirements

- **Minimum Version**: Node.js 18.0.0
- **Recommended Version**: Node.js 24.12.0 LTS
- **Docker**: Uses `node:24.12.0-alpine3.20`

### 2. Package Manager Upgrade

- **pnpm**: Upgraded to 10.27.0
- Added `.pnpmrc` configuration file
- Configured `strict-peer-dependencies=false` to handle compatibility issues

### 3. Major Dependency Upgrades

#### Frontend Dependencies

- **vue-i18n**: 9.14.5 → 11.2.8 (major upgrade)
- **@vueuse/core**: 10.11.1 → 14.1.0
- **pinia**: 2.3.1 → 3.0.4
- **tailwindcss**: 3.4.19 → 4.1.18 (major upgrade)
- **markdown-it**: 13.0.2 → 14.1.0
- **mermaid-it-markdown**: 1.0.13 → @md-reader/markdown-it-mermaid@0.6.0-beta.0 (replacement)

#### Development Dependencies

- **@antfu/eslint-config**: 3.16.0 → 6.7.3
- **vue-tsc**: 2.2.12 → 3.2.1
- **@types/node**: 24.10.4 → 25.0.3
- **husky**: 8.0.3 → 9.1.7

#### Backend Dependencies (apps/api)

- **express-rate-limit**: 6.11.2 → 8.2.1
- **https-proxy-agent**: 5.0.1 → 7.0.6
- **socks-proxy-agent**: 7.0.0 → 8.0.5
- **dotenv**: 16.6.1 → 17.2.3

### 4. Configuration File Updates

#### Tailwind CSS 4 Support

- Added `@tailwindcss/postcss` plugin
- Updated `postcss.config.js` configuration
- Maintains backward compatible styles

#### Vue I18n v11 Compatibility

- Upgraded to Composition API first
- Removed deprecated Legacy API warnings
- Maintains existing i18n functionality integrity

#### ESLint Configuration Optimization

- Ignores build directories (`apps/api/build/**`, `dist/**`)
- Optimized rule configuration
- Supports latest code style

#### Mermaid Plugin Upgrade

- Replaced `mermaid-it-markdown` with `@md-reader/markdown-it-mermaid`
- Native support for mermaid 11.x
- Resolved peer dependency warnings

#### Dependency Overrides Configuration

- Added pnpm overrides to resolve deprecated dependencies
- Automatically replaces outdated transitive dependencies with latest versions

### 5. CI/CD Updates

- GitHub Actions uses Node.js 24.x
- Updated actions versions to v4
- Docker build uses Node.js 24

### 6. Development Environment

- DevContainer uses Node.js 24
- Added `.nvmrc` file to specify version
- Updated all development tools

## Upgrade Steps

### Local Development Environment

1. **Install Node.js 24**

   ```bash
   # Using nvm
   nvm install 24.12.0
   nvm use 24.12.0

   # Or use nvm auto-switch
   nvm use
   ```

2. **Upgrade pnpm**

   ```bash
   corepack use pnpm@10.27.0
   ```

3. **Clean and reinstall dependencies**

   ```bash
   # Main project
   pnpm run common:cleanup
   pnpm install

   # Backend API (apps/api)
   cd apps/api
   pnpm run common:cleanup
   pnpm install
   ```

4. **Verify configuration**

   ```bash
   # Check lint
   pnpm run lint

   # Check types
   pnpm run type-check

   # Build test
   pnpm run build
   ```

### Production Environment

1. **Docker Deployment**
   - Rebuild Docker images
   - New images will automatically use Node.js 24

2. **Direct Deployment**
   - Ensure server has Node.js 24 installed
   - Reinstall dependencies and build

## Leveraging New Features

### Node.js 24 LTS New Features

1. **Performance Improvements**
   - V8 engine optimizations
   - Better memory management

2. **ES2022+ Support**
   - Top-level await
   - Private fields and methods
   - Regular expression match indices

3. **Security Enhancements**
   - Updated OpenSSL
   - Improved permission model

### Vue I18n v11 New Features

1. **Composition API First**
   - Better TypeScript support
   - More flexible composition API

2. **Performance Optimizations**
   - Smaller bundle size
   - Faster runtime performance

### Tailwind CSS 4 New Features

1. **New Engine**
   - Faster build speeds
   - Better CSS optimization

2. **Improved DX**
   - Better error messages
   - More flexible configuration

## Compatibility Notes

- **Backward Compatible**: Supports Node.js 18+
- **Dependency Updates**: All dependencies tested for compatibility
- **API Changes**: No breaking changes
- **Style Compatibility**: Tailwind styles remain compatible

## Known Issues and Solutions

### ✅ Resolved Issues

#### 1. Mermaid Peer Dependency Warning (Resolved)

```
mermaid-it-markdown@1.0.13 requires mermaid@^10.7.0 but found 11.12.2
```

**Solution**: Replaced with `@md-reader/markdown-it-mermaid@0.6.0-beta.0`, native support for mermaid 11.x

#### 2. Deprecated Sub-dependencies (Resolved)

```
@types/vue@2.0.0, source-map@0.8.0-beta.0, sourcemap-codec@1.4.8
```

**Solution**:

- Removing `mermaid-it-markdown` resolved the `@types/vue@2.0.0` issue
- Used pnpm overrides to replace deprecated dependencies with latest versions:
  - `source-map@0.8.0-beta.0` → `source-map@^0.7.6`
  - `sourcemap-codec@1.4.8` → `@jridgewell/sourcemap-codec@^1.5.5`

## Troubleshooting

### Common Issues

1. **PostCSS Configuration Error**

   ```bash
   # Ensure new Tailwind PostCSS plugin is installed
   pnpm add -D @tailwindcss/postcss
   ```

2. **ESLint Configuration Error**

   ```bash
   # Delete old configuration cache
   rm -rf node_modules/.cache
   pnpm install
   ```

3. **TypeScript Compilation Error**

   ```bash
   # Clear TypeScript cache
   pnpm run type-check --force
   ```

4. **Dependency Conflicts**

   ```bash
   # Reinstall all dependencies
   pnpm run common:cleanup
   pnpm install
   ```

## Verification Checklist

- [ ] Node.js version >= 18.0.0
- [ ] pnpm version = 10.27.0
- [ ] Dependencies installed successfully
- [ ] Lint checks pass
- [ ] Type checks pass
- [ ] Build successful
- [ ] Tests pass (if any)
- [ ] Docker build successful (if using)
- [ ] Vue I18n functionality normal
- [ ] Tailwind styles normal

After the upgrade is complete, the project will fully leverage the performance and security improvements of Node.js 24 LTS, as well as the latest features of all dependencies.
