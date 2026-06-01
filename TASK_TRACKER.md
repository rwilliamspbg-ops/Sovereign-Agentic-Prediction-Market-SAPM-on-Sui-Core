# SAPM Project - Detailed Task Tracker
## Sovereign Mohawk Proto LLC | Production Completion Work Breakdown Structure

## ✅ Completed items

### Formal Verification & Security
- [x] FV-1.1 Implement PQC hybrid KEX (x25519-mlkem768) in Go
- [x] FV-1.2 Formal proof C-1: Hybrid KEX security ≥ max(classical, quantum)
- [x] FV-1.3 Integration test suite for PQC KEX
- [x] FV-1.4 Implement TPM attestation client in Go/Rust scaffold
- [x] FV-1.5 Formal proof C-4: tpm_attestation_verification
- [x] FV-3.1 Complete T-Init-1 formal proof (Attestation binding invariant)
- [x] FV-3.2 Complete T-Init-2 formal proof (Key derivation invariant)
- [x] FV-3.3 Complete T-Init-3 formal proof (Operational readiness invariant)

### Platform / CI
- [x] Set up development toolchains for Lean 4, Rust, Go, and Docker
- [x] Review current code in `agents/` and identify implementation gaps
- [x] Establish CI/CD pipeline skeleton and verification workflow
- [x] Add prebuilt Lean/Rust runner image for faster CI

### Protocol / Runtime Improvements
- [x] Add HKDF-based session key derivation and PSK export
- [x] Add PSK resumption and interactive CLI demo
- [x] Build the self-contained Lean formal verification project and validate `lake build`

## ⏳ Remaining work

- [ ] Implement full TPM attestation flows (quotes, signing, certs)
- [ ] AF_XDP datapath & benchmarks
- [ ] Trading adapter integration & end-to-end tests
- [ ] Observability dashboards, alerting, and runbooks
- [ ] Chaos engineering validation and failure-mode reports
- [ ] Deployment hardening, branch protection, and go/no-go review

## 🧭 Finish plan

### Phase 1 — Close security gaps
1. Finish TPM quote generation, signing, and certificate validation.
2. Add tests for real/simulated TPM attestation paths.
3. Update proof artifacts to reference the finalized attestation flow.

### Phase 2 — Finish performance work
1. Implement the AF_XDP datapath and wire it into the Rust side.
2. Add benchmark scripts and capture pprof/flamegraph output.
3. Tune the hot path and record baseline vs optimized results.

### Phase 3 — Complete trading integration
1. Finish the adapter-to-trade path and remove remaining stubs.
2. Add end-to-end tests for forecast → decision → PTB submission.
3. Add dry-run and fail-closed gating for low-confidence cases.

### Phase 4 — Release readiness
1. Add observability dashboards and alert thresholds.
2. Run chaos tests and document recovery procedures.
3. Finish deployment gate checks, branch protection, and launch sign-off.

## Definition of done
- All remaining checklist items are green.
- CI uses the runner image by default and falls back safely when needed.
- End-to-end tests, benchmarks, and chaos runs are reproducible.
- Release docs and sign-off artifacts are complete.
