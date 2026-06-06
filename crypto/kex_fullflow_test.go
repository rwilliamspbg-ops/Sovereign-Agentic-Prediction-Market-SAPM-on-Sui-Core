// SPDX-License-Identifier: Apache-2.0
package crypto

import (
	"crypto/rand"
	"testing"

	"golang.org/x/crypto/chacha20poly1305"
)

func TestHybridKEX_FullFlow_AEAD(t *testing.T) {
	// Create two parties
	a, err := NewHybridKEX()
	if err != nil {
		t.Fatalf("NewHybridKEX A: %v", err)
	}
	b, err := NewHybridKEX()
	if err != nil {
		t.Fatalf("NewHybridKEX B: %v", err)
	}

	// Exchange public blobs
	pubA := a.ExportPublic()
	pubB := b.ExportPublic()

	// A encapsulates to B
	sharedA, ct, err := a.Encapsulate(pubB)
	if err != nil {
		t.Fatalf("A.Encapsulate: %v", err)
	}

	// B decapsulates
	sharedB, err := b.Decapsulate(pubA, ct)
	if err != nil {
		t.Fatalf("B.Decapsulate: %v", err)
	}

	// Derive session keys
	info := []byte("SAPM hybrid kex v1")
	skA, err := DeriveSessionKeys(sharedA, nil, info, 32)
	if err != nil {
		t.Fatalf("DeriveSessionKeys A: %v", err)
	}
	skB, err := DeriveSessionKeys(sharedB, nil, info, 32)
	if err != nil {
		t.Fatalf("DeriveSessionKeys B: %v", err)
	}

	// Client (A) uses ClientWriteKey to encrypt, Server (B) uses same key to decrypt
	aead, err := chacha20poly1305.New(skA.ClientWriteKey)
	if err != nil {
		t.Fatalf("New AEAD A: %v", err)
	}
	nonce := make([]byte, chacha20poly1305.NonceSize)
	if _, err := rand.Read(nonce); err != nil {
		t.Fatalf("nonce: %v", err)
	}
	msg := []byte("hello from A")
	ct2 := aead.Seal(nil, nonce, msg, nil)

	// B reconstruct AEAD with derived client write key
	aeadB, err := chacha20poly1305.New(skB.ClientWriteKey)
	if err != nil {
		t.Fatalf("New AEAD B: %v", err)
	}
	pt, err := aeadB.Open(nil, nonce, ct2, nil)
	if err != nil {
		t.Fatalf("Decrypt failed: %v", err)
	}
	if string(pt) != string(msg) {
		t.Fatalf("Decrypted mismatch: %s vs %s", string(pt), string(msg))
	}
}
