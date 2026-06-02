/- KEM API primitives for SAPM formalization -/
import Mathlib.Tactic

/- Abstract KEM types -/
structure KEM_PublicKey (α : Type) where
  repr : α

structure KEM_PrivateKey (α : Type) where
  repr : α

structure KEM_Ciphertext (α : Type) where
  repr : α

structure KEM_Shared (α : Type) where
  repr : α

/- Abstract KEM interface: encapsulate and decapsulate -/
variable {α : Type}

def encapsulate (pk : KEM_PublicKey α) : KEM_Ciphertext α × KEM_Shared α :=
  (KEM_Ciphertext.mk pk.repr, KEM_Shared.mk pk.repr)

def decapsulate (sk : KEM_PrivateKey α) (ct : KEM_Ciphertext α) : KEM_Shared α :=
  KEM_Shared.mk sk.repr

/- KEM correctness axiom (to be proved or assumed for concrete schemes) -/
axiom KEM_correctness : ∀ (pk : KEM_PublicKey α) (sk : KEM_PrivateKey α),
  let (ct, ss) := encapsulate pk
  decapsulate sk ct = ss
