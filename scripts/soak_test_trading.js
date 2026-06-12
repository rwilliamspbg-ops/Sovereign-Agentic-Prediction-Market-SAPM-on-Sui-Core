#!/usr/bin/env node

'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function asNumber(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function runLoadIteration(iteration, requests, concurrency) {
  const env = {
    ...process.env,
    REQUESTS: String(requests),
    CONCURRENCY: String(concurrency),
  };

  const execResult = spawnSync('node', ['scripts/load_test_trading.js'], {
    cwd: process.cwd(),
    env,
    encoding: 'utf8',
  });

  if (execResult.status !== 0) {
    return {
      iteration,
      passed: false,
      error: execResult.stderr || execResult.stdout || `load iteration ${iteration} failed`,
    };
  }

  const stdout = execResult.stdout || '';
  const parsed = JSON.parse(stdout);

  return {
    iteration,
    passed: true,
    requests: parsed.requests,
    concurrency: parsed.concurrency,
    successRate: parsed.successRate,
    rps: parsed.rps,
    p99Latency: parsed.p99Latency,
    avgLatency: parsed.avgLatency,
  };
}

function main() {
  const iterations = asNumber(process.env.SOAK_ITERATIONS, 5);
  const requestsPerIteration = asNumber(process.env.SOAK_REQUESTS, 100);
  const concurrency = asNumber(process.env.SOAK_CONCURRENCY, 10);

  const checks = [];
  for (let i = 1; i <= iterations; i += 1) {
    checks.push(runLoadIteration(i, requestsPerIteration, concurrency));
  }

  const passedChecks = checks.filter((c) => c.passed);
  const failedChecks = checks.filter((c) => !c.passed);

  const avgSuccessRate =
    passedChecks.length > 0
      ? passedChecks.reduce((acc, c) => acc + c.successRate, 0) / passedChecks.length
      : 0;
  const avgRps =
    passedChecks.length > 0
      ? passedChecks.reduce((acc, c) => acc + c.rps, 0) / passedChecks.length
      : 0;
  const worstP99 =
    passedChecks.length > 0
      ? Math.max(...passedChecks.map((c) => c.p99Latency))
      : null;

  const report = {
    timestamp: new Date().toISOString(),
    iterations,
    requestsPerIteration,
    concurrency,
    passed: failedChecks.length === 0,
    avgSuccessRate,
    avgRps,
    worstP99Latency: worstP99,
    failedIterations: failedChecks.map((c) => c.iteration),
    checks,
  };

  console.log(JSON.stringify(report, null, 2));

  if (process.env.SOAK_REPORT_PATH) {
    const reportPath = process.env.SOAK_REPORT_PATH;
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  if (!report.passed) {
    process.exit(1);
  }
}

main();