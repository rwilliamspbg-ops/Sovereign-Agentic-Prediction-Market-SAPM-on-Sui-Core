// SPDX-License-Identifier: Apache-2.0

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function writeLifecycleSummary(filePath, overrides = {}) {
  const summary = {
    generatedAt: new Date().toISOString(),
    reportPresent: true,
    flake: {
      probeRuns: 3,
      failures: 0,
      flakeRate: 0,
      maxAllowedFlakeRate: '0.0500',
      gatingMode: 'warn-only',
    },
    providerLifecycle: {
      healthPreflightGate: 'enabled',
      restartBudgetEnforced: true,
      restartBudgetMax: 3,
      restartBudgetWindowMs: 60000,
      maxRetries: 1,
      retryBackoffMs: 50,
      ...overrides,
    },
  };
  fs.writeFileSync(filePath, JSON.stringify(summary, null, 2), 'utf8');
}

test('check_orchestrator_lifecycle_policy passes with default thresholds', () => {
  const tmpDir = fs.mkdtempSync(path.join('/tmp', 'sapm-lifecycle-policy-pass-'));
  const summaryPath = path.join(tmpDir, 'orchestrator-lifecycle-summary.json');
  const reportPath = path.join(tmpDir, 'orchestrator-lifecycle-policy-check.json');

  writeLifecycleSummary(summaryPath);

  execFileSync('node', ['scripts/check_orchestrator_lifecycle_policy.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      ORCH_LIFECYCLE_SUMMARY_PATH: summaryPath,
      ORCH_LIFECYCLE_POLICY_REPORT_PATH: reportPath,
      LIFECYCLE_POLICY_GATING_MODE: 'warn-only',
    },
  });

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  assert.equal(report.mode, 'warn-only');
  assert.equal(report.passed, true);
  assert.equal(Array.isArray(report.checks), true);
  assert.equal(report.checks.every((c) => c.ok === true), true);
});

test('check_orchestrator_lifecycle_policy fails in enforced mode on threshold breach', () => {
  const tmpDir = fs.mkdtempSync(path.join('/tmp', 'sapm-lifecycle-policy-fail-'));
  const summaryPath = path.join(tmpDir, 'orchestrator-lifecycle-summary.json');
  const reportPath = path.join(tmpDir, 'orchestrator-lifecycle-policy-check.json');

  writeLifecycleSummary(summaryPath, {
    maxRetries: 99,
  });

  let threw = false;
  try {
    execFileSync('node', ['scripts/check_orchestrator_lifecycle_policy.js'], {
      cwd: path.resolve(__dirname, '..'),
      env: {
        ...process.env,
        ORCH_LIFECYCLE_SUMMARY_PATH: summaryPath,
        ORCH_LIFECYCLE_POLICY_REPORT_PATH: reportPath,
        LIFECYCLE_POLICY_GATING_MODE: 'enforced',
        LIFECYCLE_MAX_RETRIES: '5',
      },
      stdio: 'pipe',
    });
  } catch (error) {
    threw = true;
    assert.equal(error.status, 1);
  }

  assert.equal(threw, true);

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  assert.equal(report.mode, 'enforced');
  assert.equal(report.passed, false);
  const retryCheck = report.checks.find((c) => c.name === 'maxRetriesRange');
  assert.equal(Boolean(retryCheck), true);
  assert.equal(retryCheck.ok, false);
});