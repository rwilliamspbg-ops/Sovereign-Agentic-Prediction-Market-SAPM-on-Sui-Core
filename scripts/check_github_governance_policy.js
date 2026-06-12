#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function normalizeMode(value) {
  return value === 'enforced' ? 'enforced' : 'warn-only';
}

function asNumber(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function execJson(command) {
  const output = execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return JSON.parse(output);
}

function checkListIncludesAll(actual, expected) {
  const missing = expected.filter((item) => !actual.includes(item));
  return { ok: missing.length === 0, missing };
}

function main() {
  const mode = normalizeMode(process.env.GOVERNANCE_POLICY_GATING_MODE);
  const repo = process.env.GITHUB_REPOSITORY || process.env.GOVERNANCE_REPO;
  const branch = process.env.GOVERNANCE_BRANCH || 'main';
  const minRequiredChecks = asNumber(process.env.MIN_REQUIRED_STATUS_CHECKS, 3);
  const requiredChecksRaw = (process.env.REQUIRED_STATUS_CHECKS || '').trim();
  const requiredChecks = requiredChecksRaw
    ? requiredChecksRaw.split(',').map((c) => c.trim()).filter(Boolean)
    : [
        'release-check',
        'frontend-prod-gate',
        'orchestrator-tests',
        'resilience-tests',
      ];

  const reportPath = process.env.GOVERNANCE_POLICY_REPORT_PATH || 'artifacts/ci-logs/governance-policy-check.json';

  if (!repo) {
    console.error('Missing repository context. Set GITHUB_REPOSITORY or GOVERNANCE_REPO.');
    process.exit(1);
  }

  let ruleSets = [];
  let branchProtection = null;
  let signedCommitsRequired = false;
  let branchProtectionPresent = false;
  let requiredStatusChecks = [];

  const branchProtectionRef = execJson(`gh api repos/${repo}/branches/${branch}`);
  branchProtectionPresent = Boolean(branchProtectionRef.protected);

  try {
    branchProtection = execJson(`gh api repos/${repo}/branches/${branch}/protection`);
    requiredStatusChecks = (branchProtection.required_status_checks?.checks || [])
      .map((c) => c.context)
      .filter(Boolean);
  } catch {
    branchProtection = null;
  }

  try {
    ruleSets = execJson(`gh api repos/${repo}/rulesets`);
  } catch {
    ruleSets = [];
  }

  signedCommitsRequired = ruleSets.some((rs) => {
    const targetsBranch = Array.isArray(rs?.conditions?.ref_name?.include)
      ? rs.conditions.ref_name.include.some((v) => String(v).includes(branch) || String(v).includes('~DEFAULT_BRANCH'))
      : false;
    const hasSignRule = Array.isArray(rs?.rules)
      ? rs.rules.some((r) => r.type === 'required_signatures')
      : false;
    return targetsBranch && hasSignRule;
  });

  const checksCoverage = checkListIncludesAll(requiredStatusChecks, requiredChecks);

  const checks = [
    {
      name: 'branchProtectionEnabled',
      ok: branchProtectionPresent,
      actual: branchProtectionPresent,
      expected: true,
    },
    {
      name: 'requiredStatusChecksPresent',
      ok: branchProtection !== null,
      actual: branchProtection !== null,
      expected: true,
    },
    {
      name: 'requiredStatusChecksMinimum',
      ok: requiredStatusChecks.length >= minRequiredChecks,
      actual: requiredStatusChecks.length,
      expected: `>= ${minRequiredChecks}`,
    },
    {
      name: 'requiredStatusChecksCoverage',
      ok: checksCoverage.ok,
      actual: requiredStatusChecks,
      expected: requiredChecks,
      missing: checksCoverage.missing,
    },
    {
      name: 'signedCommitsRequired',
      ok: signedCommitsRequired,
      actual: signedCommitsRequired,
      expected: true,
    },
  ];

  const failures = checks.filter((c) => !c.ok);
  const result = {
    generatedAt: new Date().toISOString(),
    mode,
    repo,
    branch,
    requiredChecks,
    observedChecks: requiredStatusChecks,
    signedCommitsRequired,
    checks,
    passed: failures.length === 0,
  };

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

  if (result.passed) {
    console.log('Governance policy checks passed');
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const detail = failures.map((f) => f.name).join(', ');
  if (mode === 'enforced') {
    console.error(`Governance policy check failed (enforced): ${detail}`);
    console.error(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  console.warn(`Governance policy check warnings (warn-only): ${detail}`);
  console.warn(JSON.stringify(result, null, 2));
}

main();
