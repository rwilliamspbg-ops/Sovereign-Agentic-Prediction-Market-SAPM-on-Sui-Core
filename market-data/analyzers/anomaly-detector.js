/**
 * Market Anomaly Detector
 * 
 * Detects manipulation patterns, wash trading, and anomalous market behavior
 * using statistical analysis and machine learning heuristics.
 * 
 * @module market-data/analyzers/anomaly-detector
 * @version 1.0.0
 */

const EventEmitter = require('events');

/**
 * Anomaly Detection Engine for prediction markets
 */
class AnomalyDetector extends EventEmitter {
  /**
   * Initialize anomaly detector
   * @param {Object} config - Configuration options
   * @param {number} [config.anomalyThreshold=0.8] - ML anomaly score threshold
   * @param {number} [config.priceMoveThreshold=0.1] - Price move percentage to flag
   * @param {number} [config.volumeSpikeThreshold=3] - Standard deviations for volume spike
   */
  constructor(config = {}) {
    super();
    
    this.anomalyThreshold = config.anomalyThreshold || 0.8;
    this.priceMoveThreshold = config.priceMoveThreshold || 0.1; // 10%
    this.volumeSpikeThreshold = config.volumeSpikeThreshold || 3; // 3σ
    
    // Statistical baselines (updated over time)
    this.baselines = new Map(); // marketId -> { meanPrice, stdPrice, meanVolume, stdVolume }
    
    // Recent events for pattern detection
    this.recentEvents = []; // Last 1000 events per market
    this.eventHistory = new Map(); // marketId -> event history
    
    // Known traders (whitelist)
    this.whitelistedTraders = new Set();
    
    // Detected anomalies queue
    this.anomalyQueue = [];
    this.maxAnomalyQueueSize = 1000;
    
    // ML model for anomaly scoring
    this.mlModel = new AnomalyMlModel(this.anomalyThreshold);
    
    console.log('[AnomalyDetector] Initialized');
  }

  /**
   * Record a market event for analysis
   * @param {string} marketId - Market identifier
   * @param {Object} event - Event data
   */
  recordEvent(marketId, event) {
    const eventType = event.type || 'unknown';
    const timestamp = event.timestamp || new Date().toISOString();

    // Initialize baseline if needed
    if (!this.baselines.has(marketId)) {
      this._initializeBaseline(marketId);
    }

    const baseline = this.baselines.get(marketId);
    
    // Update moving average (exponential smoothing)
    const alpha = 0.1; // Smoothing factor
    if (baseline.priceValues.length > 0) {
      baseline.meanPrice = alpha * event.price + (1 - alpha) * baseline.meanPrice;
      baseline.priceValues.push(event.price);
      
      // Keep last 100 values
      if (baseline.priceValues.length > 100) {
        baseline.priceValues.shift();
      }
    }

    // Update volume statistics
    if (event.size) {
      const currentVolume = baseline.volumeValues ? 
        baseline.volumeValues.reduce((sum, v) => sum + v, 0) : 0;
      
      baseline.meanVolume = alpha * event.size + (1 - alpha) * baseline.meanVolume;
      baseline.volumeValues.push(event.size);
      
      if (baseline.volumeValues.length > 100) {
        baseline.volumeValues.shift();
      }
    }

    // Store recent event
    const marketEvents = this.eventHistory.get(marketId) || [];
    marketEvents.push({
      timestamp,
      type: eventType,
      price: event.price,
      size: event.size,
      trader: event.trader || null
    });

    if (marketEvents.length > 1000) {
      marketEvents.shift();
    }

    this.eventHistory.set(marketId, marketEvents);
    
    // Check for anomalies
    this._checkForAnomalies(marketId, event);
  }

  /**
   * Initialize statistical baseline for a market
   * @param {string} marketId - Market identifier
   */
  _initializeBaseline(marketId) {
    const initialPrice = 50; // Neutral starting price
    this.baselines.set(marketId, {
      meanPrice: initialPrice,
      stdPrice: 2, // Initial standard deviation estimate
      priceValues: [],
      volumeValues: [],
      firstRecorded: new Date().toISOString()
    });
  }

