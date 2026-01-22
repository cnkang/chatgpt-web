#!/usr/bin/env tsx

/**
 * Migration Orchestrator Script
 *
 * This script orchestrates the complete monorepo migration process:
 * - Runs pre-migration validation
 * - Executes file migration with git history preservation
 * - Updates configuration files
 * - Validates dependency resolution
 * - Runs post-migration validation
 * - Provides rollback capability on failure
 */

import { MonorepoMigrator, type MigrationConfig } from './migrate-to-monorepo.js'
import { PostMigrationValidator } from './post-migration-validation.js'
import { MigrationRollback, type RollbackOptions } from './rollback-migration.js'
import { ConfigurationUpdater } from './update-configurations.js'
import { MigrationValidator } from './validate-migration.js'

interface OrchestrationOptions {
  dryRun: boolean
  skipValidation: boolean
  skipConfigUpdate: boolean
  skipPostValidation: boolean
  autoRollbackOnFailure: boolean
  preserveGitHistory: boolean
  createBackup: boolean
}

interface MigrationStep {
  name: string
  description: string
  execute: () => Promise<void>
  required: boolean
  rollbackOnFailure: boolean
}

class MigrationOrchestrator {
  private options: OrchestrationOptions
  private steps: MigrationStep[] = []
  private completedSteps: string[] = []
  private log: string[] = []

  constructor(options: OrchestrationOptions) {
    this.options = options
    this.setupMigrationSteps()
  }

  async orchestrate(): Promise<void> {
    console.log('🚀 Starting Monorepo Migration Orchestration')
    console.log('===========================================')
    this.printOptions()
    console.log('')

    try {
      for (const step of this.steps) {
        await this.executeStep(step)
      }

      console.log('\n🎉 Migration orchestration completed successfully!')
      this.printSummary()
    } catch (error) {
      console.error('\n💥 Migration orchestration failed:', error)

      if (this.options.autoRollbackOnFailure) {
        await this.performRollback()
      }

      throw error
    }
  }

  private setupMigrationSteps(): void {
    // Step 1: Pre-migration validation
    this.steps.push({
      name: 'pre-validation',
      description: 'Pre-migration validation and safety checks',
      execute: this.runPreValidation.bind(this),
      required: true,
      rollbackOnFailure: false,
    })

    // Step 2: File migration
    this.steps.push({
      name: 'file-migration',
      description: 'Migrate files to monorepo structure',
      execute: this.runFileMigration.bind(this),
      required: true,
      rollbackOnFailure: true,
    })

    // Step 3: Configuration updates
    this.steps.push({
      name: 'config-update',
      description: 'Update configuration files for monorepo',
      execute: this.runConfigurationUpdate.bind(this),
      required: !this.options.skipConfigUpdate,
      rollbackOnFailure: true,
    })

    // Step 4: Migration validation
    this.steps.push({
      name: 'migration-validation',
      description: 'Validate migration structure and dependencies',
      execute: this.runMigrationValidation.bind(this),
      required: !this.options.skipValidation,
      rollbackOnFailure: false,
    })

    // Step 5: Post-migration validation
    this.steps.push({
      name: 'post-validation',
      description: 'Comprehensive post-migration testing',
      execute: this.runPostValidation.bind(this),
      required: !this.options.skipPostValidation,
      rollbackOnFailure: false,
    })
  }

  private async executeStep(step: MigrationStep): Promise<void> {
    if (!step.required) {
      console.log(`⏭️  Skipping: ${step.description}`)
      return
    }

    console.log(`\n🔄 Executing: ${step.description}`)
    console.log('─'.repeat(50))

    const startTime = Date.now()

    try {
      await step.execute()

      const duration = Date.now() - startTime
      this.completedSteps.push(step.name)
      this.log(`✅ Completed: ${step.name} (${duration}ms)`)

      console.log(`✅ Step completed successfully (${duration}ms)`)
    } catch (error) {
      const duration = Date.now() - startTime
      this.log(`❌ Failed: ${step.name} (${duration}ms) - ${error}`)

      console.error(`❌ Step failed (${duration}ms):`, error)

      if (step.rollbackOnFailure && this.options.autoRollbackOnFailure) {
        console.log('🔄 Initiating rollback due to step failure...')
        await this.performRollback()
      }

      throw error
    }
  }

  private async runPreValidation(): Promise<void> {
    console.log('🔍 Running pre-migration validation...')

    // Basic safety checks
    const { execSync } = await import('node:child_process')
    const { existsSync } = await import('node:fs')

    // Check git status
    try {
      const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' })
      if (gitStatus.trim() && !this.options.dryRun) {
        throw new Error('Uncommitted changes detected. Please commit or stash changes.')
      }
    } catch (error) {
      if (!error.toString().includes('not a git repository')) {
        throw error
      }
    }

    // Check required directories exist
    const requiredDirs = ['src', 'service']
    for (const dir of requiredDirs) {
      if (!existsSync(dir)) {
        throw new Error(`Required directory not found: ${dir}`)
      }
    }

    // Check package.json exists
    if (!existsSync('package.json')) {
      throw new Error('package.json not found')
    }

    console.log('✅ Pre-migration validation passed')
  }

