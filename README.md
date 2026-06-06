# SAPM - Sovereign Agentic Prediction Market on Sui

[![CI](https://img.shields.io/github/actions/workflow/status/rwilliamspbg-ops/Sovereign-Agentic-Prediction-Market-SAPM-on-Sui-Core/ci.yml?branch=main&style=for-the-badge&logo=githubactions&logoColor=white&label=CI)](https://github.com/rwilliamspbg-ops/Sovereign-Agentic-Prediction-Market-SAPM-on-Sui-Core/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-D22128?style=for-the-badge&logo=apache&logoColor=white)](LICENSE.md)
[![Sui](https://img.shields.io/badge/Sui-Testnet-6fbcf0?style=for-the-badge&logo=sui&logoColor=0b1f3a)](https://docs.sui.io)
[![Node >=18](https://img.shields.io/badge/Node-%3E%3D18-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](package.json)

## What is SAPM?

SAPM demonstrates how autonomous AI agents can participate in prediction markets. Agents forecast outcomes, aggregate consensus, and generate trading decisions—turning swarm intelligence into market actions.

**Current Status:** ✅ Phase 1 (Decision Pipeline) | 🔄 Phase 2 (Sui Integration) | ⏳ Phase 3 (Production)

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
| **Move Contracts** | 🟡 Framework | Logic defined, deployment in Phase 2 |
| **Sui Integration** | 🔄 Coming | Phase 2 focus |
| **Formal Verification** | ⏳ Future | Phase 3 feature |

**See [docs/PRODUCTION_STATUS.md](docs/PRODUCTION_STATUS.md) for detailed component status.**

---

## 🎯 What This Demo Shows

```
✅ WORKS:
   Forecast Input → Aggregator → Trade Decision → PTB Plan (Dry-run)
   Beautiful market discovery UI with live filtering
   Professional dark theme with Sui branding
   Full local development environment

❌ DOESN'T WORK YET:
   Real Sui market integration (Phase 2)
   Transaction submission to blockchain (Phase 2)
   Wallet signing (Phase 2)
   On-chain registry (Phase 2)
```

**All demo output is labeled `[DEMO]` to indicate dry-run status, not real execution.**

---

## 📚 Documentation

- **[PRODUCTION_STATUS.md](docs/PRODUCTION_STATUS.md)** ← Start here for component status
- [QUICKSTART.md](docs/QUICKSTART.md) - Setup instructions
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - System design
- [FRONTEND.md](docs/FRONTEND.md) - UI/UX guide
- [WALLET.md](docs/WALLET.md) - Wallet integration
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

**Phase 1 (Current):** Agents + Markets (local, dry-run)  
**Phase 2 (Coming):** + Blockchain (testnet integration)  
**Phase 3 (Future):** + Formal Verification + Quantum Crypto

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
```

All tests passing. No silent failures.

---

## 🚀 Phase Roadmap

### Phase 1: Decision Pipeline ✅ COMPLETE

**Delivered:**
- Market discovery UI
- Agent decision logic
- Aggregator framework
- Complete demo

### Phase 2: Sui Testnet Integration 🔄 IN PROGRESS

**Coming Soon:**
- Real market object fetching
- Transaction building and signing
- Wallet integration
- Testnet trade execution
- On-chain registry deployment

### Phase 3: Production Hardening ⏳ FUTURE

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

**Current Version:** 1.0.0 (Phase 1)  
**Last Updated:** 2025-06-06  
**Next Phase:** Sui Testnet Integration  

