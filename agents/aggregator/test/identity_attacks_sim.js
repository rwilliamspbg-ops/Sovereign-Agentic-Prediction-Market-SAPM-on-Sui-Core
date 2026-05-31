const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const nacl = require('tweetnacl');
const util = require('tweetnacl-util');

const PORT = Number(process.env.SIM_PORT || 4300);
const BASE = `http://127.0.0.1:${PORT}`;
const MODEL_DIR = process.env.SIM_MODEL_DIR || '/tmp/sapm-agg-identity-sim';
const AGG_TOKEN = process.env.SIM_AGG_TOKEN || 'sim-token';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeClient() {
  const kp = nacl.sign.keyPair();
  return {
    kp,
    pubkey: util.encodeBase64(Buffer.from(kp.publicKey)),
  };
}

function signPayload(kp, payload) {
  const msg = util.decodeUTF8(JSON.stringify(payload));
  const sig = nacl.sign.detached(msg, kp.secretKey);
  return util.encodeBase64(Buffer.from(sig));
}

async function waitForHealth(timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) return;
    } catch (e) {
      // retry
    }
    await sleep(250);
  }
  throw new Error('aggregator did not become healthy');
}

async function postJson(pathname, body, headers = {}) {
  const res = await fetch(`${BASE}${pathname}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${AGG_TOKEN}`, ...headers },
    body: JSON.stringify(body),
  });
  const txt = await res.text();
  let json = null;
  try { json = JSON.parse(txt); } catch (e) {}
  return { ok: res.ok, status: res.status, json, txt };
}

async function writeReport(report) {
  await fs.mkdir(MODEL_DIR, { recursive: true });
  const outFile = path.join(MODEL_DIR, 'identity_attack_report.json');
  await fs.writeFile(outFile, JSON.stringify(report, null, 2), 'utf8');
  return outFile;
}

async function run() {
  const proc = spawn('node', ['server.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(PORT),
      MODEL_DIR,
      AGGREGATE_COUNT: '3',
      AGG_STRATEGY: 'trimmed',
      AGG_TOKEN,
    },
    stdio: 'pipe',
  });

  proc.stdout.on('data', (d) => process.stdout.write(`[agg] ${d}`));
  proc.stderr.on('data', (d) => process.stderr.write(`[agg-err] ${d}`));

  const report = {
    profile: 'identity-attacks',
    timestamp: new Date().toISOString(),
    modelDir: MODEL_DIR,
    checks: {
      registerKnownPubkey: null,
      baselineAccept: null,
      unknownPubkeyRejected: null,
      invalidSignatureRejected: null,
    },
  };

  try {
    await waitForHealth();

    const known = makeClient();
    const unknown = makeClient();
    const update = [0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2];

    const reg = await postJson('/register', { pubkey: known.pubkey }, { Authorization: `Bearer ${AGG_TOKEN}` });
    report.checks.registerKnownPubkey = {
      status: reg.status,
      ok: reg.ok,
      expected: 200,
      pass: reg.status === 200,
      body: reg.json || reg.txt,
    };

    const ts1 = Date.now();
    const nonce1 = crypto.randomUUID();
    const p1 = { update, ts: ts1, nonce: nonce1 };
    const sig1 = signPayload(known.kp, p1);
    const baseline = await postJson('/updates', {
      update,
      pubkey: known.pubkey,
      sig: sig1,
      ts: ts1,
      nonce: nonce1,
    });
    report.checks.baselineAccept = {
      status: baseline.status,
      ok: baseline.ok,
      expected: 200,
      pass: baseline.status === 200,
      body: baseline.json || baseline.txt,
    };

    const ts2 = Date.now();
    const nonce2 = crypto.randomUUID();
    const p2 = { update, ts: ts2, nonce: nonce2 };
    const sig2 = signPayload(unknown.kp, p2);
    const unknownRes = await postJson('/updates', {
      update,
      pubkey: unknown.pubkey,
      sig: sig2,
      ts: ts2,
      nonce: nonce2,
    });
    report.checks.unknownPubkeyRejected = {
      status: unknownRes.status,
      ok: unknownRes.ok,
      expected: 403,
      pass: unknownRes.status === 403,
      body: unknownRes.json || unknownRes.txt,
    };

    const ts3 = Date.now();
    const nonce3 = crypto.randomUUID();
    const p3 = { update, ts: ts3, nonce: nonce3 };
    const badSig = signPayload(unknown.kp, p3);
    const invalidSig = await postJson('/updates', {
      update,
      pubkey: known.pubkey,
      sig: badSig,
      ts: ts3,
      nonce: nonce3,
    });
    report.checks.invalidSignatureRejected = {
      status: invalidSig.status,
      ok: invalidSig.ok,
      expected: 401,
      pass: invalidSig.status === 401,
      body: invalidSig.json || invalidSig.txt,
    };

    report.pass = Object.values(report.checks).every((v) => v && v.pass);
    const out = await writeReport(report);
    console.log(`Identity simulation report: ${out}`);

    if (!report.pass) {
      throw new Error('identity simulation checks did not all pass');
    }

    console.log('Identity simulation passed: unknown pubkeys and invalid signatures are rejected');
  } finally {
    proc.kill('SIGTERM');
  }
}

run().catch(async (e) => {
  const failed = {
    profile: 'identity-attacks',
    timestamp: new Date().toISOString(),
    modelDir: MODEL_DIR,
    pass: false,
    error: e?.message || String(e),
  };
  try {
    const out = await writeReport(failed);
    console.error(`Identity simulation failed; report written to ${out}`);
  } catch (_) {
    // ignore
  }
  process.exit(1);
});
