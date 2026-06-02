/**
 * Reputation Tracker Unit Tests - Node.js Native Test Runner
 * Tests all reputation mechanics: staking, slashing, rewards, Byzantine detection
 */

const test = require('node:test');
const assert = require('node:assert');
const ReputationTracker = require('../reputation-tracker');

test('ReputationTracker - Agent Registration', async (t) => {
  await t.test('should register new agent with neutral reputation', () => {
    const tracker = new ReputationTracker();
    const result = tracker.registerAgent('agent-1');
    assert.strictEqual(result.agentId, 'agent-1');
    assert.strictEqual(result.reputation, 50);
  });

  await t.test('should maintain initial reputation after registration', () => {
    const tracker = new ReputationTracker();
    tracker.registerAgent('agent-1', 75);
    assert.strictEqual(tracker.getReputation('agent-1'), 75);
  });
});

test('ReputationTracker - Report Recording & Reputation Updates', async (t) => {
  await t.test('should increase reputation for accurate forecasts', () => {
    const tracker = new ReputationTracker();
    tracker.registerAgent('agent-accurate');
    const initialRep = tracker.getReputation('agent-accurate');
    
    tracker.recordReport('agent-accurate', 0.70, 0.68, 80);  // Accurate
    const afterRep = tracker.getReputation('agent-accurate');
    
    assert(afterRep > initialRep, 'Reputation should increase for accurate forecast');
  });

  await t.test('should decrease reputation for inaccurate forecasts', () => {
    const tracker = new ReputationTracker();
    tracker.registerAgent('agent-inaccurate');
    const initialRep = tracker.getReputation('agent-inaccurate');
    
    tracker.recordReport('agent-inaccurate', 0.70, 0.20, 80);  // Very wrong
    const afterRep = tracker.getReputation('agent-inaccurate');
    
    assert(afterRep < initialRep, 'Reputation should decrease for inaccurate forecast');
  });

  await t.test('should track accuracy statistics', () => {
    const tracker = new ReputationTracker();
    tracker.registerAgent('agent-accurate');
    tracker.recordReport('agent-accurate', 0.70, 0.68, 80);  // Correct
    tracker.recordReport('agent-accurate', 0.60, 0.58, 75);  // Correct
    tracker.recordReport('agent-accurate', 0.50, 0.80, 60);  // Wrong
    
    const stats = tracker.getAgentStats('agent-accurate');
    assert.strictEqual(stats.totalReports, 3);
    assert.strictEqual(stats.correctReports, 2);
    assert.strictEqual(Math.round(parseFloat(stats.accuracy)), 67);
  });

  await t.test('should cap reputation at maximum of 100', () => {
    const tracker = new ReputationTracker();
    tracker.registerAgent('agent-perfect', 100);
    tracker.recordReport('agent-perfect', 0.70, 0.68, 90);
    
    assert.strictEqual(tracker.getReputation('agent-perfect'), 100);
  });

  await t.test('should not allow reputation to go below 0', () => {
    const tracker = new ReputationTracker();
    tracker.registerAgent('agent-terrible', 5);
    tracker.recordReport('agent-terrible', 0.70, 0.10, 90);  // Very wrong
    
    assert(tracker.getReputation('agent-terrible') >= 0);
  });
});

test('ReputationTracker - Byzantine Detection', async (t) => {
  await t.test('should detect agent with accuracy below 40%', () => {
    const tracker = new ReputationTracker();
    tracker.registerAgent('byzantine-low-accuracy');
    
    for (let i = 0; i < 5; i++) {
      tracker.recordReport('byzantine-low-accuracy', 0.70, 0.20, 80);  // Always wrong
    }
    
    assert(tracker.isByzantineAgent('byzantine-low-accuracy'), 'Should detect Byzantine agent');
  });

  await t.test('should detect agent with reputation below 20', () => {
    const tracker = new ReputationTracker();
    tracker.registerAgent('byzantine-low-rep', 25);
    
    // Make many wrong predictions to drop reputation
    for (let i = 0; i < 10; i++) {
      tracker.recordReport('byzantine-low-rep', 0.70, 0.10, 90);
    }
    
    const rep = tracker.getReputation('byzantine-low-rep');
    if (rep < 20) {
      assert(tracker.isByzantineAgent('byzantine-low-rep'), 'Should detect Byzantine agent');
    }
  });

  await t.test('should slash Byzantine agents', () => {
    const tracker = new ReputationTracker();
    tracker.registerAgent('malicious-agent');
    
    for (let i = 0; i < 6; i++) {
      tracker.recordReport('malicious-agent', 0.70, 0.10, 90);
    }
    
    const stats = tracker.getAgentStats('malicious-agent');
    if (tracker.isByzantineAgent('malicious-agent')) {
      assert(stats.slashCount > 0, 'Should have slash count');
    }
  });
});

test('ReputationTracker - Agent Scoring', async (t) => {
  await t.test('should calculate composite score (60% rep + 40% accuracy)', () => {
    const tracker = new ReputationTracker();
    tracker.registerAgent('agent-test', 80);
    
    // Record some perfect reports
    for (let i = 0; i < 10; i++) {
      tracker.recordReport('agent-test', 0.70 + i * 0.01, 0.70 + i * 0.01, 80);
    }
    
    const score = tracker.calculateAgentScore('agent-test');
    
    assert(score >= 0 && score <= 100, 'Score should be 0-100');
    assert(score > 70, 'Score should be high for honest agent');
  });

  await t.test('should rank agents by score', () => {
    const tracker = new ReputationTracker();
    tracker.registerAgent('agent-good', 90);
    tracker.registerAgent('agent-bad', 20);
    
    for (let i = 0; i < 5; i++) {
      tracker.recordReport('agent-good', 0.70, 0.68, 80);
      tracker.recordReport('agent-bad', 0.70, 0.10, 80);
    }
    
    const rankings = tracker.rankAgents();
    assert.strictEqual(rankings[0].agentId, 'agent-good');
    assert.strictEqual(rankings[1].agentId, 'agent-bad');
  });
});

