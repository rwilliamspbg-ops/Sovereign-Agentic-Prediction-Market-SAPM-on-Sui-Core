// SPDX-License-Identifier: Apache-2.0
/**
 * Agent Reputation Tracking System
 * Monitors agent forecast accuracy and updates reputation scores
 */

class ReputationTracker {
  constructor() {
    this.agentScores = new Map();  // agent_id -> reputation_score
    this.agentStats = new Map();   // agent_id -> { reports, correct, slashes }
    this.edgeHistory = new Map();  // agent_id -> [edge values]
    this.MIN_REPUTATION = 50;      // Minimum to participate
    this.MAX_REPUTATION = 100;
  }

  /**
   * Register a new agent
   */
  registerAgent(agentId, initialReputation = 50) {
    this.agentScores.set(agentId, initialReputation);
    this.agentStats.set(agentId, {
      totalReports: 0,
      correctReports: 0,
      slashCount: 0,
      lastUpdated: Date.now(),
    });
    this.edgeHistory.set(agentId, []);
    
    return {
      agentId,
      reputation: initialReputation,
      message: 'Agent registered',
    };
  }

  /**
   * Adjust reputation directly for consensus-stage feedback loops.
   */
  adjustReputation(agentId, delta) {
    if (!this.agentScores.has(agentId)) {
      this.registerAgent(agentId);
    }
    const current = this.agentScores.get(agentId);
    const next = Math.max(0, Math.min(this.MAX_REPUTATION, current + Number(delta || 0)));
    this.agentScores.set(agentId, next);
    return next;
  }

  /**
   * Record a forecast report and update reputation
   */
  recordReport(agentId, forecast, actualOutcome, confidence) {
    if (!this.agentScores.has(agentId)) {
      this.registerAgent(agentId);
    }

    const edge = Math.abs(forecast - actualOutcome);
    const wasCorrect = edge < 0.05;  // Within 5% is correct

    // Store in history
    const history = this.edgeHistory.get(agentId);
    history.push(edge);
    if (history.length > 1000) history.shift();  // Keep last 1000

    // Update stats
    const stats = this.agentStats.get(agentId);
    stats.totalReports++;
    if (wasCorrect) stats.correctReports++;
    stats.lastUpdated = Date.now();

    // Update reputation
    let reputation = this.agentScores.get(agentId);

    if (wasCorrect) {
      // Reward accuracy
      const accuracyBonus = Math.min(5, confidence / 20);  // Up to 5 points
      reputation = Math.min(this.MAX_REPUTATION, reputation + accuracyBonus);
    } else {
      // Penalize inaccuracy (harsher for high confidence wrong forecasts)
      const accuracyPenalty = 2 + (confidence / 20);  // 2-7 points
      reputation = Math.max(0, reputation - accuracyPenalty);
    }

    this.agentScores.set(agentId, reputation);

    // Detect Byzantine behavior (consistent poor performance)
    if (this.isByzantineAgent(agentId)) {
      stats.slashCount++;
      reputation = Math.max(0, reputation - 15);  // Slash penalty
      this.agentScores.set(agentId, reputation);
      
      return {
        agentId,
        reputation,
        status: 'SLASHED',
        reason: 'Byzantine behavior detected',
        slashCount: stats.slashCount,
      };
    }

    return {
      agentId,
      reputation,
      status: wasCorrect ? 'REWARDED' : 'PENALIZED',
      edge: edge.toFixed(4),
      accuracy: (stats.correctReports / stats.totalReports * 100).toFixed(1),
    };
  }

  /**
   * Detect Byzantine agents (systematic poor performance)
   * Criteria: accuracy < 40% OR reputation < 20
   */
  isByzantineAgent(agentId) {
    const stats = this.agentStats.get(agentId);
    if (!stats || stats.totalReports < 5) return false;

    const accuracy = (stats.correctReports / stats.totalReports) * 100;
    const reputation = this.agentScores.get(agentId);

    // Byzantine if consistently wrong or very low reputation
    return accuracy < 40 || reputation < 20;
  }

  /**
   * Get agent reputation
   */
  getReputation(agentId) {
    return this.agentScores.get(agentId) || 50;
  }

  /**
   * Get agent statistics
   */
  getAgentStats(agentId) {
    const stats = this.agentStats.get(agentId) || {};
    const reputation = this.agentScores.get(agentId) || 50;
    const accuracy = stats.totalReports > 0 
      ? (stats.correctReports / stats.totalReports * 100).toFixed(1)
      : 'N/A';

    return {
      agentId,
      reputation,
      accuracy,
      totalReports: stats.totalReports || 0,
      correctReports: stats.correctReports || 0,
      slashCount: stats.slashCount || 0,
      lastUpdated: stats.lastUpdated || null,
      score: this.calculateAgentScore(agentId),
      isByzantine: this.isByzantineAgent(agentId),
    };
  }