  private async runFileMigration(): Promise<void> {
    console.log('📁 Running file migration...')

    const migrationConfig: MigrationConfig = {
      dryRun: this.options.dryRun,
      preserveGitHistory: this.options.preserveGitHistory,
      createBackup: this.options.createBackup,
      validateAfterMigration: false, // We'll do this in a separate step
    }

    const migrator = new MonorepoMigrator(migrationConfig)
    await migrator.migrate()

    console.log('✅ File migration completed')
  }

  private async runConfigurationUpdate(): Promise<void> {
    console.log('⚙️  Running configuration updates...')

    const updater = new ConfigurationUpdater()
    await updater.updateAll()

    console.log('✅ Configuration updates completed')
  }

  private async runMigrationValidation(): Promise<void> {
    console.log('🔍 Running migration validation...')

    const validator = new MigrationValidator()
    const report = await validator.validate()

    if (!report.overall) {
      const failedChecks = Object.entries(report.results)
        .filter(([_, result]) => !result.passed)
        .map(([name, _]) => name)

      throw new Error(`Migration validation failed. Failed checks: ${failedChecks.join(', ')}`)
    }

    console.log('✅ Migration validation passed')
  }

  private async runPostValidation(): Promise<void> {
    console.log('🧪 Running post-migration validation...')

    const validator = new PostMigrationValidator()
    const report = await validator.validate()

    if (!report.passed) {
      const failedTests = report.results.filter(r => !r.passed).map(r => r.name)

      throw new Error(`Post-migration validation failed. Failed tests: ${failedTests.join(', ')}`)
    }

    console.log('✅ Post-migration validation passed')
  }

  private async performRollback(): Promise<void> {
    console.log('\n🔄 Performing automatic rollback...')

    const rollbackOptions: RollbackOptions = {
      useBackup: this.options.createBackup,
      useGit: this.options.preserveGitHistory,
      cleanupArtifacts: true,
      validateRollback: true,
      dryRun: this.options.dryRun,
    }

    try {
      const rollback = new MigrationRollback(rollbackOptions)
      await rollback.rollback()
      console.log('✅ Rollback completed successfully')
    } catch (rollbackError) {
      console.error('💥 Rollback failed:', rollbackError)
      console.error('⚠️  Manual intervention may be required')
    }
  }

  private printOptions(): void {
    console.log('Configuration:')
    console.log(`  Dry run: ${this.options.dryRun}`)
    console.log(`  Skip validation: ${this.options.skipValidation}`)
    console.log(`  Skip config update: ${this.options.skipConfigUpdate}`)
    console.log(`  Skip post validation: ${this.options.skipPostValidation}`)
    console.log(`  Auto rollback on failure: ${this.options.autoRollbackOnFailure}`)
    console.log(`  Preserve git history: ${this.options.preserveGitHistory}`)
    console.log(`  Create backup: ${this.options.createBackup}`)
  }

  private printSummary(): void {
    console.log('\n📋 Migration Summary:')
    console.log(`Steps completed: ${this.completedSteps.length}/${this.steps.length}`)
    console.log(`Completed steps: ${this.completedSteps.join(', ')}`)

    console.log('\n📝 Execution Log:')
    for (const logEntry of this.log) {
      console.log(`   ${logEntry}`)
    }

    console.log('\n🎯 Next Steps:')
    console.log('1. Review the migrated code structure')
    console.log('2. Test the development workflow: pnpm dev')
    console.log('3. Test the build process: pnpm build')
    console.log('4. Update any remaining import paths if needed')
    console.log('5. Update documentation and team workflows')
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString()
    this.log.push(`[${timestamp}] ${message}`)
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2)

  const options: OrchestrationOptions = {
    dryRun: args.includes('--dry-run'),
    skipValidation: args.includes('--skip-validation'),
    skipConfigUpdate: args.includes('--skip-config-update'),
    skipPostValidation: args.includes('--skip-post-validation'),
    autoRollbackOnFailure: !args.includes('--no-auto-rollback'),
    preserveGitHistory: !args.includes('--no-git-history'),
    createBackup: !args.includes('--no-backup'),
  }

  // Show help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Monorepo Migration Orchestrator

Usage: tsx migration-orchestrator.ts [options]

Options:
  --dry-run                 Run without making actual changes
  --skip-validation         Skip migration validation step
  --skip-config-update      Skip configuration update step
  --skip-post-validation    Skip post-migration validation
  --no-auto-rollback        Disable automatic rollback on failure
  --no-git-history          Don't preserve git history during migration
  --no-backup               Don't create backup before migration
  --help, -h                Show this help message

Examples:
  tsx migration-orchestrator.ts --dry-run
  tsx migration-orchestrator.ts --skip-post-validation
  tsx migration-orchestrator.ts --no-backup --no-git-history
`)
    return
  }

  const orchestrator = new MigrationOrchestrator(options)

  try {
    await orchestrator.orchestrate()
    console.log('\n🏁 Migration orchestration completed successfully!')
  } catch (error) {
    console.error('\n💥 Migration orchestration failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main().catch(console.error)
}

export { MigrationOrchestrator, type OrchestrationOptions }
