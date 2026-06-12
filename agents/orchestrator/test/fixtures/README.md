# Orchestrator Attestation Fixtures

This directory contains deterministic attestation fixtures used by orchestrator regression tests and staging evidence rehearsal flows.

## Files

- `attestation-staging-valid.json`: valid staged TPM/TEE evidence fixture accepted by `AttestationClient.readTPM()`.
- `attestation-staging-invalid.json`: invalid staged TPM/TEE evidence fixture with a mismatched digest used to prove fail-closed behavior.

## Fixture Contract

Each attestation fixture must be valid JSON with the following fields:

```json
{
  "rawMeasurement": "string",
  "capturedAt": "ISO-8601 timestamp",
  "platform": "staging node identifier",
  "measurements": {
    "sha256": "base64 sha256(rawMeasurement)",
    "teeRuntime": "tpm2|sev|sgx|other-runtime"
  }
}
```

Validation rules enforced by `AttestationClient.readTPM()`:

- `rawMeasurement` must be present and non-empty.
- `measurements.sha256` must be present and non-empty.
- `measurements.sha256` must exactly match `sha256(rawMeasurement)` encoded in base64.
- Digest mismatch fails closed before attestation evidence is accepted.

## Staging Usage

- Set `ATTESTATION_FIXTURE_PATH` or `attestationFixturePath` to point to a fixture file.
- Set `TEE_RUNTIME` or `teeRuntime` to the expected platform runtime for the staged environment.
- Use `ATTESTATION_TRUSTED_ROOTS` or `attestationTrustedRoots` when staging root trust policy checks for ORCH-005.

## Operator Guidance

- Treat these fixtures as contract samples, not production evidence.
- Hardware-backed staging evidence must still be captured from a real TPM/TEE environment before ORCH-004 and ORCH-005 are considered closed operationally.
