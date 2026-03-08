/**
 * Compare Performance: Express vs Native Implementation
 *
 * This script runs load tests on both implementations and compares the results
 * to verify that the native implementation's performance is within 10% of the
 * Express baseline.
 *
 * Usage:
 *   pnpm tsx src/test/performance/compare-implementations.ts
 */

import { spawn } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'

interface LoadTestResult {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  duration: number
  requestsPerSecond: number
  p50: number
  p95: number
  p99: number
  minLatency: number
  maxLatency: number
  avgLatency: number
}

interface TestResults {
  implementation: string
  endpoint: string
  timestamp: string
  results: Array<{
    concurrency: number
    result: LoadTestResult
  }>
}

interface ComparisonResult {
  endpoint: string
  concurrency: number
  express: LoadTestResult
  native: LoadTestResult
  differences: {
    rps: { value: number; percentage: number; withinThreshold: boolean }
    p50: { value: number; percentage: number; withinThreshold: boolean }
    p95: { value: number; percentage: number; withinThreshold: boolean }
    p99: { value: number; percentage: number; withinThreshold: boolean }
  }
  passed: boolean
}

/**
 * Start a server process
 */
function startServer(implementation: 'express' | 'native'): Promise<{
  process: ReturnType<typeof spawn>
  port: number
}> {
  return new Promise((resolve, reject) => {
    const port = 3002
    const script = implementation === 'express' ? 'src/index.ts' : 'src/index-native.ts'

    console.log(`Starting ${implementation} server on port ${port}...`)

    const serverProcess = spawn('pnpm', ['esno', script], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: String(port),
        NODE_ENV: 'test',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let output = ''

    serverProcess.stdout?.on('data', data => {
      output += data.toString()
      if (output.includes('Server is running') || output.includes('Server started successfully')) {
        // Give it a moment to fully initialize
        setTimeout(() => {
          console.log(`${implementation} server started successfully`)
          resolve({ process: serverProcess, port })
        }, 2000)
      }
    })

    serverProcess.stderr?.on('data', data => {
      const message = data.toString()
      // Ignore non-error messages
      if (!message.includes('Server is running') && !message.includes('validation passed')) {
        console.error(`${implementation} server error:`, message)
      }
    })

    serverProcess.on('error', error => {
      reject(new Error(`Failed to start ${implementation} server: ${error.message}`))
    })

    serverProcess.on('exit', code => {
      if (code !== 0 && code !== null) {
        reject(new Error(`${implementation} server exited with code ${code}`))
      }
    })

    // Timeout after 30 seconds
    setTimeout(() => {
      if (
        !output.includes('Server is running') &&
        !output.includes('Server started successfully')
      ) {
        serverProcess.kill()
        reject(new Error(`${implementation} server failed to start within 30 seconds`))
      }
    }, 30000)
  })
}

/**
 * Stop a server process
 */
function stopServer(serverProcess: ReturnType<typeof spawn>): Promise<void> {
  return new Promise(resolve => {
    serverProcess.on('exit', () => {
      resolve()
    })

    serverProcess.kill('SIGTERM')

    // Force kill after 5 seconds
    setTimeout(() => {
      serverProcess.kill('SIGKILL')
      resolve()
    }, 5000)
  })
}

/**
 * Run load test for a specific implementation and endpoint
 */
function runLoadTest(implementation: 'express' | 'native', endpoint: string): Promise<TestResults> {
  return new Promise((resolve, reject) => {
    console.log(`\nRunning load test: ${implementation} - ${endpoint}`)

    const testProcess = spawn(
      'pnpm',
      ['tsx', 'src/test/performance/load-test.ts', implementation, endpoint],
      {
        cwd: process.cwd(),
        env: process.env,
        stdio: 'inherit',
      },
    )

    testProcess.on('exit', code => {
      if (code === 0) {
        // Find the most recent results file
        const resultsDir = 'performance-results'
        const files = fs
          .readdirSync(resultsDir)
          .filter(f => f.startsWith(`${implementation}-${endpoint}-`))
          .sort()
          .reverse()

        if (files.length === 0) {
          reject(new Error(`No results file found for ${implementation} - ${endpoint}`))
          return
        }

        const resultsFile = path.join(resultsDir, files[0])
        const results = JSON.parse(fs.readFileSync(resultsFile, 'utf-8')) as TestResults

        resolve(results)
      } else {
        reject(new Error(`Load test failed with code ${code}`))
      }
    })

    testProcess.on('error', error => {
      reject(error)
    })
  })
}

/**
 * Calculate percentage difference
 */
function calculateDifference(baseline: number, comparison: number): number {
  if (baseline === 0) return 0
  return ((comparison - baseline) / baseline) * 100
}

/**
 * Compare results between implementations
 */
function compareResults(
  endpoint: string,
  expressResults: TestResults,
  nativeResults: TestResults,
): ComparisonResult[] {
  const comparisons: ComparisonResult[] = []
  const threshold = 10 // 10% threshold

  for (let i = 0; i < expressResults.results.length; i++) {
    const expressResult = expressResults.results[i]
    const nativeResult = nativeResults.results[i]

    if (!expressResult || !nativeResult) continue

    const rpsDiff = calculateDifference(
      expressResult.result.requestsPerSecond,
      nativeResult.result.requestsPerSecond,
    )
    const p50Diff = calculateDifference(expressResult.result.p50, nativeResult.result.p50)
    const p95Diff = calculateDifference(expressResult.result.p95, nativeResult.result.p95)
    const p99Diff = calculateDifference(expressResult.result.p99, nativeResult.result.p99)

    // For RPS, higher is better, so we check if native is not more than 10% slower
    const rpsWithinThreshold = rpsDiff >= -threshold
    // For latency, lower is better, so we check if native is not more than 10% slower (higher latency)
    const p50WithinThreshold = p50Diff <= threshold
    const p95WithinThreshold = p95Diff <= threshold
    const p99WithinThreshold = p99Diff <= threshold

    const passed =
      rpsWithinThreshold && p50WithinThreshold && p95WithinThreshold && p99WithinThreshold

    comparisons.push({
      endpoint,
      concurrency: expressResult.concurrency,
      express: expressResult.result,
      native: nativeResult.result,
      differences: {
        rps: {
          value: nativeResult.result.requestsPerSecond - expressResult.result.requestsPerSecond,
          percentage: rpsDiff,
          withinThreshold: rpsWithinThreshold,
        },
        p50: {
          value: nativeResult.result.p50 - expressResult.result.p50,
          percentage: p50Diff,
          withinThreshold: p50WithinThreshold,
        },
        p95: {
          value: nativeResult.result.p95 - expressResult.result.p95,
          percentage: p95Diff,
          withinThreshold: p95WithinThreshold,
        },
        p99: {
          value: nativeResult.result.p99 - expressResult.result.p99,
          percentage: p99Diff,
          withinThreshold: p99WithinThreshold,
        },
      },
      passed,
    })
  }

  return comparisons
}

/**
 * Print comparison results
 */
function printComparison(comparisons: ComparisonResult[]): void {
  console.log(`\n${'='.repeat(80)}`)
  console.log('Performance Comparison: Express vs Native')
  console.log('='.repeat(80))

  for (const comparison of comparisons) {
    console.log(`\nEndpoint: ${comparison.endpoint} | Concurrency: ${comparison.concurrency}`)
    console.log('-'.repeat(80))

    console.log('\nThroughput (Requests/sec):')
    console.log(`  Express:  ${comparison.express.requestsPerSecond.toFixed(2)}`)
    console.log(`  Native:   ${comparison.native.requestsPerSecond.toFixed(2)}`)
    console.log(
      `  Diff:     ${comparison.differences.rps.value >= 0 ? '+' : ''}${comparison.differences.rps.value.toFixed(2)} ` +
        `(${comparison.differences.rps.percentage >= 0 ? '+' : ''}${comparison.differences.rps.percentage.toFixed(2)}%) ` +
        `${comparison.differences.rps.withinThreshold ? '✓' : '✗'}`,
    )

    console.log('\nLatency p50 (ms):')
    console.log(`  Express:  ${comparison.express.p50.toFixed(2)}`)
    console.log(`  Native:   ${comparison.native.p50.toFixed(2)}`)
    console.log(
      `  Diff:     ${comparison.differences.p50.value >= 0 ? '+' : ''}${comparison.differences.p50.value.toFixed(2)} ` +
        `(${comparison.differences.p50.percentage >= 0 ? '+' : ''}${comparison.differences.p50.percentage.toFixed(2)}%) ` +
        `${comparison.differences.p50.withinThreshold ? '✓' : '✗'}`,
    )

    console.log('\nLatency p95 (ms):')
    console.log(`  Express:  ${comparison.express.p95.toFixed(2)}`)
    console.log(`  Native:   ${comparison.native.p95.toFixed(2)}`)
    console.log(
      `  Diff:     ${comparison.differences.p95.value >= 0 ? '+' : ''}${comparison.differences.p95.value.toFixed(2)} ` +
        `(${comparison.differences.p95.percentage >= 0 ? '+' : ''}${comparison.differences.p95.percentage.toFixed(2)}%) ` +
        `${comparison.differences.p95.withinThreshold ? '✓' : '✗'}`,
    )

    console.log('\nLatency p99 (ms):')
    console.log(`  Express:  ${comparison.express.p99.toFixed(2)}`)
    console.log(`  Native:   ${comparison.native.p99.toFixed(2)}`)
    console.log(
      `  Diff:     ${comparison.differences.p99.value >= 0 ? '+' : ''}${comparison.differences.p99.value.toFixed(2)} ` +
        `(${comparison.differences.p99.percentage >= 0 ? '+' : ''}${comparison.differences.p99.percentage.toFixed(2)}%) ` +
        `${comparison.differences.p99.withinThreshold ? '✓' : '✗'}`,
    )

    console.log(`\nResult: ${comparison.passed ? '✓ PASSED' : '✗ FAILED'}`)
  }

  console.log(`\n${'='.repeat(80)}`)

  const allPassed = comparisons.every(c => c.passed)
  console.log(`\nOverall Result: ${allPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED'}`)
  console.log(
    `Native implementation performance is ${allPassed ? 'within' : 'NOT within'} 10% of Express baseline`,
  )
  console.log()
}

/**
 * Main function
 */
async function main() {
  const endpoints = ['health', 'session']
  const allComparisons: ComparisonResult[] = []

  for (const endpoint of endpoints) {
    console.log(`\n${'='.repeat(80)}`)
    console.log(`Testing endpoint: ${endpoint}`)
    console.log('='.repeat(80))

    // Test Express implementation
    console.log('\n--- Testing Express Implementation ---')
    const expressServer = await startServer('express')

    try {
      const expressResults = await runLoadTest('express', endpoint)
      await stopServer(expressServer.process)

      // Wait a bit before starting native server
      console.log('\nWaiting 5 seconds before starting native server...')
      await new Promise(resolve => setTimeout(resolve, 5000))

      // Test Native implementation
      console.log('\n--- Testing Native Implementation ---')
      const nativeServer = await startServer('native')

      try {
        const nativeResults = await runLoadTest('native', endpoint)
        await stopServer(nativeServer.process)

        // Compare results
        const comparisons = compareResults(endpoint, expressResults, nativeResults)
        allComparisons.push(...comparisons)
      } catch (error) {
        await stopServer(nativeServer.process)
        throw error
      }
    } catch (error) {
      await stopServer(expressServer.process)
      throw error
    }

    // Wait between endpoints
    if (endpoint !== endpoints[endpoints.length - 1]) {
      console.log('\nWaiting 10 seconds before next endpoint...')
      await new Promise(resolve => setTimeout(resolve, 10000))
    }
  }

  // Print final comparison
  printComparison(allComparisons)

  // Save comparison results
  const resultsDir = 'performance-results'
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true })
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = path.join(resultsDir, `comparison-${timestamp}.json`)

  fs.writeFileSync(
    filename,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        comparisons: allComparisons,
        passed: allComparisons.every(c => c.passed),
      },
      null,
      2,
    ),
  )

  console.log(`Comparison results saved to: ${filename}`)

  // Exit with appropriate code
  const allPassed = allComparisons.every(c => c.passed)
  process.exit(allPassed ? 0 : 1)
}

// Run the comparison
main().catch(error => {
  console.error('Comparison failed:', error)
  process.exit(1)
})
