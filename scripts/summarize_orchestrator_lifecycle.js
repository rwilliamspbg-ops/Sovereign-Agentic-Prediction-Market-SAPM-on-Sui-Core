#!/usr/bin/env node

'use strict';

const fs = require('fs');

function readJsonIfExists(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function asNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function asStringOrNa(value, fallback = 'n/a') {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  return String(value);
}

function main() {
  const flakePath = process.env.FLAKE_RATE_PATH || 'artifacts/ci-logs/flake-rate.json';
  const outputPath = process.env.ORCH_LIFECYCLE_SUMMARY_PATH || 'artifacts/ci-logs/orchestrator-lifecycle-summary.json';

  const flake = readJsonIfExists(flakePath);

  const summary = {
    generatedAt: new Date().toISOString(),
    reportPresent: Boolean(flake),
    flake: {
      probeRuns: asNumber(flake?.probeRuns),
      failures: asNumber(flake?.failures),
      flakeRate: asNumber(flake?.flakeRate),
      maxAllowedFlakeRate: asStringOrNa(process.env.FLAKE_RATE_MAX),
      gatingMode: process.env.FLAKE_GATING_MODE || 'warn-only',
    },
    providerLifecycle: {
      healthPreflightGate: 'enabled',
      restartBudgetEnforced: true,
      restartBudgetMax: asNumber(process.env.SAPM_HYBRID_KEX_RESTART_BUDGET_MAX) ?? 3,
      restartBudgetWindowMs: asNumber(process.env.SAPM_HYBRID_KEX_RESTART_BUDGET_WINDOW_MS) ?? 60000,
      maxRetries: asNumber(process.env.SAPM_HYBRID_KEX_MAX_RETRIES) ?? 1,
      retryBackoffMs: asNumber(process.env.SAPM_HYBRID_KEX_RETRY_BACKOFF_MS) ?? 50,
    },
  };

  fs.writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(summary, null, 2));
}

main();
