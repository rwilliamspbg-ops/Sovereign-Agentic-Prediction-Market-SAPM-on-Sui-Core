# SAPM Hybrid KEX Example (X25519 + Kyber-768)

This document shows the high-level usage of the hybrid KEX implemented in
`crypto/pqc_kex.go` and points to the runnable example test at
`crypto/kex_fullflow_test.go`.

Overview
- The hybrid KEX multiplexes a classical X25519 key exchange with a post-
  quantum KEM (CRYSTALS‑Kyber‑768) to produce a combined shared secret.
- The combined secret is then fed into HKDF-SHA256 to derive symmetric keys.

API summary
- `NewHybridKEX()` — generate a new hybrid keypair.
- `ExportPublic()` — serialize the public blob: classical(32) || kyber.PublicKey.
- `Encapsulate(peerPub)` — encapsulate to the peer public blob; returns
  `(combinedShared, ciphertext, err)`. Transmit `ciphertext` to peer.
- `Decapsulate(peerPub, ciphertext)` — decapsulate received ciphertext and
  return the combined shared secret.
- `DeriveSessionKeys(shared, salt, info, keyLen)` — derive `client_write_key`,
  `server_write_key`, and `exporter_key` using HKDF-SHA256 with domain-separated
  `info` labels.

Full-flow example (see test)
- Initiator (A) and Responder (B) each call `NewHybridKEX()`.
- A sends `A.ExportPublic()` to B; B sends `B.ExportPublic()` to A.
- A calls `Encapsulate(B.ExportPublic())` → gets `(sharedA, ct)` and sends `ct` to B.
- B calls `Decapsulate(A.ExportPublic(), ct)` → gets `sharedB`.
- A and B call `DeriveSessionKeys(sharedX, nil, info, 32)` to obtain symmetric keys.
- A uses `client_write_key` to encrypt messages; B uses that same key to decrypt.

Notes
- The implementation returns raw combined shared material and derives keys via
  HKDF — do not use raw shared bytes directly for encryption.
- For production, include transcript hashing and anti-replay measures, and bind
  KEX material into TPM attestation where required.
