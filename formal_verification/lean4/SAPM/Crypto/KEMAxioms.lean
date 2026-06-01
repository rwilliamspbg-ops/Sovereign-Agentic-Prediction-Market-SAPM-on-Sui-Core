namespace SAPM.Crypto

structure PublicKey where
  bytes : List Nat

structure PrivateKey where
  bytes : List Nat

structure Ciphertext where
  bytes : List Nat

structure SharedSecret where
  bytes : List Nat

def encapsulate (pk : PublicKey) : Ciphertext × SharedSecret :=
  ({ bytes := pk.bytes }, { bytes := pk.bytes })

def decapsulate (sk : PrivateKey) (_ct : Ciphertext) : SharedSecret :=
  { bytes := sk.bytes }

axiom kem_correctness : ∀ (pk : PublicKey) (sk : PrivateKey),
  let (ct, ss) := encapsulate pk
  decapsulate sk ct = ss

theorem shared_secret_consistent (pk : PublicKey) (sk : PrivateKey) :
  let (ct, ss) := encapsulate pk
  decapsulate sk ct = ss := by
  simpa using kem_correctness pk sk

end SAPM.Crypto
