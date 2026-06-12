# SAPM Production Readiness Checklist

Use this checklist as a release gate before any production deployment.

Tracking fields:

- Owner:
- Due date (YYYY-MM-DD):
- Evidence link:

## 1. Governance And Release Control

- [x] Code owners defined for all critical paths (`agents`, `docker`, `scripts`, infrastructure).
- [ ] Branch protection enabled for default branch.
- [ ] Required status checks enforced (tests, lint, security scans).
- [ ] Signed commits and release tags required for release branches.
- [x] Incident commander and escalation matrix documented.
- [x] Rollback authority and rollback SLA documented.

## 2. Architecture And Threat Model

- [x] Current architecture diagram reviewed and approved.
- [x] Threat model completed for agent runtime, wallet management, and on-chain execution.
- [x] Trust boundaries explicitly documented (agent node, RPC, faucet, signing service).
- [x] Abuse cases documented (model poisoning, sybil coordination, key theft, replay attempts).
- [x] Controls mapped to each identified critical threat.

## 3. Identity, Keys, And Secrets

- [x] No private keys or secrets in repository or images.
- [x] Key generation and storage policy approved (HSM/KMS or equivalent).
- [x] Key rotation procedures tested.
- [x] Signing permissions scoped to least privilege.
- [x] Secret distribution and revocation process validated.
- [x] Break-glass credentials audited and stored securely.

## 4. Chain And Transaction Safety

- [x] Explicit network allowlist configured (devnet/testnet/mainnet separation).
- [x] Gas budget, slippage, and risk limits enforced in transaction pipeline.
- [x] Transaction simulation/preflight checks required before execution.
- [x] Replay protection and nonce/state validation implemented.
- [x] Failed transaction retry policy bounded and idempotent.
- [x] On-chain object ownership and capability checks covered by tests.

## 5. Agent Runtime And Model Safety

- [x] Deterministic build and runtime dependencies pinned.
- [x] Input validation and schema checks enforced at boundaries.
- [x] Sandboxing/resource limits applied to model and agent processes.
- [x] Byzantine-tolerance assumptions validated under adversarial tests.
- [x] Reputation/slashing logic tested for false positives and evasion paths.
- [x] Fallback strategy defined when model confidence is low or conflicting.

## 6. Infrastructure, Reliability, And SLOs

- [x] Availability SLOs defined for RPC, agent loop, and transaction execution.
- [x] Error budget policy documented.
- [x] Horizontal scaling and capacity plan validated with load tests.
- [x] Backup and restore tested for stateful components.
- [x] Disaster recovery tested with target RTO and RPO.
- [x] Health checks include deep dependency checks, not only process liveness.

## 7. Observability And Operations

- [x] Structured logging with correlation IDs enabled.
- [x] Metrics published for forecast latency, tx success rate, and RPC error rates.
- [x] Alert thresholds and paging rules tuned and tested.
- [x] Dashboards available for operators and incident response.
- [x] Runbooks available for common failure modes.
- [x] Post-incident review template and process in place.

## 8. Security Assurance

- [x] SAST, dependency, and container scanning active in CI.
- [x] Critical/high vulnerabilities blocked at merge.
- [x] Container images run as non-root where possible.
- [x] Network segmentation and egress controls verified.
- [x] Rate limiting and abuse protection enforced on public interfaces.
- [ ] External penetration test completed for production perimeter.

## 9. Compliance And Data Handling

- [x] Data classification policy applied to all inputs and logs.
- [x] PII handling policy and retention windows enforced.
- [x] Regional/legal restrictions reviewed for deployment geography.
- [x] Audit logs retained and immutable per policy.
- [x] Third-party licenses and attribution reviewed.

## 10. Verification And Testing

- [x] Unit, integration, and end-to-end coverage thresholds met.
- [x] Chaos/fault-injection tests passed for network and dependency failures.
- [x] Soak tests passed at expected production load profile.
- [x] Canary deployment plan tested.
- [x] Rollback drill executed in staging with acceptable recovery time.

## 11. Launch Readiness Review

- [ ] Go/No-Go meeting completed with engineering, security, and ops sign-off.
- [x] Top 5 launch risks documented with mitigation owner and due date.
- [x] Launch-day communication plan and status channel established.
- [x] Success criteria for first 24 hours defined.
- [x] Freeze window and contingency plan approved.

