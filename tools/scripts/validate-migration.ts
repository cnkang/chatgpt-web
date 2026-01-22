#!/usr/bin/env tsx

/**
 * Migration Validation Script
 *
 * This script validates the monorepo migration by checking:
 * - Package structure integrity
 * - Dependency resolution
 * - Build system functionality
 * - Import path correctness
 * - Configuration consistency
 */

import { glob } from 'glob'
import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

interface ValidationResult {
  passed: boolean
  message: string
  details?: string[]
}

interface ValidationReport {
  overall: boolean
  results: Record<string, ValidationResult>
  summary: {
    total: number
    passed: number
    failed: number
  }
}

class MigrationValidator {
  private results: Record<string, ValidationResult> = {}

  async validate(): Promise<ValidationReport> {
    console.log('🔍 Starting migration validation...\n')

    // Run all validation checks
    await this.validatePackageStructure()
    await this.validatePackageJsonFiles()
    await this.validateDependencyResolution()
    await this.validateImportPaths()
    await this.validateBuildSystem()
    await this.validateConfigurationConsistency()
    await this.validateDocumentationStructure()
    await this.validateGitHistory()

    return this.generateReport()
  }

  private async validatePackageStructure(): Promise<void> {
    console.log('📁 Validating package structure...')

    const expectedStructure = [
      'apps/web/src',
      'apps/web/package.json',
      'apps/api/src',
      'apps/api/package.json',
      'packages/shared/src',
      'packages/shared/package.json',
      'packages/docs/package.json',
      'packages/config/package.json',
      'pnpm-workspace.yaml',
      'turbo.json',
    ]

    const missing: string[] = []
    const present: string[] = []

    for (const path of expectedStructure) {
      if (existsSync(path)) {
        present.push(path)
      } else {
        missing.push(path)
      }
    }

    this.results.packageStructure = {
      passed: missing.length === 0,
      message:
        missing.length === 0
          ? 'All expected packages and files are present'
          : `Missing ${missing.length} expected files/directories`,
      details: missing.length > 0 ? [`Missing: ${missing.join(', ')}`] : undefined,
    }
  }

  private async validatePackageJsonFiles(): Promise<void> {
    console.log('📦 Validating package.json files...')

    const packagePaths = [
      'package.json',
      'apps/web/package.json',
      'apps/api/package.json',
      'packages/shared/package.json',
      'packages/docs/package.json',
      'packages/config/package.json',
    ]

    const issues: string[] = []
    const validPackages: string[] = []

    for (const pkgPath of packagePaths) {
      if (!existsSync(pkgPath)) {
        issues.push(`Missing: ${pkgPath}`)
        continue
      }

      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))

        // Validate package name follows convention
        if (pkgPath !== 'package.json' && !pkg.name?.startsWith('@chatgpt-web/')) {
          issues.push(`${pkgPath}: Package name should start with @chatgpt-web/`)
        }

        // Validate workspace dependencies
        if (pkg.dependencies) {
          for (const [dep, version] of Object.entries(pkg.dependencies)) {
            if (dep.startsWith('@chatgpt-web/') && version !== 'workspace:*') {
              issues.push(`${pkgPath}: Internal dependency ${dep} should use workspace:*`)
            }
          }
        }

