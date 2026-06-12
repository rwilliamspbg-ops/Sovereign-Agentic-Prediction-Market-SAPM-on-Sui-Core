# Orchestrator Placeholder Triage

Last updated: 2026-06-12
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

## 2026-06-07 Hardening Update

- ORCH-001 and ORCH-009 now use derived key material tied to attestation digest and peer key context (no static placeholder key bytes).
- ORCH-002 now enforces key-derivation proof verification with timing-safe comparison.
- ORCH-003 now supports signed peer-key retrieval and fail-closed validation when signature mode is enabled.
- ORCH-005 chain validation now includes issuer/signature checks and optional revocation denylist enforcement.

Remaining for milestone closure:

1. Replace the deterministic derivation fallback with full audited x25519-mlkem768 runtime integration.
2. Add deterministic integration tests for signed key retrieval and proof-verification failure modes.
3. Add hardware-backed attestation evidence tests in staging.

## 2026-06-12 Reconciliation (WS-3.1)

Current implementation status was reconciled against orchestrator code paths in:

- agents/orchestrator/core/orchestrator.js
- agents/orchestrator/discovery/manager.js
- agents/orchestrator/test/security-hardening.test.js

| ID | Reconciled Status | Evidence | Remaining Gap |
| --- | --- | --- | --- |
| ORCH-001 | Partial | Core orchestrator now supports pluggable hybrid provider seam with strict session material validation and fail-closed behavior | Still not full audited runtime x25519-mlkem768 integration |
| ORCH-002 | Closed-in-code | Key derivation proof now verified and fails on tampering | Keep deterministic failure-mode tests in CI (already present) |
| ORCH-003 | Closed-in-code | Peer-key fetch supports signed payload verification and fail-closed behavior | Add integration fixture for live registry endpoint auth semantics |
| ORCH-004 | Partial | TPM path now supports validated staging attestation fixture ingestion with digest fail-closed checks in addition to direct measurement reads | Hardware-backed attestation evidence still required for staging closure |
| ORCH-005 | Closed-in-code | Certificate chain checks include validity, issuer/signature chain, and optional revocation denylist | Add staging evidence for full root trust policy |
| ORCH-006 | Closed-in-code | Reachability check performs active HTTP/S probe with timeout handling | Add multi-endpoint degraded-network matrix scenarios |
| ORCH-007 | Closed-in-code | Hugepage check reads procfs and enforces minimum availability threshold | Add production profile threshold variants |
| ORCH-008 | Closed-in-code | CPU pinning check validates cpuset against online CPU list | Add cgroup-v2 specific regression fixture |
| ORCH-009 | Partial | Discovery KEX path now includes peer-digest key confirmation and fail-closed mismatch handling | Replace placeholder-design derivation with audited x25519-mlkem768 path |

## First Closure Wave (WS-3.2)

Wave objective: close the highest risk security and cryptographic gaps before broader hardening.

| Priority | ORCH ID | Owner | Target Date | Why First |
| --- | --- | --- | --- | --- |
| P0 | ORCH-001 | Orchestrator Crypto Team | 2026-07-15 | Core session establishment path still lacks full audited hybrid runtime |
| P0 | ORCH-009 | Orchestrator Crypto Team | 2026-07-15 | Discovery path uses placeholder-design hybrid derivation |
| P1 | ORCH-004 | Security Attestation Team | 2026-08-05 | Mock-capable attestation path needs hardware-backed staging evidence |
| P1 | ORCH-003 | Orchestrator Networking Team | 2026-07-29 | Keep signed key retrieval hardened with endpoint resilience tests |
| P1 | ORCH-005 | Security Attestation Team | 2026-08-05 | Chain verification implemented; requires staging trust-root evidence |

## Regression Test Mapping (WS-3.3)

Current regression evidence from orchestrator suite:

- Command: npm --prefix agents/orchestrator test
- Result: 7 suites, 121 tests, 121 passed (2026-06-12)

