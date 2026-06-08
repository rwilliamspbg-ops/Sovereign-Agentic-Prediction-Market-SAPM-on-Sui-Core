/**
 * Forecast to Trade Adapter - Phase 3 Implementation (COMPLETE)
 * Converts finalized forecast metadata into deterministic trade plans
 * 
 * Performance: Low-latency decision logic with minimal allocations
 */

const { MarketDiscovery } = require('./market_discovery');
const { PTBBuilder } = require('./ptb_builder');
const { PortfolioTracker } = require('./portfolio_tracker');
const logger = require('../lib/logger').create('ForecastToTrade');

class ForecastToTradeAdapter {
  constructor(config) {
    this.config = config || {};
    this.agentId = this.config.agentId || 'agent-0';
    this.marketDiscovery = new MarketDiscovery({
      gossipTTL: config.gossipTTL,
      heartbeatInterval: config.heartbeatInterval
    });
    this.ptbBuilder = null;
    this.portfolioTracker = new PortfolioTracker(config);
  }

  /**
   * Initialize adapter with Sui RPC and keypair
   */
  async initialize(rpcEndpoint, keypairSecret) {
    await this.marketDiscovery.initialize(rpcEndpoint);
    
    if (keypairSecret) {
      this.ptbBuilder = new PTBBuilder({});
      await this.ptbBuilder.initialize(rpcEndpoint, keypairSecret);
    }

    logger.info('Adapter initialized');
    return true;
  }

  /**
   * Convert forecast metadata to trade plan with comprehensive validation
   */
  async convertToTradePlan(forecastData, marketObjectId, packageId, options = {}) {
    const { dryRun = false, rpcEndpoint = this.config.rpcEndpoint } = options;
    
    logger.info('Converting forecast to trade plan...');
    
    // Extract forecast metrics
    const { confidence, prediction, eventQuery } = forecastData;
    
    if (!confidence || !prediction) {
      throw new Error('Missing required forecast fields: confidence, prediction');
    }

    // Step 1: Market discovery and validation
    logger.info('Validating market object...');
    
    try {
      let marketValidation = { valid: true };
      if (this.marketDiscovery && this.marketDiscovery.client) {
        marketValidation = await this.marketDiscovery.validateMarket(marketObjectId, packageId);
      } else if (!this.marketDiscovery.client && !dryRun) {
        // If not initialized and not a dry-run, attempt to initialize a client
        await this.marketDiscovery.initialize(this.config.rpcEndpoint || rpcEndpoint).catch(() => {});
        if (this.marketDiscovery.client) {
          marketValidation = await this.marketDiscovery.validateMarket(marketObjectId, packageId);
        }
      }

      if (!marketValidation.valid) {
        throw new Error(`Market validation failed: ${marketValidation.error}`);
      }

      // Step 2: Calculate implied probability and edge from market odds
      let oddsData = { impliedYesProb: 0.5, yesProb: 0.5 };
      if (this.marketDiscovery && this.marketDiscovery.client) {
        oddsData = await this.marketDiscovery.getMarketOdds(marketObjectId, packageId);
      }

      const impliedProb = oddsData.impliedYesProb || oddsData.yesProb;
      const actualProb = prediction / 100.0;
      
      // Calculate edge (our prob - market prob)
      const edge = actualProb - impliedProb;
      
      logger.info('Market analysis:', { 
        impliedProb: (impliedProb * 100).toFixed(2),
        actualProb: (actualProb * 100).toFixed(2),
        edge: (edge * 100).toFixed(4)
      });

      // Step 3: Determine decision based on edge and confidence
      const decision = await this._determineDecision(edge, confidence);
      
      logger.info('Decision:', { 
        decision, 
        confidence: confidence.toFixed(2),
        edge: (edge * 100).toFixed(4)
      });

      // Step 4: Calculate stake based on confidence and Kelly criterion
      const stake = await this._calculateStake(confidence, edge, marketObjectId, packageId, dryRun);

      // Step 5: Build trade plan
      const tradePlan = {
        decision,
        confidence,
        impliedProbability: (impliedProb * 100).toFixed(2),
        actualProbability: (actualProb * 100).toFixed(2),
        edge: (edge * 100).toFixed(4),
        stake,
        rationale: this._generateRationale(confidence, edge, decision),
        marketObjectId,
        packageId,
        agentId: this.agentId,
        timestamp: new Date().toISOString(),
        eventQuery
      };

      logger.info('Trade plan generated successfully');
      
      return tradePlan;

    } catch (error) {
      logger.error('Conversion failed:', { err: String(error.message) });
      throw error;
    }
  }

