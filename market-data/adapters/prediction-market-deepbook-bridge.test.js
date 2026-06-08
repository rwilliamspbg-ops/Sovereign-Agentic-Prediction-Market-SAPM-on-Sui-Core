'use strict';

const { buildDeepBookOrderIntent, computeKellyPosition, buildTradingPlan } = require('./prediction-market-deepbook-bridge');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('PredictionMarketDeepBookBridge', () => {
  const baseParams = {
    poolObjectId: '0xpool',
    balanceManagerObjectId: '0xbm',
    yesPrice: 0.65,
    aiEdge: 0.20,
    stakeMist: 50_000_000,
    clientOrderId: 1001,
  };

  describe('buildDeepBookOrderIntent', () => {
    it('returns valid bid intent when edge is positive and above threshold', () => {
      const result = buildDeepBookOrderIntent(baseParams);
      assert.equal(result.valid, true);
      assert.equal(result.intent.isBid, true);
      assert.ok(result.intent.priceMist > 0);
      assert.ok(result.intent.quantityMist > 0);
    });

    it('returns valid ask intent when edge is negative (AI favors NO)', () => {
      const result = buildDeepBookOrderIntent({ ...baseParams, aiEdge: -0.22 });
      assert.equal(result.valid, true);
      assert.equal(result.intent.isBid, false);
    });

    it('rejects when edge is below threshold', () => {
      const result = buildDeepBookOrderIntent({ ...baseParams, aiEdge: 0.05 });
      assert.equal(result.valid, false);
      assert.ok(result.reason.includes('threshold'));
    });

    it('rejects when stake is below minimum', () => {
      const result = buildDeepBookOrderIntent({ ...baseParams, stakeMist: 1000 });
      assert.equal(result.valid, false);
      assert.ok(result.reason.includes('minimum'));
    });
  });

  describe('computeKellyPosition', () => {
    it('returns positive position for clear edge', () => {
      const pos = computeKellyPosition(0.65, 0.20, 1_000_000_000);
      assert.ok(pos > 0);
    });

    it('returns 0 for negligible edge', () => {
      const pos = computeKellyPosition(0.50, 0.005, 1_000_000_000);
      assert.equal(pos, 0);
    });

    it('caps at maxFraction of bankroll', () => {
      const bankroll = 1_000_000_000;
      const maxFraction = 0.05;
      const pos = computeKellyPosition(0.90, 0.50, bankroll, maxFraction);
      assert.ok(pos <= bankroll * maxFraction);
    });
  });

  describe('buildTradingPlan', () => {
    const market = { yesPrice: 0.65, aiEdge: 0.20, deepbookPoolId: '0xpool', balanceManagerId: '0xbm' };

    it('returns one order for a market with clear edge', () => {
      const plan = buildTradingPlan(market, { bankrollMist: 5_000_000_000 });
      assert.ok(plan.length === 1);
    });

    it('returns empty plan when edge is insufficient', () => {
      const plan = buildTradingPlan({ ...market, aiEdge: 0.02 }, { bankrollMist: 5_000_000_000 });
      assert.equal(plan.length, 0);
    });
  });
});
