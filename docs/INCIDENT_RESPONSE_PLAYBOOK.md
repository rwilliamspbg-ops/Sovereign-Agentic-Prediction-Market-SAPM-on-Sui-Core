# SAPM Incident Response Playbook

## Incident Commander And Escalation Matrix

| Role | Primary | Escalation Path | Contact |
| --- | --- | --- | --- |
| Incident Commander | Platform PMO | → Engineering Leadership → Product Leadership | pagerduty/sapm-oncall |
| Engineering Lead | Orchestrator Team Lead | → Platform Engineering Manager | pagerduty/sapm-oncall |
| Security Lead | Security Engineering Lead | → CISO | security@sovereign-mohawk-ops |
| Communications Lead | Product Leadership | → Legal if required | internal slack #sapm-incidents |
| Operations Lead | SRE On-Call | → SRE Manager | pagerduty/sapm-sre |

The incident commander has final authority to declare incidents, escalate severity, execute rollbacks, and authorize emergency hotfixes.

## Rollback Authority And SLA

| Severity | Rollback Decision Authority | Maximum Decision Time | Target RTO |
| --- | --- | --- | --- |
| SEV-1 | Incident Commander (unilateral) | 5 minutes | 30 minutes |
| SEV-2 | Incident Commander + Engineering Lead | 15 minutes | 2 hours |
| SEV-3 | Engineering Lead | 1 hour | Next business day |

Rollback procedure is documented in `docs/OPERATIONS_RUNBOOK.md` under "Rollback Procedure".
Rollback authority may not be overridden without explicit approval from Engineering Leadership.

## Severity Levels

- SEV-1: Active exploit, wallet risk, chain state corruption, or broad outage.
- SEV-2: Significant degradation, partial trade path failure, or broken attestation flow.
- SEV-3: Non-critical feature degradation or monitoring gap.

## Detection Sources

- Frontend observability event stream
- CI/release gate failures
- Runtime alerts from API/infra dashboards
- User-reported wallet or transaction anomalies

## Immediate Actions (First 15 Minutes)

1. Open incident channel and assign commander, comms, and operations roles.
2. Freeze risky operations (disable affected endpoints/flows, or switch to read-only).
3. Capture initial timeline and evidence (logs, digests, request IDs).
4. Validate blast radius: affected users, markets, and services.

## Containment by Scenario

### Attestation or key-verification failure

1. Force orchestrator to remain non-operational.
2. Rotate registry verification key and invalidate compromised key material.
3. Re-run attestation checks after trusted cert chain confirmation.

### Wallet/trade signing anomaly

1. Pause trade submissions in UI.
2. Verify wallet-provider and RPC health.
3. Compare transaction digests and reject suspicious retries.

### Model-service or external dependency outage

1. Confirm circuit-breaker state and fallback behavior.
2. Route to degraded mode with explicit UI messaging.
3. Recover service before re-enabling full write operations.

## Recovery

1. Deploy remediation patch with rollback plan.
2. Validate with smoke tests: wallet connect, preflight, trade, snapshot, readback.
3. Announce service restoration and monitor for recurrence.

## Post-Incident Review

**Template** — complete within 48 hours of incident close and publish to the engineering incident channel.

```
## Post-Incident Review: <Incident ID> — <Brief Title>

Date: YYYY-MM-DD
Severity: SEV-X
Duration: HH:MM (detection to resolution)
Incident Commander: <name>
Participants: <names>

### Summary
One-paragraph plain-language description of what happened and the user impact.

### Timeline
| Time (UTC) | Event |
| --- | --- |
| HH:MM | First symptom / alert fired |
| HH:MM | Incident declared |
| HH:MM | Root cause identified |
| HH:MM | Mitigation applied |
| HH:MM | Incident resolved |

### Root Cause
Specific technical root cause. Avoid blame; focus on system/process failure modes.

### Contributing Factors
- Factor 1
- Factor 2

### Impact
- Users affected: <count or percentage>
- Markets/trades affected: <describe>
- Data integrity impact: <yes/no + detail>

### What Went Well
- ...

### What Could Be Improved
- ...

### Action Items
| ID | Action | Owner | Due Date | Status |
| --- | --- | --- | --- | --- |
| PIR-<ID>-01 | ... | <team> | YYYY-MM-DD | Open |

### Threat Model / Runbook Updates Required
- [ ] Update threat model if new threat vector identified
- [ ] Update runbook if procedure was unclear or missing
- [ ] Update alert thresholds if detection was slow
```

1. Publish root-cause analysis within 48 hours using the template above.
2. Record action items with owner and due date in the PIR document.
3. Update `docs/THREAT_MODEL.md` and runbooks based on lessons learned.
4. Track open PIR action items in the next weekly SLO review.
