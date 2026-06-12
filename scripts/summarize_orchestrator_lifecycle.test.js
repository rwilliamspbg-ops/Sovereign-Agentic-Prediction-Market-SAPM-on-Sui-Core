// SPDX-License-Identifier: Apache-2.0

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

test('summarize_orchestrator_lifecycle emits lifecycle summary using flake report and defaults', () => {
  const tmpDir = fs.mkdtempSync(path.join('/tmp', 'sapm-lifecycle-summary-'));
  const flakePath = path.join(tmpDir, 'flake-rate.json');
  const outputPath = path.join(tmpDir, 'orchestrator-lifecycle-summary.json');

  fs.writeFileSync(
    flakePath,
    JSON.stringify({ probeRuns: 3, failures: 1, flakeRate: 0.3333 }, null, 2),
    'utf8',
  );

  execFileSync('node', ['scripts/summarize_orchestrator_lifecycle.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      FLAKE_RATE_PATH: flakePath,
      ORCH_LIFECYCLE_SUMMARY_PATH: outputPath,
      FLAKE_RATE_MAX: '0.0500',
      FLAKE_GATING_MODE: 'enforced',
      SAPM_HYBRID_KEX_RESTART_BUDGET_MAX: '2',
      SAPM_HYBRID_KEX_RESTART_BUDGET_WINDOW_MS: '30000',
      SAPM_HYBRID_KEX_MAX_RETRIES: '4',
      SAPM_HYBRID_KEX_RETRY_BACKOFF_MS: '10',
    },
  });

  const summary = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  assert.equal(summary.reportPresent, true);
  assert.equal(summary.flake.probeRuns, 3);
  assert.equal(summary.flake.failures, 1);
  assert.equal(summary.flake.flakeRate, 0.3333);
  assert.equal(summary.flake.gatingMode, 'enforced');
  assert.equal(summary.providerLifecycle.healthPreflightGate, 'enabled');
  assert.equal(summary.providerLifecycle.restartBudgetEnforced, true);
  assert.equal(summary.providerLifecycle.restartBudgetMax, 2);
  assert.equal(summary.providerLifecycle.restartBudgetWindowMs, 30000);
  assert.equal(summary.providerLifecycle.maxRetries, 4);
  assert.equal(summary.providerLifecycle.retryBackoffMs, 10);
});