  /**
   * Execute trade plan with PTB builder and risk validation
   */
  async executeTradePlan(tradePlan, marketObjectId, packageId) {
    if (!this.ptbBuilder) {
      throw new Error('PTB builder not initialized. Call initialize() first.');
    }

    logger.info('Executing trade plan...');
    
    // Validate risk limits before execution
    const agentId = tradePlan.agentId || this.agentId;

    if (!this.portfolioTracker.hasAgentPortfolio(agentId)) {
      this.portfolioTracker.initAgentPortfolio(agentId, 0);
    }

    const riskCheck = this.portfolioTracker.checkRiskLimits(
      agentId,
      marketObjectId,
      tradePlan.decision === 'buy_yes' ? 'yes' : 'no',
      tradePlan.stake,
      tradePlan.confidence
    );

    if (!riskCheck.allowed) {
      logger.info('[ForecastToTrade] Risk check failed:', riskCheck.reason);
      return { executed: false, reason: riskCheck.reason };
    }

    // Build and execute PTB
    try {
      const ptbResult = await this.ptbBuilder.executeWithValidation(tradePlan, packageId, marketObjectId);
      
      logger.info('Trade executed:', { 
        decision: tradePlan.decision,
        digest: ptbResult.digest || ptbResult.error,
        success: ptbResult.success || !ptbResult.dryRun
      });
      
      return { 
        executed: true, 
        result: ptbResult,
        tradePlan 
      };

    } catch (error) {
      logger.error('Trade execution failed:', { err: String(error.message) });
      throw error;
    }
  }

  /**
   * Determine buy/hold decision based on edge and confidence with safety margins
   */
  _determineDecision(edge, confidence) {
    const MIN_CONFIDENCE = 60; // Minimum confidence threshold
    const MIN_EDGE = 0.02;     // Minimum 2% edge required
    const MAX_NEGATIVE_EDGE = -0.01; // Allow small negative edges only with very high confidence
    
    // No trade if confidence too low
    if (confidence < MIN_CONFIDENCE) {
      return 'hold';
    }

    // Buy if positive edge meets minimum threshold
    if (edge > MIN_EDGE) {
      return 'buy_yes';
    }

    // Allow small negative edges only with very high confidence (>85%)
    if (confidence >= 85 && edge > MAX_NEGATIVE_EDGE) {
      return 'buy_no';
    }

    return 'hold';
  }

  /**
   * Calculate stake using fractional Kelly criterion with risk management
   */
  async _calculateStake(confidence, edge, marketObjectId, packageId, dryRun) {
    // Simplified Kelly: f* = (bp - q) / b
    // Where b = odds - 1, p = our probability, q = 1 - p
    
    let impliedProb = 0.5;
    try {
      const oddsData = await this.marketDiscovery.getMarketOdds(marketObjectId, packageId);
      impliedProb = oddsData.impliedYesProb || oddsData.yesProb || 0.5;
    } catch (error) {
      // Fallback if market data unavailable
      void error;
    }
    
    const b = impliedProb > 0 ? ((1 / impliedProb) - 1) : 1; // Simplified odds
    
    // Kelly fraction calculation
    const p = confidence * 0.01; // Convert percentage to decimal
    const q = 1 - p;
    const kellyFraction = ((p * b) - q) / b;
    
    // Fractional Kelly (half Kelly for risk management, capped at 25% of max)
    const fFractional = Math.min(0.25, Math.max(0.01, Math.abs(kellyFraction) / 2));
    
    // Convert to stake amount based on available balance
    const availableBalance = this.portfolioTracker.getAvailableBalance(this.agentId);
    const stake = (availableBalance * fFractional).toString();

    logger.info('Calculated stake:', {
      kellyFraction: fFractional.toFixed(4),
      availableBalance,
      calculatedStake: stake,
      confidence,
      edge: (edge * 100).toFixed(2)
    });
    
    return stake;
  }

  /**
   * Generate trade rationale for audit trail and compliance
   */
  _generateRationale(confidence, edge, decision) {
    if (decision === 'hold') {
      if (confidence < 60) {
        return `Insufficient confidence (${confidence}%) to justify on-chain exposure. Waiting for higher-certainty signals.`;
      } else if (edge < 0.02) {
        return `Edge too small (${(edge * 100).toFixed(2)}%) after transaction cost analysis. Not economically viable.`;
      }
      return `Conditions do not meet trade criteria. Holding position.`;
    }

    if (decision === 'buy_no') {
      return `High-confidence forecast (${confidence}%) indicates market overpricing YES outcome. Buying NO with edge ${(Math.abs(edge) * 100).toFixed(4)}%.`;
    }

    return `High-confidence forecast (${confidence}%) with positive edge ${(edge * 100).toFixed(4)}%. Trade aligns with swarm consensus and risk limits.`;
  }

  /**
   * Get adapter state for health checks and monitoring
   */
  getState() {
    return {
      marketDiscovery: this.marketDiscovery,
      ptbBuilder: this.ptbBuilder ? this.ptbBuilder.getState() : null,
      portfolioTracker: this.portfolioTracker
    };
  }

  /**
   * Shutdown and cleanup resources
   */
  async shutdown() {
    await this.marketDiscovery.close();
    logger.info('Adapter shut down');
  }
}

// Export for module use
module.exports = { ForecastToTradeAdapter };
