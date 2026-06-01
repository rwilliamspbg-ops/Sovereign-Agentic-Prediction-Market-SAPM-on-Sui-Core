package crypto

import (
	"crypto/rand"
	"errors"

	"crypto/sha256"

	kyber "github.com/cloudflare/circl/kem/kyber/kyber768"
	"golang.org/x/crypto/curve25519"
	"golang.org/x/crypto/hkdf"
)

// HybridKEX implements x25519 hybrid key exchange with Kyber-768 as the PQC
// KEM. Public serialization is classical(32) || kyber.PublicKey.
type HybridKEX struct {
	classicalPriv [32]byte
	classicalPub  [32]byte
	pqPriv        *kyber.PrivateKey
	pqPub         *kyber.PublicKey
	pqPubBytes    []byte
}

// NewHybridKEX generates a fresh hybrid keypair (classical + Kyber-768).
func NewHybridKEX() (*HybridKEX, error) {
	var priv [32]byte
	if _, err := rand.Read(priv[:]); err != nil {
		return nil, err
	}

	pub, err := curve25519.X25519(priv[:], curve25519.Basepoint)
	if err != nil {
		return nil, err
	}
	var pub32 [32]byte
	copy(pub32[:], pub)

	// Generate PQC keypair (Kyber-768)
	pqPub, pqPriv, err := kyber.GenerateKeyPair(rand.Reader)
	if err != nil {
		return nil, err
	}

	pqPubBuf := make([]byte, kyber.PublicKeySize)
	pqPub.Pack(pqPubBuf)

	return &HybridKEX{
		classicalPriv: priv,
		classicalPub:  pub32,
		pqPriv:        pqPriv,
		pqPub:         pqPub,
		pqPubBytes:    pqPubBuf,
	}, nil
}

// ExportPublic returns classical(32) || serialized Kyber public key.
func (h *HybridKEX) ExportPublic() []byte {
	out := make([]byte, 32+len(h.pqPubBytes))
	copy(out[:32], h.classicalPub[:])
	copy(out[32:], h.pqPubBytes)
	return out
}

// Encapsulate encapsulates to the peer public blob (classical||pqc) and
// returns (combinedShared, ciphertext, error). The caller should transmit
// ciphertext to the peer so they can decapsulate and derive the same PQC
// shared secret.
func (h *HybridKEX) Encapsulate(peerPub []byte) ([]byte, []byte, error) {
	if len(peerPub) < 32+kyber.PublicKeySize {
		return nil, nil, errors.New("peer public too short")
	}

	peerClassical := peerPub[:32]
	peerPQC := peerPub[32 : 32+kyber.PublicKeySize]

	classicalShared, err := curve25519.X25519(h.classicalPriv[:], peerClassical)
	if err != nil {
		return nil, nil, err
	}

	var peerPK kyber.PublicKey
	peerPK.Unpack(peerPQC)

	ct := make([]byte, kyber.CiphertextSize)
	ss := make([]byte, kyber.SharedKeySize)
	peerPK.EncapsulateTo(ct, ss, nil)

	combined := make([]byte, len(classicalShared)+len(ss))
	copy(combined[:len(classicalShared)], classicalShared)
	copy(combined[len(classicalShared):], ss)
	return combined, ct, nil
}

// Decapsulate decapsulates the provided ciphertext (from a peer that used
// Encapsulate) and returns the combined shared secret using the peer's
// classical public key and this instance's Kyber private key.
func (h *HybridKEX) Decapsulate(peerPub []byte, ct []byte) ([]byte, error) {
	if len(peerPub) < 32+kyber.PublicKeySize {
		return nil, errors.New("peer public too short")
	}
	peerClassical := peerPub[:32]

	classicalShared, err := curve25519.X25519(h.classicalPriv[:], peerClassical)
	if err != nil {
		return nil, err
	}

	ss := make([]byte, kyber.SharedKeySize)
	h.pqPriv.DecapsulateTo(ss, ct)

	combined := make([]byte, len(classicalShared)+len(ss))
	copy(combined[:len(classicalShared)], classicalShared)
	copy(combined[len(classicalShared):], ss)
	return combined, nil
}

// DeriveSymmetricKey derives a symmetric key of `length` bytes from the
// combined shared secret using HKDF-SHA256. `salt` and `info` are optional
// context values; pass nil for default.
func DeriveSymmetricKey(shared []byte, salt []byte, info []byte, length int) ([]byte, error) {
	if length <= 0 {
		return nil, errors.New("invalid length")
	}
	hk := hkdf.New(sha256.New, shared, salt, info)
	out := make([]byte, length)
	if _, err := hk.Read(out); err != nil {
		return nil, err
	}
	return out, nil
}

// SessionKeys holds derived session keys for both directions plus an exporter.
type SessionKeys struct {
	ClientWriteKey []byte // used by client to write
	ServerWriteKey []byte // used by server to write
	ExporterKey    []byte // auxiliary exporter key
}

// DeriveSessionKeys derives multiple keys from the combined shared secret.
// It uses HKDF-SHA256 with different info labels for domain separation.
// - infoBase: base context (e.g., "SAPM hybrid kex v1").
// - salt: optional salt; pass nil if not used.
// Returns keys of requested length (keyLen bytes each).
func DeriveSessionKeys(shared []byte, salt []byte, infoBase []byte, keyLen int) (*SessionKeys, error) {
	if keyLen <= 0 {
		return nil, errors.New("invalid key length")
	}
	clientInfo := append(infoBase, []byte("|client write")...)
	serverInfo := append(infoBase, []byte("|server write")...)
	exporterInfo := append(infoBase, []byte("|exporter")...)

	ck, err := DeriveSymmetricKey(shared, salt, clientInfo, keyLen)
	if err != nil {
		return nil, err
	}
	sk, err := DeriveSymmetricKey(shared, salt, serverInfo, keyLen)
	if err != nil {
		return nil, err
	}
	ek, err := DeriveSymmetricKey(shared, salt, exporterInfo, keyLen)
	if err != nil {
		return nil, err
	}

	return &SessionKeys{ClientWriteKey: ck, ServerWriteKey: sk, ExporterKey: ek}, nil
}

// DeriveResumptionPSK derives a PSK suitable for session resumption from the
// combined shared secret using the exporter label. Returns `pskLen` bytes.
func DeriveResumptionPSK(shared []byte, salt []byte, infoBase []byte, pskLen int) ([]byte, error) {
	if pskLen <= 0 {
		return nil, errors.New("invalid psk length")
	}
	exporterInfo := append(infoBase, []byte("|resumption psk")...)
	return DeriveSymmetricKey(shared, salt, exporterInfo, pskLen)
}
