#!/usr/bin/env node

const assert = require('assert');
const {
  ForecastReasoner,
  ForecastAnalysis,
  RateLimiter
} = require('../ai-agents/reasoning/forecast-reasoner');

async function testAnalysisEventShape() {
  const reasoner = new ForecastReasoner({ model: 'smoke-test' });

  let eventPayload = null;
  reasoner.once('analysis_complete', (payload) => {
    eventPayload = payload;
  });

  const result = await reasoner.analyzeMarket('market-smoke', {
    orderBook: {
      yesBids: [],
      yesAsks: [],
      noBids: [],
      noAsks: []
    },
    yesPrice: 0.5,
    noPrice: 0.5
  });

  assert(result instanceof ForecastAnalysis, 'analyzeMarket should return ForecastAnalysis');
  assert(eventPayload, 'analysis_complete event should be emitted');
  assert(eventPayload.marketId === 'market-smoke', 'event marketId should match input');
  assert(eventPayload.analysis.marketId === 'market-smoke', 'event analysis should include marketId');
}

async function testMalformedResponseGuard() {
  const reasoner = new ForecastReasoner();
  let threw = false;

  try {
    reasoner._parseAndScoreResponse(null, 'market-smoke');
  } catch (error) {
    threw = true;
  }

  assert(threw, 'malformed LLM responses should be rejected');
}

async function testAccuracyStoragePath() {
  const reasoner = new ForecastReasoner();
  const marketId = 'accuracy-smoke';

  for (let i = 0; i < 5; i += 1) {
    reasoner._updateForecastHistory(marketId, {
      confidence: 70,
      prediction: 'yes'
    });
    reasoner.updateAccuracy(marketId, { outcome: 'yes', confidence: 75 });
  }

  const metrics = reasoner.getAccuracyMetrics(marketId);
  assert(metrics, 'accuracy metrics should be available after enough forecasts');
  assert(metrics.correctPredictions >= 1, 'correct prediction count should be tracked');
  assert(reasoner.accuracyMetrics.has(marketId), 'internal accuracy metrics map should store latest snapshot');
}

async function testRateLimiterThrottle() {
  const limiter = new RateLimiter({ requestsPerMinute: 120, burstSize: 1 });

  const start = Date.now();
  await limiter.acquire();
  await limiter.acquire();
  const elapsedMs = Date.now() - start;

  // 120 rpm = 2 rps -> second token should take about 500ms.
  assert(elapsedMs >= 350, `rate limiter should throttle; elapsed=${elapsedMs}ms`);
}

async function run() {
  await testAnalysisEventShape();
  await testMalformedResponseGuard();
  await testAccuracyStoragePath();
  await testRateLimiterThrottle();
  process.stdout.write(JSON.stringify({ts: new Date().toISOString(), level:'info', component:'reasoner-smoke', message:'Reasoner smoke checks passed.'}) + '\n');
}

run().catch((error) => {
  process.stderr.write(JSON.stringify({ts: new Date().toISOString(), level:'error', component:'reasoner-smoke', message:'Reasoner smoke checks failed.', data:{err: String(error.message)}}) + '\n');
  process.exit(1);
});
