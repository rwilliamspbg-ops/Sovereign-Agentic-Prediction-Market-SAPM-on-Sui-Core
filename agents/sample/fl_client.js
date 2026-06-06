// SPDX-License-Identifier: Apache-2.0
const crypto = require('crypto');
const nacl = require('tweetnacl');
const util = require('tweetnacl-util');

async function computeLocalUpdate(model) {
  // Simple placeholder: produce a small random delta for each weight
  if (!Array.isArray(model)) model = Array.from({ length: 10 }, () => 0);
  const update = model.map((v) => v + (Math.random() - 0.5) * 0.02);
  return update;
}

async function aggregateUpdates(updates) {
  // Average all updates elementwise
  if (!updates || updates.length === 0) return null;
  const len = updates[0].length;
  const out = new Array(len).fill(0);
  for (const u of updates) {
    for (let i = 0; i < len; i++) out[i] += u[i];
  }
  return out.map((v) => v / updates.length);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildSignedPayload(update, signKey, pubkeyB64) {
  const ts = Date.now();
  const nonce = (typeof crypto.randomUUID === 'function')
    ? crypto.randomUUID()
    : (Math.random().toString(36).slice(2) + Date.now().toString(36));
  const base = { update, ts, nonce };
  const msg = util.decodeUTF8(JSON.stringify(base));
  const sig = nacl.sign.detached(msg, signKey.secretKey);
  return {
    ...base,
    pubkey: pubkeyB64,
    sig: util.encodeBase64(Buffer.from(sig)),
  };
}

async function sendUpdate(aggregatorUrl, payload) {
  if (!aggregatorUrl) return null;
  const maxRetries = Number(process.env.FL_SEND_MAX_RETRIES || 3);
  const baseDelayMs = Number(process.env.FL_SEND_RETRY_MS || 300);
  let lastErr = null;
  try {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const headers = { 'content-type': 'application/json' };
        if (process.env.AGG_TOKEN) headers.Authorization = `Bearer ${process.env.AGG_TOKEN}`;
        const res = await fetch(`${aggregatorUrl.replace(/\/$/, '')}/updates`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        const body = await res.text();
        if (res.ok) return { ok: true, status: res.status, body };
        lastErr = new Error(`HTTP ${res.status}: ${body}`);
      } catch (e) {
        lastErr = e;
      }

      if (attempt < maxRetries) {
        const jitter = Math.floor(Math.random() * 50);
        const backoff = baseDelayMs * (2 ** attempt) + jitter;
        await sleep(backoff);
      }
    }
    return { ok: false, error: (lastErr && lastErr.message) || 'send failed' };
  } catch (e) {
    console.error('Failed to send update to aggregator:', e.message || e);
    return { ok: false, error: e.message || String(e) };
  }
}

function modelHash(model) {
  return crypto.createHash('sha256').update(JSON.stringify(model)).digest('hex');
}

module.exports = {
  computeLocalUpdate,
  aggregateUpdates,
  sendUpdate,
  modelHash,
  buildSignedPayload,
};
