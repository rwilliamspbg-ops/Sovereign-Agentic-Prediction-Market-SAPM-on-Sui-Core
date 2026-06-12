# AF_XDP Implementation Design (WS-2.2)

Last updated: 2026-06-12
Owner: Datapath Team
Status: Planned implementation design approved for execution

## Scope

This design defines the transition from current socket-path datapath to an AF_XDP-backed runtime path with safe fallback and measurable rollout controls.

Out of scope for this phase:

- Claiming production AF_XDP performance before measured evidence exists
- Replacing all socket-path logic in one release

## Goals

- Add AF_XDP runtime path behind a strict feature flag
- Preserve socket-path fallback as default-safe behavior
- Capture evidence-quality benchmarks before changing any public performance claims
- Keep rollout reversible by configuration only

## Runtime Modes

The runtime mode is controlled by environment flags and launch configuration.

| Mode | Flag | Behavior |
| --- | --- | --- |
| Socket (default) | `SAPM_DATAPATH_MODE=socket` | Current production-safe path |
| AF_XDP staged | `SAPM_DATAPATH_MODE=af_xdp` | Attempts AF_XDP path and validates capability checks |
| Auto fallback | `SAPM_DATAPATH_MODE=af_xdp` + fallback enabled | Falls back to socket path on probe/init failure |

Primary interface selection:

- `SAPM_AF_XDP_IFACES=eth0,eth1,...`

## Feature Flag Strategy

1. Phase A: Compile-time and runtime guardrails

- Keep socket path as default.
- Gate AF_XDP initialization behind explicit env flag.
- Add startup capability probe (kernel support, privileges, iface presence).

2. Phase B: Staging canary

- Enable AF_XDP only in staging profile.
- Compare AF_XDP vs socket metrics under identical load profiles.
- Auto-fallback on health check degradation.

3. Phase C: Controlled production introduction

- Enable for a narrow traffic slice or dedicated instance pool.
- Require predefined SLO pass criteria before expansion.

## Safety Requirements

- AF_XDP initialization failure must not crash service startup when fallback is enabled.
- Startup logs must include selected mode, iface list, and fallback reason when triggered.
- Health checks must expose active datapath mode.
- No benchmark headline updates without attached report artifact.

## Telemetry Requirements

At minimum, emit the following labels:

- `datapath_mode` (`socket` or `af_xdp`)
- `af_xdp_init_status` (`success`, `fallback`, `disabled`)
- `af_xdp_fallback_reason` (enum string)

Track these metrics by mode:

- p50/p95/p99 latency
- throughput
- error rate
- CPU utilization

## Implementation Milestones

| Milestone | Deliverable | Exit Criteria |
| --- | --- | --- |
| D1 | Capability probe + mode selection | Service starts with explicit mode and logs selected path |
| D2 | AF_XDP init + fallback | Failures automatically route to socket path |
| D3 | Metric parity dashboard | Socket vs AF_XDP comparison visible and reproducible |
| D4 | Canary policy | Staged rollout policy with rollback trigger merged |

## Rollback Plan

- Set `SAPM_DATAPATH_MODE=socket` and restart service.
- Verify mode telemetry returns to socket-only.
- Attach rollback event note in benchmark report.

## Evidence And Reporting

All AF_XDP test runs must include a report created from:

- `docs/BENCHMARK_REPORT_TEMPLATE.md`

Do not update public throughput/latency claims until:

- At least one reproducible AF_XDP benchmark report is attached
- Report includes commit SHA, hardware profile, and command matrix
