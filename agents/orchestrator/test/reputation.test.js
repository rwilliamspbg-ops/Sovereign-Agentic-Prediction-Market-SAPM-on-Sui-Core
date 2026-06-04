// SPDX-License-Identifier: Apache-2.0
/**
 * Reputation System Tests
 * Tests for agent reputation and Byzantine detection
 */

const ReputationManager = require('../reputation/reputation-manager');

describe('Reputation System', () => {
  let manager;

  beforeEach(() => {
    manager = new ReputationManager();
  });

  describe('Reputation Tracking', () => {
    test('should initialize agent with default reputation', () => {
      manager.registerAgent('agent-1');
      const rep = manager.getReputation('agent-1');
      expect(rep).toBe(50);  // Default neutral reputation
    });

    test('should update reputation based on performance', () => {
      manager.registerAgent('agent-1');
      manager.recordPerformance('agent-1', 0.95);  // 95% accuracy
      
      const rep = manager.getReputation('agent-1');
      expect(rep).toBeGreaterThan(50);
    });

    test('should penalize poor performance', () => {
      manager.registerAgent('agent-1');
      manager.recordPerformance('agent-1', 0.10);  // 10% accuracy
      
      const rep = manager.getReputation('agent-1');
      expect(rep).toBeLessThan(50);
    });

    test('should cap reputation at 100', () => {
      manager.registerAgent('agent-1', 100);
      manager.recordPerformance('agent-1', 0.99);
      
      const rep = manager.getReputation('agent-1');
      expect(rep).toBeLessThanOrEqual(100);
    });

    test('should not allow negative reputation', () => {
      manager.registerAgent('agent-1', 5);
      for (let i = 0; i < 10; i++) {
        manager.recordPerformance('agent-1', 0.05);  // Very poor
      }
      
      const rep = manager.getReputation('agent-1');
      expect(rep).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Byzantine Detection', () => {
    test('should detect consistently inaccurate agent', () => {
      manager.registerAgent('malicious');
      
      for (let i = 0; i < 6; i++) {
        manager.recordPerformance('malicious', 0.20);  // 20% accuracy
      }
      
      const isByzantine = manager.isByzantineAgent('malicious');
      expect(isByzantine).toBe(true);
    });

    test('should not flag honest agent as Byzantine', () => {
      manager.registerAgent('honest');
      
      for (let i = 0; i < 6; i++) {
        manager.recordPerformance('honest', 0.90);  // 90% accuracy
      }
      
      const isByzantine = manager.isByzantineAgent('honest');
      expect(isByzantine).toBe(false);
    });

    test('should detect agent with low reputation', () => {
      manager.registerAgent('bad-agent', 15);
      
      const isByzantine = manager.isByzantineAgent('bad-agent');
      expect(isByzantine).toBe(true);
    });

    test('should track Byzantine events', () => {
      manager.registerAgent('malicious');
      for (let i = 0; i < 6; i++) {
        manager.recordPerformance('malicious', 0.15);
      }
      
      const events = manager.getByzantineEvents('malicious');
      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Metrics', () => {
    test('should track accuracy history', () => {
      manager.registerAgent('agent-1');
      manager.recordPerformance('agent-1', 0.90);
      manager.recordPerformance('agent-1', 0.85);
      manager.recordPerformance('agent-1', 0.92);
      
      const metrics = manager.getMetrics('agent-1');
      expect(metrics.averageAccuracy).toBeCloseTo(0.89, 1);
    });

    test('should calculate consistency score', () => {
      manager.registerAgent('agent-1');
      manager.recordPerformance('agent-1', 0.90);
      manager.recordPerformance('agent-1', 0.91);
      manager.recordPerformance('agent-1', 0.89);
      
      const score = manager.getConsistency('agent-1');
      expect(score).toBeGreaterThan(0.8);  // High consistency
    });

    test('should track performance trends', () => {
      manager.registerAgent('agent-1');
      manager.recordPerformance('agent-1', 0.70);
      manager.recordPerformance('agent-1', 0.75);
      manager.recordPerformance('agent-1', 0.80);
      
      const trend = manager.getTrend('agent-1');
      expect(trend).toBe('IMPROVING');
    });

    test('should calculate reliability score', () => {
      manager.registerAgent('agent-1');
      for (let i = 0; i < 10; i++) {
        manager.recordPerformance('agent-1', 0.92);
      }
      
      const reliability = manager.getReliability('agent-1');
      expect(reliability).toBeGreaterThan(0.8);
    });
  });

  describe('Reputation Adjustments', () => {
    test('should reward exceptional performance', () => {
      manager.registerAgent('agent-1', 50);
      manager.rewardExceptional('agent-1', 10);  // +10 points
      
      const rep = manager.getReputation('agent-1');
      expect(rep).toBe(60);
    });

    test('should slash Byzantine agent', () => {
      manager.registerAgent('agent-1', 80);
      manager.slashAgent('agent-1', 30);  // -30 points
      
      const rep = manager.getReputation('agent-1');
      expect(rep).toBe(50);
    });

    test('should reset reputation on comeback', () => {
      manager.registerAgent('agent-1', 20);
      manager.recordPerformance('agent-1', 0.95);  // Start improving
      manager.recordPerformance('agent-1', 0.94);
      manager.recordPerformance('agent-1', 0.96);
      
      const rep = manager.getReputation('agent-1');
      expect(rep).toBeGreaterThan(40);
    });

    test('should apply confidence-based adjustments', () => {
      manager.registerAgent('agent-1', 50);
      
      // High confidence, good performance
      manager.recordPerformance('agent-1', 0.95, { confidence: 0.9 });
      
      const rep1 = manager.getReputation('agent-1');
      
      // Same performance, low confidence
      manager.registerAgent('agent-2', 50);
      manager.recordPerformance('agent-2', 0.95, { confidence: 0.3 });
      
      const rep2 = manager.getReputation('agent-2');
      
      expect(rep1).toBeGreaterThan(rep2);
    });
  });

  describe('Leaderboard & Rankings', () => {
    test('should rank agents by reputation', () => {
      manager.registerAgent('agent-a', 90);
      manager.registerAgent('agent-b', 70);
      manager.registerAgent('agent-c', 80);
      
      const rankings = manager.rankAgents();
      expect(rankings[0].agentId).toBe('agent-a');
      expect(rankings[2].agentId).toBe('agent-b');
    });

    test('should generate top performers list', () => {
      manager.registerAgent('agent-1', 95);
      manager.registerAgent('agent-2', 85);
      manager.registerAgent('agent-3', 45);
      
      const top = manager.getTopPerformers(2);
      expect(top.length).toBe(2);
      expect(top[0].agentId).toBe('agent-1');
    });

    test('should identify at-risk agents', () => {
      manager.registerAgent('agent-1', 50);
      manager.registerAgent('agent-2', 25);
      manager.registerAgent('agent-3', 10);
      
      const atRisk = manager.getAtRiskAgents();
      expect(atRisk.length).toBe(2);  // Agents at <30 rep
    });
  });

  describe('Reporting', () => {
    test('should generate agent report', () => {
      manager.registerAgent('agent-1', 80);
      manager.recordPerformance('agent-1', 0.92);
      
      const report = manager.generateAgentReport('agent-1');
      expect(report.agentId).toBe('agent-1');
      expect(report.reputation).toBe(80);
      expect(report.metrics).toBeDefined();
    });

    test('should generate system health report', () => {
      manager.registerAgent('agent-1', 90);
      manager.registerAgent('agent-2', 85);
      manager.registerAgent('agent-3', 15);
      
      const health = manager.getSystemHealth();
      expect(health.totalAgents).toBe(3);
      expect(health.byzantineAgents).toBe(1);
      expect(health.averageReputation).toBeCloseTo(63.3, 0);
    });

    test('should generate threat report', () => {
      manager.registerAgent('malicious', 10);
      manager.recordPerformance('malicious', 0.10);
      
      const threats = manager.getThreatReport();
      expect(threats.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid agent', () => {
      expect(() => {
        manager.getReputation('non-existent');
      }).toThrow();
    });

    test('should handle invalid performance values', () => {
      manager.registerAgent('agent-1');
      expect(() => {
        manager.recordPerformance('agent-1', 1.5);  // > 100%
      }).toThrow();
    });

    test('should validate adjustment amounts', () => {
      manager.registerAgent('agent-1');
      expect(() => {
        manager.slashAgent('agent-1', -10);  // Negative slash
      }).toThrow();
    });
  });
});
