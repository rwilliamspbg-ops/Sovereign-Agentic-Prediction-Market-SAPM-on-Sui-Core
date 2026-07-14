#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
/**
 * SAPM × DeepBook Predict — live read-only demo
 *
 * Queries the public DeepBook Predict server and Walrus aggregator.
 * Requires no wallet, no private key, no local Sui CLI.
 *
 * Run:
 *   node demo/demo_predict_live.js
 *
 * What it demonstrates:
 *   1. DeepBook Predict server health check
 *   2. Live market state for the current Predict object
 *   3. Oracle list and latest oracle price
 *   4. Vault summary (TVL, PLP supply)
 *   5. Walrus aggregator health check
 *   6. Simulated SAPM agent forecast → DeepBook order intent
 *
 * Every line of output is reproducible by a judge in ~30 seconds.
 */
'use strict';

const DEEPBOOK_PREDICT_SERVER = process.env.DEEPBOOK_PREDICT_SERVER || 'https://predict-server.testnet.mystenlabs.com';
const DEEPBOOK_PREDICT_OBJECT_ID = process.env.DEEPBOOK_PREDICT_OBJECT_ID || '0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a';
const DEEPBOOK_PREDICT_PACKAGE  = process.env.NEXT_PUBLIC_DEEPBOOK_PREDICT_PACKAGE_ID || '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
const WALRUS_AGGREGATOR_URL     = process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL || 'https://aggregator.walrus-testnet.walrus.space';
const SAPM_PACKAGE_ID           = process.env.NEXT_PUBLIC_SUI_PACKAGE_ID || '0x746797ce' + '439d0e06bdb31d1b0dacc24e204e7906445292a97fb6a5734de777b8';
const SUI_NETWORK               = process.env.SUI_NETWORK || 'testnet';
const SUISCAN_BASE              = SUI_NETWORK === 'mainnet' ? 'https://suiscan.xyz' : 'https://suiscan.xyz/testnet';

const log = (msg, data) => {
  const entry = { ts: new Date().toISOString(), msg };
  if (data !== undefined) entry.data = data;
  process.stdout.write(JSON.stringify(entry) + '\n');
};

async function get(url) {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

async function checkService(name, url) {
  const t0 = Date.now();
  try {
    await get(url);
    log(`${name} reachable`, { latencyMs: Date.now() - t0, url });
    return true;
  } catch (e) {
    log(`${name} unreachable`, { error: e.message, url });
    return false;
  }
}

async function main() {
  process.stdout.write('\n');
  log('SAPM × DeepBook Predict — live demo starting');
  log('SAPM package on testnet', { packageId: SAPM_PACKAGE_ID, explorer: `${SUISCAN_BASE}/object/${SAPM_PACKAGE_ID}` });

  // ── 1. Service health ────────────────────────────────────────────────────
  log('── Step 1: Service health checks');
  const predictOk = await checkService('DeepBook Predict server', `${DEEPBOOK_PREDICT_SERVER}/status`);
  const walrusOk  = await checkService('Walrus aggregator',       `${WALRUS_AGGREGATOR_URL}/v1/health`);

  // ── 2. Market state ──────────────────────────────────────────────────────
  log('── Step 2: DeepBook Predict market state');
  let oracles = [];
  if (predictOk) {
    try {
      const state = await get(`${DEEPBOOK_PREDICT_SERVER}/predicts/${DEEPBOOK_PREDICT_OBJECT_ID}/state`);
      log('Market state fetched', {
        predictId:   DEEPBOOK_PREDICT_OBJECT_ID,
        status:      state.status ?? state.lifecycle_status ?? 'active',
        packageId:   DEEPBOOK_PREDICT_PACKAGE,
        stateKeys:   Object.keys(state),
      });

      // ── 3. Oracles ────────────────────────────────────────────────────────
      log('── Step 3: Oracle list');
      const oracleList = await get(`${DEEPBOOK_PREDICT_SERVER}/predicts/${DEEPBOOK_PREDICT_OBJECT_ID}/oracles`).catch(() => ({ data: [] }));
      oracles = (oracleList.data ?? oracleList ?? []).slice(0, 3);
      log('Oracles found', { count: oracles.length, sample: oracles.slice(0, 2) });

      // Fetch latest price for first oracle
      if (oracles.length > 0) {
        const latestPrice = await get(`${DEEPBOOK_PREDICT_SERVER}/oracles/${oracles[0]}/prices/latest`).catch(() => null);
        if (latestPrice) {
          log('Latest oracle price', { oracleId: oracles[0], price: latestPrice });
        }
      }

      // ── 4. Vault ──────────────────────────────────────────────────────────
      log('── Step 4: Vault summary');
      const vault = await get(`${DEEPBOOK_PREDICT_SERVER}/predicts/${DEEPBOOK_PREDICT_OBJECT_ID}/vault/summary`).catch(() => null);
      if (vault) {
        log('Vault summary', { totalValue: vault.total_value, plpSupply: vault.plp_supply, keys: Object.keys(vault) });
      }
    } catch (e) {
      log('Market data fetch failed', { error: e.message });
    }
  }

  // ── 5. Walrus read-back ──────────────────────────────────────────────────
  log('── Step 5: Walrus aggregator');
  if (walrusOk) {
    log('Walrus aggregator healthy', {
      url:  WALRUS_AGGREGATOR_URL,
      note: 'publishMarketSnapshot() will write to this endpoint during Judge Mode',
    });
  }

  // ── 6. SAPM agent forecast → DeepBook order intent ───────────────────────
  log('── Step 6: SAPM agent simulation');
  const mockForecast = {
    marketId:   oracles[0] ?? DEEPBOOK_PREDICT_OBJECT_ID,
    probability: 0.67,
    aiEdge:      0.21,
    confidence:  88,
  };

  log('Agent forecast generated', mockForecast);

  // Apply Kelly sizing (simplified)
  const bankrollMist  = 10_000_000_000; // 10 SUI notional
  const maxFraction   = 0.03;
  const positionMist  = Math.floor(bankrollMist * Math.min(mockForecast.aiEdge, maxFraction));
  const isBid         = mockForecast.aiEdge > 0;
  const priceMist     = Math.round(mockForecast.probability * 1_000_000);

  const orderIntent = {
    poolObjectId:            DEEPBOOK_PREDICT_OBJECT_ID,
    balanceManagerObjectId:  '(set after wallet connect)',
    priceMist,
    quantityMist:            positionMist,
    isBid,
    clientOrderId:           Date.now(),
    deepbookPackageId:       DEEPBOOK_PREDICT_PACKAGE,
  };

  log('DeepBook order intent constructed', orderIntent);
  log('→ To execute: connect wallet in Judge Mode and click "Run Judge Mode"');

  // ── Summary ───────────────────────────────────────────────────────────────
  log('── Demo complete', {
    sapmPackage:         `${SUISCAN_BASE}/object/${SAPM_PACKAGE_ID}`,
    deepbookPredictObj:  `${SUISCAN_BASE}/object/${DEEPBOOK_PREDICT_OBJECT_ID}`,
    predictServer:       DEEPBOOK_PREDICT_SERVER,
    walrusAggregator:    WALRUS_AGGREGATOR_URL,
    nextStep:            'Run frontend, connect wallet, execute Judge Mode for live tx digest + Walrus blob ID',
  });
  process.stdout.write('\n');
}

main().catch(err => {
  process.stderr.write(JSON.stringify({ ts: new Date().toISOString(), level: 'error', msg: err.message }) + '\n');
  process.exitCode = 1;
});
