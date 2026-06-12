# SAPM Execution Tracker (Q3 2026)

Last updated: 2026-06-12 (post frontend-prod-gate baseline capture)  
Branch: feat/plan-execution-tracker-2026-06-12

## Purpose

Track execution of the remediation plan across:

- Frontend stylesheet containment and performance hygiene
- Rust datapath AF_XDP completion and truth-in-benchmarking
- Agent autonomy and orchestrator placeholder closure
- Test coverage expansion on critical paths
- Mainnet hardening and launch-governance closure

This tracker is operational and owner-oriented. It complements:

- `docs/PRODUCTION_STATUS.md`
- `docs/PRODUCTION_READINESS_CHECKLIST.md`
- `docs/ORCHESTRATOR_PLACEHOLDER_TRIAGE.md`
- `docs/PERFORMANCE_BENCHMARKS.md`

## Workstream Status (RAG)

| ID | Workstream | Owner | Status | Target Window | Current Focus |
| --- | --- | --- | --- | --- | --- |
| WS-1 | Frontend stylesheet containment | Frontend Platform | Green | 2026-06-12 to 2026-06-26 | Baseline + containment complete; monitor budgets and regressions |
| WS-2 | AF_XDP datapath implementation | Datapath Team | Green | 2026-06-15 to 2026-07-31 | Design, command matrix, and reporting template complete; implementation remains |
| WS-3 | Agent autonomy hardening | Orchestrator Team | Green | 2026-06-15 to 2026-08-05 | Placeholder reconciliation, closure wave, and regression mapping completed |
| WS-4 | Critical-path testing expansion | QA + SRE | Green | 2026-06-12 to 2026-07-25 | Matrix defined and CI critical-path summary artifact wired |
| WS-5 | Mainnet readiness and launch governance | Ops + Security | Red | 2026-07-01 to 2026-09-01 | Burn down checklist and audit gating |

## Execution Milestones

### M1 (Weeks 1-2): Baseline + Containment

- [x] Record frontend stylesheet baseline (style sources, injected groups, page-level impact).
- [x] Create route-scoped approach for Copilot UI styles.
- [x] Add KPI baselines for CSS payload, style-tag count, and render timing.
- [x] Publish initial RAG update in this tracker.

Exit criteria:

- Baseline data captured and linked.
- Scoped implementation path approved by frontend owners.

### M2 (Weeks 3-6): Implementation + Evidence

- [ ] Implement AF_XDP milestone path with runtime fallback.
- [ ] Execute placeholder closures per ORCH IDs with linked tests.
- [ ] Expand integration and E2E tests for market/trader critical flows.
- [ ] Update benchmark documentation with measured, non-theoretical results.

Exit criteria:

- First AF_XDP implementation merged behind guardrails.
- Security-sensitive placeholders closed or risk-accepted with owner sign-off.

### M3 (Weeks 7-12): Hardening + Launch Gate

- [x] Complete readiness checklist owner assignment and due dates.
- [ ] Close or explicitly accept audit findings with documented rationale.
- [ ] Run release dress rehearsal with rollback drill evidence.
- [ ] Produce Go/No-Go package for launch governance review.

Exit criteria:

- Production readiness checklist is actionable and mostly complete.
- Launch gate package is reviewable and evidence-backed.

## KPI Dashboard

Track weekly and update in-place.

| KPI | Baseline | Current | Target | Notes |
| --- | --- | --- | --- | --- |
| Frontend global style injections on markets route | Copilot global stylesheet was always-on pre-containment | Copilot stylesheet is now conditional on panel-open | Decrease week-over-week | Source moved from global import to scoped link in layout |
| Frontend CSS payload (markets route) | CSS files=2, total=44,730 bytes, largest=25,157 bytes | CSS files=2, total=44,730 bytes, largest=25,157 bytes | <= baseline - 20% | Baseline captured from `npm run check:frontend:prod` + CSS budget script |
| Datapath p95 latency | Socket-path benchmarks per `docs/PERFORMANCE_BENCHMARKS.md` | TBD | Defined per environment | Distinguish socket path vs AF_XDP path |
| Datapath throughput | Theoretical AF_XDP figures documented; measured socket path only | TBD | Measured, not projected | Include hardware profile |
| Open orchestrator placeholder items (critical) | TBD | TBD | 0 critical open | Link ORCH IDs |
| Critical-path automated test pass rate | release-check test gate currently green | release-check test gate currently green | >= 99% | Add flake-rate metric in WS-4.1/WS-4.2 |
| Readiness checklist completion | 1.52% (1/66 checked) | 1.52% (1/66 checked) | >= 90% before Go/No-Go | Baseline computed from checklist markdown state |

