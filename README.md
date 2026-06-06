# SAPM - Sovereign Agentic Prediction Market on Sui

[![Release Gate](https://img.shields.io/github/actions/workflow/status/rwilliamspbg-ops/Sovereign-Agentic-Prediction-Market-SAPM-on-Sui-Core/ci.yml?branch=main&style=for-the-badge&logo=githubactions&logoColor=white&label=Release%20Gate)](https://github.com/rwilliamspbg-ops/Sovereign-Agentic-Prediction-Market-SAPM-on-Sui-Core/actions/workflows/ci.yml)
[![Stack Validation](https://img.shields.io/github/actions/workflow/status/rwilliamspbg-ops/Sovereign-Agentic-Prediction-Market-SAPM-on-Sui-Core/ci_validation.yml?branch=main&style=for-the-badge&logo=docker&logoColor=white&label=Stack%20Validation)](https://github.com/rwilliamspbg-ops/Sovereign-Agentic-Prediction-Market-SAPM-on-Sui-Core/actions/workflows/ci_validation.yml)
[![Lean Verification](https://img.shields.io/github/actions/workflow/status/rwilliamspbg-ops/Sovereign-Agentic-Prediction-Market-SAPM-on-Sui-Core/lean-verification.yml?branch=main&style=for-the-badge&logo=leanpub&logoColor=white&label=Lean%20Verification)](https://github.com/rwilliamspbg-ops/Sovereign-Agentic-Prediction-Market-SAPM-on-Sui-Core/actions/workflows/lean-verification.yml)
[![Phase2 Hardening](https://img.shields.io/github/actions/workflow/status/rwilliamspbg-ops/Sovereign-Agentic-Prediction-Market-SAPM-on-Sui-Core/phase2-hardening-ci.yml?branch=main&style=for-the-badge&logo=shield&logoColor=white&label=Phase2%20Hardening)](https://github.com/rwilliamspbg-ops/Sovereign-Agentic-Prediction-Market-SAPM-on-Sui-Core/actions/workflows/phase2-hardening-ci.yml)
[![Node >=18](https://img.shields.io/badge/Node-%3E%3D18-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](package.json)
[![Sui](https://img.shields.io/badge/Sui-Testnet-6fbcf0?style=for-the-badge&logo=sui&logoColor=0b1f3a)](https://docs.sui.io)
[![Contributors](https://img.shields.io/github/contributors/rwilliamspbg-ops/Sovereign-Agentic-Prediction-Market-SAPM-on-Sui-Core?style=for-the-badge)](https://github.com/rwilliamspbg-ops/Sovereign-Agentic-Prediction-Market-SAPM-on-Sui-Core/graphs/contributors)
[![Last Commit](https://img.shields.io/github/last-commit/rwilliamspbg-ops/Sovereign-Agentic-Prediction-Market-SAPM-on-Sui-Core?style=for-the-badge)](https://github.com/rwilliamspbg-ops/Sovereign-Agentic-Prediction-Market-SAPM-on-Sui-Core/commits/main)
[![Open Issues](https://img.shields.io/github/issues/rwilliamspbg-ops/Sovereign-Agentic-Prediction-Market-SAPM-on-Sui-Core?style=for-the-badge)](https://github.com/rwilliamspbg-ops/Sovereign-Agentic-Prediction-Market-SAPM-on-Sui-Core/issues)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-D22128?style=for-the-badge&logo=apache&logoColor=white)](LICENSE.md)

## What is SAPM?

SAPM demonstrates how autonomous AI agents can participate in prediction markets. Agents forecast outcomes, aggregate consensus, and generate trading decisions—turning swarm intelligence into market actions.

**Current Status:** ✅ Phase 1 (Core Pipeline Implemented) | ✅ Phase 2 (Frontend + Risk Components Present) | ⚠️ Validation/Stabilization In Progress

---

## 🚀 Quick Start (5 minutes)

```bash
# Start the full stack
docker compose up

# In your browser:
# Frontend: http://localhost:3000
# Aggregator: http://localhost:4000
# Sui RPC: http://localhost:9000
```

See [docs/QUICKSTART.md](docs/QUICKSTART.md) for detailed setup.

---

## 📊 Current Capabilities

| Feature | Status | Notes |
|---------|--------|-------|
| **Market Discovery UI** | ✅ Production | Filters, sorting, responsive design |
| **Agent Decision Pipeline** | ✅ Working | Forecast → Aggregate → Trade (dry-run) |
| **Docker Environment** | ✅ Working | Full local dev setup |
| **Move Contracts** | 🟡 Framework | Registry/incentives Move sources present; deployment status not verified in this review |
| **Sui Integration** | 🟡 Partial | Sui SDK references and PTB builders exist; root release-check now runs cleanly |
| **Formal Verification** | 🟡 Scaffolding | Formal verification directory and artifacts present; production proof coverage not yet verified |

**See [docs/PRODUCTION_STATUS.md](docs/PRODUCTION_STATUS.md) for detailed component status.**

---

## 🎯 What This Demo Shows

```
✅ IMPLEMENTED IN REPO:
   Forecast Input → Aggregator → Trade Decision → PTB Plan modules
   Multi-page frontend app (markets, portfolio, governance, docs, risk)
   Risk controls module skeleton (position limits + circuit breakers)
   Move registry/incentives contract sources

✅ VALIDATED VIA CANONICAL GATE:
   Root dependency bootstrap now installs root + agent packages
   Root test pipeline executes through trader + aggregator suites
   Root e2e suite executes via jest at repository root
```

**All demo output is labeled `[DEMO]` to indicate dry-run status, not real execution.**

---

## 📚 Documentation

- **[PRODUCTION_STATUS.md](docs/PRODUCTION_STATUS.md)** ← Start here for component status
- [QUICKSTART.md](docs/QUICKSTART.md) - Setup instructions
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - System design
- [FRONTEND.md](docs/FRONTEND.md) - UI/UX guide
- [WALLET.md](docs/WALLET.md) - Wallet integration
- [ORCHESTRATOR_PLACEHOLDER_TRIAGE.md](docs/ORCHESTRATOR_PLACEHOLDER_TRIAGE.md) - owner/milestone ledger for placeholder paths
- [CONTRIBUTING.md](CONTRIBUTING.md) - How to contribute

---

## 🏗️ Architecture

```
SAPM = Agents + Markets + Blockchain
          ↓         ↓         ↓
    [Orchestrator] [Market UI] [Sui]
    [Aggregator]   [Filters]   [Contracts]
    [Trader]       [Stats]     [Transactions]
```

**Phase 1 (Implemented):** Agent logic, aggregator, and trader modules
**Phase 2 (Implemented):** Frontend expansion and risk-control scaffolding
**Phase 3 (Current Focus):** Validation hardening and production-readiness gates

---

## 📂 Repository Structure

```
agents/               # Autonomous agent system
├── orchestrator/     # Coordination and task sequencing
├── aggregator/       # Forecast aggregation with Byzantine logic
├── trader/           # Trade decision and PTB generation
└── onchain-registry/ # Move smart contracts

frontend/             # Next.js market discovery UI
├── src/app/          # Pages and routes
├── src/components/   # React components
└── public/           # Static assets

docker/               # Multi-service development setup
docs/                 # Complete documentation
test/                 # Integration and E2E tests
```

---

## 🧪 Testing

```bash
# Run all tests
npm run test:all

# Trader tests only
npm run test:trader

# Aggregator tests only
npm run test:aggregator

# E2E integration test
npm run test:e2e

# Lint check
npm run lint

# Canonical production-readiness gate
npm run release:check
```

As of the 2026-06-06 stabilization pass:
- `npm run release:check` passes from a fresh dependency bootstrap path.
- `npm run test:all` passes (trader + aggregator).
- `npm run test:e2e` passes from root.
- `npm run lint` passes with warnings and no errors.

Release gate policy:
- `npm run release:check` is the canonical readiness gate for local validation and CI.
- It installs required root and agent dependencies, then runs lint + test suites.

---

## 🚀 Phase Roadmap

### Phase 1: Decision Pipeline ✅ COMPLETE

**Delivered:**
- Market discovery UI
- Agent decision logic
- Aggregator framework
- Complete demo

### Phase 2: Integration & Frontend Expansion ✅ IMPLEMENTED (Code-Level)

**Current Focus:**
- Dependency and environment alignment across subpackages
- Green test pipeline from repository root
- End-to-end execution verification against configured Sui network

### Phase 3: Production Hardening 🔄 NEXT

**Planned:**
- Formal verification (Lean proofs)
- Quantum-resistant cryptography
- AF_XDP kernel-bypass datapath
- Kubernetes orchestration

---

## 💻 Development

### Prerequisites

- Node.js >= 18 (v24 recommended)
- npm or pnpm
- Docker + Docker Compose
- Optional: Sui CLI for Move development

### Local Development

```bash
# Install dependencies
npm install

# Start dev environment
docker compose up

# In another terminal, run tests
npm run test:all

# Lint and fix
npm run lint:fix
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

---

## 🔗 Key Files

**Frontend Entry Points:**
- `frontend/src/app/page.tsx` - Market discovery home page
- `frontend/src/app/layout.tsx` - Global layout with header/footer
- `frontend/src/app/portfolio/page.tsx` - User portfolio

**Agent Logic:**
- `agents/trader/forecast_to_trade.js` - Forecast to trade conversion
- `agents/aggregator/aggregation.js` - Byzantine aggregation
- `agents/orchestrator/core/index.js` - Orchestration framework

**Move Contracts:**
- `agents/onchain-registry/sources/registry.move` - Registry module
- `agents/onchain-registry/sources/incentives.move` - Incentives module

**Demo:**
- `demo/demo_trading.js` - End-to-end demo
- `agents/trader/index.js` - Trader CLI

---

## 🎓 Getting Started

### For Judges/Evaluators

1. **Start the demo:** `docker compose up`
2. **Open frontend:** http://localhost:3000
3. **See the pipeline:** Read [docs/PRODUCTION_STATUS.md](docs/PRODUCTION_STATUS.md)
4. **Run tests:** `npm run test:all`
5. **Check code:** Focus on `agents/trader` and `agents/aggregator`

### For Contributors

1. Read [CONTRIBUTING.md](CONTRIBUTING.md)
2. Check [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
3. Pick an issue or feature
4. Create feature branch
5. Submit PR

### For Developers

1. Review [docs/QUICKSTART.md](docs/QUICKSTART.md)
2. Study code structure above
3. Explore `frontend/src/app` for UI
4. Explore `agents/` for logic

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Development setup
- Code standards
- Testing requirements
- PR process

---

## 📄 License

Apache 2.0 - See [LICENSE.md](LICENSE.md)

---

## 🙏 Acknowledgments

- Built for Sui blockchain ecosystem
- Inspired by autonomous trading and prediction markets
- Community feedback and contributions

---

## 📞 Questions?

- 📖 Check [docs/PRODUCTION_STATUS.md](docs/PRODUCTION_STATUS.md) for status
- 💬 See [CONTRIBUTING.md](CONTRIBUTING.md) for support
- 🐛 Open an issue on GitHub
- 💡 Start a discussion for ideas

---

**Current Version:** 1.0.0 (Stabilization Update, Phase 4 In Progress)
**Last Updated:** 2026-06-06  
**Current Focus:** Phase 4 Production Integration & Multi-Market Expansion  
