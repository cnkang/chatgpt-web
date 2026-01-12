#!/usr/bin/env node

/**
 * Dependency Management Validation Script
 *
 * This script validates that:
 * 1. Workspace dependencies use workspace protocol
 * 2. No duplicate dependencies across packages
 * 3. Shared dev dependencies are hoisted to root
 * 4. Version conflicts are resolved
 */

import { readFileSync, readdirSync, statSync } from 'fs'
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

function validateWorkspaceProtocol(): boolean {
  log('blue', '\n🔍 Validating workspace protocol usage...')

  const packageFiles = findPackageJsonFiles(rootDir)
  const issues: string[] = []

  for (const filePath of packageFiles) {
    const pkg = readPackageJson(filePath)
    if (!pkg) continue

    const relativePath = filePath.replace(rootDir + '/', '')

    // Check dependencies for internal packages
    const allDeps: Record<string, string> = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
      ...pkg.peerDependencies,
    }

    for (const [name, version] of Object.entries(allDeps)) {
      if (name.startsWith('@chatgpt-web/')) {
        if (!version.startsWith('workspace:')) {
          issues.push(`${relativePath}: ${name} should use workspace protocol, found: ${version}`)
        }
      }
    }
  }

  if (issues.length === 0) {
    log('green', '✅ All internal dependencies use workspace protocol')
  } else {
    log('red', '❌ Workspace protocol issues found:')
    issues.forEach(issue => log('red', `  - ${issue}`))
  }

  return issues.length === 0
}

function validateDependencyHoisting(): boolean {
  log('blue', '\n🔍 Validating dependency hoisting...')

  const packageFiles = findPackageJsonFiles(rootDir)
  const rootPkg = readPackageJson(join(rootDir, 'package.json'))

  if (!rootPkg) {
    log('red', '❌ Could not read root package.json')
    return false
  }

  const rootDevDeps = new Set(Object.keys(rootPkg.devDependencies || {}))
  const issues: string[] = []

  // Common dev dependencies that should be hoisted
  const shouldBeHoisted = ['eslint', 'prettier', 'typescript', 'vitest', 'npm-run-all', 'rimraf']

  for (const filePath of packageFiles) {
    if (filePath === join(rootDir, 'package.json')) continue

    const pkg = readPackageJson(filePath)
    if (!pkg) continue

    const relativePath = filePath.replace(rootDir + '/', '')
    const devDeps = Object.keys(pkg.devDependencies || {})

    for (const dep of devDeps) {
      if (shouldBeHoisted.includes(dep) && rootDevDeps.has(dep)) {
        issues.push(`${relativePath}: ${dep} should be hoisted to root`)
      }
    }
  }

  if (issues.length === 0) {
    log('green', '✅ Dependencies properly hoisted')
  } else {
    log('yellow', '⚠️  Dependency hoisting recommendations:')
    issues.forEach(issue => log('yellow', `  - ${issue}`))
  }

  return issues.length === 0
}

function validateVersionConsistency(): boolean {
  log('blue', '\n🔍 Validating version consistency...')

  const packageFiles = findPackageJsonFiles(rootDir)
  const dependencyVersions = new Map<string, Map<string, string[]>>()
  const issues: string[] = []

  for (const filePath of packageFiles) {
    const pkg = readPackageJson(filePath)
    if (!pkg) continue

    const relativePath = filePath.replace(rootDir + '/', '')
    const allDeps: Record<string, string> = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
      ...pkg.peerDependencies,
    }

    for (const [name, version] of Object.entries(allDeps)) {
      if (name.startsWith('@chatgpt-web/')) continue // Skip internal packages

      if (!dependencyVersions.has(name)) {
        dependencyVersions.set(name, new Map())
      }

      const versionMap = dependencyVersions.get(name)!
      if (!versionMap.has(version)) {
        versionMap.set(version, [])
      }
      versionMap.get(version)!.push(relativePath)
    }
  }

  for (const [name, versionMap] of dependencyVersions) {
    // Allow certain version conflicts that are documented as acceptable
    const allowedConflicts = new Set([
      '@types/node', // Different Node.js version requirements between packages
    ])

    if (versionMap.size > 1 && !allowedConflicts.has(name)) {
      issues.push(`${name} has multiple versions:`)
      for (const [version, files] of versionMap) {
        issues.push(`  - ${version}: ${files.join(', ')}`)
      }
    }
  }

  if (issues.length === 0) {
    log('green', '✅ No version conflicts detected')
  } else {
    log('yellow', '⚠️  Version conflicts detected:')
    issues.forEach(issue => log('yellow', `  ${issue}`))
  }

  return issues.length === 0
}

async function main(): Promise<void> {
  log('blue', '🔍 Starting dependency validation...')

  const results = [
    validateWorkspaceProtocol(),
    validateDependencyHoisting(),
    validateVersionConsistency(),
  ]

  const allValid = results.every(result => result)

  if (allValid) {
    log('green', '\n✅ All dependency validations passed!')
    process.exit(0)
  } else {
    log('red', '\n❌ Some dependency validations failed!')
    log('yellow', '\nRun the optimization script to fix issues:')
    log('yellow', '  pnpm deps:optimize')
    process.exit(1)
  }
}

main().catch((error: Error) => {
  log('red', `❌ Validation failed: ${error.message}`)
  process.exit(1)
})
