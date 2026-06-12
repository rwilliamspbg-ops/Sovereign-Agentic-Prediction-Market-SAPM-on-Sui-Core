// SPDX-License-Identifier: Apache-2.0

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function makeGhStub(tmpDir, scenario) {
  const ghPath = path.join(tmpDir, 'gh');
  const script = `#!/usr/bin/env node
const scenario = process.env.GH_STUB_SCENARIO || 'pass';
const args = process.argv.slice(2);
if (args[0] !== 'api') process.exit(2);
const endpoint = args[1] || '';
const pass = {
  branches: { protected: true },
  protection: { required_status_checks: { checks: [
    { context: 'release-check' },
    { context: 'frontend-prod-gate' },
    { context: 'orchestrator-tests' },
    { context: 'resilience-tests' }
  ] } },
  rulesets: [{
    conditions: { ref_name: { include: ['refs/heads/main'] } },
    rules: [{ type: 'required_signatures' }]
  }]
};
const fail = {
  branches: { protected: false },
  protection: { required_status_checks: { checks: [{ context: 'release-check' }] } },
  rulesets: []
};
const data = scenario === 'pass' ? pass : fail;
if (endpoint.includes('/branches/main/protection')) {
  process.stdout.write(JSON.stringify(data.protection));
  process.exit(0);
}
if (endpoint.includes('/branches/main')) {
  process.stdout.write(JSON.stringify(data.branches));
  process.exit(0);
}
if (endpoint.includes('/rulesets')) {
  process.stdout.write(JSON.stringify(data.rulesets));
  process.exit(0);
}
process.exit(3);
`;
  fs.writeFileSync(ghPath, script, { encoding: 'utf8' });
  fs.chmodSync(ghPath, 0o755);
  return ghPath;
}

test('check_github_governance_policy passes with protected branch, required checks, and signed commits', () => {
  const tmpDir = fs.mkdtempSync(path.join('/tmp', 'sapm-governance-pass-'));
  makeGhStub(tmpDir, 'pass');

  const reportPath = path.join(tmpDir, 'governance-policy-check.json');

  execFileSync('node', ['scripts/check_github_governance_policy.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      PATH: `${tmpDir}:${process.env.PATH}`,
      GH_STUB_SCENARIO: 'pass',
      GITHUB_REPOSITORY: 'owner/repo',
      GOVERNANCE_POLICY_REPORT_PATH: reportPath,
      GOVERNANCE_POLICY_GATING_MODE: 'warn-only',
    },
  });

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  assert.equal(report.passed, true);
  assert.equal(report.checks.every((c) => c.ok === true), true);
});

test('check_github_governance_policy fails in enforced mode when protections are missing', () => {
  const tmpDir = fs.mkdtempSync(path.join('/tmp', 'sapm-governance-fail-'));
  makeGhStub(tmpDir, 'fail');

  const reportPath = path.join(tmpDir, 'governance-policy-check.json');

  let threw = false;
  try {
    execFileSync('node', ['scripts/check_github_governance_policy.js'], {
      cwd: path.resolve(__dirname, '..'),
      env: {
        ...process.env,
        PATH: `${tmpDir}:${process.env.PATH}`,
        GH_STUB_SCENARIO: 'fail',
        GITHUB_REPOSITORY: 'owner/repo',
        GOVERNANCE_POLICY_REPORT_PATH: reportPath,
        GOVERNANCE_POLICY_GATING_MODE: 'enforced',
      },
      stdio: 'pipe',
    });
  } catch (error) {
    threw = true;
    assert.equal(error.status, 1);
  }

  assert.equal(threw, true);
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  assert.equal(report.passed, false);
  assert.equal(report.checks.some((c) => c.name === 'branchProtectionEnabled' && c.ok === false), true);
  assert.equal(report.checks.some((c) => c.name === 'signedCommitsRequired' && c.ok === false), true);
});
