// SPDX-License-Identifier: Apache-2.0
/**
 * TaskManager — full implementation of the task distribution API expected by tests
 */

'use strict';

const crypto = require('crypto');

const VALID_TYPES = new Set(['prediction', 'analysis', 'aggregate', 'commit', 'generic', 'forecast']);
const PRIORITY_RANK = { CRITICAL: 0, HIGH: 1, NORMAL: 2, LOW: 3 };

function uid() {
  return crypto.randomBytes(8).toString('hex');
}

class TaskManager {
  constructor(config = {}) {
    this.config = config;
    this.maxRetries = config.maxRetries !== undefined ? config.maxRetries : 3;
    this.tasks = new Map();       // taskId -> task
    this.batches = new Map();     // batchId -> { id, taskIds }
    this.agentStatuses = new Map(); // agentId -> 'ONLINE'|'OFFLINE'
    this.agentCapacities = new Map(); // agentId -> number
    this.agentAssignments = new Map(); // agentId -> Set of taskIds
    this.agentPerformance = new Map(); // agentId -> { avgExecutionTime, ... }
  }

  // ─── Task Creation ─────────────────────────────────────────────────────────
  createTask(data = {}) {
    if (!data.type) throw new Error('Task type is required');
    if (!VALID_TYPES.has(data.type)) throw new Error(`Invalid task type: ${data.type}`);

    const id = `task-${uid()}`;
    const task = {
      id,
      type: data.type,
      market: data.market || null,
      status: 'PENDING',
      priority: data.priority || 'NORMAL',
      deadline: data.deadline || null,
      dependsOn: data.dependsOn || [],
      assignedAgent: null,
      attemptCount: 0,
      progress: 0,
      result: null,
      failureReason: null,
      createdAt: Date.now(),
      assignedAt: null,
      completedAt: null,
    };

    this.tasks.set(id, task);
    return task;
  }

  // ─── Task Retrieval ────────────────────────────────────────────────────────
  getTask(id) {
    const task = this.tasks.get(id);
    if (!task) throw new Error(`Task not found: ${id}`);
    return task;
  }

  getTaskStatus(id) {
    return this.getTask(id).status;
  }

  // ─── Task Queue ────────────────────────────────────────────────────────────
  getTaskQueue() {
    return Array.from(this.tasks.values())
      .filter(t => t.status === 'PENDING' || t.status === 'ASSIGNED')
      .sort((a, b) => {
        const pa = PRIORITY_RANK[a.priority] !== undefined ? PRIORITY_RANK[a.priority] : 99;
        const pb = PRIORITY_RANK[b.priority] !== undefined ? PRIORITY_RANK[b.priority] : 99;
        return pa - pb;
      });
  }

  // ─── Agent Management ──────────────────────────────────────────────────────
  setAgentStatus(agentId, status) {
    this.agentStatuses.set(agentId, status);
  }

  setAgentCapacity(agentId, capacity) {
    this.agentCapacities.set(agentId, capacity);
    if (!this.agentAssignments.has(agentId)) {
      this.agentAssignments.set(agentId, new Set());
    }
  }

  setAgentPerformance(agentId, perf) {
    this.agentPerformance.set(agentId, perf);
    if (!this.agentAssignments.has(agentId)) {
      this.agentAssignments.set(agentId, new Set());
    }
  }

  getAgentTaskCount(agentId) {
    const s = this.agentAssignments.get(agentId);
    return s ? s.size : 0;
  }

  // ─── Task Assignment ───────────────────────────────────────────────────────
  assignTask(taskId, agentId) {
    const task = this.getTask(taskId);

    // Check agent status
    const status = this.agentStatuses.get(agentId);
    if (status && status !== 'ONLINE') {
      throw new Error(`Agent ${agentId} is not available (status: ${status})`);
    }

    // Check agent capacity
    const capacity = this.agentCapacities.get(agentId);
    if (capacity !== undefined) {
      const current = this.getAgentTaskCount(agentId);
      if (current >= capacity) {
        throw new Error(`Agent ${agentId} at capacity (${capacity})`);
      }
    }

    task.assignedAgent = agentId;
    task.status = 'ASSIGNED';
    task.attemptCount += 1;
    task.assignedAt = Date.now();

    if (!this.agentAssignments.has(agentId)) {
      this.agentAssignments.set(agentId, new Set());
    }
    this.agentAssignments.get(agentId).add(taskId);

    return task;
  }

