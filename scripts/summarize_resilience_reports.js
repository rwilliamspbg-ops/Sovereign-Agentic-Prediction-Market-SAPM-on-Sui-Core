#!/usr/bin/env node

'use strict';

const fs = require('fs');

function readJsonIfExists(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function formatNumber(value, digits = 2) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 'n/a';
  }
  return value.toFixed(digits);
}

function main() {
  const chaosPath = process.env.CHAOS_REPORT_PATH || 'artifacts/ci-logs/chaos-report.json';
  const loadPath = process.env.LOAD_REPORT_PATH || 'artifacts/ci-logs/load-report.json';
  const outputPath = process.env.RESILIENCE_SUMMARY_PATH || 'artifacts/ci-logs/resilience-summary.json';

  const chaos = readJsonIfExists(chaosPath);
  const load = readJsonIfExists(loadPath);

  const summary = {
    generatedAt: new Date().toISOString(),
    chaos: chaos
      ? {
          reportPresent: true,
          passed: Boolean(chaos.passed),
          totalScenarios: Array.isArray(chaos.scenarios) ? chaos.scenarios.length : 0,
          failedScenarios: Array.isArray(chaos.scenarios)
            ? chaos.scenarios.filter((scenario) => !scenario.passed).map((scenario) => scenario.name)
            : [],
        }
      : {
          reportPresent: false,
          passed: null,
          totalScenarios: 0,
          failedScenarios: [],
        },
    load: load
      ? {
          reportPresent: true,
          requests: load.requests ?? null,
          concurrency: load.concurrency ?? null,
          successRate: formatNumber(load.successRate, 2),
          rps: formatNumber(load.rps, 2),
          avgLatencyMs: formatNumber(load.avgLatency, 2),
          p99LatencyMs: formatNumber(load.p99Latency, 2),
          failedRequests: load.failed ?? null,
        }
      : {
          reportPresent: false,
          requests: null,
          concurrency: null,
          successRate: 'n/a',
          rps: 'n/a',
          avgLatencyMs: 'n/a',
          p99LatencyMs: 'n/a',
          failedRequests: null,
        },
  };

  fs.writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(summary, null, 2));
}

main();