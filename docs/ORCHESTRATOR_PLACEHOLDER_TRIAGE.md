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
| ORCH-005 | Closed-in-code | Certificate chain checks now include validity, issuer/signature chain, revocation denylist, and optional trusted-root fingerprint enforcement | Add staging evidence for full root trust policy |
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
- Result: 7 suites, 135 tests, 135 passed (2026-06-12)

| ORCH ID | Test Coverage Status | Current Evidence | Required Additional Test |
| --- | --- | --- | --- |
| ORCH-001 | Partial | security-hardening now includes deterministic seam coverage, a real Go-backed provider bridge, and explicit binary-path runtime configuration support | Promote bridge from `go run` default to production binary lifecycle/telemetry |
| ORCH-002 | Covered | security-hardening now covers MAC tamper and missing-attestation-digest fail-closed verification paths | Keep CI baseline current as proof verification logic evolves |
| ORCH-003 | Covered | security-hardening now includes signed peer-key accept/reject paths plus a live local HTTP registry-style endpoint verification test | Add broader registry auth fixture parity if production payload schema expands |
| ORCH-004 | Partial | security-hardening now covers validated staging attestation fixture ingestion and digest-mismatch fail-closed behavior | Capture hardware-backed staging evidence artifact and verify real TPM/TEE measurement ingestion |
| ORCH-005 | Covered | security-hardening now covers revoked fingerprint rejection, trusted-root policy enforcement, and true multi-certificate chain-root validation | Extend only if production chain shape introduces intermediates beyond current fixture |
| ORCH-006 | Covered | security-hardening now covers unreachable endpoint plus explicit 200/404 reachable and 503 unreachable probe semantics | Extend matrix only if probe policy changes |
| ORCH-007 | Covered | security-hardening now covers below-threshold fail, threshold-met pass, and zero-free-pages fail variants | Extend only if hugepage policy adds more profile dimensions |
| ORCH-008 | Covered | security-hardening now covers unpinned cpuset detection plus cgroup-v2 effective cpuset accept/reject paths | Extend only if CPU affinity policy adds more cgroup sources |
| ORCH-009 | Partial | discovery manager now prefers the Go-backed provider path with key confirmation, explicit fallback, and runtime-configurable binary invocation support | Promote provider-backed path from bridge invocation to full production discovery exchange wiring |

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
- committed reusable staging fixture samples now live under `agents/orchestrator/test/fixtures/`
- fixture contract and operator usage notes now live in `agents/orchestrator/test/fixtures/README.md`

Validation evidence:

- Command: npm --prefix agents/orchestrator test
- Result: 7 suites, 121 tests, 121 passed

## 2026-06-12 ORCH-005 Trusted-Root Policy Update

Implemented trusted-root enforcement for ORCH-005 in `agents/orchestrator/core/orchestrator.js`:

- `AttestationClient.verifyCertChain` now accepts configured root fingerprints via `attestationTrustedRoots` / `ATTESTATION_TRUSTED_ROOTS`.
- When configured, the terminal certificate in the provided chain must match an allowed root fingerprint.
- Non-matching roots fail closed.

Added deterministic regression coverage in `agents/orchestrator/test/security-hardening.test.js`:

- trusted root fingerprint accepts current certificate chain
- non-matching trusted root fingerprint rejects current certificate chain
- staging operator inputs for trusted-root rehearsal are documented in `agents/orchestrator/test/fixtures/README.md`

Validation evidence:

- Command: npm --prefix agents/orchestrator test
- Result: 7 suites, 123 tests, 123 passed

## 2026-06-12 ORCH-002 Missing-Digest Coverage Update

Added explicit ORCH-002 negative-path regression coverage in `agents/orchestrator/test/security-hardening.test.js`:

- proof verification now has dedicated test coverage for missing attestation digest input
- verification continues to fail closed when attestation digest context is absent

Validation evidence:

- Command: npm --prefix agents/orchestrator test
- Result: 7 suites, 124 tests, 124 passed

## 2026-06-12 ORCH-003 Live Endpoint Coverage Update

Added integration-style ORCH-003 regression coverage in `agents/orchestrator/test/security-hardening.test.js`:

- local HTTP registry-style endpoint now serves a signed peer-key payload
- `CryptoProvider.fetchPeerPublicKey()` exercises the full fetch, parse, and signature verification path without `_getJson` stubbing

Validation evidence:

- Command: npm --prefix agents/orchestrator test
- Result: 7 suites, 125 tests, 125 passed

