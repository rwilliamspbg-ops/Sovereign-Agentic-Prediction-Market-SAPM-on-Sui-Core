# SAPM Mainnet Launch Guide

**Sovereign Agentic Prediction Market on Sui**  
**Status:** Ready for Mainnet Deployment  
**Last Audit:** 2026-07-14

---

## Prerequisites

- [Sui CLI](https://docs.sui.io/guides/developer/getting-started/sui-install) v1.40+
- [Node.js](https://nodejs.org/) v18+ (v24 recommended)
- [Docker](https://docs.docker.com/get-docker/) and Docker Compose (for full stack)
- Sui wallet with mainnet SUI (for gas + staking)
- OpenAI API key (for CopilotKit copilot features)

---

## 1. Sui CLI Setup

```bash
sui client envs
sui client switch --env mainnet
sui client active-address
sui client gas
```

Ensure the active address has sufficient mainnet SUI (recommended: 10+ SUI for deployment + operations).

---

## 2. Deploy Move Contracts to Mainnet

```bash
cd agents/onchain-registry

sui move build
sui client publish --gas-budget 200000000
```

From the publish output, record:
- **Package ID** → `NEXT_PUBLIC_SUI_PACKAGE_ID`
- **Shared objects** (FeeConfig, ReputationRegistry, etc.)

### Initialize Shared Objects

After publishing, call the init functions:

```bash
sui client call \
  --package <PACKAGE_ID> \
  --module prediction_market \
  --function init_prediction_market \
  --gas-budget 20000000

sui client call \
  --package <PACKAGE_ID> \
  --module incentives \
  --function init_reputation_registry \
  --gas-budget 20000000

sui client call \
  --package <PACKAGE_ID> \
  --module incentives \
  --function init_risk_parameters \
  --gas-budget 20000000

sui client call \
  --package <PACKAGE_ID> \
  --module registry \
  --function init_registry \
  --gas-budget 20000000

sui client call \
  --package <PACKAGE_ID> \
  --module sapm_data \
  --function init_data_module \
  --gas-budget 20000000
```

Record the shared object IDs from each transaction output.

### Create a Prediction Market

```bash
sui client call \
  --package <PACKAGE_ID> \
  --module prediction_market \
  --function create_market \
  --args "Will SUI reach $5 by 2027?" 1767225600000 \
  --gas-budget 20000000
```

Record the **PredictionMarket object ID** → add to `NEXT_PUBLIC_SUI_MARKET_OBJECT_IDS`.

### Configure Treasury

```bash
sui client call \
  --package <PACKAGE_ID> \
  --module prediction_market \
  --function update_fee_config \
  --args <ADMIN_CAP_OBJ> <FEE_CONFIG_OBJ> 250 <YOUR_TREASURY_ADDRESS> \
  --gas-budget 20000000
```

---

## 3. Environment Configuration

Copy `.env.mainnet` to `frontend/.env.local`:

```bash
cp .env.mainnet frontend/.env.local
```

Fill in:

| Variable | Source |
|----------|--------|
| `NEXT_PUBLIC_SUI_PACKAGE_ID` | `sui client publish` output |
| `NEXT_PUBLIC_SUI_NETWORK` | `mainnet` |
| `NEXT_PUBLIC_SUI_REGISTRY_OBJECT_ID` | `init_registry` shared object |
| `NEXT_PUBLIC_SUI_MARKET_OBJECT_IDS` | `create_market` object IDs |
| `TREASURY_ADDRESS` | Your treasury wallet address |
| `OPENAI_API_KEY` | Your OpenAI API key |

---

## 4. Run the Frontend

```bash
cd frontend
npm ci
npm run build
npm start
```

Open `http://localhost:3000`.

---

## 5. Run Agents

```bash
npm run test:all
```

### Start Individual Agents

```bash
cd agents/trader && npm start
cd agents/aggregator && npm start
cd agents/orchestrator && npm start
```

---

## 6. Full Stack with Docker

```bash
docker compose -f docker/docker-compose.yml up --build
```

---

## 7. Demo Walkthrough

### Judge Mode Demo

1. Open `http://localhost:3000`
2. Connect Sui wallet (mainnet)
3. Paste a valid PredictionMarket object ID
4. Click **Run Judge Mode**
5. Verify: wallet connect → market load → trade execution → Walrus archive
6. Check explorer links for transaction digests

### Agent Trading Demo

```bash
node demo/demo_predict_live.js
node demo/demo_trading.js
```

### Live Demo Script (for judges/evaluators)

1. Show wallet connection on mainnet
2. Show market board with on-chain markets
3. Run Judge Mode end-to-end
4. Show Walrus blob verification
5. Show agent forecast → trade decision flow
6. Show fee collection on Sui Explorer
7. Show formal verification status

---

## 8. Fee Collection

| Fee Type | Default | Configurable |
|----------|---------|--------------|
| Platform fee on open_position | 2.5% (250 bps) | `update_fee_config` |
| Redemption fee on redeem | 2.5% (250 bps) | `update_fee_config` |
| Trade record fee (sapm_data) | 0.001 SUI | `update_data_fees` |
| Snapshot fee (sapm_data) | 0.002 SUI | `update_data_fees` |
| Agent slash → treasury | 100% of slash | Automatic |

Max fee: 10% (1000 bps) enforced on-chain.

---

## 9. Verification

### Verify on Sui Explorer

```
https://suiexplorer.com/object/<PACKAGE_ID>?network=mainnet
https://suiexplorer.com/txblock/<DIGEST>?network=mainnet
```

### Verify Walrus Blobs

```
curl <WALRUS_AGGREGATOR_URL>/v1/blobs/<BLOB_ID>
```

---

## 10. Monitoring & Incident Response

- **Circuit breakers:** Auto-trip on high error rates (configurable thresholds)
- **Gas budget alerts:** Set SUI balance alerts on treasury + operator wallets
- **Log monitoring:** Structured JSON logs via `agents/lib/logger`
- **K8s probes:** Liveness/readiness in `k8s/monitoring/`

### Emergency Procedures

1. **Halt market:** `halt_market(market_cap, market, reason)`
2. **Trip circuit breaker:** `trip_circuit_breaker(market_cap, market, reason)`
3. **Cancel market:** `cancel_market(market_cap, market)` — refunds all positions
4. **Rotate treasury:** `update_fee_config(admin_cap, fee_config, new_bps, new_treasury)`

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Wallet won't connect | Verify `NEXT_PUBLIC_SUI_NETWORK=mainnet` matches wallet network |
| Market load fails | Ensure `NEXT_PUBLIC_SUI_MARKET_OBJECT_IDS` contains valid PredictionMarket IDs, not registry IDs |
| Tx fails with gas error | Increase `SUI_GAS_BUDGET` or add SUI to wallet |
| Walrus publish fails | Check `NEXT_PUBLIC_WALRUS_AGGREGATOR_URL` points to mainnet endpoint |
| `spawn EFTYPE` in tests | Build Go binary: `go build -o cmd/sapm-hybrid ./cmd/` |

---

## Architecture Summary

```
Frontend (Next.js) ←→ Sui Move Contracts ←→ Autonomous Agents
       ↕                      ↕                     ↕
   Walrus Archive      DeepBook Predict      Reputation/Slashing
```

### Move Modules

| Module | Purpose |
|--------|---------|
| `registry` | Pubkey registry for agent keys |
| `prediction_market` | Binary markets, positions, fees, resolution |
| `incentives` | Agent staking, reputation, slashing, rewards |
| `sapm_data` | Trade records, market snapshots, data fees |

### Formal Verification

40 Lean 4 theorems covering BFT safety, Multi-Krum correctness, hybrid PQC, oracle contracts, and TPM attestation.

---

## Security Notes

- Never commit `.env.local` or files containing private keys
- Rotate `OPENAI_API_KEY` immediately if exposed
- Use hardware wallets for treasury and admin cap storage
- Admin caps should be stored in cold storage after initialization
- Monitor treasury address for unexpected inflows/outflows
- Set `NEXT_PUBLIC_ENABLE_BLIND_SIGNING_FALLBACK=false` on mainnet
