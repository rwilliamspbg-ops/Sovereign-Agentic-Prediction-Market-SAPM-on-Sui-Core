# Mohawk Ops Production Readiness Checklist (V1.0)

**Scope:** Cross-cutting concerns affecting all major components (SMIP, Sovereign_Map, Core Infrastructure).  
**Mandate:** Achieve hardened, verifiable, and performance-optimized deployment posture.

---

## I. Formal Verification & Cryptography Hardening (The Trust Layer)

This section addresses invariants, proofs, and security guarantees. Do not proceed until the corresponding artifacts are verified.

| ID | Area | Component Impacted | Status/Requirement | Criticality | Next Action/Artifact Reference |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **C-1** | PQC Transition | SMIP, Node Agent (Go) | Full implementation and formal verification of the `x25519-mlkem768` hybrid KEX across all session establishment paths. | Critical | Review `Sovereign-Mohawk-Proto/crypto/pqc_kex_proofs.lean`. Must pass integration test suite against simulated hostile environment (Chaos ID: Q-HYBRID-001). |
| **C-2** | BFT Finalization | Sovereign_Map | Proof of $t + 1$ safety under network partition and Byzantine node compromise for the current FL aggregation epoch. | Critical | Update `THEOREM_REMEDIATION_TRACKER` with the final proof artifact reference. Verify consensus state machine against formal model in Lean 4. |
| **C-3** | Protocol Invariants | SMIP-MWP/Rust Datapath | Formal proof of non-violation of transport invariants (e.g., message ordering, resource allocation) when running at line rate ($\ge 95\text{ GiB/s}$). | Critical | Requires `SMIP-MWP/formal_spec.lean` update and successful execution of the associated theorem prover module. |
| **C-4** | Attestation Chain | All Nodes | Integration and validation of TPM attestation results into the startup sequence, ensuring measured boot integrity before network participation. | High | Update `DEPLOYMENT/attest_manifest.yaml`. Verify rollback procedure if TEE measurement fails (must halt gracefully). |

---

## II. Performance & Low-Level Optimization (The Throughput Layer)

This section targets maximizing real-world performance while maintaining correctness. Focus on zero-copy and pinning.

| ID | Area | Component Impacted | Status/Requirement | Criticality | Next Action/Artifact Reference |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **P-1** | AF_XDP Path Tuning | SMIP-MWP/Rust Datapath | Final tuning pass for XDP hooks, optimizing ring buffer sizes, NAPI polling frequency, and kernel interaction overhead. | Critical | Run benchmark harness (`Makefile:bench_xdp`) targeting EPYC-class hardware. Target Mpps / $< 5\%$ overhead. Capture pprof artifacts. |
| **P-2** | Memory Management | Sovereign_Map/FL Components | Verification that all streaming aggregation mechanisms use zero-copy or in-place memory manipulation, achieving the documented $224\times$ reduction factor under stress. | High | Stress test with 10M+ simulated nodes using `Makefile:stress_fl_mem`. Monitor heap allocations across language boundaries (Go $\leftrightarrow$ Rust). |
| **P-3** | Resource Pinning | All Core Processes | Hard enforcement of CPU affinity and Hugepage utilization across all critical paths (e.g., packet processing threads, crypto workers). | High | Update `k8s/deployment_config.yaml` to include explicit resource limits and topology hints (`topologyManager`). Validate with `lscpu`/`numactl`. |

---

## III. System Architecture & Resilience (The Operations Layer)

This addresses deployment robustness, observability, and failure handling.

| ID | Area | Component Impacted | Status/Requirement | Criticality | Next Action/Artifact Reference |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **S-1** | Cross-Language Bridge Validation | Mohawk-Nexus | Comprehensive end-to-end validation of all bridge contracts (Go $\leftrightarrow$ Rust) under simulated failure modes (e.g., one side stalls, incorrect schema versioning). | Critical | Execute `make verify-bridge --mode=fail_inject`. Review logs against expected contract failures documented in `BRIDGE_CONTRACT/failure_scenarios.md`. |
| **S-2** | Chaos Engineering | All Services | Implementation and successful execution of the full Chaos Mesh suite (network latency injection, resource exhaustion, process killing) for all major endpoints. | Critical | Document results in a formal Chaos Report. Must pass $N - 1$ node failure simulation without data loss or consensus breach. |
| **S-3** | Observability Completeness | All Services | Verification that all critical metrics (latency percentiles, error rates, resource utilization) are exposed via Prometheus endpoints and correctly scraped/alerted on Grafana dashboards. | High | Audit `k8s/monitoring_manifests.yaml`. Verify alert thresholds against documented SLA targets. |

---

## 🛠️ Immediate Next Steps & Commands

To move forward efficiently, tackle the **Critical** items in order:

1. **Verification First:** Start with **C-1** (PQC) and **C-3** (Protocol Invariants). These are non-negotiable for sovereign operation. Check `Sovereign-Mohawk-Proto/crypto/pqc_kex_proofs.lean` and run the associated formal checks first.
2. **Integration Testing:** Run the system integration suite:

```bash
# 1. Verify Formal Contracts (Safety First)
make verify-all-formal-contracts

# 2. Test Performance Under Load (Throughput Check)
make benchmark --all-components --mode=stress

# 3. Simulate Failure Modes (Resilience Check)
# This executes the Chaos/Failure injection suite defined in S-2
make chaos-test-suite
