#!/usr/bin/env tsx

/**
 * Migration Rollback Script
 *
 * This script provides rollback capability for the monorepo migration:
 * - Restores files from backup
 * - Reverts git changes
 * - Restores original package.json files
 * - Cleans up migration artifacts
 * - Validates rollback completion
 */

import { glob } from 'glob'
import { execSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'

interface RollbackOptions {
  useBackup: boolean
  useGit: boolean
  cleanupArtifacts: boolean
  validateRollback: boolean
  dryRun: boolean
}

interface RollbackAction {
  type: 'restore' | 'remove' | 'git-revert' | 'cleanup'
  source?: string
  target?: string
  description: string
}

class MigrationRollback {
  private options: RollbackOptions
  private backupDir: string
  private log: string[] = []
  private actions: RollbackAction[] = []

  constructor(options: RollbackOptions) {
    this.options = options
    this.backupDir = join(process.cwd(), '.migration-backup')
  }

  async rollback(): Promise<void> {
    console.log('🔄 Starting migration rollback...\n')

    try {
      await this.validateRollbackPreconditions()
      await this.planRollbackActions()
      await this.executeRollbackActions()

      if (this.options.validateRollback) {
        await this.validateRollbackCompletion()
      }

      console.log('\n✅ Migration rollback completed successfully!')
      this.printSummary()
    } catch (error) {
      console.error('\n❌ Rollback failed:', error)
      throw error
    }
  }

  private async validateRollbackPreconditions(): Promise<void> {
    this.log('Validating rollback preconditions...')

    // Check if we're in a git repository
    try {
      execSync('git status', { stdio: 'pipe' })
    } catch {
      if (this.options.useGit) {
        throw new Error('Not a git repository, cannot use git-based rollback')
      }
    }

    // Check if backup exists
    if (this.options.useBackup && !existsSync(this.backupDir)) {
      throw new Error(`Backup directory not found: ${this.backupDir}`)
    }

    // Check for uncommitted changes
    if (this.options.useGit) {
      try {
        const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' })
        if (gitStatus.trim()) {
          console.warn('⚠️  Uncommitted changes detected. These will be lost during rollback.')
          // In a real scenario, you might want to prompt the user here
        }
      } catch {
        // Git status failed, continue anyway
      }
    }

    this.log('Precondition validation passed')
  }

  private async planRollbackActions(): Promise<void> {
    this.log('Planning rollback actions...')

    // Plan backup restoration actions
    if (this.options.useBackup) {
      await this.planBackupRestoration()
    }

    // Plan git revert actions
    if (this.options.useGit) {
      await this.planGitRevert()
    }

    // Plan cleanup actions
    if (this.options.cleanupArtifacts) {
      await this.planCleanupActions()
    }

    this.log(`Planned ${this.actions.length} rollback actions`)
  }

  private async planBackupRestoration(): Promise<void> {
    if (!existsSync(this.backupDir)) {
      return
    }

    // Find all files in backup
    const backupFiles = await glob('**/*', {
      cwd: this.backupDir,
      nodir: true,
    })

    for (const file of backupFiles) {
      const backupPath = join(this.backupDir, file)
      const targetPath = file

      this.actions.push({
        type: 'restore',
        source: backupPath,
        target: targetPath,
        description: `Restore ${file} from backup`,
      })
    }
  }

  private async planGitRevert(): Promise<void> {
    try {
      // Get list of files that were moved/added during migration
      const gitLog = execSync('git log --oneline --name-status -10', { encoding: 'utf8' })

      // Look for migration-related commits
      const migrationCommits = gitLog
        .split('\n')
        .filter(
          line =>
            line.includes('migration') ||
            line.includes('monorepo') ||
            line.includes('move') ||
            line.includes('migrate'),
        )

      if (migrationCommits.length > 0) {
        this.actions.push({
          type: 'git-revert',
          description: 'Revert migration commits using git',
        })
      }
    } catch (error) {
      this.log(`Git revert planning failed: ${error}`)
    }
  }

  private async planCleanupActions(): Promise<void> {
    // Directories to remove (created during migration)
    const dirsToRemove = [
      'apps/web',
      'apps/api',
      'packages/shared',
      'packages/docs',
      'packages/config',
    ]

    for (const dir of dirsToRemove) {
      if (existsSync(dir)) {
        this.actions.push({
          type: 'remove',
          target: dir,
          description: `Remove migrated directory: ${dir}`,
        })
      }
    }

    // Files to remove (created during migration)
    const filesToRemove = [
      '.migration-backup',
      'apps',
      'packages/shared/tsup.config.ts',
      'packages/config/eslint.config.js',
    ]

    for (const file of filesToRemove) {
      if (existsSync(file)) {
        this.actions.push({
          type: 'remove',
          target: file,
          description: `Remove migration artifact: ${file}`,
        })
      }
    }
  }

  private async executeRollbackActions(): Promise<void> {
    this.log('Executing rollback actions...')

    for (const action of this.actions) {
      await this.executeAction(action)
    }
  }

  private async executeAction(action: RollbackAction): Promise<void> {
    console.log(`📝 ${action.description}`)

    if (this.options.dryRun) {
      this.log(`[DRY RUN] Would execute: ${action.description}`)
      return
    }

    try {
      switch (action.type) {
        case 'restore':
          await this.restoreFile(action.source!, action.target!)
          break

        case 'remove':
          await this.removeFileOrDir(action.target!)
          break

        case 'git-revert':
          await this.gitRevert()
          break

        case 'cleanup':
          await this.cleanup(action.target!)
          break
      }

      this.log(`✅ Completed: ${action.description}`)
    } catch (error) {
      this.log(`❌ Failed: ${action.description} - ${error}`)
      throw error
    }
  }

  private async restoreFile(source: string, target: string): Promise<void> {
    if (!existsSync(source)) {
      throw new Error(`Backup file not found: ${source}`)
    }

    // Ensure target directory exists
    mkdirSync(dirname(target), { recursive: true })

    // Copy file from backup
    copyFileSync(source, target)
  }

  private async removeFileOrDir(target: string): Promise<void> {
    if (existsSync(target)) {
      rmSync(target, { recursive: true, force: true })
    }
  }

  private async gitRevert(): Promise<void> {
    try {
      // Reset to state before migration
      // This is a simplified approach - in practice you might want to be more selective
      execSync('git reset --hard HEAD~5', { stdio: 'pipe' })
      this.log('Git reset completed')
    } catch (error) {
      throw new Error(`Git revert failed: ${error}`)
    }
  }

  private async cleanup(target: string): Promise<void> {
    // Custom cleanup logic for specific files/directories
    if (existsSync(target)) {
      rmSync(target, { recursive: true, force: true })
    }
  }

  private async validateRollbackCompletion(): Promise<void> {
    this.log('Validating rollback completion...')

    const issues: string[] = []

    // Check that original structure is restored
    const originalFiles = ['src/', 'service/', 'package.json']

    for (const file of originalFiles) {
      if (!existsSync(file)) {
        issues.push(`Original file/directory not restored: ${file}`)
      }
    }

    // Check that migration artifacts are removed
    const migrationArtifacts = [
      'apps/web',
      'apps/api',
      'packages/shared',
      'packages/docs',
      'packages/config',
    ]

    for (const artifact of migrationArtifacts) {
      if (existsSync(artifact)) {
        issues.push(`Migration artifact not removed: ${artifact}`)
      }
    }

    // Validate package.json is restored
    if (existsSync('package.json')) {
      try {
        const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
        if (pkg.name === '@chatgpt-web/root') {
          issues.push('Root package.json still has monorepo configuration')
        }
      } catch {
        issues.push('package.json is invalid after rollback')
      }
    }

    if (issues.length > 0) {
      throw new Error(`Rollback validation failed:\n${issues.join('\n')}`)
    }

    this.log('Rollback validation passed')
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] ${message}`
    console.log(logMessage)
    this.log.push(logMessage)
  }

  private printSummary(): void {
    console.log('\n📋 Rollback Summary:')
    console.log(`Actions executed: ${this.actions.length}`)
    console.log(`Backup used: ${this.options.useBackup}`)
    console.log(`Git revert used: ${this.options.useGit}`)
    console.log(`Artifacts cleaned: ${this.options.cleanupArtifacts}`)

    console.log('\n📝 Rollback Log:')
    for (const logEntry of this.log) {
      console.log(`   ${logEntry}`)
    }
  }

  public getRollbackLog(): string[] {
    return this.log
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2)

  const options: RollbackOptions = {
    useBackup: !args.includes('--no-backup'),
    useGit: !args.includes('--no-git'),
    cleanupArtifacts: !args.includes('--no-cleanup'),
    validateRollback: !args.includes('--no-validation'),
    dryRun: args.includes('--dry-run'),
  }

  console.log('Migration Rollback Script')
  console.log('========================')
  console.log(`Use backup: ${options.useBackup}`)
  console.log(`Use git: ${options.useGit}`)
  console.log(`Cleanup artifacts: ${options.cleanupArtifacts}`)
  console.log(`Validate rollback: ${options.validateRollback}`)
  console.log(`Dry run: ${options.dryRun}`)
  console.log('')

  // Confirmation prompt (in a real scenario)
  if (!options.dryRun) {
    console.log('⚠️  WARNING: This will revert the monorepo migration!')
    console.log('⚠️  All migration changes will be lost!')
    console.log('⚠️  Make sure you have committed any important changes.')
    console.log('')

    // In a real implementation, you'd want to add a confirmation prompt here
    // For now, we'll proceed with the rollback
  }

  const rollback = new MigrationRollback(options)

  try {
    await rollback.rollback()
  } catch (error) {
    console.error('\n💥 Rollback failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main().catch(console.error)
}

export { MigrationRollback, type RollbackOptions }
