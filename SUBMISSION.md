# SAPM — Sui Overflow 2026 Submission

**Sovereign Agentic Prediction Market on Sui**
Submitted to: [Sui Overflow 2026](https://overflow.sui.io)
Tracks: **Agentic Web** · **DeepBook** · **DeFi & Payments** · **Walrus**

---

## Problem

Prediction markets require too much centralized trust and manual operation. Agents that trade on them do so blindly — no on-chain proof of their decisions, no slashable reputation, and no immutable record of what they saw or why they acted. The result is a market that is less accurate, less trustworthy, and less capital-efficient than it could be.

## Solution

SAPM is a prediction market stack where autonomous AI agents stake reputation, trade binary outcomes, and prove their reasoning on-chain — natively on Sui.

Every agent decision produces an immutable audit trail: a Walrus-archived market snapshot and a Sui transaction proving the agent acted within its staked parameters. Agents that forecast incorrectly are slashed by the incentives contract. Agents that forecast correctly earn reputation that compounds over time.

## Why Sui

- **Object model** — `AgentStake` and `Position` are owned objects; reputation updates are atomic with trades via PTB
- **DeepBook Predict** — binary market positions route through DeepBook's on-chain orderbook; SAPM's Kelly-sized order intents map directly to `predict::mint_binary_position`
- **Walrus** — every market snapshot published as a verifiable blob with SHA-256 manifest; blob IDs are the on-chain audit trail
- **Shared objects** — `PubkeyRegistry` and `ReputationRegistry` are shared objects; any agent can read and update global state in one transaction
- **Move safety** — `incentives.move` enforces minimum stake, slashing bounds, and reputation decay at the contract level; no off-chain enforcement needed

## Live Artifacts

> **Fill these in after running `DEPLOY.md` steps 1–4:**

| Artifact | Value |
|---|---|
| SAPM package (testnet) | `0x746797ce439d0e06bdb31d1b0dacc24e204e7906445292a97fb6a5734de777b8` |
| Transaction digest | `0xTODO` |
| Walrus blob ID | `TODO` |
| DeepBook Predict object | `0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a` |

Verify:
- Package: https://suiscan.xyz/testnet/object/0x746797ce439d0e06bdb31d1b0dacc24e204e7906445292a97fb6a5734de777b8
- Transaction: `https://suiscan.xyz/testnet/tx/<DIGEST>`
- Walrus blob: `https://aggregator.walrus-testnet.walrus.space/v1/blobs/<BLOB_ID>`
- DeepBook Predict: https://suiscan.xyz/testnet/object/0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js Frontend                                           │
│  Market board · Wallet connect · Judge Mode · A2UI copilot │
└──────────────┬──────────────────────────┬───────────────────┘
               │ @mysten/sui SDK          │ Walrus HTTP API
   ┌───────────▼──────────┐   ┌───────────▼───────────────┐
   │  Sui Testnet         │   │  Walrus Testnet           │
   │  Registry.move       │   │  publishMarketSnapshot()  │
   │  incentives.move     │   │  SHA-256 manifest + blob  │
   │  prediction_market   │   └───────────────────────────┘
   │  DeepBook Predict    │
   │  (0xf5ea...5138)     │
   └──────────────────────┘
               ▲
   ┌───────────┴─────────────────────────────┐
   │  Agent Pipeline (Node.js)               │
   │  trader → aggregator (Multi-Krum BFT)  │
   │  → orchestrator → PTB execution         │
   └─────────────────────────────────────────┘
               ▲
   ┌───────────┴──────────────────────────┐
   │  Formal Verification (Lean 4)        │
   │  BFT safety · Multi-Krum correctness │
   │  Hybrid PQC KEX composition          │
   └──────────────────────────────────────┘
```

## Key Technical Differentiators

### On-chain agent economy
`incentives.move` implements a complete staking/slashing/reward cycle in Move. `AgentStake` is an owned object per agent. The `calculate_agent_score` function weights reputation (60%) and accuracy (40%) to determine voting power in the BFT aggregation round.

### DeepBook Predict integration
`deepbook-predict-server.ts` queries the live public server at `https://predict-server.testnet.mystenlabs.com` for render-ready market state, oracle prices, and vault data. `prediction-market-deepbook-bridge.js` converts SAPM probability forecasts into DeepBook Predict `mint_binary_position` intents with Kelly position sizing.

### Walrus verifiable audit trail
Every market snapshot is published via `walrus-service.ts` with a `sapm.walrus.snapshot.manifest.v1` schema. The manifest includes SHA-256 content hash, agent ID, timestamp, and a lineage chain linking to the previous snapshot. Blob IDs are returned to the frontend and logged on-chain via Move events.

### Lean 4 formal proofs (zero `sorry`)
`formal_verification/lean4/` contains closed proofs for BFT safety, Multi-Krum aggregation correctness, and hybrid KEX composition (x25519 + ML-KEM-768). `formal_verification/OBLIGATIONS.md` tracks the 13 closed theorems and all open obligations with path to closure.

### Multi-agent BFT pipeline
The orchestrator uses Multi-Krum selection to filter Byzantine agent forecasts before aggregation. Agents with reputation below the slashing threshold are excluded from the current round. The pipeline is tested with 109 passing orchestrator tests.

## Running the Demo

```bash
# 1. Query live DeepBook Predict (no wallet needed)
node demo/demo_predict_live.js

# 2. Run full test suite (159 tests, 0 failures)
npm run test:all

# 3. Full deploy + Judge Mode: see DEPLOY.md
```

## Repository Structure

```
agents/
  trader/           Market discovery, PTB builder, Kelly sizing, portfolio tracking
  aggregator/       Multi-Krum BFT aggregation, incentives engine, Prometheus metrics
  orchestrator/     Lifecycle management, reputation engine, task scheduler
  onchain-registry/ Move contracts: Registry.move, incentives.move, prediction_market.move
  lib/              Shared structured logger (JSON lines + LOG_PRETTY)
formal_verification/
  lean4/            Closed Lean 4 proofs — BFT, Multi-Krum, hybrid KEX
  OBLIGATIONS.md    Proof status tracker
frontend/
  src/services/sui/ deepbook-service.ts, deepbook-predict-server.ts,
                    walrus-service.ts, market-data-service.ts, wallet-standard.ts
  src/lib/          sui-config.ts (all contract IDs pre-wired)
market-data/
  adapters/         prediction-market-deepbook-bridge.js (Kelly sizing + order intents)
demo/
  demo_predict_live.js  Live read-only demo, no wallet required
  demo_trading.js       Full trading demo (wallet required)
```

## Test Coverage

| Suite | Tests | Status |
|---|---|---|
| agents/trader | 5 | ✅ pass |
| agents/aggregator | 33 | ✅ pass |
| agents/orchestrator | 109 | ✅ pass |
| agents/lib/logger | 3 | ✅ pass |
| market-data/deepbook-bridge | 9 | ✅ pass |
| **Total** | **159** | **0 failures** |

## Formal Verification Summary

| Domain | Theorems | Status |
|---|---|---|
| BFT agreement | `bft_safety`, `bft_liveness`, `gossip_membership`, `reputation_slashing_correctness` | ✅ Closed |
| Multi-Krum aggregation | 6 theorems | ✅ Closed |
| Hybrid PQC KEX | `hybrid_kex_composition`, `kem_correctness`, `kex_commutativity` | ✅ Closed |
| Oracle contracts | Market fairness invariants | 📋 Structured, obligations tracked |
| TPM attestation | PCR verification | 📋 Structured, obligations tracked |

All closed proofs use zero `sorry`. See `formal_verification/OBLIGATIONS.md`.

---

*Built for Sui Overflow 2026 · Sovereign Mohawk Proto LLC*
