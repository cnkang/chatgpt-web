#!/usr/bin/env node

/**
 * Development Setup Script
 * Optimizes the development environment for efficient workflows
 */

import { execSync, ExecSyncOptions } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'

interface Colors {
  reset: string
  bright: string
  green: string
  yellow: string
  blue: string
  red: string
}

const colors: Colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
}

function log(message: string, color: string = colors.reset): void {
  console.log(`${color}${message}${colors.reset}`)
}

function exec(command: string, options: ExecSyncOptions = {}): string | Buffer {
  try {
    log(`${colors.blue}Running: ${command}${colors.reset}`)
    return execSync(command, {
      stdio: 'inherit',
      encoding: 'utf8',
      ...options,
    })
  } catch (error) {
    log(`${colors.red}Error executing: ${command}${colors.reset}`)
    log(`${colors.red}${(error as Error).message}${colors.reset}`)
    process.exit(1)
  }
}

function execOptional(command: string, options: ExecSyncOptions = {}): boolean {
  try {
    log(`${colors.blue}Running: ${command}${colors.reset}`)
    execSync(command, {
      stdio: 'inherit',
      encoding: 'utf8',
      ...options,
    })
    return true
  } catch (error) {
    log(`${colors.yellow}Command failed (continuing): ${command}${colors.reset}`)
    return false
  }
}

function ensureDirectory(dir: string): void {
  if (!existsSync(dir)) {
    log(`${colors.yellow}Creating directory: ${dir}${colors.reset}`)
    mkdirSync(dir, { recursive: true })
  }
}

async function main(): Promise<void> {
  log(`${colors.bright}🚀 Setting up development environment...${colors.reset}`)

  // Ensure required directories exist
  const dirs: string[] = [
    '.turbo/cache',
    'apps/web/dist',
    'apps/api/build',
    'packages/shared/dist',
    '.vscode',
  ]

  dirs.forEach(ensureDirectory)

  // Clean previous builds and cache
  log(`${colors.yellow}🧹 Cleaning previous builds...${colors.reset}`)
  exec('pnpm clean:cache', { stdio: 'pipe' })

  // Install dependencies with optimizations
  log(`${colors.yellow}📦 Installing dependencies (optimized)...${colors.reset}`)
  exec('pnpm install --frozen-lockfile --prefer-offline')

  // Build shared package first for cross-package dependencies
  log(`${colors.yellow}🔨 Building shared package...${colors.reset}`)
  exec('pnpm --filter @chatgpt-web/shared build')

  // Verify TypeScript configuration (optional - continue on failure)
  log(`${colors.yellow}🔍 Verifying TypeScript configuration...${colors.reset}`)
  if (execOptional('pnpm type-check', { stdio: 'pipe' })) {
    log(`${colors.green}✅ TypeScript validation passed${colors.reset}`)
  } else {
    log(`${colors.yellow}⚠️  TypeScript validation failed - continuing setup${colors.reset}`)
    log(`${colors.yellow}    Run 'pnpm type-check' later to see detailed errors${colors.reset}`)
  }

  // Run linting to ensure code quality (optional - continue on failure)
  log(`${colors.yellow}🔧 Running code quality checks...${colors.reset}`)
  if (execOptional('pnpm lint', { stdio: 'pipe' })) {
    log(`${colors.green}✅ Code quality checks passed${colors.reset}`)
  } else {
    log(`${colors.yellow}⚠️  Code quality checks failed - continuing setup${colors.reset}`)
    log(`${colors.yellow}    Run 'pnpm lint' later to see detailed errors${colors.reset}`)
  }

  log(`${colors.green}✅ Development environment setup complete!${colors.reset}`)
  log(`${colors.green}🎉 Ready to start development!${colors.reset}`)
  log(`${colors.cyan}Next steps:${colors.reset}`)
  log(`${colors.cyan}  • Run 'pnpm dev' to start all services${colors.reset}`)
  log(`${colors.cyan}  • Run 'pnpm dev:web' for frontend only${colors.reset}`)
  log(`${colors.cyan}  • Run 'pnpm dev:api' for backend only${colors.reset}`)
}

main().catch((error: Error) => {
  log(`${colors.red}❌ Setup failed: ${error.message}${colors.reset}`)
  process.exit(1)
})