  /**
   * Calculate overall agent score
   * Formula: 60% reputation + 40% accuracy
   */
  calculateAgentScore(agentId) {
    const stats = this.agentStats.get(agentId) || {};
    const reputation = this.agentScores.get(agentId) || 50;
    
    const accuracy = stats.totalReports > 0
      ? (stats.correctReports / stats.totalReports) * 100
      : 50;

    const score = (reputation * 0.6) + (accuracy * 0.4);
    return Math.round(score);
  }

  /**
   * Get edge consistency (standard deviation)
   * Lower = more consistent
   */
  getEdgeConsistency(agentId) {
    const history = this.edgeHistory.get(agentId) || [];
    if (history.length < 2) return 0;

    const mean = history.reduce((a, b) => a + b, 0) / history.length;
    const variance = history.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / history.length;
    const stdDev = Math.sqrt(variance);

    return stdDev.toFixed(4);
  }

  /**
   * Rank agents by reputation
   */
  rankAgents() {
    const rankings = Array.from(this.agentScores.entries())
      .map(([agentId, reputation]) => ({
        agentId,
        reputation,
        score: this.calculateAgentScore(agentId),
        stats: this.getAgentStats(agentId),
      }))
      .sort((a, b) => b.score - a.score);

    return rankings;
  }

  /**
   * Get position weighting based on reputation
   * Higher reputation = higher position weight
   * Formula: reputation^2 / sum(all_reputations^2)
   */
  getPositionWeighting(agentId) {
    const agentRep = this.getReputation(agentId);
    const allAgents = Array.from(this.agentScores.values());
    
    const sumOfSquares = allAgents.reduce((sum, rep) => sum + rep * rep, 0);
    const weight = (agentRep * agentRep) / sumOfSquares;

    return {
      agentId,
      reputation: agentRep,
      positionWeight: weight.toFixed(4),
      percentageOfTotal: (weight * 100).toFixed(2),
    };
  }

  /**
   * Get all weights for portfolio allocation
   */
  getAllWeights() {
    return Array.from(this.agentScores.keys()).map(agentId => 
      this.getPositionWeighting(agentId)
    );
  }

  /**
   * Detect outliers in forecast distribution
   * Uses z-score method: |value - mean| > 2*stdDev
   */
  detectOutliers(forecasts) {
    if (forecasts.length < 3) return [];

    const mean = forecasts.reduce((a, b) => a + b, 0) / forecasts.length;
    const variance = forecasts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / forecasts.length;
    const stdDev = Math.sqrt(variance);

    const outliers = forecasts
      .map((value, index) => ({
        index,
        value,
        zScore: Math.abs((value - mean) / (stdDev || 1)),
        isOutlier: Math.abs((value - mean) / (stdDev || 1)) > 2,
      }))
      .filter(item => item.isOutlier);

    return outliers;
  }

  /**
   * Get health report for aggregator
   */
  getHealthReport() {
    const allAgents = Array.from(this.agentScores.entries());
    const totalAgents = allAgents.length;

    let byzantineCount = 0;
    let reputationSum = 0;
    let accuracySum = 0;
    let agentsWithReports = 0;

    for (const [agentId, reputation] of allAgents) {
      reputationSum += reputation;
      const stats = this.agentStats.get(agentId);
      if (stats && stats.totalReports > 0) {
        const accuracy = (stats.correctReports / stats.totalReports) * 100;
        accuracySum += accuracy;
        agentsWithReports++;
        if (accuracy < 40 || reputation < 20) byzantineCount++;
      } else if (reputation < 20) {
        byzantineCount++;
      }
    }

    const healthyAgents = totalAgents - byzantineCount;
    const avgReputation = totalAgents > 0 ? reputationSum / totalAgents : 50;
    const avgAccuracy = agentsWithReports > 0 ? (accuracySum / agentsWithReports) : 0;

    return {
      timestamp: new Date().toISOString(),
      totalAgents,
      healthyAgents,
      byzantineAgents: byzantineCount,
      avgReputation: avgReputation.toFixed(1),
      avgAccuracy: avgAccuracy.toFixed(1),
      systemHealth: totalAgents > 0 && (healthyAgents / totalAgents) > 0.67 ? 'HEALTHY' : 'AT_RISK',
    };
  }
}

module.exports = ReputationTracker;
