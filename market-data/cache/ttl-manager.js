/**
 * Market Data Cache TTL Manager
 * 
 * Manages Redis-like in-memory caching with time-to-live (TTL) support.
 * Provides high-speed data caching for market feeds with automatic expiration.
 * 
 * @module market-data/cache/ttl-manager
 * @version 1.0.0
 */

const EventEmitter = require('events');

/**
 * Market Data Cache with TTL support
 */
class MarketDataCache extends EventEmitter {
  /**
   * Initialize market data cache
   * @param {Object} config - Configuration options
   * @param {number} [config.defaultTTL=60000] - Default TTL in milliseconds (1 minute)
   * @param {number} [config.maxCacheSize=1000] - Maximum number of entries
   */
  constructor(config = {}) {
    super();
    
    this.defaultTTL = config.defaultTTL || 60000; // 60 seconds default
    this.maxCacheSize = config.maxCacheSize || 1000;
    
    this.cache = new Map();
    this.accessHistory = new Map(); // Track access times for LRU eviction
    
    console.log('[MarketDataCache] Initialized with TTL:', this.defaultTTL, 'ms');
  }

  /**
   * Set market data in cache with custom TTL
   * @param {string} key - Cache key (market ID)
   * @param {*} value - Data to cache
   * @param {number} [ttl] - Custom TTL in milliseconds
   * @returns {boolean} Whether the set was successful
   */
  set(key, value, ttl = null) {
    // Check cache size limit
    if (this.cache.size >= this.maxCacheSize) {
      this._evictOldest();
    }

    // Create cache entry
    const entry = {
      data: value,
      createdAt: new Date().toISOString(),
      expiresAt: ttl ? 
        new Date(Date.now() + ttl).toISOString() : 
        new Date(Date.now() + this.defaultTTL).toISOString(),
      accessCount: 0
    };

    this.cache.set(key, entry);
    this.accessHistory.set(key, Date.now());
    
    // Increment access count on next get
    entry.onAccess = () => {
      const cached = this.cache.get(key);
      if (cached) {
        cached.accessCount++;
        this.accessHistory.set(key, Date.now());
        
        // Extend TTL for frequently accessed data (anti-fragmentation)
        const newTTL = Math.min(300000, 2 * this.defaultTTL); // Up to 5 minutes
        cached.expiresAt = new Date(Date.now() + newTTL).toISOString();
      }
    };

    this.emit('set', { key, ttl: ttl || this.defaultTTL });
    
    return true;
  }

  /**
   * Get market data from cache
   * @param {string} key - Cache key (market ID)
   * @returns {*} Cached data or null if not found/expired
   */
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check expiration
    if (Date.now() > new Date(entry.expiresAt).getTime()) {
      this.delete(key);
      return null;
    }

    // Record access
    entry.onAccess && entry.onAccess();
    
    this.emit('get', { key, hit: true });
    
