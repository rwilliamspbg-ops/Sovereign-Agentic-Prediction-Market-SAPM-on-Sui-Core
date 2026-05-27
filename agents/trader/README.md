# SAPM Trading Adapter

This is the Phase 3 kickoff scaffold that converts finalized forecast metadata into a deterministic trade plan.

## Usage

Read forecast metadata from a file:

```bash
node index.js ./example_forecast.json
```

Or pipe JSON on stdin:

```bash
cat ./example_forecast.json | node index.js
```

Dry-run a PTB against Sui RPC:

```bash
node index.js --dry-run --rpc https://fullnode.testnet.sui.io:443 \
  --package-id 0xYOUR_PACKAGE_ID \
  --market-object-id 0xYOUR_MARKET_OBJECT_ID \
  --quote-coin-object-id 0xYOUR_COIN_OBJECT_ID \
  ./example_forecast.json
```

## Output

The adapter returns a JSON trade plan with:

- `decision` (`buy_yes`, `buy_no`, or `hold`)
- `confidence`
- `impliedProbability`
- `edge`
- `stake`
- `rationale`

When `--dry-run` is supplied, the output includes the planned PTB configuration and the Sui dry-run response.

## Phase 3 Next Step

Wire this plan into a PTB builder and add a preflight dry-run before any live market execution.
