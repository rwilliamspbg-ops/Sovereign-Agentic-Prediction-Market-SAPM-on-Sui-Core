# SAPM Formal Proof Plan

This plan maps formal proof obligations to code locations and describes the
steps required to complete the formal verification of the Hybrid KEX and TPM
attestation subsystems.

Objectives
- Complete formal proof that Hybrid KEX composition preserves security (C-1).
- Formalize KEM correctness and integrate with `crypto/pqc_kex.go` proofs.
- Formalize TPM attestation binding (T-Init-1) and prove attestation implies
  platform trust and key binding.

Files added so far
- `formal_verification/lean4/crypto/hybrid_kex_spec.lean` (composition skeleton)
- `formal_verification/lean4/crypto/tpm_attestation.lean` (attestation skeleton)
- `formal_verification/lean4/crypto/kem_api.lean` (abstract KEM API + axiom)
- `formal_verification/lean4/crypto/tpm_primitives.lean` (abstract TPM primitives)

Plan (high-level steps)

1) Finalize KEM API formalization (2-3 days)
  - Expand `kem_api.lean` with formal types for ciphertext/shared as byte arrays
  - State KEM properties precisely: correctness, IND-CPA/IND-CCA (axioms or
    imported proofs) and document assumptions
  - Owner: Security Engineer / Formal verifier

2) Prove KEM correctness lemma (1-2 days)
  - Use `KEM_correctness` axiom to instantiate `kem_correctness` in
    `hybrid_kex_spec.lean`.
  - Create bridging lemmas to relate implementation API names to formal API.

3) Prove hybrid composition security (3-5 days)
  - Formalize threat model and reduction statement (max(classical,pqc) bounds).
  - Reduce to underlying KEM/classical assumptions; supply security parameters
    mapping between code constants and spec.

4) Formalize TPM primitives and PCR model (2-4 days)
  - Implement `verifyPCRDigests` semantics and expected PCR values model.
  - Formalize `sealData`/`unsealData` semantics for protected keys.

5) Prove TPM attestation binding (T-Init-1) (2-4 days)
  - Show that valid attestation implies platform trust and that specific
    keys are bound to PCR state.
  - Map Go TPM client (`attestation/tpm_client.go`) to spec obligations.

6) Integration & toolchain (1-2 days)
  - Add Lean project configuration (lakefile or lakepkg) to run proofs in CI.
  - Add CI job to run `lake build` for `formal_verification/lean4` (use cached
    elan toolchain installed earlier).

7) Documentation & review (1-2 days)
  - Document proof assumptions, required cryptographic axioms, and mapping
    from code to spec in `formal_verification/README.md`.

Estimated total: 2-3 weeks of focused proof work depending on assumptions and
available formal crypto lemmas to import.

Notes and trade-offs
- Deep cryptographic reductions (e.g., IND-CCA for Kyber) are non-trivial and
  may be imported as trusted axioms if full mechanized proofs are out-of-scope.
- TPM formalization requires a careful model of PCRs, quote generation, and
  signature verification; a pragmatic approach is to prove high-level binding
  assuming a verified `verifyPCRDigests` primitive.

Next immediate task (what I will execute next)
- Create bridging lemmas that connect `crypto/pqc_kex.go` functions to the
  abstract KEM API in Lean and produce a small checklist of remaining proof
  obligations with line references.
