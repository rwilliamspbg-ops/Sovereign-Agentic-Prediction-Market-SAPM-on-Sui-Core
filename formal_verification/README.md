# Formal Verification Workspace

This directory contains the Lean 4 formalization used for SAPM proof work.

## Layout

- `lakefile.lean` - Lean project configuration.
- `lean-toolchain` - pinned Lean version.
- `lean4/SAPM/` - self-contained Lean modules built by CI.

Current modules
- `lean4/SAPM/Crypto/KEMAxioms.lean` - abstract KEM types and correctness axiom.
- `lean4/SAPM/Crypto/HybridKEX.lean` - hybrid composition theorem and KEM-based correctness lemma.
- `lean4/SAPM/TPM/Primitives.lean` - TPM PCR/attestation primitives and binding theorem.
- `lean4/SAPM/TPM/Attestation.lean` - attestation wrappers built from the primitives.
- `lean4/SAPM.lean` - root module imported by `lake build`.

## Build

Run from this directory:

```bash
lake build
```

The Lean verification CI workflow also runs `lake build` after bootstrapping the toolchain.

CI now prefers the prebuilt Lean/Rust runner image published by `.github/workflows/lean-rust-runner-image.yml`; if the image is unavailable, the workflow falls back to `scripts/bootstrap_toolchains.sh`.

# SAPM Formal Verification Framework

**Sovereign Agentic Prediction Market - Lean 4 Formal Verification Suite**

This repository contains formally verified specifications for the SAPM aggregation, Byzantine fault tolerance, cryptographic protocols, and oracle contract logic.

## Overview

### What is Formal Verification?

Formal verification uses mathematical proofs to guarantee system correctness before deployment. This ensures:
- **Safety**: System never enters invalid states
- **Liveness**: System eventually responds to inputs  
- **Security**: Cryptographic protocols resist attacks
- **Consistency**: Honest agents always agree on outcomes

### Architecture

```
formal_verification/
├── lean4/
│   ├── aggregation/        # Multi-Krum aggregation proofs
│   │   ├── multi_krum_correctness.lean
│   │   └── outlier_detection.lean
│   ├── byzantine_tolerance/ # BFT consensus proofs
│   │   ├── bft_agreement.lean
│   │   ├── reputation_slashing.lean
│   │   └── gossip_safety.lean
│   ├── crypto/             # Cryptographic protocol proofs
│   │   ├── hybrid_kex_spec.lean
│   │   ├── xmss_tree_verify.lean
│   │   └── tpm_attestation.lean
│   └── oracle/             # Oracle contract logic proofs
│       ├── prediction_contract.lean
│       └── market_discovery.lean
├── artifacts/              # Generated JSON artifacts
│   ├── theorems.json       # Theorem registry
│   ├── traceability_matrix.json
│   └── verification_summary.json
├── scripts/                # Automation scripts
├── config/                 # Build configurations
└── Makefile               # Build targets
