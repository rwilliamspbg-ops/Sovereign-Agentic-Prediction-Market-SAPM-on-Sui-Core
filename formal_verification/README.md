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