  /**
   * Check for various anomaly patterns
   * @param {string} marketId - Market identifier
   * @param {Object} event - Event to analyze
   */
  _checkForAnomalies(marketId, event) {
    const anomalies = [];
    
    // 1. Price movement anomaly
    const priceAnomaly = this._detectPriceAnomaly(marketId, event);
    if (priceAnomaly) {
      anomalies.push(priceAnomaly);
    }

    // 2. Volume spike detection
    const volumeAnomaly = this._detectVolumeSpike(marketId, event);
    if (volumeAnomaly) {
      anomalies.push(volumeAnomaly);
    }

    // 3. Wash trading pattern detection
    const washTrade = this._detectWashTrading(marketId, event);
    if (washTrade) {
      anomalies.push(washTrade);
    }

    // 4. Coordinated manipulation
    const coordination = this._detectCoordinatedManipulation(marketId, event);
    if (coordination) {
      anomalies.push(coordination);
    }

    // Emit anomaly events
    anomalies.forEach(anomaly => {
      anomaly.marketId = marketId;
      anomaly.timestamp = new Date().toISOString();
      
      this.anomalyQueue.push(anomaly);
      
      // Maintain queue size
      if (this.anomalyQueue.length > this.maxAnomalyQueueSize) {
        this.anomalyQueue.shift();
      }

      // Emit alert
      this.emit('anomaly', anomaly);
    });
  }

  /**
   * Detect price movement anomalies
   * @param {string} marketId - Market identifier
   * @param {Object} event - Event data
   * @returns {Object|null} Anomaly report or null
   */
  _detectPriceAnomaly(marketId, event) {
    const baseline = this.baselines.get(marketId);
    
    if (!baseline || !baseline.priceValues.length) {
      return null;
    }

    // Calculate current price deviation from mean
    const currentPrice = event.price;
    const priceDeviation = Math.abs(currentPrice - baseline.meanPrice);
    const priceStdEstimate = baseline.stdPrice;
    
    // Z-score calculation
    const zScore = priceDeviation / (priceStdEstimate + 0.1); // Avoid division by zero
    
    if (zScore > this.volumeSpikeThreshold) {
      return {
        type: 'price_movement',
        severity: zScore > 4 ? 'critical' : zScore > 3 ? 'high' : 'medium',
        deviationPercent: ((currentPrice - baseline.meanPrice) / baseline.meanPrice) * 100,
        zScore,
        message: `Price moved ${zScore.toFixed(2)}σ from mean (${((currentPrice - baseline.meanPrice) / baseline.meanPrice * 100).toFixed(2)}%)`
      };
    }

    return null;
  }

  /**
   * Detect volume spike anomalies
   * @param {string} marketId - Market identifier
   * @param {Object} event - Event data
   * @returns {Object|null} Anomaly report or null
   */
  _detectVolumeSpike(marketId, event) {
    const baseline = this.baselines.get(marketId);
    
    if (!baseline || !baseline.volumeValues.length) {
      return null;
    }

    // Calculate volume deviation from mean
    const currentVolume = event.size;
    const volumeDeviation = Math.abs(currentVolume - baseline.meanVolume);
    const volumeStdEstimate = baseline.stdPrice * 2; // Proxy for volume std dev
    
    const zScore = volumeDeviation / (volumeStdEstimate + 1);
    
    if (zScore > this.volumeSpikeThreshold) {
      return {
        type: 'volume_spike',
        severity: zScore > 4 ? 'critical' : zScore > 3 ? 'high' : 'medium',
        deviationPercent: ((currentVolume - baseline.meanVolume) / baseline.meanVolume) * 100,
        zScore,
        message: `Volume spiked ${zScore.toFixed(2)}σ from mean (${((currentVolume - baseline.meanVolume) / baseline.meanVolume * 100).toFixed(2)}%)`
      };
    }

    return null;
  }

  /**
   * Detect wash trading patterns
   * @param {string} marketId - Market identifier
   * @param {Object} event - Event data
   * @returns {Object|null} Anomaly report or null
   */
  _detectWashTrading(marketId, event) {
    const trader = event.trader;
    
    if (!trader || this.whitelistedTraders.has(trader)) {
      return null; // Whitelisted traders can't be flagged
    }

    const recentEvents = this.eventHistory.get(marketId) || [];
    const recentTraderEvents = recentEvents.filter(e => e.trader === trader && e.size > 100);
    
    if (recentTraderEvents.length < 3) {
      return null; // Need pattern of multiple trades
    }

    // Check for circular trading (same addresses)
    const uniqueTraders = new Set(recentTraderEvents.map(e => e.trader));
    
    if (uniqueTraders.size < 2 && recentTraderEvents.length > 5) {
      return {
        type: 'wash_trading',
        severity: 'critical',
        trader,
        tradeCount: recentTraderEvents.length,
        message: `Suspected wash trading: ${recentTraderEvents.length} trades from single address`
      };
    }

    return null;
  }

