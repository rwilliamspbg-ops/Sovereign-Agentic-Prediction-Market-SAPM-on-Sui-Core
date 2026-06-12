# SAPM Performance Benchmarks

Last updated: 2026-06-07

## Current Production Path Benchmarks

These measure the running system — frontend, agent API paths, and trade execution —
on the current socket-based datapath.

| Area | Metric | Target | Current Notes |
| --- | --- | --- | --- |
| Frontend initial load | Time to interactive | ≤ 5.0 s | ~6.1 s on demo profile (TTI optimization in progress) |
| Trade execution (wallet + RPC) | P95 end-to-end latency | ≤ 2.5 s | Depends on wallet approval and Sui RPC conditions |
| Model prediction request | P95 response latency | ≤ 1.5 s | Circuit breaker + 1.2 s timeout configured |
| MCP market-data endpoint | Concurrent stability | No error spikes at 3 parallel | Semaphore-based limiter active |
| DeepBook preflight check | P95 | ≤ 800 ms | Includes pool object fetch + balance query |
| Walrus snapshot publish | P95 | ≤ 3 s | Subject to Walrus network conditions |

## AF_XDP / Kernel-Bypass Architecture (Planned)

The README and architecture documentation reference AF_XDP zero-copy networking
with headline figures of 128.4 GiB/s throughput and 8 μs p99 latency.

**These are theoretical hardware ceilings, not measured results.**

They represent the line-rate limit of 3×100GbE NICs running a fully-implemented
AF_XDP path with hugepages and CPU affinity tuning. The current `rust-datapath/`
crate scaffolds this architecture but implements a standard socket path.
The AF_XDP implementation is a planned milestone tracked in `docs/PHASE_4_PLAN.md`.

The CPU utilization figure (23% vs 68% baseline) and latency improvement
(-82% to 8 μs p99) are projections based on published AF_XDP literature and
measurements from comparable packet-forwarding workloads, not SAPM-specific runs.

Do not cite these figures as current SAPM benchmarks.

## How to Run Current Benchmarks

### Socket-Path Benchmark Command Matrix (WS-2.1)

Use this matrix as the canonical command set for current (non-AF_XDP) measurements.

| Area | Command | Primary Metrics | Output Artifact | Owner |
| --- | --- | --- | --- | --- |
| Frontend production gate | `npm run check:frontend:prod` | Build success/failure, generated route footprint, CSS budget (files/bytes/largest) | `artifacts/ci-logs/frontend-prod-gate.log` (CI) | Frontend Platform |
| Frontend bundle analysis | `npm --prefix frontend run analyze` | Bundle composition and size deltas | Next analyze output (local) | Frontend Platform |
| Trader load behavior | `npm run test:load` | Latency distribution under load, error rate, throughput trend | `artifacts/ci-logs/load-tests.log`, `artifacts/ci-logs/load-report.json` (CI) | QA + SRE |
| Aggregator benchmark | `npm run bench:aggregator` | Aggregation latency and throughput profile | Console benchmark output | Datapath Team |
| Chaos resilience baseline | `npm run test:chaos` | Failure handling behavior, degradation characteristics | `artifacts/ci-logs/chaos-tests.log`, `artifacts/ci-logs/chaos-report.json` (CI) | QA + SRE |
| Release gate baseline | `npm run release:check` | End-to-end readiness gate pass/fail | `artifacts/ci-logs/release-check.log` (CI) | Platform PMO |

Benchmark policy:

- Use this command matrix for all socket-path baseline captures until AF_XDP path is implemented.
- Include commit SHA, environment, and command used in every benchmark report.
- Do not present AF_XDP theoretical values as current measured performance.

### Frontend bundle analysis

```bash
cd frontend
npm run analyze
```

### Frontend type/build gate

```bash
cd frontend
npm run type-check -- --pretty false
npm run build
```

### Agent load test

```bash
node scripts/load_test_trading.js
```

### Aggregator benchmark

```bash
node scripts/benchmark_aggregator.js
```

## Reporting Format

For each benchmark run, capture:

- Commit SHA
- Environment (local / staging / testnet)
- Request volume and concurrency
- p50, p95, p99 latency
- Success/failure counts
- Top three bottlenecks and follow-up tasks
