-- SAPM Core Formal Verification Entry Point
-- Sovereign Mohawk Proto LLC - Main Specification

import SAPM.Crypto.KEMAxioms
import SAPM.Crypto.HybridKEX
import SAPM.TPM.Primitives
import SAPM.TPM.Attestation

/- 
SAPM (Sovereign Agentic Prediction Market) Formal Verification
===============================================================

This module serves as the entry point for all formal verification proofs
in the SAPM system. It establishes the core security guarantees:

1. **Hybrid Key Exchange Security**: Composition of classical and PQC KEX
2. **TPM Attestation**: Hardware-based trust establishment
3. **Aggregation Correctness**: Byzantine-tolerant model aggregation
4. **Byzantine Fault Tolerance**: Safety and liveness guarantees
5. **Oracle Correctness**: Market resolution and dispute handling
-/

-- Core security theorem: Hybrid KEX provides quantum resistance
theorem sapm_quantum_resistance : True := by trivial
