/**
 * DeepBook Market Data Adapter
 * 
 * Provides real-time market data integration via WebSocket connection
 * to DeepBook-style order book APIs. Implements high-performance data
 * ingestion with < 50ms latency target for production use.
 * 
 * @module market-data/adapters/deepbook-api
 * @version 1.0.0
 */

const EventEmitter = require('events');

// Type definitions (for TypeScript compatibility)
class MarketDataError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR', details = {}) {
    super(message);
    this.name = 'MarketDataError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

class MarketAdapter {
  /**
   * Initialize DeepBook adapter with WebSocket configuration
   * @param {Object} config - Adapter configuration
   * @param {string} config.websocketUrl - WebSocket endpoint URL
   * @param {string[]} [config.subscriptions] - Markets to subscribe to
   * @param {number} [config.maxReconnectAttempts=5] - Max reconnect attempts
   * @param {number} [config.reconnectDelay=1000] - Reconnect delay in ms
   */
  constructor(config = {}) {
    this.wsUrl = config.websocketUrl || '';
    this.subscriptions = config.subscriptions || [];
    this.maxReconnectAttempts = config.maxReconnectAttempts || 5;
    this.reconnectDelay = config.reconnectDelay || 1000;
    
    this.ws = null;
    this.markets = new Map();
    this.subscribers = new Set();
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.lastMessageTime = null;
    this.messageQueue = [];
    // NOTE: _setupEventHandlers() is called inside connect() once this.ws is set.
  }

  /**
   * Internal event handler setup
   */
  _setupEventHandlers() {
    const self = this;

    // WebSocket open handler
    this.ws.on('open', () => {
      console.log('[DeepBook] Connected to:', this.wsUrl);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Subscribe to requested markets
      this.subscriptions.forEach(marketId => {
        this.subscribeToMarket(marketId);
      });
    });

    // WebSocket message handler
    this.ws.on('message', (data) => {
      self.lastMessageTime = new Date().toISOString();
      
      try {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        
        // Route to appropriate handler based on event type
        if (parsed.eventType === 'orderBookUpdate') {
          this._handleOrderBookUpdate(parsed);
        } else if (parsed.eventType === 'trade') {
          this._handleTrade(parsed);
        } else if (parsed.eventType === 'fill') {
          this._handleFill(parsed);
        } else if (parsed.eventType === 'marketStateChange') {
          this._handleMarketStateChange(parsed);
        }

        // Notify all subscribers
        this.subscribers.forEach(handler => handler(data));
      } catch (error) {
        console.error('[DeepBook] Message parse error:', error.message);
      }
    });

    // WebSocket close handler
    this.ws.on('close', (code, reason) => {
      console.log('[DeepBook] Disconnected:', code, reason?.toString());
      this.isConnected = false;
      
      if (!this._isReconnecting()) {
        this._attemptReconnect();
      }
    });

    // WebSocket error handler
    this.ws.on('error', (error) => {
      console.error('[DeepBook] WebSocket error:', error.message);
      if (!this.isConnected && !this._isReconnecting()) {
        this._attemptReconnect();
      }
    });
  }

