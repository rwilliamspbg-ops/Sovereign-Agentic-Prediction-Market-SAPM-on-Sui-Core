// SPDX-License-Identifier: Apache-2.0
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const nacl = require('tweetnacl');
const util = require('tweetnacl-util');
const https = require('https');
const client = require('prom-client');
const { SuiClient } = require('@mysten/sui/client');
const { Transaction } = require('@mysten/sui/transactions');
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const ReputationTracker = require('./reputation-tracker');

const PORT = Number(process.env.PORT || 4000);
const MODEL_DIR = process.env.MODEL_DIR || '/data';
const MODEL_FILE = path.resolve(MODEL_DIR, 'model.json');
const META_FILE = path.resolve(MODEL_DIR, 'model.meta.json');
const AGG_COUNT = Number(process.env.AGGREGATE_COUNT || 3);
const AGG_TOKEN = process.env.AGG_TOKEN || null;
const TTL_MS = Number(process.env.UPDATE_TTL_MS || 1000 * 60 * 5); // 5 minutes default
const SEEN_CACHE_LIMIT = Number(process.env.SEEN_CACHE_LIMIT || 10000);
const REGISTRY_FILE = path.resolve(MODEL_DIR, 'registry.json');
const SEEN_FILE = path.resolve(MODEL_DIR, 'seen.json');
const SUI_RPC = process.env.SUI_RPC || 'http://sui-local:9000';
const PUBKEY_REGISTRY_OBJ = process.env.PUBKEY_REGISTRY_OBJ || null;
const REGISTRY_OBJ_ID = process.env.REGISTRY_OBJ_ID || PUBKEY_REGISTRY_OBJ || null;
const AGG_SECRET = process.env.AGG_SECRET || null;
const REGISTRY_PACKAGE_ID = process.env.REGISTRY_PACKAGE_ID || null;
const REGISTRY_MODULE = process.env.REGISTRY_MODULE || 'registry';
const REGISTRY_FUNCTION = process.env.REGISTRY_FUNCTION || 'add_key';
const AGG_SUI_SECRET = process.env.AGG_SUI_SECRET || null;
const STRICT_PROOF_ENFORCEMENT = process.env.STRICT_PROOF_ENFORCEMENT !== '0';
const REQUIRE_ONCHAIN_COMMIT = process.env.REQUIRE_ONCHAIN_COMMIT === '1';

// On-chain registry cache
let registryCache = null;
let registryCacheTs = 0;
const REGISTRY_CACHE_TTL_MS = Number(process.env.REGISTRY_CACHE_TTL_MS || 30_000);

let updates = [];
let model = null;
let allowedPubkeys = new Set();
let seen = new Set();
let aggKey = null;
let aggPubkeyB64 = null;
let aggSuiSigner = null;
const reputationTracker = new ReputationTracker();

// Prometheus metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });
const updatesReceived = new client.Counter({ name: 'sapm_aggregator_updates_received_total', help: 'Total updates received', registers: [register] });
const updatesAggregated = new client.Counter({ name: 'sapm_aggregator_updates_aggregated_total', help: 'Total aggregations performed', registers: [register] });
const lastAggregationTs = new client.Gauge({ name: 'sapm_aggregator_last_aggregation_ts', help: 'Last aggregation timestamp', registers: [register] });

async function defaultModel() {
  return Array.from({ length: 10 }, () => 0);
}

async function loadModel() {
  try {
    const txt = await fs.readFile(MODEL_FILE, 'utf8');
    model = JSON.parse(txt);
  } catch {
    model = await defaultModel();
    await saveModel();
  }
  // load registry
  try {
    const rtxt = await fs.readFile(REGISTRY_FILE, 'utf8');
    const arr = JSON.parse(rtxt || '[]');
    allowedPubkeys = new Set(arr);
  } catch {
    allowedPubkeys = new Set();
    await saveRegistry();
  }
  // load seen
  try {
    const stxt = await fs.readFile(SEEN_FILE, 'utf8');
    const arr = JSON.parse(stxt || '[]');
    seen = new Set(arr);
  } catch {
    seen = new Set();
    await persistSeen();
  }
}

