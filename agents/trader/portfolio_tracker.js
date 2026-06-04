// SPDX-License-Identifier: Apache-2.0
/**
 * Portfolio & Risk Tracker - Phase 3 Implementation
 * Tracks per-agent and swarm-level exposure, limits, and risk metrics
 */

class PortfolioTracker {
  constructor(config) {
    this.config = config || {};
    this.agentPortfolio = new Map(); // agentId -> portfolio data
    this.swarmPortfolio = null;
    this.riskLimits = {
      maxAgentExposure: config.maxAgentExposure || '10',
      maxSwarmExposure: config.maxSwarmExposure || '1000',
      minConfidenceThreshold: config.minConfidenceThreshold || 60, // 60%
      maxPositionSizeRatio: config.maxPositionSizeRatio || 0.25 // Max 25% of available
    };
  }

  /**
   * Initialize agent portfolio entry
   */
  initAgentPortfolio(agentId, initialBalance = null) {
    const portfolio = {
      agentId,
      positions: new Map(), // positionId -> position data
      unrealizedPnL: 0,
      realizedPnL: 0,
      totalExposure: (initialBalance ?? 0).toString(),
      lastUpdated: new Date().toISOString()
    };

    this.agentPortfolio.set(agentId, portfolio);
    console.log(`[PortfolioTracker] Initialized portfolio for agent ${agentId}`);
    
    return portfolio;
  }

  /**
   * Add position to agent portfolio
   */
  addPosition(agentId, marketId, positionId, side, amount, cost) {
    let portfolio = this.agentPortfolio.get(agentId);
    if (!portfolio) {
      throw new Error(`Portfolio not initialized for agent ${agentId}`);
    }

    const existing = portfolio.positions.get(positionId);
    if (existing) {
      // Update existing position
      existing.amount += amount;
      existing.cost += cost;
    } else {
      // Add new position
      portfolio.positions.set(positionId, {
        marketId,
        side, // 'yes' or 'no'
        amount,
        cost,
        entryPrice: cost / amount,
        createdAt: new Date().toISOString()
      });
    }

    // Update total exposure
    portfolio.totalExposure = (parseFloat(portfolio.totalExposure) + cost).toString();
    portfolio.lastUpdated = new Date().toISOString();

    console.log(`[PortfolioTracker] Added position ${positionId} for agent ${agentId}: side=${side}, amount=${amount}`);
    
    return { success: true, portfolio };
  }

  /**
   * Remove/exit position from portfolio
   */
  exitPosition(agentId, positionId) {
    let portfolio = this.agentPortfolio.get(agentId);
    if (!portfolio) {
      throw new Error(`Portfolio not found for agent ${agentId}`);
    }

    const position = portfolio.positions.get(positionId);
    if (!position) {
      throw new Error(`Position ${positionId} not found in agent ${agentId}`);
    }

    // Update unrealized PnL to realized
    const entryPrice = position.entryPrice;
    const currentPrice = this.getCurrentMarketPrice(portfolio.agentId, position.marketId) || entryPrice;
    
    const priceDiff = currentPrice - entryPrice;
    const pnl = position.amount * priceDiff;
    
    portfolio.realizedPnL += pnl;
    portfolio.unrealizedPnL -= (pnl > 0 ? position.amount : -position.amount); // Simplified
    
    // Remove position
    portfolio.positions.delete(positionId);

    // Recalculate total exposure
    let newExposure = '0';
    for (const [, pos] of portfolio.positions.entries()) {
      const marketPrice = this.getCurrentMarketPrice(portfolio.agentId, pos.marketId) || pos.entryPrice;
      newExposure = (parseFloat(newExposure) + (pos.amount * marketPrice)).toString();
    }
    portfolio.totalExposure = newExposure;

    console.log(`[PortfolioTracker] Exited position ${positionId} for agent ${agentId}: PnL=${pnl}`);
    
    return { success: true, pnl, position };
  }

