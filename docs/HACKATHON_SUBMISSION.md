# SAPM — Sui Overflow 2026 Submission Guide

## Target Tracks

- **Agentic Web** (Core) — autonomous AI agents that transact and coordinate on Sui
- **DeFi & Payments** (Core) — financial primitives and payment rails
- **DeepBook** (Specialized) — trading application powered by DeepBook's on-chain orderbook
- **Walrus** (Specialized) — verifiable off-chain data storage with provenance

---

## Submission Checklist

### Required by Judges

- [ ] Working prototype or demo — **YES** — Judge Mode in the frontend provides a guided
      5-step verifiable demo: wallet connect → on-chain market load → micro trade → Walrus
      archive → blob preview. Every step produces a verifiable on-chain or off-chain artifact.

- [ ] Meaningful use of Sui-specific capabilities — **YES**
  - Move contracts deployed on Sui testnet (`Registry.move`, `incentives.move`)
  - PTB-based trade execution with wallet standard
  - DeepBook limit order / cancel / replace via `pool::place_limit_order`
  - Walrus snapshot publish/read with `sapm.walrus.snapshot.manifest.v1` schema
  - Shared objects for registry and reputation tracking

- [ ] Clear problem statement and why Sui — **YES** — See README §Problem and §What SAPM Does

- [ ] Technical execution + product thinking — **YES**
  - Full Next.js frontend with Board and Cards views, wallet-aware trading
  - Risk controls: balance preflight, idempotency guard, bounded retry, notional cap
  - Multi-agent pipeline: trader → aggregator (Multi-Krum BFT) → orchestrator
  - Formal verification artifacts for judge audit

### Pre-Submission Steps

1. Deploy Move contracts to testnet:
   ```bash
   cd agents/onchain-registry
   sui client publish --gas-budget 100000000
   ```
   Capture the package ID and registry object ID.

2. Set environment variables in `frontend/.env.local`:
   ```
   NEXT_PUBLIC_SUI_PACKAGE_ID=0x<package-id>
   NEXT_PUBLIC_SUI_MARKET_OBJECT_IDS=0x<registry-obj-id>
   NEXT_PUBLIC_DEEPBOOK_PREDICT_PACKAGE_ID=0x<deepbook-pkg>
   NEXT_PUBLIC_WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space
   NEXT_PUBLIC_WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space
   NEXT_PUBLIC_SUI_NETWORK=testnet
   ```

3. Run Judge Mode end-to-end locally and capture:
   - Transaction digest (verify on suiscan.xyz/testnet)
   - Walrus blob ID (verify on aggregator endpoint)

4. Record a 3-minute demo video following the Judge Script in the app (`Open Judge Script` button).

5. Submit on DeepSurge with:
   - Project title: `SAPM — Sovereign Agentic Prediction Market on Sui`
   - GitHub URL: this repo
   - Demo URL: deployed frontend or video link
   - Track selections: Agentic Web + DeepBook (primary), DeFi & Payments + Walrus (secondary)
   - Description: copy from README §What SAPM Does

---

## Judge Mode Demo Script (3 minutes)

| Time | Cue | What to Show |
|---|---|---|
| 0:00–0:15 | Problem | "Prediction markets require too much trust and manual operation." |
| 0:15–0:40 | What SAPM Does | Walk through the architecture diagram in the README |
| 0:40–1:05 | On-chain state | Load market from a real Sui object ID; show package link in the UI |
| 1:05–1:35 | Trade + Walrus | Run Judge Mode; show transaction digest and Walrus blob ID |
| 1:35–1:55 | Safety controls | Point to preflight checks, idempotency, risk cap in the Safety Active panel |
| 1:55–2:20 | DeepBook | Show DeepBook status panel, open orders query, sandbox link |
| 2:20–2:45 | Formal verification | Open `formal_verification/lean4/byzantine_tolerance/bft_agreement.lean` |
| 2:45–3:00 | Close | "Every artifact is independently verifiable. SAPM is production-path, not a prototype." |

---

## Verifiable Artifacts for Judges

After running Judge Mode, judges can independently verify:

1. **Transaction digest** → `https://suiscan.xyz/testnet/tx/<digest>`
2. **Walrus blob** → `https://aggregator.walrus-testnet.walrus.space/v1/blobs/<blobId>`
3. **Package on-chain** → `https://suiscan.xyz/testnet/object/<packageId>`
4. **Lean 4 proofs** → `formal_verification/lean4/` (no `sorry` in closed proofs)
5. **Move contract source** → `agents/onchain-registry/sources/`
