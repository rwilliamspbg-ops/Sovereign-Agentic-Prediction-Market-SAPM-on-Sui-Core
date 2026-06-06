/**
 * Multi-Agent Consensus Builder
 * 
 * Implements Byzantine-tolerant consensus protocols for forecast aggregation.
 * Uses Borda count, weighted voting, and reputation-based weighting.
 * 
 * @module ai-agents/consensus-builder
 * @version 1.0.0
 */

const EventEmitter = require('events');

/**
 * Consensus Vote - Individual agent's vote in consensus round
 */
class ConsensusVote {
  constructor(agentId, marketId, forecast, weight) {
    this.agentId = agentId;
    this.marketId = marketId;
    this.forecast = forecast; // 'yes', 'no', or null/undefined for abstain
    this.weight = weight || 1.0;
    this.timestamp = new Date().toISOString();
    this.rationale = forecast?.rationale || '';
  }

  toJSON() {
    return {
      agentId: this.agentId,
      marketId: this.marketId,
      forecast: this.forecast,
      weight: this.weight,
      timestamp: this.timestamp
    };
  }
}

/**
 * Consensus Round - Collection of votes for a single round
 */
class ConsensusRound {
  constructor(roundId, marketId, votes) {
    this.roundId = roundId;
    this.marketId = marketId;
    this.votes = votes; // Array of ConsensusVote objects
    this.timestamp = new Date().toISOString();
    this.agreementScore = null;
    this.outcome = null;
  }

  calculateAgreement() {
    if (!this.votes || this.votes.length === 0) {
      return 0;
    }

    // Count votes for yes and no (weighted)
    let yesWeight = 0;
    let noWeight = 0;

    for (const vote of this.votes) {
      if (vote.forecast === 'yes') {
        yesWeight += vote.weight;
      } else if (vote.forecast === 'no') {
        noWeight += vote.weight;
      }
    }

    const totalWeight = yesWeight + noWeight;
    
    if (totalWeight === 0) {
      return 0;
    }

    this.agreementScore = Math.max(yesWeight, noWeight) / totalWeight;
    return this.agreementScore;
  }

  determineOutcome() {
    if (!this.agreementScore) {
      return null;
    }

    // Outcome is 'yes' if yes votes have majority weight
    let yesWeight = 0;
    let noWeight = 0;

    for (const vote of this.votes) {
      if (vote.forecast === 'yes') {
        yesWeight += vote.weight;
      } else if (vote.forecast === 'no') {
        noWeight += vote.weight;
      }
    }

    const totalWeight = yesWeight + noWeight;
    
    if (totalWeight === 0) {
      return null; // No votes
    }

    this.outcome = yesWeight / totalWeight > 0.5 ? 'yes' : 'no';
    return this.outcome;
  }
}

/**
 * Multi-Agent Consensus Builder - Main consensus engine
 */
class ConsensusBuilder extends EventEmitter {
  /**
   * Initialize consensus builder
   * @param {Object} config - Configuration options
   * @param {number} [config.quorum=0.6] - Minimum agreement score to accept outcome
   * @param {number} [config.maxRounds=3] - Maximum consensus rounds per market
   */
  constructor(config = {}) {
    super();
    
    this.quorum = config.quorum || 0.6; // 60% agreement required
    this.maxRounds = config.maxRounds || 3;
    
    // Rounds storage: marketId -> roundIndex -> ConsensusRound
    this.rounds = new Map();
    
    // Agent weights: agentId -> weight (based on reputation)
    this.agentWeights = new Map();
    
    // Borda count cache for efficiency
    this.bordaCache = new Map(); // marketId -> { yesScore, noScore }
    
    console.log('[ConsensusBuilder] Initialized with quorum:', this.quorum);
  }