  /**
   * Check if trade passes risk limits
   */
  checkRiskLimits(agentId, marketId, side, amount, confidence) {
    let portfolio = this.agentPortfolio.get(agentId);
    if (!portfolio) {
      throw new Error(`Portfolio not initialized for agent ${agentId}`);
    }

    // Check confidence threshold
    if (confidence < this.riskLimits.minConfidenceThreshold) {
      return {
        allowed: false,
        reason: `Insufficient confidence: ${confidence}% < ${this.riskLimits.minConfidenceThreshold}%`
      };
    }

    // Calculate current exposure ratio
    const currentExposure = parseFloat(portfolio.totalExposure);
    const availableBalance = this.getAvailableBalance(agentId);
    
    if (availableBalance === 0 || availableBalance === null) {
      return {
        allowed: false,
        reason: 'No available balance for position'
      };
    }

    const proposedExposure = currentExposure + parseFloat(amount);
    const exposureRatio = proposedExposure / this.riskLimits.maxAgentExposure;

    if (exposureRatio > this.riskLimits.maxPositionSizeRatio) {
      return {
        allowed: false,
        reason: `Exposure ratio ${exposureRatio.toFixed(4)} exceeds max ${this.riskLimits.maxPositionSizeRatio}`
      };
    }

    // Check swarm-level limits if configured
    if (this.swarmPortfolio && this.swarmPortfolio.totalExposure) {
      const swarmRatio = parseFloat(this.swarmPortfolio.totalExposure) / parseFloat(this.riskLimits.maxSwarmExposure);
      
      if (swarmRatio + exposureRatio > 0.9) { // 90% of max swarm exposure
        return {
          allowed: false,
          reason: 'Swarm-level exposure limit approaching'
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Get available balance for agent
   */
  getAvailableBalance(agentId) {
    const provider = this.config.balanceProvider || this.config.getBalance;
    if (typeof provider === 'function') {
      const balance = provider(agentId, this.agentPortfolio.get(agentId));
      const parsed = Number(balance);
      if (Number.isFinite(parsed) && parsed >= 0) {
        return parsed;
      }
    }

    const portfolio = this.agentPortfolio.get(agentId);
    if (portfolio) {
      const exposure = Number(portfolio.totalExposure);
      if (Number.isFinite(exposure) && exposure >= 0) {
        return Math.max(10, exposure);
      }
    }

    const fallback = Number(this.config.defaultBalance ?? 10);
    return Number.isFinite(fallback) && fallback >= 0 ? fallback : 10;
  }

  /**
   * Get current market price
   */
  getCurrentMarketPrice(agentId, marketId) {
    const provider = this.config.priceProvider || this.config.getMarketPrice;
    if (typeof provider === 'function') {
      const price = provider(agentId, marketId);
      const parsed = Number(price);
      if (Number.isFinite(parsed) && parsed >= 0) {
        return parsed;
      }
    }

    const portfolio = this.agentPortfolio.get(agentId);
    if (portfolio) {
      for (const position of portfolio.positions.values()) {
        if (position.marketId === marketId && Number.isFinite(position.entryPrice)) {
          return position.entryPrice;
        }
      }
    }

    return null;
  }

  hasAgentPortfolio(agentId) {
    return this.agentPortfolio.has(agentId);
  }

  /**
   * Get portfolio snapshot for agent
   */
  getAgentSnapshot(agentId) {
    const portfolio = this.agentPortfolio.get(agentId);
    if (!portfolio) {
      throw new Error(`Portfolio not found for agent ${agentId}`);
    }

    return {
      agentId,
      totalExposure: portfolio.totalExposure,
      unrealizedPnL: portfolio.unrealizedPnL,
      realizedPnL: portfolio.realizedPnL,
      positionsCount: portfolio.positions.size,
      lastUpdated: portfolio.lastUpdated
    };
  }

  /**
   * Get swarm-wide portfolio snapshot
   */
  getSwarmSnapshot() {
    if (!this.swarmPortfolio) {
      throw new Error('Swarm portfolio not initialized');
    }

    return {
      totalExposure: this.swarmPortfolio.totalExposure,
      agentsCount: this.agentPortfolio.size,
      totalPositions: Array.from(this.agentPortfolio.values()).reduce((sum, p) => sum + p.positions.size, 0),
      aggregatedPnL: Array.from(this.agentPortfolio.values()).reduce((sum, p) => 
        sum + p.unrealizedPnL + p.realizedPnL, 0)
    };
  }

  /**
   * Initialize swarm portfolio (aggregated view)
   */
  initSwarmPortfolio(initialExposure = null) {
    this.swarmPortfolio = {
      totalExposure: initialExposure || '0',
      lastUpdated: new Date().toISOString()
    };
    console.log('[PortfolioTracker] Initialized swarm portfolio');
  }

  /**
   * Update swarm portfolio from individual agent portfolios
   */
  updateSwarmPortfolio() {
    let total = '0';
    
    for (const [, portfolio] of this.agentPortfolio.entries()) {
      total = (parseFloat(total) + parseFloat(portfolio.totalExposure)).toString();
    }

    if (this.swarmPortfolio) {
      this.swarmPortfolio.totalExposure = total;
      this.swarmPortfolio.lastUpdated = new Date().toISOString();
    }

    console.log(`[PortfolioTracker] Updated swarm exposure: ${total}`);
  }

  /**
   * Clear all portfolios (for reset)
   */
  clear() {
    this.agentPortfolio.clear();
    this.swarmPortfolio = null;
    console.log('[PortfolioTracker] All portfolios cleared');
  }
}

// Export for module use
module.exports = { PortfolioTracker };
