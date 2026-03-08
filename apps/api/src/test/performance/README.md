# Performance Testing

This directory contains load testing tools to compare the performance of the Express and Native implementations.

## Overview

The performance tests verify that the native Node.js HTTP/2 implementation meets the requirement that performance must be within 10% of the Express baseline.

## Test Metrics

The following metrics are measured and compared:

1. **Throughput (RPS)**: Requests per second
2. **Latency p50**: Median response time
3. **Latency p95**: 95th percentile response time
4. **Latency p99**: 99th percentile response time

## Test Configuration

- **Duration**: 30 seconds per test
- **Concurrency levels**: 10, 50, 100 concurrent connections
- **Endpoints tested**:
  - `/api/health` - Simple health check (no auth)
  - `/api/session` - Session endpoint (no auth, JSON response)

## Running Performance Tests

### Prerequisites

1. Ensure the API server is not running
2. Make sure you have a `.env` file configured in `apps/api/`

### Step-by-Step Instructions

#### 1. Test Express Implementation

```bash
# Start the Express server
cd apps/api
pnpm dev

# In another terminal, run the Express tests
cd apps/api
./src/test/performance/run-performance-tests.sh express

# Stop the server (Ctrl+C)
```

#### 2. Test Native Implementation

```bash
# Start the Native server
cd apps/api
pnpm esno src/index-native.ts

# In another terminal, run the Native tests
cd apps/api
./src/test/performance/run-performance-tests.sh native

# Stop the server (Ctrl+C)
```

#### 3. Compare Results

```bash
cd apps/api
./src/test/performance/run-performance-tests.sh compare
```

## Understanding Results

### Success Criteria

The native implementation passes if ALL of the following are true:

- **Throughput (RPS)**: Native is not more than 10% slower than Express
- **Latency p50**: Native is not more than 10% higher than Express
- **Latency p95**: Native is not more than 10% higher than Express
- **Latency p99**: Native is not more than 10% higher than Express

### Example Output

```
Performance Comparison: Express vs Native
Threshold: Native must be within 10% of Express baseline
================================================================================

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

### Interpreting Differences

- **Positive RPS difference**: Native is faster (good)
- **Negative RPS difference**: Native is slower (acceptable if within 10%)
- **Positive latency difference**: Native is slower (acceptable if within 10%)
- **Negative latency difference**: Native is faster (good)

## Files

- `load-test.ts` - Core load testing implementation
- `analyze-results.ts` - Results comparison and analysis
- `run-performance-tests.sh` - Convenience script for running tests
- `compare-implementations.ts` - Automated testing (requires server management)

## Results Storage

All test results are saved to `apps/api/performance-results/`:

- `express-{endpoint}-{timestamp}.json` - Express test results
- `native-{endpoint}-{timestamp}.json` - Native test results
- `summary-{timestamp}.json` - Comparison summary

## Troubleshooting

### Server Not Running

```
Error: Server is not running on port 3002
```

**Solution**: Start the appropriate server before running tests.

### No Results Found

```
✗ No Express results found for health
```

**Solution**: Run the Express tests first before comparing.

### Tests Failing

If tests fail (native performance is not within 10%):

1. Check server logs for errors or warnings
2. Ensure no other processes are consuming resources
3. Run tests multiple times to account for variance
4. Check if the server is under unusual load
5. Verify network conditions are stable

## Manual Testing

You can also run individual load tests manually:

```bash
# Test Express health endpoint
pnpm tsx src/test/performance/load-test.ts express health

# Test Native session endpoint
pnpm tsx src/test/performance/load-test.ts native session
```

## CI/CD Integration

To integrate into CI/CD pipelines:

```bash
# Run automated comparison (requires server management)
pnpm tsx src/test/performance/compare-implementations.ts
```

Note: The automated script starts and stops servers automatically but may be less reliable than manual testing.

## Performance Optimization Tips

If the native implementation fails to meet the 10% threshold:

1. **Profile the code**: Use Node.js profiler to identify bottlenecks
2. **Check middleware overhead**: Ensure middleware is efficient
3. **Review body parsing**: Verify streaming body parser is optimal
4. **Examine error handling**: Ensure error paths are not slowing down requests
5. **Test HTTP/2 vs HTTP/1.1**: Compare protocol performance
6. **Monitor memory usage**: Check for memory leaks or excessive allocations

## Notes

- Tests use Node.js native `fetch()` API (Node.js 24+)
- Results may vary based on system load and network conditions
- Run tests multiple times for statistical significance
- Ensure consistent environment between Express and Native tests
