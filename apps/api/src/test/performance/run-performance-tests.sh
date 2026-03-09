#!/bin/bash

# Performance Testing Script for Express vs Native Implementation
#
# This script runs load tests on both implementations and compares results.
# It requires the server to be started manually before running tests.
#
# Usage:
#   1. Start the Express server: pnpm dev (in apps/api)
#   2. Run: ./src/test/performance/run-performance-tests.sh express
#   3. Stop the server
#   4. Start the Native server: pnpm esno src/index-native.ts (in apps/api)
#   5. Run: ./src/test/performance/run-performance-tests.sh native
#   6. Stop the server
#   7. Run: ./src/test/performance/run-performance-tests.sh compare

set -e

IMPLEMENTATION=$1
ENDPOINTS=("health" "session")

if [[ -z "$IMPLEMENTATION" ]]; then
  echo "Usage: $0 <express|native|compare>"
  exit 1
fi

if [[ "$IMPLEMENTATION" = "compare" ]]; then
  echo "Comparing results..."
  pnpm tsx src/test/performance/analyze-results.ts
  exit 0
fi

if [[ "$IMPLEMENTATION" != "express" ]] && [[ "$IMPLEMENTATION" != "native" ]]; then
  echo "Invalid implementation. Must be 'express', 'native', or 'compare'"
  exit 1
fi

echo "Testing $IMPLEMENTATION implementation..."
echo ""

# Check if server is running
if ! curl -s http://localhost:3002/api/health > /dev/null; then
  echo "Error: Server is not running on port 3002" >&2
  echo "Please start the server first:"
  if [[ "$IMPLEMENTATION" = "express" ]]; then
    echo "  pnpm dev"
  else
    echo "  pnpm esno src/index-native.ts"
  fi
  exit 1
fi

echo "Server is running. Starting load tests..."
echo ""

# Run load tests for each endpoint
for endpoint in "${ENDPOINTS[@]}"; do
  echo "Testing endpoint: $endpoint"
  pnpm tsx src/test/performance/load-test.ts "$IMPLEMENTATION" "$endpoint"
  echo ""
  echo "Waiting 5 seconds before next test..."
  sleep 5
done

echo "All tests completed for $IMPLEMENTATION implementation"
echo "Results saved to performance-results/"
echo ""
echo "To compare results, stop the server and run:"
echo "  $0 compare"