| ORCH ID | Test Coverage Status | Current Evidence | Required Additional Test |
| --- | --- | --- | --- |
| ORCH-001 | Partial | security-hardening now includes deterministic provider-seam fixture plus fail-closed invalid session-key length test | Integrate audited x25519-mlkem768 provider implementation through configured seam |
| ORCH-002 | Covered | security-hardening MAC tamper test fails proof verification as expected | Add explicit negative-path test for missing attestation digest |
| ORCH-003 | Covered | security-hardening signed peer-key accept/reject + timeout + invalid JSON + missing key payload tests | Add integration fixture for live registry endpoint auth semantics |
| ORCH-004 | Partial | security-hardening now covers validated staging attestation fixture ingestion and digest-mismatch fail-closed behavior | Capture hardware-backed staging evidence artifact and verify real TPM/TEE measurement ingestion |
| ORCH-005 | Covered | security-hardening revoked certificate fingerprint test | Add full chain-to-root test vector fixture in CI |
| ORCH-006 | Covered | security-hardening reachability negative-path fixture validates false on unreachable endpoint | Add unit tests for explicit status-code matrix |
| ORCH-007 | Covered | security-hardening procfs fixture validates hugepage threshold fail path | Add production profile threshold variants |
| ORCH-008 | Covered | security-hardening cpuset fixture validates unpinned detection path | Add cgroup-v2 specific regression fixture |
| ORCH-009 | Partial | discovery-manager tests now cover successful key confirmation and digest-mismatch fail-closed behavior | Integrate audited hybrid provider path and key confirmation handshake beyond placeholder-design derivation |

## 2026-06-12 Regression Expansion Update

Added security-hardening regression fixtures in orchestrator tests for:

- Peer key endpoint timeout failure path
- Peer key endpoint invalid JSON parsing failure path
- Peer key payload missing key-material failure path
- Reachability probe negative path
- Hugepage threshold failure path via procfs fixture
- CPU pinning mismatch failure path via cpuset fixture

Post-update orchestrator test baseline:

- Command: npm --prefix agents/orchestrator test
- Result: 7 suites, 121 tests, 121 passed

## 2026-06-12 ORCH-004 Staging Fixture Update

Implemented staging attestation fixture support for ORCH-004 in `agents/orchestrator/core/orchestrator.js`:

- `AttestationClient` now accepts `attestationFixturePath` / `ATTESTATION_FIXTURE_PATH` for staged attestation evidence input.
- Fixture content must be valid JSON with `rawMeasurement` and `measurements.sha256`.
- Digest mismatch fails closed before the evidence enters the session establishment flow.

Added regression coverage in `agents/orchestrator/test/security-hardening.test.js`:

- valid staging fixture ingestion preserves audited digest and evidence metadata
- invalid fixture digest fails closed

Validation evidence:

- Command: npm --prefix agents/orchestrator test
- Result: 7 suites, 121 tests, 121 passed

## 2026-06-12 ORCH-001 Provider-Seam Update

Implemented production-integration seam for ORCH-001 in `agents/orchestrator/core/orchestrator.js`:

- `CryptoProvider` now supports configurable hybrid provider injection (`hybridKexProvider` or `HYBRID_KEX_PROVIDER_PATH`).
- Provider output is normalized and strictly validated (32-byte session key, non-empty nonce/proof) with fail-closed errors.
- Existing derivation path remains as deterministic fallback until audited runtime provider integration is complete.

Added deterministic regression tests in `agents/orchestrator/test/security-hardening.test.js`:

- provider fixture is used for deterministic session derivation with proof validation
- invalid provider session key length fails closed

Validation evidence:

- Command: npm --prefix agents/orchestrator test
- Result: 7 suites, 119 tests, 119 passed

## 2026-06-12 Discovery Key-Confirmation Update (ORCH-009)

Implemented discovery session key-confirmation guard in `agents/orchestrator/discovery/manager.js`:

- Session establishment now validates derived `peerDigest` against expected peer-key digest.
- Mismatch fails closed and tears down negotiating session.

Added dedicated discovery-manager regression tests:

- successful session establishment with matching digest
- fail-closed session establishment when digest mismatches

Validation evidence:

- Command: npm --prefix agents/orchestrator test
- Result: 7 suites, 117 tests, 117 passed
