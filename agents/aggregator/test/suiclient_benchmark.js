const { SuiClient } = require('@mysten/sui/client');

const SUI_RPC = 'http://sui-local:9000';

function benchmarkBaseline(iterations) {
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    const sui = new SuiClient({ url: SUI_RPC });
    if (!sui) throw new Error();
  }
  const t1 = process.hrtime.bigint();
  return Number(t1 - t0) / 1e6; // returns ms
}

function benchmarkOptimized(iterations) {
  const t0 = process.hrtime.bigint();
  const sui = new SuiClient({ url: SUI_RPC });
  for (let i = 0; i < iterations; i++) {
    const dummy = sui;
    if (!dummy) throw new Error();
  }
  const t1 = process.hrtime.bigint();
  return Number(t1 - t0) / 1e6; // returns ms
}

const ITERATIONS = 10000;
console.log(`Running benchmark with ${ITERATIONS} iterations...`);

const baselineMs = benchmarkBaseline(ITERATIONS);
console.log(`Baseline (new SuiClient per iteration): ${baselineMs.toFixed(3)} ms`);

const optimizedMs = benchmarkOptimized(ITERATIONS);
console.log(`Optimized (single SuiClient reused): ${optimizedMs.toFixed(3)} ms`);

const speedup = (baselineMs / optimizedMs).toFixed(1);
console.log(`Speedup factor: ${speedup}x`);
