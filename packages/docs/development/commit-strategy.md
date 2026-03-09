# Commit Strategy Guide

## Best Practices for Commits

### 1. Logical Grouping

Split changes into logical, atomic commits:

```bash
# ❌ Bad: One large commit
git add .
git commit -m "chore: complete monorepo migration and cleanup"

# ✅ Good: Multiple logical commits
git add apps/ packages/
git commit -m "feat: implement monorepo structure with apps and packages"

git add .github/workflows/
git commit -m "ci: update workflows for monorepo build system"

git add docker-compose/ kubernetes/
git commit -m "deploy: update deployment configs for monorepo"

git add -A && git reset -- apps/ packages/ docs/
git commit -m "chore: remove legacy directories after monorepo migration"
```

### 2. Commit Message Format

Use Conventional Commits format:

```bash
# Types
feat:     # New feature
fix:      # Bug fix
docs:     # Documentation changes
style:    # Code style changes (formatting, etc.)
refactor: # Code refactoring
test:     # Adding or updating tests
chore:    # Maintenance tasks
ci:       # CI/CD changes
perf:     # Performance improvements
build:    # Build system changes
revert:   # Reverting changes

# Examples
git commit -m "feat: add Azure OpenAI provider support"
git commit -m "fix: resolve streaming response timeout issue"
git commit -m "docs: update deployment guide for monorepo"
git commit -m "chore: update dependencies to latest versions"
```

### 3. Staging Strategy

#### For Large Changes

```bash
# Stage specific directories
git add apps/web/
git commit -m "feat: migrate frontend to apps/web structure"

git add apps/api/
git commit -m "feat: migrate backend to apps/api structure"

git add packages/shared/
git commit -m "feat: create shared package with common utilities"

git add packages/config/
git commit -m "chore: centralize configuration in packages/config"
```

#### For Mixed Changes

```bash
# Use interactive staging
git add -p  # Review each change individually

# Or stage specific files
git add package.json pnpm-workspace.yaml turbo.json
git commit -m "build: configure monorepo build system"

git add .github/workflows/
git commit -m "ci: update CI workflows for monorepo"
```

### 4. Files to Never Commit

Ensure these are in `.gitignore`:

```
# Dependencies
node_modules/
.pnpm-store/

# Build outputs
dist/
build/
.turbo/

# Cache directories
.cache/
.serena/cache/
.next/cache/

# Environment files
.env
.env.local
.env.*.local

# Logs
*.log
logs/

# OS files
.DS_Store
Thumbs.db

# IDE files
.vscode/settings.json
.idea/
*.swp
*.swo
```

### 5. Pre-commit Checklist

Before committing:

```bash
# 1. Run quality checks
pnpm quality

# 2. Run tests
pnpm test  # (in apps/api)

# 3. Check build
pnpm build

# 4. Review staged changes
git diff --cached

# 5. Commit with proper message
git commit -m "feat: add new feature with proper description"
```

### 6. Commit Size Guidelines

#### ✅ Good Commit Sizes

- Single feature implementation
- Single bug fix
- Related configuration changes
- Documentation updates for one topic
- Dependency updates (grouped by type)

#### ❌ Avoid Large Commits

- Multiple unrelated features
- Mixed feature + refactoring + docs
- Entire directory restructuring in one commit
- Mass file deletions with new features

### 7. Example Workflow for Monorepo Changes

```bash
# 1. Create feature branch
git checkout -b feat/new-provider-support

# 2. Implement shared types
git add packages/shared/src/types/
git commit -m "feat: add provider types to shared package"

# 3. Update API
git add apps/api/src/providers/
git commit -m "feat: implement new provider in API"

# 4. Update frontend
git add apps/web/src/components/
git commit -m "feat: add provider selection UI"

# 5. Update configuration
git add packages/config/
git commit -m "chore: update config for new provider"

# 6. Update documentation
git add packages/docs/
git commit -m "docs: document new provider setup"

# 7. Update tests
git add apps/api/src/__tests__/
git commit -m "test: add tests for new provider"
```

### 8. Fixing Large Commits (If Needed)

If you accidentally make a large commit:

```bash
# Option 1: Amend if it's the last commit and not pushed
git reset --soft HEAD~1
# Then re-commit in smaller chunks

# Option 2: Interactive rebase (if not pushed)
git rebase -i HEAD~3  # For last 3 commits

# Option 3: Create follow-up commits with better organization
# (Recommended if already pushed)
```

### 9. Commit Verification

Each commit should:

- ✅ Pass all linting checks
- ✅ Pass all tests
- ✅ Build successfully
- ✅ Have a clear, descriptive message
- ✅ Contain related changes only
- ✅ Be atomic (can be reverted safely)

This strategy ensures clean git history and easier code review.
