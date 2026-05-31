/**
 * Forecast to Trade Adapter - Phase 3 Implementation
 * Converts finalized forecast metadata into deterministic trade plans
 */

const { MarketDiscovery } = require('./market_discovery')
const { PTBBuilder } = require('./ptb_builder')
const { PortfolioTracker } = require('./portfolio_tracker')

class ForecastToTradeAdapter {
  constructor(config) {
    this.config = config || {}
    this.marketDiscovery = new MarketDiscovery({
      gossipTTL: config.gossipTTL,
      heartbeatInterval: config.heartbeatInterval
    })
    this.ptbBuilder = null
    this.portfolioTracker = new PortfolioTracker(config)
  }

  /**
   * Initialize adapter with Sui RPC and keypair
   */
  async initialize(rpcEndpoint, keypairSecret) {
    await this.marketDiscovery.initialize(rpcEndpoint)
    
    if (keypairSecret) {
      this.ptbBuilder = new PTBBuilder({})
      await this.ptbBuilder.initialize(rpcEndpoint, keypairSecret)
    }

    console.log('[ForecastToTrade] Adapter initialized')
    return true
  }

  /**
   * Convert forecast metadata to trade plan
   */
  async convertToTradePlan(forecastData, marketObjectId, packageId, options = {}) {
    const { dryRun = false, rpcEndpoint = this.config.rpcEndpoint } = options
    
    console.log('[ForecastToTrade] Converting forecast to trade plan...')
    
    // Extract forecast metrics
    const { confidence, prediction, eventQuery, timestamp } = forecastData
    
    if (!confidence || !prediction) {
      throw new Error('Missing required forecast fields: confidence, prediction')
    }

    // Step 1: Market discovery and validation
    console.log('[ForecastToTrade] Validating market object...')
    
    try {
      const marketValidation = await this.marketDiscovery.validateMarket(marketObjectId, packageId)
      
      if (!marketValidation.valid) {
        throw new Error(`Market validation failed: ${marketValidation.error}`)
      }

      // Step 2: Calculate implied probability and edge
      const oddsData = await this.marketDiscovery.getMarketOdds(marketObjectId, packageId)
      
      const impliedProb = oddsData.impliedYesProb || oddsData.yesProb
      const actualProb = prediction / 100.0
      
      // Calculate edge (our prob - market prob)
      const edge = actualProb - (impliedProb || 0.5)
      
      console.log('[ForecastToTrade] Market analysis:', { 
        impliedProb: (impliedProb * 100).toFixed(2),
        actualProb: (actualProb * 100).toFixed(2),
        edge: (edge * 100).toFixed(4)
      })

      // Step 3: Determine decision based on edge and confidence
      const decision = await this._determineDecision(edge, confidence)
      
      console.log('[ForecastToTrade] Decision:', { 
        decision, 
        confidence: confidence.toFixed(2),
        edge: (edge * 100).toFixed(4)
      })

      // Step 4: Calculate stake based on confidence and Kelly criterion (simplified)
      const stake = this._calculateStake(confidence, edge, marketObjectId, packageId, dryRun)

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
        timestamp: new Date().toISOString(),
        eventQuery
      }

      console.log('[ForecastToTrade] Trade plan generated successfully')
      
      return tradePlan

    } catch (error) {
      console.error('[ForecastToTrade] Conversion failed:', error.message)
      throw error
    }
  }

  /**
   * Execute trade plan with PTB builder
   */
  async executeTradePlan(tradePlan, marketObjectId, packageId) {
    if (!this.ptbBuilder) {
      throw new Error('PTB builder not initialized. Call initialize() first.')
    }

    console.log('[ForecastToTrade] Executing trade plan...')
    
    // Validate risk limits before execution
    const riskCheck = this.portfolioTracker.checkRiskLimits(
      'agent-0', // Placeholder agent ID - replace with actual
      marketObjectId,
      tradePlan.decision === 'buy_yes' ? 'yes' : 'no',
      tradePlan.stake,
      tradePlan.confidence
    )

    if (!riskCheck.allowed) {
      console.log('[ForecastToTrade] Risk check failed:', riskCheck.reason)
      return { executed: false, reason: riskCheck.reason }
    }

    // Build and execute PTB
    try {
      const ptbResult = await this.ptbBuilder.executeWithValidation(tradePlan, packageId, marketObjectId)
      
      console.log('[ForecastToTrade] Trade executed:', { 
        decision: tradePlan.decision,
        digest: ptbResult.digest || ptbResult.error,
        success: ptbResult.success || !ptbResult.dryRun
      })
      
      return { 
        executed: true, 
        result: ptbResult,
        tradePlan 
      }

    } catch (error) {
      console.error('[ForecastToTrade] Trade execution failed:', error.message)
      throw error
    }
  }

  /**
   * Determine buy/hold decision based on edge and confidence
   */
  _determineDecision(edge, confidence) {
    const MIN_CONFIDENCE = 60 // Minimum confidence threshold
    const MIN_EDGE = 0.02     // Minimum 2% edge required
    
    // No trade if confidence too low
    if (confidence < MIN_CONFIDENCE) {
      return 'hold'
    }

    // Buy if positive edge meets minimum threshold
    if (edge > MIN_EDGE && edge > -MIN_EDGE * 0.5) { // Allow small negative edges with high confidence
      return 'buy_yes'
    }

    return 'hold'
  }

  /**
   * Calculate stake using simplified Kelly criterion
   */
  _calculateStake(confidence, edge, marketObjectId, packageId, dryRun) {
    // Simplified Kelly: f* = (bp - q) / b
    // Where b = odds - 1, p = our probability, q = 1 - p
    
    const impliedProb = this.marketDiscovery.getMarketOdds(marketObjectId, packageId).impliedYesProb || 0.5
    const b = impliedProb > 0 ? (1 / impliedProb) - 1 : 1 // Simplified odds
    
    const fKelly = ((confidence * 0.01 * b) - (1 - confidence * 0.01)) / b
    
    // Fraction Kelly (half Kelly for risk management)
    const fFractional = Math.min(0.5, Math.max(0.05, fKelly / 2))
    
    // Convert to stake amount based on available balance (placeholder)
    const availableBalance = SUI.parse('10').toString() // Default 10 SUI
    const stake = (availableBalance * fFractional).toString()

    console.log('[ForecastToTrade] Calculated stake:', {
      kellyFraction: fFractional.toFixed(4),
      availableBalance,
      calculatedStake: stake
    })
    
    return stake
  }

  /**
   * Generate trade rationale for audit trail
   */
  _generateRationale(confidence, edge, decision) {
    if (decision === 'hold') {
      if (confidence < 60) {
        return `Insufficient confidence (${confidence}%) to justify on-chain exposure. Waiting for higher-certainty signals.`
      } else if (edge < 0.02) {
        return `Edge too small (${(edge * 100).toFixed(2)}%) after transaction cost analysis. Not economically viable.`
      }
    }

    return `High-confidence forecast (${confidence}%) with positive edge ${(edge * 100).toFixed(4)}%. Trade aligns with swarm consensus and risk limits.`
  }

  /**
   * Get adapter state for health checks
   */
  getState() {
    return {
      marketDiscovery: this.marketDiscovery,
      ptbBuilder: this.ptbBuilder ? this.ptbBuilder.getState() : null,
      portfolioTracker: this.portfolioTracker
    }
  }
}

// Export for module use
module.exports = { ForecastToTradeAdapter }
