// SPDX-License-Identifier: Apache-2.0
const { SuiClient } = require('@mysten/sui/client');
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const fl = require('./fl_client');
const store = require('./model_store');
const nacl = require('tweetnacl');
const util = require('tweetnacl-util');

async function requestSimpleRpcVersion(client) {
  try {
    const info = await client.request({ method: 'sui_getProtocolVersion', params: [] });
    return info;
  } catch {
    return null;
  }
}

function deriveSignKeypairFromSuiKeypair(keypair) {
  // Sui Ed25519 secret key material may include public bytes; seed is first 32 bytes.
  const raw = Buffer.from(keypair.keypair.secretKey);
  if (!raw || raw.length < 32) throw new Error('invalid Sui keypair secret material');
  const seed = raw.subarray(0, 32);
  return nacl.sign.keyPair.fromSeed(new Uint8Array(seed));
}

async function start({ rpc, faucetUrl, aggregatorUrl }) {
  console.log('Phase 1 agent runtime starting');
  const client = new SuiClient({ url: rpc });
  const keypair = new Ed25519Keypair();
  const sender = keypair.toSuiAddress();
  console.log('Agent ephemeral address:', sender);

  // Basic connectivity check
  const ver = await requestSimpleRpcVersion(client);
  console.log('Sui RPC protocol version (probe):', ver || 'unavailable');

  // Load or initialize model
  let model = await store.loadModel();
  console.log('Loaded model length:', model.length);

  // Local in-memory aggregation buffer (Phase 1 simple aggregator)
  const updatesBuffer = [];

  // Derive FL signing key from the agent's Sui Ed25519 keypair seed
  // Sui Ed25519Keypair exposes a 32-byte secretKey seed at `keypair.secretKey`
  const signKey = deriveSignKeypairFromSuiKeypair(keypair);
  const pubkeyB64 = util.encodeBase64(Buffer.from(signKey.publicKey));

  // Attempt to register this agent pubkey with aggregator if token is provided
  try {
    const token = process.env.AGG_TOKEN;
    if (aggregatorUrl && token) {
      await fetch(`${aggregatorUrl.replace(/\/$/, '')}/register`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pubkey: pubkeyB64 }),
      });
      console.log('Attempted pubkey registration with aggregator');
    }
  } catch (e) {
    console.warn('Pubkey registration attempt failed:', e?.message || e);
  }

  // Periodic training/aggregation loop
  setInterval(async () => {
    try {
      // compute local update
      const update = await fl.computeLocalUpdate(model);
      console.log('Computed local update sample:', update.slice(0, 3));

      // If we have an external aggregator, send signed payload; otherwise buffer locally
      if (aggregatorUrl) {
        const payload = fl.buildSignedPayload(update, signKey, pubkeyB64);
        const sendRes = await fl.sendUpdate(aggregatorUrl, payload);
        console.log('Sent signed update to aggregator:', sendRes.ok, sendRes.status || sendRes.error || '');
        // If upstream aggregator is unavailable, keep local fallback progress.
        if (!sendRes.ok) {
          updatesBuffer.push(update);
          if (updatesBuffer.length >= 3) {
            const agg = await fl.aggregateUpdates(updatesBuffer);
            model = agg;
            await store.saveModel(model);
            const meta = await store.commitModel(model);
            console.log('Fallback local aggregate applied after send failures; meta:', meta);
            updatesBuffer.length = 0;
          }
        }
      } else {
        updatesBuffer.push(update);
        // once buffer grows, aggregate and apply
        if (updatesBuffer.length >= 3) {
          const agg = await fl.aggregateUpdates(updatesBuffer);
          // simple model replace for Phase 1
          model = agg;
          await store.saveModel(model);
          const meta = await store.commitModel(model);
          console.log('Applied local aggregated model; meta:', meta);
          updatesBuffer.length = 0;
        }
      }
    } catch (e) {
      console.error('Round failed:', e?.message || e);
    }
  }, 10_000);

  // Expose a minimal health hook via stdout polling (container will show logs)
  console.log('Agent runtime started; performing Phase 1 periodic FL rounds every 10s');

  // keep process alive
  return new Promise(() => {});
}

module.exports = { start };
