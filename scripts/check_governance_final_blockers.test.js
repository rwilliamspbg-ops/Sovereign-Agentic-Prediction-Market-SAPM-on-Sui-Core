// SPDX-License-Identifier: Apache-2.0

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

test('check_pentest_evidence passes with compliant report', () => {
  const tmpDir = fs.mkdtempSync(path.join('/tmp', 'sapm-pentest-pass-'));
  const reportPath = path.join(tmpDir, 'pentest-evidence.json');
  const outputPath = path.join(tmpDir, 'pentest-check.json');

  fs.writeFileSync(reportPath, JSON.stringify({
    vendor: 'Acme Security Labs',
    completedAt: new Date().toISOString(),
    openCritical: 0,
    openHigh: 0,
    highRiskAcceptanceApproved: false,
    scope: ['production perimeter', 'api'],
  }, null, 2));

  execFileSync('node', ['scripts/check_pentest_evidence.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, PENTEST_REPORT_PATH: reportPath, PENTEST_CHECK_OUTPUT_PATH: outputPath, PENTEST_GATING_MODE: 'enforced' },
  });

  const out = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  assert.equal(out.passed, true);
});

test('check_go_nogo_signoff fails when required approvals missing', () => {
  const tmpDir = fs.mkdtempSync(path.join('/tmp', 'sapm-gonogo-fail-'));
  const signoffPath = path.join(tmpDir, 'go-no-go-signoff.json');
  const outputPath = path.join(tmpDir, 'go-no-go-check.json');

  fs.writeFileSync(signoffPath, JSON.stringify({
    finalDecision: 'Go',
    meetingDate: '2026-09-13',
    releaseCandidate: 'rc-2026-09-13.1',
    approvals: [{ role: 'engineering', approved: true }],
  }, null, 2));

  let threw = false;
  try {
    execFileSync('node', ['scripts/check_go_nogo_signoff.js'], {
      cwd: path.resolve(__dirname, '..'),
      env: { ...process.env, GONOGO_SIGNOFF_PATH: signoffPath, GONOGO_CHECK_OUTPUT_PATH: outputPath, GONOGO_GATING_MODE: 'enforced' },
      stdio: 'pipe',
    });
  } catch (err) {
    threw = true;
    assert.equal(err.status, 1);
  }

  assert.equal(threw, true);
  const out = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  assert.equal(out.passed, false);
  assert.equal(out.checks.some((c) => c.name === 'requiredApprovalsPresent' && c.ok === false), true);
});
