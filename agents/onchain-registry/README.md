# SAPM On-Chain Registry

Move smart contracts deployed on Sui testnet for the Sovereign Agentic Prediction Market.

## Contracts

### `Registry.move`
Shared `PubkeyRegistry` object. Stores agent public keys for identity verification.

```
init_registry(ctx) → PubkeyRegistry (shared)
add_key(reg, key)
```

### `incentives.move`
Agent staking, slashing, and reputation tracking. Core to the BFT agent economy.

```
stake(amount, registry, ctx) → AgentStake (shared)
slash_agent(stake, amount, reason, registry, ctx)
reward_honest_agent(stake, reward, registry, ctx)
record_report(stake, was_correct, registry, ctx)
get_reputation(stake) → u64  // 0–100
calculate_agent_score(stake) → u64  // weighted: 60% rep + 40% accuracy
```

### `prediction_market.move` *(new)*
Binary prediction markets with YES/NO position pools. Composable with DeepBook.

```
create_market(question, resolution_epoch, ctx) → PredictionMarket (shared)
open_position(market, side, stake, ctx) → Position (owned)
resolve_market(market, outcome, ctx)
get_implied_yes_prob(market) → u64  // 0–100 basis points
```

## Deploy to Testnet

```bash
# Ensure Sui CLI is installed and testnet is configured
sui client switch --env testnet

# Deploy
sui client publish --gas-budget 100000000 .

# The output will contain:
#   PackageID: 0x<package-id>
#   PubkeyRegistry object: 0x<registry-obj>
#   ReputationRegistry object: 0x<reputation-obj>
```

Set the package ID in `frontend/.env.local`:
```
NEXT_PUBLIC_SUI_PACKAGE_ID=0x<package-id>
NEXT_PUBLIC_SUI_MARKET_OBJECT_IDS=0x<registry-obj>
```

## Events

All significant state transitions emit Sui events for off-chain indexing:

- `AgentStaked` — agent joins the staking pool
- `AgentSlashed` — Byzantine agent penalized
- `AgentRewarded` — honest agent rewarded
- `ReputationUpdated` — reputation delta applied
- `MarketCreated` — new prediction market published
- `PositionOpened` — trader opens YES/NO position
- `MarketResolved` — market resolved with outcome
