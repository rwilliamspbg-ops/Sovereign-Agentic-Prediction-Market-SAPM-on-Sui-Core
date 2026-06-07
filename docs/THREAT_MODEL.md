# SAPM Threat Model

## Scope

This model covers frontend wallet workflows, orchestrator initialization, agent APIs, on-chain calls, and Walrus/DeepBook integrations.

## Assets

- User wallet accounts and signing capability
- Orchestrator attestation material and session keys
- Agent forecast outputs and intent payloads
- Market/trade state in Sui objects and external cache layers

## Trust Boundaries

1. Browser UI to wallet extension boundary
2. Frontend to backend/middleware APIs
3. Orchestrator to registry/aggregator key-distribution endpoints
4. Off-chain services to on-chain settlement boundary

## Primary Threats

| Threat | Vector | Impact | Mitigation |
| --- | --- | --- | --- |
| Key substitution | Unsigned peer-key payloads | Session hijack, MITM | Signed key payloads, registry verification key, fail-closed validation |
| Attestation bypass | Mock TPM input in production | Runtime integrity loss | Enforce TEE config, certificate chain checks, fingerprint/revocation checks |
| Intent injection | Forged A2UI payloads | Unauthorized UI actions | Source allowlist, optional HMAC signatures, rate limits, schema checks |
| RPC dependency failure | Sui/model endpoint timeout | Trade/prediction outage | Circuit breakers, timeout budgets, graceful errors |
| Wallet abuse | Malicious or compromised wallet address | Funds loss | Wallet authenticity checks and blocked-address denylist |

## Security Invariants

1. Orchestrator must not transition to operational state without attestation and key-derivation validation.
2. Trade execution must use wallet-signed transactions for state-changing calls.
3. External dependencies must fail safely and emit observability events.
4. High-risk actions must be attributable via structured logs/events.

## Residual Risk

- Registry trust root management remains operationally sensitive.
- Full TPM evidence verification still depends on environment-specific provisioning.
- DeepBook pool-state semantics may differ by package version and require periodic validation.

## Review Cadence

- Update this model per release or after any security incident.
- Re-run threat review when adding new signing paths, model endpoints, or privileged agent flows.