## 12. Post-Launch Controls

- [x] Hypercare on-call schedule published.
- [x] Daily risk review cadence set for first 2 weeks.
- [x] KPI and anomaly thresholds reviewed daily.
- [x] Deferred risks tracked with owner and resolution date.

## Release Sign-Off

- Release candidate:
- Date:
- Engineering approver:
- Security approver:
- Operations approver:
- Product approver:
- Final decision: [ ] Go  [ ] No-Go

## Accountability Tracker

Use this section to assign ownership and due dates for each checklist domain.

| Domain | Owner | Due Date | Status | Evidence |
| --- | --- | --- | --- | --- |
| 1. Governance And Release Control | Platform PMO | 2026-07-05 | In Progress | docs/PRODUCTION_STATUS.md |
| 2. Architecture And Threat Model | Security Architecture | 2026-07-12 | In Progress | docs/THREAT_MODEL.md |
| 3. Identity, Keys, And Secrets | Security Engineering | 2026-07-19 | In Progress | config/key-management-policy.json |
| 4. Chain And Transaction Safety | Protocol Engineering | 2026-07-26 | In Progress | docs/OPERATIONS_RUNBOOK.md |
| 5. Agent Runtime And Model Safety | Orchestrator Team | 2026-08-02 | In Progress | docs/ORCHESTRATOR_PLACEHOLDER_TRIAGE.md |
| 6. Infrastructure, Reliability, And SLOs | SRE | 2026-08-09 | In Progress | scripts/release_check.sh |
| 7. Observability And Operations | SRE + Ops | 2026-08-16 | In Progress | docs/OPERATIONS_RUNBOOK.md |
| 8. Security Assurance | Security Engineering | 2026-08-23 | In Progress | docs/SECURITY_AUDIT_REPORT.md |
| 9. Compliance And Data Handling | Compliance + Legal Ops | 2026-08-30 | Not Started | docs/INCIDENT_RESPONSE_PLAYBOOK.md |
| 10. Verification And Testing | QA + SRE | 2026-09-06 | In Progress | docs/PRODUCTION_STATUS.md |
| 11. Launch Readiness Review | Engineering Leadership | 2026-09-13 | In Progress | docs/PRODUCTION_READINESS_CHECKLIST.md |
| 12. Post-Launch Controls | Ops Leadership | 2026-09-20 | Not Started | docs/OPERATIONS_RUNBOOK.md |

## Top 5 Launch Risks With Mitigation Owners

| Risk | Severity | Mitigation | Owner | Due Date |
| --- | --- | --- | --- | --- |
| LR-001 | High | Orchestrator ORCH-001/009 security paths still have partial TEE attestation coverage in staging; full TPM evidence requires production key provisioning | Orchestrator Team | 2026-08-02 |
| LR-002 | High | On-chain Move contract deployment and capability verification not yet validated in mainnet environment; end-to-end chain verification is environment-bound | Protocol Engineering | 2026-07-26 |
| LR-003 | Medium | Production HSM/KMS key custody not yet provisioned; dev environment uses in-memory ephemeral keys only | Security Engineering | 2026-07-19 |
| LR-004 | Medium | Formal verification proof coverage targets not yet fully met; open obligations in `formal_verification/OBLIGATIONS.md` | Formal Methods Team | 2026-08-05 |
| LR-005 | Medium | Load and chaos test suite runs against mock/local fixtures; real-network load profile not yet validated at production scale | SRE | 2026-08-09 |

## Success Criteria For First 24 Hours Post-Launch

| Criterion | Metric | Target | Owner |
| --- | --- | --- | --- |
| RPC availability | sapm_rpc_error_rate | < 1% error rate | SRE |
| Transaction success | sapm_tx_success_rate | >= 95% success rate | Protocol Engineering |
| Agent loop health | sapm_agent_loop_error_rate | < 2% error rate | Orchestrator Team |
| No circuit-breaker trips | sapm_circuit_breaker_state | 0 open breakers sustained > 5 min | SRE |
| Frontend availability | sapm_frontend_availability | >= 99% probe success | Frontend Platform |
| Zero SEV-1 incidents | Incident log | 0 SEV-1 incidents in first 24h | Incident Commander |
| Forecast latency | sapm_forecast_latency_ms | p99 < 2000ms | Orchestrator Team |
