//go:build tpm
// +build tpm

package attestation

import (
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"os"

	"github.com/google/go-tpm/tpm2"
	"github.com/google/go-tpm/tpm2/transport"
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
	selection := tpm2.TPMLPCRSelection{
		PCRSelections: []tpm2.TPMSPCRSelection{{
			Hash:      tpm2.TPMAlgSHA256,
			PCRSelect: tpm2.PCClientCompatible.PCRs(0, 1, 2, 3, 4, 5, 6, 7),
		}},
	}
	rsp, err := (tpm2.PCRRead{PCRSelectionIn: selection}).Execute(transport.FromReadWriteCloser(c.rw))
	if err != nil {
		return nil, err
	}
	res := make(map[int][]byte, len(rsp.PCRValues.Digests))
	for i, digest := range rsp.PCRValues.Digests {
		res[i] = append([]byte(nil), digest.Buffer...)
	}
	return res, nil
}

// GenerateAttestationReport produces a minimal PCR summary report.
func (c *TPMClient) GenerateAttestationReport() (*CertChain, error) {
	pcrs, err := c.ReadPCRs()
	if err != nil {
		return nil, err
	}
	report := "TPM attestation report\n"
	for i := 0; i <= 7; i++ {
		report += fmt.Sprintf("PCR[%d]=%s\n", i, hex.EncodeToString(pcrs[i]))
	}
	return &CertChain{PEM: []byte(report)}, nil
}
