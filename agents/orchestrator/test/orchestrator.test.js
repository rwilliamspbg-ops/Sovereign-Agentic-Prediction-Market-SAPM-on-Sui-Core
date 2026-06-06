// SPDX-License-Identifier: Apache-2.0
/**
 * Orchestrator Core Tests
 * Tests for the main orchestrator class
 */

const Orchestrator = require('../core/orchestrator');

describe('Orchestrator Core', () => {
  let orchestrator;

  beforeEach(() => {
    orchestrator = new Orchestrator();
  });

  describe('Initialization', () => {
    test('should initialize with default configuration', () => {
      expect(orchestrator).toBeDefined();
      expect(orchestrator.config).toBeDefined();
    });

    test('should have agent registry initialized', () => {
      expect(orchestrator.agentRegistry).toBeDefined();
    });

    test('should have task queue initialized', () => {
      expect(orchestrator.taskQueue).toBeDefined();
    });
  });

  describe('Agent Management', () => {
    test('should register new agent', () => {
      const agent = orchestrator.registerAgent('test-agent', {
        model: 'llama2',
        stake: 1000,
      });
      
      expect(agent.id).toBe('test-agent');
      expect(agent.status).toBe('REGISTERED');
    });

    test('should retrieve agent by ID', () => {
      orchestrator.registerAgent('agent-1', { model: 'gpt4' });
      const agent = orchestrator.getAgent('agent-1');
      
      expect(agent).toBeDefined();
      expect(agent.id).toBe('agent-1');
    });

    test('should list all registered agents', () => {
      orchestrator.registerAgent('agent-1', {});
      orchestrator.registerAgent('agent-2', {});
      
      const agents = orchestrator.listAgents();
      expect(agents.length).toBe(2);
    });

    test('should update agent status', () => {
      orchestrator.registerAgent('agent-1', {});
      orchestrator.updateAgentStatus('agent-1', 'ACTIVE');
      
      const agent = orchestrator.getAgent('agent-1');
      expect(agent.status).toBe('ACTIVE');
    });
  });

  describe('Task Distribution', () => {
    test('should enqueue task', () => {
      const taskId = orchestrator.enqueueTask({
        type: 'prediction',
        market: 'BTC-USD',
        deadline: Date.now() + 60000,
      });
      
      expect(taskId).toBeDefined();
    });

    test('should assign task to agent', () => {
      orchestrator.registerAgent('agent-1', {});
      const taskId = orchestrator.enqueueTask({ type: 'prediction' });
      
      orchestrator.assignTask(taskId, 'agent-1');
      const task = orchestrator.getTask(taskId);
      
      expect(task.assignedAgent).toBe('agent-1');
    });

    test('should track task status', () => {
      const taskId = orchestrator.enqueueTask({ type: 'prediction' });
      
      expect(orchestrator.getTaskStatus(taskId)).toBe('PENDING');
      
      orchestrator.updateTaskStatus(taskId, 'COMPLETED');
      expect(orchestrator.getTaskStatus(taskId)).toBe('COMPLETED');
    });

    test('should handle task timeout', () => {
      const taskId = orchestrator.enqueueTask({
        type: 'prediction',
        deadline: Date.now() - 1000,  // Already past deadline
      });
      
      const expired = orchestrator.checkExpiredTasks();
      expect(expired).toContain(taskId);
    });
  });

  describe('Reputation Tracking', () => {
    test('should update agent reputation', () => {
      orchestrator.registerAgent('agent-1', {});
      orchestrator.updateReputation('agent-1', 75);
      
      const rep = orchestrator.getReputation('agent-1');
      expect(rep).toBe(75);
    });

    test('should track accuracy metrics', () => {
      orchestrator.registerAgent('agent-1', {});
      orchestrator.recordAccuracy('agent-1', 0.92);
      
      const metrics = orchestrator.getMetrics('agent-1');
      expect(metrics.accuracy).toBe(0.92);
    });

    test('should detect Byzantine agents', () => {
      orchestrator.registerAgent('malicious', {});
      
      // Record poor accuracy
      for (let i = 0; i < 5; i++) {
        orchestrator.recordAccuracy('malicious', 0.15);  // Very low
      }
      
      const isByzantine = orchestrator.isByzantineAgent('malicious');
      expect(isByzantine).toBe(true);
    });
  });

  describe('Discovery Service', () => {
    test('should discover available agents', async () => {
      orchestrator.registerAgent('agent-1', { capacity: 10 });
      orchestrator.registerAgent('agent-2', { capacity: 20 });
      
      const discovered = orchestrator.discoverAgents({ minCapacity: 15 });
      expect(discovered.length).toBe(1);
      expect(discovered[0].id).toBe('agent-2');
    });

    test('should find agent by capability', () => {
      orchestrator.registerAgent('agent-1', {
        capabilities: ['prediction', 'analysis'],
      });
      orchestrator.registerAgent('agent-2', { capabilities: ['prediction'] });
      
      const agents = orchestrator.findAgentsByCapability('analysis');
      expect(agents.length).toBe(1);
      expect(agents[0].id).toBe('agent-1');
    });
  });

  describe('Performance Monitoring', () => {
    test('should track system metrics', () => {
      orchestrator.registerAgent('agent-1', {});
      orchestrator.recordMetric('agent-1', 'latency', 250);
      
      const metrics = orchestrator.getMetrics('agent-1');
      expect(metrics.latency).toBe(250);
    });

    test('should calculate system health', () => {
      orchestrator.registerAgent('agent-1', {});
      orchestrator.recordMetric('agent-1', 'uptime', 0.99);
      
      const health = orchestrator.getSystemHealth();
      expect(health.status).toBeDefined();
      expect(health.activeAgents).toBe(1);
    });

    test('should generate performance report', () => {
      orchestrator.registerAgent('agent-1', {});
      orchestrator.recordMetric('agent-1', 'throughput', 100);
      
      const report = orchestrator.generateReport();
      expect(report.totalAgents).toBe(1);
      expect(report.metrics).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle agent registration errors', () => {
      expect(() => {
        orchestrator.registerAgent(null, {});
      }).toThrow();
    });

    test('should handle invalid task assignment', () => {
      const taskId = orchestrator.enqueueTask({});
      expect(() => {
        orchestrator.assignTask(taskId, 'non-existent-agent');
      }).toThrow();
    });

    test('should recover from agent failure', () => {
      orchestrator.registerAgent('agent-1', {});
      orchestrator.updateAgentStatus('agent-1', 'FAILED');
      
      orchestrator.recoverAgent('agent-1');
      const agent = orchestrator.getAgent('agent-1');
      expect(agent.status).not.toBe('FAILED');
    });
  });

  describe('Configuration Management', () => {
    test('should load configuration', () => {
      const config = orchestrator.loadConfig({
        maxAgents: 100,
        taskTimeout: 30000,
      });
      
      expect(config.maxAgents).toBe(100);
      expect(config.taskTimeout).toBe(30000);
    });

    test('should validate configuration', () => {
      const valid = orchestrator.validateConfig({
        maxAgents: 50,
        taskTimeout: 60000,
      });
      
      expect(valid).toBe(true);
    });

    test('should apply configuration changes', () => {
      orchestrator.updateConfig({ maxAgents: 200 });
      expect(orchestrator.config.maxAgents).toBe(200);
    });
  });
});