async function fetchOnchainRegistry() {
  if (!PUBKEY_REGISTRY_OBJ) return null;
  const now = Date.now();
  if (registryCache && (now - registryCacheTs) < REGISTRY_CACHE_TTL_MS) return registryCache;
  try {
    const sui = new SuiClient({ url: SUI_RPC });
    const obj = await sui.request({ method: 'sui_getObject', params: [PUBKEY_REGISTRY_OBJ] });
    const txt = JSON.stringify(obj || {});
    // Simple heuristic: find any base64/hex pubkeys in object text and return as set
    // This is opportunistic: it works for registry objects that include pubkeys in plaintext.
    const matches = [];
    // look for base64-like strings (rough)
    const re = /[A-Za-z0-9+/=]{32,88}/g;
    let m;
    while ((m = re.exec(txt))) {
      matches.push(m[0]);
    }
    registryCache = new Set(matches);
    registryCacheTs = now;
    return registryCache;
  } catch (e) {
    console.warn('Failed to fetch on-chain registry:', e?.message || e);
    return null;
  }
}

async function saveModel() {
  await fs.mkdir(MODEL_DIR, { recursive: true });
  await fs.writeFile(MODEL_FILE, JSON.stringify(model, null, 2), 'utf8');
  const meta = { hash: crypto.createHash('sha256').update(JSON.stringify(model)).digest('hex'), ts: new Date().toISOString() };
  await fs.writeFile(META_FILE, JSON.stringify(meta, null, 2), 'utf8');
}

async function saveRegistry() {
  await fs.mkdir(MODEL_DIR, { recursive: true });
  await fs.writeFile(REGISTRY_FILE, JSON.stringify(Array.from(allowedPubkeys), null, 2), 'utf8');
}

async function persistSeen() {
  await fs.mkdir(MODEL_DIR, { recursive: true });
  await fs.writeFile(SEEN_FILE, JSON.stringify(Array.from(seen), null, 2), 'utf8');
}

function markSeen(key) {
  seen.add(key);
  if (seen.size > SEEN_CACHE_LIMIT) {
    const arr = Array.from(seen);
    const keep = arr.slice(-Math.floor(SEEN_CACHE_LIMIT / 2));
    seen = new Set(keep);
  }
  persistSeen().catch(() => {});
}

function makeSeenId(kind, pubkey, sig, nonce) {
  return crypto.createHash('sha256').update(`${kind}:${pubkey}:${sig}:${nonce || ''}`).digest('hex');
}

function ttlCheck(ts) {
  const now = Date.now();
  return Math.abs(now - Number(ts)) <= TTL_MS;
}

async function isRegisteredPubkey(pubkey) {
  if (PUBKEY_REGISTRY_OBJ) {
    const onchain = await fetchOnchainRegistry();
    return !onchain || onchain.has(pubkey);
  }
  if (allowedPubkeys.size === 0) return true;
  return allowedPubkeys.has(pubkey);
}

function loadAggSuiSigner() {
  if (!AGG_SUI_SECRET) return null;
  if (aggSuiSigner) return aggSuiSigner;
  try {
    aggSuiSigner = AGG_SUI_SECRET.startsWith('suiprivkey')
      ? Ed25519Keypair.fromSecretKey(AGG_SUI_SECRET)
      : Ed25519Keypair.fromSecretKey(new Uint8Array(Buffer.from(AGG_SUI_SECRET, 'base64')));
    return aggSuiSigner;
  } catch (e) {
    console.warn('Failed to initialize AGG_SUI_SECRET signer:', e?.message || e);
    return null;
  }
}

