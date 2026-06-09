# SAPM — Testnet Deploy & Judge Mode Runbook

**Time required: ~15 minutes end-to-end.**

## Prerequisites

```bash
# Sui CLI installed and on testnet
sui client switch --env testnet
sui client active-address          # confirm your address
sui client balance                 # must have ≥ 0.5 SUI for gas

# Node.js ≥ 18
node --version
```

## Step 1 — Deploy Move contracts

```bash
cd agents/onchain-registry
sui client publish --gas-budget 100000000 . 2>&1 | tee /tmp/sapm-publish.json
```

From the output, capture:

```
PackageID:           0x<PACKAGE_ID>
PubkeyRegistry:      0x<REGISTRY_OBJ_ID>       (objectType contains "PubkeyRegistry")
ReputationRegistry:  0x<REPUTATION_OBJ_ID>     (objectType contains "ReputationRegistry")
```

Quick extraction:
```bash
cat /tmp/sapm-publish.json | grep -E "packageId|objectId|objectType" | head -20
```

## Step 2 — Wire environment variables

```bash
cd frontend
cp .env.local.example .env.local

# Fill in the three TODO values:
sed -i "s|0xTODO_REPLACE_WITH_PACKAGE_ID_FROM_PUBLISH|0x<PACKAGE_ID>|" .env.local
sed -i "s|0xTODO_REPLACE_WITH_PUBKEY_REGISTRY_OBJECT_ID|0x<REGISTRY_OBJ_ID>|" .env.local
sed -i "s|0xTODO_REPLACE_WITH_REPUTATION_REGISTRY_OBJECT_ID|0x<REPUTATION_OBJ_ID>|" .env.local
```

All other values (DeepBook Predict IDs, Walrus endpoints) are pre-filled.

## Step 3 — Start the frontend

```bash
cd frontend
npm ci
npm run dev
# Open http://localhost:3000
```

## Step 4 — Run Judge Mode (produces verifiable artifacts)

1. Click **Connect Wallet** (top-right) — approve in your Sui wallet
2. The dashboard will load on-chain market state automatically
3. Click **Run Judge Mode** in the Judge Mode panel

Judge Mode executes in sequence:
- Wallet connection confirmed
- On-chain market state loaded from your deployed objects
- Micro trade (0.01 SUI) submitted → **transaction digest produced**
- Market snapshot published to Walrus → **blob ID produced**
- Blob read back and displayed

## Step 5 — Capture verifiable artifacts

After Judge Mode completes, note:

```
Transaction digest:  <DIGEST>
Walrus blob ID:      <BLOB_ID>
```

Verify independently:
```
https://suiscan.xyz/testnet/tx/<DIGEST>
https://suiscan.xyz/testnet/object/0x<PACKAGE_ID>
https://aggregator.walrus-testnet.walrus.space/v1/blobs/<BLOB_ID>
```

## Step 6 — Verify live DeepBook Predict connection

```bash
# From repo root — queries real DeepBook Predict server (no wallet required)
node demo/demo_predict_live.js
```

Expected output confirms:
- DeepBook Predict server reachable
- Live market state for object `0xc8736...`
- Oracle list and latest prices
- SAPM agent forecast → order intent constructed

## Step 7 — Record demo video

Use the in-app **Open Judge Script** button for a timestamped 3-minute speaking guide.

Cover in order:
1. Problem (0:00–0:20)
2. Architecture diagram in README (0:20–0:45)
3. On-chain market loading from your deployed package (0:45–1:10)
4. Judge Mode run — show digest + blob ID (1:10–1:45)
5. DeepBook Predict live connection (1:45–2:10)
6. Lean 4 proof file in editor (2:10–2:35)
7. Close — "every artifact independently verifiable" (2:35–3:00)

## Step 8 — Submit on DeepSurge

URL: https://www.deepsurge.xyz/hackathons/b587dc0c-4cb8-4e63-ada5-519df38103bf

Fill in:
- **Title:** SAPM — Sovereign Agentic Prediction Market on Sui
- **GitHub:** https://github.com/rwilliamspbg-ops/Sovereign-Agentic-Prediction-Market-SAPM-on-Sui-Core
- **Demo:** [video URL or deployed frontend URL]
- **Tracks:** Agentic Web (primary), DeepBook (primary), DeFi & Payments, Walrus
- **Description:** paste from README §Problem + §What SAPM Does

**Verifiable artifacts to include in description:**
```
On-chain package:    https://suiscan.xyz/testnet/object/0x<PACKAGE_ID>
Transaction digest:  https://suiscan.xyz/testnet/tx/<DIGEST>
Walrus blob:         https://aggregator.walrus-testnet.walrus.space/v1/blobs/<BLOB_ID>
DeepBook Predict:    https://suiscan.xyz/testnet/object/0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a
```

---

## Troubleshooting

**"InsufficientGas" on publish:**
Increase gas budget: `--gas-budget 200000000`

**"Package not found" in frontend:**
Confirm `NEXT_PUBLIC_SUI_PACKAGE_ID` in `.env.local` matches the `packageId` from publish output (not the UpgradeCap ID).

**Wallet not connecting:**
Ensure Sui Wallet or Suiet is installed and set to Testnet. The app uses the Wallet Standard — any compliant Sui wallet works.

**DeepBook Predict server 403:**
The sandbox/CI network cannot reach `predict-server.testnet.mystenlabs.com` — this is a network ACL on the sandbox, not a code issue. It works correctly from your local machine and any deployed environment.

**Walrus publish failing:**
Check `NEXT_PUBLIC_WALRUS_PUBLISHER_URL` is set and wallet has SUI for storage fees. Walrus testnet tokens can be requested at https://docs.wal.app/docs/getting-started.
