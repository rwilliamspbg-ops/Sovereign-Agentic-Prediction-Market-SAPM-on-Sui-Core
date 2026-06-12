// SPDX-License-Identifier: Apache-2.0

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const workspaceRoot = path.resolve(__dirname, '..');
const frontendDir = path.join(workspaceRoot, 'frontend');
const outputPath = process.env.FRONTEND_AUDIT_REPORT_PATH
  ? path.resolve(workspaceRoot, process.env.FRONTEND_AUDIT_REPORT_PATH)
  : path.join(workspaceRoot, 'artifacts', 'ci-logs', 'frontend-audit-gate.json');

const mode = (process.env.FRONTEND_AUDIT_GATING_MODE || 'enforced').trim();

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function runAuditJson() {
  try {
    const stdout = execSync('npm audit --json --no-fund', {
      cwd: frontendDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    });
    return JSON.parse(stdout);
  } catch (error) {
    const stdout = typeof error.stdout === 'string' ? error.stdout : '';
    if (stdout) {
      return JSON.parse(stdout);
    }

    throw new Error(`Failed to run npm audit --json: ${error.message}`);
  }
}

function summarize(data) {
  const metadata = data && data.metadata && data.metadata.vulnerabilities
    ? data.metadata.vulnerabilities
    : {};

  const high = Number(metadata.high || 0);
  const critical = Number(metadata.critical || 0);
  const moderate = Number(metadata.moderate || 0);
  const low = Number(metadata.low || 0);
  const info = Number(metadata.info || 0);
  const total = Number(metadata.total || 0);

  const advisories = data && data.vulnerabilities && typeof data.vulnerabilities === 'object'
    ? Object.keys(data.vulnerabilities)
    : [];

  return {
    total,
    critical,
    high,
    moderate,
    low,
    info,
    advisories,
  };
}

function main() {
  const auditData = runAuditJson();
  const summary = summarize(auditData);
  const blocked = summary.high > 0 || summary.critical > 0;

  const report = {
    timestamp: new Date().toISOString(),
    mode,
    blocked,
    pass: !blocked || mode !== 'enforced',
    summary,
    note: blocked
      ? 'Frontend npm audit contains high/critical vulnerabilities.'
      : 'Frontend npm audit is below high severity threshold.',
  };

  ensureDir(outputPath);
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);

  const headline = `[frontend-audit-gate] high=${summary.high} critical=${summary.critical} moderate=${summary.moderate} low=${summary.low} total=${summary.total}`;
  console.log(headline);
  console.log(`[frontend-audit-gate] mode=${mode} report=${path.relative(workspaceRoot, outputPath)}`);

  if (blocked && mode === 'enforced') {
    throw new Error('Frontend audit gate failed: high/critical vulnerabilities detected.');
  }

  if (blocked && mode !== 'enforced') {
    console.warn('[frontend-audit-gate] warn-only mode: high/critical vulnerabilities detected but not failing.');
  }
}

main();
