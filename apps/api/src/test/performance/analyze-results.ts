/**
 * Analyze Performance Results
 *
 * This script analyzes the performance test results from both Express and Native
 * implementations and determines if the native implementation meets the 10% threshold.
 *
 * Usage:
 *   pnpm tsx src/test/performance/analyze-results.ts
 */

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

interface ComparisonMetric {
  express: number
  native: number
  difference: number
  percentageDiff: number
  withinThreshold: boolean
  status: 'PASS' | 'FAIL'
}

interface EndpointComparison {
  endpoint: string
  concurrency: number
  metrics: {
    rps: ComparisonMetric
    p50: ComparisonMetric
    p95: ComparisonMetric
    p99: ComparisonMetric
  }
  overallPass: boolean
}

/**
 * Calculate percentage difference
 */
function calculatePercentageDiff(baseline: number, comparison: number): number {
  if (baseline === 0) return 0
  return ((comparison - baseline) / baseline) * 100
}

/**
 * Compare a single metric
 */
function compareMetric(
  express: number,
  native: number,
  _metricName: string,
  lowerIsBetter: boolean,
): ComparisonMetric {
  const difference = native - express
  const percentageDiff = calculatePercentageDiff(express, native)

  // For throughput (RPS), higher is better, so native should not be more than 10% slower
  // For latency, lower is better, so native should not be more than 10% higher
  let withinThreshold: boolean
  if (lowerIsBetter) {
    // Latency: native should not be more than 10% higher (slower)
    withinThreshold = percentageDiff <= 10
  } else {
    // Throughput: native should not be more than 10% lower (slower)
    withinThreshold = percentageDiff >= -10
  }

  return {
    express,
    native,
    difference,
    percentageDiff,
    withinThreshold,
    status: withinThreshold ? 'PASS' : 'FAIL',
  }
}

/**
 * Find matching results files
 */
function findResultsFiles(implementation: string, endpoint: string): TestResults | null {
  const resultsDir = 'performance-results'

  if (!fs.existsSync(resultsDir)) {
    return null
  }

  const files = fs
    .readdirSync(resultsDir)
    .filter(f => f.startsWith(`${implementation}-${endpoint}-`) && f.endsWith('.json'))
    .sort()
    .reverse()

  if (files.length === 0) {
    return null
  }

  const filePath = path.join(resultsDir, files[0])
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as TestResults
}

/**
 * Compare results for an endpoint
 */
function compareEndpoint(
  endpoint: string,
  expressResults: TestResults,
  nativeResults: TestResults,
): EndpointComparison[] {
  const comparisons: EndpointComparison[] = []

  for (let i = 0; i < expressResults.results.length; i++) {
    const expressResult = expressResults.results[i]
    const nativeResult = nativeResults.results[i]

    if (!expressResult || !nativeResult) continue

    const rps = compareMetric(
      expressResult.result.requestsPerSecond,
      nativeResult.result.requestsPerSecond,
      'RPS',
      false,
    )

    const p50 = compareMetric(expressResult.result.p50, nativeResult.result.p50, 'p50', true)

    const p95 = compareMetric(expressResult.result.p95, nativeResult.result.p95, 'p95', true)

    const p99 = compareMetric(expressResult.result.p99, nativeResult.result.p99, 'p99', true)

    const overallPass =
      rps.withinThreshold && p50.withinThreshold && p95.withinThreshold && p99.withinThreshold

    comparisons.push({
      endpoint,
      concurrency: expressResult.concurrency,
      metrics: { rps, p50, p95, p99 },
      overallPass,
    })
  }

  return comparisons
}

/**
 * Format metric for display
 */
function formatMetric(metric: ComparisonMetric, unit: string): string {
  const sign = metric.difference >= 0 ? '+' : ''
  const status = metric.status === 'PASS' ? '✓' : '✗'
  return (
    `Express: ${metric.express.toFixed(2)}${unit} | ` +
    `Native: ${metric.native.toFixed(2)}${unit} | ` +
    `Diff: ${sign}${metric.difference.toFixed(2)}${unit} (${sign}${metric.percentageDiff.toFixed(2)}%) ${status}`
  )
}

/**
 * Print comparison results
 */
