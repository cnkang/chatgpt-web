#!/usr/bin/env node

/**
 * Comprehensive cleanup validation script
 *
 * This script validates that the unofficial API cleanup has been completed successfully.
 * It checks for:
 * - No unofficial API code references
 * - No deprecated configuration variables
 * - No security risks from web scraping/browser automation
 * - Proper configuration validation and error handling
 *
 * Usage: npm run validate-cleanup
 */

import * as path from 'node:path'
import { ConfigurationValidator } from '../config/validator'
import { CleanupValidator } from './cleanup-validator'

interface ValidationSummary {
  codebaseClean: boolean
  configurationValid: boolean
  securityRisksRemoved: boolean
  overallSuccess: boolean
  errors: string[]
  warnings: string[]
}

function log(message: string): void {
  process.stdout.write(`${message}\n`)
}

/**
 * Main validation function
 */
async function runCleanupValidation(): Promise<ValidationSummary> {
  log('🔍 Starting comprehensive cleanup validation...\n')

  const errors: string[] = []
  const warnings: string[] = []
  const codebaseResult = await validateCodebaseCleanup(errors, warnings)
  const configurationValid = await validateConfigurationSystem(errors)
  validateMigrationGuidance(errors, warnings)

  const overallSuccess =
    codebaseResult.codebaseClean &&
    configurationValid &&
    codebaseResult.securityRisksRemoved &&
    errors.length === 0

  return {
    codebaseClean: codebaseResult.codebaseClean,
    configurationValid,
    securityRisksRemoved: codebaseResult.securityRisksRemoved,
    overallSuccess,
    errors,
    warnings,
  }
}

function createCleanupValidator() {
  return new CleanupValidator({
    rootPath: path.join(process.cwd()),
    excludePatterns: [
      'node_modules',
      '.git',
      'build',
      'dist',
      '.next',
      'coverage',
      '.nyc_output',
      'logs',
      '*.log',
      '.env.local',
      '.env.*.local',
      '*.test.ts',
      '*.test.js',
      '*.spec.ts',
      '*.spec.js',
      'src/validation',
      'src/config/validator.ts',
      'src/security',
      'MIGRATION.md',
      'package-lock.json',
    ],
  })
}

function addViolationMessages(
  cleanupResult: Awaited<ReturnType<CleanupValidator['validateCleanup']>>,
  errors: string[],
  warnings: string[],
) {
  cleanupResult.violations.forEach(violation => {
    const message = `${violation.file}:${violation.line || '?'} - ${violation.type}: ${violation.content}`
    if (violation.severity === 'error') {
      errors.push(message)
    } else {
      warnings.push(message)
    }
  })
}

async function validateCodebaseCleanup(
  errors: string[],
  warnings: string[],
): Promise<{ codebaseClean: boolean; securityRisksRemoved: boolean }> {
  let codebaseClean = false
  let securityRisksRemoved = false

  try {
    log('📁 Validating codebase cleanup...')
    const validator = createCleanupValidator()
    const cleanupResult = await validator.validateCleanup()

    if (cleanupResult.isClean) {
      log('✅ Codebase is clean of unofficial API references')
      codebaseClean = true
    } else {
      log('❌ Codebase cleanup validation failed')
      log(CleanupValidator.generateReport(cleanupResult))
      addViolationMessages(cleanupResult, errors, warnings)
    }

    log('\n🔧 Validating specific cleanup aspects...')
    const noUnofficialAPI = await validator.validateNoUnofficialAPIReferences()
    const noDeprecatedConfig = await validator.validateNoDeprecatedConfigVars()
    const noSecurityRisks = await validator.validateNoSecurityRisks()

    if (noUnofficialAPI) {
      log('✅ No unofficial API references found')
    } else {
      log('❌ Unofficial API references still exist')
      errors.push('Unofficial API references found in codebase')
    }

    if (noDeprecatedConfig) {
      log('✅ No deprecated configuration variables found')
    } else {
      log('❌ Deprecated configuration variables still exist')
      errors.push('Deprecated configuration variables found in codebase')
    }

    if (noSecurityRisks) {
      log('✅ No security risks from web scraping/browser automation found')
      securityRisksRemoved = true
    } else {
      log('❌ Security risks from web scraping/browser automation still exist')
      errors.push('Security risks from web scraping/browser automation found')
    }
  } catch (error) {
    console.error('❌ Codebase validation failed:', (error as Error).message)
    errors.push(`Codebase validation error: ${(error as Error).message}`)
  }

  return { codebaseClean, securityRisksRemoved }
}