function aggregateUpdates(updatesArr) {
  if (!updatesArr || updatesArr.length === 0) return null;
  const strategy = (process.env.AGG_STRATEGY || 'avg').toLowerCase();
  const normalized = normalizeUpdates(updatesArr);
  if (!normalized.vectors.length) return null;
  if (strategy === 'trimmed') return trimmedMean(normalized.vectors);
  if (strategy === 'multikrum') return simpleMultiKrum(normalized.vectors);
  if (strategy === 'multikrum_reputation' || strategy === 'multikrum-reputation') {
    const details = reputationWeightedMultiKrum(normalized);
    applySelectionFeedback(normalized.pubkeys, details.selectedIndices);
    return details.aggregate;
  }
  // default: average
  const len = normalized.vectors[0].length;
  const out = new Array(len).fill(0);
  for (const u of normalized.vectors) {
    for (let i = 0; i < len; i++) out[i] += u[i];
  }
  return out.map((v) => v / normalized.vectors.length);
}

function normalizeUpdates(updatesArr) {
  if (updatesArr && Array.isArray(updatesArr.vectors)) {
    return {
      vectors: updatesArr.vectors,
      pubkeys: Array.isArray(updatesArr.pubkeys)
        ? updatesArr.pubkeys
        : new Array(updatesArr.vectors.length).fill(null),
    };
  }
  const vectors = [];
  const pubkeys = [];
  for (const item of updatesArr) {
    if (Array.isArray(item)) {
      vectors.push(item);
      pubkeys.push(null);
      continue;
    }
    if (item && Array.isArray(item.update)) {
      vectors.push(item.update);
      pubkeys.push(item.pubkey || null);
    }
  }
  return { vectors, pubkeys };
}

function trimmedMean(updatesArr, trimFraction = 0.2) {
  const len = updatesArr[0].length;
  const n = updatesArr.length;
  const toTrim = Math.floor(n * trimFraction);
  const out = new Array(len).fill(0);
  for (let i = 0; i < len; i++) {
    const col = updatesArr.map((u) => u[i]);
    if (toTrim > 0 && (toTrim * 2) < n) {
      const lo = toTrim;
      const hi = n - toTrim - 1;
      quickSelect(col, lo);
      quickSelect(col, hi, lo, n - 1);
      let sum = 0;
      for (let j = lo; j <= hi; j++) sum += col[j];
      out[i] = sum / (hi - lo + 1);
    } else {
      let sum = 0;
      for (let j = 0; j < n; j++) sum += col[j];
      out[i] = n ? (sum / n) : 0;
    }
  }
  return out;
}

function euclideanDistance(a, b) {
  return Math.sqrt(squaredEuclideanDistance(a, b));
}

function squaredEuclideanDistance(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return s;
}

function partition(arr, left, right, pivotIndex) {
  const pivotValue = arr[pivotIndex];
  [arr[pivotIndex], arr[right]] = [arr[right], arr[pivotIndex]];
  let storeIndex = left;
  for (let i = left; i < right; i++) {
    if (arr[i] < pivotValue) {
      [arr[storeIndex], arr[i]] = [arr[i], arr[storeIndex]];
      storeIndex++;
    }
  }
  [arr[right], arr[storeIndex]] = [arr[storeIndex], arr[right]];
  return storeIndex;
}

function quickSelect(arr, k, left = 0, right = arr.length - 1) {
  while (left <= right) {
    const pivotIndex = left + Math.floor((right - left) / 2);
    const pivotFinal = partition(arr, left, right, pivotIndex);
    if (pivotFinal === k) return;
    if (k < pivotFinal) right = pivotFinal - 1;
    else left = pivotFinal + 1;
  }
}

function buildPairwiseDistanceMatrix(updatesArr) {
  const n = updatesArr.length;
  const dists = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dist = squaredEuclideanDistance(updatesArr[i], updatesArr[j]);
      dists[i][j] = dist;
      dists[j][i] = dist;
    }
  }
  return dists;
}

