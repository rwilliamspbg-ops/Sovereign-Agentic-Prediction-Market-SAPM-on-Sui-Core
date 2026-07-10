/**
 * AI Episodic Memory System
 * 
 * Stores and retrieves historical agent decisions, market outcomes, and experiences.
 * Enables agents to learn from past performance and improve forecasting accuracy.
 * 
 * @module ai-agents/memory/episodic-memory
 * @version 1.0.0
 */

const EventEmitter = require('events');

/**
 * Memory Entry - Single stored experience
 */
class MemoryEntry {
  constructor(id, agentId, marketId, action, outcome, timestamp, metadata = {}) {
    this.id = id;
    this.agentId = agentId;
    this.marketId = marketId;
    this.action = action; // 'forecast', 'trade', 'analyze'
    this.outcome = outcome; // null (pending) or actual result
    this.timestamp = timestamp;
    this.metadata = metadata;

    // Support direct property access for prediction/confidence/etc.
    this.prediction = metadata?.prediction;
    this.confidence = metadata?.confidence;
    this.stake = metadata?.stake;
    this.impliedProbability = metadata?.impliedProbability;

    // Cache numerical timestamp for optimized retrieval
    this._timestampNum = timestamp ? Date.parse(timestamp) : Date.now();
  }

  toJSON() {
    return {
      id: this.id,
      agentId: this.agentId,
      marketId: this.marketId,
      action: this.action,
      outcome: this.outcome,
      timestamp: this.timestamp,
      metadata: this.metadata
    };
  }
}

/**
 * Episodic Memory Manager - Main memory system
 */
class EpisodicMemory extends EventEmitter {
  /**
   * Initialize episodic memory
   * @param {Object} config - Configuration options
   * @param {number} [config.maxEntriesPerMarket=100] - Max entries per market
   * @param {number} [config.retentionDays=365] - Days to retain memories
   */
  constructor(config = {}) {
    super();
    
    this.maxEntriesPerMarket = config.maxEntriesPerMarket || 100;
    this.retentionDays = config.retentionDays || 365;
    
    // Memory stores: agentId -> marketId -> entries[]
    this.memoryStores = new Map();
    
    // Global memory counter
    this.globalCounter = 0;
    
    console.log(`[EpisodicMemory] Initialized with max ${this.maxEntriesPerMarket} entries/market`);
  }

  /**
   * Store a memory entry (decision, forecast, or outcome)
   * @param {string} agentId - Agent identifier
   * @param {string} marketId - Market identifier
   * @param {string} action - Type of action ('forecast', 'trade', 'analyze')
   * @param {*} data - Action data (prediction, stake, etc.)
   * @param {Object} metadata - Additional metadata
   */
  store(agentId, marketId, action, data = null, metadata = {}) {
    const entryId = this._generateId();
    const timestamp = new Date().toISOString();

    // Initialize agent's memory store if needed
    if (!this.memoryStores.has(agentId)) {
      this.memoryStores.set(agentId, new Map());
    }

    const agentStore = this.memoryStores.get(agentId);
    if (!agentStore.has(marketId)) {
      agentStore.set(marketId, []);
    }
    const marketStore = agentStore.get(marketId);
    
    // Create entry
    const outcome = data?.outcome || null; // Outcome may be null initially
    const entry = new MemoryEntry(
      entryId,
      agentId,
      marketId,
      action,
      outcome,
      timestamp,
      {
        ...metadata,
        confidence: data?.confidence,
        prediction: data?.prediction,
        stake: data?.stake,
        impliedProbability: data?.impliedProbability
      }
    );

    marketStore.push(entry);
    
    // Enforce max entries limit (keep most recent)
    if (marketStore.length > this.maxEntriesPerMarket) {
      const removedCount = marketStore.length - this.maxEntriesPerMarket;
      marketStore.splice(0, removedCount);
      
      console.log(`[EpisodicMemory] Agent ${agentId} exceeded limit for market ${marketId}. Evicted ${removedCount} old entries.`);
    }

    // Emit store event
    this.emit('store', {
      agentId,
      marketId,
      entryId,
      action,
      timestamp
    });

    return entry;
  }