function printComparisons(comparisons: EndpointComparison[]): void {
  console.log(`\n${'='.repeat(80)}`)
  console.log('Performance Comparison: Express vs Native')
  console.log('Threshold: Native must be within 10% of Express baseline')
  console.log('='.repeat(80))

  for (const comparison of comparisons) {
    console.log(`\nEndpoint: ${comparison.endpoint} | Concurrency: ${comparison.concurrency}`)
    console.log('-'.repeat(80))

    console.log('\nThroughput (Requests/sec):')
    console.log(`  ${formatMetric(comparison.metrics.rps, ' req/s')}`)

    console.log('\nLatency p50 (median):')
    console.log(`  ${formatMetric(comparison.metrics.p50, 'ms')}`)

    console.log('\nLatency p95:')
    console.log(`  ${formatMetric(comparison.metrics.p95, 'ms')}`)

    console.log('\nLatency p99:')
    console.log(`  ${formatMetric(comparison.metrics.p99, 'ms')}`)

    console.log(`\nOverall: ${comparison.overallPass ? '✓ PASS' : '✗ FAIL'}`)
  }

  console.log(`\n${'='.repeat(80)}`)

  const allPassed = comparisons.every(c => c.overallPass)
  const passedCount = comparisons.filter(c => c.overallPass).length
  const totalCount = comparisons.length

  console.log(`\nResults: ${passedCount}/${totalCount} tests passed`)
  console.log(`\nFinal Verdict: ${allPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED'}`)

  if (allPassed) {
    console.log('Native implementation performance is within 10% of Express baseline.')
  } else {
    console.log('Native implementation performance is NOT within 10% of Express baseline.')
    console.log('Please investigate the failing metrics.')
  }

  console.log()
}

/**
 * Generate summary report
 */
function generateSummary(comparisons: EndpointComparison[]): void {
  const resultsDir = 'performance-results'
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = path.join(resultsDir, `summary-${timestamp}.json`)

  const allPassed = comparisons.every(c => c.overallPass)

  const summary = {
    timestamp: new Date().toISOString(),
    threshold: '10%',
    passed: allPassed,
    totalTests: comparisons.length,
    passedTests: comparisons.filter(c => c.overallPass).length,
    failedTests: comparisons.filter(c => !c.overallPass).length,
    comparisons: comparisons.map(c => ({
      endpoint: c.endpoint,
      concurrency: c.concurrency,
      passed: c.overallPass,
      metrics: {
        rps: {
          express: c.metrics.rps.express,
          native: c.metrics.rps.native,
          percentageDiff: c.metrics.rps.percentageDiff,
          status: c.metrics.rps.status,
        },
        p50: {
          express: c.metrics.p50.express,
          native: c.metrics.p50.native,
          percentageDiff: c.metrics.p50.percentageDiff,
          status: c.metrics.p50.status,
        },
        p95: {
          express: c.metrics.p95.express,
          native: c.metrics.p95.native,
          percentageDiff: c.metrics.p95.percentageDiff,
          status: c.metrics.p95.status,
        },
        p99: {
          express: c.metrics.p99.express,
          native: c.metrics.p99.native,
          percentageDiff: c.metrics.p99.percentageDiff,
          status: c.metrics.p99.status,
        },
      },
    })),
  }

  fs.writeFileSync(filename, JSON.stringify(summary, null, 2))
  console.log(`Summary saved to: ${filename}`)
}

/**
 * Main function
 */
async function main() {
  const endpoints = ['health', 'session']
  const allComparisons: EndpointComparison[] = []

  console.log('Analyzing performance test results...\n')

  for (const endpoint of endpoints) {
    console.log(`Looking for results for endpoint: ${endpoint}`)

    const expressResults = findResultsFiles('express', endpoint)
    const nativeResults = findResultsFiles('native', endpoint)

    if (!expressResults) {
      console.error(`  ✗ No Express results found for ${endpoint}`)
      console.error(`    Please run: ./src/test/performance/run-performance-tests.sh express`)
      continue
    }

    if (!nativeResults) {
      console.error(`  ✗ No Native results found for ${endpoint}`)
      console.error(`    Please run: ./src/test/performance/run-performance-tests.sh native`)
      continue
    }

    console.log(`  ✓ Found Express results: ${expressResults.timestamp}`)
    console.log(`  ✓ Found Native results: ${nativeResults.timestamp}`)

    const comparisons = compareEndpoint(endpoint, expressResults, nativeResults)
    allComparisons.push(...comparisons)
  }

  if (allComparisons.length === 0) {
    console.error('\n✗ No results to compare. Please run performance tests first.')
    console.error('\nSteps:')
    console.error('  1. Start Express server: pnpm dev')
    console.error('  2. Run: ./src/test/performance/run-performance-tests.sh express')
    console.error('  3. Stop server')
    console.error('  4. Start Native server: pnpm esno src/index-native.ts')
    console.error('  5. Run: ./src/test/performance/run-performance-tests.sh native')
    console.error('  6. Stop server')
    console.error('  7. Run: ./src/test/performance/run-performance-tests.sh compare')
    process.exit(1)
  }

  printComparisons(allComparisons)
  generateSummary(allComparisons)

  const allPassed = allComparisons.every(c => c.overallPass)
  process.exit(allPassed ? 0 : 1)
}

// Run the analysis
main().catch(error => {
  console.error('Analysis failed:', error)
  process.exit(1)
})
