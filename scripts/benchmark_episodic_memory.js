#!/usr/bin/env node
const { EpisodicMemory } = require('../ai-agents/memory/episodic-memory');

function generateMemories(memorySystem, agentCount, marketCount, entriesPerMarket) {
  const actions = ['forecast', 'trade', 'analyze'];
  const now = Date.now();

  for (let a = 0; a < agentCount; a++) {
    const agentId = `agent_${a}`;
    for (let m = 0; m < marketCount; m++) {
      const marketId = `market_${m}`;

      if (!memorySystem.memoryStores.has(agentId)) {
        memorySystem.memoryStores.set(agentId, new Map());
      }

      const marketStore = [];
      for (let e = 0; e < entriesPerMarket; e++) {
        const ageInDays = (e / entriesPerMarket) * memorySystem.retentionDays * 1.5;
        const timestamp = new Date(now - ageInDays * 24 * 60 * 60 * 1000).toISOString();
        const entryId = `mem_${now}_${a}_${m}_${e}`;
        const entry = {
          id: entryId,
          agentId,
          marketId,
          action: actions[e % actions.length],
          outcome: e % 2 === 0 ? 'yes' : null,
          timestamp,
          metadata: { confidence: 80, prediction: 'yes' }
        };
        marketStore.push(entry);
      }
      memorySystem.memoryStores.get(agentId).set(marketId, marketStore);
    }
  }
}

function runBenchmark() {
  console.log("=== Episodic Memory Benchmark ===");
  const memorySystem = new EpisodicMemory({
    maxEntriesPerMarket: 500,
    retentionDays: 365
  });

  const agentCount = 5;
  const marketCount = 20;
  const entriesPerMarket = 300; // Total of 30,000 memory entries

  console.log(`Generating ${agentCount * marketCount * entriesPerMarket} memory entries...`);
  generateMemories(memorySystem, agentCount, marketCount, entriesPerMarket);
  console.log("Memory generation complete.\n");

  const iterations = 500;
  console.log(`Running benchmark with ${iterations} retrieval cycles...`);

  const t0 = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    const agentId = `agent_${i % agentCount}`;
    const marketId = `market_${i % marketCount}`;
    memorySystem.retrieve(agentId, marketId);
  }
  const t1 = process.hrtime.bigint();
  const retrieveTimeNs = Number(t1 - t0);
  const retrieveAvgMs = (retrieveTimeNs / 1e6) / iterations;

  const t2 = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    const agentId = `agent_${i % agentCount}`;
    memorySystem.retrieveAll(agentId);
  }
  const t3 = process.hrtime.bigint();
  const retrieveAllTimeNs = Number(t3 - t2);
  const retrieveAllAvgMs = (retrieveAllTimeNs / 1e6) / iterations;

  console.log(`RESULTS:`);
  console.log(`- retrieve() avg time: ${retrieveAvgMs.toFixed(4)} ms (${(iterations / (retrieveTimeNs / 1e9)).toFixed(1)} ops/sec)`);
  console.log(`- retrieveAll() avg time: ${retrieveAllAvgMs.toFixed(4)} ms (${(iterations / (retrieveAllTimeNs / 1e9)).toFixed(1)} ops/sec)`);
}

runBenchmark();
