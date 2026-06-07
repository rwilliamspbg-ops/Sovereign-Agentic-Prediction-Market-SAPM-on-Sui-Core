# SAPM - Sovereign Agentic Prediction Market on Sui

[![Release Gate](https://img.shields.io/github/actions/workflow/status/rwilliamspbg-ops/Sovereign-Agentic-Prediction-Market-SAPM-on-Sui-Core/ci.yml?branch=main&style=for-the-badge&logo=githubactions&logoColor=white&label=Release%20Gate)](https://github.com/rwilliamspbg-ops/Sovereign-Agentic-Prediction-Market-SAPM-on-Sui-Core/actions/workflows/ci.yml)
[![Stack Validation](https://img.shields.io/github/actions/workflow/status/rwilliamspbg-ops/Sovereign-Agentic-Prediction-Market-SAPM-on-Sui-Core/ci_validation.yml?branch=main&style=for-the-badge&logo=docker&logoColor=white&label=Stack%20Validation)](https://github.com/rwilliamspbg-ops/Sovereign-Agentic-Prediction-Market-SAPM-on-Sui-Core/actions/workflows/ci_validation.yml)
[![Lean Verification](https://img.shields.io/github/actions/workflow/status/rwilliamspbg-ops/Sovereign-Agentic-Prediction-Market-SAPM-on-Sui-Core/lean-verification.yml?branch=main&style=for-the-badge&logo=leanpub&logoColor=white&label=Lean%20Verification)](https://github.com/rwilliamspbg-ops/Sovereign-Agentic-Prediction-Market-SAPM-on-Sui-Core/actions/workflows/lean-verification.yml)
[![Lean Rust Runner](https://img.shields.io/github/actions/workflow/status/rwilliamspbg-ops/Sovereign-Agentic-Prediction-Market-SAPM-on-Sui-Core/lean-rust-runner-image.yml?branch=main&style=for-the-badge&logo=rust&logoColor=white&label=Lean%20Rust%20Runner)](https://github.com/rwilliamspbg-ops/Sovereign-Agentic-Prediction-Market-SAPM-on-Sui-Core/actions/workflows/lean-rust-runner-image.yml)
[![Phase2 Hardening](https://img.shields.io/github/actions/workflow/status/rwilliamspbg-ops/Sovereign-Agentic-Prediction-Market-SAPM-on-Sui-Core/phase2-hardening-ci.yml?branch=main&style=for-the-badge&logo=shield&logoColor=white&label=Phase2%20Hardening)](https://github.com/rwilliamspbg-ops/Sovereign-Agentic-Prediction-Market-SAPM-on-Sui-Core/actions/workflows/phase2-hardening-ci.yml)
[![Node >=18](https://img.shields.io/badge/Node-%3E%3D18-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](package.json)
[![Sui Testnet](https://img.shields.io/badge/Sui-Testnet-6fbcf0?style=for-the-badge&logo=sui&logoColor=0b1f3a)](https://docs.sui.io)
[![Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-D22128?style=for-the-badge&logo=apache&logoColor=white)](LICENSE.md)

SAPM is a Sui-based prediction market stack that combines autonomous agents, market aggregation, risk controls, and a polished Next.js frontend for live demo and judge workflows. The repository is organized as a monorepo with agent services, smart-contract sources, a frontend app, formal verification artifacts, and deployment/ops material.

**Current status:** feature-complete for the current demo scope, with release-gate validation green in this workspace and production-readiness hardening still in progress.

See [docs/INDEX.md](docs/INDEX.md) for the full documentation index.

## What SAPM Does

SAPM demonstrates a full prediction-market workflow:

1. Market discovery and board-style scanning.
2. Agent forecasting and consensus building.
3. Trade planning and Sui transaction execution.
4. Snapshot archiving to Walrus.
5. On-chain object and package inspection for verification.

The UI now includes Judge Mode, wallet-aware trade execution, Walrus archive/preview flows, DeepBook/Walrus status panels, and a production-oriented loading/error fallback layer.

## Current Capabilities

| Area | Status | Notes |
| --- | --- | --- |
| Frontend market UI | Implemented | Next.js App Router, board/cursor views, market cards, filtering, and resource hub |
| Wallet integration | Implemented | Wallet-standard connect flow with Sui-aware trade execution and session syncing |
| Judge Mode | Implemented | Guided flow for connect, on-chain read, micro trade, Walrus archive, preview |
| DeepBook integration | Present | Status checks and linkouts are wired into the UI |
| Walrus integration | Present | Snapshot publish/read flows are available from the frontend |
| Agent pipeline | Implemented | Forecast, aggregation, and trade decision logic are present |
| Risk controls | Implemented | Trade preflight, notional caps, idempotency, and retry logic |
| Move contracts | Source present | Registry/incentives sources are present; deployment/runtime verification depends on environment |
| Formal verification | Present | Lean artifacts and scripts are included in the repo |
| Release validation | Green in this workspace | `npm run release:check` passes after clean bootstrap |

## Quick Start

### Prerequisites

- Node.js 18 or newer
- npm
- Docker and Docker Compose
- Optional: Sui CLI for contract work

### Install

```bash
npm install
```

If you want all package-level dependencies bootstrapped in one shot:

```bash
npm run install:all
```

### Run the stack

```bash
docker compose up
```

Frontend: http://localhost:3000

### Run the frontend locally

```bash
cd frontend
npm run dev -- -p 3000
```

The frontend dev script is configured to avoid filesystem-cache issues in this workspace.

## Validation and Scripts

Root-level scripts:

```bash
npm run test:trader
npm run test:aggregator
npm run test:all
npm run test:e2e
npm run check:frontend:prod
npm run bench:aggregator
npm run lint
npm run release:check
```

Current canonical gate:

```bash
npm run release:check
```

What it does:

1. Installs required dependencies.
2. Runs repository linting.
3. Runs trader and aggregator tests.
4. Verifies the root e2e suite.

Frontend production gate:

```bash
npm run check:frontend:prod
```

That gate performs a clean frontend type-check and production build.

## Frontend Overview

The frontend is a Next.js 14 App Router app with:

- market discovery and board views
- resource hub and documentation routes
- wallet-aware trade execution
- Judge Mode for demo/judge proof flows
- Walrus snapshot archive and preview
- DeepBook/Walrus status panels
- branded loading and error fallbacks to avoid blank white pages

Key entry points:

- [frontend/src/app/page.tsx](frontend/src/app/page.tsx)
- [frontend/src/app/markets/page.tsx](frontend/src/app/markets/page.tsx)
- [frontend/src/app/layout.tsx](frontend/src/app/layout.tsx)
- [frontend/src/components/TradeExecution.tsx](frontend/src/components/TradeExecution.tsx)
- [frontend/src/services/sui/wallet-standard.ts](frontend/src/services/sui/wallet-standard.ts)

## Repository Layout

```text
agents/                    Agent, aggregator, trader, and registry code
ai-agents/                 Consensus/reasoning/memory helpers
attestation/               TPM and attestation utilities
cmd/                       CLI entry points
crypto/                    PQC/KEX code and tests
demo/                      Demo scripts and HTML dashboard
docker/                    Docker Compose and Nginx assets
docs/                      Canonical documentation set
formal_verification/       Lean proof artifacts and scripts
frontend/                  Next.js frontend
k8s/                       Kubernetes monitoring assets
market-data/               DeepBook/market data helpers
performance_optimization/  Performance notes and tuning docs
production-deployment-manifests/  Helm and Kubernetes manifests
risk-management/           Risk-control controls and notes
rust-datapath/             Rust datapath experiment
scripts/                   Repo automation and validation scripts
test/                      End-to-end tests
```

## Architecture Snapshot

SAPM is built around a simple flow:

```mermaid
flowchart LR
  A[Market Data] --> B[Aggregator]
  B --> C[Trader / PTB Planner]
  C --> D[Sui Transaction]
  D --> E[Walrus Snapshot]
  E --> F[Judge / Verification UI]
```

At a high level:

- Agents produce forecasts and consensus.
- The trader converts that output into execution intent.
- The frontend exposes the live workflow and verification surfaces.
- The contract and deployment layers provide the on-chain target.

## Deployment and Status Notes

The repo contains the current hardening and production-readiness workstream, but not every deploy path has been exercised end-to-end in every environment. The most accurate status source is:

- [docs/PRODUCTION_STATUS.md](docs/PRODUCTION_STATUS.md)

For operational steps, see:

- [docs/OPERATIONS_RUNBOOK.md](docs/OPERATIONS_RUNBOOK.md)

For contribution workflow, see:

- [CONTRIBUTING.md](CONTRIBUTING.md)

## Getting Started For Different Roles

### Judges / Demo Reviewers

1. Start the stack with `docker compose up`.
2. Open the frontend at http://localhost:3000.
3. Use Judge Mode to walk through connect, on-chain read, micro trade, archive, and preview.
4. Review the latest status in [docs/PRODUCTION_STATUS.md](docs/PRODUCTION_STATUS.md).

### Contributors

1. Read [docs/INDEX.md](docs/INDEX.md).
2. Read [CONTRIBUTING.md](CONTRIBUTING.md).
3. Run `npm run release:check` before opening a PR.
4. Keep changes aligned with the current status docs and root scripts.

### Developers

1. Explore `frontend/src/app` for the UI.
2. Explore `agents/` for the pipeline.
3. Use `scripts/frontend_production_gate.sh` and `scripts/release_check.sh` for validation.

## Notes On Current Validation

In this workspace, the canonical release gate passes after a clean bootstrap. The frontend has also been hardened with wallet/session validation, loading/error fallbacks, and production build checks.

For the live status snapshot, prefer [docs/PRODUCTION_STATUS.md](docs/PRODUCTION_STATUS.md) over this README.

## Contributing

Contributions are welcome. Please keep README and status docs consistent with the current codebase, especially when changing:

- frontend routes and wallet integration
- release or validation scripts
- contract sources and deployment assumptions
- operations or environment setup

## License

Apache 2.0. See [LICENSE.md](LICENSE.md).
