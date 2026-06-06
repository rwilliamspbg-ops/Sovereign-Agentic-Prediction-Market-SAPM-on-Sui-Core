/**
 * Position Limits Controller
 * Enforces maximum position sizes per market and portfolio-level limits
 */

class PositionLimitsController {
  constructor(config = {}) {
    this.maxExposurePerMarket = config.maxExposurePerMarket ?? 50000; // $50k default
    this.portfolioLimit = config.portfolioLimit ?? 500000; // $500k portfolio cap
    this.slippageProtection = config.slippageProtection ?? 0.02; // 2% slippage buffer
    this.minPositionSize = config.minPositionSize ?? 10; // Minimum position size
    this.maxPositionSize = config.maxPositionSize ?? 10000; // Maximum single position
    
    // Position tracking
    this.positions = new Map(); // marketId -> { yes: amount, no: amount }
    this.portfolioPositions = []; // All current positions for calculations
    
    // Admin configuration (load from config or environment)
    this.adminConfig = config.adminConfig ?? {};
    
    // State
    this.state = {
      lastUpdate: null,
      violationCount: 0,
      lastViolation: null,
    };
    
    // Event listeners
    this.listeners = {
      onLimitExceeded: [],
      onPositionApproved: [],
      onPositionRejected: [],
    };
  }

  /**
   * Add or update a position
   */
  addPosition(marketId, outcome, amount, user) {
    const timestamp = new Date().toISOString();
    
    // Get current positions for this market
    let currentPositions = this.positions.get(marketId) || { yes: 0, no: 0 };
    
    // Check limits before adding position
    const checkResult = this.checkLimits(marketId, outcome, amount);
    
    if (!checkResult.approved) {
      console.log(`[PositionLimits] Position rejected for ${marketId} (${outcome.toUpperCase()})`);
      console.log(`  Requested: $${amount.toFixed(2)} | Max allowed: $${checkResult.maxAllowed.toFixed(2)}`);
      
      this.state.violationCount++;
      this.state.lastViolation = {
        marketId,
        outcome,
        requestedAmount: amount,
        timestamp,
        reason: checkResult.reason,
      };
      
      // Notify listeners
      this.listeners.onLimitExceeded.forEach(cb => cb({
        marketId,
        outcome,
        requestedAmount: amount,
        maxAllowed: checkResult.maxAllowed,
        reason: checkResult.reason,
        timestamp,
        user,
      }));
      
      return {
        success: false,
        approved: false,
        reason: checkResult.reason,
        currentExposure: this.calculateMarketExposure(marketId),
      };
    }
    
    // Approve position - update tracking
    currentPositions[outcome] += amount;
    this.positions.set(marketId, currentPositions);
    
    // Track this position
    const newPosition = {
      marketId,
      outcome,
      size: amount,
      entryTime: timestamp,
      user,
    };
    this.portfolioPositions.push(newPosition);
    
    console.log(`[PositionLimits] Position approved for ${marketId} (${outcome.toUpperCase()})`);
    console.log(`  Size: $${amount.toFixed(2)} | New exposure: $${(currentPositions.yes + currentPositions.no).toFixed(2)}`);
    
    this.state.lastUpdate = timestamp;
    
    // Notify listeners
    this.listeners.onPositionApproved.forEach(cb => cb({
      marketId,
      outcome,
      amount,
      newExposure: this.calculateMarketExposure(marketId),
      timestamp,
      user,
    }));
    
    return {
      success: true,
      approved: true,
      position: newPosition,
      currentExposure: this.calculateMarketExposure(marketId),
    };
  }

  /**
   * Check if position addition is within limits
   */
  checkLimits(marketId, outcome, amount) {
    // Minimum position check
    if (amount < this.minPositionSize) {
      return {
        approved: false,
        reason: `Position too small: $${amount.toFixed(2)} < min $${this.minPositionSize}`,
        maxAllowed: this.maxPositionSize,
      };
    }
    
    // Maximum single position check
    if (amount > this.maxPositionSize) {
      return {
        approved: false,
        reason: `Position too large: $${amount.toFixed(2)} > max $${this.maxPositionSize}`,
        maxAllowed: this.maxPositionSize,
      };
    }
    
    // Get current exposure for this market
    const currentExposure = this.calculateMarketExposure(marketId);
    const newExposure = currentExposure + amount;
    
    // Market-level exposure limit
    if (newExposure > this.maxExposurePerMarket) {
      return {
        approved: false,
        reason: `Market exposure exceeded: $${newExposure.toFixed(2)} > max $${this.maxExposurePerMarket}`,
        maxAllowed: this.maxExposurePerMarket - currentExposure,
      };
    }
    
    // Portfolio-level limit check (simplified - in production would track all positions)
    const portfolioExposure = this.calculatePortfolioExposure();
    const newPortfolioExposure = portfolioExposure + amount;
    
    if (newPortfolioExposure > this.portfolioLimit) {
      return {
        approved: false,
        reason: `Portfolio limit exceeded: $${newPortfolioExposure.toFixed(2)} > max $${this.portfolioLimit}`,
        maxAllowed: this.portfolioLimit - portfolioExposure,
      };
    }
    
    // Slippage protection check (simplified)
    const slippageBuffer = amount * this.slippageProtection;
    if (newExposure + slippageBuffer > this.maxExposurePerMarket) {
      return {
        approved: false,
        reason: `Slippage protection: position would exceed limit with expected slippage`,
        maxAllowed: this.maxExposurePerMarket - currentExposure - slippageBuffer,
      };
    }
    
    return {
      approved: true,
      reason: 'Within limits',
      maxAllowed: amount, // Full amount approved
    };
  }

