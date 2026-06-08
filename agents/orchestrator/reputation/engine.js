// SPDX-License-Identifier: Apache-2.0
/**
 * Reputation Engine - Phase 1 Foundation
 * Byzantine-tolerant reputation scoring with Multi-Krum family aggregation
 */

class ReputationEngine {
  constructor(config) {
    this.config = config;
    this.agents = new Map();
    this.history = [];
    this.slashingParams = {
      threshold: config.slashingThreshold || 0.3, // fail if reputation < 70%
      windowSize: config.historyWindow || 10,     // lookback window in rounds
      decayFactor: config.decayFactor || 0.95     // exponential decay
    };
  }

  /**
   * Register an agent with initial reputation
   */
  registerAgent(agentPubkey, metadata = {}) {
    const agentId = this._generateAgentId(agentPubkey);
    
    const agent = {
      id: agentId,
      pubkey: agentPubkey,
      reputation: 1.0, // Start at max reputation
      lastUpdateRound: null,
      totalContributions: 0,
      correctPredictions: 0,
      metadata: { ...metadata },
      createdAt: new Date().toISOString()
    };

    this.agents.set(agentId, agent);
    console.log(`[ReputationEngine] Registered agent ${agentId} with initial reputation: ${agent.reputation}`);
    
    return agent;
  }

