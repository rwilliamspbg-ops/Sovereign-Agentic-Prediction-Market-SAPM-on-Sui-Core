# 🏛️ Atomic State Machine Implementation Plan: Unified Initialization Sequence (PC-2.2)

## Goal
Create a single, verifiable sequence that transitions the node from:  
`UNINITIALIZED` ➔ `ATTESTED` ➔ `KEY_ESTABLISHED` ➔ `OPERATIONAL`

---

## 1. State Definition & Contract Enforcement (Formalization Focus)
Before writing code, we must formalize the states and transitions using Lean 4 concepts within our documentation/contracts.

| State | Description | Entry Criteria (Pre-Reqs) | Exit Criteria (Output Artifact) | Verification Point |
| :--- | :--- | :--- | :--- | :--- |
| **S0: UNINITIALIZED** | System boots, minimal resources available. | None | Successful execution of `TPM_READ()`. | Initial system entropy check passed. |
| **S1: ATTESTED** | Hardware identity and runtime integrity verified (TEE/Attestation). | S0 Exit. Securely read secrets from TEE measurement registers. | Validated Attestation Certificate Chain (`cert_chain.pem`) signed by the Root Authority. | `make verify-attestation` must pass. |
| **S2: KEY_ESTABLISHED** | Secure session keys are derived using hybrid PQC/ECC methods. | S1 Exit + Network connectivity check. Successful `x25519-mlkem768` exchange with the designated Peer/Cluster Head. | Valid, ephemeral Session Key Material (`session_keys.bin`) and cryptographic context object passed to the Datapath layer. | Crucial: Must pass C-1 formal proofs integration test. |
| **S3: OPERATIONAL** | Node is ready for data plane operations (SMIP/FL). | S2 Exit + Resource Allocation Confirmation (CPU Pinning, Hugepages mapped). | Successful heartbeat transmission on the designated high-throughput path (`AF_XDP` monitored). | `make run-live-test` must pass. |

---

## 2. Implementation Pattern Guidance (Code Structure)
The orchestration logic should reside in a dedicated component within Mohawk-Nexus, perhaps `agent/state_machine.go` or similar, leveraging Go's strong concurrency primitives for state management safety.

### A. The Orchestrator Core (Go Focus)
We must use a guarded pattern:
* **Initialization:** Initialize all required modules (Crypto Provider, Attestation Client, Network Handler).
* **State Guarding:** Wrap the entire process in a loop that only proceeds to the next step if the current state transition returns success and generates the necessary output artifact for the next step's input.

### B. Bridging Contracts Focus (Go ↔ Rust)
The most critical boundary crossing is between S2 (Crypto) and S3 (Networking/Datapath):
* **Input to Bridge:** The `session_keys.bin` derived in S2 must be passed across the language boundary.
* **Bridge Contract Requirement:** The bridge contract (`bridge_contracts/key_transfer.proto` or similar) must explicitly define the serialization format and size constraints for this key material, ensuring Rust's XDP path can consume it without runtime allocation overhead (i.e., passing raw pointers/slices where possible).

### C. Hardening Directives & Validation Gates
* **Error Handling:** DO NOT ALLOW ANY UNHANDLED EXCEPTIONS. Every failure at S0 through S2 must result in an immediate, non-recoverable shutdown of the agent process with a specific, logged exit code indicating which state failed (e.g., `exit_code=102: ATTESTATION_FAILURE`).
* **Idempotency:** The entire sequence must be idempotent; re-running it should not change the final operational state if all prerequisites are met, but it MUST detect and report drift if prerequisites have changed (e.g., a key was manually altered).

---

## 📋 Actionable To-Do List for PC-2.2 Completion

* [ ] **[MUST DO] Formalize State Transitions:** Update `THEOREM_REMEDIATION_TRACKER` with the state machine diagram and proof requirements derived above.
* [ ] **[CODE] Implement State Guard Logic:** Develop the core orchestration loop in Go/Rust, ensuring strict adherence to sequential execution guarded by success checks.
* [ ] **[BRIDGE] Define Key Transfer Contract:** Finalize `bridge_contracts/key_transfer` schema and validate it using `make verify-bridge`.
* [ ] **[TESTING] Build Comprehensive Test Harness:** Create a dedicated test suite that mocks the outputs of S1 (Attestation) and runs through the full sequence, asserting on the final state and resource mappings for S3.
