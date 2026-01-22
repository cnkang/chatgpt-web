#!/usr/bin/env node

/**
 * Workspace Watcher Script
 * Monitors cross-package changes and optimizes hot reload
 */

import { execSync } from 'node:child_process'
import { FSWatcher, existsSync, watch } from 'node:fs'
import { join } from 'node:path'

interface Colors {
  reset: string
  bright: string
  green: string
  yellow: string
  blue: string
  red: string
  cyan: string
}

const colors: Colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
}

function log(message: string, color: string = colors.reset): void {
  const timestamp = new Date().toLocaleTimeString()
  console.log(`${colors.cyan}[${timestamp}]${colors.reset} ${color}${message}${colors.reset}`)
}

function exec(command: string, options: { stdio?: string; encoding?: string } = {}): string | null {
  try {
    return execSync(command, {
      stdio: 'pipe',
      encoding: 'utf8',
      ...options,
    }) as string
  } catch (error) {
    log(`Error executing: ${command}`, colors.red)
    return null
  }
}

interface DependencyMap {
  [key: string]: string[]
}

class WorkspaceWatcher {
  private watchers: Map<string, FSWatcher>
  private debounceTimers: Map<string, NodeJS.Timeout>
  private isBuilding: Set<string>
  private dependencies: DependencyMap

  constructor() {
    this.watchers = new Map()
    this.debounceTimers = new Map()
    this.isBuilding = new Set()

    // Package dependencies mapping
    this.dependencies = {
      'packages/shared': ['apps/web', 'apps/api'],
      'packages/config': ['apps/web', 'apps/api', 'packages/shared'],
    }
  }

  start(): void {
    log('🔍 Starting workspace watcher...', colors.bright)

    // Watch shared package for changes
    this.watchPackage('packages/shared', (event, filename) => {
      if (this.shouldIgnoreFile(filename)) return

      log(`📦 Shared package changed: ${filename}`, colors.yellow)
      this.handleSharedPackageChange()
    })

    // Watch config package for changes
    this.watchPackage('packages/config', (event, filename) => {
      if (this.shouldIgnoreFile(filename)) return

      log(`⚙️ Config package changed: ${filename}`, colors.yellow)
      this.handleConfigPackageChange()
    })

    log('👀 Watching for cross-package changes...', colors.green)
    log('Press Ctrl+C to stop', colors.cyan)
  }

  private watchPackage(
    packagePath: string,
    callback: (event: string, filename: string | null) => void,
  ): void {
    const srcPath = join(packagePath, 'src')

    try {
      // Check if src directory exists before watching
      if (!existsSync(srcPath)) {
        log(`Skipping ${packagePath} - no src directory found`, colors.yellow)
        return
      }

      const watcher = watch(srcPath, { recursive: true }, callback)
      this.watchers.set(packagePath, watcher)
      log(`Watching: ${packagePath}`, colors.blue)
    } catch (error) {
      log(`Failed to watch ${packagePath}: ${(error as Error).message}`, colors.red)
    }
  }

  private shouldIgnoreFile(filename: string | null): boolean {
    if (!filename) return true

    const ignoredExtensions = ['.map', '.tsbuildinfo', '.log']
    const ignoredDirs = ['node_modules', 'dist', 'build', '.git', '.turbo']

    return (
      ignoredExtensions.some(ext => filename.endsWith(ext)) ||
      ignoredDirs.some(dir => filename.includes(dir))
    )
  }

  private debounce(key: string, fn: () => void, delay: number = 1000): void {
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key)!)
    }

    const timer = setTimeout(() => {
      this.debounceTimers.delete(key)
      fn()
    }, delay)

    this.debounceTimers.set(key, timer)
  }

  private async handleSharedPackageChange(): Promise<void> {
    this.debounce('shared-rebuild', async () => {
      if (this.isBuilding.has('shared')) {
        log('Shared package build already in progress, skipping...', colors.yellow)
        return
      }

      this.isBuilding.add('shared')

      try {
        log('🔨 Rebuilding shared package...', colors.blue)
        exec('pnpm --filter @chatgpt-web/shared build')
        log('✅ Shared package rebuilt successfully', colors.green)

        // Notify dependent packages
        this.notifyDependentPackages('packages/shared')
      } catch (error) {
        log('❌ Failed to rebuild shared package', colors.red)
      } finally {
        this.isBuilding.delete('shared')
      }
    })
  }

  private async handleConfigPackageChange(): Promise<void> {
    this.debounce('config-update', async () => {
      log('⚙️ Config package changed, dependent packages may need restart', colors.yellow)
      this.notifyDependentPackages('packages/config')
    })
  }

  private notifyDependentPackages(changedPackage: string): void {
    const dependents = this.dependencies[changedPackage] || []

    dependents.forEach(dependent => {
      log(`📢 Notifying ${dependent} of ${changedPackage} changes`, colors.cyan)
      // Send HMR update signal (this would integrate with dev servers)
    })
  }

  stop(): void {
    log('🛑 Stopping workspace watcher...', colors.yellow)

    // Clear all timers
    this.debounceTimers.forEach(timer => clearTimeout(timer))
    this.debounceTimers.clear()

    // Close all watchers
    this.watchers.forEach(watcher => watcher.close())
    this.watchers.clear()

    log('✅ Workspace watcher stopped', colors.green)
  }
}

// Start the watcher
const watcher = new WorkspaceWatcher()
watcher.start()

// Handle graceful shutdown
process.on('SIGINT', () => {
  watcher.stop()
  process.exit(0)
})

process.on('SIGTERM', () => {
  watcher.stop()
  process.exit(0)
})
