#!/usr/bin/env node

'use strict';

const fs = require('fs');

function asNumber(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeMode(value) {
  return value === 'enforced' ? 'enforced' : 'warn-only';
}

function main() {
  const summaryPath = process.env.ORCH_LIFECYCLE_SUMMARY_PATH || 'artifacts/ci-logs/orchestrator-lifecycle-summary.json';
  const mode = normalizeMode(process.env.LIFECYCLE_POLICY_GATING_MODE);

  if (!fs.existsSync(summaryPath)) {
    console.error(`Missing lifecycle summary at ${summaryPath}`);
    process.exit(1);
  }

  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  const lifecycle = summary.providerLifecycle || {};

  const policy = {
    expectedPreflightGate: process.env.EXPECTED_LIFECYCLE_PREFLIGHT_GATE || 'enabled',
    expectedRestartBudgetEnforced: (process.env.EXPECTED_LIFECYCLE_RESTART_ENFORCED || 'true') === 'true',
    minRestartBudgetMax: asNumber(process.env.LIFECYCLE_MIN_RESTART_BUDGET_MAX, 1),
    maxRestartBudgetMax: asNumber(process.env.LIFECYCLE_MAX_RESTART_BUDGET_MAX, 10),
    minRestartBudgetWindowMs: asNumber(process.env.LIFECYCLE_MIN_RESTART_WINDOW_MS, 1000),
    maxRestartBudgetWindowMs: asNumber(process.env.LIFECYCLE_MAX_RESTART_WINDOW_MS, 300000),
    minRetries: asNumber(process.env.LIFECYCLE_MIN_RETRIES, 0),
    maxRetries: asNumber(process.env.LIFECYCLE_MAX_RETRIES, 5),
    minRetryBackoffMs: asNumber(process.env.LIFECYCLE_MIN_RETRY_BACKOFF_MS, 0),
    maxRetryBackoffMs: asNumber(process.env.LIFECYCLE_MAX_RETRY_BACKOFF_MS, 1000),
  };

  const checks = [
    {
      name: 'healthPreflightGate',
      ok: String(lifecycle.healthPreflightGate) === String(policy.expectedPreflightGate),
      actual: lifecycle.healthPreflightGate,
      expected: policy.expectedPreflightGate,
    },
    {
      name: 'restartBudgetEnforced',
      ok: Boolean(lifecycle.restartBudgetEnforced) === policy.expectedRestartBudgetEnforced,
      actual: lifecycle.restartBudgetEnforced,
      expected: policy.expectedRestartBudgetEnforced,
    },
    {
      name: 'restartBudgetMaxRange',
      ok:
        Number.isFinite(Number(lifecycle.restartBudgetMax)) &&
        Number(lifecycle.restartBudgetMax) >= policy.minRestartBudgetMax &&
        Number(lifecycle.restartBudgetMax) <= policy.maxRestartBudgetMax,
      actual: lifecycle.restartBudgetMax,
      expected: `[${policy.minRestartBudgetMax}, ${policy.maxRestartBudgetMax}]`,
    },
    {
      name: 'restartBudgetWindowMsRange',
      ok:
        Number.isFinite(Number(lifecycle.restartBudgetWindowMs)) &&
        Number(lifecycle.restartBudgetWindowMs) >= policy.minRestartBudgetWindowMs &&
        Number(lifecycle.restartBudgetWindowMs) <= policy.maxRestartBudgetWindowMs,
      actual: lifecycle.restartBudgetWindowMs,
      expected: `[${policy.minRestartBudgetWindowMs}, ${policy.maxRestartBudgetWindowMs}]`,
    },
    {
      name: 'maxRetriesRange',
      ok:
        Number.isFinite(Number(lifecycle.maxRetries)) &&
        Number(lifecycle.maxRetries) >= policy.minRetries &&
        Number(lifecycle.maxRetries) <= policy.maxRetries,
      actual: lifecycle.maxRetries,
      expected: `[${policy.minRetries}, ${policy.maxRetries}]`,
    },
    {
      name: 'retryBackoffMsRange',
      ok:
        Number.isFinite(Number(lifecycle.retryBackoffMs)) &&
        Number(lifecycle.retryBackoffMs) >= policy.minRetryBackoffMs &&
        Number(lifecycle.retryBackoffMs) <= policy.maxRetryBackoffMs,
      actual: lifecycle.retryBackoffMs,
      expected: `[${policy.minRetryBackoffMs}, ${policy.maxRetryBackoffMs}]`,
    },
  ];

  const failures = checks.filter((check) => !check.ok);
  const result = {
    generatedAt: new Date().toISOString(),
    mode,
    policy,
    checks,
    passed: failures.length === 0,
  };

  const outputPath = process.env.ORCH_LIFECYCLE_POLICY_REPORT_PATH || 'artifacts/ci-logs/orchestrator-lifecycle-policy-check.json';
  fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

  if (result.passed) {
    console.log('Lifecycle policy checks passed');
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const detail = failures
    .map((f) => `${f.name}: expected=${f.expected}, actual=${f.actual}`)
    .join('; ');

  if (mode === 'enforced') {
    console.error(`Lifecycle policy check failed (enforced): ${detail}`);
    console.error(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  console.warn(`Lifecycle policy check warnings (warn-only): ${detail}`);
  console.warn(JSON.stringify(result, null, 2));
}

main();