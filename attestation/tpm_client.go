//go:build tpm
// +build tpm

package attestation

import (
	"errors"
	"io"
	"os"

	"github.com/google/go-tpm/tpm2"
)

// CertChain is a minimal placeholder for an attestation certificate chain.
type CertChain struct {
	PEM []byte
}

// TPMClient provides a minimal TPM attestation client scaffold.
type TPMClient struct {
	rw io.ReadWriteCloser
}

// NewTPMClient opens the system TPM device (e.g., /dev/tpm0) or returns an error.
func NewTPMClient() (*TPMClient, error) {
	// Prefer /dev/tpmrm0 (resource manager) when available
	paths := []string{"/dev/tpmrm0", "/dev/tpm0"}
	var f *os.File
	var err error
	for _, p := range paths {
		f, err = os.OpenFile(p, os.O_RDWR, 0)
		if err == nil {
			return &TPMClient{rw: f}, nil
		}
	}
	return nil, errors.New("no TPM device available")
}

// ReadPCRs reads PCR registers (SHA256 bank) and returns the PCR values as byte
// arrays concatenated by index. If TPM is not available, returns an error.
func (c *TPMClient) ReadPCRs() (map[int][]byte, error) {
	if c == nil || c.rw == nil {
		return nil, errors.New("TPM client not initialized")
	}
	// Read PCRs 0..7 for PCR bank SHA256 as an example
	res := make(map[int][]byte)
	for i := 0; i <= 7; i++ {
		val, err := tpm2.ReadPCR(c.rw, i, tpm2.AlgSHA256)
		if err != nil {
			return nil, err
		}
		res[i] = val
	}
	return res, nil
}

// GenerateAttestationReport produces a simple report; full attestation is
// out-of-scope here and requires TPM keys and certificates.
func (c *TPMClient) GenerateAttestationReport() (*CertChain, error) {
	return nil, errors.New("attestation report generation not implemented")
}
