/**
 * Validate Performance Testing Setup
 *
 * This script checks if the environment is ready for performance testing.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

interface ValidationResult {
  passed: boolean
  message: string
  details?: string
}

function checkNodeVersion(): ValidationResult {
  const version = process.version
  const major = Number.parseInt(version.slice(1).split('.')[0], 10)

  if (major >= 24) {
    return {
      passed: true,
      message: `✓ Node.js version: ${version}`,
    }
  }

  return {
    passed: false,
    message: `✗ Node.js version: ${version}`,
    details: 'Node.js 24.0.0 or higher is required',
  }
}

function checkEnvFile(): ValidationResult {
  const envPath = path.join(process.cwd(), '.env')

  if (!fs.existsSync(envPath)) {
    return {
      passed: false,
      message: '✗ .env file not found',
      details: 'Copy src/test/performance/.env.test.example to .env',
    }
  }

  const envContent = fs.readFileSync(envPath, 'utf-8')

  if (!envContent.includes('OPENAI_API_KEY=') || envContent.includes('OPENAI_API_KEY=\n')) {
    return {
      passed: false,
      message: '✗ OPENAI_API_KEY not set in .env',
      details: 'Set a valid OpenAI API key in .env file',
    }
  }

  return {
    passed: true,
    message: '✓ .env file configured',
  }
}

function checkResultsDirectory(): ValidationResult {
  const resultsDir = path.join(process.cwd(), 'performance-results')

  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true })
    return {
      passed: true,
      message: '✓ Created performance-results directory',
    }
  }

  return {
    passed: true,
    message: '✓ performance-results directory exists',
  }
}

function checkScriptPermissions(): ValidationResult {
  const scriptPath = path.join(process.cwd(), 'src/test/performance/run-performance-tests.sh')

  if (!fs.existsSync(scriptPath)) {
    return {
      passed: false,
      message: '✗ run-performance-tests.sh not found',
    }
  }

  try {
    fs.accessSync(scriptPath, fs.constants.X_OK)
    return {
      passed: true,
      message: '✓ run-performance-tests.sh is executable',
    }
  } catch {
    return {
      passed: false,
      message: '✗ run-performance-tests.sh is not executable',
      details: 'Run: chmod +x src/test/performance/run-performance-tests.sh',
    }
  }
}

function checkServerAvailability(): ValidationResult {
  const indexPath = path.join(process.cwd(), 'src/index.ts')
  const nativePath = path.join(process.cwd(), 'src/index-native.ts')

  if (!fs.existsSync(indexPath)) {
    return {
      passed: false,
      message: '✗ Express server (src/index.ts) not found',
    }
  }

  if (!fs.existsSync(nativePath)) {
    return {
      passed: false,
      message: '✗ Native server (src/index-native.ts) not found',
    }
  }

  return {
    passed: true,
    message: '✓ Both server implementations found',
  }
}

async function main() {
  console.log('Validating Performance Testing Setup...\n')

  const checks = [
    checkNodeVersion(),
    checkEnvFile(),
    checkResultsDirectory(),
    checkScriptPermissions(),
    checkServerAvailability(),
  ]

  let allPassed = true

  for (const check of checks) {
    console.log(check.message)
    if (check.details) {
      console.log(`  ${check.details}`)
    }
    if (!check.passed) {
      allPassed = false
    }
  }

  console.log()

  if (allPassed) {
    console.log('✓ All checks passed! Ready to run performance tests.')
    console.log()
    console.log('Next steps:')
    console.log('  1. Start Express server: pnpm dev')
    console.log('  2. Run Express tests: ./src/test/performance/run-performance-tests.sh express')
    console.log('  3. Stop server and start Native: pnpm esno src/index-native.ts')
    console.log('  4. Run Native tests: ./src/test/performance/run-performance-tests.sh native')
    console.log('  5. Compare results: ./src/test/performance/run-performance-tests.sh compare')
    console.log()
    console.log('See PERFORMANCE_TESTING.md for detailed instructions.')
    process.exit(0)
  } else {
    console.log('✗ Some checks failed. Please fix the issues above.')
    process.exit(1)
  }
}

try {
  await main()
} catch (error) {
  console.error('Validation failed:', error)
  process.exit(1)
}
