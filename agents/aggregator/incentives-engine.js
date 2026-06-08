// SPDX-License-Identifier: Apache-2.0
/**
 * Incentives Integration Module
 * Integrates reputation tracking into the aggregator
 */

const ReputationTracker = require('./reputation-tracker');
const logger = require('../lib/logger').create('IncentivesEngine');

class IncentivesEngine {
  constructor() {
    this.tracker = new ReputationTracker();
    this.marketRewards = new Map();  // market_id -> reward_pool_sui
    this.agentStakes = new Map();     // agent_id -> stake_sui
    this.performanceThresholds = {
      slashThreshold: 0.40,          // Accuracy below 40% triggers slash
      reputationMinimum: 50,         // Min reputation to participate
      positionMaximum: 0.30,         // Max 30% of portfolio per agent
    };
  }

  /**
   * Register agent with initial stake
   */
  registerAgentWithStake(agentId, stakeSui) {
    const registration = this.tracker.registerAgent(agentId);
    this.agentStakes.set(agentId, stakeSui);
    
    return {
      ...registration,
      stakeSui,
      canTrade: true,
      message: `Agent ${agentId} registered with ${stakeSui} SUI stake`,
    };
  }

  /**
   * Process market outcome and update rewards/slashes
   */
  async processMarketOutcome(marketId, forecasts, actualPrice, agentConfidences) {
    const results = {
      marketId,
      timestamp: new Date().toISOString(),
      agents: [],
      totalRewardsDistributed: 0,
      totalSlashesApplied: 0,
      marketRewardPool: 0,
    };

    // Process each agent
    if (!forecasts || forecasts.length === 0) return results;

    forecasts.forEach((forecast, index) => {
      const agentId = `agent-${index}`;
      const actualOutcome = actualPrice;
      const confidence = agentConfidences[index];

      // Record report and get update
      this.tracker.recordReport(
        agentId,
        forecast,
        actualOutcome,
        confidence
      );

      // Determine rewards/slashes
      const edge = Math.abs(forecast - actualOutcome);
      const isAccurate = edge < 0.05;

      if (isAccurate) {
        // Calculate reward (higher confidence = higher reward)
        const baseReward = 100; // Base reward in SUI
        const rewardAmount = baseReward * (confidence / 100) * (1 + edge * 10);
        
        results.totalRewardsDistributed += rewardAmount;
        results.agents.push({
          agentId,
          action: 'REWARDED',
          amount: rewardAmount.toFixed(2),
          newReputation: this.tracker.getReputation(agentId),
          accuracy: this.tracker.getAgentStats(agentId).accuracy,
        });
      } else {
        // Calculate slash (higher edge = harsher slash)
        const slashPercentage = Math.min(0.20, edge * 5);  // Max 20% slash
        const stake = this.agentStakes.get(agentId) || 1000;
        const slashAmount = stake * slashPercentage;
        
        results.totalSlashesApplied += slashAmount;
        
        // Update stake
        this.agentStakes.set(agentId, stake - slashAmount);

        results.agents.push({
          agentId,
          action: 'SLASHED',
          amount: slashAmount.toFixed(2),
          newReputation: this.tracker.getReputation(agentId),
          remainingStake: (stake - slashAmount).toFixed(2),
          reason: `Inaccurate forecast (edge: ${edge.toFixed(4)})`,
        });
      }
    });

    // Store market reward pool
    this.marketRewards.set(marketId, results.totalRewardsDistributed);

    return results;
  }

  /**
   * Calculate position weights based on reputation for next market
   */
  getNextPositionAllocation() {
    const weights = this.tracker.getAllWeights();
    
    return {
      timestamp: new Date().toISOString(),
      agentAllocations: weights.map(w => ({
        agentId: w.agentId,
        reputation: w.reputation,
        positionWeight: parseFloat(w.positionWeight),
        percentageOfPortfolio: parseFloat(w.percentageOfTotal),
        canParticipate: w.reputation >= this.performanceThresholds.reputationMinimum,
      })),
      totalAllocationCapacity: 1.0,
      systemRecommendation: this.tracker.getHealthReport(),
    };
  }

  /**
   * Check agent eligibility to participate
   */
  isAgentEligible(agentId) {
    const reputation = this.tracker.getReputation(agentId);
    const isByzantine = this.tracker.isByzantineAgent(agentId);
    const hasStake = this.agentStakes.has(agentId) && this.agentStakes.get(agentId) > 0;

    return {
      agentId,
      eligible: reputation >= this.performanceThresholds.reputationMinimum && 
                !isByzantine && 
                hasStake,
      reputation,
      isByzantine,
      hasStake,
      minRequiredReputation: this.performanceThresholds.reputationMinimum,
    };
  }

