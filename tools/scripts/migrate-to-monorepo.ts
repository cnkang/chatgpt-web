#!/usr/bin/env tsx

/**
 * Monorepo Migration Script
 * 
 * This script automates the migration of the ChatGPT Web project from its current
 * structure to a modern monorepo architecture using PNPM workspaces.
 * 
 * Features:
 * - Preserves git history during file moves
 * - Updates import paths automatically
 * - Validates dependency resolution
 * - Provides rollback capability
 * - Comprehensive validation
 */

import { glob } from 'glob'
import { execSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

interface MigrationConfig {
  dryRun: boolean
  preserveGitHistory: boolean
  createBackup: boolean
  validateAfterMigration: boolean
}

interface FileMapping {
  source: string
  destination: string
  type: 'move' | 'copy' | 'update'
}

interface PackageConfig {
  name: string
  path: string
  dependencies: string[]
  devDependencies: string[]
}

class MonorepoMigrator {
  private config: MigrationConfig
  private backupDir: string
  private migrationLog: string[]
  private rollbackActions: Array<() => void>

  constructor(config: MigrationConfig) {
    this.config = config
    this.backupDir = join(process.cwd(), '.migration-backup')
    this.migrationLog = []
    this.rollbackActions = []
  }

  async migrate(): Promise<void> {
    try {
      this.log('Starting monorepo migration...')
      
      if (this.config.createBackup) {
        await this.createBackup()
      }

      await this.validatePreMigration()
      await this.createPackageStructure()
      await this.migrateFiles()
      await this.updateImportPaths()
      await this.updateConfigurationFiles()
      
      if (this.config.validateAfterMigration) {
        await this.validatePostMigration()
      }

      this.log('Migration completed successfully!')
      
    } catch (error) {
      this.log(`Migration failed: ${error}`)
      if (this.config.createBackup) {
        await this.rollback()
      }
      throw error
    }
  }

  private async createBackup(): Promise<void> {
    this.log('Creating backup...')
    
    if (existsSync(this.backupDir)) {
      rmSync(this.backupDir, { recursive: true, force: true })
    }
    
    mkdirSync(this.backupDir, { recursive: true })
    
    // Backup critical files and directories
    const backupItems = [
      'package.json',
      'src/',
      'service/',
      'docs/',
      '.kiro/',
      '.serena/',
      'pnpm-workspace.yaml',
      'turbo.json',
      'tsconfig.json',
      'tsconfig.base.json'
    ]

    for (const item of backupItems) {
      if (existsSync(item)) {
        const backupPath = join(this.backupDir, item)
        mkdirSync(dirname(backupPath), { recursive: true })
        
        if (item.endsWith('/')) {
          execSync(`cp -r "${item}" "${backupPath}"`)
        } else {
          copyFileSync(item, backupPath)
        }
      }
    }

    this.log('Backup created successfully')
  }

  private async validatePreMigration(): Promise<void> {
    this.log('Validating pre-migration state...')

    // Check if required directories exist
    const requiredDirs = ['src', 'service']
    for (const dir of requiredDirs) {
      if (!existsSync(dir)) {
        throw new Error(`Required directory ${dir} not found`)
      }
    }

    // Check if package.json exists
    if (!existsSync('package.json')) {
      throw new Error('package.json not found')
    }

    // Validate git repository
    try {
      execSync('git status', { stdio: 'pipe' })
    } catch {
      throw new Error('Not a git repository or git not available')
    }

    // Check for uncommitted changes
    const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' })
    if (gitStatus.trim() && !this.config.dryRun) {
      throw new Error('Uncommitted changes detected. Please commit or stash changes before migration.')
    }

    this.log('Pre-migration validation passed')
  }

  private async createPackageStructure(): Promise<void> {
    this.log('Creating package structure...')

    const packages = [
      'apps/web',
      'apps/api', 
      'packages/shared',
      'packages/docs',
      'packages/config'
    ]

    for (const pkg of packages) {
      if (!this.config.dryRun) {
        mkdirSync(pkg, { recursive: true })
        mkdirSync(join(pkg, 'src'), { recursive: true })
      }
      this.log(`Created package directory: ${pkg}`)
    }
  }

  private async migrateFiles(): Promise<void> {
    this.log('Migrating files...')

    const fileMappings: FileMapping[] = [
      // Frontend files (src/ -> apps/web/)
      { source: 'src', destination: 'apps/web/src', type: 'move' },
      { source: 'package.json', destination: 'apps/web/package.json', type: 'update' },
      { source: 'vite.config.ts', destination: 'apps/web/vite.config.ts', type: 'move' },
      { source: 'tsconfig.json', destination: 'apps/web/tsconfig.json', type: 'update' },
      { source: 'tailwind.config.js', destination: 'apps/web/tailwind.config.js', type: 'move' },
      { source: 'postcss.config.js', destination: 'apps/web/postcss.config.js', type: 'move' },
      { source: 'index.html', destination: 'apps/web/index.html', type: 'move' },

      // Backend files (service/ -> apps/api/)
      { source: 'service/src', destination: 'apps/api/src', type: 'move' },
      { source: 'service/package.json', destination: 'apps/api/package.json', type: 'update' },
      { source: 'service/tsconfig.json', destination: 'apps/api/tsconfig.json', type: 'update' },
      { source: 'service/tsup.config.ts', destination: 'apps/api/tsup.config.ts', type: 'move' },
      { source: 'service/vitest.config.ts', destination: 'apps/api/vitest.config.ts', type: 'move' },
      { source: 'service/.env.example', destination: 'apps/api/.env.example', type: 'move' },

      // Documentation files
      { source: 'docs', destination: 'packages/docs', type: 'move' },
      { source: 'README.md', destination: 'packages/docs/README.md', type: 'move' },
      { source: 'README.zh.md', destination: 'packages/docs/README.zh.md', type: 'move' },
      { source: 'CHANGELOG.md', destination: 'packages/docs/CHANGELOG.md', type: 'move' },
      { source: 'CONTRIBUTING.md', destination: 'packages/docs/CONTRIBUTING.md', type: 'move' },
      { source: 'CONTRIBUTING.en.md', destination: 'packages/docs/CONTRIBUTING.en.md', type: 'move' },

      // Configuration files
      { source: 'eslint.config.js', destination: 'packages/config/eslint.config.js', type: 'move' },
      { source: '.prettierrc', destination: 'packages/config/.prettierrc', type: 'move' },
      { source: '.prettierignore', destination: 'packages/config/.prettierignore', type: 'move' }
    ]

    for (const mapping of fileMappings) {
      await this.migrateFile(mapping)
    }
  }

  private async migrateFile(mapping: FileMapping): Promise<void> {
    const { source, destination, type } = mapping

    if (!existsSync(source)) {
      this.log(`Skipping ${source} - file not found`)
      return
    }

    this.log(`${type}: ${source} -> ${destination}`)

    if (this.config.dryRun) {
      return
    }

    // Ensure destination directory exists
    mkdirSync(dirname(destination), { recursive: true })

    if (type === 'move') {
      if (this.config.preserveGitHistory) {
        try {
          execSync(`git mv "${source}" "${destination}"`, { stdio: 'pipe' })
        } catch {
          // Fallback to regular move if git mv fails
          execSync(`mv "${source}" "${destination}"`)
        }
      } else {
        execSync(`mv "${source}" "${destination}"`)
      }
      
      this.rollbackActions.push(() => {
        if (existsSync(destination)) {
          execSync(`mv "${destination}" "${source}"`)
        }
      })
    } else if (type === 'copy') {
      execSync(`cp -r "${source}" "${destination}"`)
      
      this.rollbackActions.push(() => {
        if (existsSync(destination)) {
          rmSync(destination, { recursive: true, force: true })
        }
      })
    } else if (type === 'update') {
      await this.updatePackageJson(source, destination)
    }
  }

  private async updatePackageJson(source: string, destination: string): Promise<void> {
    const packageJson = JSON.parse(readFileSync(source, 'utf8'))
    
    // Update package.json based on destination
    if (destination.includes('apps/web')) {
      packageJson.name = '@chatgpt-web/web'
      packageJson.dependencies = packageJson.dependencies || {}
      packageJson.dependencies['@chatgpt-web/shared'] = 'workspace:*'
    } else if (destination.includes('apps/api')) {
      packageJson.name = '@chatgpt-web/api'
      packageJson.dependencies = packageJson.dependencies || {}
      packageJson.dependencies['@chatgpt-web/shared'] = 'workspace:*'
    }

    writeFileSync(destination, JSON.stringify(packageJson, null, 2))
  }

  private async updateImportPaths(): Promise<void> {
    this.log('Updating import paths...')

    const packages = ['apps/web', 'apps/api']
    
    for (const pkg of packages) {
      const files = await glob(`${pkg}/src/**/*.{ts,js,vue}`, { ignore: 'node_modules/**' })
      
      for (const file of files) {
        await this.updateFileImports(file)
      }
    }
  }

  private async updateFileImports(filePath: string): Promise<void> {
    if (!existsSync(filePath)) return

    let content = readFileSync(filePath, 'utf8')
    let updated = false

    // Update relative imports that now need to reference shared package
    const sharedImportRegex = /from\s+['"](\.\.[\/\\])+([^'"]*)['"]/g
    content = content.replace(sharedImportRegex, (match, dots, path) => {
      // Check if this should be a shared package import
      if (path.includes('types') || path.includes('utils') || path.includes('validation')) {
        updated = true
        return match.replace(/from\s+['"](\.\.[\/\\])+([^'"]*)['"]/g, `from '@chatgpt-web/shared'`)
      }
      return match
    })

    if (updated && !this.config.dryRun) {
      writeFileSync(filePath, content)
      this.log(`Updated imports in: ${filePath}`)
    }
  }

  private async updateConfigurationFiles(): Promise<void> {
    this.log('Updating configuration files...')

    // Update root package.json for monorepo
    await this.updateRootPackageJson()
    
    // Create shared package.json files
    await this.createSharedPackageJson()
    await this.createDocsPackageJson()
    await this.createConfigPackageJson()
  }

  private async updateRootPackageJson(): Promise<void> {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
    
    packageJson.name = '@chatgpt-web/root'
    packageJson.private = true
    packageJson.workspaces = ['apps/*', 'packages/*', 'tools/*']
    
    // Update scripts for monorepo
    packageJson.scripts = {
      ...packageJson.scripts,
      'dev': 'turbo run dev --parallel',
      'build': 'turbo run build',
      'test': 'turbo run test',
      'lint': 'turbo run lint',
      'type-check': 'turbo run type-check',
      'clean': 'turbo run clean && rm -rf node_modules */node_modules',
      'migrate': 'tsx tools/scripts/migrate-to-monorepo.ts',
      'validate': 'tsx tools/scripts/validate-migration.ts'
    }

    if (!this.config.dryRun) {
      writeFileSync('package.json', JSON.stringify(packageJson, null, 2))
    }
  }

  private async createSharedPackageJson(): Promise<void> {
    const packageJson = {
      name: '@chatgpt-web/shared',
      version: '1.0.0',
      description: 'Shared utilities and types for ChatGPT Web',
      main: 'dist/index.js',
      types: 'dist/index.d.ts',
      scripts: {
        build: 'tsup',
        dev: 'tsup --watch',
        test: 'vitest --run',
        'test:watch': 'vitest',
        'type-check': 'tsc --noEmit'
      },
      dependencies: {
        zod: '^3.22.4'
      },
      devDependencies: {
        '@types/node': '^20.10.0',
        tsup: '^8.0.0',
        typescript: '^5.3.0',
        vitest: '^1.0.0'
      },
      exports: {
        '.': {
          import: './dist/index.js',
          require: './dist/index.cjs',
          types: './dist/index.d.ts'
        }
      }
    }

    if (!this.config.dryRun) {
      writeFileSync('packages/shared/package.json', JSON.stringify(packageJson, null, 2))
    }
  }

  private async createDocsPackageJson(): Promise<void> {
    const packageJson = {
      name: '@chatgpt-web/docs',
      version: '1.0.0',
      description: 'Documentation for ChatGPT Web monorepo',
      private: true
    }

    if (!this.config.dryRun) {
      writeFileSync('packages/docs/package.json', JSON.stringify(packageJson, null, 2))
    }
  }

  private async createConfigPackageJson(): Promise<void> {
    const packageJson = {
      name: '@chatgpt-web/config',
      version: '1.0.0',
      description: 'Shared configuration files for ChatGPT Web',
      private: true,
      exports: {
        './eslint': './eslint.config.js',
        './prettier': './.prettierrc',
        './tsconfig': './tsconfig.base.json'
      }
    }

    if (!this.config.dryRun) {
      writeFileSync('packages/config/package.json', JSON.stringify(packageJson, null, 2))
    }
  }

  private async validatePostMigration(): Promise<void> {
    this.log('Validating post-migration state...')

    // Check if all expected packages exist
    const expectedPackages = [
      'apps/web/package.json',
      'apps/api/package.json',
      'packages/shared/package.json',
      'packages/docs/package.json',
      'packages/config/package.json'
    ]

    for (const pkg of expectedPackages) {
      if (!existsSync(pkg)) {
        throw new Error(`Expected package file not found: ${pkg}`)
      }
    }

    // Validate package.json files
    for (const pkg of expectedPackages) {
      try {
        JSON.parse(readFileSync(pkg, 'utf8'))
      } catch {
        throw new Error(`Invalid JSON in package file: ${pkg}`)
      }
    }

    // Try to install dependencies
    if (!this.config.dryRun) {
      try {
        execSync('pnpm install', { stdio: 'pipe' })
        this.log('Dependencies installed successfully')
      } catch (error) {
        throw new Error(`Dependency installation failed: ${error}`)
      }
    }

    this.log('Post-migration validation passed')
  }

  private async rollback(): Promise<void> {
    this.log('Rolling back migration...')

    // Execute rollback actions in reverse order
    for (let i = this.rollbackActions.length - 1; i >= 0; i--) {
      try {
        this.rollbackActions[i]()
      } catch (error) {
        this.log(`Rollback action failed: ${error}`)
      }
    }

    // Restore from backup if available
    if (existsSync(this.backupDir)) {
      try {
        execSync(`cp -r ${this.backupDir}/* .`)
        this.log('Restored from backup')
      } catch (error) {
        this.log(`Backup restoration failed: ${error}`)
      }
    }

    this.log('Rollback completed')
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] ${message}`
    console.log(logMessage)
    this.migrationLog.push(logMessage)
  }

  public getMigrationLog(): string[] {
    return this.migrationLog
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2)
  
  const config: MigrationConfig = {
    dryRun: args.includes('--dry-run'),
    preserveGitHistory: !args.includes('--no-git-history'),
    createBackup: !args.includes('--no-backup'),
    validateAfterMigration: !args.includes('--no-validation')
  }

  console.log('Monorepo Migration Script')
  console.log('========================')
  console.log(`Dry run: ${config.dryRun}`)
  console.log(`Preserve git history: ${config.preserveGitHistory}`)
  console.log(`Create backup: ${config.createBackup}`)
  console.log(`Validate after migration: ${config.validateAfterMigration}`)
  console.log('')

  const migrator = new MonorepoMigrator(config)
  
  try {
    await migrator.migrate()
    console.log('\n✅ Migration completed successfully!')
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main().catch(console.error)
}

export { MonorepoMigrator, type MigrationConfig }