// Simple Multi-Krum-ish selector: score each update by summed distances
// to others and select the subset with lowest scores, then average them.
function simpleMultiKrum(updatesArr, f = 1) {
  const n = updatesArr.length;
  if (n === 0) return null;
  if (n === 1) return updatesArr[0];
  const scores = new Array(n).fill(0);
  const dists = buildPairwiseDistanceMatrix(updatesArr);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      scores[i] += dists[i][j];
    }
  }
  // sort by score ascending and pick top (n - f - 2) as in Multi-Krum heuristics
  const idxs = scores.map((s, i) => ({ s, i })).sort((a, b) => a.s - b.s).map((x) => x.i);
  const pick = Math.max(1, n - f - 2);
  const chosen = idxs.slice(0, pick);
  // average chosen
  const len = updatesArr[0].length;
  const out = new Array(len).fill(0);
  for (const i of chosen) {
    for (let k = 0; k < len; k++) out[k] += updatesArr[i][k];
  }
  return out.map((v) => v / chosen.length);
}

function reputationWeightedMultiKrum(normalized, fOverride = null) {
  const updatesArr = normalized.vectors;
  const n = updatesArr.length;
  if (n === 0) return { aggregate: null, selectedIndices: [], scores: [] };
  if (n === 1) return { aggregate: updatesArr[0], selectedIndices: [0], scores: [0] };

  const maxF = Math.max(0, Math.floor((n - 2) / 3));
  const f = fOverride === null ? Math.min(1, maxF) : Math.max(0, Math.min(fOverride, maxF));
  const repWeights = new Array(n).fill(1);
  for (let i = 0; i < n; i++) {
    const pubkey = normalized.pubkeys[i];
    if (!pubkey) continue;
    if (!reputationTracker.agentScores.has(pubkey)) {
      reputationTracker.registerAgent(pubkey, 50);
    }
    repWeights[i] = Math.max(0.2, reputationTracker.getReputation(pubkey) / 100);
  }

  const scores = new Array(n).fill(0);
  const dists = buildPairwiseDistanceMatrix(updatesArr);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const weight = repWeights[i] * repWeights[j];
      scores[i] += dists[i][j] / weight;
    }
  }

  const idxs = scores.map((score, idx) => ({ score, idx })).sort((a, b) => a.score - b.score).map((x) => x.idx);
  const pick = Math.max(1, n - f - 2);
  const selectedIndices = idxs.slice(0, pick);

  const len = updatesArr[0].length;
  const out = new Array(len).fill(0);
  let denom = 0;
  for (const i of selectedIndices) {
    const w = repWeights[i];
    denom += w;
    for (let k = 0; k < len; k++) out[k] += updatesArr[i][k] * w;
  }

  const aggregate = out.map((v) => v / (denom || 1));
  return { aggregate, selectedIndices, scores };
}

function applySelectionFeedback(pubkeys, selectedIndices) {
  if (!pubkeys || pubkeys.length === 0) return;
  const selected = new Set(selectedIndices);
  pubkeys.forEach((pubkey, index) => {
    if (!pubkey) return;
    if (!reputationTracker.agentScores.has(pubkey)) {
      reputationTracker.registerAgent(pubkey, 50);
    }
    const delta = selected.has(index) ? 2 : -1;
    reputationTracker.adjustReputation(pubkey, delta);
  });
}

// Rounds / consensus state management
let rounds = new Map();
const ROUNDS_FILE = path.resolve(MODEL_DIR, 'rounds.json');

async function loadRounds() {
  try {
    const txt = await fs.readFile(ROUNDS_FILE, 'utf8');
    const obj = JSON.parse(txt || '{}');
    rounds = new Map(Object.entries(obj));
  } catch {
    rounds = new Map();
  }
}

