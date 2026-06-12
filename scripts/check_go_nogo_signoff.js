#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

function normalizeMode(value) {
  return value === 'enforced' ? 'enforced' : 'warn-only';
}

function main() {
  const mode = normalizeMode(process.env.GONOGO_GATING_MODE);
  const signoffPath = process.env.GONOGO_SIGNOFF_PATH || 'artifacts/ci-logs/go-no-go-signoff.json';
  const outputPath = process.env.GONOGO_CHECK_OUTPUT_PATH || 'artifacts/ci-logs/go-no-go-check.json';

  const requiredApprovers = (process.env.GONOGO_REQUIRED_APPROVERS || 'engineering,security,operations')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (!fs.existsSync(signoffPath)) {
    const result = {
      generatedAt: new Date().toISOString(),
      mode,
      signoffPath,
      checks: [{ name: 'signoffPresent', ok: false, actual: false, expected: true }],
      passed: false,
      reason: 'Go/No-Go signoff artifact missing',
    };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    if (mode === 'enforced') process.exit(1);
    console.warn(JSON.stringify(result, null, 2));
    return;
  }

  const signoff = JSON.parse(fs.readFileSync(signoffPath, 'utf8'));
  const approvers = Array.isArray(signoff.approvals) ? signoff.approvals : [];
  const approvedRoles = approvers.filter((a) => a?.approved === true).map((a) => String(a.role || '').toLowerCase());
  const missingRoles = requiredApprovers.filter((r) => !approvedRoles.includes(r));

  const checks = [
    { name: 'signoffPresent', ok: true, actual: true, expected: true },
    { name: 'decisionIsGo', ok: String(signoff.finalDecision || '').toLowerCase() === 'go', actual: signoff.finalDecision || null, expected: 'Go' },
    { name: 'requiredApprovalsPresent', ok: missingRoles.length === 0, actual: approvedRoles, expected: requiredApprovers, missing: missingRoles },
    { name: 'meetingDatePresent', ok: typeof signoff.meetingDate === 'string' && signoff.meetingDate.length >= 10, actual: signoff.meetingDate || null, expected: 'YYYY-MM-DD' },
    { name: 'releaseCandidatePresent', ok: typeof signoff.releaseCandidate === 'string' && signoff.releaseCandidate.trim().length > 0, actual: signoff.releaseCandidate || null, expected: 'non-empty release candidate id' },
  ];

  const failures = checks.filter((c) => !c.ok);
  const result = {
    generatedAt: new Date().toISOString(),
    mode,
    signoffPath,
    checks,
    passed: failures.length === 0,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

  if (!result.passed && mode === 'enforced') {
    console.error(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify(result, null, 2));
}

main();
