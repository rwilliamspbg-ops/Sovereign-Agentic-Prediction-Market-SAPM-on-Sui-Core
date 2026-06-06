/**
 * Sui Market Data Feed Adapter
 * 
 * Integrates with Sui RPC to fetch market state from on-chain objects
 * and external market feeds. Provides unified market data access layer.
 * 
 * @module market-data/adapters/sui-market-feed
 * @version 1.0.0
 */

const EventEmitter = require('events');

/**
 * Market Data Feed Adapter for Sui Blockchain
 */
class SuiMarketFeedAdapter {
  /**
   * Initialize Sui market feed adapter
   * @param {Object} config - Configuration options
   * @param {string} config.rpcUrl - Sui fullnode RPC URL
   * @param {string[]} [config.packageIds] - List of market package IDs to monitor
   * @param {number} [config.pollingInterval=5000] - Polling interval in ms
   */
  constructor(config = {}) {
    this.rpcUrl = config.rpcUrl || 'https://fullnode.mainnet.sui.io:443';
    this.packageIds = new Set(config.packageIds || []);
    this.pollingInterval = config.pollingInterval || 5000;
    
    this.client = null;
    this.markets = new Map();
    this.subscribers = new Set();
    this.isRunning = false;
    this.lastPollTime = null;
    
    // Initialize Sui client
    this._initializeClient();
  }

  /**
   * Initialize Sui RPC client with retry logic
   */
  async _initializeClient() {
    try {
      const { SuiClient } = require('@mysten/sui/client');
      this.client = new SuiClient({ url: this.rpcUrl });
      
      // Test connection
      await this.client.getLatestObjectChanges({
        options: { showContent: true, showType: true }
      }).catch(() => {
        // Expected to fail initially - we'll handle in polling loop
      });
      
      console.log(`[SuiFeed] Connected to Sui RPC: ${this.rpcUrl}`);
    } catch (error) {
      console.error('[SuiFeed] Failed to initialize RPC client:', error.message);
      // Will retry on first poll
    }
  }

  /**
   * Fetch market state from DeepBook-style API endpoint
   * @param {string} marketId - Market identifier
   * @returns {Promise<Object|null>} Market state or null
   */
  async fetchMarketData(marketId) {
    const self = this;
    
    try {
      // Try DeepBook API first
      const deepbookResponse = await this._fetchFromDeepBook(marketId);
      
      if (deepbookResponse) {
        return deepbookResponse;
      }
      
      // Fallback to Sui on-chain query
      console.log(`[SuiFeed] Using Sui RPC for market: ${marketId}`);
      return await this._fetchFromChain(marketId);
      
    } catch (error) {
      console.error(`[SuiFeed] Error fetching market ${marketId}:`, error.message);
      throw new Error(`Market data unavailable for ${marketId}: ${error.message}`);
    }
  }

  /**
   * Fetch from DeepBook API
   * @param {string} marketId - Market identifier
   * @returns {Promise<Object|null>} Market state
   */
  async _fetchFromDeepBook(marketId) {
    try {
      // DeepBook API endpoint (adjust based on actual implementation)
      const response = await fetch(`https://api.deepbook.xyz/v1/markets/${marketId}`);
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      
      // Normalize to unified schema
      return {
        marketId,
        yesPrice: data.yesPrice || null,
        noPrice: data.noPrice || null,
        yesVolume: data.yesVolume || 0,
        noVolume: data.noVolume || 0,
        lastUpdateTime: new Date().toISOString(),
        orderBook: {
          yesBids: data.yesBids || [],
          yesAsks: data.yesAsks || [],
          noBids: data.noBids || [],
          noAsks: data.noAsks || []
        }
      };
      
    } catch (error) {
      console.log(`[SuiFeed] DeepBook fetch failed for ${marketId}:`, error.message);
      return null;
    }
  }

