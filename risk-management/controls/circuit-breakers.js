/**
 * Circuit Breakers for Risk Control
 * Implements price movement thresholds, volume spike detection, and anomaly monitoring
 */

class CircuitBreaker {
  constructor(config = {}) {
    this.name = config.name || 'default';
    this.enabled = config.enabled !== false; // Default enabled
    
    // Price movement thresholds (configurable)
    this.priceThresholds = {
      tenPercent: config.priceThresholds?.tenPercent ?? true,
      twentyPercent: config.priceThresholds?.twentyPercent ?? true,
      thirtyPercent: config.priceThresholds?.thirtyPercent ?? true,
      tenPercentValue: config.priceThresholds?.tenPercentValue ?? 0.10,
      twentyPercentValue: config.priceThresholds?.twentyPercentValue ?? 0.20,
      thirtyPercentValue: config.priceThresholds?.thirtyPercentValue ?? 0.30,
    };
    
    // Volume spike detection (3σ from mean)
    this.volumeSpikes = {
      enabled: config.volumeSpikes?.enabled ?? true,
      sigma: config.volumeSpikes?.sigma ?? 3.0,
      windowSize: config.volumeSpikes?.windowSize ?? 100, // samples
      currentVolumeHistory: [],
      meanVolume: 0,
      stdDevVolume: 0,
    };
    
    // Anomaly detection thresholds
    this.anomalyDetection = {
      enabled: config.anomalyDetection?.enabled ?? true,
      anomalyScoreThreshold: config.anomalyDetection?.anomalyScoreThreshold ?? 0.9,
      modelConfig: config.anomalyDetection?.modelConfig ?? {},
    };
    
    // State
    this.state = {
      active: true,
      lastTriggerTime: null,
      triggerCount: 0,
      cooldownPeriod: config.cooldownPeriod ?? 300000, // 5 minutes in ms
      isCooldown: false,
    };
    
    // Event listeners
    this.listeners = {
      onCircuitOpen: [],
      onCircuitClose: [],
      onPriceThreshold: [],
      onVolumeSpike: [],
      onAnomalyDetected: [],
    };
  }

