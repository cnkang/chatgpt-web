export {}

/**
 * Load Testing Script for Express vs Native Implementation
 *
 * This script performs load testing on both Express and Native implementations
 * to compare performance metrics including latency and throughput.
 *
 * Usage:
 *   pnpm tsx src/test/performance/load-test.ts <implementation> <endpoint>
 *
 * Arguments:
 *   implementation: 'express' or 'native'
 *   endpoint: 'health', 'session', or 'config'
 *
 * Example:
 *   pnpm tsx src/test/performance/load-test.ts express health
 */

interface LoadTestConfig {
  url: string
  method: 'GET' | 'POST'
  headers?: Record<string, string>
  body?: unknown
  duration: number // seconds
  concurrency: number
}

interface RequestResult {
  success: boolean
  latency: number // milliseconds
  statusCode?: number
  error?: string
}

interface LoadTestResult {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  duration: number // seconds
  requestsPerSecond: number
  latencies: number[]
  p50: number
  p95: number
  p99: number
  minLatency: number
  maxLatency: number
  avgLatency: number
}

/**
 * Calculate percentile from sorted array
 */
function percentile(sortedArray: number[], p: number): number {
  if (sortedArray.length === 0) return 0
  const index = Math.ceil((sortedArray.length * p) / 100) - 1
  return sortedArray[Math.max(0, index)]
}

/**
 * Perform a single HTTP request and measure latency
 */
