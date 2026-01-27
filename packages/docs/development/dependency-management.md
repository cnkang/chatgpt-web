# Dependency Management

This document describes the optimized dependency management strategy for the ChatGPT Web monorepo.

## Overview

The monorepo uses PNPM workspaces with Turborepo for coordinated builds and optimized dependency management. This setup provides:

- **Dependency Hoisting**: Common development dependencies are hoisted to the root
- **Version Consistency**: Prevents conflicts across packages
- **Workspace Protocol**: Internal dependencies use `workspace:*` protocol
- **Automated Validation**: Scripts to validate and optimize dependencies

## Workspace Structure

```
chatgpt-web/
├── apps/
│   ├── web/                    # Frontend application
│   └── api/                    # Backend service
├── packages/
│   ├── shared/                 # Common utilities and types
│   ├── docs/                   # Documentation
│   └── config/                 # Shared configuration
└── tools/
    └── scripts/                # Dependency management scripts
```

## Dependency Categories

### Root Dependencies (Hoisted)

These dependencies are managed at the root level and shared across all packages:

- **Build Tools**: `turbo`, `typescript`, `tsup`
- **Code Quality**: `eslint`, `prettier`, `@antfu/eslint-config`
- **Testing**: `vitest`
- **Utilities**: `npm-run-all`, `rimraf`
- **Git Hooks**: `husky`, `lint-staged`

### Package-Specific Dependencies

Each package only includes dependencies it directly uses:

- **apps/web**: Vue.js ecosystem, UI libraries, frontend-specific tools
- **apps/api**: Express.js, OpenAI SDK, backend-specific libraries
- **packages/shared**: Minimal dependencies (only `zod` for validation)
- **packages/config**: No dependencies (peer dependencies only)
- **packages/docs**: Documentation-specific tools

### Internal Dependencies

All internal package dependencies use the workspace protocol:

```json
{
  "dependencies": {
    "@chatgpt-web/shared": "workspace:*"
  }
}
```

## Configuration Files

### .pnpmrc

```ini
# PNPM Workspace Configuration
strict-peer-dependencies=false
auto-install-peers=true

# Dependency Hoisting Optimization
hoist=true
hoist-pattern[]=*eslint*
hoist-pattern[]=*prettier*
hoist-pattern[]=*typescript*
hoist-pattern[]=*vitest*
hoist-pattern[]=*turbo*

# Prevent Version Conflicts
resolution-mode=highest
prefer-workspace-packages=true

# Performance Optimizations
store-dir=~/.pnpm-store
verify-store-integrity=true
package-import-method=auto

# Security
audit-level=moderate
```

### pnpm-workspace.yaml

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'tools/*'
```

### Root package.json Overrides

```json
{
  "pnpm": {
    "overrides": {
      "source-map": "^0.7.6",
      "sourcemap-codec": "npm:@jridgewell/sourcemap-codec@^1.5.5"
    },
    "peerDependencyRules": {
      "allowedVersions": {
        "eslint": "9"
      },
      "ignoreMissing": ["@algolia/client-search", "search-insights"]
    }
  }
}
```

## Management Scripts

### Validation Script

Validates dependency management rules:

```bash
pnpm deps:validate
```

Checks:

- ✅ Workspace protocol usage for internal dependencies
- ✅ Proper dependency hoisting
- ✅ Version consistency (with documented exceptions)
- ✅ Direct dependency usage

### Optimization Script

Automatically optimizes dependencies:

```bash
pnpm deps:optimize
```

Performs:

- 🔧 Converts internal dependencies to workspace protocol
- 🔧 Moves common dev dependencies to root
- 🔧 Normalizes version ranges
- 🔧 Cleans up empty dependency objects

### Other Dependency Commands

```bash
# Update all dependencies
pnpm deps:update

# Security audit
pnpm deps:audit

# Install dependencies
pnpm install

# Clean and reinstall
pnpm clean:all && pnpm install
```

## Version Conflict Resolution

### Allowed Conflicts

Some version conflicts are documented as acceptable:

- **@types/node**: Different packages may require different Node.js type versions
  - `apps/web`: `^24.0.0` (frontend compatibility)
  - `apps/api`: `^25.0.3` (latest backend features)

### Resolution Strategy

1. **Prefer Latest**: Use the highest compatible version
2. **Document Exceptions**: Clearly document why conflicts are allowed
3. **Regular Updates**: Keep dependencies up-to-date
4. **Security First**: Prioritize security updates

## Best Practices

### Adding Dependencies

1. **Determine Scope**: Is this a root, package-specific, or shared dependency?
2. **Check Existing**: Avoid duplicating existing dependencies
3. **Use Workspace Protocol**: For internal dependencies, always use `workspace:*`
4. **Validate**: Run `pnpm deps:validate` after changes

### Package-Specific Dependencies

```bash
# Add to specific package
pnpm --filter @chatgpt-web/web add vue-router
pnpm --filter @chatgpt-web/api add express

# Add dev dependency to specific package
pnpm --filter @chatgpt-web/web add -D @types/node
```

### Root Dependencies

```bash
# Add shared dev dependency to root
pnpm add -D eslint prettier typescript
```

### Internal Dependencies

```bash
# Add internal dependency (automatically uses workspace protocol)
pnpm --filter @chatgpt-web/web add @chatgpt-web/shared
```

## Troubleshooting

### Common Issues

#### Dependency Not Found

```bash
# Clean and reinstall
pnpm clean:all
pnpm install
```

#### Version Conflicts

```bash
# Check for conflicts
pnpm deps:validate

# Optimize dependencies
pnpm deps:optimize

# Manual resolution in package.json overrides
```

#### Build Failures

```bash
# Ensure shared packages are built first
pnpm --filter @chatgpt-web/shared build
pnpm build
```

#### Peer Dependency Warnings

Most peer dependency warnings can be safely ignored if:

- The functionality works correctly
- The versions are compatible
- The warning is documented as expected

### Performance Optimization

#### Dependency Installation

- Use `pnpm install --frozen-lockfile` in CI/CD
- Leverage PNPM's global store for faster installs
- Use `--filter` for package-specific operations

#### Build Performance

- Turborepo caching reduces rebuild times
- Parallel builds for independent packages
- Incremental TypeScript compilation with project references

## Monitoring and Maintenance

### Regular Tasks

1. **Weekly**: Run `pnpm deps:validate` to check for issues
2. **Monthly**: Run `pnpm deps:update` to update dependencies
3. **Quarterly**: Review and optimize dependency structure
4. **As Needed**: Run `pnpm deps:audit` for security updates

### Metrics to Track

- Number of duplicate dependencies
- Build time improvements
- Bundle size optimizations
- Security vulnerability count

## Configuration Reference

### Workspace Configuration

The `.pnpm-workspace-config.json` file documents the dependency management strategy:

```json
{
  "config": {
    "hoistedDependencies": [
      "eslint",
      "prettier",
      "typescript",
      "vitest",
      "npm-run-all",
      "rimraf",
      "@antfu/eslint-config",
      "turbo",
      "husky",
      "lint-staged"
    ],
    "workspacePackages": [
      "@chatgpt-web/web",
      "@chatgpt-web/api",
      "@chatgpt-web/shared",
      "@chatgpt-web/config",
      "@chatgpt-web/docs"
    ],
    "allowedVersionConflicts": {
      "@types/node": {
        "reason": "Different Node.js version requirements",
        "packages": ["apps/web", "apps/api"]
      }
    }
  }
}
```

This configuration serves as documentation and can be used by tooling to validate the dependency management strategy.
