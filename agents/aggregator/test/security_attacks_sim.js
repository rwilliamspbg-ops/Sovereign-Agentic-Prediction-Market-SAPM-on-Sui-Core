const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const nacl = require('tweetnacl');
const util = require('tweetnacl-util');

const PORT = Number(process.env.SIM_PORT || 4200);
const BASE = `http://127.0.0.1:${PORT}`;
const MODEL_DIR = process.env.SIM_MODEL_DIR || '/tmp/sapm-agg-security-sim';

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

async function postJson(pathname, body) {
  const res = await fetch(`${BASE}${pathname}`, {
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
  const outFile = path.join(MODEL_DIR, 'security_attack_report.json');
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
      UPDATE_TTL_MS: '500',
      AGGREGATE_COUNT: '3',
      AGG_STRATEGY: 'trimmed',
    },
    stdio: 'pipe',
  });

  proc.stdout.on('data', (d) => process.stdout.write(`[agg] ${d}`));
  proc.stderr.on('data', (d) => process.stderr.write(`[agg-err] ${d}`));

  const report = {
    profile: 'security-attacks',
    timestamp: new Date().toISOString(),
    modelDir: MODEL_DIR,
    checks: {
      baselineAccept: null,
      replayRejected: null,
      staleRejected: null,
    },
  };

  try {
    await waitForHealth();
    const client = makeClient();
    const update = [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1];

    // Baseline valid signed update should pass.
    const ts = Date.now();
    const nonce = crypto.randomUUID();
    const payload = { update, ts, nonce };
    const sig = signPayload(client.kp, payload);
    const accepted = await postJson('/updates', {
      update,
      pubkey: client.pubkey,
      sig,
      ts,
      nonce,
    });
    report.checks.baselineAccept = {
      status: accepted.status,
      ok: accepted.ok,
      expected: 200,
      pass: accepted.status === 200,
    };

    // Replay attack: identical pubkey/sig/nonce must be rejected.
    const replay = await postJson('/updates', {
      update,
      pubkey: client.pubkey,
      sig,
      ts,
      nonce,
    });
    report.checks.replayRejected = {
      status: replay.status,
      ok: replay.ok,
      expected: 409,
      pass: replay.status === 409,
      body: replay.json || replay.txt,
    };

    // Stale timestamp attack: signed payload beyond TTL must be rejected.
    await sleep(700);
    const staleTs = Date.now() - 5_000;
    const staleNonce = crypto.randomUUID();
    const stalePayload = { update, ts: staleTs, nonce: staleNonce };
    const staleSig = signPayload(client.kp, stalePayload);
    const stale = await postJson('/updates', {
      update,
      pubkey: client.pubkey,
      sig: staleSig,
      ts: staleTs,
      nonce: staleNonce,
    });
    report.checks.staleRejected = {
      status: stale.status,
      ok: stale.ok,
      expected: 400,
      pass: stale.status === 400,
      body: stale.json || stale.txt,
    };

    report.pass = Object.values(report.checks).every((v) => v && v.pass);
    const out = await writeReport(report);
    console.log(`Security simulation report: ${out}`);

    if (!report.pass) {
      throw new Error('security simulation checks did not all pass');
    }

    console.log('Security simulation passed: replay and stale timestamp defenses are active');
  } finally {
    proc.kill('SIGTERM');
  }
}

run().catch(async (e) => {
  const failed = {
    profile: 'security-attacks',
    timestamp: new Date().toISOString(),
    modelDir: MODEL_DIR,
    pass: false,
    error: e?.message || String(e),
  };
  try {
    const out = await writeReport(failed);
    console.error(`Security simulation failed; report written to ${out}`);
  } catch (_) {
    // ignore file write failure and keep original error
  }
  process.exit(1);
});
