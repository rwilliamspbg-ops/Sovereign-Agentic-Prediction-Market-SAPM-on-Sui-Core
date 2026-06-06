/**
 * Market Odds Calculator
 * 
 * Calculates implied probabilities, expected value, and trading signals
 * from order book data and market states.
 * 
 * @module market-data/analyzers/odds-calculator
 * @version 1.0.0
 */

/**
 * Calculate implied probabilities from market prices
 * @param {Object} marketState - Market state object
 * @returns {Object} Implied probabilities and metrics
 */
function calculateImpliedProbabilities(marketState) {
  const { yesPrice, noPrice } = marketState;

  if (!yesPrice || !noPrice) {
    return null;
  }

  // Normalize to sum to 100% (market neutral)
  const totalSpread = yesPrice + noPrice;
  
  const impliedYes = (noPrice / totalSpread) * 100;
  const impliedNo = (yesPrice / totalSpread) * 100;

  return {
    impliedYes,
    impliedNo,
    spreadBps: Math.abs(yesPrice - noPrice),
    confidenceLevel: totalSpread > 95 ? 'high' : totalSpread > 85 ? 'medium' : 'low',
    arbitrageOpportunity: Math.abs(totalSpread - 100) / 100,
    isEfficient: Math.abs(totalSpread - 100) < 1 // Within 1% of efficient
  };
}

/**
 * Calculate expected value for a trade
 * @param {number} stake - Amount to stake
 * @param {string} outcome - 'yes' or 'no'
 * @param {Object} marketState - Market state
 * @returns {Object} Expected value metrics
 */
function calculateExpectedValue(stake, outcome, marketState) {
  const { yesPrice, noPrice } = marketState;
  const isYesOutcome = outcome === 'yes';
  const winningPrice = isYesOutcome ? yesPrice : noPrice;

  // Probability of winning (inverse of price in cents)
  const probabilityWinning = isYesOutcome ? 
    (100 / yesPrice) : (100 / noPrice);

  // Expected value = stake * (probability * payout - cost)
  const expectedValue = stake * ((probabilityWinning * winningPrice) / 100 - 1);

  return {
    probabilityWinning,
    expectedValue,
    roi: expectedValue / stake * 100, // ROI percentage
    breakEvenPrice: isYesOutcome ? 
      (100 / probabilityWinning) : null,
    breakEvenProbability: probabilityWinning
  };
}

/**
 * Calculate market efficiency metrics
 * @param {Object} orderBook - Order book snapshot
 * @returns {Object} Efficiency metrics
 */
function calculateMarketEfficiency(orderBook) {
  const { yesBids, yesAsks, noBids, noAsks } = orderBook;

  // Calculate depth at various price levels
  const yesBidDepth = yesBids.reduce((sum, bid) => sum + bid.size, 0);
  const yesAskDepth = yesAsks.reduce((sum, ask) => sum + ask.size, 0);
  const noBidDepth = noBids.reduce((sum, bid) => sum + bid.size, 0);
  const noAskDepth = noAsks.reduce((sum, ask) => sum + ask.size, 0);

  // Spread analysis
  const yesBestAsk = yesAsks[0]?.price || 100;
  const noBestBid = noBids[0]?.price || 100;
  
  return {
    liquidity: {
      yesBidDepth,
      yesAskDepth,
      noBidDepth,
      noAskDepth,
      totalLiquidity: yesBidDepth + yesAskDepth + noBidDepth + noAskDepth
    },
    spreadAnalysis: {
      yesSpread: yesBestAsk - 95, // Distance from fair price
      noSpread: noBestBid - 105,
      imbalanced: Math.abs(yesBestAsk - noBestBid) > 2 // Significant imbalance
    },
    marketHealth: {
      isLiquid: totalLiquidity > 10000,
      isManipulated: yesSpread < -2 || noSpread > 2
    }
  };
}

/**
 * Analyze order book for trading signals
 * @param {Object} orderBook - Order book snapshot
 * @returns {Array} Trading signals with confidence scores
 */