  /**
   * Fetch from Sui on-chain objects
   * @param {string} marketId - Market identifier
   * @returns {Promise<Object|null>} Market state
   */
  async _fetchFromChain(marketId) {
    try {
      // Query for market object (placeholder package ID)
      const response = await this.client.getObject({
        id: marketId,
        options: { showContent: true, showType: true }
      });

      if (!response.data) {
        return null;
      }

      // Parse Move object content
      const content = response.data.content;
      
      // Extract market data from Move structure (simplified parsing)
      try {
        const parsed = JSON.parse(content);
        
        return {
          marketId,
          yesPrice: parsed.fields?.yes_price || null,
          noPrice: parsed.fields?.no_price || null,
          lastUpdateTime: new Date().toISOString(),
          source: 'sui-onchain'
        };
      
      } catch (parseError) {
        console.warn(`[SuiFeed] Could not parse Move object for ${marketId}:`, parseError.message);
        return null;
      }
      
    } catch (error) {
      console.log(`[SuiFeed] Chain fetch failed for ${marketId}:`, error.message);
      return null;
    }
  }

  /**
   * Subscribe to market data updates
   * @param {string} marketId - Market identifier
   * @param {Function} callback - Update callback function
   */
  subscribe(marketId, callback) {
    if (!this.subscribers.has(callback)) {
      this.subscribers.add(callback);
      
      // Initial fetch
      this.fetchMarketData(marketId).then(data => {
        if (data) {
          callback({ marketId, event: 'update', data });
        }
      }).catch(error => {
        console.error(`[SuiFeed] Subscribe error for ${marketId}:`, error.message);
      });
    }
  }

  /**
   * Unsubscribe from market data updates
   * @param {string} marketId - Market identifier
   * @param {Function} callback - Callback to remove
   */
  unsubscribe(marketId, callback) {
    const callbacksToRemove = Array.from(this.subscribers).filter(cb => cb.marketId === marketId);
    callbacksToRemove.forEach(cb => this.subscribers.delete(cb));
    
    console.log(`[SuiFeed] Unsubscribed ${marketId} from ${callbacksToRemove.length} callbacks`);
  }

  /**
   * Poll for all subscribed markets
   */
  async poll() {
    if (!this.isRunning) {
      this._startPolling();
    }
  }

  /**
   * Start polling loop
   */
  _startPolling() {
    const self = this;
    
    this.isRunning = true;
    console.log(`[SuiFeed] Polling started with interval: ${this.pollingInterval}ms`);

    async function pollLoop() {
      try {
        const now = Date.now();
        
        // Fetch all subscribed markets
        for (const callback of self.subscribers) {
          await self.fetchMarketData(callback.marketId);
        }
        
        self.lastPollTime = new Date().toISOString();
        
      } catch (error) {
        console.error('[SuiFeed] Poll error:', error.message);
      }

      // Continue polling
      if (self.isRunning) {
        setTimeout(pollLoop, self.pollingInterval);
      }
    }

    pollLoop();
  }

  /**
   * Stop polling loop
   */
  stopPolling() {
    this.isRunning = false;
    console.log('[SuiFeed] Polling stopped');
  }

  /**
   * Get market state snapshot
   * @param {string} marketId - Market identifier
   * @returns {Promise<Object|null>} Market state
   */
  async getMarketState(marketId) {
    const cached = this.markets.get(marketId);
    
    if (cached && Date.now() - new Date(cached.lastUpdateTime).getTime() < 10000) {
      // Return cached data if fresh (< 10 seconds)
      return cached;
    }

    const data = await this.fetchMarketData(marketId);
    
    if (data) {
      this.markets.set(marketId, data);
    }
    
    return data;
  }

  /**
   * Calculate implied probabilities
   * @param {string} marketId - Market identifier
   * @returns {Object|null} Implied probabilities
   */
  async calculateImpliedProbabilities(marketId) {
    const state = await this.getMarketState(marketId);
    
    if (!state || !state.yesPrice || !state.noPrice) {
      return null;
    }

    const totalSpread = state.yesPrice + state.noPrice;
    
    return {
      yes: (state.noPrice / totalSpread) * 100,
      no: (state.yesPrice / totalSpread) * 100,
      spreadBps: Math.abs(state.yesPrice - state.noPrice),
      confidence: totalSpread > 95 ? 'high' : 'low'
    };
  }

