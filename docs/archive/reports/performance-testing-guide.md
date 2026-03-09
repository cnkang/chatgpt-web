# Performance Testing Guide

This guide explains how to run performance tests to verify that the native Node.js HTTP/2 implementation meets the requirement that performance must be within 10% of the Express baseline.

## Quick Start

```bash
# 1. Setup environment
cd apps/api
cp src/test/performance/.env.test.example .env
# Edit .env and set OPENAI_API_KEY to a valid key

# 2. Test Express implementation
pnpm dev &
sleep 5
./src/test/performance/run-performance-tests.sh express
kill %1

# 3. Test Native implementation
pnpm esno src/index-native.ts &
sleep 5
./src/test/performance/run-performance-tests.sh native
kill %1

# 4. Compare results
./src/test/performance/run-performance-tests.sh compare
```

## Detailed Instructions

### Prerequisites

1. **Node.js 24+**: Required for native implementation
2. **PNPM 10+**: Package manager
3. **Valid OpenAI API Key**: For testing endpoints that interact with AI provider
4. **Clean environment**: No other processes consuming significant resources

### Step 1: Environment Setup

Create a `.env` file in `apps/api/`:

```bash
cd apps/api
cp src/test/performance/.env.test.example .env
```

Edit `.env` and set your OpenAI API key:

```env
OPENAI_API_KEY=sk-your-actual-key-here
```

**Important**: Use a test API key if possible, as the load tests will make many requests.

### Step 2: Test Express Implementation

#### Start Express Server

```bash
cd apps/api
pnpm dev
```

Wait for the server to start. You should see:

```
✓ Configuration validation passed
✓ Security validation passed
✓ Security environment validation passed
Server is running on port 3002
```

#### Run Express Load Tests

In a **new terminal**:

```bash
cd apps/api
./src/test/performance/run-performance-tests.sh express
```

This will:

- Test the `/api/health` endpoint with 10, 50, and 100 concurrent connections
- Test the `/api/session` endpoint with 10, 50, and 100 concurrent connections
- Save results to `performance-results/express-*.json`

**Expected duration**: ~3-4 minutes per endpoint (6-8 minutes total)

#### Stop Express Server

Return to the first terminal and press `Ctrl+C` to stop the server.

### Step 3: Test Native Implementation

#### Start Native Server

```bash
cd apps/api
pnpm esno src/index-native.ts
```

Wait for the server to start. You should see:

```
Node.js version check passed
Configuration validation passed
Security validation passed
Server started successfully on port 3002
```

#### Run Native Load Tests

In a **new terminal**:

```bash
cd apps/api
./src/test/performance/run-performance-tests.sh native
```

This will run the same tests as Express and save results to `performance-results/native-*.json`.

**Expected duration**: ~3-4 minutes per endpoint (6-8 minutes total)

#### Stop Native Server

Return to the first terminal and press `Ctrl+C` to stop the server.

### Step 4: Compare Results

```bash
cd apps/api
./src/test/performance/run-performance-tests.sh compare
```

This will:

- Load the most recent Express and Native results for each endpoint
- Compare throughput (RPS) and latency (p50, p95, p99)
- Determine if native is within 10% of Express baseline
- Save a summary to `performance-results/summary-*.json`

## Understanding Results

### Success Criteria

The native implementation **PASSES** if ALL metrics are within 10% of Express:

| Metric           | Direction        | Threshold              |
| ---------------- | ---------------- | ---------------------- |
| Throughput (RPS) | Higher is better | Native ≥ Express × 0.9 |
| Latency p50      | Lower is better  | Native ≤ Express × 1.1 |
| Latency p95      | Lower is better  | Native ≤ Express × 1.1 |
| Latency p99      | Lower is better  | Native ≤ Express × 1.1 |

### Example: Passing Results

```
Endpoint: health | Concurrency: 10
--------------------------------------------------------------------------------

Throughput (Requests/sec):
  Express: 1250.50 req/s | Native: 1275.25 req/s | Diff: +24.75 req/s (+1.98%) ✓

Latency p50 (median):
  Express: 7.85ms | Native: 7.65ms | Diff: -0.20ms (-2.55%) ✓

Latency p95:
  Express: 12.30ms | Native: 12.10ms | Diff: -0.20ms (-1.63%) ✓

Latency p99:
  Express: 15.80ms | Native: 15.50ms | Diff: -0.30ms (-1.90%) ✓

Overall: ✓ PASS
```

**Interpretation**:

- Native is **1.98% faster** in throughput (good!)
- Native has **2.55% lower** p50 latency (good!)
- All metrics within 10% threshold ✓

### Example: Failing Results

```
Endpoint: session | Concurrency: 100
--------------------------------------------------------------------------------

Throughput (Requests/sec):
  Express: 850.30 req/s | Native: 740.25 req/s | Diff: -110.05 req/s (-12.94%) ✗

Latency p50 (median):
  Express: 115.20ms | Native: 130.50ms | Diff: +15.30ms (+13.28%) ✗

Overall: ✗ FAIL
```

**Interpretation**:

- Native is **12.94% slower** in throughput (exceeds 10% threshold) ✗
- Native has **13.28% higher** p50 latency (exceeds 10% threshold) ✗
- Investigation required

## Troubleshooting

### Server Won't Start

**Error**: `Configuration validation failed`