async function persistRounds() {
  await fs.mkdir(MODEL_DIR, { recursive: true });
  const obj = Object.fromEntries(rounds);
  await fs.writeFile(ROUNDS_FILE, JSON.stringify(obj, null, 2), 'utf8');
}

async function ensureAggKey() {
  // Load or generate an aggregator signing key (seed-based). Persist seed for restarts.
  const KEY_FILE = path.resolve(MODEL_DIR, 'agg.key.json');
  try {
    const txt = await fs.readFile(KEY_FILE, 'utf8');
    const obj = JSON.parse(txt);
    const seed = Buffer.from(obj.seed, 'base64');
    aggKey = nacl.sign.keyPair.fromSeed(new Uint8Array(seed));
    aggPubkeyB64 = util.encodeBase64(Buffer.from(aggKey.publicKey));
    return;
  } catch {
    // fallthrough to generate
  }
  // If AGG_SECRET provided, use it as seed (base64 expected)
  let seedBuf;
  if (AGG_SECRET) {
    seedBuf = Buffer.from(AGG_SECRET, 'base64');
  } else {
    seedBuf = crypto.randomBytes(32);
  }
  aggKey = nacl.sign.keyPair.fromSeed(new Uint8Array(seedBuf));
  aggPubkeyB64 = util.encodeBase64(Buffer.from(aggKey.publicKey));
  const out = { seed: Buffer.from(seedBuf).toString('base64'), pubkey: aggPubkeyB64 };
  await fs.mkdir(MODEL_DIR, { recursive: true });
  await fs.writeFile(KEY_FILE, JSON.stringify(out, null, 2), 'utf8');
}

function signMeta(meta) {
  if (!aggKey) throw new Error('aggKey not initialized');
  const payload = JSON.stringify(meta);
  const sig = nacl.sign.detached(Buffer.from(payload, 'utf8'), aggKey.secretKey);
  return util.encodeBase64(Buffer.from(sig));
}

async function emitOnchainCommitment(meta) {
  // Always persist a local artifact. When chain credentials are configured,
  // submit a live Move call and record tx digest for auditability.
  const payload = {
    commitment: meta.hash,
    ts: meta.ts,
    round: meta.round,
    aggregator: meta.aggregator,
    onchain: {
      configured: Boolean(SUI_RPC && REGISTRY_OBJ_ID && REGISTRY_PACKAGE_ID && AGG_SUI_SECRET),
      submitted: false,
      txDigest: null,
      error: null,
    },
  };
  const outFile = path.resolve(MODEL_DIR, `commitment.${meta.round}.json`);

  // Assemble a Move call template for operators regardless of auto-submit.
  if (REGISTRY_OBJ_ID) {
    const moveCall = {
      movePackage: REGISTRY_PACKAGE_ID,
      moveModule: REGISTRY_MODULE,
      moveFunction: REGISTRY_FUNCTION,
      args: [REGISTRY_OBJ_ID, Buffer.from(meta.hash, 'hex').toString('base64')],
    };
    const moveFile = path.resolve(MODEL_DIR, `commit_move.${meta.round}.json`);
    await fs.writeFile(moveFile, JSON.stringify(moveCall, null, 2), 'utf8');
  }

  if (payload.onchain.configured) {
    try {
      const sui = new SuiClient({ url: SUI_RPC });
      const signer = loadAggSuiSigner();
      if (!signer) throw new Error('missing signer from AGG_SUI_SECRET');

      const tx = new Transaction();
      tx.moveCall({
        target: `${REGISTRY_PACKAGE_ID}::${REGISTRY_MODULE}::${REGISTRY_FUNCTION}`,
        arguments: [tx.object(REGISTRY_OBJ_ID), tx.pure.vector('u8', Buffer.from(meta.hash, 'hex'))],
      });
      const result = await sui.signAndExecuteTransaction({
        signer,
        transaction: tx,
        options: { showEffects: true },
      });
      payload.onchain.submitted = true;
      payload.onchain.txDigest = result?.digest || null;
    } catch (e) {
      payload.onchain.error = e?.message || String(e);
      if (REQUIRE_ONCHAIN_COMMIT) {
        await fs.writeFile(outFile, JSON.stringify(payload, null, 2), 'utf8');
        throw e;
      }
    }
  }

  await fs.writeFile(outFile, JSON.stringify(payload, null, 2), 'utf8');
  return payload;
}

