#!/usr/bin/env node
/**
 * SUI Blockchain Integration — real @mysten/sui SDK wiring
 * Replaces the previous stub SuiClient with the production SDK.
 * Move targets updated to match deployed prediction_market module.
 */

'use strict';

const express    = require('express');
const bodyParser = require('body-parser');
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');
const { Transaction }               = require('@mysten/sui/transactions');
const { Ed25519Keypair }            = require('@mysten/sui/keypairs/ed25519');

const router = express.Router();

// ─── Configuration ────────────────────────────────────────────────────────────

const SUI_RPC_URL   = process.env.SUI_RPC     || getFullnodeUrl('testnet');
const PACKAGE_ID    = process.env.REGISTRY_PACKAGE_ID ||
  '0xee0b87415139cc95ec2b9c684f0abb0b6befeb21a02a7ca246c16dd8e25b8188';

// Signer: base64-encoded 32-byte seed stored in AGG_SUI_SECRET.
// Falls back to a deterministic test keypair when the env is absent.
function buildKeypair () {
  const secret = process.env.AGG_SUI_SECRET || '';
  if (secret && secret.startsWith('suiprivkey')) {
    return Ed25519Keypair.fromSecretKey(secret);
  }
  if (secret) {
    try {
      const seed = Buffer.from(secret, 'base64');
      return Ed25519Keypair.fromSecretKey(seed);
    } catch { /* fall through */ }
  }
  // Dev-only: deterministic zero-seed keypair (never use in production)
  console.warn('[SUI] AGG_SUI_SECRET not set — using ephemeral dev keypair');
  return new Ed25519Keypair();
}

const keypair   = buildKeypair();
const suiClient = new SuiClient({ url: SUI_RPC_URL });

console.log(`[SUI] RPC: ${SUI_RPC_URL}`);
console.log(`[SUI] Package: ${PACKAGE_ID}`);
console.log(`[SUI] Signer: ${keypair.getPublicKey().toSuiAddress()}`);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toMist (sui) {
  return BigInt(Math.round(Number(sui) * 1_000_000_000));
}

async function signAndExecute (tx) {
  tx.setSender(keypair.getPublicKey().toSuiAddress());
  const bytes  = await tx.build({ client: suiClient });
  const sig    = await keypair.sign(bytes);
  const result = await suiClient.executeTransactionBlock({
    transactionBlock: bytes,
    signature:        sig,
    options:          { showEffects: true, showEvents: true },
  });
  if (result.effects?.status?.status !== 'success') {
    throw new Error(`Tx failed: ${JSON.stringify(result.effects?.status)}`);
  }
  return result.digest;
}

// In-memory history for the REST layer (not durable — use on-chain events for production)
const txHistory = [];

// ─── Routes ───────────────────────────────────────────────────────────────────

/** Health */
router.get('/health', (_req, res) => res.json({
  ok: true,
  service: 'sui-blockchain-integration',
  rpcUrl: SUI_RPC_URL,
  signerAddress: keypair.getPublicKey().toSuiAddress(),
  timestamp: new Date().toISOString(),
}));

/** Wallet init — returns live balance */
router.post('/wallet/init', async (_req, res) => {
  try {
    const address = keypair.getPublicKey().toSuiAddress();
    const bal     = await suiClient.getBalance({ owner: address, coinType: '0x2::sui::SUI' });
    res.json({
      ok: true,
      walletAddress: address,
      balanceMist: bal.totalBalance,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: 'wallet init failed', detail: e.message });
  }
});

/** Wallet balance */
router.post('/wallet/balance', async (_req, res) => {
  try {
    const address = keypair.getPublicKey().toSuiAddress();
    const bal     = await suiClient.getBalance({ owner: address, coinType: '0x2::sui::SUI' });
    res.json({ ok: true, walletAddress: address, balanceMist: bal.totalBalance });
  } catch (e) {
    res.status(500).json({ error: 'balance check failed', detail: e.message });
  }
});

