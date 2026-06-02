module github.com/rwilliamspbg-ops/Sovereign-Agentic-Prediction-Market-SAPM-on-Sui-Core

go 1.25.0

// Note: `github.com/google/go-tpm` is used in attestation but the implementation
// is build-tagged with `tpm` to avoid requiring the module during default test
// runs. Add the module to CI/tooling if you enable the `tpm` build tag.

require (
	github.com/cloudflare/circl v1.6.3
	github.com/google/go-tpm v0.9.8
	golang.org/x/crypto v0.52.0
)

require golang.org/x/sys v0.45.0 // indirect