  autoAssignTask(taskId) {
    // Collect all known agents (from capacity map OR performance map)
    const agentIds = new Set([
      ...this.agentCapacities.keys(),
      ...this.agentPerformance.keys(),
    ]);

    const candidates = Array.from(agentIds).filter(agentId => {
      const status = this.agentStatuses.get(agentId);
      if (status && status !== 'ONLINE') return false;

      const capacity = this.agentCapacities.get(agentId);
      if (capacity !== undefined) {
        return this.getAgentTaskCount(agentId) < capacity;
      }
      // No explicit capacity → unlimited
      return true;
    });

    if (candidates.length === 0) return null;

    // Sort by avgExecutionTime (lower = faster), then by current load
    candidates.sort((a, b) => {
      const pa = this.agentPerformance.get(a) || {};
      const pb = this.agentPerformance.get(b) || {};
      const ta = pa.avgExecutionTime !== undefined ? pa.avgExecutionTime : Infinity;
      const tb = pb.avgExecutionTime !== undefined ? pb.avgExecutionTime : Infinity;
      if (ta !== tb) return ta - tb;
      return this.getAgentTaskCount(a) - this.getAgentTaskCount(b);
    });

    this.assignTask(taskId, candidates[0]);
    return candidates[0];
  }

  // ─── Task Lifecycle ────────────────────────────────────────────────────────
  updateTaskProgress(taskId, update = {}) {
    const task = this.getTask(taskId);
    if (update.progress !== undefined) task.progress = update.progress;
    return task;
  }

  completeTask(taskId, result = null) {
    const task = this.getTask(taskId);
    if (task.status === 'COMPLETED') {
      throw new Error(`Task ${taskId} is already completed`);
    }
    task.status = 'COMPLETED';
    task.result = result;
    task.completedAt = Date.now();
    if (task.assignedAgent) {
      const s = this.agentAssignments.get(task.assignedAgent);
      if (s) s.delete(taskId);
    }
    return task;
  }

  markTaskFailed(taskId, opts = {}) {
    const task = this.getTask(taskId);
    task.status = 'FAILED';
    task.failureReason = opts.reason || null;
    if (task.assignedAgent) {
      const s = this.agentAssignments.get(task.assignedAgent);
      if (s) s.delete(taskId);
    }
    return task;
  }

  checkExpiredTasks() {
    const now = Date.now();
    return Array.from(this.tasks.values())
      .filter(t => t.deadline && t.deadline < now && t.status === 'PENDING')
      .map(t => t.id);
  }

  // ─── Dependencies ──────────────────────────────────────────────────────────
  isReadyForExecution(taskId) {
    const task = this.getTask(taskId);
    if (!task.dependsOn || task.dependsOn.length === 0) return true;
    return task.dependsOn.every(depId => {
      try {
        return this.getTask(depId).status === 'COMPLETED';
      } catch {
        return false;
      }
    });
  }

  // ─── Batch Operations ──────────────────────────────────────────────────────
  createBatch(taskDataList = []) {
    const batchId = `batch-${uid()}`;
    const taskIds = taskDataList.map(d => this.createTask(d).id);
    const batch = { id: batchId, taskIds };
    this.batches.set(batchId, batch);
    return batch;
  }

  assignBatch(batchId, agentIds = []) {
    const batch = this.batches.get(batchId);
    if (!batch) throw new Error(`Batch not found: ${batchId}`);
    batch.taskIds.forEach((taskId, i) => {
      const agentId = agentIds[i % agentIds.length];
      if (agentId) this.assignTask(taskId, agentId);
    });
  }

  getTasksByBatch(batchId) {
    const batch = this.batches.get(batchId);
    if (!batch) throw new Error(`Batch not found: ${batchId}`);
    return batch.taskIds.map(id => this.getTask(id));
  }

  getBatchStatus(batchId) {
    const tasks = this.getTasksByBatch(batchId);
    const completed = tasks.filter(t => t.status === 'COMPLETED').length;
    return {
      total: tasks.length,
      completed,
      failed: tasks.filter(t => t.status === 'FAILED').length,
      pending: tasks.filter(t => t.status === 'PENDING').length,
      progress: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
    };
  }

  // ─── Statistics ────────────────────────────────────────────────────────────
  getStatistics() {
    const all = Array.from(this.tasks.values());
    const by = (s) => all.filter(t => t.status === s).length;
    return {
      total: all.length,
      pending: by('PENDING'),
      assigned: by('ASSIGNED'),
      completed: by('COMPLETED'),
      failed: by('FAILED'),
    };
  }

  generateTaskReport(taskId) {
    const task = this.getTask(taskId);
    const execTime = task.completedAt && task.assignedAt
      ? task.completedAt - task.assignedAt
      : task.completedAt
        ? task.completedAt - task.createdAt
        : null;
    return {
      id: task.id,
      type: task.type,
      status: task.status,
      assignedAgent: task.assignedAgent,
      executionTime: execTime,
      result: task.result,
    };
  }
}

module.exports = TaskManager;
