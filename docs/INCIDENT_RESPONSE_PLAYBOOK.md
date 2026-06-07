# SAPM Incident Response Playbook

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

1. Publish root-cause analysis within 48 hours.
2. Record action items with owner and due date.
3. Update threat model and runbooks based on lessons learned.