  /**
   * Check if circuit breaker should open based on price movement
   */
  checkPriceMovement(currentPrice, previousPrice) {
    if (!this.enabled || !this.state.active) return null;
    
    const priceChange = Math.abs((currentPrice - previousPrice) / previousPrice);
    const pricePercentChange = priceChange * 100;
    
    // Check thresholds in order of severity
    for (const [thresholdName, thresholdEnabled] of Object.entries(this.priceThresholds)) {
      if (!thresholdEnabled || !this.state.active) continue;
      
      if (this.priceThresholds[`${thresholdName}Value`]) {
        const value = this.priceThresholds[`${thresholdName}Value`];
        if (pricePercentChange >= value) {
          this.triggerCircuitOpen(`${thresholdName.toUpperCase()} price threshold exceeded: ${pricePercentChange.toFixed(2)}%`);
          return {
            triggered: true,
            reason: `${thresholdName.toUpperCase()} Price Movement`,
            severity: 'high',
            currentPrice,
            previousPrice,
            changePercent: pricePercentChange,
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Check if volume spike detected (3σ from mean)
   */
  checkVolumeSpike(currentVolume) {
    if (!this.enabled || !this.volumeSpikes.enabled || !this.state.active) return null;
    
    // Add to history
    this.volumeSpikes.currentVolumeHistory.push(currentVolume);
    
    // Maintain window size
    if (this.volumeSpikes.currentVolumeHistory.length > this.volumeSpikes.windowSize) {
      this.volumeSpikes.currentVolumeHistory.shift();
    }
    
    // Calculate mean and std dev
    const history = this.volumeSpikes.currentVolumeHistory;
    if (history.length < 10) return null; // Need enough samples
    
    const mean = this.calculateMean(history);
    const stdDev = this.calculateStdDev(history);
    
    if (stdDev === 0 || stdDev === Infinity) return null;
    
    // Calculate z-score
    const zScore = (currentVolume - mean) / stdDev;
    
    if (Math.abs(zScore) > this.volumeSpikes.sigma) {
      this.triggerCircuitOpen(`Volume spike detected: ${currentVolume.toLocaleString()} vs mean ${mean.toLocaleString()} (${(zScore * 100).toFixed(1)}σ)`);
      return {
        triggered: true,
        reason: 'VOLUME SPIKE DETECTED',
        severity: 'high',
        currentVolume,
        meanVolume: mean,
        stdDevVolume: stdDev,
        zScore,
      };
    }
    
    // Update running stats
    this.volumeSpikes.meanVolume = mean;
    this.volumeSpikes.stdDevVolume = stdDev;
    
    return null;
  }

  /**
   * Check anomaly score against threshold
   */
  checkAnomaly(anomalyScore) {
    if (!this.enabled || !this.anomalyDetection.enabled || !this.state.active) return null;
    
    if (anomalyScore >= this.anomalyDetection.anomalyScoreThreshold) {
      this.triggerCircuitOpen(`Anomaly detected: score ${(anomalyScore * 100).toFixed(2)}% exceeds threshold ${(this.anomalyDetection.anomalyScoreThreshold * 100).toFixed(2)}%`);
      return {
        triggered: true,
        reason: 'ANOMALY DETECTED',
        severity: 'critical',
        anomalyScore,
        threshold: this.anomalyDetection.anomalyScoreThreshold,
      };
    }
    
    return null;
  }

  /**
   * Calculate mean of array
   */
  calculateMean(array) {
    if (array.length === 0) return 0;
    const sum = array.reduce((a, b) => a + b, 0);
    return sum / array.length;
  }

  /**
   * Calculate standard deviation
   */
  calculateStdDev(array, mean) {
    if (array.length < 2 || !mean) return 0;
    
    const variance = array.reduce((sum, val) => 
      sum + Math.pow(val - mean, 2), 0
    ) / array.length;
    
    return Math.sqrt(variance);
  }

  /**
   * Trigger circuit open state
   */
  triggerCircuitOpen(reason) {
    this.state.active = false;
    this.state.lastTriggerTime = new Date().toISOString();
    this.state.triggerCount++;
    this.state.isCooldown = true;
    
    console.log(`[${this.name}] Circuit breaker OPENED: ${reason}`);
    console.log(`  Trigger count: ${this.state.triggerCount}`);
    console.log(`  Cooldown period: ${(this.state.cooldownPeriod / 1000).toFixed(0)}s`);
    
    // Notify listeners
    this.listeners.onCircuitOpen.forEach(cb => cb({ reason, timestamp: new Date() }));
    
    return {
      status: 'OPEN',
      reason,
      timestamp: new Date(),
      triggerCount: this.state.triggerCount,
    };
  }

  /**
   * Check if circuit is in cooldown period
   */
  isInCooldown() {
    if (!this.state.isCooldown) return false;
    
    const elapsed = Date.now() - new Date(this.state.lastTriggerTime).getTime();
    const remaining = this.state.cooldownPeriod - elapsed;
    
    if (remaining > 0) {
      console.log(`[${this.name}] Circuit breaker in cooldown: ${(remaining / 1000).toFixed(2)}s remaining`);
      return true;
    } else {
      this.resetCooldown();
      return false;
    }
  }

  /**
   * Reset cooldown period
   */
  resetCooldown() {
    this.state.isCooldown = false;
    console.log(`[${this.name}] Circuit breaker cooldown reset`);
  }

  /**
   * Check overall circuit status
   */
  checkOverallStatus(currentPrice, previousPrice, currentVolume, anomalyScore) {
    let trigger = null;
    
    // Check price movement
    if (this.enabled && this.priceThresholds.tenPercent) {
      trigger = this.checkPriceMovement(currentPrice, previousPrice);
      if (trigger) return trigger;
    }
    
    // Check volume spike
    if (this.enabled && this.volumeSpikes.enabled) {
      trigger = this.checkVolumeSpike(currentVolume);
      if (trigger) return trigger;
    }
    
    // Check anomaly detection
    if (this.enabled && this.anomalyDetection.enabled) {
      trigger = this.checkAnomaly(anomalyScore);
      if (trigger) return trigger;
    }
    
    return null;
  }

  /**
   * Add event listener
   */
  on(eventType, callback) {
    if (this.listeners[eventType]) {
      this.listeners[eventType].push(callback);
    }
  }

  /**
   * Get circuit breaker status
   */
  getStatus() {
    return {
      name: this.name,
      enabled: this.enabled,
      state: {
        active: this.state.active,
        isCooldown: this.state.isCooldown,
        lastTriggerTime: this.state.lastTriggerTime,
        triggerCount: this.state.triggerCount,
      },
      config: {
        priceThresholds: this.priceThresholds,
        volumeSpikes: this.volumeSpikes,
        anomalyDetection: this.anomalyDetection,
      },
    };
  }

  /**
   * Reset circuit breaker (for testing)
   */
  reset() {
    this.state.active = true;
    this.state.lastTriggerTime = null;
    this.state.triggerCount = 0;
    this.state.isCooldown = false;
    this.volumeSpikes.currentVolumeHistory = [];
    this.volumeSpikes.meanVolume = 0;
    this.volumeSpikes.stdDevVolume = 0;
    console.log(`[${this.name}] Circuit breaker RESET`);
  }
}

/**
 * Create and export circuit breakers instance
 */
class RiskControls {
  constructor(config = {}) {
    this.circuitBreakers = new Map();
    
    // Default configuration
    this.defaultConfig = {
      enabled: true,
      cooldownPeriod: 300000, // 5 minutes
    };
    
    // Initialize circuit breakers
    this.initializeCircuitBreakers(config);
  }

  /**
   * Initialize circuit breakers with configuration
   */
  initializeCircuitBreakers(config = {}) {
    const cbConfig = config.cb ?? {};
    
    // Create main circuit breaker
    this.circuitBreakers.set('main', new CircuitBreaker({
      name: 'main',
      enabled: cbConfig.enabled !== false,
      cooldownPeriod: cbConfig.cooldownPeriod ?? 300000,
      priceThresholds: {
        tenPercent: true,
        twentyPercent: true,
        thirtyPercent: true,
        tenPercentValue: cbConfig.thresholds?.tenPercent ?? 0.10,
        twentyPercentValue: cbConfig.thresholds?.twentyPercent ?? 0.20,
        thirtyPercentValue: cbConfig.thresholds?.thirtyPercent ?? 0.30,
      },
      volumeSpikes: {
        enabled: cbConfig.volumeSpikes ?? true,
        sigma: cbConfig.volumeSpikesSigma ?? 3.0,
        windowSize: cbConfig.volumeWindowSize ?? 100,
      },
      anomalyDetection: {
        enabled: cbConfig.anomalyDetection ?? true,
        anomalyScoreThreshold: cbConfig.anomalyScoreThreshold ?? 0.9,
      },
    }));

    // Create per-market circuit breakers
    if (cbConfig.perMarket) {
      for (const market of cbConfig.perMarket) {
        this.circuitBreakers.set(market.name, new CircuitBreaker({
          name: `market-${market.name}`,
          enabled: market.enabled !== false,
          priceThresholds: {
            tenPercentValue: market.priceThreshold?.tenPercent ?? 0.10,
            twentyPercentValue: market.priceThreshold?.twentyPercent ?? 0.20,
            thirtyPercentValue: market.priceThreshold?.thirtyPercent ?? 0.30,
          },
        }));
      }
    }
  }

  /**
   * Check all circuit breakers for a market
   */
  checkMarket(marketId, currentPrice, previousPrice, currentVolume, anomalyScore) {
    const mainBreaker = this.circuitBreakers.get('main');
    
    if (!mainBreaker || !mainBreaker.enabled) return null;
    
    // Check cooldown status first
    if (mainBreaker.isInCooldown()) {
      return {
        status: 'COOLDOWN',
        marketId,
        reason: 'Circuit breaker in cooldown period',
        timestamp: new Date(),
      };
    }
    
    // Check all breakers
    let trigger = null;
    
    // Main breaker check
    trigger = mainBreaker.checkOverallStatus(
      currentPrice, 
      previousPrice, 
      currentVolume, 
      anomalyScore
    );
    
    if (trigger) {
      trigger.marketId = marketId;
    }
    
    return trigger;
  }

  /**
   * Get all circuit breaker statuses
   */
  getAllStatuses() {
    const statuses = [];
    
    for (const [name, breaker] of this.circuitBreakers) {
      statuses.push({
        name,
        ...breaker.getStatus(),
      });
    }
    
    return statuses;
  }

  /**
   * Reset all circuit breakers (for testing)
   */
  resetAll() {
    for (const breaker of this.circuitBreakers.values()) {
      breaker.reset();
    }
    console.log('All circuit breakers RESET');
  }
}

/**
 * Export singleton instance with default configuration
 */
const riskControls = new RiskControls({
  cb: {
    enabled: true,
    cooldownPeriod: 300000,
    thresholds: {
      tenPercent: 0.10,
      twentyPercent: 0.20,
      thirtyPercent: 0.30,
    },
    volumeSpikes: true,
    volumeSpikesSigma: 3.0,
    anomalyDetection: true,
    anomalyScoreThreshold: 0.9,
  },
});

module.exports = {
  CircuitBreaker,
  RiskControls,
  riskControls,
};