/** Execute a prediction market open_position call */
router.post('/orders/execute', async (req, res) => {
  try {
    const { marketId, side, amountSui, metadata } = req.body;
    if (!marketId || !side || !amountSui) {
      return res.status(400).json({ error: 'marketId, side, amountSui required' });
    }
    const sideU8 = side === 'YES' ? 1 : 2;
    const mistVal = toMist(amountSui);

    const tx = new Transaction();
    tx.setGasBudget(8_000_000);
    const [stakeCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(mistVal)]);
    tx.moveCall({
      target:    `${PACKAGE_ID}::prediction_market::open_position`,
      arguments: [tx.object(marketId), tx.pure.u8(sideU8), stakeCoin],
    });

    const digest = await signAndExecute(tx);
    const record = { digest, marketId, side, amountSui, metadata, timestamp: new Date().toISOString(), status: 'SUCCESS' };
    txHistory.push(record);
    res.json({ ok: true, digest, ...record });
  } catch (e) {
    res.status(500).json({ error: 'order execution failed', detail: e.message });
  }
});

/** Batch open_position calls (one PTB per order) */
router.post('/orders/batch', async (req, res) => {
  try {
    const orders = req.body;
    if (!Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({ error: 'orders must be a non-empty array' });
    }
    const results = [];
    for (const o of orders) {
      const sideU8  = o.side === 'YES' ? 1 : 2;
      const mistVal = toMist(o.amountSui);
      const tx      = new Transaction();
      tx.setGasBudget(8_000_000);
      const [stakeCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(mistVal)]);
      tx.moveCall({
        target:    `${PACKAGE_ID}::prediction_market::open_position`,
        arguments: [tx.object(o.marketId), tx.pure.u8(sideU8), stakeCoin],
      });
      const digest = await signAndExecute(tx);
      const record = { digest, ...o, timestamp: new Date().toISOString(), status: 'SUCCESS' };
      txHistory.push(record);
      results.push(record);
    }
    res.json({ ok: true, count: results.length, results });
  } catch (e) {
    res.status(500).json({ error: 'batch execution failed', detail: e.message });
  }
});

/** Gas estimate for a simple single move call */
router.post('/gas/estimate', async (req, res) => {
  try {
    const { contractId, functionName } = req.body;
    if (!contractId || !functionName) {
      return res.status(400).json({ error: 'contractId and functionName required' });
    }
    const address = keypair.getPublicKey().toSuiAddress();
    const bal     = await suiClient.getBalance({ owner: address, coinType: '0x2::sui::SUI' });
    // Dry-run estimation is chain-state dependent; return a conservative budget value
    // Actual dry-run requires a fully constructed PTB with real object IDs.
    res.json({
      ok: true,
      contractId,
      functionName,
      estimatedGasBudget: 8_000_000,
      walletBalanceMist: bal.totalBalance,
    });
  } catch (e) {
    res.status(500).json({ error: 'gas estimation failed', detail: e.message });
  }
});

/** Transaction history (in-memory, this session only) */
router.get('/transactions/history', (req, res) => {
  const { status, marketId, type } = req.query;
  let list = [...txHistory];
  if (status)   list = list.filter(t => t.status   === status);
  if (marketId) list = list.filter(t => t.marketId === marketId);
  if (type)     list = list.filter(t => t.type     === type);
  list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json({ ok: true, count: list.length, transactions: list });
});

router.get('/transactions/recent/:count', (req, res) => {
  const n = parseInt(req.params.count, 10);
  if (isNaN(n) || n < 1 || n > 1000) {
    return res.status(400).json({ error: 'count must be 1–1000' });
  }
  res.json({ ok: true, transactions: txHistory.slice(-n) });
});

/** Subscribe (stub for WebSocket — returns handle only; wire real subscribeEvent in prod) */
router.post('/events/subscribe', (req, res) => {
  const { contractId, eventFilter } = req.body;
  if (!contractId || !eventFilter) {
    return res.status(400).json({ error: 'contractId and eventFilter required' });
  }
  const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  res.json({ ok: true, subscriptionId, contractId, eventFilter, status: 'SUBSCRIBED', note: 'Use suiClient.subscribeEvent() for live WebSocket streaming' });
});

// ─── App ──────────────────────────────────────────────────────────────────────

const app = express();
app.use(bodyParser.json());
app.use('/api/v1/sui', router);

app.use((err, _req, res, _next) => {
  console.error('[SUI] Unhandled error:', err.stack);
  res.status(500).json({ error: 'internal server error', service: 'sui-blockchain-integration' });
});

module.exports = app;
