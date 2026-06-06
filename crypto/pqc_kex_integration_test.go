// SPDX-License-Identifier: Apache-2.0
package crypto

import (
	"testing"
)

func TestHybridKEX_Exchange(t *testing.T) {
	h, err := NewHybridKEX()
	if err != nil {
		t.Fatalf("NewHybridKEX error: %v", err)
	}

	// Create a peer instance and exchange with it
	p, err := NewHybridKEX()
	if err != nil {
		t.Fatalf("peer NewHybridKEX error: %v", err)
	}

	// Each party exchanges using serialized public material
	peerPub := p.ExportPublic()

	// Initiator encapsulates to peer
	sharedA, ct, err := h.Encapsulate(peerPub)
	if err != nil {
		t.Fatalf("Encapsulate error: %v", err)
	}

	// Peer decapsulates using ciphertext
	peerPubA := h.ExportPublic()
	sharedB, err := p.Decapsulate(peerPubA, ct)
	if err != nil {
		t.Fatalf("Decapsulate error: %v", err)
	}

	if len(sharedA) != len(sharedB) {
		t.Fatalf("Shared lengths differ: %d vs %d", len(sharedA), len(sharedB))
	}

	for i := range sharedA {
		if sharedA[i] != sharedB[i] {
			t.Fatalf("Shared secrets differ at byte %d", i)
		}
	}

	// Derive symmetric keys via HKDF-SHA256 and verify equality
	info := []byte("SAPM hybrid kex v1")
	keyA, err := DeriveSymmetricKey(sharedA, nil, info, 32)
	if err != nil {
		t.Fatalf("DeriveSymmetricKey A error: %v", err)
	}
	keyB, err := DeriveSymmetricKey(sharedB, nil, info, 32)
	if err != nil {
		t.Fatalf("DeriveSymmetricKey B error: %v", err)
	}
	if len(keyA) != 32 || len(keyB) != 32 {
		t.Fatalf("Derived key length incorrect: %d vs %d", len(keyA), len(keyB))
	}
	for i := range keyA {
		if keyA[i] != keyB[i] {
			t.Fatalf("Derived keys differ at byte %d", i)
		}
	}
}