function analyzeOrderBookSignals(orderBook) {
  const signals = [];
  
  const { yesBids, yesAsks, noBids, noAsks } = orderBook;

  // Check for arbitrage opportunities
  if (yesAsks[0] && noBids[0]) {
    const arbProfit = Math.abs(
      (noBids[0].price - yesAsks[0].price) / yesAsks[0].price * 100
    );

    if (arbProfit > 0.5) { // > 0.5% arbitrage
      signals.push({
        type: 'arbitrage',
        action: arbProfit > 0 ? 'yes_ask_no_bid' : 'no_ask_yes_bid',
        profitBps: arbProfit,
        confidence: 'high',
        yesAsk: yesAsks[0],
        noBid: noBids[0]
      });
    }
  }

  // Check for momentum signals
  const yesVolume = [...yesBids, ...yesAsks].reduce((sum, level) => sum + level.size, 0);
  const noVolume = [...noBids, ...noAsks].reduce((sum, level) => sum + level.size, 0);

  if (Math.abs(yesVolume - noVolume) / (yesVolume + noVolume) > 0.3) {
    signals.push({
      type: 'momentum',
      action: yesVolume > noVolume ? 'back_yes' : 'back_no',
      imbalanceRatio: Math.abs(yesVolume - noVolume) / (yesVolume + noVolume),
      confidence: 'medium'
    });
  }

  // Check for liquidity exhaustion
  const bestYesAsk = yesAsks[0];
  const bestNoBid = noBids[0];

  if (bestYesAsk && bestYesAsk.size < 100) {
    signals.push({
      type: 'liquidity',
      action: 'warning',
      message: 'YES side liquidity low',
      confidence: 'high'
    });
  }

  return signals;
}

/**
 * Calculate Kelly criterion stake size
 * @param {number} bankroll - Total available capital
 * @param {Object} trade - Trade details
 * @param {number} [maxStakeRatio=0.2] - Maximum fraction of bankroll to risk
 * @returns {number} Recommended stake size
 */
function calculateKellyStake(bankroll, trade, maxStakeRatio = 0.2) {
  const { expectedValue, probabilityWinning } = trade;
  
  if (!expectedValue || !probabilityWinning) {
    return null;
  }

  // Fractional Kelly (half-Kelly for safety)
  const kellyFraction = 0.5;
  
  // Calculate edge (probability - implied probability)
  const impliedProb = trade.breakEvenProbability;
  const edge = probabilityWinning - impliedProb;

  if (edge <= 0) {
    return 0; // No edge, don't take the trade
  }

  // Kelly formula: f* = (bp - q) / b
  // Where b is odds received, p is win probability, q is loss probability
  const odds = 1 / impliedProb - 1;
  const q = 1 - probabilityWinning;
  
  const kellyFractional = (probabilityWinning * (odds + 1) - 1) / odds * kellyFraction;

  // Apply max stake ratio constraint
  const recommendedStake = Math.min(
    bankroll * kellyFractional,
    bankroll * maxStakeRatio
  );

  return Math.max(recommendedStake, 0); // Don't go negative
}

/**
 * Calculate risk metrics for a trade
 * @param {Object} marketState - Market state
 * @param {number} stake - Proposed stake amount
 * @returns {Object} Risk metrics
 */
function calculateRiskMetrics(marketState, stake) {
  const { yesPrice, noPrice } = marketState;

  if (!yesPrice || !noPrice) {
    return null;
  }

  // Position sizing based on volatility proxy (spread width)
  const spreadWidth = Math.abs(yesPrice - noPrice);
  const volatilityProxy = spreadWidth / 100;

  // Risk-adjusted position size
  const riskAdjustedStake = stake * (1 - volatilityProxy);

  return {
    volatilityProxy,
    riskAdjustedStake,
    maxPositionSize: Math.min(stake, 50000), // Cap at $50k
    recommendedStake: Math.min(riskAdjustedStake, 30000), // Recommended is 60% of max
    riskLevel: volatilityProxy > 0.1 ? 'high' : volatilityProxy > 0.05 ? 'medium' : 'low'
  };
}