async function performRequest(config: LoadTestConfig): Promise<RequestResult> {
  const startTime = performance.now()

  try {
    const response = await fetch(config.url, {
      method: config.method,
      headers: config.headers,
      body: config.body ? JSON.stringify(config.body) : undefined,
    })

    const latency = performance.now() - startTime

    return {
      success: response.ok,
      latency,
      statusCode: response.status,
    }
  } catch (error) {
    const latency = performance.now() - startTime
    return {
      success: false,
      latency,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Run load test with specified configuration
 */
async function runLoadTest(config: LoadTestConfig): Promise<LoadTestResult> {
  const results: RequestResult[] = []
  const startTime = Date.now()
  const endTime = startTime + config.duration * 1000

  console.log(`Starting load test...`)
  console.log(`  URL: ${config.url}`)
  console.log(`  Method: ${config.method}`)
  console.log(`  Duration: ${config.duration}s`)
  console.log(`  Concurrency: ${config.concurrency}`)
  console.log()

  // Run concurrent requests until duration expires
  const workers: Promise<void>[] = []

  for (let i = 0; i < config.concurrency; i++) {
    workers.push(
      (async () => {
        while (Date.now() < endTime) {
          const result = await performRequest(config)
          results.push(result)
        }
      })(),
    )
  }

  await Promise.all(workers)

  // Calculate metrics
  const actualDuration = (Date.now() - startTime) / 1000
  const successfulRequests = results.filter(r => r.success).length
  const failedRequests = results.length - successfulRequests
  const latencies = results.map(r => r.latency).sort((a, b) => a - b)

  return {
    totalRequests: results.length,
    successfulRequests,
    failedRequests,
    duration: actualDuration,
    requestsPerSecond: results.length / actualDuration,
    latencies,
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    p99: percentile(latencies, 99),
    minLatency: latencies[0] || 0,
    maxLatency: latencies.at(-1) || 0,
    avgLatency: latencies.reduce((sum, l) => sum + l, 0) / latencies.length || 0,
  }
}

/**
 * Print load test results
 */
function printResults(implementation: string, endpoint: string, result: LoadTestResult): void {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Load Test Results: ${implementation.toUpperCase()} - ${endpoint}`)
  console.log('='.repeat(60))
  console.log()
  console.log('Throughput:')
  console.log(`  Total Requests:      ${result.totalRequests}`)
  console.log(`  Successful:          ${result.successfulRequests}`)
  console.log(`  Failed:              ${result.failedRequests}`)
  console.log(`  Duration:            ${result.duration.toFixed(2)}s`)
  console.log(`  Requests/sec:        ${result.requestsPerSecond.toFixed(2)}`)
  console.log()
  console.log('Latency (ms):')
  console.log(`  Min:                 ${result.minLatency.toFixed(2)}`)
  console.log(`  Max:                 ${result.maxLatency.toFixed(2)}`)
  console.log(`  Average:             ${result.avgLatency.toFixed(2)}`)
  console.log(`  p50 (median):        ${result.p50.toFixed(2)}`)
  console.log(`  p95:                 ${result.p95.toFixed(2)}`)
  console.log(`  p99:                 ${result.p99.toFixed(2)}`)
  console.log()
}

/**
 * Get endpoint configuration
 */
function getEndpointConfig(
  baseUrl: string,
  endpoint: string,
  authToken?: string,
): Omit<LoadTestConfig, 'duration' | 'concurrency'> {
  const configs: Record<string, Omit<LoadTestConfig, 'duration' | 'concurrency'>> = {
    health: {
      url: `${baseUrl}/api/health`,
      method: 'GET',
    },
    session: {
      url: `${baseUrl}/api/session`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {},
    },
    config: {
      url: `${baseUrl}/api/config`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: {},
    },
  }

  const config = configs[endpoint]
  if (!config) {
    throw new Error(`Unknown endpoint: ${endpoint}. Valid options: health, session, config`)
  }

  return config
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2)

  if (args.length < 2) {
    console.error('Usage: pnpm tsx src/test/performance/load-test.ts <implementation> <endpoint>')
    console.error('  implementation: express | native')
    console.error('  endpoint: health | session | config')
    process.exit(1)
  }

  const [implementation, endpoint] = args
  const baseUrl = process.env.BASE_URL || 'http://localhost:3002'
  const authToken = process.env.AUTH_SECRET_KEY

  if (!['express', 'native'].includes(implementation)) {
    console.error('Invalid implementation. Must be "express" or "native"')
    process.exit(1)
  }

  // Test configurations: different concurrency levels
  const testConfigs = [
    { concurrency: 10, duration: 30 },
    { concurrency: 50, duration: 30 },
    { concurrency: 100, duration: 30 },
  ]

  const allResults: Array<{
    concurrency: number
    result: LoadTestResult
  }> = []

  for (const testConfig of testConfigs) {
    const endpointConfig = getEndpointConfig(baseUrl, endpoint, authToken)

    const config: LoadTestConfig = {
      ...endpointConfig,
      duration: testConfig.duration,
      concurrency: testConfig.concurrency,
    }

    console.log(`\nRunning test with ${testConfig.concurrency} concurrent connections...`)
    const result = await runLoadTest(config)
    printResults(implementation, endpoint, result)

    allResults.push({
      concurrency: testConfig.concurrency,
      result,
    })

    // Wait a bit between tests to let the server recover
    if (testConfig !== testConfigs.at(-1)) {
      console.log('\nWaiting 5 seconds before next test...')
      await new Promise(resolve => setTimeout(resolve, 5000))
    }
  }

  // Print summary
  console.log(`\n${'='.repeat(60)}`)
  console.log('Summary')
  console.log('='.repeat(60))
  console.log()
  console.log('Concurrency | RPS      | p50 (ms) | p95 (ms) | p99 (ms) | Failed')
  console.log('-'.repeat(60))

  for (const { concurrency, result } of allResults) {
    console.log(
      `${String(concurrency).padEnd(11)} | ` +
        `${result.requestsPerSecond.toFixed(2).padEnd(8)} | ` +
        `${result.p50.toFixed(2).padEnd(8)} | ` +
        `${result.p95.toFixed(2).padEnd(8)} | ` +
        `${result.p99.toFixed(2).padEnd(8)} | ` +
        `${result.failedRequests}`,
    )
  }
  console.log()

  // Save results to JSON file
  const resultsDir = 'performance-results'
  const fs = await import('node:fs')
  const path = await import('node:path')

  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true })
  }

  const timestamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
  const filename = path.join(resultsDir, `${implementation}-${endpoint}-${timestamp}.json`)

  fs.writeFileSync(
    filename,
    JSON.stringify(
      {
        implementation,
        endpoint,
        timestamp: new Date().toISOString(),
        results: allResults,
      },
      null,
      2,
    ),
  )

  console.log(`Results saved to: ${filename}`)
}

try {
  await main()
} catch (error) {
  console.error('Load test failed:', error)
  process.exit(1)
}
