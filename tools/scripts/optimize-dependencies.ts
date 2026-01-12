#!/usr/bin/env node

/**
 * Dependency Optimization Script
 *
 * This script automatically optimizes dependencies by:
 * 1. Converting internal dependencies to workspace protocol
 * 2. Moving common dev dependencies to root
 * 3. Removing duplicate dependencies
 * 4. Updating version ranges for consistency
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '../..')

interface Colors {
  red: string
  green: string
  yellow: string
  blue: string
  reset: string
}

// Colors for console output
const colors: Colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
}

function log(color: keyof Colors, message: string): void {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function findPackageJsonFiles(dir: string, files: string[] = []): string[] {
  const items = readdirSync(dir)

  for (const item of items) {
    const fullPath = join(dir, item)
    const stat = statSync(fullPath)

    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      findPackageJsonFiles(fullPath, files)
    } else if (item === 'package.json') {
      files.push(fullPath)
    }
  }

  return files
}

interface PackageJson {
  name?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  [key: string]: any
}

function readPackageJson(filePath: string): PackageJson | null {
  try {
    const content = readFileSync(filePath, 'utf8')
    return JSON.parse(content) as PackageJson
  } catch (error) {
    log('red', `Error reading ${filePath}: ${(error as Error).message}`)
    return null
  }
}

function writePackageJson(filePath: string, pkg: PackageJson): boolean {
  try {
    const content = JSON.stringify(pkg, null, 2) + '\n'
    writeFileSync(filePath, content, 'utf8')
    return true
  } catch (error) {
    log('red', `Error writing ${filePath}: ${(error as Error).message}`)
    return false
  }
}

function optimizeWorkspaceProtocol(): number {
  log('blue', '\n🔧 Optimizing workspace protocol usage...')

  const packageFiles = findPackageJsonFiles(rootDir)
  let changes = 0

  for (const filePath of packageFiles) {
    const pkg = readPackageJson(filePath)
    if (!pkg) continue

    let modified = false
    const relativePath = filePath.replace(rootDir + '/', '')

    // Update dependencies
    const depTypes: (keyof PackageJson)[] = ['dependencies', 'devDependencies', 'peerDependencies']
    for (const depType of depTypes) {
      const deps = pkg[depType] as Record<string, string> | undefined
      if (!deps) continue

      for (const [name, version] of Object.entries(deps)) {
        if (name.startsWith('@chatgpt-web/') && !version.startsWith('workspace:')) {
          deps[name] = 'workspace:*'
          modified = true
          log('green', `  ✅ ${relativePath}: ${name} → workspace:*`)
        }
      }
    }

    if (modified) {
      writePackageJson(filePath, pkg)
      changes++
    }
  }

  log('green', `✅ Optimized workspace protocol in ${changes} packages`)
  return changes
}

function optimizeDependencyHoisting(): number {
  log('blue', '\n🔧 Optimizing dependency hoisting...')

  const packageFiles = findPackageJsonFiles(rootDir)
  const rootPkgPath = join(rootDir, 'package.json')
  const rootPkg = readPackageJson(rootPkgPath)

  if (!rootPkg) {
    log('red', '❌ Could not read root package.json')
    return 0
  }

  // Dependencies that should be hoisted to root
  const shouldBeHoisted = new Set([
    'eslint',
    'prettier',
    'typescript',
    'vitest',
    'npm-run-all',
    'rimraf',
    '@antfu/eslint-config',
  ])

  let changes = 0

  for (const filePath of packageFiles) {
    if (filePath === rootPkgPath) continue

    const pkg = readPackageJson(filePath)
    if (!pkg) continue

    let modified = false
    const relativePath = filePath.replace(rootDir + '/', '')

    if (pkg.devDependencies) {
      const toRemove: string[] = []

      for (const [name, version] of Object.entries(pkg.devDependencies)) {
        if (shouldBeHoisted.has(name) && rootPkg.devDependencies?.[name]) {
          toRemove.push(name)
          log('yellow', `  🔄 ${relativePath}: Removing ${name} (hoisted to root)`)
        }
      }

      for (const name of toRemove) {
        delete pkg.devDependencies[name]
        modified = true
      }

      // Clean up empty devDependencies
      if (Object.keys(pkg.devDependencies).length === 0) {
        delete pkg.devDependencies
      }
    }

    if (modified) {
      writePackageJson(filePath, pkg)
      changes++
    }
  }

  log('green', `✅ Optimized dependency hoisting in ${changes} packages`)
  return changes
}

function normalizeVersionRanges(): number {
  log('blue', '\n🔧 Normalizing version ranges...')

  const packageFiles = findPackageJsonFiles(rootDir)
  let changes = 0

  for (const filePath of packageFiles) {
    const pkg = readPackageJson(filePath)
    if (!pkg) continue

    let modified = false
    const relativePath = filePath.replace(rootDir + '/', '')

    const depTypes: (keyof PackageJson)[] = ['dependencies', 'devDependencies', 'peerDependencies']
    for (const depType of depTypes) {
      const deps = pkg[depType] as Record<string, string> | undefined
      if (!deps) continue

      for (const [name, version] of Object.entries(deps)) {
        if (name.startsWith('@chatgpt-web/')) continue // Skip internal packages

        // Normalize version ranges to use ^ prefix for consistency
        if (version.match(/^\d+\.\d+\.\d+$/)) {
          deps[name] = `^${version}`
          modified = true
          log('green', `  ✅ ${relativePath}: ${name} ${version} → ^${version}`)
        }
      }
    }

    if (modified) {
      writePackageJson(filePath, pkg)
      changes++
    }
  }

  log('green', `✅ Normalized version ranges in ${changes} packages`)
  return changes
}

async function main(): Promise<void> {
  log('blue', '🔧 Starting dependency optimization...')

  const totalChanges = [
    optimizeWorkspaceProtocol(),
    optimizeDependencyHoisting(),
    normalizeVersionRanges(),
  ].reduce((sum, changes) => sum + changes, 0)

  if (totalChanges > 0) {
    log('green', `\n✅ Optimization complete! Made ${totalChanges} changes.`)
    log('yellow', '\nRecommended next steps:')
    log('yellow', '  1. Run: pnpm install')
    log('yellow', '  2. Run: pnpm deps:validate')
    log('yellow', '  3. Test your build: pnpm build')
  } else {
    log('green', '\n✅ No optimizations needed - dependencies are already optimized!')
  }
}

main().catch((error: Error) => {
  log('red', `❌ Optimization failed: ${error.message}`)
  process.exit(1)
})