  /**
   * Get agent standing/ranking
   */
  getAgentStanding() {
    const rankings = this.tracker.rankAgents();
    
    return {
      timestamp: new Date().toISOString(),
      rankings: rankings.map((r, index) => ({
        rank: index + 1,
        agentId: r.agentId,
        reputation: r.reputation,
        score: r.score,
        stats: {
          accuracy: r.stats.accuracy,
          totalReports: r.stats.totalReports,
          slashCount: r.stats.slashCount,
        },
        stake: (this.agentStakes.get(r.agentId) || 0).toFixed(2),
        eligible: this.isAgentEligible(r.agentId).eligible,
      })),
    };
  }

  /**
   * Get system statistics
   */
  getSystemStats() {
    const health = this.tracker.getHealthReport();
    const totalStaked = Array.from(this.agentStakes.values()).reduce((a, b) => a + b, 0);
    const totalRewards = Array.from(this.marketRewards.values()).reduce((a, b) => a + b, 0);

    return {
      timestamp: new Date().toISOString(),
      systemHealth: health.systemHealth,
      agentMetrics: {
        total: health.totalAgents,
        healthy: health.healthyAgents,
        byzantine: health.byzantineAgents,
        avgReputation: parseFloat(health.avgReputation),
        avgAccuracy: parseFloat(health.avgAccuracy),
      },
      economicMetrics: {
        totalStakeSui: totalStaked.toFixed(2),
        totalRewardsDistributedSui: totalRewards.toFixed(2),
        marketsProceed: this.marketRewards.size,
      },
      recommendations: this.getSystemRecommendations(),
    };
  }

  /**
   * Get system-level recommendations
   */
  getSystemRecommendations() {
    const health = this.tracker.getHealthReport();
    const recommendations = [];

    if (health.byzantineAgents > health.healthyAgents) {
      recommendations.push({
        level: 'CRITICAL',
        message: 'System at risk: Byzantine agents exceed honest agents',
        action: 'Increase slashing severity or remove malicious agents',
      });
    }

    if (health.avgAccuracy < 50) {
      recommendations.push({
        level: 'WARNING',
        message: 'System accuracy below 50%',
        action: 'Review market conditions and agent models',
      });
    }

    if (health.healthyAgents < 2) {
      recommendations.push({
        level: 'WARNING',
        message: 'Insufficient healthy agents for Byzantine tolerance',
        action: 'Recruit more agents or improve existing ones',
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        level: 'OK',
        message: 'System operating nominally',
        action: 'Continue monitoring',
      });
    }

    return recommendations;
  }

  /**
   * Simulate market and track results
   */
  async simulateMarket(marketId, forecasts, actualPrice, confidences) {
    logger.info('Processing market', { marketId: marketId });
    logger.debug(`Forecasts: ${forecasts.map(f => (f * 100).toFixed(1)).join('%, ')}%`);
    logger.debug(`Actual Price: ${(actualPrice * 100).toFixed(1)}%`);

    const results = await this.processMarketOutcome(marketId, forecasts, actualPrice, confidences);
    
    logger.info('Market results');
    results.agents.forEach(agent => {
      logger.info('Agent result', { agentId: agent.agentId, action: agent.action, amount: agent.amount, rep: agent.newReputation });
    });

    logger.debug(`\nTotal Rewards: ${results.totalRewardsDistributed.toFixed(2)} SUI`);
    logger.debug(`Total Slashes: ${results.totalSlashesApplied.toFixed(2)} SUI`);

    return results;
  }

  /**
   * Print full report
   */
  printReport() {
    const standing = this.getAgentStanding();
    const stats = this.getSystemStats();
    const health = this.tracker.getHealthReport();

    logger.debug('='.repeat(70));
    logger.info('SAPM incentives full report');
    logger.debug('='.repeat(70));

    logger.debug('System health');
    logger.debug(`Status: ${health.systemHealth}`);
    logger.debug(`Healthy agents: ${health.healthyAgents}/${health.totalAgents}`);
    logger.debug(`Avg reputation: ${health.avgReputation}`);
    logger.debug(`Avg accuracy: ${health.avgAccuracy}%`);

    logger.debug('Economics');
    logger.debug(`Total staked: ${stats.economicMetrics.totalStakeSui} SUI`);
    logger.debug(`Total rewards: ${stats.economicMetrics.totalRewardsDistributedSui} SUI`);
    logger.debug(`Markets processed: ${stats.economicMetrics.marketsProceed}`);

    logger.debug('Agent rankings');
    standing.rankings.slice(0, 10).forEach(agent => {
      const status = agent.eligible ? '✅' : '❌';
      logger.debug(`  ${status} ${agent.rank}. ${agent.agentId}: Rep=${agent.reputation}, Score=${agent.score}, Accuracy=${agent.stats.accuracy}%`);
    });

    logger.debug('Recommendations');
    stats.recommendations.forEach(rec => {
      logger.debug(`[${rec.level}] ${rec.message}`);
      logger.debug(`  → ${rec.action}`);
    });

    logger.debug('='.repeat(70));
  }
}

module.exports = IncentivesEngine;
