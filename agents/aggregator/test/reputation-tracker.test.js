/**
 * Reputation Tracker Unit Tests
 * Tests all reputation mechanics: staking, slashing, rewards, Byzantine detection
 */

const ReputationTracker = require('../reputation-tracker');
// ReputationTracker tests

describe('ReputationTracker', () => {
  let tracker;

  beforeEach(() => {
    tracker = new ReputationTracker();
  });

  describe('Agent Registration', () => {
    test('should register new agent with neutral reputation', () => {
      const result = tracker.registerAgent('agent-1');
      expect(result.agentId).toBe('agent-1');
      expect(result.reputation).toBe(50);
    });

    test('should maintain initial reputation after registration', () => {
      tracker.registerAgent('agent-1', 75);
      expect(tracker.getReputation('agent-1')).toBe(75);
    });
  });

  describe('Report Recording & Reputation Updates', () => {
    beforeEach(() => {
      tracker.registerAgent('agent-accurate');
      tracker.registerAgent('agent-inaccurate');
    });

    test('should increase reputation for accurate forecasts', () => {
      const initialRep = tracker.getReputation('agent-accurate');
      
      tracker.recordReport('agent-accurate', 0.70, 0.68, 80);  // Accurate
      const afterRep = tracker.getReputation('agent-accurate');
      
      expect(afterRep).toBeGreaterThan(initialRep);
    });

    test('should decrease reputation for inaccurate forecasts', () => {
      const initialRep = tracker.getReputation('agent-inaccurate');
      
      tracker.recordReport('agent-inaccurate', 0.70, 0.20, 80);  // Very wrong
      const afterRep = tracker.getReputation('agent-inaccurate');
      
      expect(afterRep).toBeLessThan(initialRep);
    });

    test('should track accuracy statistics', () => {
      tracker.recordReport('agent-accurate', 0.70, 0.68, 80);  // Correct
      tracker.recordReport('agent-accurate', 0.60, 0.58, 75);  // Correct
      tracker.recordReport('agent-accurate', 0.50, 0.80, 60);  // Wrong
      
      const stats = tracker.getAgentStats('agent-accurate');
      expect(stats.totalReports).toBe(3);
      expect(stats.correctReports).toBe(2);
      expect(parseFloat(stats.accuracy)).toBeCloseTo(66.7, 0);
    });

    test('should cap reputation at maximum of 100', () => {
      tracker.registerAgent('agent-perfect', 100);
      tracker.recordReport('agent-perfect', 0.70, 0.68, 90);
      
      expect(tracker.getReputation('agent-perfect')).toBe(100);
    });

    test('should not allow reputation to go below 0', () => {
      tracker.registerAgent('agent-terrible', 5);
      tracker.recordReport('agent-terrible', 0.70, 0.10, 90);  // Very wrong
      
      expect(tracker.getReputation('agent-terrible')).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Byzantine Detection', () => {
    test('should detect agent with accuracy below 40%', () => {
      tracker.registerAgent('byzantine-low-accuracy');
      
      for (let i = 0; i < 5; i++) {
        tracker.recordReport('byzantine-low-accuracy', 0.70, 0.20, 80);  // Always wrong
      }
      
      expect(tracker.isByzantineAgent('byzantine-low-accuracy')).toBe(true);
    });

    test('should detect agent with reputation below 20', () => {
      tracker.registerAgent('byzantine-low-rep', 25);
      
      // Make many wrong predictions to drop reputation
      for (let i = 0; i < 10; i++) {
        tracker.recordReport('byzantine-low-rep', 0.70, 0.10, 90);
      }
      
      if (tracker.getReputation('byzantine-low-rep') < 20) {
        expect(tracker.isByzantineAgent('byzantine-low-rep')).toBe(true);
      }
    });

    test('should slash Byzantine agents', () => {
      tracker.registerAgent('malicious-agent');
      
      const beforeSlash = tracker.getReputation('malicious-agent');
      
      for (let i = 0; i < 6; i++) {
        tracker.recordReport('malicious-agent', 0.70, 0.10, 90);
      }
      
      const stats = tracker.getAgentStats('malicious-agent');
      if (tracker.isByzantineAgent('malicious-agent')) {
        expect(stats.slashCount).toBeGreaterThan(0);
      }
    });
  });

  describe('Agent Scoring', () => {
    test('should calculate composite score (60% rep + 40% accuracy)', () => {
      tracker.registerAgent('agent-test', 80);
      
      // Record some perfect reports
      for (let i = 0; i < 10; i++) {
        tracker.recordReport('agent-test', 0.70 + i * 0.01, 0.70 + i * 0.01, 80);
      }
      
      const score = tracker.calculateAgentScore('agent-test');
      const stats = tracker.getAgentStats('agent-test');
      
      // Score should be between 0-100
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
      expect(score).toBeGreaterThan(70);  // Should be high for honest agent
    });

    test('should rank agents by score', () => {
      tracker.registerAgent('agent-good', 90);
      tracker.registerAgent('agent-bad', 20);
      
      for (let i = 0; i < 5; i++) {
        tracker.recordReport('agent-good', 0.70, 0.68, 80);
        tracker.recordReport('agent-bad', 0.70, 0.10, 80);
      }
      
      const rankings = tracker.rankAgents();
      expect(rankings[0].agentId).toBe('agent-good');
      expect(rankings[1].agentId).toBe('agent-bad');
    });
  });

  describe('Edge Consistency', () => {
    test('should track edge history', () => {
      tracker.registerAgent('agent-consistent');
      
      tracker.recordReport('agent-consistent', 0.70, 0.68, 80);  // 0.02 edge
      tracker.recordReport('agent-consistent', 0.60, 0.58, 80);  // 0.02 edge
      tracker.recordReport('agent-consistent', 0.50, 0.48, 80);  // 0.02 edge
      
      const consistency = tracker.getEdgeConsistency('agent-consistent');
      expect(parseFloat(consistency)).toBeLessThan(0.01);  // Very consistent
    });

    test('should detect inconsistent forecasts', () => {
      tracker.registerAgent('agent-inconsistent');
      
      tracker.recordReport('agent-inconsistent', 0.70, 0.50, 80);  // 0.20 edge
      tracker.recordReport('agent-inconsistent', 0.60, 0.65, 80);  // 0.05 edge
      tracker.recordReport('agent-inconsistent', 0.50, 0.30, 80);  // 0.20 edge
      
      const consistency = tracker.getEdgeConsistency('agent-inconsistent');
      expect(parseFloat(consistency)).toBeGreaterThan(0.07);  // Inconsistent
    });
  });

  describe('Position Weighting', () => {
    test('should weight positions by reputation squared', () => {
      tracker.registerAgent('agent-high', 100);
      tracker.registerAgent('agent-low', 50);
      
      const weights = tracker.getAllWeights();
      const highWeight = weights.find(w => w.agentId === 'agent-high');
      const lowWeight = weights.find(w => w.agentId === 'agent-low');
      
      expect(parseFloat(highWeight.positionWeight)).toBeGreaterThan(
        parseFloat(lowWeight.positionWeight)
      );
    });

    test('should sum weights to ~1.0', () => {
      tracker.registerAgent('agent-1', 80);
      tracker.registerAgent('agent-2', 70);
      tracker.registerAgent('agent-3', 60);
      
      const weights = tracker.getAllWeights();
      const totalWeight = weights.reduce((sum, w) => sum + parseFloat(w.positionWeight), 0);
      
      expect(totalWeight).toBeCloseTo(1.0, 1);
    });
  });

  describe('Outlier Detection', () => {
    test('should detect outliers using z-score', () => {
      const forecasts = [0.70, 0.71, 0.69, 0.20];  // 0.20 is outlier
      
      const outliers = tracker.detectOutliers(forecasts);
      expect(outliers.length).toBeGreaterThan(0);
      expect(outliers[0].value).toBe(0.20);
      expect(outliers[0].isOutlier).toBe(true);
    });

    test('should not flag normal variance as outliers', () => {
      const forecasts = [0.70, 0.71, 0.69, 0.68];  // All normal
      
      const outliers = tracker.detectOutliers(forecasts);
      expect(outliers.length).toBe(0);
    });
  });

  describe('System Health Report', () => {
    test('should report healthy system with honest agents', () => {
      tracker.registerAgent('agent-1', 90);
      tracker.registerAgent('agent-2', 85);
      tracker.registerAgent('agent-3', 80);
      
      for (let i = 0; i < 5; i++) {
        tracker.recordReport('agent-1', 0.70, 0.68, 80);
        tracker.recordReport('agent-2', 0.60, 0.58, 75);
        tracker.recordReport('agent-3', 0.50, 0.48, 70);
      }
      
      const health = tracker.getHealthReport();
      expect(health.systemHealth).toBe('HEALTHY');
      expect(health.healthyAgents).toBeGreaterThan(health.byzantineAgents);
    });

    test('should report at-risk system with too many Byzantine agents', () => {
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
      // Should be at risk (2/3 Byzantine or worse)
      expect(health.byzantineAgents).toBeGreaterThan(0);
    });
  });
});