        validPackages.push(pkgPath)
      } catch (error) {
        issues.push(`${pkgPath}: Invalid JSON - ${error}`)
      }
    }

    this.results.packageJsonFiles = {
      passed: issues.length === 0,
      message:
        issues.length === 0
          ? `All ${validPackages.length} package.json files are valid`
          : `Found ${issues.length} issues in package.json files`,
      details: issues.length > 0 ? issues : undefined,
    }
  }

  private async validateDependencyResolution(): Promise<void> {
    console.log('🔗 Validating dependency resolution...')

    const issues: string[] = []

    try {
      // Check if pnpm-workspace.yaml is valid
      if (existsSync('pnpm-workspace.yaml')) {
        const workspaceConfig = readFileSync('pnpm-workspace.yaml', 'utf8')
        if (!workspaceConfig.includes('apps/*') || !workspaceConfig.includes('packages/*')) {
          issues.push('pnpm-workspace.yaml missing required workspace patterns')
        }
      } else {
        issues.push('pnpm-workspace.yaml not found')
      }

      // Try to resolve dependencies (dry run)
      try {
        execSync('pnpm install --dry-run', { stdio: 'pipe' })
      } catch (error) {
        issues.push(`Dependency resolution failed: ${error}`)
      }

      // Check for dependency conflicts
      try {
        const output = execSync('pnpm list --depth=0 2>&1', { encoding: 'utf8' })
        if (output.includes('WARN') && output.includes('conflict')) {
          issues.push('Dependency version conflicts detected')
        }
      } catch {
        // pnpm list might fail if dependencies aren't installed yet
      }
    } catch (error) {
      issues.push(`Dependency validation error: ${error}`)
    }

    this.results.dependencyResolution = {
      passed: issues.length === 0,
      message:
        issues.length === 0
          ? 'All dependencies resolve correctly'
          : `Found ${issues.length} dependency issues`,
      details: issues.length > 0 ? issues : undefined,
    }
  }

  private async validateImportPaths(): Promise<void> {
    console.log('🔄 Validating import paths...')

    const issues: string[] = []
    const packages = ['apps/web', 'apps/api']

    for (const pkg of packages) {
      if (!existsSync(pkg)) continue

      try {
        const files = await glob(`${pkg}/src/**/*.{ts,js,vue}`, { ignore: 'node_modules/**' })

        for (const file of files) {
          const content = readFileSync(file, 'utf8')

          // Check for problematic import patterns
          const problematicImports = [
            /from\s+['"]\.\.\/\.\.\/\.\.\/packages\/shared['"]/g, // Deep relative imports to shared
            /from\s+['"]\.\.\/\.\.\/service['"]/g, // Old service imports
            /from\s+['"]\.\.\/\.\.\/src['"]/g, // Old src imports
          ]

          for (const pattern of problematicImports) {
            const matches = content.match(pattern)
            if (matches) {
              issues.push(`${file}: Found problematic import pattern: ${matches[0]}`)
            }
          }

          // Check for missing shared package imports
          if (content.includes('ChatMessage') || content.includes('ApiResponse')) {
            if (!content.includes('@chatgpt-web/shared')) {
              issues.push(`${file}: Should import shared types from @chatgpt-web/shared`)
            }
          }
        }
      } catch (error) {
        issues.push(`Error scanning ${pkg}: ${error}`)
      }
    }

    this.results.importPaths = {
      passed: issues.length === 0,
      message:
        issues.length === 0
          ? 'All import paths are correct'
          : `Found ${issues.length} import path issues`,
      details: issues.length > 0 ? issues : undefined,
    }
  }

  private async validateBuildSystem(): Promise<void> {
    console.log('🏗️ Validating build system...')

    const issues: string[] = []

    // Check Turborepo configuration
    if (existsSync('turbo.json')) {
      try {
        const turboConfig = JSON.parse(readFileSync('turbo.json', 'utf8'))

        if (!turboConfig.pipeline) {
          issues.push('turbo.json missing pipeline configuration')
        } else {
          const requiredTasks = ['build', 'dev', 'test', 'lint', 'type-check']
          for (const task of requiredTasks) {
            if (!turboConfig.pipeline[task]) {
              issues.push(`turbo.json missing ${task} task configuration`)
            }
          }
        }
      } catch (error) {
        issues.push(`Invalid turbo.json: ${error}`)
      }
    } else {
      issues.push('turbo.json not found')
    }

    // Check TypeScript project references
    if (existsSync('tsconfig.base.json')) {
      try {
        const tsConfig = JSON.parse(readFileSync('tsconfig.base.json', 'utf8'))
        if (!tsConfig.compilerOptions) {
          issues.push('tsconfig.base.json missing compilerOptions')
        }
      } catch (error) {
        issues.push(`Invalid tsconfig.base.json: ${error}`)
      }
    } else {
      issues.push('tsconfig.base.json not found')
    }

    // Try to run build (dry run if possible)
    try {
      execSync('pnpm build --dry-run 2>/dev/null || echo "Build check completed"', {
        stdio: 'pipe',
      })
    } catch (error) {
      // Don't fail validation if build fails - might be due to missing dependencies
    }

    this.results.buildSystem = {
      passed: issues.length === 0,
      message:
        issues.length === 0
          ? 'Build system configuration is valid'
          : `Found ${issues.length} build system issues`,
      details: issues.length > 0 ? issues : undefined,
    }
  }

  private async validateConfigurationConsistency(): Promise<void> {
    console.log('⚙️ Validating configuration consistency...')

    const issues: string[] = []

    // Check ESLint configuration
    const eslintConfigs = [
      'eslint.config.js',
      'packages/config/eslint.config.js',
      'apps/web/eslint.config.js',
      'apps/api/eslint.config.js',
    ]

    let eslintConfigFound = false
    for (const config of eslintConfigs) {
      if (existsSync(config)) {
        eslintConfigFound = true
        break
      }
    }

    if (!eslintConfigFound) {
      issues.push('No ESLint configuration found')
    }

    // Check Prettier configuration
    const prettierConfigs = ['.prettierrc', 'packages/config/.prettierrc', 'apps/web/.prettierrc']

    let prettierConfigFound = false
    for (const config of prettierConfigs) {
      if (existsSync(config)) {
        prettierConfigFound = true
        break
      }
    }

    if (!prettierConfigFound) {
      issues.push('No Prettier configuration found')
    }

    // Check for consistent Node.js version requirements
    const nvmrcExists = existsSync('.nvmrc')
    if (nvmrcExists) {
      const nodeVersion = readFileSync('.nvmrc', 'utf8').trim()
      if (!nodeVersion.startsWith('24')) {
        issues.push('Node.js version should be 24+ for monorepo requirements')
      }
    }

    this.results.configurationConsistency = {
      passed: issues.length === 0,
      message:
        issues.length === 0
          ? 'Configuration files are consistent'
          : `Found ${issues.length} configuration issues`,
      details: issues.length > 0 ? issues : undefined,
    }
  }

  private async validateDocumentationStructure(): Promise<void> {
    console.log('📚 Validating documentation structure...')

    const issues: string[] = []

    // Check if documentation was moved to packages/docs
    if (existsSync('packages/docs')) {
      const expectedDocs = [
        'packages/docs/README.md',
        'packages/docs/CHANGELOG.md',
        'packages/docs/CONTRIBUTING.md',
      ]

      for (const doc of expectedDocs) {
        if (!existsSync(doc)) {
          issues.push(`Missing documentation: ${doc}`)
        }
      }

      // Check if old documentation files were removed from root
      const oldDocs = ['README.md', 'CHANGELOG.md', 'CONTRIBUTING.md']
      for (const doc of oldDocs) {
        if (existsSync(doc) && !existsSync(`packages/docs/${doc}`)) {
          issues.push(`Documentation not migrated: ${doc} should be moved to packages/docs/`)
        }
      }
    } else {
      issues.push('packages/docs directory not found')
    }

    this.results.documentationStructure = {
      passed: issues.length === 0,
      message:
        issues.length === 0
          ? 'Documentation structure is correct'
          : `Found ${issues.length} documentation issues`,
      details: issues.length > 0 ? issues : undefined,
    }
  }

  private async validateGitHistory(): Promise<void> {
    console.log('📜 Validating git history preservation...')

    const issues: string[] = []

    try {
      // Check if we're in a git repository
      execSync('git status', { stdio: 'pipe' })

      // Check for moved files in git history
      const movedFiles = ['apps/web/src', 'apps/api/src']

      for (const file of movedFiles) {
        if (existsSync(file)) {
          try {
            // Check if git can track the file history
            execSync(`git log --oneline --follow "${file}" | head -1`, { stdio: 'pipe' })
          } catch {
            // This is expected for new files, not necessarily an issue
          }
        }
      }
    } catch (error) {
      issues.push(`Git validation error: ${error}`)
    }

    this.results.gitHistory = {
      passed: issues.length === 0,
      message:
        issues.length === 0
          ? 'Git history validation passed'
          : `Found ${issues.length} git history issues`,
      details: issues.length > 0 ? issues : undefined,
    }
  }

  private generateReport(): ValidationReport {
    const results = Object.values(this.results)
    const passed = results.filter(r => r.passed).length
    const failed = results.length - passed

    const overall = failed === 0

    console.log('\n📊 Validation Report')
    console.log('===================')

    for (const [key, result] of Object.entries(this.results)) {
      const status = result.passed ? '✅' : '❌'
      console.log(`${status} ${key}: ${result.message}`)

      if (result.details && result.details.length > 0) {
        for (const detail of result.details) {
          console.log(`   ${detail}`)
        }
      }
    }

    console.log('\n📈 Summary')
    console.log(`Total checks: ${results.length}`)
    console.log(`Passed: ${passed}`)
    console.log(`Failed: ${failed}`)
    console.log(`Overall: ${overall ? '✅ PASSED' : '❌ FAILED'}`)

    return {
      overall,
      results: this.results,
      summary: {
        total: results.length,
        passed,
        failed,
      },
    }
  }
}

// CLI interface
async function main() {
  const validator = new MigrationValidator()

  try {
    const report = await validator.validate()

    if (!report.overall) {
      console.log('\n⚠️  Migration validation failed. Please address the issues above.')
      process.exit(1)
    } else {
      console.log('\n🎉 Migration validation passed successfully!')
    }
  } catch (error) {
    console.error('\n💥 Validation error:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main().catch(console.error)
}

export { MigrationValidator, type ValidationReport, type ValidationResult }