## Immediate Tasks (Execution Queue)

### Frontend Style Hygiene

- [x] WS-1.1: Enumerate all global CSS imports in `frontend/src/app/layout.tsx` and classify by source.
- [x] WS-1.2: Propose route-level style scoping for Copilot UI surfaces.
- [x] WS-1.3: Add CI budget check for CSS and style-tag count.

WS-1.1 baseline notes:

- Global imports observed in `frontend/src/app/layout.tsx`: `@copilotkit/react-ui/styles.css` and local `./globals.css`.
- Copilot UI styling is currently global and likely contributes utility-class stylesheet groups in rendered output.
- Markets UI uses local design classes defined in `frontend/src/app/globals.css` (e.g., `liquid-*`), so scoping third-party styles is low-risk if limited to Copilot surfaces.

WS-1.2 implementation notes:

- Removed global `@copilotkit/react-ui/styles.css` import from `frontend/src/app/layout.tsx`.
- Added conditional stylesheet link (`/copilotkit-scoped.css`) loaded only when Copilot panel is open.
- Copilot CSS asset copied to `frontend/public/copilotkit-scoped.css` from package dist output for stable runtime loading.

WS-1.3 implementation notes:

- Added `scripts/check_frontend_css_budget.sh` to enforce CSS file count/size budgets on built frontend assets.
- Wired CSS budget check into `scripts/frontend_production_gate.sh` so CI and release checks fail on budget regressions.

### Datapath + Benchmark Integrity

- [x] WS-2.1: Document current socket-path benchmark command matrix.
- [x] WS-2.2: Create AF_XDP implementation design note with feature flag strategy.
- [x] WS-2.3: Add benchmark reporting template with commit SHA and environment metadata.

WS-2.1 implementation notes:

- Added socket-path benchmark command matrix to `docs/PERFORMANCE_BENCHMARKS.md`.
- Mapped each command to primary metrics, output artifacts, and owner.
- Added explicit policy that AF_XDP theoretical values must not be presented as current measurements.

WS-2.2 implementation notes:

- Added AF_XDP implementation design doc at `docs/AF_XDP_IMPLEMENTATION_DESIGN.md`.
- Defined runtime modes, feature flag strategy, telemetry requirements, rollout milestones, and rollback plan.

WS-2.3 implementation notes:

- Added benchmark reporting template at `docs/BENCHMARK_REPORT_TEMPLATE.md`.
- Standardized required metadata: commit SHA, environment, workload parameters, artifact links, and claim-safety section.

### Orchestrator + Autonomy

- [x] WS-3.1: Reconcile ORCH placeholder table with current code state.
- [x] WS-3.2: Mark critical security-sensitive items for first closure wave.
- [x] WS-3.3: Ensure each closure has linked regression tests.

WS-3.1 implementation notes:

- Added 2026-06-12 reconciliation section in `docs/ORCHESTRATOR_PLACEHOLDER_TRIAGE.md`.
- Reclassified ORCH-001..ORCH-009 into closed-in-code vs partial with explicit evidence and gaps.

WS-3.2 implementation notes:

- Added first closure wave with prioritized ORCH IDs (P0/P1), owners, and target dates.
- Prioritized cryptographic and attestation risks for earliest closure.

WS-3.3 implementation notes:

