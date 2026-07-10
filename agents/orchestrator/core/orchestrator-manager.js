// SPDX-License-Identifier: Apache-2.0
/**
 * Orchestrator Manager — test-compatible façade over core/orchestrator.js
 * Implements the full agent/task/reputation/discovery API expected by tests.
 */

'use strict';

const { CanonicalEnvelopeValidator } = require('./validator-adapter');

class Orchestrator {
  constructor(config = {}) {
    this.config = Object.assign({ maxAgents: 50, taskTimeout: 30000 }, config);
    this.agentRegistry = new Map();
    this.taskQueue = new Map();
    this.metricsStore = new Map(); // agentId -> { latency, uptime, throughput, accuracy, ... }
    this.validatorAdapter = new CanonicalEnvelopeValidator();
    this.policyRejectionsByCorrelationId = new Map();
  }

  ingestCanonicalMessage(envelope) {
    const result = this.validatorAdapter.validateIngress(envelope);
    if (result.ok) {
      return result;
    }

    const correlationId = result.correlationId || 'missing-correlation-id';
    const prior = this.policyRejectionsByCorrelationId.get(correlationId) || [];
    prior.push({
      code: result.code,
      errors: result.errors,
      ts: new Date().toISOString(),
    });
    this.policyRejectionsByCorrelationId.set(correlationId, prior);
    return result;
  }

  getPolicyErrors(correlationId) {
    return this.policyRejectionsByCorrelationId.get(correlationId) || [];
  }

  // ─── Config ────────────────────────────────────────────────────────────────
  loadConfig(cfg) {
    Object.assign(this.config, cfg);
    return this.config;
  }

  validateConfig(cfg) {
    if (cfg.maxAgents !== undefined && (typeof cfg.maxAgents !== 'number' || cfg.maxAgents < 0)) return false;
    if (cfg.taskTimeout !== undefined && (typeof cfg.taskTimeout !== 'number' || cfg.taskTimeout < 0)) return false;
    return true;
  }

  updateConfig(cfg) {
    Object.assign(this.config, cfg);
    return this.config;
  }

  // ─── Agent management ──────────────────────────────────────────────────────
  registerAgent(id, opts = {}) {
    if (!id) throw new Error('Agent ID is required');
    const agent = {
      id,
      status: 'REGISTERED',
      reputation: 50,
      accuracyHistory: [],
      capabilities: opts.capabilities || [],
      capacity: opts.capacity !== undefined ? opts.capacity : Infinity,
      ...opts,
    };
    this.agentRegistry.set(id, agent);
    this.metricsStore.set(id, {});
    return agent;
  }

  getAgent(id) { return this.agentRegistry.get(id) || null; }

  listAgents() { return Array.from(this.agentRegistry.values()); }

  updateAgentStatus(id, status) {
    const agent = this.agentRegistry.get(id);
    if (!agent) throw new Error(`Agent not found: ${id}`);
    agent.status = status;
  }

  recoverAgent(id) {
    const agent = this.agentRegistry.get(id);
    if (!agent) throw new Error(`Agent not found: ${id}`);
    if (agent.status === 'FAILED') agent.status = 'REGISTERED';
  }