  /**
   * Calculate current exposure for a market
   */
  calculateMarketExposure(marketId) {
    const positions = this.positions.get(marketId);
    if (!positions) return 0;
    return positions.yes + positions.no;
  }

  /**
   * Calculate total portfolio exposure
   */
  calculatePortfolioExposure() {
    let total = 0;
    for (const [marketId, positions] of this.positions) {
      total += positions.yes + positions.no;
    }
    return total;
  }

  /**
   * Redeem/close a position
   */
  redeemPosition(marketId, outcome, amount) {
    const timestamp = new Date().toISOString();
    
    const positions = this.positions.get(marketId);
    if (!positions) {
      return {
        success: false,
        error: 'No position found for this market',
      };
    }
    
    // Check if user has enough position to redeem
    const currentAmount = positions[outcome];
    if (amount > currentAmount) {
      return {
        success: false,
        error: `Insufficient position: have $${currentAmount.toFixed(2)}, requested $${amount.toFixed(2)}`,
      };
    }
    
    // Update positions
    positions[outcome] -= amount;
    
    // Remove market if no more positions
    if (positions.yes === 0 && positions.no === 0) {
      this.positions.delete(marketId);
    }
    
    // Remove from portfolio positions list
    this.portfolioPositions = this.portfolioPositions.filter(
      p => !(p.marketId === marketId && p.outcome === outcome)
    );
    
    console.log(`[PositionLimits] Redeemed $${amount.toFixed(2)} position for ${marketId} (${outcome.toUpperCase()})`);
    console.log(`  Remaining exposure: $${this.calculateMarketExposure(marketId).toFixed(2)}`);
    
    this.state.lastUpdate = timestamp;
    
    return {
      success: true,
      redeemedAmount: amount,
      remainingExposure: this.calculateMarketExposure(marketId),
      positionOpen: this.calculateMarketExposure(marketId) > 0,
    };
  }

  /**
   * Get current positions for a market
   */
  getMarketPositions(marketId) {
    const positions = this.positions.get(marketId);
    if (!positions) return null;
    
    return {
      marketId,
      yes: positions.yes,
      no: positions.no,
      totalExposure: this.calculateMarketExposure(marketId),
      lastUpdate: this.state.lastUpdate,
    };
  }

  /**
   * Get all current positions
   */
  getAllPositions() {
    const positions = [];
    
    for (const [marketId, pos] of this.positions) {
      if (pos.yes > 0 || pos.no > 0) {
        positions.push({
          marketId,
          yes: pos.ye s,
          no: pos.no,
          totalExposure: pos.yes + pos.no,
        });
      }
    }
    
    return positions;
  }

  /**
   * Get configuration
   */
  getConfig() {
    return {
      maxExposurePerMarket: this.maxExposurePerMarket,
      portfolioLimit: this.portfolioLimit,
      minPositionSize: this.minPositionSize,
      maxPositionSize: this.maxPositionSize,
      slippageProtection: this.slippageProtection,
    };
  }

  /**
   * Update configuration (admin only)
   */
  updateConfig(updates) {
    const adminKey = updates.adminKey || 'admin';
    if (this.adminConfig[adminKey]) {
      Object.assign(this, updates);
      console.log('[PositionLimits] Configuration updated by admin');
    } else {
      console.warn('[PositionLimits] Admin key required for config update');
    }
  }

  /**
   * Reset all positions (for testing)
   */
  reset() {
    this.positions.clear();
    this.portfolioPositions = [];
    this.state.violationCount = 0;
    this.state.lastViolation = null;
    console.log('[PositionLimits] All positions RESET');
  }

  /**
   * Add event listener
   */
  on(eventType, callback) {
    if (this.listeners[eventType]) {
      this.listeners[eventType].push(callback);
    }
  }
}

/**
 * Create and export position limits controller instance
 */
const positionLimitsController = new PositionLimitsController({
  maxExposurePerMarket: 50000, // $50k per market
  portfolioLimit: 500000,      // $500k total portfolio
  minPositionSize: 10,         // Min $10 position
  maxPositionSize: 10000,      // Max $10K single position
  slippageProtection: 0.02,    // 2% slippage buffer
});

module.exports = {
  PositionLimitsController,
  positionLimitsController,
};
