// SPDX-License-Identifier: Apache-2.0
//go:build tpm

package attestation

import "testing"

func TestTPMClient_NilClientErrors(t *testing.T) {
	var client *TPMClient

	if _, err := client.ReadPCRs(); err == nil {
		t.Fatal("expected ReadPCRs to fail for a nil client")
	}

	if _, err := client.GenerateAttestationReport(); err == nil {
		t.Fatal("expected GenerateAttestationReport to fail for a nil client")
	}
}

func TestTPMClient_NoDeviceReturnsError(t *testing.T) {
	if _, err := NewTPMClient(); err == nil {
		t.Skip("TPM device available in environment; error-path test not applicable")
	}
}