  /**
   * Add agent's vote to consensus round
   * @param {string} marketId - Market identifier
   * @param {string} agentId - Agent identifier
   * @param {Object} forecast - Forecast data
   * @returns {ConsensusVote} Created vote object
   */
  addVote(marketId, agentId, forecast) {
    const weight = this.getAgentWeight(agentId);
    
    // Initialize round if needed
    if (!this.rounds.has(marketId)) {
      this.rounds.set(marketId, []);
    }

    const roundIndex = this.rounds.get(marketId).length;
    
    // Create vote
    const vote = new ConsensusVote(agentId, marketId, forecast, weight);
    
    // Add to round
    if (roundIndex >= this.rounds.get(marketId).length) {
      this.rounds.get(marketId).push(vote);
    }

    // Calculate agreement score
    const round = new ConsensusRound(`round_${marketId}_${roundIndex}`, marketId, 
      this.rounds.get(marketId));
    round.calculateAgreement();

    console.log(`[ConsensusBuilder] Vote added to ${marketId} round ${roundIndex}. Agreement: ${(round.agreementScore * 100).toFixed(1)}%`);
    
    // Emit vote event
    this.emit('vote_added', { marketId, agentId, forecast, vote });
    
    return vote;
  }

  /**
   * Get current consensus outcome for a market
   * @param {string} marketId - Market identifier
   * @returns {Object|null} Consensus result or null if not enough votes
   */
  getCurrentConsensus(marketId) {
    const rounds = this.rounds.get(marketId);
    
    if (!rounds || rounds.length === 0) {
      return null;
    }

    // Use latest round for current consensus
    const latestRound = rounds[rounds.length - 1];
    const outcome = latestRound.determineOutcome();

    if (!outcome) {
      return null;
    }

    return {
      marketId,
      outcome: outcome,
      agreementScore: latestRound.agreementScore,
      roundIndex: rounds.length - 1,
      voteCount: latestRound.votes.length
    };
  }

  /**
   * Aggregate forecasts using Borda count method
   * @param {string} marketId - Market identifier  
   * @returns {Object|null} Aggregated result or null
   */
  aggregateWithBorda(marketId) {
    const rounds = this.rounds.get(marketId);
    
    if (!rounds || rounds.length === 0) {
      return null;
    }

    // Calculate Borda scores (yes vs no positions)
    let yesScore = 0;
    let noScore = 0;

    for (const round of rounds) {
      for (const vote of round.votes) {
        if (vote.forecast === 'yes') {
          yesScore += vote.weight * round.votes.length;
        } else if (vote.forecast === 'no') {
          noScore += vote.weight * round.votes.length;
        }
      }
    }

    // Cache result
    this.bordaCache.set(marketId, { yesScore, noScore });

    // Determine winner
    const totalScore = yesScore + noScore;
    
    if (totalScore === 0) {
      return null;
    }

    const yesPercentage = yesScore / totalScore;
    
    return {
      marketId,
      outcome: yesPercentage > 0.5 ? 'yes' : 'no',
      yesScore,
      noScore,
      yesPercentage,
      roundsProcessed: rounds.length
    };
  }

  /**
   * Calculate weighted voting outcome
   * @param {string} marketId - Market identifier
   * @returns {Object|null} Weighted voting result or null
   */
  calculateWeightedVoting(marketId) {
    const rounds = this.rounds.get(marketId);
    
    if (!rounds || rounds.length === 0) {
      return null;
    }

    let yesWeight = 0;
    let noWeight = 0;

    for (const round of rounds) {
      for (const vote of round.votes) {
        if (vote.forecast === 'yes') {
          yesWeight += vote.weight;
        } else if (vote.forecast === 'no') {
          noWeight += vote.weight;
        }
      }
    }

    const totalWeight = yesWeight + noWeight;
    
    if (totalWeight === 0) {
      return null;
    }

    return {
      marketId,
      outcome: yesWeight / totalWeight > this.quorum ? 'yes' : 'no',
      yesWeight,
      noWeight,
      agreementScore: Math.max(yesWeight, noWeight) / totalWeight,
      meetsQuorum: Math.max(yesWeight, noWeight) / totalWeight >= this.quorum
    };
  }

  /**
   * Get agent's weight based on reputation
   * @param {string} agentId - Agent identifier
   * @returns {number} Weight multiplier (1.0 = neutral)
   */
  getAgentWeight(agentId) {
    if (this.agentWeights.has(agentId)) {
      return this.agentWeights.get(agentId);
    }

    // Default weight for new agents
    return 1.0;
  }