    return entry.data;
  }

  /**
   * Delete market data from cache
   * @param {string} key - Cache key (market ID)
   * @returns {boolean} Whether the delete was successful
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    
    if (deleted) {
      this.accessHistory.delete(key);
      this.emit('delete', { key });
      
      console.log(`[MarketDataCache] Deleted entry: ${key}`);
    }

    return deleted;
  }

  /**
   * Delete all expired entries from cache
   */
  cleanupExpired() {
    const now = Date.now();
    let deletedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > new Date(entry.expiresAt).getTime()) {
        this.cache.delete(key);
        this.accessHistory.delete(key);
        deletedCount++;
        
        // Batch emit to avoid too many events
        if (deletedCount % 10 === 0) {
          this.emit('cleanup', { key, count: deletedCount });
        }
      }
    }

    console.log(`[MarketDataCache] Cleanup completed: ${deletedCount} entries expired`);
    return deletedCount;
  }

  /**
   * Implement LRU eviction policy when cache is full
   */
  _evictOldest() {
    let oldestKey = null;
    let oldestTime = Infinity;
    
    // Find oldest entry by access time
    for (const [key, accessTime] of this.accessHistory.entries()) {
      if (accessTime < oldestTime) {
        oldestTime = accessTime;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
      console.log(`[MarketDataCache] Evicted LRU entry: ${oldestKey}`);
      
      this.emit('evict', { key: oldestKey, reason: 'LRU' });
    }
  }

  /**
   * Set custom TTL for a specific key
   * @param {string} key - Cache key
   * @param {number} ttl - TTL in milliseconds
   */
  setTTL(key, ttl) {
    const entry = this.cache.get(key);
    
    if (entry) {
      entry.expiresAt = new Date(Date.now() + ttl).toISOString();
      this.emit('ttl_set', { key, ttl });
    } else {
      console.warn(`[MarketDataCache] Key ${key} not found for TTL update`);
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getStats() {
    const now = Date.now();
    let expiredCount = 0;
    
    // Count entries that are about to expire (within last 10% of TTL)
    const defaultTTLInSeconds = this.defaultTTL / 1000;
    const nearExpiryThreshold = defaultTTLInSeconds * 0.9;

    for (const [key, entry] of this.cache.entries()) {
      const timeUntilExpiry = (new Date(entry.expiresAt).getTime() - now) / 1000;
      
      if (timeUntilExpiry <= 0) {
        expiredCount++;
      } else if (timeUntilExpiry < nearExpiryThreshold) {
        // Near expiry warning
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      utilization: (this.cache.size / this.maxCacheSize * 100).toFixed(2),
      defaultTTL: this.defaultTTL,
      nearExpiryCount: expiredCount,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Clear entire cache
   */
  clear() {
    this.cache.clear();
    this.accessHistory.clear();
    
    this.emit('clear');
    console.log('[MarketDataCache] Cache cleared');
  }

  /**
   * Check if key exists in cache (without incrementing access count)
   * @param {string} key - Cache key
   * @returns {boolean} Whether key exists and is not expired
   */
  has(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Check expiration without incrementing access count
    return Date.now() < new Date(entry.expiresAt).getTime();
  }

  /**
   * Invalidate a key (immediate removal regardless of TTL)
   * @param {string} key - Cache key
   */
  invalidate(key) {
    this.delete(key);
    this.emit('invalidate', { key, reason: 'manual' });
  }

  /**
   * Get all cache keys
   * @returns {Array} Array of cache keys
   */
  getKeys() {
    return Array.from(this.cache.keys());
  }

  /**
   * Check health of cache system
   * @returns {Object} Health status
   */
  checkHealth() {
    const now = Date.now();
    let healthyCount = 0;
    let unhealthyKeys = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now < new Date(entry.expiresAt).getTime()) {
        healthyCount++;
      } else {
        unhealthyKeys.push({ key, expiresAt: entry.expiresAt });
      }
    }

    const health = {
      status: 'healthy',
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      expiredEntries: 0,
      issues: []
    };

    if (unhealthyKeys.length > 0) {
      health.status = 'degraded';
      health.expiredEntries = unhealthyKeys.length;
      health.issues.push({ type: 'expired_entries', count: unhealthyKeys.length });
    }

    if (this.cache.size >= this.maxCacheSize * 0.95) {
      health.status = 'warning';
      health.issues.push({ type: 'cache_full', utilization: this.getStats().utilization });
    }

    return health;
  }
}

/**
 * TTL Manager - Coordinates cache lifecycle across multiple adapters
 */
class TTLManager {
  /**
   * Initialize TTL manager with default settings
   * @param {Object} config - Configuration options
   * @param {number} [config.defaultTTL=60000] - Default TTL in ms
   * @param {number} [config.maxCacheSize=1000] - Max cache entries
   */
  constructor(config = {}) {
    this.cache = new MarketDataCache({
      defaultTTL: config.defaultTTL,
      maxCacheSize: config.maxCacheSize
    });

    // Default TTLs for different data types
    this.defaultTTLs = {
      marketState: 10000,        // 10s - Market snapshots
      orderBook: 5000,           // 5s - Order book updates  
      tradeHistory: 300000,      // 5min - Trade history
      analytics: 900000,         // 15min - Analytics data
      userPreferences: 86400000  // 24h - User preferences
    };

    console.log('[TTLManager] Initialized');
  }

  /**
   * Cache market state data
   * @param {string} marketId - Market identifier
   * @param {*} data - Market state data
   */
  cacheMarketState(marketId, data) {
    this.cache.set(marketId, data, this.defaultTTLs.marketState);
  }

  /**
   * Cache order book data
   * @param {string} marketId - Market identifier
   * @param {*} data - Order book snapshot
   */
  cacheOrderBook(marketId, data) {
    this.cache.set(marketId, data, this.defaultTTLs.orderBook);
  }

  /**
   * Cache trade history
   * @param {string} marketId - Market identifier
   * @param {*} data - Trade history batch
   */
  cacheTradeHistory(marketId, data) {
    this.cache.set(marketId, data, this.defaultTTLs.tradeHistory);
  }

  /**
   * Get cached market state if fresh
   * @param {string} marketId - Market identifier
   * @returns {*} Cached market state or null
   */
  getCachedMarketState(marketId) {
    return this.cache.get(marketId);
  }

  /**
   * Invalidate cache for specific data type
   * @param {string} marketId - Market identifier
   * @param {string} dataType - Data type (marketState, orderBook, etc.)
   */
  invalidateType(marketId, dataType) {
    const customTTL = this.defaultTTLs[dataType] || this.defaultTTLs.marketState;
    this.cache.setTTL(marketId, customTTL);
    
    // Actually delete it to force refresh
    this.cache.delete(marketId);
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    this.cache.cleanupExpired();
  }

  /**
   * Get cache statistics across all data types
   * @returns {Object} Cache stats
   */
  getStats() {
    return {
      ...this.cache.getStats(),
      defaultTTLs: this.defaultTTLs
    };
  }

  /**
   * Check TTL manager health
   * @returns {Object} Health status
   */
  checkHealth() {
    return {
      cacheHealth: this.cache.checkHealth(),
      managerStatus: 'healthy'
    };
  }
}

/**
 * Module exports
 */
module.exports = { MarketDataCache, TTLManager };
