# SAPM Threat Model

Last reviewed: 2026-06-12

## Scope

This model covers frontend wallet workflows, orchestrator initialization, agent APIs, on-chain calls, and Walrus/DeepBook integrations.

## Assets

- User wallet accounts and signing capability
- Orchestrator attestation material and session keys
- Agent forecast outputs and intent payloads
- Market/trade state in Sui objects and external cache layers

## Trust Boundaries

| Boundary | From | To | Risk | Controls |
| --- | --- | --- | --- | --- |
| TB-1 | Browser UI | Wallet extension | High | Wallet address validation, signed transactions only, balance/limit preflight |
| TB-2 | Frontend | Backend/middleware APIs | Medium | Session guards, schema validation, HTTPS transport |
| TB-3 | Orchestrator | Registry/aggregator key endpoints | Critical | Signed peer-key payloads, registry verification key, fail-closed on invalid response |
| TB-4 | Off-chain agent services | On-chain settlement (Sui) | High | Transaction simulation preflight (dryRun), gas budget caps, signed PTBs, network allowlist |
| TB-5 | Intent queue / A2UI | Orchestrator | High | Source allowlist, optional HMAC signatures, per-user rate limits, schema checks |

## Primary Threats

| Threat | Vector | Impact | Mitigation |
| --- | --- | --- | --- |
| Key substitution | Unsigned peer-key payloads | Session hijack, MITM | Signed key payloads, registry verification key, fail-closed validation |
| Attestation bypass | Mock TPM input in production | Runtime integrity loss | Enforce TEE config, certificate chain checks, fingerprint/revocation checks |
| Intent injection | Forged A2UI payloads | Unauthorized UI actions | Source allowlist, optional HMAC signatures, rate limits, schema checks |
| RPC dependency failure | Sui/model endpoint timeout | Trade/prediction outage | Circuit breakers, timeout budgets, graceful errors |
| Wallet abuse | Malicious or compromised wallet address | Funds loss | Wallet authenticity checks and blocked-address denylist |

## Abuse Cases

| ID | Abuse Case | Actor | Vector | Controls |
| --- | --- | --- | --- | --- |
| AB-001 | Model poisoning | Malicious oracle contributor | Inject adversarial forecast inputs to skew aggregated outcome | Reputation engine weighting, Byzantine-fault-tolerant aggregation, outlier rejection |
| AB-002 | Sybil coordination | Multiple controlled agent identities | Create fake quorum to bias market resolution | Stake-weighted reputation, chain-verified identity, slashing on inconsistent prediction |
| AB-003 | Key theft | Compromised deployment environment | Extract session key or private key from env/disk | Keys never written to repo or container image, break-glass credential audit, key rotation policy |
| AB-004 | Transaction replay | Network observer re-submitting captured signed tx | Replay a valid transaction to trigger duplicate state changes | Sui nonce/sequence checks on PTBs, object version locking, idempotency guard on agent state |
| AB-005 | Gas griefing | Adversary inflating gas costs | Submit PTBs designed to maximise gas consumption | Per-operation gas budget caps in `config/chain-safety.json`, preflight simulation before execution |
| AB-006 | Schema smuggling | Crafted input bypassing validation | Deliver malformed payload through boundary to trigger downstream errors | Input schema enforcement at every boundary (ingress-validator, intent queue schema checks) |

## Controls Mapped To Critical Threats

| Threat / Abuse Case | Control | Evidence |
| --- | --- | --- |
| Key substitution (TB-3) | Signed peer-key enforcement, fail-closed | `agents/orchestrator/core/go-hybrid-provider.js`, security-hardening tests |
| Attestation bypass | Certificate chain validation, fingerprint check, revocation denylist | `agents/orchestrator/core/orchestrator.js`, ORCH-003/005 tests |
| Intent injection (TB-5) | Source allowlist, HMAC option, rate limit, schema enforcement | `agents/mcp-server/`, ingress-validator tests |
| RPC failure | Circuit breakers, timeout budgets | `risk-management/controls/circuit-breakers.js` |
| Wallet abuse (TB-1) | Wallet address validation in frontend | `frontend/src/` wallet guard hooks |
| Model poisoning (AB-001) | Reputation engine, outlier rejection | `agents/aggregator/reputation/`, aggregator tests |
| Sybil coordination (AB-002) | Stake-weighted reputation, slashing logic | `agents/aggregator/reputation/engine.js` |
| Key theft (AB-003) | Secrets scan CI gate, no-key-in-repo policy | `scripts/scan_secrets.sh`, CODEOWNERS security rules |
| Transaction replay (AB-004) | Sui PTB object version locking, chain nonce enforcement | `agents/trader/ptb_builder.js`, `config/chain-safety.json` |
| Gas griefing (AB-005) | Per-operation gas budget caps | `config/chain-safety.json`, PTBBuilder.gasBudget |
| Schema smuggling (AB-006) | Input schema enforcement at all boundaries | `agents/orchestrator/core/ingress-validator.js` |

## Security Invariants

1. Orchestrator must not transition to operational state without attestation and key-derivation validation.
2. Trade execution must use wallet-signed transactions for state-changing calls.
3. External dependencies must fail safely and emit observability events.
4. High-risk actions must be attributable via structured logs/events with correlation IDs.
5. Transaction simulation (dryRun) must pass before any mainnet PTB submission.
6. No private key material may appear in repository files or container images.

## Residual Risk

- Registry trust root management remains operationally sensitive.
- Full TPM evidence verification still depends on environment-specific provisioning.
- DeepBook pool-state semantics may differ by package version and require periodic validation.

## Review Cadence

- Update this model per release or after any security incident.
- Re-run threat review when adding new signing paths, model endpoints, or privileged agent flows.
