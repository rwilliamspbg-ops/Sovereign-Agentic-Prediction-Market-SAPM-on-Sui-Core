#!/usr/bin/env bash
# check_test_coverage_floor.sh
# Validates that the orchestrator test suite meets the minimum test count floor.
# Exits non-zero if the floor is not met so this can be used as a CI gate.
# Usage: scripts/check_test_coverage_floor.sh [min_tests]

set -euo pipefail

MIN_TESTS="${1:-${COVERAGE_MIN_TESTS:-145}}"
TEST_DIR="agents/orchestrator"

echo "Running orchestrator tests to collect coverage evidence..."
OUTPUT=$(npm --prefix "$TEST_DIR" test 2>&1)

TOTAL=$(echo "$OUTPUT" | grep -E "^Tests:" | grep -oP '\d+ passed' | grep -oP '\d+' || true)
SUITES=$(echo "$OUTPUT" | grep -E "^Test Suites:" | grep -oP '\d+ passed' | grep -oP '\d+' || true)

if [[ -z "$TOTAL" ]]; then
  echo "FAIL: Could not parse test count from output."
  echo "$OUTPUT" | tail -20
  exit 1
fi

echo "Orchestrator test result: suites=${SUITES:-?}, tests=${TOTAL}"

if [[ "$TOTAL" -lt "$MIN_TESTS" ]]; then
  echo "FAIL: Test count ${TOTAL} is below floor ${MIN_TESTS}."
  exit 1
fi

echo "PASS: Test count ${TOTAL} meets floor ${MIN_TESTS}."
