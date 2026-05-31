/**
 * DeepBook Predict Market Discovery - Phase 3 Implementation
 * Handles market metadata fetching, event selection, and dry-run validation
 */

const { SuiClient } = require('@mysten/sui/client');

class MarketDiscovery {
  constructor(config) {
    this.config = config;
    this.client = null;
    this.marketCache = new Map();
  }

  /**
   * Initialize client with RPC endpoint
   */
  async initialize(rpcEndpoint) {
    this.client = new SuiClient({ url: rpcEndpoint });
    console.log('[MarketDiscovery] Initialized with RPC:', rpcEndpoint);
    return true;
  }

  /**
   * Fetch available markets from DeepBook Predict
   */
  async fetchMarkets(packageId) {
    if (!this.client) {
      throw new Error('Client not initialized. Call initialize() first.');
    }

    console.log('[MarketDiscovery] Fetching markets from package:', packageId);
    
    // Implementation: Query DeepBook Predict market objects
    // This is a placeholder - implement actual market discovery logic
    try {
      const response = await this.client.moveCall({
        target: `${packageId}::deepbook::get_markets`,
        arguments: []
      });

      if (Array.isArray(response)) {
        return response.map(m => ({
          objectId: m.objectId || m,
          eventId: m.eventId,
          yesCoinId: m.yesCoinId,
          noCoinId: m.noCoinId,
          liquidityObjectId: m.liquidityObjectId,
          createdAt: m.createdAt
        }));
      }

      return [];
    } catch (error) {
      console.error('[MarketDiscovery] Fetch markets failed:', error.message);
      throw error;
    }
  }

  /**
   * Select best market for given event query
   */
  async selectMarketForEvent(eventQuery, packageId) {
    const markets = await this.fetchMarkets(packageId);
    
    if (markets.length === 0) {
      throw new Error('No markets available');
    }

    // Implementation: Filter markets by event query match
    // For Phase 3 scaffolding, select first market as placeholder
    console.log(`[MarketDiscovery] Selected market for: ${eventQuery}`);
    
    return {
      market: markets[0],
      eventId: markets[0].eventId,
      yesCoinId: markets[0].yesCoinId,
      noCoinId: markets[0].noCoinId
    };
  }

  /**
   * Validate market object for dry-run
   */
  async validateMarket(marketObjectId, packageId) {
    console.log(`[MarketDiscovery] Validating market object: ${marketObjectId}`);
    
    try {
      const response = await this.client.moveCall({
        target: `${packageId}::deepbook::get_market`,
        arguments: [marketObjectId]
      });

      return {
        valid: true,
        marketData: response,
        eventId: response.eventId,
        yesPrice: response.yesPrice,
        noPrice: response.noPrice,
        totalLiquidity: response.liquidityAmount
      };
    } catch (error) {
      console.error('[MarketDiscovery] Market validation failed:', error.message);
      throw new Error(`Invalid market object: ${error.message}`);
    }
  }

  /**
   * Get current market odds and liquidity
   */
  async getMarketOdds(marketObjectId, packageId) {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    console.log(`[MarketDiscovery] Fetching market odds for: ${marketObjectId}`);
    
    try {
      const response = await this.client.moveCall({
        target: `${packageId}::deepbook::get_market_state`,
        arguments: [marketObjectId]
      });

      return {
        yesPrice: response.yesPrice,
        noPrice: response.noPrice,
        yesLiquidity: response.yesLiquidity,
        noLiquidity: response.noLiquidity,
        impliedYesProb: this._calculateImpliedProbability(response.yesPrice, response.noPrice)
      };
    } catch (error) {
      console.error('[MarketDiscovery] Failed to fetch market odds:', error.message);
      throw error;
    }
  }

  /**
   * Calculate implied probability from odds
   */
  _calculateImpliedProbability(yesPrice, noPrice) {
    // Simplified odds to probability conversion
    const yesDecimal = (1000 - yesPrice) / yesPrice;
    const noDecimal = (1000 - noPrice) / noPrice;
    
    if (yesDecimal <= 0 || noDecimal <= 0) {
      return null;
    }

    const totalOdds = yesDecimal + noDecimal;
    const yesProb = 1000 / totalOdds / 100;
    const noProb = 1000 / totalOdds / 100;

    return {
      yesProb: Math.min(1, yesProb * 100),
      noProb: Math.min(1, noProb * 100)
    };
  }

  /**
   * Get cached market data or fetch fresh
   */
  async getMarket(marketObjectId, packageId, forceRefresh = false) {
    if (!this.marketCache.has(marketObjectId) || forceRefresh) {
      const odds = await this.getMarketOdds(marketObjectId, packageId);
      this.marketCache.set(marketObjectId, {
        marketId: marketObjectId,
        odds: odds,
        fetchedAt: Date.now()
      });
    }

    return this.marketCache.get(marketObjectId);
  }

  /**
   * Clear market cache
   */
  clearCache() {
    this.marketCache.clear();
    console.log('[MarketDiscovery] Market cache cleared');
  }
}

// Export for module use
async function discoverMarket({ rpc, marketObjectId, marketId, client = null }) {
  const useClient = client || new SuiClient({ url: rpc });
  try {
    const response = await useClient.getObject({ id: marketObjectId });

    return {
      discovered: true,
      objectId: response.data?.objectId || marketObjectId,
      owner: response.data?.owner || null,
      type: response.data?.type || null,
    };
  } catch (err) {
    return { discovered: false, error: String(err) };
  }
}

module.exports = { MarketDiscovery, discoverMarket };
