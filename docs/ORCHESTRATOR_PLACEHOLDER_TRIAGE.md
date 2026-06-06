# Orchestrator Placeholder Triage

Last updated: 2026-06-06
Scope: Orchestrator placeholders requiring production implementation

## Ownership And Milestone Ledger

| ID | File | Placeholder Area | Owner | Milestone | Due Date | Exit Criteria |
| --- | --- | --- | --- | --- | --- | --- |
| ORCH-001 | agents/orchestrator/core/orchestrator.js | Hybrid key exchange returns placeholder session key material | Orchestrator Crypto Team | M3-ORCH-CRYPTO-INTEGRATION | 2026-07-15 | Integrate x25519-mlkem768 implementation and pass deterministic KEX tests |
| ORCH-002 | agents/orchestrator/core/orchestrator.js | Key derivation proof verification hardcoded true | Orchestrator Crypto Team | M3-ORCH-KDF-PROOFS | 2026-07-22 | Verify real proof object and fail closed on invalid proofs |
| ORCH-003 | agents/orchestrator/core/orchestrator.js | Peer public key fetch returns placeholder key | Orchestrator Networking Team | M3-ORCH-PEER-IDENTITY | 2026-07-29 | Resolve peer keys from registry/aggregator endpoint with signature checks |
| ORCH-004 | agents/orchestrator/core/orchestrator.js | TPM measurement uses placeholder attestation payload | Security Attestation Team | M3-ATTESTATION-PROD-TPM | 2026-08-05 | Read real TPM/TEE measurements and serialize with audited format |
| ORCH-005 | agents/orchestrator/core/orchestrator.js | Certificate chain verification hardcoded true | Security Attestation Team | M3-ATTESTATION-CHAIN-VERIFY | 2026-08-05 | Validate full chain to trusted root and enforce revocation checks |
| ORCH-006 | agents/orchestrator/core/orchestrator.js | Reachability check hardcoded true | Orchestrator Networking Team | M3-ORCH-NETWORK-HEALTHCHECK | 2026-08-12 | Replace with active HTTP/RPC probe + timeout + retry semantics |
| ORCH-007 | agents/orchestrator/core/orchestrator.js | Hugepage availability check hardcoded true | Runtime Performance Team | M3-RUNTIME-HUGEPAGE-CHECKS | 2026-08-19 | Verify hugepage allocation from procfs and fail if below threshold |
| ORCH-008 | agents/orchestrator/core/orchestrator.js | CPU pinning check hardcoded true | Runtime Performance Team | M3-RUNTIME-CPU-PINNING-CHECKS | 2026-08-19 | Validate cpuset/cgroup affinity policy against configured pin set |
| ORCH-009 | agents/orchestrator/discovery/manager.js | Discovery hybrid KEX path returns placeholder key material | Orchestrator Crypto Team | M3-DISCOVERY-HYBRID-KEX | 2026-07-15 | Replace placeholder with production KEX and key confirmation handshake |

## Tracking Rules

1. All placeholder code paths must reference their ORCH-ID in code comments.
2. Any missed due date requires adding a new date and rationale in this file.
3. A placeholder is closed only after tests are added and linked in the PR description.