## 2026-06-12 ORCH-006 Reachability Matrix Update

Added explicit ORCH-006 status-code matrix coverage in `agents/orchestrator/test/security-hardening.test.js`:

- HTTP 200 is treated as reachable
- HTTP 404 is treated as reachable
- HTTP 503 is treated as unreachable

Validation evidence:

- Command: npm --prefix agents/orchestrator test
- Result: 7 suites, 126 tests, 126 passed

## 2026-06-12 ORCH-007 Hugepage Threshold Variant Update

Added explicit ORCH-007 hugepage threshold variant coverage in `agents/orchestrator/test/security-hardening.test.js`:

- below-threshold total hugepages fails closed
- threshold-met with free hugepages passes
- threshold-met with zero free hugepages fails closed

Validation evidence:

- Command: npm --prefix agents/orchestrator test
- Result: 7 suites, 128 tests, 128 passed

## 2026-06-12 ORCH-008 Cgroup-v2 Pinning Update

Implemented cgroup-v2-aware CPU pinning evaluation for ORCH-008 in `agents/orchestrator/core/orchestrator.js`:

- when `/proc/self/status` shows the full online CPU set, the orchestrator now checks `cpuset.cpus.effective` and `cpuset.cpus`
- a narrower cgroup-v2 effective cpuset is treated as pinned
- a cgroup cpuset matching the full online set remains unpinned

Added explicit regression coverage in `agents/orchestrator/test/security-hardening.test.js`:

- cgroup-v2 effective cpuset narrower than online CPUs passes
- cgroup-v2 effective cpuset equal to online CPUs fails

Validation evidence:

- Command: npm --prefix agents/orchestrator test
- Result: 7 suites, 130 tests, 130 passed

## 2026-06-12 ORCH-005 Multi-Certificate Chain Update

Added true multi-certificate ORCH-005 regression coverage with committed chain fixture material:

- generated root CA and leaf certificate chain combined into `agents/orchestrator/test/fixtures/attestation-chain-valid.pem`
- trusted-root acceptance now validates the terminal root certificate in a real leaf+root chain
- non-matching trusted root still fails closed for the same chain

Validation evidence:

- Command: npm --prefix agents/orchestrator test
- Result: 7 suites, 132 tests, 132 passed

## 2026-06-12 ORCH-001 Go-Backed Provider Bridge Update

Implemented the first real provider-backed ORCH-001 integration step:

- extended `cmd/kexcli/main.go` with provider-oriented `export-public` and `derive-session` modes
- added `agents/orchestrator/core/go-hybrid-provider.js` to invoke the Go bridge through the existing provider seam
- added committed peer public fixture at `agents/orchestrator/test/fixtures/hybrid-provider-peer-public.txt`

Added regression coverage in `agents/orchestrator/test/security-hardening.test.js`:

- orchestrator now validates a Go-backed x25519-mlkem768 provider path through `CryptoProvider.hybridKeyExchange`
- proof verification succeeds with provider-derived session material

Validation evidence:

- Command: npm --prefix agents/orchestrator test
- Result: 7 suites, 133 tests, 133 passed

## 2026-06-12 ORCH-009 Go-Backed Discovery Update

Implemented the first real provider-backed ORCH-009 discovery exchange step:

- `agents/orchestrator/discovery/manager.js` now prefers the Go-backed hybrid provider path for discovery KEX
- explicit config/env control preserves fallback derivation behavior when required
- existing key confirmation guard remains in place on top of provider output

Added regression coverage in `agents/orchestrator/test/discovery-manager.test.js`:

- provider-backed discovery session establishment succeeds with matching digest
- fallback derivation path still succeeds when Go provider is disabled
- digest mismatch continues to fail closed

Validation evidence:

- Command: npm --prefix agents/orchestrator test
- Result: 7 suites, 134 tests, 134 passed

## 2026-06-12 Go Provider Runtime Hardening Update

Hardened the Go provider bridge runtime path in `agents/orchestrator/core/go-hybrid-provider.js`:

- added explicit `SAPM_HYBRID_KEX_BINARY` override support for production binary wiring
- exposed deterministic command construction for regression validation
- preserved `go run ./cmd/kexcli` as the default development path

Added regression coverage in `agents/orchestrator/test/security-hardening.test.js`:

- explicit binary override produces the expected provider command invocation shape

Validation evidence:

- Command: npm --prefix agents/orchestrator test
- Result: 7 suites, 135 tests, 135 passed

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