  /**
   * Retrieve memories for a specific market and agent
   * @param {string} agentId - Agent identifier
   * @param {string} marketId - Market identifier
   * @returns {Array} Array of memory entries
   */
  retrieve(agentId, marketId) {
    if (!this.memoryStores.has(agentId)) {
      return [];
    }

    const marketStore = this.memoryStores.get(agentId).get(marketId);
    
    if (!marketStore) {
      return [];
    }

    // Filter out expired entries
    const cutoffTime = Date.now() - (this.retentionDays * 24 * 60 * 60 * 1000);
    
    return marketStore.filter(entry => {
      if (entry._timestampNum === undefined) {
        entry._timestampNum = entry.timestamp ? Date.parse(entry.timestamp) : Date.now();
      }
      return entry._timestampNum >= cutoffTime;
    });
  }

  /**
   * Retrieve all memories for a specific agent (across all markets)
   * @param {string} agentId - Agent identifier
   * @returns {Array} Array of memory entries
   */
  retrieveAll(agentId) {
    if (!this.memoryStores.has(agentId)) {
      return [];
    }

    const allEntries = [];
    
    for (const entries of this.memoryStores.get(agentId).values()) {
      allEntries.push(...entries);
    }

    // Filter expired and sort by timestamp
    const cutoffTime = Date.now() - (this.retentionDays * 24 * 60 * 60 * 1000);
    
    return allEntries
      .filter(entry => {
        if (entry._timestampNum === undefined) {
          entry._timestampNum = entry.timestamp ? Date.parse(entry.timestamp) : Date.now();
        }
        return entry._timestampNum >= cutoffTime;
      })
      .sort((a, b) => a._timestampNum - b._timestampNum);
  }

  /**
   * Update memory with outcome (when market resolves)
   * @param {string} agentId - Agent identifier
   * @param {string} marketId - Market identifier
   * @param {Object} resolution - Resolution data
   */
  updateWithOutcome(agentId, marketId, resolution) {
    const agentStore = this.memoryStores.get(agentId)?.get(marketId);
    
    if (!agentStore || agentStore.length === 0) {
      console.log(`[EpisodicMemory] No memories found for agent ${agentId} on market ${marketId}`);
      return;
    }

    // Update most recent entry with outcome
    const latestEntry = agentStore[agentStore.length - 1];
    latestEntry.outcome = resolution.outcome;
    latestEntry.confidence = resolution.confidence || latestEntry.confidence;
    
    // Calculate accuracy
    if (latestEntry.prediction && latestEntry.action === 'forecast') {
      latestEntry.isCorrect = latestEntry.prediction === resolution.outcome;
      
      // Store accuracy metric
      this._setAccuracyMetric(agentId, marketId, {
        isCorrect: latestEntry.isCorrect,
        confidence: latestEntry.confidence
      });
    }

    console.log(`[EpisodicMemory] Updated outcome for agent ${agentId} on market ${marketId}: predicted ${latestEntry.prediction}, actual ${resolution.outcome}`);
    
    this.emit('outcome_updated', {
      agentId,
      marketId,
      prediction: latestEntry.prediction,
      outcome: resolution.outcome,
      isCorrect: latestEntry.isCorrect
    });
  }

  /**
   * Calculate accuracy metrics for an agent
   * @param {string} agentId - Agent identifier
   * @returns {Object|null} Accuracy metrics or null if insufficient data
   */
  calculateAccuracy(agentId) {
    const memories = this.retrieveAll(agentId);
    
    // Need at least 10 forecasts for meaningful accuracy
    const forecasts = memories.filter(m => 
      m.action === 'forecast' && 
      m.prediction && 
      m.outcome &&
      m.isCorrect !== undefined
    );

    if (forecasts.length < 5) {
      return null; // Not enough data
    }

    const correctPredictions = forecasts.filter(f => f.isCorrect).length;
    const accuracy = (correctPredictions / forecasts.length) * 100;
    
    // Calculate average confidence
    const confidences = forecasts.filter(f => f.confidence).map(f => f.confidence);
    const avgConfidence = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;

    return {
      agentId,
      accuracy,
      totalForecasts: forecasts.length,
      correctPredictions,
      averageConfidence: avgConfidence.toFixed(1),
      confidenceCalibration: this._estimateCalibration(forecasts)
    };
  }

