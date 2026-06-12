// SPDX-License-Identifier: Apache-2.0

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function writeSummary(filePath, overrides = {}) {
  const summary = {
    generatedAt: new Date().toISOString(),
    chaos: {
      reportPresent: true,
      passed: true,
      totalScenarios: 3,
      failedScenarios: [],
    },
    load: {
      reportPresent: true,
      requests: 100,
      concurrency: 10,
      successRate: '100.00',
      rps: '100.00',
      avgLatencyMs: '8.10',
      p99LatencyMs: '38.00',
      failedRequests: 0,
    },
    soak: {
      reportPresent: true,
      passed: true,
      iterations: 5,
      failedIterations: [],
      avgSuccessRate: '100.00',
      avgRps: '100.00',
      worstP99LatencyMs: '40.00',
    },
    ...overrides,
  };

  fs.writeFileSync(filePath, JSON.stringify(summary, null, 2), 'utf8');
}

test('check_resilience_policy passes with healthy resilience summary', () => {
  const tmpDir = fs.mkdtempSync(path.join('/tmp', 'sapm-resilience-policy-pass-'));
  const summaryPath = path.join(tmpDir, 'resilience-summary.json');
  const reportPath = path.join(tmpDir, 'resilience-policy-check.json');

  writeSummary(summaryPath);

  execFileSync('node', ['scripts/check_resilience_policy.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      RESILIENCE_SUMMARY_PATH: summaryPath,
      RESILIENCE_POLICY_REPORT_PATH: reportPath,
      RESILIENCE_POLICY_GATING_MODE: 'warn-only',
    },
  });

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  assert.equal(report.mode, 'warn-only');
  assert.equal(report.passed, true);
  assert.equal(report.checks.every((c) => c.ok === true), true);
});

test('check_resilience_policy fails in enforced mode when chaos/load regress', () => {
  const tmpDir = fs.mkdtempSync(path.join('/tmp', 'sapm-resilience-policy-fail-'));
  const summaryPath = path.join(tmpDir, 'resilience-summary.json');
  const reportPath = path.join(tmpDir, 'resilience-policy-check.json');

  writeSummary(summaryPath, {
    chaos: {
      reportPresent: true,
      passed: false,
      totalScenarios: 2,
      failedScenarios: ['Network partition'],
    },
    load: {
      reportPresent: true,
      requests: 40,
      concurrency: 10,
      successRate: '80.00',
      rps: '20.00',
      avgLatencyMs: '50.00',
      p99LatencyMs: '5000.00',
      failedRequests: 8,
    },
    soak: {
      reportPresent: true,
      passed: false,
      iterations: 1,
      failedIterations: [1],
      avgSuccessRate: '80.00',
      avgRps: '15.00',
      worstP99LatencyMs: '4000.00',
    },
  });

  let threw = false;
  try {
    execFileSync('node', ['scripts/check_resilience_policy.js'], {
      cwd: path.resolve(__dirname, '..'),
      env: {
        ...process.env,
        RESILIENCE_SUMMARY_PATH: summaryPath,
        RESILIENCE_POLICY_REPORT_PATH: reportPath,
        RESILIENCE_POLICY_GATING_MODE: 'enforced',
        MIN_CHAOS_SCENARIO_COUNT: '3',
        MIN_LOAD_SUCCESS_RATE: '95',
        MAX_LOAD_P99_LATENCY_MS: '1000',
        MIN_LOAD_REQUESTS: '100',
        MIN_LOAD_RPS: '50',
        MIN_SOAK_ITERATIONS: '3',
        MIN_SOAK_SUCCESS_RATE: '95',
        MAX_SOAK_P99_LATENCY_MS: '1000',
        MIN_SOAK_RPS: '50',
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
  assert.equal(report.checks.some((c) => c.name === 'chaosPassed' && c.ok === false), true);
  assert.equal(report.checks.some((c) => c.name === 'loadSuccessRateMin' && c.ok === false), true);
  assert.equal(report.checks.some((c) => c.name === 'soakPassed' && c.ok === false), true);
  assert.equal(report.checks.some((c) => c.name === 'soakSuccessRateMin' && c.ok === false), true);
});
