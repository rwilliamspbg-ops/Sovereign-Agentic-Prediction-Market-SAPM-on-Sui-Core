# SAPM Performance Benchmarks

Last updated: 2026-06-07

## Objective

Track latency, throughput, and reliability of critical user and agent paths.

## Benchmark Matrix

| Area | Metric | Target | Current Notes |
| --- | --- | --- | --- |
| Frontend initial load | Time to interactive | <= 5.0s | Previously observed around 6.1s on demo profile |
| Trade execution API path | P95 end-to-end latency | <= 2.5s | Depends on wallet approval and RPC conditions |
| Model prediction request | P95 response latency | <= 1.5s | Circuit breaker + timeout configured |
| MCP market-data endpoint | Concurrent request stability | No error spikes at 3 parallel | Semaphore-based limiter added |

## How to Run

### Frontend bundle/profile

1. cd frontend
2. npm run analyze

### Frontend type/build gate

1. cd frontend
2. npm run type-check -- --pretty false
3. npm run build

### Load test harness

Planned script path: scripts/load_test_trading.js

Suggested command:

1. node scripts/load_test_trading.js

## Reporting Format

For each run, capture:

- commit SHA
- environment (local/staging)
- request volume and concurrency
- p50, p95, p99 latency
- success/failure counts
- top three bottlenecks and follow-up tasks

## Next Improvements

1. Add automated trend snapshots to CI artifacts.
2. Integrate frontend PerformanceMonitor output into dashboard export.
3. Add chaos + load suite for RPC timeout and dependency-failure scenarios.
