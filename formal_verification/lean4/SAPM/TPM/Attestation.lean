import SAPM.TPM.Primitives

namespace SAPM.TPM

theorem tpm_attestation_verification (report : AttestationReport) :
  verifyAttestation report = true →
  ∃ trusted : TrustedPlatform,
    trusted.isTrusted = true ∧ trusted.version = report.tpmVersion := by
  intro h
  exact attestation_binding report h

theorem tpm_remote_attestation (report : AttestationReport) :
  verifyAttestation report = true →
  ∃ platform_state : TrustedPlatform,
    platform_state.isTrusted = true ∧ platform_state.version = report.tpmVersion := by
  intro h
  exact attestation_binding report h

end SAPM.TPM
