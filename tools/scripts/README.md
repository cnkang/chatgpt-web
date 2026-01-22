# Migration and Build Scripts

This directory contains automated scripts for migrating the ChatGPT Web project to a monorepo architecture and managing the development workflow.

## Migration Scripts

### 🚀 Migration Orchestrator (`migration-orchestrator.ts`)

The main script that orchestrates the complete migration process.

```bash
# Full migration with all validations
pnpm migrate:full

# Dry run to see what would happen
pnpm migrate:dry-run

# Custom migration with options
tsx migration-orchestrator.ts --skip-post-validation --no-backup
```

**Options:**

- `--dry-run`: Run without making actual changes
- `--skip-validation`: Skip migration validation step
- `--skip-config-update`: Skip configuration update step
- `--skip-post-validation`: Skip post-migration validation
- `--no-auto-rollback`: Disable automatic rollback on failure
- `--no-git-history`: Don't preserve git history during migration
- `--no-backup`: Don't create backup before migration

### 📁 File Migration (`migrate-to-monorepo.ts`)

Handles the core file migration with git history preservation.

```bash
# Run file migration only
pnpm migrate

# Dry run
tsx migrate-to-monorepo.ts --dry-run

# Migration without git history preservation
tsx migrate-to-monorepo.ts --no-git-history
```

**Features:**

- Preserves git history during file moves
- Creates backup before migration
- Updates package.json files for monorepo structure
- Updates import paths automatically
- Provides rollback capability

### ⚙️ Configuration Updates (`update-configurations.ts`)

Updates all configuration files for monorepo compatibility.

```bash
# Update all configurations
pnpm update-config
```

**Updates:**

- TypeScript configurations with project references
- ESLint and Prettier configurations
- Build tool configurations (Vite, tsup, Turborepo)
- Docker and deployment configurations
- Kiro steering documents
- Serena memory files

### 🔍 Migration Validation (`validate-migration.ts`)

Validates the migration structure and dependencies.

```bash
# Validate migration
pnpm validate
```

**Checks:**

- Package structure integrity
- Package.json file validity
- Dependency resolution
- Import path correctness
- Build system configuration
- Configuration consistency
- Documentation structure
- Git history preservation

### 🧪 Post-Migration Validation (`post-migration-validation.ts`)

Comprehensive testing after migration completion.

```bash
# Run post-migration validation
pnpm validate:post
```

**Tests:**

- Package structure validation
- Dependency installation
- Build processes (shared, API, web packages)
- Turborepo coordinated builds
- Cross-package imports
- Type checking across packages
- Development server startup
- Production build optimization

### 🔄 Rollback (`rollback-migration.ts`)

Provides rollback capability for migration issues.

```bash
# Rollback migration
pnpm rollback

# Rollback with options
tsx rollback-migration.ts --no-git --dry-run
```

**Options:**

- `--no-backup`: Don't use backup for restoration
- `--no-git`: Don't use git for rollback
- `--no-cleanup`: Don't clean up migration artifacts
- `--no-validation`: Skip rollback validation
- `--dry-run`: Show what would be rolled back

## Development Scripts

### 🛠️ Development Setup (`dev-setup.ts`)

Sets up the development environment for the monorepo.

```bash
pnpm dev-setup
```

### 📦 Dependency Management

```bash
# Optimize dependencies
pnpm optimize-deps

# Validate dependencies
pnpm validate-deps

# Watch workspace changes
pnpm watch
```

## Migration Process

### 1. Pre-Migration Preparation

Before running the migration:

1. **Commit all changes**: Ensure your working directory is clean
2. **Create a branch**: `git checkout -b monorepo-migration`
3. **Backup important data**: The script creates backups, but manual backup is recommended
4. **Review the plan**: Run with `--dry-run` first

### 2. Running the Migration

```bash
# Recommended: Full orchestrated migration
pnpm migrate:full

# Alternative: Step-by-step migration
pnpm migrate
pnpm update-config
pnpm validate
pnpm validate:post
```

### 3. Post-Migration Steps

After successful migration:

1. **Install dependencies**: `pnpm install`
2. **Test development workflow**: `pnpm dev`
3. **Test build process**: `pnpm build`
4. **Update team documentation**
5. **Update CI/CD configurations**

### 4. Rollback (if needed)

If migration fails or issues are discovered:

```bash
# Automatic rollback (if orchestrator was used)
# Rollback happens automatically on failure

# Manual rollback
pnpm rollback
```

## Migration Validation

The migration includes comprehensive validation at multiple stages:

### Pre-Migration Validation

- Git repository status
- Required directories exist
- No uncommitted changes (unless dry run)

### Migration Validation

- Package structure integrity
- Package.json file validity
- Dependency resolution
- Import path correctness
- Configuration consistency

### Post-Migration Validation

- Build system functionality
- Cross-package dependencies
- Type checking
- Development workflows
- Production builds

## Troubleshooting

### Common Issues

1. **Git history not preserved**
   - Ensure you're in a git repository
   - Use `--no-git-history` if git mv fails

2. **Dependency resolution fails**
   - Run `pnpm install` after migration
   - Check for version conflicts in package.json files

3. **Build failures**
   - Ensure TypeScript project references are correct
   - Check that shared package builds first

4. **Import path issues**
   - Update remaining import paths manually
   - Use `@chatgpt-web/shared` for shared imports

### Recovery

If migration fails:

1. **Use automatic rollback**: The orchestrator provides automatic rollback
2. **Manual rollback**: Use `pnpm rollback`
3. **Git reset**: `git reset --hard HEAD` (loses uncommitted changes)
4. **Restore from backup**: Copy from `.migration-backup/`

## Script Architecture

### Dependencies

All scripts use:

- **Node.js 24+**: Required for modern features
- **TypeScript**: Type-safe script development
- **tsx**: TypeScript execution
- **glob**: File pattern matching
- **fs-extra**: Enhanced file system operations

### Error Handling

- Comprehensive error handling with detailed messages
- Automatic rollback on critical failures
- Validation at each step
- Detailed logging for debugging

### Extensibility

Scripts are designed to be:

- **Modular**: Each script has a specific responsibility
- **Configurable**: Options for different migration scenarios
- **Testable**: Can be run in dry-run mode
- **Recoverable**: Multiple rollback strategies

## Contributing

When modifying migration scripts:

1. **Test thoroughly**: Use `--dry-run` extensively
2. **Update validation**: Add new validation checks as needed
3. **Document changes**: Update this README
4. **Consider rollback**: Ensure rollback works with your changes

## Requirements Validation

These scripts validate the following requirements:

- **9.1**: File migration with git history preservation ✅
- **9.3**: Dependency resolution validation ✅
- **9.4**: Configuration file updates ✅
- **9.5**: Build process validation ✅
- **9.6**: Test execution validation ✅
- **9.7**: Rollback capability ✅
