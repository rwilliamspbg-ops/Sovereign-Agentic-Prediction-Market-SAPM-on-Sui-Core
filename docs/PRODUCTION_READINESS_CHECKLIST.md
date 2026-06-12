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
- [ ] Key generation and storage policy approved (HSM/KMS or equivalent).
- [ ] Key rotation procedures tested.
- [x] Signing permissions scoped to least privilege.
- [ ] Secret distribution and revocation process validated.
- [ ] Break-glass credentials audited and stored securely.

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
- [ ] Sandboxing/resource limits applied to model and agent processes.
- [ ] Byzantine-tolerance assumptions validated under adversarial tests.
- [ ] Reputation/slashing logic tested for false positives and evasion paths.
- [x] Fallback strategy defined when model confidence is low or conflicting.

## 6. Infrastructure, Reliability, And SLOs

- [x] Availability SLOs defined for RPC, agent loop, and transaction execution.
- [x] Error budget policy documented.
- [ ] Horizontal scaling and capacity plan validated with load tests.
- [ ] Backup and restore tested for stateful components.
- [ ] Disaster recovery tested with target RTO and RPO.
- [x] Health checks include deep dependency checks, not only process liveness.

## 7. Observability And Operations

- [x] Structured logging with correlation IDs enabled.
- [ ] Metrics published for forecast latency, tx success rate, and RPC error rates.
- [ ] Alert thresholds and paging rules tuned and tested.
- [ ] Dashboards available for operators and incident response.
- [x] Runbooks available for common failure modes.
- [ ] Post-incident review template and process in place.

## 8. Security Assurance

- [x] SAST, dependency, and container scanning active in CI.
- [ ] Critical/high vulnerabilities blocked at merge.
- [ ] Container images run as non-root where possible.
- [ ] Network segmentation and egress controls verified.
- [ ] Rate limiting and abuse protection enforced on public interfaces.
- [ ] External penetration test completed for production perimeter.

## 9. Compliance And Data Handling

- [ ] Data classification policy applied to all inputs and logs.
- [ ] PII handling policy and retention windows enforced.
- [ ] Regional/legal restrictions reviewed for deployment geography.
- [ ] Audit logs retained and immutable per policy.
- [ ] Third-party licenses and attribution reviewed.

## 10. Verification And Testing

- [x] Unit, integration, and end-to-end coverage thresholds met.
- [ ] Chaos/fault-injection tests passed for network and dependency failures.
- [ ] Soak tests passed at expected production load profile.
- [ ] Canary deployment plan tested.
- [ ] Rollback drill executed in staging with acceptable recovery time.

## 11. Launch Readiness Review

- [ ] Go/No-Go meeting completed with engineering, security, and ops sign-off.
- [ ] Top 5 launch risks documented with mitigation owner and due date.
- [ ] Launch-day communication plan and status channel established.
- [ ] Success criteria for first 24 hours defined.
- [ ] Freeze window and contingency plan approved.

## 12. Post-Launch Controls

- [ ] Hypercare on-call schedule published.
- [ ] Daily risk review cadence set for first 2 weeks.
- [ ] KPI and anomaly thresholds reviewed daily.
- [ ] Deferred risks tracked with owner and resolution date.

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
| 3. Identity, Keys, And Secrets | Security Engineering | 2026-07-19 | Not Started | docs/SECURITY_AUDIT_REPORT.md |
| 4. Chain And Transaction Safety | Protocol Engineering | 2026-07-26 | In Progress | docs/OPERATIONS_RUNBOOK.md |
| 5. Agent Runtime And Model Safety | Orchestrator Team | 2026-08-02 | In Progress | docs/ORCHESTRATOR_PLACEHOLDER_TRIAGE.md |
| 6. Infrastructure, Reliability, And SLOs | SRE | 2026-08-09 | In Progress | scripts/release_check.sh |
| 7. Observability And Operations | SRE + Ops | 2026-08-16 | In Progress | docs/OPERATIONS_RUNBOOK.md |
| 8. Security Assurance | Security Engineering | 2026-08-23 | In Progress | docs/SECURITY_AUDIT_REPORT.md |
| 9. Compliance And Data Handling | Compliance + Legal Ops | 2026-08-30 | Not Started | docs/INCIDENT_RESPONSE_PLAYBOOK.md |
| 10. Verification And Testing | QA + SRE | 2026-09-06 | In Progress | docs/PRODUCTION_STATUS.md |
| 11. Launch Readiness Review | Engineering Leadership | 2026-09-13 | Not Started | docs/PRODUCTION_READINESS_CHECKLIST.md |
| 12. Post-Launch Controls | Ops Leadership | 2026-09-20 | Not Started | docs/OPERATIONS_RUNBOOK.md |
