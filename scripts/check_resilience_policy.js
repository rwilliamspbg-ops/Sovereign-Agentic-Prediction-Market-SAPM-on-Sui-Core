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

function readJson(path) {
  if (!path || !fs.existsSync(path)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function toFiniteNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function main() {
  const summaryPath = process.env.RESILIENCE_SUMMARY_PATH || 'artifacts/ci-logs/resilience-summary.json';
  const mode = normalizeMode(process.env.RESILIENCE_POLICY_GATING_MODE);
  const reportPath = process.env.RESILIENCE_POLICY_REPORT_PATH || 'artifacts/ci-logs/resilience-policy-check.json';

  const summary = readJson(summaryPath);
  if (!summary) {
    console.error(`Missing resilience summary at ${summaryPath}`);
    process.exit(1);
  }

  const policy = {
    requireChaosReport: (process.env.REQUIRE_CHAOS_REPORT || 'true') === 'true',
    requireLoadReport: (process.env.REQUIRE_LOAD_REPORT || 'true') === 'true',
    requireSoakReport: (process.env.REQUIRE_SOAK_REPORT || 'true') === 'true',
    requireChaosPass: (process.env.REQUIRE_CHAOS_PASS || 'true') === 'true',
    requireSoakPass: (process.env.REQUIRE_SOAK_PASS || 'true') === 'true',
    minChaosScenarioCount: asNumber(process.env.MIN_CHAOS_SCENARIO_COUNT, 3),
    minLoadSuccessRate: asNumber(process.env.MIN_LOAD_SUCCESS_RATE, 95),
    maxLoadP99LatencyMs: asNumber(process.env.MAX_LOAD_P99_LATENCY_MS, 1000),
    minLoadRequests: asNumber(process.env.MIN_LOAD_REQUESTS, 100),
    minLoadRps: asNumber(process.env.MIN_LOAD_RPS, 50),
    minSoakIterations: asNumber(process.env.MIN_SOAK_ITERATIONS, 3),
    minSoakSuccessRate: asNumber(process.env.MIN_SOAK_SUCCESS_RATE, 95),
    maxSoakP99LatencyMs: asNumber(process.env.MAX_SOAK_P99_LATENCY_MS, 1000),
    minSoakRps: asNumber(process.env.MIN_SOAK_RPS, 50),
  };

  const chaos = summary.chaos || {};
  const load = summary.load || {};
  const soak = summary.soak || {};

  const chaosScenarios = toFiniteNumber(chaos.totalScenarios);
  const loadSuccessRate = toFiniteNumber(load.successRate);
  const loadP99 = toFiniteNumber(load.p99LatencyMs);
  const loadRequests = toFiniteNumber(load.requests);
  const loadRps = toFiniteNumber(load.rps);
  const soakIterations = toFiniteNumber(soak.iterations);
  const soakSuccessRate = toFiniteNumber(soak.avgSuccessRate);
  const soakWorstP99 = toFiniteNumber(soak.worstP99LatencyMs);
  const soakRps = toFiniteNumber(soak.avgRps);

  const checks = [
    {
      name: 'chaosReportPresent',
      ok: policy.requireChaosReport ? chaos.reportPresent === true : true,
      actual: chaos.reportPresent,
      expected: policy.requireChaosReport,
    },
    {
      name: 'loadReportPresent',
      ok: policy.requireLoadReport ? load.reportPresent === true : true,
      actual: load.reportPresent,
      expected: policy.requireLoadReport,
    },
    {
      name: 'chaosPassed',
      ok: policy.requireChaosPass ? chaos.passed === true : true,
      actual: chaos.passed,
      expected: policy.requireChaosPass,
    },
    {
      name: 'soakReportPresent',
      ok: policy.requireSoakReport ? soak.reportPresent === true : true,
      actual: soak.reportPresent,
      expected: policy.requireSoakReport,
    },
    {
      name: 'soakPassed',
      ok: policy.requireSoakPass ? soak.passed === true : true,
      actual: soak.passed,
      expected: policy.requireSoakPass,
    },
    {
      name: 'chaosScenarioCountMin',
      ok: chaosScenarios !== null && chaosScenarios >= policy.minChaosScenarioCount,
      actual: chaos.totalScenarios,
      expected: `>= ${policy.minChaosScenarioCount}`,
    },
    {
      name: 'loadSuccessRateMin',
      ok: loadSuccessRate !== null && loadSuccessRate >= policy.minLoadSuccessRate,
      actual: load.successRate,
      expected: `>= ${policy.minLoadSuccessRate}`,
    },
    {
      name: 'loadP99LatencyMax',
      ok: loadP99 !== null && loadP99 <= policy.maxLoadP99LatencyMs,
      actual: load.p99LatencyMs,
      expected: `<= ${policy.maxLoadP99LatencyMs}`,
    },
    {
      name: 'loadRequestCountMin',
      ok: loadRequests !== null && loadRequests >= policy.minLoadRequests,
      actual: load.requests,
      expected: `>= ${policy.minLoadRequests}`,
    },
    {
      name: 'loadRpsMin',
      ok: loadRps !== null && loadRps >= policy.minLoadRps,
      actual: load.rps,
      expected: `>= ${policy.minLoadRps}`,
    },
    {
      name: 'soakIterationCountMin',
      ok: soakIterations !== null && soakIterations >= policy.minSoakIterations,
      actual: soak.iterations,
      expected: `>= ${policy.minSoakIterations}`,
    },
    {
      name: 'soakSuccessRateMin',
      ok: soakSuccessRate !== null && soakSuccessRate >= policy.minSoakSuccessRate,
      actual: soak.avgSuccessRate,
      expected: `>= ${policy.minSoakSuccessRate}`,
    },
    {
      name: 'soakP99LatencyMax',
      ok: soakWorstP99 !== null && soakWorstP99 <= policy.maxSoakP99LatencyMs,
      actual: soak.worstP99LatencyMs,
      expected: `<= ${policy.maxSoakP99LatencyMs}`,
    },
    {
      name: 'soakRpsMin',
      ok: soakRps !== null && soakRps >= policy.minSoakRps,
      actual: soak.avgRps,
      expected: `>= ${policy.minSoakRps}`,
    },
  ];

  const failures = checks.filter((c) => !c.ok);
  const result = {
    generatedAt: new Date().toISOString(),
    mode,
    policy,
    checks,
    passed: failures.length === 0,
  };

  fs.writeFileSync(reportPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

  if (result.passed) {
    console.log('Resilience policy checks passed');
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const detail = failures
    .map((f) => `${f.name}: expected=${f.expected}, actual=${f.actual}`)
    .join('; ');

  if (mode === 'enforced') {
    console.error(`Resilience policy check failed (enforced): ${detail}`);
    console.error(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  console.warn(`Resilience policy check warnings (warn-only): ${detail}`);
  console.warn(JSON.stringify(result, null, 2));
}

main();
