# SAPM Benchmark Report Template (WS-2.3)

Use this template for every benchmark run (socket-path or AF_XDP).

## 1. Run Metadata

- Date:
- Author:
- Commit SHA:
- Branch:
- Environment: `local` | `staging` | `testnet` | `mainnet-sim`
- Datapath mode: `socket` | `af_xdp`
- AF_XDP interfaces (if applicable):

## 2. Hardware And Runtime Profile

- Host CPU model:
- CPU cores:
- RAM:
- NIC model(s):
- Kernel version:
- Container/runtime settings:
- Relevant environment flags:

## 3. Command Matrix Used

List exact commands executed and order:

1.
2.
3.

Reference command policy in `docs/PERFORMANCE_BENCHMARKS.md`.

## 4. Workload Parameters

- Request volume:
- Concurrency:
- Duration:
- Payload size profile:
- Warmup strategy:

## 5. Results Summary

| Metric          | Value | Unit | Notes |
| --------------- | ----- | ---- | ----- |
| Throughput      |       |      |       |
| Latency p50     |       |      |       |
| Latency p95     |       |      |       |
| Latency p99     |       |      |       |
| Error rate      |       |      |       |
| CPU utilization |       |      |       |

## 6. Artifact Links

- CI log artifact:
- Raw output file(s):
- Dashboard snapshot:
- Related PR/issue:

## 7. Baseline Comparison

Compare against previous approved baseline:

- Baseline report reference:
- Delta summary:
- Significant regressions:
- Significant improvements:

## 8. Risk And Interpretation

- Data quality concerns:
- Environment limitations:
- Confidence level: `low` | `medium` | `high`
- Whether results are safe for external claims: `yes` | `no`

## 9. Follow-Up Actions

- [ ] Action 1 (owner + due date)
- [ ] Action 2 (owner + due date)
- [ ] Action 3 (owner + due date)