  /**
   * Detect coordinated manipulation
   * @param {string} marketId - Market identifier
   * @param {Object} event - Event data
   * @returns {Object|null} Anomaly report or null
   */
  _detectCoordinatedManipulation(marketId, event) {
    const recentEvents = this.eventHistory.get(marketId) || [];
    
    // Check for rapid coordinated trades (same direction, short time window)
    const recentYesTrades = recentEvents.filter(e => 
      e.type === 'trade' && e.outcome === 'yes' && e.size > 100
    ).slice(-20);

    if (recentYesTrades.length < 5) {
      return null; // Need minimum trades to analyze
    }

    // Check for time clustering
    const firstTime = new Date(recentYesTrades[0].timestamp).getTime();
    const lastTime = new Date(recentYesTrades[recentYesTrades.length - 1].timestamp).getTime();
    const timeSpan = (lastTime - firstTime) / 1000; // seconds
    
    if (timeSpan < 60 && recentYesTrades.length > 10) { // > 10 trades in < 1 minute
      return {
        type: 'coordinated_manipulation',
        severity: 'critical',
        tradeCount: recentYesTrades.length,
        timeWindowSeconds: timeSpan.toFixed(2),
        message: `Coordinated attack detected: ${recentYesTrades.length} trades in ${timeSpan.toFixed(1)}s`
      };
    }

    return null;
  }

  /**
   * Calculate anomaly score using ML model
   * @param {string} marketId - Market identifier
   * @param {Object} event - Event to analyze
   * @returns {number} Anomaly score (0-1)
   */
  calculateAnomalyScore(marketId, event) {
    const features = this._extractFeatures(marketId, event);
    
    if (!features) {
      return 0;
    }

    return this.mlModel.predict(features);
  }

  /**
   * Extract features for ML model
   * @param {string} marketId - Market identifier
   * @param {Object} event - Event data
   * @returns {Array|null} Feature vector or null
   */
  _extractFeatures(marketId, event) {
    const baseline = this.baselines.get(marketId);
    
    if (!baseline || !baseline.priceValues.length) {
      return null;
    }

    const features = [];

    // Normalize price deviation
    if (baseline.meanPrice && baseline.stdPrice) {
      features.push(Math.abs(event.price - baseline.meanPrice) / baseline.stdPrice);
    } else {
      features.push(0);
    }

    // Normalize volume deviation
    if (baseline.meanVolume) {
      features.push(Math.abs(event.size - baseline.meanVolume) / (baseline.meanVolume + 1));
    } else {
      features.push(0);
    }

    // Time of day feature (simplified)
    const hour = new Date().getHours();
    features.push(hour / 24); // Normalize to 0-1

    return features;
  }

  /**
   * Get recent anomalies for review
   * @param {number} limit - Number of anomalies to retrieve
   * @returns {Array} Recent anomalies
   */
  getRecentAnomalies(limit = 10) {
    return this.anomalyQueue.slice(-limit);
  }

  /**
   * Clear anomaly queue
   */
  clearAnomalyQueue() {
    this.anomalyQueue = [];
  }

  /**
   * Whitelist a trader address
   * @param {string} trader - Trader identifier/address
   */
  whitelistTrader(trader) {
    this.whitelistedTraders.add(trader);
    console.log(`[AnomalyDetector] Whitelisted trader: ${trader}`);
  }

  /**
   * Reset statistical baselines
   */
  resetBaselines() {
    for (const [marketId, baseline] of this.baselines) {
      baseline.priceValues = [];
      baseline.volumeValues = [];
      baseline.meanPrice = 50;
      baseline.meanVolume = 0;
    }
    
    console.log('[AnomalyDetector] Baselines reset');
  }

  /**
   * Get anomaly detection health status
   * @returns {Object} Health status
   */
  getHealthStatus() {
    return {
      marketsMonitored: this.baselines.size,
      recentAnomalies: this.anomalyQueue.length,
      whitelistedTraders: this.whitelistedTraders.size,
      lastCheck: new Date().toISOString()
    };
  }
}

/**
 * Simple ML model for anomaly scoring (naive Bayes-inspired)
 */
class AnomalyMlModel {
  /**
   * Initialize ML model with threshold
   * @param {number} threshold - Classification threshold (0-1)
   */
  constructor(threshold = 0.8) {
    this.threshold = threshold;
    // Simple feature weights for anomaly detection
    this.featureWeights = [0.5, 0.3, 0.2]; // Price deviation, volume deviation, time
  }

  /**
   * Predict anomaly score
   * @param {Array} features - Feature vector
   * @returns {number} Anomaly score (0-1)
   */
  predict(features) {
    if (!features || features.length !== this.featureWeights.length) {
      return 0;
    }

    // Weighted sum of normalized features
    let score = 0;
    let weightSum = 0;

    for (let i = 0; i < features.length; i++) {
      const weightedFeature = features[i] * this.featureWeights[i];
      score += weightedFeature;
      weightSum += this.featureWeights[i];
    }

    // Normalize by weight sum
    return Math.min(Math.max(score / weightSum, 0), 1);
  }
}

/**
 * Module exports
 */
module.exports = { AnomalyDetector, AnomalyMlModel };
