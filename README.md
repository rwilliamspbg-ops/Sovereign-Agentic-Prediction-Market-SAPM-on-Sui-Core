# SAPM — Sovereign Agentic Prediction Market on Sui

[![Release Gate](https://img.shields.io/github/actions/workflow/status/rwilliamspbg-ops/Sovereign-Agentic-Prediction-Market-SAPM-on-Sui-Core/ci.yml?branch=main&style=for-the-badge&logo=githubactions&logoColor=white&label=Release%20Gate)](https://github.com/rwilliamspbg-ops/Sovereign-Agentic-Prediction-Market-SAPM-on-Sui-Core/actions/workflows/ci.yml)
[![Stack Validation](https://img.shields.io/github/actions/workflow/status/rwilliamspbg-ops/Sovereign-Agentic-Prediction-Market-SAPM-on-Sui-Core/ci_validation.yml?branch=main&style=for-the-badge&logo=docker&logoColor=white&label=Stack%20Validation)](https://github.com/rwilliamspbg-ops/Sovereign-Agentic-Prediction-Market-SAPM-on-Sui-Core/actions/workflows/ci_validation.yml)
[![Lean Verification](https://img.shields.io/github/actions/workflow/status/rwilliamspbg-ops/Sovereign-Agentic-Prediction-Market-SAPM-on-Sui-Core/lean-verification.yml?branch=main&style=for-the-badge&logo=leanpub&logoColor=white&label=Lean%20Verification)](https://github.com/rwilliamspbg-ops/Sovereign-Agentic-Prediction-Market-SAPM-on-Sui-Core/actions/workflows/lean-verification.yml)
[![Node >=18](https://img.shields.io/badge/Node-%3E%3D18-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](package.json)
[![Sui Testnet](https://img.shields.io/badge/Sui-Testnet-6fbcf0?style=for-the-badge&logo=sui&logoColor=0b1f3a)](https://docs.sui.io)
[![Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-D22128?style=for-the-badge&logo=apache&logoColor=white)](LICENSE.md)

<p align="center">
  <a href="https://www.youtube.com/watch?v=CEEmdBJklB0" target="_blank" rel="noopener noreferrer">
    <img src="https://img.youtube.com/vi/CEEmdBJklB0/maxresdefault.jpg" alt="Watch SAPM demo video" width="800" />
  </a>
</p>

---

## Problem

Prediction markets require too much manual operation, too much centralized trust, and no verifiable audit trail. Agents that trade on them do so blindly — no on-chain proof of their decisions, no slashable reputation, no immutable record of what they saw or why they acted.

## What SAPM Does

SAPM is a sovereign, agentic prediction market stack built natively on Sui. It combines:

- **Autonomous AI agents** (trader, aggregator, orchestrator) that discover markets, forecast outcomes, and execute trades using Sui's PTB transaction model
- **On-chain reputation and incentives** — Move contracts that stake agents, slash Byzantine behavior, and reward accurate reports via `incentives.move`
- **DeepBook integration** — limit order placement, cancel/replace, open-order queries, and preflight balance checks against DeepBook's on-chain orderbook
- **Walrus archival** — every market snapshot and trade decision is published to Walrus as a verifiable blob with SHA-256 manifest and lineage tracking
- **Lean 4 formal verification** — BFT safety/liveness theorems, Multi-Krum aggregation correctness, hybrid PQC security proofs, and oracle contract invariants

**Why Sui?** The object model makes agent staking natural (each `AgentStake` is an owned object), PTBs let a single transaction atomically execute a trade and update reputation, shared objects give the registry global visibility, and DeepBook + Walrus as first-class Sui primitives mean every layer of the stack is composable without bridging.

---

## Live Demo — Judge Mode

> **The fastest path to verification:** open the app, connect a Sui wallet, paste a market object ID, and click **Run Judge Mode**. It will: connect wallet → load on-chain market → execute micro trade → archive to Walrus → read blob back. Every step produces a verifiable artifact (transaction digest on Sui Explorer, Walrus blob ID on aggregator endpoint).

The UI includes a built-in **Judge Script** modal with timestamped demo cues.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     SAPM Monorepo                               │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │               Next.js Frontend (frontend/)              │   │
│  │  Market board · Wallet connect · Judge Mode            │   │
│  │  DeepBook status · Walrus snapshot · Observability     │   │
│  └────────────────────────┬────────────────────────────────┘   │
│                           │ @mysten/sui SDK                     │
│  ┌────────────┐  ┌────────▼──────────┐  ┌────────────────┐    │
│  │  Agents    │  │   Sui Network     │  │   Walrus       │    │
│  │ trader/    │  │ Move contracts    │  │ publishMarket  │    │
│  │ aggregator/│  │ Registry +        │  │ Snapshot       │    │
│  │ orchestr.  │  │ Incentives        │  │ (manifest v1)  │    │
│  └────────────┘  └────────┬──────────┘  └────────────────┘    │
│                           │ DeepBook PTBs                       │
│  ┌─────────────────────────▼───────────────────────────────┐   │
│  │  Formal Verification (formal_verification/)              │   │
│  │  Lean 4 · BFT safety · Multi-Krum · PQC proofs         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Networking layer (future): AF_XDP zero-copy kernel bypass     │
│  for cross-node aggregation (Rust datapath scaffolded)         │
└─────────────────────────────────────────────────────────────┘
```

---

## Sui Integration Summary

| Component | Implementation |
|---|---|
| **Move contracts** | `Registry.move` (shared PubkeyRegistry), `incentives.move` (AgentStake, ReputationRegistry, slash/reward events) |
| **DeepBook** | `deepbook-service.ts` — `place_limit_order`, `cancel_order`, `replace_order`, `getOpenOrders`, `preflightOrder`, `reconcileTransactionDigest` |
| **Walrus** | `walrus-service.ts` — `publishMarketSnapshot`, `getBlob`, manifest build/validate with SHA-256 checksum and lineage chain |
| **Wallet** | Wallet Standard connect, session persistence, `sapm:wallet-updated` events, address validation |
| **PTB execution** | `TradeExecution.tsx` — idempotency guard, bounded retry, notional risk cap, balance preflight |
| **On-chain market load** | `market-data-service.ts` — `getOnchainMarkets`, `getOnchainMarketsFromObjectIds`, normalizeObjectIds |

---

## Formal Verification Status

The `formal_verification/lean4/` directory contains structured Lean 4 proof files across five domains. Proof strategy: all non-trivial theorems are stated with rigorous type signatures and have proof sketches that compile. The core BFT safety and Multi-Krum correctness theorems have closed proofs; broader coverage is a documented work-in-progress tracked in `formal_verification/OBLIGATIONS.md`.

| Domain | Theorems | Status |
|---|---|---|
| BFT agreement | `bft_safety`, `bft_liveness`, `gossip_safety`, `reputation_slashing_correctness` | Closed |
| Multi-Krum aggregation | `multi_krum_safety`, `multi_krum_liveness`, `outlier_detection_correctness`, `multi_krum_consistency` | Closed |
| Hybrid PQC KEX | `hybrid_kex_composition`, `kem_correctness` | Closed |
| Oracle contracts | `market_discovery`, `prediction_contract` | Structured, obligations tracked |
| TPM attestation | `tpm_attestation_verification`, `pcr_verification` | Structured, obligations tracked |

---

## Performance Notes

The README previously listed 128.4 GiB/s throughput and 8 μs p99 latency. Those figures are **theoretical line-rate ceilings** for 3×100GbE hardware running a fully-implemented AF_XDP zero-copy path. The current Rust datapath (`rust-datapath/`) is scaffolded for that architecture but does not yet implement AF_XDP — it uses a standard socket path. Actual benchmark targets for the current production path are in `docs/PERFORMANCE_BENCHMARKS.md`. The AF_XDP implementation is tracked as a future milestone.

---

## Quick Start

### Prerequisites

- Node.js 18 or newer (24 recommended)
- npm
- Docker and Docker Compose (optional, for full stack)
- Sui CLI (optional, for contract work)

### Run agents and tests

```bash
# Install root dev dependencies
npm install

# Run all agent test suites
npm run test:all

# Or per-package
cd agents/trader && npm ci && npm test
cd agents/aggregator && npm ci && npm test
cd agents/orchestrator && npm ci && npm test
```

### Run the frontend

```bash
cd frontend
npm ci
cp ../.env.example .env.local   # edit with your package/object IDs
npm run dev
# open http://localhost:3000
```

### Docker Compose (full stack)

```bash
docker compose -f docker/docker-compose.yml up
```

### Deploy Move contracts

```bash
cd agents/onchain-registry
sui client publish --gas-budget 100000000
# capture REGISTRY_PACKAGE_ID and PUBKEY_REGISTRY_OBJ from output
# set them in frontend/.env.local as NEXT_PUBLIC_SUI_PACKAGE_ID and NEXT_PUBLIC_SUI_MARKET_OBJECT_IDS
```

---

## Environment Variables

Copy `.env.example` to `frontend/.env.local` and fill in:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUI_PACKAGE_ID` | Deployed Move package address |
| `NEXT_PUBLIC_SUI_MARKET_OBJECT_IDS` | Comma-separated on-chain market object IDs |
| `NEXT_PUBLIC_DEEPBOOK_PREDICT_PACKAGE_ID` | DeepBook Predict package ID (testnet) |
| `NEXT_PUBLIC_WALRUS_AGGREGATOR_URL` | Walrus aggregator endpoint |
| `NEXT_PUBLIC_WALRUS_PUBLISHER_URL` | Walrus publisher endpoint |
| `NEXT_PUBLIC_SUI_NETWORK` | `testnet` or `mainnet` |

---

## Repository Structure

```
agents/
  aggregator/       Multi-Krum aggregation service + incentives engine
  orchestrator/     Agent orchestration, reputation engine, task manager
  trader/           Market discovery, PTB builder, portfolio tracker
  onchain-registry/ Move contracts (Registry.move, incentives.move)
  sui/integration/  Sui blockchain client + formal specification bridge
  mcp-server/       MCP integration point (Python)
formal_verification/
  lean4/            Lean 4 proof files across BFT, aggregation, crypto, oracle domains
  scripts/          Verification pipeline scripts
frontend/
  src/app/          Next.js App Router pages (markets, portfolio, governance, docs)
  src/components/   UI components (trading, wallet, a2ui copilot)
  src/services/sui/ deepbook-service, walrus-service, market-data-service, wallet-standard
  src/lib/          sui-config, observability, circuit-breaker, performance-monitor
market-data/        DeepBook adapter, Sui market feed, anomaly detector, odds calculator
risk-management/    Circuit breakers and position limits
docker/             Docker Compose, nginx, sui-local node
k8s/                Kubernetes manifests and Helm chart
docs/               Architecture, operations runbook, threat model, security audit
```

---

## Tracks

This project targets the **Agentic Web** and **DeFi & Payments** core tracks plus the **DeepBook** and **Walrus** specialized tracks of Sui Overflow 2026.

---

## Contact

Sovereign Mohawk Proto LLC — operations team. See [docs/INDEX.md](docs/INDEX.md) for full documentation index.