/**
 * Main odds calculator class
 */
class OddsCalculator {
  /**
   * Initialize odds calculator with optional historical data
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.historicalData = new Map(); // marketId -> array of past states
    this.agents = new Set(); // Agent IDs that can influence odds
    this.lastCalculatedTime = null;
  }

  /**
   * Calculate comprehensive odds analysis for a market
   * @param {Object} marketState - Current market state
   * @returns {Object} Comprehensive odds analysis
   */
  analyzeMarket(marketState) {
    const analysis = {
      marketId: marketState.marketId,
      timestamp: new Date().toISOString(),
      basic: calculateImpliedProbabilities(marketState),
      expectedValue: null,
      efficiency: calculateMarketEfficiency(marketState.orderBook),
      signals: analyzeOrderBookSignals(marketState.orderBook)
    };

    return analysis;
  }

  /**
   * Calculate trade-specific metrics
   * @param {string} marketId - Market identifier
   * @param {string} outcome - 'yes' or 'no'
   * @param {number} stake - Stake amount
   * @param {number} [bankroll] - Trader's total capital
   * @returns {Object} Trade metrics
   */
  analyzeTrade(marketId, outcome, stake, bankroll = null) {
    const marketState = this.getMarketState(marketId);
    
    if (!marketState) {
      throw new Error(`No market state found for ${marketId}`);
    }

    const tradeMetrics = {
      marketId,
      outcome,
      stake,
      bankroll,
      expectedValue: calculateExpectedValue(stake, outcome, marketState),
      riskMetrics: calculateRiskMetrics(marketState, stake)
    };

    // Kelly criterion if bankroll provided
    if (bankroll) {
      tradeMetrics.kellyStake = calculateKellyStake(bankroll, tradeMetrics.expectedValue);
    }

    return tradeMetrics;
  }

  /**
   * Update historical data for market
   * @param {string} marketId - Market identifier
   * @param {Object} state - Historical state snapshot
   */
  updateHistory(marketId, state) {
    if (!this.historicalData.has(marketId)) {
      this.historicalData.set(marketId, []);
    }

    const history = this.historicalData.get(marketId);
    history.push({ timestamp: new Date().toISOString(), ...state });

    // Keep last 100 snapshots
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Get historical volatility estimate
   * @param {string} marketId - Market identifier
   * @returns {Object|null} Volatility metrics or null
   */
  getHistoricalVolatility(marketId) {
    const history = this.historicalData.get(marketId);
    
    if (!history || history.length < 10) {
      return null;
    }

    // Calculate price changes over time
    const prices = history.map(h => h.yesPrice || h.noPrice).filter(Boolean);
    const changes = [];

    for (let i = 1; i < prices.length; i++) {
      if (prices[i - 1] && prices[i]) {
        changes.push(Math.abs(prices[i] - prices[i - 1]));
      }
    }

    // Calculate average absolute change as volatility proxy
    const avgVolatility = changes.reduce((sum, c) => sum + c, 0) / changes.length;

    return {
      marketId,
      volatility: avgVolatility,
      priceRange: Math.max(...prices) - Math.min(...prices),
      dataPoints: history.length
    };
  }

  /**
   * Get current market state (caches for performance)
   * @param {string} marketId - Market identifier
   * @returns {Object|null} Market state or null
   */
  getMarketState(marketId) {
    // Placeholder - should integrate with data adapter
    return null;
  }

  /**
   * Reset calculator state
   */
  reset() {
    this.historicalData.clear();
    this.agents.clear();
    this.lastCalculatedTime = null;
  }
}

/**
 * Module exports
 */
module.exports = {
  calculateImpliedProbabilities,
  calculateExpectedValue,
  calculateMarketEfficiency,
  analyzeOrderBookSignals,
  calculateKellyStake,
  calculateRiskMetrics,
  OddsCalculator
};
