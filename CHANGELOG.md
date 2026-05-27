# Changelog

All notable changes to this project will be documented in this file.

The format is inspired by Keep a Changelog and this project uses date-based milestone entries.

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
