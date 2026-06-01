-- Bridging: map implementation functions to formal primitives.
--
-- This file declares abstract constants/axioms that represent the behavior
-- of the production Go implementation. Proof obligations reference these
-- axioms and must be discharged either by proving the axioms from lower-level
-- assumptions or by providing a verified implementation.

import Mathlib.Tactic

-- Implementation mapping notes:
--   Go: crypto/pqc_kex.go
--     - `Encapsulate(peerPub)` -> produces (combinedShared, ciphertext)
--     - `Decapsulate(peerPub, ct)` -> produces combinedShared
--   Go: attestation/tpm_client.go
--     - `ReadPCRs()` -> reads PCR values
--     - `GenerateAttestationReport()` -> produces attestation report

/- Abstract implementation constants (to be justified) -/

-- Implementation-level encapsulate/decapsulate (for bridging proofs)
-- We use abstract numeric types here to avoid import/module layout issues in
-- this lightweight bridging file; these map to KEM types in `kem_api.lean`.
constant impl_encapsulate : Nat → Nat × Nat
constant impl_decapsulate : Nat → Nat → Nat

-- Correctness axiom tying the implementation to the abstract spec
axiom impl_kem_correctness : ∀ (pk sk : Nat),
  let (ct, ss) := impl_encapsulate pk in impl_decapsulate sk ct = ss

-- TPM bridging constants (placeholders)
constant impl_read_pcrs : Unit → Bool
constant impl_generate_attestation : Unit → Bool

-- Notes: these constants are intentionally abstract; proofs will refer to
-- them and later must be justified by either proving the corresponding
-- properties from the implementation or by clearly documenting the
-- assumptions used in the proofs.