function verifySignature(pubkeyB64, sigB64, payloadStr) {
  try {
    const pub = Buffer.from(pubkeyB64, 'base64');
    const sig = Buffer.from(sigB64, 'base64');
    const msg = Buffer.from(payloadStr, 'utf8');
    return nacl.sign.detached.verify(new Uint8Array(msg), new Uint8Array(sig), new Uint8Array(pub));
  } catch {
    return false;
  }
}

function validateStartupConfig() {
  const missing = [];
  if (REQUIRE_ONCHAIN_COMMIT) {
    if (!SUI_RPC) missing.push('SUI_RPC');
    if (!REGISTRY_PACKAGE_ID) missing.push('REGISTRY_PACKAGE_ID');
    if (!REGISTRY_OBJ_ID) missing.push('REGISTRY_OBJ_ID');
    if (!AGG_SUI_SECRET) missing.push('AGG_SUI_SECRET');
  }
  if (TTL_MS <= 0) throw new Error('UPDATE_TTL_MS must be greater than zero');
  if (missing.length > 0) {
    throw new Error(`REQUIRE_ONCHAIN_COMMIT=1 requires env vars: ${missing.join(', ')}`);
  }
}

async function run() {
  validateStartupConfig();
  await loadModel();
  await ensureAggKey();
  await loadRounds();
  console.log(`Hardening: strictProofs=${STRICT_PROOF_ENFORCEMENT ? 'on' : 'off'} requireOnchainCommit=${REQUIRE_ONCHAIN_COMMIT ? 'on' : 'off'}`);
  const app = express();
  app.use(bodyParser.json({ limit: '1mb' }));

  app.post('/updates', async (req, res) => {
    // Optional token auth
    if (AGG_TOKEN) {
      const auth = (req.headers.authorization || '').trim();
      if (!auth.startsWith('Bearer ') || auth.split(' ')[1] !== AGG_TOKEN) {
        return res.status(401).json({ error: 'unauthorized' });
      }
    }

    const { update, pubkey, sig, ts, nonce } = req.body || {};
    if (!Array.isArray(update)) return res.status(400).json({ error: 'update must be an array' });
    if (!pubkey || !sig || !ts || (STRICT_PROOF_ENFORCEMENT && !nonce)) {
      return res.status(400).json({ error: 'missing signature fields' });
    }

    if (!(await isRegisteredPubkey(pubkey))) return res.status(403).json({ error: 'pubkey not registered' });

    if (!ttlCheck(ts)) return res.status(400).json({ error: 'timestamp outside TTL' });

    const seenId = makeSeenId('update', pubkey, sig, nonce);
    if (seen.has(seenId)) return res.status(409).json({ error: 'replay detected' });

    const payloadStr = JSON.stringify({ update, ts, nonce });
    const ok = verifySignature(pubkey, sig, payloadStr);
    updatesReceived.inc();
    if (!ok) return res.status(401).json({ error: 'invalid signature' });

    markSeen(seenId);

    updates.push({ update, pubkey });
    // perform aggregation when buffer full
    if (updates.length >= AGG_COUNT) {
      const agg = aggregateUpdates(updates);
      if (agg) {
        // create an open proposal/round for this aggregation
        const roundId = crypto.createHash('sha256').update(JSON.stringify({ agg, ts: Date.now() })).digest('hex');
        const proposer = 'local-buffer';
        const proposal = { id: roundId, model: agg, proposer, ts: Date.now(), votes: {}, status: 'open' };
        rounds.set(roundId, proposal);
        await persistRounds();
        // don't auto-apply; wait for votes/consensus via /vote
        updates = [];
        updatesAggregated.inc();
        lastAggregationTs.set(Date.now());
        return res.json({ ok: true, aggregated: true, round: roundId });
      }
    }
    return res.json({ ok: true, aggregated: false, buffer: updates.length });
  });

  // Submit a proposal (agent or aggregator can propose a candidate aggregate)
  app.post('/propose', async (req, res) => {
    const { model: proposalModel, pubkey, sig, ts, nonce } = req.body || {};
    if (!Array.isArray(proposalModel)) return res.status(400).json({ error: 'model required' });
    if (STRICT_PROOF_ENFORCEMENT && (!pubkey || !sig || !ts || !nonce)) {
      return res.status(400).json({ error: 'missing proposal proof fields' });
    }
    if (pubkey && sig && ts) {
      if (!(await isRegisteredPubkey(pubkey))) return res.status(403).json({ error: 'pubkey not registered' });
      if (!ttlCheck(ts)) return res.status(400).json({ error: 'timestamp outside TTL' });
      const seenId = makeSeenId('propose', pubkey, sig, nonce);
      if (seen.has(seenId)) return res.status(409).json({ error: 'replay detected' });
      const payloadStr = JSON.stringify({ model: proposalModel, ts, nonce });
      if (!verifySignature(pubkey, sig, payloadStr)) return res.status(401).json({ error: 'invalid signature' });
      markSeen(seenId);
    }
    const roundId = crypto.createHash('sha256').update(JSON.stringify({ proposalModel, ts: ts || Date.now() })).digest('hex');
    const proposal = { id: roundId, model: proposalModel, proposer: pubkey || 'unknown', ts: ts || Date.now(), votes: {}, status: 'open' };
    rounds.set(roundId, proposal);
    await persistRounds();
    return res.json({ ok: true, id: roundId });
  });

  // Vote on a proposal
  app.post('/vote', async (req, res) => {
    const { roundId, pubkey, sig, ts, nonce, choice } = req.body || {};
    if (!roundId || !pubkey || !sig || !ts || (STRICT_PROOF_ENFORCEMENT && !nonce)) {
      return res.status(400).json({ error: 'missing vote fields' });
    }
    if (!(await isRegisteredPubkey(pubkey))) return res.status(403).json({ error: 'pubkey not registered' });
    if (!ttlCheck(ts)) return res.status(400).json({ error: 'timestamp outside TTL' });
    const voteSeenId = makeSeenId(`vote:${roundId}`, pubkey, sig, nonce);
    if (seen.has(voteSeenId)) return res.status(409).json({ error: 'replay detected' });
    const payloadStr = JSON.stringify({ roundId, choice, ts, nonce });
    if (!verifySignature(pubkey, sig, payloadStr)) return res.status(401).json({ error: 'invalid signature' });
    markSeen(voteSeenId);
    const proposal = rounds.get(roundId);
    if (!proposal) return res.status(404).json({ error: 'round not found' });
    if (proposal.status !== 'open') return res.status(400).json({ error: 'round closed' });
    proposal.votes[pubkey] = { ts: ts, choice: choice || 'accept' };
    // determine quorum
    const registrySize = allowedPubkeys.size > 0 ? allowedPubkeys.size : AGG_COUNT;
    const quorum = Number(process.env.VOTE_QUORUM || Math.max(1, Math.floor(registrySize * 0.66)));
    // persist vote
    rounds.set(roundId, proposal);
    await persistRounds();
    // check finalize
    const votesCount = Object.keys(proposal.votes).length;
    if (votesCount >= quorum) {
      // finalize: apply model
      model = proposal.model;
      const meta = { hash: crypto.createHash('sha256').update(JSON.stringify(model)).digest('hex'), ts: new Date().toISOString(), round: roundId, proposer: proposal.proposer, votes: proposal.votes };
      // sign meta with aggregator key when available
      try {
        const sig = signMeta(meta);
        meta.aggregator = { pubkey: aggPubkeyB64, sig };
      } catch (e) {
        console.warn('aggregator signing failed:', e?.message || e);
      }
      let commitInfo = null;
      try {
        commitInfo = await emitOnchainCommitment(meta);
      } catch (e) {
        return res.status(502).json({ error: 'on-chain commitment failed', detail: e?.message || e });
      }
      if (commitInfo && commitInfo.onchain) meta.onchain = commitInfo.onchain;

      await fs.mkdir(MODEL_DIR, { recursive: true });
      await fs.writeFile(META_FILE, JSON.stringify(meta, null, 2), 'utf8');
      await fs.writeFile(MODEL_FILE, JSON.stringify(model, null, 2), 'utf8');
      proposal.status = 'finalized';
      proposal.finalized = { ts: Date.now(), meta };
      rounds.set(roundId, proposal);
      await persistRounds();
      updatesAggregated.inc();
      lastAggregationTs.set(Date.now());
    }
    return res.json({ ok: true, votes: Object.keys(proposal.votes).length });
  });

  app.get('/rounds/:id', (req, res) => {
    const id = req.params.id;
    const proposal = rounds.get(id);
    if (!proposal) return res.status(404).json({ error: 'round not found' });
    return res.json({ ok: true, round: proposal });
  });

  // Registry management (protected)
  app.post('/register', async (req, res) => {
    if (!AGG_TOKEN) return res.status(403).json({ error: 'registration disabled' });
    const auth = (req.headers.authorization || '').trim();
    if (!auth.startsWith('Bearer ') || auth.split(' ')[1] !== AGG_TOKEN) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    const { pubkey } = req.body || {};
    if (!pubkey) return res.status(400).json({ error: 'pubkey required' });
    if (PUBKEY_REGISTRY_OBJ) return res.status(403).json({ error: 'registration disabled when on-chain registry configured' });
    allowedPubkeys.add(pubkey);
    await saveRegistry();
    return res.json({ ok: true, registered: pubkey });
  });

  app.get('/model', (req, res) => {
    res.json({ model });
  });

  app.get('/health', (req, res) => res.json({ status: 'ok', buffered: updates.length }));

  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });

  // By default aggregator listens on HTTP internally. Enable HTTPS only when
  // AGG_USE_TLS=1 is explicitly set (production edge case).
  const AGG_USE_TLS = process.env.AGG_USE_TLS === '1';
  const TLS_CERT = process.env.TLS_CERT || '/certs/server.crt.pem';
  const TLS_KEY = process.env.TLS_KEY || '/certs/server.key.pem';
  if (AGG_USE_TLS) {
    try {
      const cert = await fs.readFile(TLS_CERT);
      const key = await fs.readFile(TLS_KEY);
      const server = https.createServer({ cert, key }, app);
      server.listen(PORT, '0.0.0.0', () => {
        console.log(`Aggregator listening on https://0.0.0.0:${PORT}`);
        console.log(`Model directory: ${MODEL_DIR}`);
      });
      return;
    } catch (e) {
      console.warn('AGG_USE_TLS enabled but failed to load certs; falling back to HTTP', e?.message || e);
    }
  }
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Aggregator listening on http://0.0.0.0:${PORT}`);
    console.log(`Model directory: ${MODEL_DIR}`);
  });
}

if (require.main === module) {
  run().catch((e) => {
    console.error('Aggregator failed to start:', e?.message || e);
    process.exit(1);
  });
}

module.exports = {
  aggregateUpdates,
  trimmedMean,
  simpleMultiKrum,
  reputationWeightedMultiKrum,
  euclideanDistance,
  squaredEuclideanDistance,
  verifySignature,
};