  // ─── Task management ───────────────────────────────────────────────────────
  _nextTaskId() { return `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }

  enqueueTask(data = {}) {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('Task data must be a valid object');
    }

    // Prevent Prototype Pollution
    const forbiddenKeys = ['__proto__', 'constructor', 'prototype'];
    for (const key of forbiddenKeys) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        throw new Error(`Invalid property: ${key}`);
      }
    }

    // Validate type
    if (data.type !== undefined) {
      if (typeof data.type !== 'string' || data.type.trim() === '') {
        throw new Error('Task type must be a non-empty string');
      }
    }

    // Validate priority
    if (data.priority !== undefined) {
      if (typeof data.priority !== 'string') {
        throw new Error('Task priority must be a string');
      }
      const allowedPriorities = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'];
      if (!allowedPriorities.includes(data.priority.toUpperCase())) {
        throw new Error(`Task priority must be one of: ${allowedPriorities.join(', ')}`);
      }
    }

    // Validate deadline
    if (data.deadline !== undefined && data.deadline !== null) {
      if (typeof data.deadline !== 'number' || isNaN(data.deadline) || data.deadline < 0) {
        throw new Error('Task deadline must be a valid positive number');
      }
    }

    const id = this._nextTaskId();

    // Sanitize and prevent field injection / overwrite of system fields
    const sanitizedData = {};
    for (const [key, value] of Object.entries(data)) {
      if (['id', 'status', 'assignedAgent'].includes(key)) {
        continue;
      }
      sanitizedData[key] = value;
    }

    this.taskQueue.set(id, {
      ...sanitizedData,
      id,
      status: 'PENDING',
      assignedAgent: null,
      priority: data.priority ? data.priority.toUpperCase() : 'NORMAL',
      deadline: data.deadline || null,
      type: data.type || 'generic',
    });
    return id;
  }

  getTask(id) { return this.taskQueue.get(id) || null; }

  assignTask(taskId, agentId) {
    const task = this.taskQueue.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);
    if (!this.agentRegistry.has(agentId)) throw new Error(`Agent not found: ${agentId}`);
    task.assignedAgent = agentId;
    task.status = 'ASSIGNED';
  }

  getTaskStatus(taskId) {
    const t = this.taskQueue.get(taskId);
    return t ? t.status : null;
  }

  updateTaskStatus(taskId, status) {
    const t = this.taskQueue.get(taskId);
    if (t) t.status = status;
  }

  checkExpiredTasks() {
    const now = Date.now();
    return Array.from(this.taskQueue.values())
      .filter(t => t.deadline && t.deadline < now && t.status === 'PENDING')
      .map(t => t.id);
  }

  // ─── Reputation ────────────────────────────────────────────────────────────
  updateReputation(agentId, value) {
    const agent = this.agentRegistry.get(agentId);
    if (!agent) throw new Error(`Agent not found: ${agentId}`);
    agent.reputation = value;
  }

  getReputation(agentId) {
    const agent = this.agentRegistry.get(agentId);
    if (!agent) throw new Error(`Agent not found: ${agentId}`);
    return agent.reputation;
  }

  recordAccuracy(agentId, accuracy) {
    const agent = this.agentRegistry.get(agentId);
    if (!agent) throw new Error(`Agent not found: ${agentId}`);
    if (!agent.accuracyHistory) agent.accuracyHistory = [];
    agent.accuracyHistory.push(accuracy);
    const m = this.metricsStore.get(agentId) || {};
    m.accuracy = accuracy;
    this.metricsStore.set(agentId, m);
  }

  isByzantineAgent(agentId) {
    const agent = this.agentRegistry.get(agentId);
    if (!agent) return false;
    if (agent.reputation < 20) return true;
    if (!agent.accuracyHistory || agent.accuracyHistory.length === 0) return false;
    const avg = agent.accuracyHistory.reduce((s, v) => s + v, 0) / agent.accuracyHistory.length;
    return avg < 0.4;
  }

  // ─── Metrics ───────────────────────────────────────────────────────────────
  recordMetric(agentId, key, value) {
    const m = this.metricsStore.get(agentId) || {};
    m[key] = value;
    this.metricsStore.set(agentId, m);
  }

  getMetrics(agentId) {
    return this.metricsStore.get(agentId) || {};
  }

  getSystemHealth() {
    const agents = this.listAgents();
    return {
      status: 'OK',
      activeAgents: agents.filter(a => a.status !== 'FAILED').length,
      totalAgents: agents.length,
    };
  }

  generateReport() {
    const agents = this.listAgents();
    const metrics = {};
    for (const [id, m] of this.metricsStore.entries()) metrics[id] = m;
    return { totalAgents: agents.length, metrics };
  }

  // ─── Discovery ─────────────────────────────────────────────────────────────
  discoverAgents(filter = {}) {
    let agents = this.listAgents();
    if (filter.minCapacity !== undefined) {
      agents = agents.filter(a => (a.capacity || 0) >= filter.minCapacity);
    }
    return agents;
  }

  findAgentsByCapability(capability) {
    return this.listAgents().filter(
      a => Array.isArray(a.capabilities) && a.capabilities.includes(capability)
    );
  }
}

module.exports = Orchestrator;
