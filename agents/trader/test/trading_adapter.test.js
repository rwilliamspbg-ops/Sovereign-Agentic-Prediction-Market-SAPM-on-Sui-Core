const test = require('node:test');
const assert = require('node:assert/strict');

const { ForecastToTradeAdapter } = require('../forecast_to_trade');
const { PortfolioTracker } = require('../portfolio_tracker');

test('forecast adapter creates a trade plan with agent identity and stake', async () => {
  const adapter = new ForecastToTradeAdapter({
    agentId: 'agent-42',
    defaultBalance: 100,
    maxAgentExposure: 1000,
    maxPositionSizeRatio: 1
  });

  adapter.marketDiscovery.client = true;
  adapter.marketDiscovery.validateMarket = async () => ({ valid: true });
  adapter.marketDiscovery.getMarketOdds = async () => ({ impliedYesProb: 0.4, yesProb: 0.4 });

  const tradePlan = await adapter.convertToTradePlan(
    { confidence: 80, prediction: 70, eventQuery: 'Will it rain?', timestamp: '2026-06-01T00:00:00.000Z' },
    'market-1',
    'package-1',
    { dryRun: true }
  );

  assert.equal(tradePlan.agentId, 'agent-42');
  assert.equal(tradePlan.decision, 'buy_yes');
  assert.ok(Number(tradePlan.stake) > 0);
});

test('forecast adapter executes a trade plan through the PTB builder', async () => {
  const adapter = new ForecastToTradeAdapter({
    agentId: 'agent-42',
    defaultBalance: 1000,
    maxAgentExposure: 1000,
    maxPositionSizeRatio: 1
  });

  adapter.ptbBuilder = {
    executeWithValidation: async () => ({ success: true, dryRun: true, digest: '0xabc' })
  };

  const tradePlan = {
    agentId: 'agent-42',
    decision: 'buy_yes',
    stake: '25',
    confidence: 80
  };

  const result = await adapter.executeTradePlan(tradePlan, 'market-1', 'package-1');

  assert.equal(result.executed, true);
  assert.equal(result.result.digest, '0xabc');
});

test('portfolio tracker resolves balance and market price providers', () => {
  const tracker = new PortfolioTracker({
    balanceProvider: () => 77,
    priceProvider: (_agentId, marketId) => (marketId === 'market-1' ? 0.42 : null),
    maxAgentExposure: 100,
    maxPositionSizeRatio: 1
  });

  tracker.initAgentPortfolio('agent-1', 0);
  tracker.addPosition('agent-1', 'market-1', 'pos-1', 'yes', 10, 4.2);

  assert.equal(tracker.getAvailableBalance('agent-1'), 77);
  assert.equal(tracker.getCurrentMarketPrice('agent-1', 'market-1'), 0.42);
  assert.equal(tracker.checkRiskLimits('agent-1', 'market-1', 'yes', '5', 80).allowed, true);
});
