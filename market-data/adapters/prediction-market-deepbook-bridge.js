/**
 * PredictionMarketDeepBookBridge
 *
 * Bridges SAPM prediction markets to DeepBook's on-chain orderbook.
 * Translates YES/NO binary positions into DeepBook limit orders,
 * enabling SAPM to participate in the DeepBook specialized track.
 *
 * Architecture:
 *   SAPM Agent forecast
 *     → forecast_to_trade.js (probability → edge)
 *     → PredictionMarketDeepBookBridge (edge → limit order intent)
 *     → deepbook-service.ts (intent → PTB → on-chain execution)
 */

'use strict';

const DEEPBOOK_MIN_PRICE_MIST = 1;
const DEEPBOOK_MIN_QUANTITY_MIST = 10_000_000; // 0.01 SUI
const MAX_EDGE_THRESHOLD = 0.15; // Only place orders when AI edge > 15%
const DEFAULT_GAS_BUDGET = 5_000_000;

/**
 * Convert a prediction market probability and AI edge into a DeepBook order intent.
 *
 * @param {object} params
 * @param {string}  params.poolObjectId         DeepBook pool object ID
 * @param {string}  params.balanceManagerObjectId Balance manager object ID
 * @param {number}  params.yesPrice              Market YES price (0–1)
 * @param {number}  params.aiEdge                AI edge vs consensus (−1 to +1)
 * @param {number}  params.stakeMist             Notional stake in MIST
 * @param {number}  params.clientOrderId         Monotonic order ID
 * @returns {{ valid: boolean, intent?: object, reason?: string }}
 */
function buildDeepBookOrderIntent(params) {
  const { poolObjectId, balanceManagerObjectId, yesPrice, aiEdge, stakeMist, clientOrderId } = params;

  // Only place orders when edge is meaningful
  if (Math.abs(aiEdge) < MAX_EDGE_THRESHOLD) {
    return { valid: false, reason: `AI edge ${(aiEdge * 100).toFixed(1)}% below threshold ${(MAX_EDGE_THRESHOLD * 100).toFixed(0)}%` };
  }

  if (stakeMist < DEEPBOOK_MIN_QUANTITY_MIST) {
    return { valid: false, reason: `Stake ${stakeMist} MIST below minimum ${DEEPBOOK_MIN_QUANTITY_MIST}` };
  }

  // Positive edge → buy YES (bid), negative edge → sell YES (ask / buy NO)
  const isBid = aiEdge > 0;

  // Price in MIST: convert 0–1 probability to integer price ticks
  const priceMist = Math.max(
    DEEPBOOK_MIN_PRICE_MIST,
    Math.round(yesPrice * 1_000_000) // 1 probability unit = 1 USDC in micro-price
  );

  const quantityMist = Math.round(stakeMist * Math.min(1, Math.abs(aiEdge) * 2));

  return {
    valid: true,
    intent: {
      poolObjectId,
      balanceManagerObjectId,
      clientOrderId,
      priceMist,
      quantityMist,
      isBid,
    },
  };
}

/**
 * Compute position sizing based on Kelly criterion approximation.
 * f* = edge / odds (simplified for binary markets)
 *
 * @param {number} probability  Market probability (0–1)
 * @param {number} aiEdge       AI edge vs market
 * @param {number} bankrollMist Available capital in MIST
 * @param {number} maxFraction  Maximum fraction of bankroll to risk (default 0.05)
 * @returns {number} Recommended position size in MIST
 */
function computeKellyPosition(probability, aiEdge, bankrollMist, maxFraction = 0.05) {
  if (Math.abs(aiEdge) < 0.01 || probability <= 0 || probability >= 1) return 0;

  // Kelly fraction: use aiEdge directly as the fractional bet size.
  // This is equivalent to the Kelly criterion when the market price is well-calibrated
  // and the AI edge represents the mispricing. f* ≈ aiEdge for small edges.
  const kellyFraction = Math.abs(aiEdge);

  // Cap at maxFraction to prevent overbetting
  const cappedFraction = Math.min(Math.max(0, kellyFraction * Math.abs(aiEdge)), maxFraction);
  return Math.floor(bankrollMist * cappedFraction);
}

/**
 * Build a full trading plan for a market given agent state.
 *
 * @param {object} market           Market data from SAPM market-data-service
 * @param {object} agentState       { bankrollMist, openOrderIds, riskParams }
 * @param {number} clientOrderBase  Base integer for generating monotonic order IDs
 * @returns {object[]} Array of DeepBook order intents to execute
 */
function buildTradingPlan(market, agentState, clientOrderBase = Date.now()) {
  const { bankrollMist = 10_000_000_000, riskParams = {} } = agentState;
  const maxFraction = riskParams.maxFraction || 0.03;

  if (!market.aiEdge || Math.abs(market.aiEdge) < MAX_EDGE_THRESHOLD) {
    return [];
  }

  const sizeMist = computeKellyPosition(
    market.yesPrice,
    market.aiEdge,
    bankrollMist,
    maxFraction
  );

  if (sizeMist < DEEPBOOK_MIN_QUANTITY_MIST) return [];

  const orderIntent = buildDeepBookOrderIntent({
    poolObjectId: market.deepbookPoolId || '',
    balanceManagerObjectId: market.balanceManagerId || '',
    yesPrice: market.yesPrice,
    aiEdge: market.aiEdge,
    stakeMist: sizeMist,
    clientOrderId: clientOrderBase + 1,
  });

  return orderIntent.valid ? [orderIntent.intent] : [];
}

module.exports = { buildDeepBookOrderIntent, computeKellyPosition, buildTradingPlan };
