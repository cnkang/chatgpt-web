# Task 11.4: Verify Performance Baseline - Summary

## Status: Infrastructure Complete - Manual Testing Required

This task requires **manual execution** because:

1. Performance tests need real server processes running
2. Load testing requires sustained connections over 30+ seconds
3. Results need to be compared across two different server implementations
4. The testing process requires starting/stopping servers between tests

## What Was Completed

### 1. Load Testing Infrastructure ✓

Created comprehensive load testing tools:

- **`load-test.ts`**: Core load testing implementation using Node.js native fetch
  - Tests throughput (requests per second)
  - Measures latency (p50, p95, p99)
  - Supports configurable concurrency (10, 50, 100 connections)
  - Runs for 30 seconds per test
  - Saves results to JSON files

- **`analyze-results.ts`**: Results comparison and analysis
  - Compares Express vs Native implementations
  - Calculates percentage differences
  - Validates 10% threshold requirement
  - Generates pass/fail status for each metric

- **`run-performance-tests.sh`**: Convenience script for running tests
  - Checks if server is running
  - Runs tests for all endpoints
  - Provides clear instructions

- **`validate-setup.ts`**: Environment validation
  - Checks Node.js version (24+)
  - Verifies .env configuration
  - Validates script permissions
  - Confirms server files exist

### 2. Documentation ✓

Created comprehensive documentation:

- **`PERFORMANCE_TESTING.md`**: Complete testing guide
  - Step-by-step instructions
  - Troubleshooting section
  - Results interpretation
  - CI/CD integration examples

- **`README.md`**: Quick reference in test directory
  - Test metrics explanation
  - Success criteria
  - File descriptions

- **`.env.test.example`**: Template configuration
  - Minimal settings for testing
  - High rate limits for load testing
  - Clear comments

### 3. Environment Setup ✓

- Created `.env` file with test configuration
- Created `performance-results/` directory for storing results
- Made shell script executable
- Validated complete setup

## What Needs to Be Done Manually

### Prerequisites

**IMPORTANT**: Replace the placeholder API key in `apps/api/.env`:

```bash
# Edit apps/api/.env and replace:
OPENAI_API_KEY=sk-test-placeholder-key-replace-with-real-key

# With a real OpenAI API key:
OPENAI_API_KEY=sk-your-actual-openai-api-key-here
```

### Step-by-Step Testing Process

#### 1. Test Express Implementation (~8 minutes)

```bash
# Terminal 1: Start Express server
cd apps/api
pnpm dev

# Wait for: "Server is running on port 3002"

# Terminal 2: Run Express tests
cd apps/api
./src/test/performance/run-performance-tests.sh express

# Wait for tests to complete (~6-8 minutes)

# Terminal 1: Stop server (Ctrl+C)
```

#### 2. Test Native Implementation (~8 minutes)

```bash
# Terminal 1: Start Native server
cd apps/api
pnpm esno src/index-native.ts

# Wait for: "Server started successfully on port 3002"

# Terminal 2: Run Native tests
cd apps/api
./src/test/performance/run-performance-tests.sh native

# Wait for tests to complete (~6-8 minutes)

# Terminal 1: Stop server (Ctrl+C)
```

#### 3. Compare Results (~1 minute)

```bash
cd apps/api
./src/test/performance/run-performance-tests.sh compare
```

### Expected Results

The comparison will show:

```
Performance Comparison: Express vs Native
Threshold: Native must be within 10% of Express baseline
================================================================================

Endpoint: health | Concurrency: 10
--------------------------------------------------------------------------------

Throughput (Requests/sec):
  Express: XXXX.XX req/s | Native: XXXX.XX req/s | Diff: ±XX.XX req/s (±X.XX%) ✓/✗

Latency p50 (median):
  Express: XX.XXms | Native: XX.XXms | Diff: ±X.XXms (±X.XX%) ✓/✗

Latency p95:
  Express: XX.XXms | Native: XX.XXms | Diff: ±X.XXms (±X.XX%) ✓/✗

Latency p99:
  Express: XX.XXms | Native: XX.XXms | Diff: ±X.XXms (±X.XX%) ✓/✗

Overall: ✓ PASS / ✗ FAIL
```

### Success Criteria

Task 11.4 **PASSES** if:

1. ✓ All Express tests complete successfully (0 failed requests)
2. ✓ All Native tests complete successfully (0 failed requests)
3. ✓ Native throughput (RPS) is ≥ 90% of Express baseline
4. ✓ Native latency (p50, p95, p99) is ≤ 110% of Express baseline
5. ✓ All metrics show ✓ (within threshold)

Task 11.4 **FAILS** if:

1. ✗ Any tests have failed requests
2. ✗ Native throughput is < 90% of Express baseline
3. ✗ Native latency is > 110% of Express baseline
4. ✗ Any metrics show ✗ (exceeds threshold)

## Files Created

```
apps/api/
├── .env                                          # Test environment config
├── PERFORMANCE_TESTING.md                        # Complete testing guide
├── TASK_11.4_SUMMARY.md                         # This file
├── performance-results/                          # Results storage
│   └── .gitkeep
└── src/test/performance/
    ├── README.md                                 # Quick reference
    ├── .env.test.example                         # Template config
    ├── load-test.ts                              # Core load testing
    ├── analyze-results.ts                        # Results comparison
    ├── compare-implementations.ts                # Automated testing (optional)
    ├── run-performance-tests.sh                  # Convenience script
    └── validate-setup.ts                         # Setup validation
```

## Validation

Run the validation script to confirm setup:

```bash
cd apps/api
pnpm esno src/test/performance/validate-setup.ts
```

Expected output:

```
✓ Node.js version: v24.13.0
✓ .env file configured
✓ performance-results directory exists
✓ run-performance-tests.sh is executable
✓ Both server implementations found

✓ All checks passed! Ready to run performance tests.
```

## Troubleshooting

### Common Issues

1. **Server won't start**: Check OPENAI_API_KEY in .env
2. **Port already in use**: Kill process on port 3002 or change PORT in .env
3. **Tests can't connect**: Ensure server is fully started before running tests
4. **High variance**: Close other applications, run multiple times
5. **Native fails threshold**: Check server logs, profile code, review recent changes

See `PERFORMANCE_TESTING.md` for detailed troubleshooting.

## Next Steps

After completing manual testing:

1. **If tests PASS**:
   - Document results in task completion report
   - Proceed to Task 11.5 (Verify code quality and configuration)
   - Save performance results for future reference

2. **If tests FAIL**:
   - Review server logs for errors
   - Profile native implementation to find bottlenecks
   - Optimize identified performance issues
   - Re-run tests until passing

## Time Estimate

- Setup validation: 2 minutes
- Express testing: 8 minutes
- Native testing: 8 minutes
- Results comparison: 1 minute
- **Total: ~20 minutes**

## Notes

- Tests use real HTTP requests to measure actual performance
- Results may vary based on system load and network conditions
- Run tests multiple times for statistical significance
- Keep results for historical comparison
- Performance baseline is critical for migration validation

## References

- [Requirements Document](../../.kiro/specs/express-to-native-routing-migration/requirements.md) - Requirement 11.4
- [Design Document](../../.kiro/specs/express-to-native-routing-migration/design.md) - Performance Baseline section
- [Tasks Document](../../.kiro/specs/express-to-native-routing-migration/tasks.md) - Task 11.4
- [Performance Testing Guide](PERFORMANCE_TESTING.md) - Complete instructions
