# SAPM Demo — Sui Overflow 2026

## Fastest path to verification (2 minutes)

```bash
# 1. Install frontend deps
cd frontend && npm ci

# 2. Copy env and set your deployed package ID
cp ../.env.example .env.local
# Edit .env.local with your NEXT_PUBLIC_SUI_PACKAGE_ID

# 3. Run the dev server
npm run dev
# Open http://localhost:3000
```

In the browser:

1. Click **Connect Wallet** (top-right)
2. Paste a Sui market object ID in the **Judge Mode** panel
3. Click **Load On-chain Markets**
4. Click **Run Judge Mode**

Judge Mode will:

- Confirm wallet connection
- Load on-chain market state from Sui
- Execute a micro trade (0.01 SUI) and produce a transaction digest
- Archive a market snapshot to Walrus and return a blob ID
- Read the blob back and display a preview

Every artifact is independently verifiable:

- Transaction: `https://suiscan.xyz/testnet/tx/<digest>`
- Walrus blob: `https://aggregator.walrus-testnet.walrus.space/v1/blobs/<blobId>`

## Expected output examples

Use these as format references when validating your run:

```text
Trade submitted: digest=E7x5C8wP1A6n7Lk9f2P3mV4rQ8zY1hJ6tU2dN5sK3bQ
Explorer URL: https://suiscan.xyz/testnet/tx/E7x5C8wP1A6n7Lk9f2P3mV4rQ8zY1hJ6tU2dN5sK3bQ

Walrus publish: blobId=9f4f3e65f8bd1d2c2e9f0ab4c0f7a8b9d3c4e5f6a7b8c9d0e1f2a3b4c5d6e7f
Walrus readback: https://aggregator.walrus-testnet.walrus.space/v1/blobs/9f4f3e65f8bd1d2c2e9f0ab4c0f7a8b9d3c4e5f6a7b8c9d0e1f2a3b4c5d6e7f
```

If your values differ, that is expected. Verify shape and resolvability:

- digest resolves on Sui explorer
- blob ID resolves on Walrus aggregator endpoint

## Judge Script

Click **Open Judge Script** in the app for a 3-minute timestamped speaking scaffold.

## Demo trading script (node, no browser needed)

```bash
cd demo
npm install @mysten/sui
node demo_trading.js
```

## Visual dashboard (static HTML)

```bash
open demo/visual_dashboard.html
```

## Deploy Move contracts first

```bash
cd agents/onchain-registry
sui client publish --gas-budget 100000000 .
```

See [../docs/HACKATHON_SUBMISSION.md](../docs/HACKATHON_SUBMISSION.md) for the full
pre-submission checklist and judge-facing artifact list.