- Added regression test mapping table tying each ORCH ID to current test evidence and missing tests.
- Captured orchestrator regression baseline: `npm --prefix agents/orchestrator test` => 6 suites, 109 tests, 109 passed.
- Expanded security-hardening regression fixtures for peer-key endpoint resilience and resource guard checks.
- Updated orchestrator regression baseline after expansion: 6 suites, 115 tests, 115 passed.
- Implemented ORCH-009 discovery key-confirmation guard and fail-closed mismatch handling in discovery manager.
- Added dedicated discovery-manager regression tests for key-confirmation success and mismatch failure.
- Updated orchestrator regression baseline after discovery hardening: 7 suites, 117 tests, 117 passed.
- Implemented ORCH-001 hybrid KEX provider seam with strict session material validation and fail-closed behavior.
- Added deterministic security-hardening tests for provider seam success path and invalid-session fail-closed path.
- Updated orchestrator regression baseline after ORCH-001 seam wave: 7 suites, 119 tests, 119 passed.
- Implemented ORCH-004 staging attestation fixture ingestion with digest validation and fail-closed mismatch handling.
- Added security-hardening tests for valid staging fixture ingestion and invalid digest rejection.
- Updated orchestrator regression baseline after ORCH-004 staging fixture wave: 7 suites, 121 tests, 121 passed.
- Replaced ad hoc ORCH-004 temp-file fixtures with committed reusable staging attestation samples under `agents/orchestrator/test/fixtures/`.
- Implemented ORCH-005 trusted-root attestation policy enforcement with configured root fingerprint allowlisting.
- Added security-hardening tests for trusted-root accept and reject behavior.
- Updated orchestrator regression baseline after ORCH-005 trust policy wave: 7 suites, 123 tests, 123 passed.
- Added operator-facing fixture contract documentation in `agents/orchestrator/test/fixtures/README.md` for staged attestation and trusted-root rehearsal.
- Added ORCH-002 negative-path regression coverage for missing attestation digest during proof verification.
- Updated orchestrator regression baseline after ORCH-002 coverage wave: 7 suites, 124 tests, 124 passed.
- Added ORCH-003 live local registry-style endpoint coverage for signed peer-key fetch and verification.
- Updated orchestrator regression baseline after ORCH-003 coverage wave: 7 suites, 125 tests, 125 passed.
- Added ORCH-006 explicit reachability status-code matrix coverage for 200/404/503 probe semantics.
- Updated orchestrator regression baseline after ORCH-006 coverage wave: 7 suites, 126 tests, 126 passed.
- Added ORCH-007 hugepage threshold variant coverage for below-threshold, threshold-met, and zero-free-pages cases.
- Updated orchestrator regression baseline after ORCH-007 coverage wave: 7 suites, 128 tests, 128 passed.
- Implemented ORCH-008 cgroup-v2-aware CPU pinning evaluation and added matching regression coverage.
- Updated orchestrator regression baseline after ORCH-008 coverage wave: 7 suites, 130 tests, 130 passed.

### Testing + Readiness

- [x] WS-4.1: Define critical-path test matrix (market create/trade/settle/dispute + failure recovery).
- [x] WS-4.2: Wire matrix status into CI output summary.
- [x] WS-5.1: Add owner/due-date columns to `docs/PRODUCTION_READINESS_CHECKLIST.md` process.

WS-4.1 critical-path test matrix:

| Flow | Scope | Primary Checks | Current Automation | Evidence Source | Owner |
| --- | --- | --- | --- | --- | --- |
| Market data ingestion and display | Frontend + API | `/api/markets` response health, fallback behavior, route render success | Partial | `npm run check:frontend:prod`, `/api/markets` route build output | Frontend Platform |
| Trader decision pipeline | Agent runtime | Forecast-to-trade path correctness, risk checks, decision logging | Strong | `npm run test:all` (trader + aggregator + orchestrator suites) | Trader Team |
| Trade execution resilience | Runtime + infra | Load behavior, error rates, bounded failure handling | In Progress | `npm run test:load`, `npm run test:chaos` | QA + SRE |
| Settlement and post-trade integrity | Data + logging | Audit trail persistence and canonical schema consistency | In Progress | `npm run check:schemas`, logger tests | Data + Compliance |
| Failure recovery and rollback readiness | Ops + release | Release gate pass/fail, rollback drill readiness indicators | In Progress | `npm run release:check`, readiness checklist | Platform PMO + Ops |

WS-4.1 status notes:

- Critical path domains are now explicitly defined with owner and evidence source.
- WS-4.2 is complete via CI `critical-path-summary` job in `.github/workflows/ci.yml` that publishes a `critical-path-summary` artifact.
- Added orchestrator flake-rate probe wiring (`scripts/compute_test_flake_rate.sh`) and embedded flake metrics in the CI critical-path summary artifact.
- Added configurable flake gating in CI (`FLAKE_GATING`, `FLAKE_RATE_MAX`, `FLAKE_PROBE_RUNS`) with warn-only vs enforced behavior.
- Added resilience metric synthesis (`scripts/summarize_resilience_reports.js`) so the critical-path summary artifact includes chaos pass/fail and load throughput/latency evidence.

## Risk Register (Active)

| Risk ID | Description | Severity | Mitigation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| R-001 | Global style bleed from framework/library CSS impacts markets route consistency | Medium | Route-scoped style loading + regression snapshots | Frontend Platform | Open |
| R-002 | AF_XDP claims diverge from measured implementation status | High | Enforce evidence-linked benchmark reporting | Datapath Team | Open |
| R-003 | Security-sensitive placeholder logic remains in orchestration path | High | ORCH critical closure wave + tests + sign-off | Orchestrator Team | Open |
| R-004 | Incomplete critical-path coverage allows regressions into release | High | Coverage floors + deterministic E2E scenarios | QA + SRE | Open |
| R-005 | Mainnet checklist closure lags launch narrative | High | Weekly governance review and explicit Go/No-Go gate | Ops + Security | Open |

