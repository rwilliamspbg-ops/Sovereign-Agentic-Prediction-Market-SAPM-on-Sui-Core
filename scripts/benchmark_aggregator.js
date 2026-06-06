#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0

const { aggregateUpdates } = require('../agents/aggregator/server');

function makeUpdates(n, dim, withPubkeys = false) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const vec = new Array(dim);
    for (let j = 0; j < dim; j++) {
      vec[j] = Math.sin(i + j * 0.01) * 0.5 + (Math.random() - 0.5) * 0.01;
    }
    if (withPubkeys) out.push({ update: vec, pubkey: `agent-${i}` });
    else out.push(vec);
  }
  return out;
}

function runCase({ name, strategy, updates, iterations }) {
  process.env.AGG_STRATEGY = strategy;
  for (let i = 0; i < 20; i++) aggregateUpdates(updates);

  const t0 = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) aggregateUpdates(updates);
  const t1 = process.hrtime.bigint();

  const ns = Number(t1 - t0);
  const avgMs = (ns / 1e6) / iterations;
  const opsSec = iterations / (ns / 1e9);

  return {
    name,
    strategy,
    updates: updates.length,
    dimensions: Array.isArray(updates[0]) ? updates[0].length : updates[0].update.length,
    iterations,
    avgMs: Number(avgMs.toFixed(3)),
    opsSec: Number(opsSec.toFixed(1)),
  };
}

function main() {
  const cases = [
    { name: 'small-avg', strategy: 'avg', updates: makeUpdates(16, 64, false), iterations: 1000 },
    { name: 'small-trimmed', strategy: 'trimmed', updates: makeUpdates(16, 64, false), iterations: 700 },
    { name: 'small-multikrum', strategy: 'multikrum', updates: makeUpdates(16, 64, false), iterations: 400 },
    { name: 'small-multikrum-rep', strategy: 'multikrum_reputation', updates: makeUpdates(16, 64, true), iterations: 300 },
    { name: 'med-avg', strategy: 'avg', updates: makeUpdates(32, 256, false), iterations: 500 },
    { name: 'med-trimmed', strategy: 'trimmed', updates: makeUpdates(32, 256, false), iterations: 300 },
    { name: 'med-multikrum', strategy: 'multikrum', updates: makeUpdates(32, 256, false), iterations: 120 },
    { name: 'med-multikrum-rep', strategy: 'multikrum_reputation', updates: makeUpdates(32, 256, true), iterations: 80 },
    { name: 'large-avg', strategy: 'avg', updates: makeUpdates(64, 512, false), iterations: 150 },
    { name: 'large-trimmed', strategy: 'trimmed', updates: makeUpdates(64, 512, false), iterations: 80 },
    { name: 'large-multikrum', strategy: 'multikrum', updates: makeUpdates(64, 512, false), iterations: 30 },
    { name: 'large-multikrum-rep', strategy: 'multikrum_reputation', updates: makeUpdates(64, 512, true), iterations: 20 },
  ];

  const results = cases.map(runCase);
  for (const r of results) {
    console.log(
      `${r.name}\tstrategy=${r.strategy}\tupdates=${r.updates}\tdim=${r.dimensions}` +
      `\tavg_ms=${r.avgMs.toFixed(3)}\tops_sec=${r.opsSec.toFixed(1)}`
    );
  }

  console.log('\nJSON summary:');
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2));
}

main();
