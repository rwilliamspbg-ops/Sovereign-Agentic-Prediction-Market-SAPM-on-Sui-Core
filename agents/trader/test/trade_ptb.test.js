const test = require('node:test');
const assert = require('node:assert/strict');
const { buildTradeTransaction } = require('../ptb_builder');

test('buildTradeTransaction creates a buy_yes PTB plan', () => {
  const meta = { marketId: 'sui-above-x', round: 'r1', confidence: 0.84, impliedProbability: 0.7 };
  const result = buildTradeTransaction(meta, {
    packageId: '0x123',
    marketObjectId: '0x456',
    quoteCoinObjectId: '0x789',
    sender: '0xabc',
  });

  assert.equal(result.plan.decision, 'buy_yes');
  assert.equal(result.config.packageId, '0x123');
  assert.ok(result.tx);
});
