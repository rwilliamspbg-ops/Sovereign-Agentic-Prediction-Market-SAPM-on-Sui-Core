#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

tmpdir="$(mktemp -d)"
cleanup() {
  rm -rf "$tmpdir"
}
trap cleanup EXIT

cert_file="$tmpdir/cert_chain.pem"

openssl req -x509 -newkey rsa:2048 -sha256 -days 1 -nodes \
  -keyout "$tmpdir/key.pem" \
  -out "$cert_file" \
  -subj "/CN=sapm-orchestrator-hardening-check" >/dev/null 2>&1

echo "[orchestrator-hardening] generated ephemeral attestation cert"

ALLOW_MOCK_ATTESTATION=1 \
TEE_RUNTIME=simulated \
TPM_MEASUREMENT_FILE="$tmpdir/does-not-exist" \
node - "$tmpdir" <<'NODE'
const assert = require('node:assert/strict');
const path = require('path');
const { Orchestrator } = require(path.resolve('agents/orchestrator/core/orchestrator.js'));

(async () => {
  const dataDir = process.argv[2];
  const orchestrator = new Orchestrator({
    dataDir,
    aggregatorUrl: 'http://127.0.0.1:9',
    minHugepages: 0,
    requireCpuPinning: false,
    connectivityTimeoutMs: 500,
  });

  const measurement = await orchestrator.attestationClient.readTPM();
  assert.equal(typeof measurement.measurements.sha256, 'string');
  assert.ok(measurement.measurements.sha256.length > 10);

  const cert = require('fs').readFileSync(path.join(dataDir, 'cert_chain.pem'));
  const certOk = await orchestrator.attestationClient.verifyCertChain(cert);
  assert.equal(certOk, true);

  const reachable = await orchestrator.networkHandler.isReachable('http://127.0.0.1:9');
  assert.equal(typeof reachable, 'boolean');

  const hugepages = orchestrator.networkHandler._checkHugepages();
  const cpuPinning = orchestrator.networkHandler._checkCPUPinning();
  assert.equal(typeof hugepages, 'boolean');
  assert.equal(typeof cpuPinning, 'boolean');

  console.log('[orchestrator-hardening] PASS: attestation, cert validation, connectivity, and runtime checks executed');
})().catch((err) => {
  console.error('[orchestrator-hardening] FAIL:', err && err.stack ? err.stack : err);
  process.exit(1);
});
NODE
