// SPDX-License-Identifier: Apache-2.0
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

test('buildTradeTransaction dryRun preflight returns success without submitting', () => {
  const meta = { marketId: 'sui-above-x', round: 'r1', confidence: 0.84, impliedProbability: 0.7 };
  const result = buildTradeTransaction(meta, {
    packageId: '0x123',
    marketObjectId: '0x456',
    quoteCoinObjectId: '0x789',
    sender: '0xabc',
  }, { dryRun: true });

  // dryRun must produce a plan and transaction block without network submission
  assert.ok(result.tx, 'dryRun should produce a transaction object');
  assert.equal(result.plan.decision, 'buy_yes');
  assert.equal(result.config.packageId, '0x123');
  // dryRun flag must be surfaced so callers can distinguish from executed results
  assert.equal(result.dryRun, true, 'dryRun flag must be set in result');
});

test('buildTradeTransaction dryRun does not require a network client', () => {
  const meta = { marketId: 'sui-below-x', round: 'r2', confidence: 0.40, impliedProbability: 0.35 };
  // A dryRun invocation with no client config must not throw
  assert.doesNotThrow(() => {
    buildTradeTransaction(meta, {
      packageId: '0xaaa',
      marketObjectId: '0xbbb',
      quoteCoinObjectId: '0xccc',
      sender: '0xddd',
    }, { dryRun: true });
  });
});