  /**
   * Estimate confidence calibration for an agent
   * @param {Array} forecasts - Array of forecast memories
   * @returns {number|null} Calibration metric or null
   */
  _estimateCalibration(forecasts) {
    if (forecasts.length < 5) {
      return null;
    }

    // Compare predicted confidence vs actual accuracy for high-confidence forecasts
    const highConfidenceForecasts = forecasts.filter(f => f.confidence && f.confidence > 70);
    
    if (highConfidenceForecasts.length < 3) {
      return null;
    }

    const correctHighConfidence = highConfidenceForecasts.filter(f => f.isCorrect).length;
    const calibration = (correctHighConfidence / highConfidenceForecasts.length) * 100;

    return calibration.toFixed(1);
  }

  /**
   * Get all unique markets an agent has participated in
   * @param {string} agentId - Agent identifier
   * @returns {Array} Array of market IDs
   */
  getAgentMarkets(agentId) {
    const agentStore = this.memoryStores.get(agentId);
    
    if (!agentStore) {
      return [];
    }

    return Array.from(agentStore.keys());
  }

  /**
   * Get recent memories for performance dashboard
   * @param {string} agentId - Agent identifier
   * @param {number} limit - Number of entries to retrieve
   * @returns {Array} Recent memory entries
   */
  getRecentMemories(agentId, limit = 10) {
    const memories = this.retrieveAll(agentId);
    
    return memories.slice(-limit);
  }

  /**
   * Clear all memories (for testing or reset)
   */
  clear() {
    this.memoryStores.clear();
    console.log('[EpisodicMemory] All memories cleared');
  }

  /**
   * Get memory statistics
   * @returns {Object} Memory stats
   */
  getStats() {
    let totalEntries = 0;
    const agentsCount = this.memoryStores.size;
    
    for (const [, marketStores] of this.memoryStores.entries()) {
      for (const [, entries] of marketStores.entries()) {
        totalEntries += entries.length;
      }
    }

    return {
      agents: agentsCount,
      totalMarkets: agentsCount, // Each agent tracks their own markets
      totalEntries,
      maxEntriesPerMarket: this.maxEntriesPerMarket,
      retentionDays: this.retentionDays
    };
  }

  /**
   * Generate unique memory entry ID
   * @returns {string} Unique ID
   */
  _generateId() {
    this.globalCounter++;
    return `mem_${Date.now()}_${this.globalCounter}`;
  }

  /**
   * Set accuracy metric (internal use)
   * @param {string} agentId - Agent identifier
   * @param {string} marketId - Market identifier
   * @param {Object} metrics - Accuracy metrics object
   */
  _setAccuracyMetric(agentId, marketId, metrics) {
    const agentStore = this.memoryStores.get(agentId);
    if (!agentStore) {
      return;
    }
    const entries = agentStore.get(marketId);
    if (entries) {
      const latestEntry = entries[entries.length - 1];
      if (latestEntry) {
        latestEntry.accuracyMetrics = metrics;
      }
    }
  }

  /**
   * Check health of memory system
   * @returns {Object} Health status
   */
  checkHealth() {
    const stats = this.getStats();
    
    return {
      status: 'healthy',
      agents: stats.agents,
      totalEntries: stats.totalEntries,
      averageEntriesPerAgent: stats.agents > 0 ? Math.round(stats.totalEntries / stats.agents) : 0,
      memoryUsage: ((stats.totalEntries / (stats.agents * this.maxEntriesPerMarket)) * 100).toFixed(2) + '%'
    };
  }
}

/**
 * Module exports
 */
module.exports = { EpisodicMemory, MemoryEntry };
