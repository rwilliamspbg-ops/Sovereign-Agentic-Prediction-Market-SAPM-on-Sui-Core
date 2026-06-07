// SPDX-License-Identifier: Apache-2.0
/**
 * ReputationManager — Byzantine-tolerant agent reputation tracking
 * Implements the full API expected by tests/reputation.test.js
 */

'use strict';

const BYZANTINE_REP_THRESHOLD = 20;    // below this → Byzantine
const BYZANTINE_ACC_THRESHOLD = 0.4;   // average accuracy below this → Byzantine
const MIN_SAMPLES_FOR_ACC_CHECK = 5;   // need at least this many samples
const AT_RISK_THRESHOLD = 30;          // reputation below this → at-risk

class ReputationManager {
  constructor(config = {}) {
    this.config = config;
    this.agents = new Map();       // agentId -> agent record
    this.byzantineEvents = new Map(); // agentId -> [{ ts, reason }]
  }

  // ─── Registration ──────────────────────────────────────────────────────────
  registerAgent(agentId, initialReputation = 50) {
    if (!agentId) throw new Error('Agent ID is required');
    this.agents.set(agentId, {
      agentId,
      reputation: initialReputation,
      initialReputation,
      performanceHistory: [], // [{ accuracy, confidence, ts }]
    });
    if (!this.byzantineEvents.has(agentId)) {
      this.byzantineEvents.set(agentId, []);
    }
    return this.agents.get(agentId);
  }

  // ─── Reputation Access ─────────────────────────────────────────────────────
  getReputation(agentId) {
    const agent = this._getAgent(agentId);
    return agent.reputation;
  }

  // ─── Performance Recording ─────────────────────────────────────────────────
  recordPerformance(agentId, accuracy, opts = {}) {
    if (accuracy < 0 || accuracy > 1) throw new Error(`Invalid accuracy: ${accuracy} (must be 0–1)`);
    const agent = this._getAgent(agentId);

    const confidence = (opts && opts.confidence !== undefined) ? opts.confidence : 1.0;
    agent.performanceHistory.push({ accuracy, confidence, ts: Date.now() });

    // Adjust reputation: delta proportional to confidence and deviation from neutral (0.5)
    const deviation = (accuracy - 0.5) * 2;   // –1 to +1
    const delta = deviation * confidence * 10; // ±10 at most
    agent.reputation = Math.min(100, Math.max(0, agent.reputation + delta));

    // Record Byzantine event if threshold crossed
    const avg = this._avgAccuracy(agent);
    if (agent.performanceHistory.length >= MIN_SAMPLES_FOR_ACC_CHECK && avg < BYZANTINE_ACC_THRESHOLD) {
      this.byzantineEvents.get(agentId).push({ ts: Date.now(), reason: 'low_accuracy', avg });
    }

    return agent;
  }

  // ─── Byzantine Detection ───────────────────────────────────────────────────
  isByzantineAgent(agentId) {
    const agent = this._getAgent(agentId);
    if (agent.reputation < BYZANTINE_REP_THRESHOLD) return true;
    if (agent.performanceHistory.length >= MIN_SAMPLES_FOR_ACC_CHECK) {
      return this._avgAccuracy(agent) < BYZANTINE_ACC_THRESHOLD;
    }
    return false;
  }

  getByzantineEvents(agentId) {
    this._getAgent(agentId); // validate exists
    return this.byzantineEvents.get(agentId) || [];
  }

  // ─── Metrics ───────────────────────────────────────────────────────────────
  getMetrics(agentId) {
    const agent = this._getAgent(agentId);
    const h = agent.performanceHistory;
    if (h.length === 0) return { averageAccuracy: null, samples: 0 };
    const avg = this._avgAccuracy(agent);
    return { averageAccuracy: avg, samples: h.length };
  }

  getConsistency(agentId) {
    const agent = this._getAgent(agentId);
    const h = agent.performanceHistory;
    if (h.length < 2) return 1.0;
    const avg = this._avgAccuracy(agent);
    const variance = h.reduce((s, p) => s + Math.pow(p.accuracy - avg, 2), 0) / h.length;
    return Math.max(0, 1 - variance * 10); // low variance = high consistency
  }

  getTrend(agentId) {
    const agent = this._getAgent(agentId);
    const h = agent.performanceHistory;
    if (h.length < 2) return 'STABLE';
    const first = h.slice(0, Math.ceil(h.length / 2)).reduce((s, p) => s + p.accuracy, 0) / Math.ceil(h.length / 2);
    const last = h.slice(Math.floor(h.length / 2)).reduce((s, p) => s + p.accuracy, 0) / Math.ceil(h.length / 2);
    if (last - first > 0.02) return 'IMPROVING';
    if (first - last > 0.02) return 'DECLINING';
    return 'STABLE';
  }

  getReliability(agentId) {
    const agent = this._getAgent(agentId);
    const h = agent.performanceHistory;
    if (h.length === 0) return 0;
    return this._avgAccuracy(agent);
  }

  // ─── Manual Adjustments ────────────────────────────────────────────────────
  rewardExceptional(agentId, points) {
    const agent = this._getAgent(agentId);
    agent.reputation = Math.min(100, agent.reputation + points);
  }

  slashAgent(agentId, points) {
    if (points < 0) throw new Error('Slash amount must be positive');
    const agent = this._getAgent(agentId);
    agent.reputation = Math.max(0, agent.reputation - points);
  }

  // ─── Rankings & Leaderboards ───────────────────────────────────────────────
  rankAgents() {
    return Array.from(this.agents.values())
      .sort((a, b) => b.reputation - a.reputation)
      .map(a => ({ agentId: a.agentId, reputation: a.reputation }));
  }

  getTopPerformers(n = 10) {
    return this.rankAgents().slice(0, n);
  }

  getAtRiskAgents() {
    return Array.from(this.agents.values())
      .filter(a => a.reputation < AT_RISK_THRESHOLD)
      .map(a => ({ agentId: a.agentId, reputation: a.reputation }));
  }

  // ─── Reporting ─────────────────────────────────────────────────────────────
  generateAgentReport(agentId) {
    const agent = this._getAgent(agentId);
    return {
      agentId,
      reputation: agent.initialReputation,
      metrics: this.getMetrics(agentId),
      isByzantine: this.isByzantineAgent(agentId),
    };
  }

  getSystemHealth() {
    const agents = Array.from(this.agents.values());
    const byzantineAgents = agents.filter(a => this.isByzantineAgent(a.agentId)).length;
    const avgRep = agents.reduce((s, a) => s + a.reputation, 0) / (agents.length || 1);
    return {
      totalAgents: agents.length,
      byzantineAgents,
      averageReputation: avgRep,
      status: byzantineAgents / (agents.length || 1) > 0.33 ? 'AT_RISK' : 'HEALTHY',
    };
  }

  getThreatReport() {
    return Array.from(this.agents.values())
      .filter(a => this.isByzantineAgent(a.agentId))
      .map(a => ({
        agentId: a.agentId,
        reputation: a.reputation,
        events: this.byzantineEvents.get(a.agentId) || [],
      }));
  }

  // ─── Internals ─────────────────────────────────────────────────────────────
  _getAgent(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent not found: ${agentId}`);
    return agent;
  }

  _avgAccuracy(agent) {
    const h = agent.performanceHistory;
    if (h.length === 0) return 0;
    return h.reduce((s, p) => s + p.accuracy, 0) / h.length;
  }
}

module.exports = ReputationManager;
