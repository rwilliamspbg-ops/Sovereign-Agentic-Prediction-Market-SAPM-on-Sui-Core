#!/usr/bin/env node
/**
 * SAPM Incentives System - Live Demonstration
 * Shows the incentive mechanisms in action
 */

const IncentivesEngine = require('./agents/aggregator/incentives-engine');

async function runDemo() {
  console.log('\n🚀 SAPM INCENTIVES SYSTEM - LIVE DEMONSTRATION\n');

  const engine = new IncentivesEngine();

  // Register 3 agents with stakes
  console.log('📋 STEP 1: Agent Registration\n');
  
  const agents = [
    { id: 'alpha', stake: 1000 },
    { id: 'beta', stake: 1000 },
    { id: 'gamma', stake: 1000 },
  ];

  agents.forEach(agent => {
    const reg = engine.registerAgentWithStake(agent.id, agent.stake);
    console.log(`✅ ${reg.message}`);
  });

  // Simulate multiple markets
  console.log('\n\n📊 STEP 2: Market Simulations\n');

  const markets = [
    {
      id: 'market-1',
      forecasts: [0.72, 0.70, 0.68],  // Alpha, Beta, Gamma
      actual: 0.70,
      confidences: [80, 75, 70],
      name: 'BTC Price UP - Consensus',
    },
    {
      id: 'market-2',
      forecasts: [0.75, 0.72, 0.20],  // Gamma is Byzantine
      actual: 0.73,
      confidences: [85, 80, 90],
      name: 'ETH Volatility - One Outlier',
    },
    {
      id: 'market-3',
      forecasts: [0.60, 0.58, 0.15],  // Gamma consistently wrong
      actual: 0.59,
      confidences: [70, 75, 85],
      name: 'SOL Price - Byzantine Detected',
    },
    {
      id: 'market-4',
      forecasts: [0.55, 0.53, 0.12],  // Gamma fails again
      actual: 0.54,
      confidences: [75, 72, 80],
      name: 'ADA Price - Byzantine Slashed',
    },
    {
      id: 'market-5',
      forecasts: [0.65, 0.63, 0.67],  // Alpha back to good, Beta improving
      actual: 0.64,
      confidences: [82, 78, 60],
      name: 'SOL Recovery - Reputation Changes',
    },
  ];

  for (const market of markets) {
    await engine.simulateMarket(market.id, market.forecasts, market.actual, market.confidences);
  }

  // Get final allocations
  console.log('\n\n🎯 STEP 3: Next Position Allocation\n');
  const allocation = engine.getNextPositionAllocation();
  
  console.log('💼 Agent Allocations for Next Market:');
  allocation.agentAllocations.forEach(alloc => {
    const status = alloc.canParticipate ? '✅' : '❌';
    const posStr = (alloc.positionWeight * 100).toFixed(1);
    console.log(
      `${status} ${alloc.agentId}: ${posStr}% of portfolio ` +
      `(Rep: ${alloc.reputation}, Eligible: ${alloc.canParticipate})`
    );
  });

  console.log(`\nSystem Status: ${allocation.systemRecommendation.systemHealth}`);
  console.log(`Healthy: ${allocation.systemRecommendation.healthyAgents} | Byzantine: ${allocation.systemRecommendation.byzantineAgents}`);

  // Print comprehensive report
  console.log('\n\n');
  engine.printReport();

  // Show detailed breakdown
  console.log('\n\n📋 STEP 4: Detailed Agent Analysis\n');
  const standing = engine.getAgentStanding();
  
  console.log('Full Agent Rankings:');
  standing.rankings.forEach(agent => {
    const eligible = agent.eligible ? '✅ ELIGIBLE' : '❌ SUSPENDED';
    console.log(`
  ${agent.rank}. ${agent.agentId.toUpperCase()}
     Reputation: ${agent.reputation}/100
     Score: ${agent.score}
     Accuracy: ${agent.stats.accuracy}%
     Reports: ${agent.stats.totalReports}
     Slashes: ${agent.stats.slashCount}
     Stake: ${agent.stake} SUI
     Status: ${eligible}
    `);
  });

  // Economic metrics
  console.log('\n📈 STEP 5: Economic Metrics\n');
  const stats = engine.getSystemStats();
  
  console.log('Economic Summary:');
  console.log(`  Total Staked: ${stats.economicMetrics.totalStakeSui} SUI`);
  console.log(`  Total Rewards Distributed: ${stats.economicMetrics.totalRewardsDistributedSui} SUI`);
  console.log(`  Markets Processed: ${stats.economicMetrics.marketsProceed}`);
  console.log(`  Reward Rate: ${(parseFloat(stats.economicMetrics.totalRewardsDistributedSui) / parseFloat(stats.economicMetrics.totalStakeSui) * 100).toFixed(1)}% per market`);

  console.log('\n\n✨ DEMONSTRATION COMPLETE');
  console.log(`\nKey Takeaways:`);
  console.log(`  • Honest agents are rewarded (Alpha/Beta)` );
  console.log(`  • Inaccurate agents are slashed (Gamma)`);
  console.log(`  • Reputation drives position weight`);
  console.log(`  • Byzantine agents are automatically detected`);
  console.log(`  • System remains robust: ${stats.systemHealth.systemHealth}`);
}

// Run demo
runDemo().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
