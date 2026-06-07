# SAPM Security Audit Report

Last updated: 2026-06-07

## Summary

This pass focuses on high-risk runtime and transaction paths identified in production-status documentation.

## Findings and Remediation

| ID | Severity | Finding | Status |
| --- | --- | --- | --- |
| AUD-001 | Critical | Orchestrator KEX used placeholder key material and peer key fallback | Remediated in code: derived key material + signed peer-key validation |
| AUD-002 | Critical | Key derivation proof path accepted unconditional success | Remediated in code: HMAC proof verification with timing-safe compare |
| AUD-003 | High | Certificate-chain verification was limited to leaf checks | Remediated in code: chain iteration + issuer/signature + revocation denylist checks |
| AUD-004 | High | Frontend Sui integration methods were non-functional stubs | Remediated in code: wallet-signed create-market and trade flow + model endpoint call |
| AUD-005 | Medium | Agent intent queue lacked auth/rate controls | Remediated in code: source allowlist, optional HMAC check, per-user rate limiting |
| AUD-006 | Medium | MCP market-data endpoint had no concurrency limits | Remediated in code: async semaphore rate-limiter wrapper |

## Validation Performed

- Static review of modified code paths.
- Focused frontend TypeScript check planned in release verification cycle.

## Remaining Gaps

1. Full TPM attestation evidence verification requires production key/cert provisioning and hardware-backed tests.
2. End-to-end chain deployment verification for Move packages remains an environment task.
3. Formal verification artifacts still need expanded proof coverage for runtime invariants.

## Recommendations

1. Enforce signed peer-key mode in non-dev environments.
2. Define and automate certificate revocation source updates.
3. Add integration tests for attestation failure modes and intent signature mismatch.
4. Add SLO-backed alerting on circuit-breaker open events.