function runDeprecatedVariableCheck(errors: string[]) {
  process.env.OPENAI_ACCESS_TOKEN = 'test-token'
  delete process.env.OPENAI_API_KEY

  let deprecatedDetected = false
  try {
    ConfigurationValidator.validateEnvironment()
  } catch (error) {
    const errorMessage = (error as Error).message
    deprecatedDetected =
      errorMessage.includes('Deprecated Configuration Detected') ||
      errorMessage.includes('deprecated configuration')
  }

  if (deprecatedDetected) {
    log('✅ Configuration validator properly detects deprecated variables')
  } else {
    log('❌ Configuration validator does not detect deprecated variables')
    errors.push('Configuration validator does not properly detect deprecated variables')
  }
}

function runMissingApiKeyCheck(errors: string[]): boolean {
  delete process.env.OPENAI_API_KEY
  delete process.env.OPENAI_ACCESS_TOKEN

  let missingKeyDetected = false
  try {
    ConfigurationValidator.validateEnvironment()
  } catch (error) {
    missingKeyDetected = (error as Error).message.includes('Missing Required Configuration')
  }

  if (missingKeyDetected) {
    log('✅ Configuration validator properly detects missing API key')
    return true
  }

  log('❌ Configuration validator does not detect missing API key')
  errors.push('Configuration validator does not properly detect missing API key')
  return false
}

async function validateConfigurationSystem(errors: string[]): Promise<boolean> {
  log('\n⚙️  Validating configuration validation system...')
  const originalEnv = { ...process.env }

  try {
    runDeprecatedVariableCheck(errors)
    return runMissingApiKeyCheck(errors)
  } catch (error) {
    console.error('❌ Configuration validation test failed:', (error as Error).message)
    errors.push(`Configuration validation test error: ${(error as Error).message}`)
    return false
  } finally {
    process.env = originalEnv
  }
}

function validateMigrationGuidance(errors: string[], warnings: string[]): void {
  log('\n📋 Validating migration guidance...')
  try {
    const migrationInfo = ConfigurationValidator.getMigrationInfo()
    if (migrationInfo.migrationSteps.length > 0) {
      log('✅ Migration guidance system is functional')
      return
    }

    log('⚠️  Migration guidance system may not be providing steps')
    warnings.push('Migration guidance system may not be providing migration steps')
  } catch (error) {
    console.error('❌ Migration guidance test failed:', (error as Error).message)
    errors.push(`Migration guidance test error: ${(error as Error).message}`)
  }
}

/**
 * Print validation summary
 */
function printSummary(summary: ValidationSummary): void {
  log(`\n${'='.repeat(60)}`)
  log('📊 CLEANUP VALIDATION SUMMARY')
  log('='.repeat(60))

  log(`\n🔍 Validation Results:`)
  log(`   Codebase Clean: ${summary.codebaseClean ? '✅' : '❌'}`)
  log(`   Configuration Valid: ${summary.configurationValid ? '✅' : '❌'}`)
  log(`   Security Risks Removed: ${summary.securityRisksRemoved ? '✅' : '❌'}`)

  log(`\n📈 Overall Status: ${summary.overallSuccess ? '✅ SUCCESS' : '❌ FAILED'}`)

  if (summary.errors.length > 0) {
    log(`\n❌ Errors (${summary.errors.length}):`)
    summary.errors.forEach((error, index) => {
      log(`   ${index + 1}. ${error}`)
    })
  }

  if (summary.warnings.length > 0) {
    log(`\n⚠️  Warnings (${summary.warnings.length}):`)
    summary.warnings.forEach((warning, index) => {
      log(`   ${index + 1}. ${warning}`)
    })
  }

  if (summary.overallSuccess) {
    log('\n🎉 Cleanup validation completed successfully!')
    log('   The unofficial API has been completely removed from the codebase.')
    log('   Configuration validation is working properly.')
    log('   Security risks have been eliminated.')
  } else {
    log('\n🚨 Cleanup validation failed!')
    log('   Please address the errors above before considering the cleanup complete.')
  }

  log(`\n${'='.repeat(60)}`)
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  try {
    const summary = await runCleanupValidation()
    printSummary(summary)

    // Exit with appropriate code
    process.exit(summary.overallSuccess ? 0 : 1)
  } catch (error) {
    console.error('💥 Validation script failed:', (error as Error).message)
    console.error((error as Error).stack)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  await main()
}

export { runCleanupValidation, type ValidationSummary }
