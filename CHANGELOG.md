# Changelog

All notable changes to this project will be documented in this file.

The format is inspired by Keep a Changelog and this project uses date-based milestone entries.

## 2026-05-27 - Phase 2 Hardening, Simulation Coverage, And Release Hygiene

### Added

- Byzantine-resilient aggregation strategy support in `agents/aggregator` with trimmed-mean and Multi-Krum-style selection.
- Round proposal / vote / finalization APIs for consensus-driven forecast commits.
- Local and consolidated simulation reports for Byzantine, replay/stale-timestamp, and invalid-signature/unknown-pubkey profiles.
- Repo-local go/no-go smoke gate in `scripts/phase2_go_nogo.sh`.
- GitHub Actions policy gate workflow for Phase 2 hardening validation.
- Environment template in `.env.example` and repo ignore rules in `.gitignore`.

### Changed

- Aggregator now supports strict proof enforcement, startup config validation, and live Sui commitment submission when signing credentials are configured.
- Sample agent update flow now uses bounded retry/backoff and centralized signing helpers.
- Documentation updated to reflect the hardened Phase 2 baseline and the handoff into Phase 3 trading integration.

### Removed

- Tracked TLS private key material removed from the repository and replaced with a placeholder example.

### Verified

- Phase 2 unit tests and simulation suites pass.
- Consolidated profile report passes and is written to `artifacts/phase2/phase2_profiles_report.json`.
- Go/no-go gate passes in non-enforced mode.

### Notes

- Testnet / production on-chain submission still requires operator-provided `AGG_SUI_SECRET`, `REGISTRY_PACKAGE_ID`, and `REGISTRY_OBJ_ID`.
- Phase 3 work will build on the finalized forecast outputs and on-chain commitment flow.

## 2026-05-27 - Phase 0 Bootstrap And Localnet Transaction Baseline

### Added
- Local Sui validator container flow in `docker/sui-local` with dynamic startup entrypoint.
- Local Docker Compose stack in `docker/docker-compose.yml` for `sui-local` and `agent-sample` services.
- Agent sample service in `agents/sample` with a Node-based transaction script.
- Bootstrap setup script in `scripts/bootstrap_phase0.sh` for foundational toolchain and environment setup.
- Repository docs baseline under `docs/` including production readiness and operations guidance.

### Changed
- `sui-local` startup moved to `sui start` path with fallback command handling for compatibility.
- Sui local image optimized by removing nonessential large binaries from release artifacts.
- Compose service dependency strengthened with healthcheck and conditional startup (`service_healthy`).
- Agent sample updated from simple RPC probe to real signed transaction execution against localnet.
- Agent sample now requests gas from local faucet (`/v2/gas`) before transaction execution.

### Verified
- Local RPC endpoint returns valid JSON-RPC responses after startup.
- `agent-sample` executes a funded transaction and reports successful execution status.
- Compose startup sequencing gates agent startup on local validator health.

### Notes
- Current localnet flow uses `--force-regenesis` for deterministic clean starts during development.
- Production work should replace ephemeral keys and dev faucet flows with managed custody and funding controls.