## Change Log

- 2026-06-12: Tracker created on `feat/plan-execution-tracker-2026-06-12`.
- 2026-06-12: Completed WS-1.1 baseline style-source inventory; identified global Copilot UI stylesheet as primary external style injector.
- 2026-06-12: Completed WS-1.2 by removing global Copilot style injection and using conditional scoped stylesheet loading.
- 2026-06-12: Completed WS-1.3 by adding frontend CSS budget gate script and integrating it into frontend production gate.
- 2026-06-12: Completed WS-5.1 by adding accountability tracker (owner/due-date/status/evidence) to production readiness checklist.
- 2026-06-12: Captured frontend production baseline from gate run: build success, CSS budget PASS, CSS files=2, total CSS bytes=44,730, largest CSS=25,157 bytes.
- 2026-06-12: Completed M1 KPI baseline and initial RAG publication updates.
- 2026-06-12: Verified frontend production gate PASS with Next.js build success and CSS budget PASS in terminal execution output.
- 2026-06-12: Completed M3 readiness ownership setup by assigning domain owners and due dates in production readiness accountability tracker.
- 2026-06-12: Completed WS-2.1 by adding socket-path benchmark command matrix and measurement policy to performance benchmarks documentation.
- 2026-06-12: Completed WS-4.1 by defining critical-path test matrix with owners, current automation state, and evidence sources.
- 2026-06-12: Completed WS-2.2 by adding AF_XDP implementation design with feature-flagged rollout and fallback strategy.
- 2026-06-12: Completed WS-2.3 by adding standardized benchmark report template with required evidence fields.
- 2026-06-12: Completed WS-4.2 by adding CI critical-path-summary job and published summary artifact wiring.
- 2026-06-12: Added WS-4 flake-rate automation by wiring orchestrator rerun probe metrics into critical-path summary + artifact uploads.
- 2026-06-12: Added WS-4 flake-rate threshold gating with configurable enforcement mode and max-rate policy in CI.
- 2026-06-12: Expanded WS-4 critical-path summary artifact with parsed chaos/load resilience metrics and uploaded resilience-summary artifact.
- 2026-06-12: Completed WS-3.1 by reconciling ORCH placeholder ledger with current orchestrator/discovery code paths.
- 2026-06-12: Completed WS-3.2 by defining first placeholder-closure wave with priority, owner, and date.
- 2026-06-12: Completed WS-3.3 by mapping ORCH items to regression coverage and recording current orchestrator test baseline (109/109 pass).
- 2026-06-12: Added WS-3 regression expansion fixtures and updated orchestrator test evidence baseline to 115/115 pass.
- 2026-06-12: Added ORCH-009 discovery key-confirmation hardening and raised orchestrator regression evidence baseline to 117/117 pass.
- 2026-06-12: Added ORCH-001 hybrid-provider integration seam and raised orchestrator regression evidence baseline to 119/119 pass.
- 2026-06-12: Added ORCH-004 staging attestation fixture validation and raised orchestrator regression evidence baseline to 121/121 pass.
- 2026-06-12: Added committed ORCH-004 staging attestation fixture samples and removed temporary runtime fixture creation from tests.
- 2026-06-12: Added ORCH-005 trusted-root attestation policy enforcement and raised orchestrator regression evidence baseline to 123/123 pass.
- 2026-06-12: Added orchestrator fixture README documenting staged attestation JSON contract and trusted-root rehearsal inputs.
- 2026-06-12: Added ORCH-002 missing-attestation-digest regression coverage and raised orchestrator regression evidence baseline to 124/124 pass.
- 2026-06-12: Added ORCH-003 live registry-style endpoint regression coverage and raised orchestrator regression evidence baseline to 125/125 pass.
- 2026-06-12: Added ORCH-006 reachability status-code matrix regression coverage and raised orchestrator regression evidence baseline to 126/126 pass.
- 2026-06-12: Added ORCH-007 hugepage threshold variant coverage and raised orchestrator regression evidence baseline to 128/128 pass.
- 2026-06-12: Added ORCH-008 cgroup-v2 CPU pinning coverage and raised orchestrator regression evidence baseline to 130/130 pass.
