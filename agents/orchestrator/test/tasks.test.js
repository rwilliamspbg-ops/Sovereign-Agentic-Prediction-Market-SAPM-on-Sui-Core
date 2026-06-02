/**
 * Task Distribution Tests
 * Tests for task scheduling, assignment, and execution
 */

const TaskManager = require('../tasks/task-manager');

describe('Task Distribution System', () => {
  let manager;

  beforeEach(() => {
    manager = new TaskManager();
  });

  describe('Task Creation', () => {
    test('should create task with required fields', () => {
      const task = manager.createTask({
        type: 'prediction',
        market: 'BTC-USD',
        deadline: Date.now() + 60000,
      });
      
      expect(task.id).toBeDefined();
      expect(task.type).toBe('prediction');
      expect(task.status).toBe('PENDING');
    });

    test('should validate task inputs', () => {
      expect(() => {
        manager.createTask({ type: null });
      }).toThrow();
    });

    test('should assign unique task IDs', () => {
      const task1 = manager.createTask({ type: 'prediction' });
      const task2 = manager.createTask({ type: 'prediction' });
      
      expect(task1.id).not.toBe(task2.id);
    });

    test('should track task creation time', () => {
      const task = manager.createTask({ type: 'prediction' });
      expect(task.createdAt).toBeDefined();
    });
  });

  describe('Task Assignment', () => {
    test('should assign task to agent', () => {
      const task = manager.createTask({ type: 'prediction' });
      manager.assignTask(task.id, 'agent-1');
      
      const assigned = manager.getTask(task.id);
      expect(assigned.assignedAgent).toBe('agent-1');
      expect(assigned.status).toBe('ASSIGNED');
    });

    test('should reassign task on failure', () => {
      const task = manager.createTask({ type: 'prediction' });
      manager.assignTask(task.id, 'agent-1');
      manager.markTaskFailed(task.id);
      manager.assignTask(task.id, 'agent-2');
      
      const assigned = manager.getTask(task.id);
      expect(assigned.assignedAgent).toBe('agent-2');
      expect(assigned.attemptCount).toBe(2);
    });

    test('should prevent assignment to unavailable agent', () => {
      const task = manager.createTask({ type: 'prediction' });
      manager.setAgentStatus('agent-1', 'OFFLINE');
      
      expect(() => {
        manager.assignTask(task.id, 'agent-1');
      }).toThrow();
    });

    test('should respect agent capacity', () => {
      manager.setAgentCapacity('agent-1', 1);
      
      const task1 = manager.createTask({ type: 'prediction' });
      const task2 = manager.createTask({ type: 'prediction' });
      
      manager.assignTask(task1.id, 'agent-1');
      
      expect(() => {
        manager.assignTask(task2.id, 'agent-1');
      }).toThrow();
    });
  });

  describe('Task Execution', () => {
    test('should track task progress', () => {
      const task = manager.createTask({ type: 'prediction' });
      manager.assignTask(task.id, 'agent-1');
      manager.updateTaskProgress(task.id, { progress: 50 });
      
      const updated = manager.getTask(task.id);
      expect(updated.progress).toBe(50);
    });

    test('should mark task as complete', () => {
      const task = manager.createTask({ type: 'prediction' });
      manager.assignTask(task.id, 'agent-1');
      manager.completeTask(task.id, { result: 0.75 });
      
      const completed = manager.getTask(task.id);
      expect(completed.status).toBe('COMPLETED');
      expect(completed.result).toEqual({ result: 0.75 });
    });

    test('should mark task as failed', () => {
      const task = manager.createTask({ type: 'prediction' });
      manager.assignTask(task.id, 'agent-1');
      manager.markTaskFailed(task.id, { reason: 'Agent crashed' });
      
      const failed = manager.getTask(task.id);
      expect(failed.status).toBe('FAILED');
      expect(failed.failureReason).toBe('Agent crashed');
    });

    test('should handle timeout', () => {
      const task = manager.createTask({
        type: 'prediction',
        deadline: Date.now() - 1000,  // Already past deadline
      });
      
      const expired = manager.checkExpiredTasks();
      expect(expired).toContain(task.id);
    });
  });

  describe('Task Priority', () => {
    test('should prioritize high-priority tasks', () => {
      const lowPriority = manager.createTask({
        type: 'prediction',
        priority: 'LOW',
      });
      const highPriority = manager.createTask({
        type: 'prediction',
        priority: 'HIGH',
      });
      
      const queue = manager.getTaskQueue();
      const highIndex = queue.findIndex(t => t.id === highPriority.id);
      const lowIndex = queue.findIndex(t => t.id === lowPriority.id);
      
      expect(highIndex).toBeLessThan(lowIndex);
    });

    test('should handle task priorities', () => {
      manager.createTask({ type: 'prediction', priority: 'CRITICAL' });
      manager.createTask({ type: 'prediction', priority: 'HIGH' });
      manager.createTask({ type: 'prediction', priority: 'NORMAL' });
      
      const queue = manager.getTaskQueue();
      expect(queue[0].priority).toBe('CRITICAL');
    });
  });

  describe('Batch Operations', () => {
    test('should create task batch', () => {
      const batch = manager.createBatch([
        { type: 'prediction', market: 'BTC-USD' },
        { type: 'prediction', market: 'ETH-USD' },
        { type: 'prediction', market: 'SOL-USD' },
      ]);
      
      expect(batch.id).toBeDefined();
      expect(batch.taskIds.length).toBe(3);
    });

    test('should assign batch to agents', () => {
      const batch = manager.createBatch([
        { type: 'prediction' },
        { type: 'prediction' },
      ]);
      
      manager.assignBatch(batch.id, ['agent-1', 'agent-2']);
      
      const tasks = manager.getTasksByBatch(batch.id);
      expect(tasks[0].assignedAgent).toBe('agent-1');
      expect(tasks[1].assignedAgent).toBe('agent-2');
    });

    test('should track batch completion', () => {
      const batch = manager.createBatch([
        { type: 'prediction' },
        { type: 'prediction' },
      ]);
      
      const taskIds = batch.taskIds;
      manager.completeTask(taskIds[0]);
      manager.completeTask(taskIds[1]);
      
      const status = manager.getBatchStatus(batch.id);
      expect(status.completed).toBe(2);
      expect(status.progress).toBe(100);
    });
  });

  describe('Task Dependencies', () => {
    test('should handle task dependencies', () => {
      const task1 = manager.createTask({ type: 'analysis' });
      const task2 = manager.createTask({
        type: 'prediction',
        dependsOn: [task1.id],
      });
      
      expect(manager.getTask(task2.id).dependsOn).toContain(task1.id);
    });

    test('should not execute dependent task until dependency completes', () => {
      const task1 = manager.createTask({ type: 'analysis' });
      const task2 = manager.createTask({
        type: 'prediction',
        dependsOn: [task1.id],
      });
      
      expect(manager.isReadyForExecution(task2.id)).toBe(false);
      manager.completeTask(task1.id);
      expect(manager.isReadyForExecution(task2.id)).toBe(true);
    });
  });

  describe('Task Monitoring', () => {
    test('should get task status', () => {
      const task = manager.createTask({ type: 'prediction' });
      const status = manager.getTaskStatus(task.id);
      
      expect(status).toBe('PENDING');
    });

    test('should get task statistics', () => {
      manager.createTask({ type: 'prediction' });
      manager.createTask({ type: 'prediction' });
      manager.createTask({ type: 'prediction' });
      
      const stats = manager.getStatistics();
      expect(stats.total).toBe(3);
      expect(stats.pending).toBe(3);
    });

    test('should generate task report', () => {
      const task = manager.createTask({ type: 'prediction' });
      manager.assignTask(task.id, 'agent-1');
      manager.completeTask(task.id);
      
      const report = manager.generateTaskReport(task.id);
      expect(report.id).toBe(task.id);
      expect(report.executionTime).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid task type', () => {
      expect(() => {
        manager.createTask({ type: 'invalid-type' });
      }).toThrow();
    });

    test('should handle task retrieval errors', () => {
      expect(() => {
        manager.getTask('non-existent');
      }).toThrow();
    });

    test('should handle completion of already-completed task', () => {
      const task = manager.createTask({ type: 'prediction' });
      manager.completeTask(task.id);
      
      expect(() => {
        manager.completeTask(task.id);
      }).toThrow();
    });

    test('should recover from failed task', () => {
      const task = manager.createTask({ type: 'prediction' });
      manager.assignTask(task.id, 'agent-1');
      manager.markTaskFailed(task.id);
      
      expect(task.attemptCount).toBeLessThan(manager.maxRetries);
    });
  });

  describe('Performance Optimization', () => {
    test('should balance task distribution', () => {
      manager.setAgentCapacity('agent-1', 10);
      manager.setAgentCapacity('agent-2', 10);
      
      for (let i = 0; i < 20; i++) {
        const task = manager.createTask({ type: 'prediction' });
        manager.autoAssignTask(task.id);  // Auto balance
      }
      
      const a1Count = manager.getAgentTaskCount('agent-1');
      const a2Count = manager.getAgentTaskCount('agent-2');
      
      expect(Math.abs(a1Count - a2Count)).toBeLessThanOrEqual(1);
    });

    test('should prioritize faster agents', () => {
      manager.setAgentPerformance('agent-1', { avgExecutionTime: 100 });
      manager.setAgentPerformance('agent-2', { avgExecutionTime: 500 });
      
      const task = manager.createTask({ type: 'prediction' });
      manager.autoAssignTask(task.id);
      
      expect(manager.getTask(task.id).assignedAgent).toBe('agent-1');
    });
  });
});