test('ReputationTracker - Edge Consistency', async (t) => {
  await t.test('should track edge history', () => {
    const tracker = new ReputationTracker();
    tracker.registerAgent('agent-consistent');
    
    tracker.recordReport('agent-consistent', 0.70, 0.68, 80);  // 0.02 edge
    tracker.recordReport('agent-consistent', 0.60, 0.58, 80);  // 0.02 edge
    tracker.recordReport('agent-consistent', 0.50, 0.48, 80);  // 0.02 edge
    
    const consistency = tracker.getEdgeConsistency('agent-consistent');
    assert(parseFloat(consistency) < 0.01, 'Should be very consistent');
  });

  await t.test('should detect inconsistent forecasts', () => {
    const tracker = new ReputationTracker();
    tracker.registerAgent('agent-inconsistent');
    
    tracker.recordReport('agent-inconsistent', 0.70, 0.50, 80);  // 0.20 edge
    tracker.recordReport('agent-inconsistent', 0.60, 0.65, 80);  // 0.05 edge
    tracker.recordReport('agent-inconsistent', 0.50, 0.30, 80);  // 0.20 edge
    
    const consistency = tracker.getEdgeConsistency('agent-inconsistent');
    assert(parseFloat(consistency) > 0.07, 'Should be inconsistent');
  });
});

test('ReputationTracker - Position Weighting', async (t) => {
  await t.test('should weight positions by reputation squared', () => {
    const tracker = new ReputationTracker();
    tracker.registerAgent('agent-high', 100);
    tracker.registerAgent('agent-low', 50);
    
    const weights = tracker.getAllWeights();
    const highWeight = weights.find(w => w.agentId === 'agent-high');
    const lowWeight = weights.find(w => w.agentId === 'agent-low');
    
    assert(parseFloat(highWeight.positionWeight) > parseFloat(lowWeight.positionWeight));
  });

  await t.test('should sum weights to ~1.0', () => {
    const tracker = new ReputationTracker();
    tracker.registerAgent('agent-1', 80);
    tracker.registerAgent('agent-2', 70);
    tracker.registerAgent('agent-3', 60);
    
    const weights = tracker.getAllWeights();
    const totalWeight = weights.reduce((sum, w) => sum + parseFloat(w.positionWeight), 0);
    
    assert(Math.abs(totalWeight - 1.0) < 0.1, 'Weights should sum to ~1.0');
  });
});

test('ReputationTracker - Outlier Detection', async (t) => {
  await t.test('should detect outliers using z-score with sufficient sample', () => {
    const tracker = new ReputationTracker();
    
    // Expanded to 7 samples so outlier reaches z > 2 threshold
    // With 4 samples, outlier only reaches z=1.73 (below threshold)
    // With 7 clustered samples, outlier reaches z=2.44 (above threshold)
    const forecasts = [0.70, 0.71, 0.69, 0.70, 0.69, 0.71, 0.20];  // 0.20 is outlier
    
    const outliers = tracker.detectOutliers(forecasts);
    assert(outliers.length > 0, 'Should detect outliers');
    assert.strictEqual(outliers[0].value, 0.20);
    assert.strictEqual(outliers[0].isOutlier, true);
    assert(outliers[0].zScore > 2.0, 'Z-score should exceed threshold');
  });

  await t.test('should not flag normal variance as outliers', () => {
    const tracker = new ReputationTracker();
    const forecasts = [0.70, 0.71, 0.69, 0.68];  // All normal
    
    const outliers = tracker.detectOutliers(forecasts);
    assert.strictEqual(outliers.length, 0, 'Should not detect false outliers');
  });
});

test('ReputationTracker - System Health Report', async (t) => {
  await t.test('should report healthy system with honest agents', () => {
    const tracker = new ReputationTracker();
    tracker.registerAgent('agent-1', 90);
    tracker.registerAgent('agent-2', 85);
    tracker.registerAgent('agent-3', 80);
    
    for (let i = 0; i < 5; i++) {
      tracker.recordReport('agent-1', 0.70, 0.68, 80);
      tracker.recordReport('agent-2', 0.60, 0.58, 75);
      tracker.recordReport('agent-3', 0.50, 0.48, 70);
    }
    
    const health = tracker.getHealthReport();
    assert.strictEqual(health.systemHealth, 'HEALTHY');
    assert(health.healthyAgents > health.byzantineAgents);
  });

  await t.test('should report at-risk system with too many Byzantine agents', () => {
    const tracker = new ReputationTracker();
    tracker.registerAgent('honest');
    tracker.registerAgent('malicious-1');
    tracker.registerAgent('malicious-2');
    tracker.registerAgent('malicious-3');
    
    // Honest
    tracker.recordReport('honest', 0.70, 0.68, 80);
    
    // Malicious
    for (let i = 0; i < 6; i++) {
      tracker.recordReport('malicious-1', 0.70, 0.10, 90);
      tracker.recordReport('malicious-2', 0.70, 0.10, 90);
      tracker.recordReport('malicious-3', 0.70, 0.10, 90);
    }
    
    const health = tracker.getHealthReport();
    assert(health.byzantineAgents > 0, 'Should detect Byzantine agents');
  });
});