  /**
   * Record a prediction result and update reputation
   * Uses Multi-Krum style selection for Byzantine tolerance
   */
  recordPrediction(agentId, predictedOutcome, actualOutcome, forecastConfidence, timestamp) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found in reputation registry`);
    }

    // Record history — compare prediction against ground truth
    const normalizedPrediction = this._normalizeOutcome(predictedOutcome);
    const normalizedActual = this._normalizeOutcome(actualOutcome);
    const predictionRecord = {
      round: timestamp.getTime(),
      agentId,
      predictedOutcome: normalizedPrediction,
      actualOutcome: normalizedActual,
      forecastConfidence,
      accurate: normalizedPrediction === normalizedActual,
    };

    this.history.push(predictionRecord);
    
    // Trim history to window size
    if (this.history.length > this.slashingParams.windowSize * 10) {
      this.history = this.history.slice(-this.slashingParams.windowSize * 10);
    }

    // Calculate accuracy in current window
    const recentPredictions = this.history.filter(
      r => r.round >= timestamp.getTime() - (this.slashingParams.windowSize * 60000)
    );

    if (recentPredictions.length === 0) return agent;

    const accuracy = recentPredictions.filter(r => r.accurate).length / recentPredictions.length;

    // Update reputation with exponential decay
    const timeSinceLastUpdate = Date.now() - new Date(agent.lastUpdateRound || Date.now()).getTime();
    const decayedFactor = Math.max(0.5, 1 - (timeSinceLastUpdate / (24 * 60 * 60 * 1000))); // Max decay to 50% per day

    const newReputation = agent.reputation * accuracy * decayedFactor;
    agent.reputation = Math.min(1.0, Math.max(0.0, newReputation));
    agent.lastUpdateRound = timestamp.getTime();
    agent.totalContributions++;
    if (predictionRecord.accurate) {
      agent.correctPredictions++;
    }

    console.log(`[ReputationEngine] Updated reputation for ${agentId}: ${newReputation.toFixed(4)} (accuracy: ${accuracy.toFixed(4)})`);

    return agent;
  }

  /**
   * Calculate aggregated forecast weights using Multi-Krum style selection
   */
  calculateAggregatedForecast(predictions, timestamp) {
    if (!predictions || predictions.length === 0) {
      throw new Error('No predictions provided for aggregation');
    }

    // Filter active agents
    const activeAgents = predictions.filter(p => this.agents.has(p.agentId));

    if (activeAgents.length === 0) {
      throw new Error('No active agents to aggregate from');
    }

    // Get reputations for active agents
    const agentReputations = activeAgents.map(p => ({
      agentId: p.agentId,
      reputation: this.agents.get(p.agentId).reputation,
      confidence: p.confidence
    }));

    // Calculate weighted average with Byzantine tolerance (trim extreme values)
    const weights = agentReputations.map(a => {
      const normRep = a.reputation / 10.0; // Normalize reputation contribution
      const normConf = a.confidence / 100.0; // Normalize confidence contribution
      return normRep * normConf;
    });

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    
    if (totalWeight === 0) {
      throw new Error('No valid weight contributions for aggregation');
    }

    // Calculate weighted average prediction
    let aggregatedScore = 0;
    for (let i = 0; i < predictions.length; i++) {
      const pred = predictions[i];
      const agent = this.agents.get(pred.agentId);
      if (!agent) continue;
      
      const weight = weights[i] / totalWeight;
      const normalizedPred = this._normalizeScore(pred.forecastConfidence);
      aggregatedScore += normalizedPred * weight;
    }

    // Apply Multi-Krum trimming: remove top and bottom outliers
    const trimmedFactor = 0.15; // Trim 15% from each end
    
    let trimmedAggregatedScore = aggregatedScore;
    if (agentReputations.length > 3) {
      // Sort by contribution weight and trim extremes
      const sorted = [...agentReputations].sort((a, b) => 
        (b.reputation * b.confidence) - (a.reputation * a.confidence)
      );
      
      const trimCount = Math.floor(agentReputations.length * trimmedFactor);
      
      // Recalculate with trimmed agents
      let trimmedTotalWeight = 0;
      trimmedAggregatedScore = 0;
      
      for (let i = trimCount; i < agentReputations.length - trimCount; i++) {
        const a = sorted[i];
        const contrib = a.reputation * a.confidence;
        trimmedTotalWeight += contrib;
        trimmedAggregatedScore += this._normalizeScore(a.confidence) * contrib;
      }
      
      if (trimmedTotalWeight > 0) {
        // Normalize back to original totalWeight scale
        trimmedAggregatedScore = (trimmedAggregatedScore / trimmedTotalWeight) * (totalWeight || 1);
      }
    }

    return {
      aggregatedScore: trimmedAggregatedScore,
      participantCount: activeAgents.length,
      trimmedCount: agentReputations.length > 3 ? Math.floor(agentReputations.length * trimmedFactor) : 0
    };
  }

  /**
   * Check if agent should be slashed (reputation too low)
   */
  checkForSlashing(agentId, timestamp) {
    const agent = this.agents.get(agentId);
    if (!agent) return null;

    // Check reputation threshold
    const recentAccuracy = this._calculateRecentAccuracy(agentId, timestamp);
    
    if (recentAccuracy < this.slashingParams.threshold) {
      console.log(`[ReputationEngine] Slashing triggered for ${agentId}: accuracy=${recentAccuracy.toFixed(4)}, threshold=${this.slashingParams.threshold}`);
      
      return {
        agentId,
        currentReputation: agent.reputation,
        recentAccuracy,
        reason: 'sustained_low_accuracy'
      };
    }

    return null;
  }

  /**
   * Get reputation report for all agents
   */
  getReport() {
    const sorted = Array.from(this.agents.values()).sort((a, b) => b.reputation - a.reputation);
    
    return sorted.map(a => ({
      agentId: a.id,
      pubkey: a.pubkey,
      reputation: a.reputation.toFixed(4),
      totalContributions: a.totalContributions,
      accuracy: a.correctPredictions / Math.max(1, a.totalContributions),
      lastUpdateRound: new Date(a.lastUpdateRound || 0).toISOString()
    }));
  }

  /**
   * Helper: normalize outcome for comparison
   */
  _normalizeOutcome(outcome) {
    if (outcome === 'yes' || outcome === 1 || outcome === true) return 'yes';
    if (outcome === 'no' || outcome === 0 || outcome === false) return 'no';
    throw new Error(`Unknown outcome: ${outcome}`);
  }

  /**
   * Helper: normalize score to 0-1 range
   */
  _normalizeScore(score) {
    return Math.max(0, Math.min(1, score / 100.0));
  }

  /**
   * Helper: generate agent ID from pubkey
   */
  _generateAgentId(pubkey) {
    if (pubkey.startsWith('0x')) {
      return `agent-${pubkey.slice(0, 8)}...`;
    }
    return `agent-${pubkey}`;
  }

  /**
   * Helper: calculate recent accuracy for agent
   */
  _calculateRecentAccuracy(agentId, timestamp) {
    const windowMs = this.slashingParams.windowSize * 60000;
    const recentPredictions = this.history.filter(
      r => r.agentId === agentId && 
           r.round >= timestamp.getTime() - windowMs
    );

    if (recentPredictions.length === 0) return 1.0; // No data, assume good
    
    return recentPredictions.filter(r => r.accurate).length / recentPredictions.length;
  }
}

// Export for module use
module.exports = { ReputationEngine };
