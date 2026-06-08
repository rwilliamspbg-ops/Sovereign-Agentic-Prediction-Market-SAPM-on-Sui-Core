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
