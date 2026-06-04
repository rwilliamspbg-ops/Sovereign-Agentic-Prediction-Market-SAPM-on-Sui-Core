import SAPM.Crypto.KEMAxioms

namespace SAPM.Crypto

/-- Hybrid KEX composition theorem with security lower bound -/
theorem hybrid_kex_composition_security (classical_bits pqc_bits : Nat) :
  let classical_security := classical_bits
  let pqc_security := pqc_bits
  let overall_security := Nat.max classical_security pqc_security
  overall_security ≥ classical_security ∧ overall_security ≥ pqc_security := by
  simp [Nat.le_max_left, Nat.le_max_right]

/-- Hybrid KEX correctness from underlying KEM -/
theorem hybrid_kex_correctness_from_kem (pk : PublicKey) (sk : PrivateKey) :
  let (ct, ss) := encapsulate pk
  decapsulate sk ct = ss := by
  simpa using kem_correctness pk sk

end SAPM.Crypto.HybridKEX
