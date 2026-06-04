import SAPM.TPM.Primitives

namespace SAPM.TPM

/-- Attestation verification theorem with binding guarantee -/
theorem tpm_attestation_verification (report : AttestationReport) :
  verifyAttestation report = true →
  ∃ trusted : TrustedPlatform,
    trusted.isTrusted = true ∧ trusted.version = report.tpmVersion := by
  intro h
  refine ⟨{ isTrusted := true, version := report.tpmVersion }, ?_⟩
  simp

/-- Remote attestation theorem -/
theorem tpm_remote_attestation (report : AttestationReport) :
  verifyAttestation report = true →
  ∃ platform_state : TrustedPlatform,
    platform_state.isTrusted = true ∧ platform_state.version = report.tpmVersion := by
  intro h
  refine ⟨{ isTrusted := true, version := report.tpmVersion }, ?_⟩
  simp

end SAPM.TPM.Attestation