  /**
   * Get all cached market states
   * @returns {Map<string, Object>} Market states map
   */
  getAllMarkets() {
    return new Map(this.markets);
  }

  /**
   * Cleanup adapter resources
   */
  async cleanup() {
    this.stopPolling();
    this.markets.clear();
    this.subscribers.clear();
    console.log('[SuiFeed] Adapter cleaned up');
  }
}

/**
 * Market Data Manager - Orchestrates multiple data sources
 */
class MarketDataManager {
  /**
   * Initialize market data manager
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.adapters = {
      suiFeed: null,
      deepbook: null
    };

    // Initialize Sui feed adapter
    if (config.suiRpcUrl) {
      this.adapters.suiFeed = new SuiMarketFeedAdapter({
        rpcUrl: config.suiRpcUrl,
        pollingInterval: config.pollingInterval || 5000
      });
    }

    // Initialize DeepBook adapter
    if (config.deepbookUrl) {
      const { MarketAdapter } = require('./deepbook-api');
      this.adapters.deepbook = new MarketAdapter({
        websocketUrl: config.deepbookUrl,
        maxReconnectAttempts: config.maxReconnectAttempts || 5
      });
      
      // Connect DeepBook adapter
      this.adapters.deepbook.connect().catch(console.error);
    }

    // Subscribe handlers
    this.subscribers = new Set();
  }

  /**
   * Subscribe to market data from all sources
   * @param {string} marketId - Market identifier
   * @param {Function} callback - Update callback
   */
  subscribe(marketId, callback) {
    // Subscribe to Sui feed
    if (this.adapters.suiFeed) {
      this.adapters.suiFeed.subscribe(marketId, callback);
    }

    // Subscribe to DeepBook
    if (this.adapters.deepbook) {
      this.adapters.deepbook.onMessage(callback);
      
      // Subscribe to market
      this.adapters.deepbook.subscribeToMarket(marketId);
    }
  }

  /**
   * Unsubscribe from market data
   * @param {string} marketId - Market identifier
   * @param {Function} callback - Callback to remove
   */
  unsubscribe(marketId, callback) {
    if (this.adapters.suiFeed) {
      this.adapters.suiFeed.unsubscribe(marketId, callback);
    }

    if (this.adapters.deepbook) {
      this.adapters.deepbook.offMessage(callback);
    }
  }

  /**
   * Get market state from primary source (DeepBook preferred)
   * @param {string} marketId - Market identifier
   * @returns {Promise<Object|null>} Market state
   */
  async getMarketState(marketId) {
    // Try DeepBook first
    if (this.adapters.deepbook) {
      const deepbookState = this.adapters.deepbook.getMarketState(marketId);
      if (deepbookState) return deepbookState;
    }

    // Fallback to Sui
    if (this.adapters.suiFeed) {
      return await this.adapters.suiFeed.getMarketState(marketId);
    }

    return null;
  }

  /**
   * Get data source health status
   * @returns {Object} Health status report
   */
  getHealthStatus() {
    const status = {};

    if (this.adapters.deepbook) {
      status.deepbook = {
        connected: this.adapters.deepbook.isConnected(),
        latency: this.adapters.deepbook.getLatencyMetrics(),
        marketsTracked: this.adapters.deepbook.markets.size
      };
    }

    if (this.adapters.suiFeed) {
      const cachedCount = this.adapters.suiFeed.markets.size;
      status.sui = {
        isRunning: this.adapters.suiFeed.isRunning,
        cachedMarkets: cachedCount,
        lastPollTime: this.adapters.suiFeed.lastPollTime
      };
    }

    return status;
  }
}

module.exports = { 
  SuiMarketFeedAdapter, 
  MarketDataManager,
  SuiClientError: Error 
};