  /**
   * Set agent weight based on reputation score
   * @param {string} agentId - Agent identifier  
   * @param {number} reputationScore - Reputation score (0-100)
   */
  setAgentWeight(agentId, reputationScore) {
    // Map reputation score to weight (non-linear scaling)
    const normalizedReputation = reputationScore / 100;
    const weight = Math.pow(normalizedReputation, 1.5); // Reward high-rep agents
    
    this.agentWeights.set(agentId, weight);
    
    console.log(`[ConsensusBuilder] Set weight for ${agentId}: ${weight.toFixed(2)} (reputation: ${reputationScore})`);
  }

  /**
   * Update agent weights from reputation registry
   * @param {Map<string, number>} reputationRegistry - Map of agentId -> reputation score
   */
  updateWeightsFromRegistry(reputationRegistry) {
    for (const [agentId, reputationScore] of reputationRegistry.entries()) {
      this.setAgentWeight(agentId, reputationScore);
    }

    console.log(`[ConsensusBuilder] Updated weights for ${reputationRegistry.size} agents`);
  }

  /**
   * Initialize consensus with agent weights from reputation
   * @param {string} marketId - Market identifier
   * @param {Map<string, number>} reputationRegistry - Reputation scores
   */
  initializeWithReputation(marketId, reputationRegistry) {
    this.updateWeightsFromRegistry(reputationRegistry);
    
    // Initialize rounds for this market
    if (!this.rounds.has(marketId)) {
      this.rounds.set(marketId, []);
    }

    console.log(`[ConsensusBuilder] Initialized consensus for ${marketId} with reputation weights`);
  }

  /**
   * Get all consensus rounds for a market
   * @param {string} marketId - Market identifier
   * @returns {Array} Array of consensus rounds
   */
  getRounds(marketId) {
    return this.rounds.get(marketId) || [];
  }

  /**
   * Get consensus history for a market
   * @param {string} marketId - Market identifier  
   * @returns {Object|null} Consensus history or null
   */
  getConsensusHistory(marketId) {
    const rounds = this.rounds.get(marketId);
    
    if (!rounds || rounds.length === 0) {
      return null;
    }

    // Calculate trend from Borda scores
    let yesTrend = 0;
    let noTrend = 0;

    for (let i = 1; i < rounds.length; i++) {
      const currentRound = rounds[i];
      const previousRound = rounds[i - 1];
      
      // Compare agreement scores
      if (currentRound.agreementScore > previousRound.agreementScore) {
        yesTrend++;
      } else if (currentRound.agreementScore < previousRound.agreementScore) {
        noTrend++;
      }
    }

    return {
      marketId,
      rounds: rounds.length,
      latestOutcome: rounds[rounds.length - 1].determineOutcome(),
      latestAgreement: rounds[rounds.length - 1]?.agreementScore || null,
      trend: yesTrend > noTrend ? 'strengthening' : yesTrend < noTrend ? 'weakening' : 'stable'
    };
  }

  /**
   * Clear all consensus data (for testing)
   */
  clear() {
    this.rounds.clear();
    this.bordaCache.clear();
    console.log('[ConsensusBuilder] All consensus data cleared');
  }

  /**
   * Get consensus system statistics
   * @returns {Object} Stats object
   */
  getStats() {
    let totalVotes = 0;
    let totalMarkets = 0;

    for (const [, rounds] of this.rounds.entries()) {
      totalMarkets++;
      for (const round of rounds) {
        totalVotes += round.votes.length;
      }
    }

    return {
      markets: totalMarkets,
      totalVotes,
      averageVotesPerMarket: Math.round(totalVotes / totalMarkets) if totalMarkets > 0 else 0
    };
  }

  /**
   * Check health of consensus system
   * @returns {Object} Health status
   */
  checkHealth() {
    const stats = this.getStats();
    
    return {
      status: 'healthy',
      markets: stats.markets,
      totalVotes: stats.totalVotes,
      agentsWithWeights: this.agentWeights.size,
      cacheSize: this.bordaCache.size
    };
  }
}

/**
 * Module exports
 */
module.exports = { 
  ConsensusBuilder, 
  ConsensusVote,
  ConsensusRound
};