**Solution**: Check your `.env` file has valid `OPENAI_API_KEY`

---

**Error**: `Address already in use`

**Solution**: Another process is using port 3002. Stop it or change `PORT` in `.env`

```bash
# Find process using port 3002
lsof -i :3002

# Kill it
kill -9 <PID>
```

### Tests Fail to Connect

**Error**: `Server is not running on port 3002`

**Solution**: Ensure the server is fully started before running tests. Wait for the startup message.

### High Variance in Results

If results vary significantly between runs:

1. **Close other applications** to reduce system load
2. **Run tests multiple times** and average the results
3. **Check system resources**: Ensure CPU/memory are not constrained
4. **Disable background processes**: Stop Docker, VMs, etc.
5. **Use consistent network conditions**: Avoid running on WiFi if possible

### Native Implementation Fails Threshold

If native performance is not within 10%:

1. **Check for errors in server logs**: Look for warnings or errors
2. **Profile the code**: Use Node.js profiler to find bottlenecks
3. **Review recent changes**: Check if recent commits affected performance
4. **Test different concurrency levels**: Some issues only appear under high load
5. **Compare HTTP/2 vs HTTP/1.1**: Test with `allowHTTP1: false` to isolate HTTP/2

## Advanced Usage

### Test Specific Endpoints

```bash
# Test only health endpoint
pnpm tsx src/test/performance/load-test.ts express health
pnpm tsx src/test/performance/load-test.ts native health
```

### Custom Test Duration

Edit `load-test.ts` and modify the `testConfigs` array:

```typescript
const testConfigs = [
  { concurrency: 10, duration: 60 }, // 60 seconds instead of 30
  { concurrency: 50, duration: 60 },
  { concurrency: 100, duration: 60 },
]
```

### Test with Authentication

To test the `/api/config` endpoint (requires auth):

1. Set `AUTH_SECRET_KEY` in `.env`
2. Modify `run-performance-tests.sh` to include `config` in `ENDPOINTS` array
3. Run tests as normal

### Automated Testing

For CI/CD pipelines, use the automated script:

```bash
pnpm tsx src/test/performance/compare-implementations.ts
```

**Note**: This script starts/stops servers automatically but may be less reliable than manual testing.

## Performance Optimization

If native implementation needs optimization:

### 1. Profile the Code

```bash
node --prof src/index-native.ts
# Run load tests
# Process profile
node --prof-process isolate-*.log > profile.txt
```

### 2. Check Middleware Overhead

Review middleware execution time:

- Body parsing
- Authentication
- Rate limiting
- Security headers

### 3. Optimize Body Parsing

Ensure streaming body parser is efficient:

- Minimize buffer allocations
- Use async iteration properly
- Handle backpressure correctly

### 4. Review Error Handling

Ensure error paths are fast:

- Avoid expensive stack trace generation
- Cache error responses where possible
- Use efficient error serialization

### 5. Test Protocol Performance

Compare HTTP/2 vs HTTP/1.1:

```typescript
// In http2-adapter.ts
const adapter = new HTTP2Adapter({
  http2: false, // Force HTTP/1.1
  // ...
})
```

## Results Storage

All results are saved to `apps/api/performance-results/`:

```
performance-results/
├── express-health-2024-01-15T10-30-00-000Z.json
├── express-session-2024-01-15T10-35-00-000Z.json
├── native-health-2024-01-15T10-40-00-000Z.json
├── native-session-2024-01-15T10-45-00-000Z.json
└── summary-2024-01-15T10-50-00-000Z.json
```

### Result File Format

```json
{
  "implementation": "express",
  "endpoint": "health",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "results": [
    {
      "concurrency": 10,
      "result": {
        "totalRequests": 37500,
        "successfulRequests": 37500,
        "failedRequests": 0,
        "duration": 30.05,
        "requestsPerSecond": 1248.13,
        "p50": 7.85,
        "p95": 12.3,
        "p99": 15.8,
        "minLatency": 5.2,
        "maxLatency": 25.4,
        "avgLatency": 8.02
      }
    }
  ]
}
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Performance Tests

on:
  pull_request:
    paths:
      - 'apps/api/src/**'

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '24'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Run performance tests
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          cd apps/api
          pnpm tsx src/test/performance/compare-implementations.ts

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: apps/api/performance-results/
```

## Best Practices

1. **Run tests multiple times**: Performance can vary, run 3-5 times and average
2. **Use consistent environment**: Same hardware, same load, same time of day
3. **Monitor system resources**: Check CPU, memory, network during tests
4. **Document baseline**: Keep historical results for trend analysis
5. **Test before merging**: Run performance tests on all significant changes
6. **Set realistic thresholds**: 10% is reasonable for most use cases
7. **Profile when failing**: Don't guess, use profiler to find bottlenecks

## Support

If you encounter issues:

1. Check the [README](src/test/performance/README.md) for detailed information
2. Review server logs for errors or warnings
3. Verify environment configuration
4. Ensure Node.js 24+ is installed
5. Check system resources are not constrained

## References

- [Requirements Document](.kiro/specs/express-to-native-routing-migration/requirements.md)
- [Design Document](.kiro/specs/express-to-native-routing-migration/design.md)
- [Tasks Document](.kiro/specs/express-to-native-routing-migration/tasks.md)
- [Performance Test README](src/test/performance/README.md)
