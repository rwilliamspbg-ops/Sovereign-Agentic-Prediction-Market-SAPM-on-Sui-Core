const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const nacl = require('tweetnacl');
const util = require('tweetnacl-util');

const PORT = Number(process.env.SIM_PORT || 4100);
const BASE = `http://127.0.0.1:${PORT}`;
const MODEL_DIR = process.env.SIM_MODEL_DIR || '/tmp/sapm-agg-sim';

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

async function postJson(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const txt = await res.text();
  let json = null;
  try { json = JSON.parse(txt); } catch (e) {}
  return { ok: res.ok, status: res.status, json, txt };
}

async function writeReport(report) {
  await fs.mkdir(MODEL_DIR, { recursive: true });
  const outFile = path.join(MODEL_DIR, 'byzantine_report.json');
  await fs.writeFile(outFile, JSON.stringify(report, null, 2), 'utf8');
  return outFile;
}

async function run() {
  const proc = spawn('node', ['server.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(PORT),
      AGGREGATE_COUNT: '5',
      AGG_STRATEGY: 'trimmed',
      MODEL_DIR: process.env.SIM_MODEL_DIR || '/tmp/sapm-agg-sim',
      VOTE_QUORUM: '3',
    },
    stdio: 'pipe',
  });

  proc.stdout.on('data', (d) => process.stdout.write(`[agg] ${d}`));
  proc.stderr.on('data', (d) => process.stderr.write(`[agg-err] ${d}`));

  const report = {
    profile: 'byzantine-outlier',
    timestamp: new Date().toISOString(),
    modelDir: MODEL_DIR,
    checks: {
      roundFinalized: null,
      modelShapeValid: null,
      robustAgainstOutlier: null,
    },
  };

  try {
    await waitForHealth();

    const clients = [makeClient(), makeClient(), makeClient(), makeClient()];
    const byzantine = makeClient();

    // 4 honest updates clustered around ~0.5, 1 malicious outlier
    const honestUpdates = [
      [0.50, 0.52, 0.49, 0.51, 0.50, 0.50, 0.49, 0.51, 0.50, 0.52],
      [0.51, 0.53, 0.50, 0.52, 0.49, 0.50, 0.50, 0.52, 0.49, 0.51],
      [0.49, 0.51, 0.48, 0.50, 0.51, 0.49, 0.50, 0.50, 0.52, 0.50],
      [0.50, 0.52, 0.51, 0.49, 0.50, 0.51, 0.50, 0.49, 0.50, 0.51],
    ];
    const badUpdate = [100, 100, 100, -100, -100, 100, -100, 100, -100, 100];

    let roundId = null;

    for (let i = 0; i < clients.length; i++) {
      const c = clients[i];
      const update = honestUpdates[i];
      const ts = Date.now();
      const nonce = crypto.randomUUID();
      const signedPayload = { update, ts, nonce };
      const sig = signPayload(c.kp, signedPayload);
      const res = await postJson('/updates', { update, pubkey: c.pubkey, sig, ts, nonce });
      if (!res.ok) throw new Error(`honest update failed ${res.status}: ${res.txt}`);
      if (res.json && res.json.round) roundId = res.json.round;
    }

    {
      const ts = Date.now();
      const nonce = crypto.randomUUID();
      const signedPayload = { update: badUpdate, ts, nonce };
      const sig = signPayload(byzantine.kp, signedPayload);
      const res = await postJson('/updates', { update: badUpdate, pubkey: byzantine.pubkey, sig, ts, nonce });
      if (!res.ok) throw new Error(`byzantine update send failed ${res.status}: ${res.txt}`);
      if (res.json && res.json.round) roundId = res.json.round;
    }

    if (!roundId) throw new Error('expected round id after threshold updates');

    // Vote with 3 honest clients to finalize
    for (let i = 0; i < 3; i++) {
      const c = clients[i];
      const ts = Date.now();
      const nonce = crypto.randomUUID();
      const votePayload = { roundId, choice: 'accept', ts, nonce };
      const sig = signPayload(c.kp, votePayload);
      const res = await postJson('/vote', { roundId, choice: 'accept', pubkey: c.pubkey, sig, ts, nonce });
      if (!res.ok) throw new Error(`vote failed ${res.status}: ${res.txt}`);
    }

    const roundRes = await fetch(`${BASE}/rounds/${roundId}`);
    if (!roundRes.ok) throw new Error('round fetch failed');
    const round = await roundRes.json();
    report.checks.roundFinalized = {
      expected: 'finalized',
      actual: round.round.status,
      pass: round.round.status === 'finalized',
    };
    if (!report.checks.roundFinalized.pass) throw new Error('round was not finalized');

    const modelRes = await fetch(`${BASE}/model`);
    if (!modelRes.ok) throw new Error('model fetch failed');
    const modelBody = await modelRes.json();
    const model = modelBody.model;
    report.checks.modelShapeValid = {
      expectedLength: 10,
      actualLength: Array.isArray(model) ? model.length : null,
      pass: Array.isArray(model) && model.length === 10,
    };
    if (!report.checks.modelShapeValid.pass) throw new Error('invalid model shape');

    // Robust strategy should keep model near honest cluster, far from extreme values.
    const maxAbs = Math.max(...model.map((x) => Math.abs(x)));
    report.checks.robustAgainstOutlier = {
      expectedMaxAbs: '<= 5',
      actualMaxAbs: maxAbs,
      pass: maxAbs <= 5,
    };
    if (!report.checks.robustAgainstOutlier.pass) throw new Error(`model appears poisoned by Byzantine update: maxAbs=${maxAbs}`);

    report.pass = Object.values(report.checks).every((v) => v && v.pass);
    const out = await writeReport(report);
    console.log(`Byzantine simulation report: ${out}`);

    console.log('Simulation passed: finalized model resisted Byzantine outlier');
  } finally {
    proc.kill('SIGTERM');
  }
}

run().catch(async (e) => {
  const failed = {
    profile: 'byzantine-outlier',
    timestamp: new Date().toISOString(),
    modelDir: MODEL_DIR,
    pass: false,
    error: e?.message || String(e),
  };
  try {
    const out = await writeReport(failed);
    console.error(`Simulation failed; report written to ${out}`);
  } catch (_) {
    // ignore
  }
  process.exit(1);
});