  /**
   * Connect to DeepBook WebSocket endpoint
   * @returns {Promise<void>}
   */
  async connect() {
    return new Promise((resolve, reject) => {
      try {
        // Create WebSocket connection
        this.ws = new WebSocket(this.wsUrl);
        // Attach persistent event handlers now that this.ws is live
        this._setupEventHandlers();

        this.ws.on('open', () => {
          resolve();
        });

        this.ws.on('error', (error) => {
          reject(new MarketDataError(
            `Failed to connect to DeepBook: ${error.message}`,
            'CONNECTION_ERROR',
            { url: this.wsUrl, error: error.message }
          ));
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  /**
   * Subscribe to a specific market's order book
   * @param {string} marketId - Market identifier
   */
  subscribeToMarket(marketId) {
    const subscription = {
      eventType: 'subscribe',
      marketId,
      channels: ['orderBook', 'trades', 'fills']
    };

    if (this.ws && this.isConnected) {
      try {
        this.ws.send(JSON.stringify(subscription));
        console.log(`[DeepBook] Subscribed to market: ${marketId}`);
      } catch (error) {
        console.error(`[DeepBook] Subscribe error for ${marketId}:`, error.message);
      }
    } else {
      this.messageQueue.push({ type: 'subscribe', data: marketId });
    }
  }

  /**
   * Handle order book update event
   * @param {Object} event - Order book update event
   */
  _handleOrderBookUpdate(event) {
    const marketId = event.marketId;
    
    if (!this.markets.has(marketId)) {
      this.markets.set(marketId, {
        yesBids: [],
        yesAsks: [],
        noBids: [],
        noAsks: [],
        lastUpdateTime: null
      });
    }

    const market = this.markets.get(marketId);
    
    // Process bid/ask levels
    (event.bids || []).forEach(bid => {
      if (bid.outcome === 'yes') {
        market.yesBids.push({ price: bid.price, size: bid.size });
      } else {
        market.noBids.push({ price: bid.price, size: bid.size });
      }
    });

    (event.asks || []).forEach(ask => {
      if (ask.outcome === 'yes') {
        market.yesAsks.push({ price: ask.price, size: ask.size });
      } else {
        market.noAsks.push({ price: ask.price, size: ask.size });
      }
    });

    market.lastUpdateTime = new Date().toISOString();
  }

  /**
   * Handle trade event
   * @param {Object} event - Trade event
   */
  _handleTrade(event) {
    const marketId = event.marketId;
    
    if (!this.markets.has(marketId)) {
      this.markets.set(marketId, { trades: [] });
    }

    this.markets.get(marketId).trades.push({
      price: event.price,
      size: event.size,
      outcome: event.outcome,
      timestamp: event.timestamp || new Date().toISOString()
    });
  }

  /**
   * Handle fill event
   * @param {Object} event - Fill event
   */
  _handleFill(event) {
    // Process fill events if needed
    console.log(`[DeepBook] Fill: market=${event.marketId}, price=${event.price}, size=${event.size}`);
  }

  /**
   * Handle market state change
   * @param {Object} event - Market state change event
   */
  _handleMarketStateChange(event) {
    const marketId = event.marketId;
    
    if (!this.markets.has(marketId)) {
      this.markets.set(marketId, {
        yesPrice: null,
        noPrice: null,
        lastUpdateTime: null
      });
    }

    const market = this.markets.get(marketId);
    
    if (event.yesPrice) market.yesPrice = event.yesPrice;
    if (event.noPrice) market.noPrice = event.noPrice;
    
    market.lastUpdateTime = new Date().toISOString();
  }

  /**
   * Check if currently reconnecting
   * @returns {boolean}
   */
  _isReconnecting() {
    return this.reconnectAttempts > 0 && 
           !this.isConnected && 
           (Date.now() - this.lastReconnectTime) < this.reconnectDelay;
  }

  /**
   * Attempt to reconnect to WebSocket
   */
  _attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[DeepBook] Max reconnect attempts reached. Giving up.');
      return;
    }

    this.reconnectAttempts++;
    this.lastReconnectTime = Date.now();
    
    console.log(`[DeepBook] Reconnecting... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      try {
        if (!this.ws) {
          this.ws = new WebSocket(this.wsUrl);
          this._setupEventHandlers();
          
          this.ws.on('open', () => {
            this.isConnected = true;
            this.reconnectAttempts = 0;
            console.log('[DeepBook] Reconnected successfully');
            
            // Resubscribe to queued markets
            this.messageQueue.forEach(item => {
              if (item.type === 'subscribe') {
                this.subscribeToMarket(item.data);
              }
            });
            this.messageQueue = [];
          });
        }
      } catch (error) {
        console.error('[DeepBook] Reconnect failed:', error.message);
      }
    }, this.reconnectDelay * Math.min(this.reconnectAttempts, 5)); // Exponential backoff
  }

  /**
   * Calculate implied probabilities from order book
   * @param {string} marketId - Market identifier
   * @returns {Object|null} Implied probabilities or null if insufficient data
   */
  calculateImpliedProbabilities(marketId) {
    const market = this.markets.get(marketId);
    
    if (!market || !market.yesAsks?.length || !market.noBids?.length) {
      return null;
    }

    // Get best prices
    const yesPrice = market.yesAsks[0]?.price || 100;
    const noPrice = market.noBids[0]?.price || 100;

    // Calculate implied probabilities (market neutral)
    const totalSpread = yesPrice + noPrice;
    
    return {
      yes: (noPrice / totalSpread) * 100,
      no: (yesPrice / totalSpread) * 100,
      spreadBps: Math.abs(yesPrice - noPrice)
    };
  }

  /**
   * Get market state snapshot
   * @param {string} marketId - Market identifier
   * @returns {Object|null} Market state or null if not available
   */
  getMarketState(marketId) {
    const market = this.markets.get(marketId);
    
    if (!market) return null;

    return {
      marketId,
      yesPrice: market.yesPrice || null,
      noPrice: market.noPrice || null,
      yesBidsCount: market.yesBids?.length || 0,
      yesAsksCount: market.yesAsks?.length || 0,
      noBidsCount: market.noBids?.length || 0,
      noAsksCount: market.noAsks?.length || 0,
      lastUpdateTime: market.lastUpdateTime,
      impliedProbabilities: this.calculateImpliedProbabilities(marketId)
    };
  }

  /**
   * Get all subscribed markets with their latest state
   * @returns {Map<string, Object>} Market states map
   */
  getAllMarkets() {
    const states = new Map();
    
    for (const [marketId, data] of this.markets) {
      states.set(marketId, this.getMarketState(marketId));
    }
    
    return states;
  }

  /**
   * Add subscriber callback
   * @param {Function} handler - Message handler function
   */
  onMessage(handler) {
    this.subscribers.add(handler);
  }

  /**
   * Remove subscriber callback
   * @param {Function} handler - Message handler function
   */
  offMessage(handler) {
    this.subscribers.delete(handler);
  }

  /**
   * Check connection status
   * @returns {boolean}
   */
  isConnected() {
    return this.isConnected;
  }

  /**
   * Get current market data latency estimate
   * @returns {Object} Latency metrics
   */
  getLatencyMetrics() {
    const now = Date.now();
    
    return {
      lastMessageTime: this.lastMessageTime,
      messageAgeMs: this.lastMessageTime ? now - new Date(this.lastMessageTime).getTime() : null,
      isFresh: this.lastMessageTime && (now - new Date(this.lastMessageTime).getTime()) < 5000
    };
  }

  /**
   * Cleanup and close all connections
   */
  async cleanup() {
    this.disconnect();
    this.markets.clear();
    this.subscribers.clear();
    this.messageQueue = [];
    console.log('[DeepBook] Adapter cleaned up');
  }
}

module.exports = { MarketAdapter, MarketDataError };
