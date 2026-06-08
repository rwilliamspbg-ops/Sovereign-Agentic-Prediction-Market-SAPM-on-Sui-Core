'use client';

import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { create } from 'zustand';
import { marketDataService } from '@/services/sui/market-data-service';
import { deepbookService } from '@/services/sui/deepbook-service';
import { walrusService } from '@/services/sui/walrus-service';
import { stateValidatorService } from '@/services/state-validator';

const DIVERGENCE_THRESHOLD_PCT = 12;
const DIVERGENCE_WINDOW_MS = 5 * 60 * 1000;

export type OutcomeCard = {
  name: string;
  odds: number;
  stakeWeight: number;
};

export type CurrentMarketState = {
  id: string;
  eventName: string;
  stakesCount: number;
  totalVolume: number;
  maxStakeableAmount: number;
  liquidityScore: number;
  signalConfidence: number;
  compositeConfidence: number;
  oddsRange: { min: number; max: number };
  outcomes: OutcomeCard[];
};

export type SystemHealth = {
  deepbookConnected: boolean;
  walrusConnected: boolean;
  walrusMessage: string;
};

export type AgentToast = {
  id: string;
  level: 'info' | 'warn' | 'error';
  message: string;
};

export type DensityMode = 'standard' | 'advanced';

export type DivergenceAlert = {
  active: boolean;
  message: string;
  deviationPct: number;
  thresholdPct: number;
  detectedAt: number | null;
};

export type SimulationResult = {
  scenario: string;
  projectedShiftPct: number;
  summary: string;
  projectedOutcomes: OutcomeCard[];
};

export type AgentTrailEntry = {
  id: string;
  ts: string;
  stage: string;
  detail: string;
};

export type AdvancedMetrics = {
  hvi: number;
  addressClusters: Array<{ cluster: string; volumePct: number }>;
  toolCallTrace: string[];
};

type AgentStore = {
  marketData: CurrentMarketState;
  isLoading: boolean;
  walletConnected: boolean;
  walletAddress: string | null;
  walletBalance: number;
  systemHealth: SystemHealth;
  toasts: AgentToast[];
  approvals: Record<string, boolean>;
  densityMode: DensityMode;
  divergenceAlert: DivergenceAlert;
  simulationResult: SimulationResult | null;
  agentTrail: AgentTrailEntry[];
  advancedMetrics: AdvancedMetrics;
  lastBaseline: { ts: number; odds: Record<string, number> } | null;
  setWalletState: (connected: boolean, address: string | null) => void;
  addToast: (toast: Omit<AgentToast, 'id'>) => void;
  dismissToast: (id: string) => void;
  setApproval: (actionId: string, approved: boolean) => void;
  setDensityMode: (mode: DensityMode) => void;
  runScenarioSimulation: (scenario: string) => void;
  clearDivergenceAlert: () => void;
  appendTrail: (stage: string, detail: string) => void;
  refreshMarketData: () => Promise<void>;
  refreshSystemHealth: () => Promise<void>;
  stakeFunds: (amount: number, outcomeName: string) => Promise<{ ok: boolean; reason?: string }>;
};

const defaultMarketData: CurrentMarketState = {
  id: 'fixture-market',
  eventName: 'Will SUI close above $5 by end of 2026?',
  stakesCount: 0,
  totalVolume: 0,
  maxStakeableAmount: 1,
  liquidityScore: 0,
  signalConfidence: 0.5,
  compositeConfidence: 0.25,
  oddsRange: { min: 1.01, max: 10 },
  outcomes: [
    { name: 'Outcome A', odds: 1.8, stakeWeight: 50 },
    { name: 'Outcome B', odds: 2.2, stakeWeight: 50 },
  ],
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function computeConfidence(totalVolume: number, maxStakeableAmount: number, walrusOk: boolean, deepbookOk: boolean) {
  const liquidityScore = clamp(totalVolume / Math.max(maxStakeableAmount, 1), 0, 1);
  const signalConfidence = (Number(walrusOk) + Number(deepbookOk)) / 2;
  const compositeConfidence = clamp((liquidityScore * 0.65) + (signalConfidence * 0.35), 0, 1);
  return {
    liquidityScore,
    signalConfidence,
    compositeConfidence,
  };
}

function normalizeWeights(outcomes: OutcomeCard[]): OutcomeCard[] {
  const total = outcomes.reduce((acc, item) => acc + item.stakeWeight, 0);
  const fallback = outcomes.length > 0 ? 100 / outcomes.length : 50;
  return outcomes.map((item) => ({
    ...item,
    stakeWeight: total <= 0 ? fallback : clamp((item.stakeWeight / total) * 100, 0, 100),
  }));
}

function toTrailEntry(stage: string, detail: string): AgentTrailEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ts: new Date().toISOString(),
    stage,
    detail,
  };
}

function computeAdvancedMetrics(marketData: CurrentMarketState, trail: AgentTrailEntry[]): AdvancedMetrics {
  const topToolCalls = trail.slice(-5).map((entry) => `${entry.stage}: ${entry.detail}`);
  const hvi = clamp(Math.abs(marketData.outcomes[0].odds - marketData.outcomes[1].odds) * 18, 4, 100);
  const whales = clamp((marketData.totalVolume / Math.max(marketData.maxStakeableAmount, 1)) * 55, 5, 68);
  const pros = clamp(82 - whales, 8, 62);
  const retail = clamp(100 - whales - pros, 6, 70);

  return {
    hvi,
    addressClusters: [
      { cluster: 'Whale Cluster', volumePct: whales },
      { cluster: 'Pro Desks', volumePct: pros },
      { cluster: 'Retail Swarm', volumePct: retail },
    ],
    toolCallTrace: topToolCalls,
  };
}

function computeDivergencePct(currentOdds: Record<string, number>, baselineOdds: Record<string, number>): number {
  const keys = Object.keys(currentOdds);
  if (keys.length === 0) {
    return 0;
  }

  const changes = keys.map((key) => {
    const baseline = Math.max(baselineOdds[key] || 1, 0.01);
    return Math.abs((currentOdds[key] - baseline) / baseline) * 100;
  });

  return changes.reduce((acc, value) => acc + value, 0) / changes.length;
}

const useAgentStore = create<AgentStore>((set, get) => ({
  marketData: defaultMarketData,
  isLoading: true,
  walletConnected: false,
  walletAddress: null,
  walletBalance: 1250,
  systemHealth: {
    deepbookConnected: false,
    walrusConnected: false,
    walrusMessage: 'Initializing status checks...',
  },
  toasts: [],
  approvals: {},
  densityMode: 'standard',
  divergenceAlert: {
    active: false,
    message: '',
    deviationPct: 0,
    thresholdPct: DIVERGENCE_THRESHOLD_PCT,
    detectedAt: null,
  },
  simulationResult: null,
  agentTrail: [
    toTrailEntry('Input', 'Market bootstrap requested by dashboard mount.'),
    toTrailEntry('Tool A Execution', 'marketDataService.getOnchainMarkets invoked.'),
    toTrailEntry('State Update', 'Initial market snapshot seeded for visualization.'),
    toTrailEntry('Final Recommendation', 'Await user action or simulation request.'),
  ],
  advancedMetrics: {
    hvi: 14,
    addressClusters: [
      { cluster: 'Whale Cluster', volumePct: 31 },
      { cluster: 'Pro Desks', volumePct: 37 },
      { cluster: 'Retail Swarm', volumePct: 32 },
    ],
    toolCallTrace: [],
  },
  lastBaseline: null,

  setWalletState: (connected, address) => {
    set({ walletConnected: connected, walletAddress: address });
  },

  addToast: (toast) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
  },

  dismissToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((entry) => entry.id !== id) }));
  },

  setApproval: (actionId, approved) => {
    set((state) => ({ approvals: { ...state.approvals, [actionId]: approved } }));
  },

  setDensityMode: (mode) => {
    set((state) => {
      const nextTrail = [...state.agentTrail, toTrailEntry('State Update', `Dashboard density switched to ${mode} mode.`)];
      return {
        densityMode: mode,
        agentTrail: nextTrail,
        advancedMetrics: computeAdvancedMetrics(state.marketData, nextTrail),
      };
    });
  },

  runScenarioSimulation: (scenario) => {
    const trimmed = scenario.trim();
    if (!trimmed) {
      get().addToast({ level: 'warn', message: 'Add a scenario description before simulation.' });
      return;
    }

    const pctMatch = trimmed.match(/(\d{1,3})\s*%/);
    const detectedPct = pctMatch ? clamp(Number(pctMatch[1]), 1, 90) : 12;
    const directionalBoost = /(gain|increase|funding|surge|up|bull)/i.test(trimmed) ? 1 : -1;
    const shiftPct = directionalBoost * detectedPct;

    set((state) => {
      const projectedOutcomes = state.marketData.outcomes.map((outcome, index) => {
        const direction = index === 0 ? 1 : -1;
        const weightDelta = direction * shiftPct * 0.35;
        const nextWeight = clamp(outcome.stakeWeight + weightDelta, 4, 96);
        const nextOdds = clamp(outcome.odds * (direction > 0 ? 0.96 : 1.04), state.marketData.oddsRange.min, state.marketData.oddsRange.max);
        return {
          ...outcome,
          stakeWeight: nextWeight,
          odds: nextOdds,
        };
      });

      const normalized = normalizeWeights(projectedOutcomes);
      const simulationResult: SimulationResult = {
        scenario: trimmed,
        projectedShiftPct: shiftPct,
        projectedOutcomes: normalized,
        summary: shiftPct > 0
          ? 'Scenario indicates stronger probability pressure toward Outcome A with tighter spread.'
          : 'Scenario indicates rotational pressure away from Outcome A and wider spread risk.',
      };

      const nextTrail = [
        ...state.agentTrail,
        toTrailEntry('Input', `Simulation requested: ${trimmed}`),
        toTrailEntry('Tool A Execution', 'Scenario parser extracted directional funding and percentage signal.'),
        toTrailEntry('Tool B Execution', `Projected odds shifted by ${Math.abs(shiftPct).toFixed(1)}% under synthetic order-flow model.`),
        toTrailEntry('Final Recommendation', simulationResult.summary),
      ];

      return {
        simulationResult,
        agentTrail: nextTrail,
        advancedMetrics: computeAdvancedMetrics(state.marketData, nextTrail),
      };
    });

    get().addToast({ level: 'info', message: 'Scenario simulation complete. Review projected curve shift before staking.' });
  },

  clearDivergenceAlert: () => {
    set((state) => ({
      divergenceAlert: {
        ...state.divergenceAlert,
        active: false,
      },
    }));
  },

  appendTrail: (stage, detail) => {
    set((state) => {
      const nextTrail = [...state.agentTrail, toTrailEntry(stage, detail)];
      return {
        agentTrail: nextTrail,
        advancedMetrics: computeAdvancedMetrics(state.marketData, nextTrail),
      };
    });
  },

  refreshMarketData: async () => {
    set({ isLoading: true });
    try {
      const [onchainMarkets, health] = await Promise.all([
        marketDataService.getOnchainMarkets(),
        get().refreshSystemHealth(),
      ]);

      if (onchainMarkets.length === 0) {
        const current = get().marketData;
        const confidence = computeConfidence(current.totalVolume, current.maxStakeableAmount, get().systemHealth.walrusConnected, get().systemHealth.deepbookConnected);
        set({
          marketData: {
            ...current,
            liquidityScore: confidence.liquidityScore,
            signalConfidence: confidence.signalConfidence,
            compositeConfidence: confidence.compositeConfidence,
          },
          isLoading: false,
        });
        return;
      }

      const selected = onchainMarkets[0];
      const yesWeight = clamp(selected.yesPrice * 100, 0, 100);
      const noWeight = clamp(selected.noPrice * 100, 0, 100);
      const oddsYes = clamp(1 / Math.max(selected.yesPrice, 0.01), 1.01, 10);
      const oddsNo = clamp(1 / Math.max(selected.noPrice, 0.01), 1.01, 10);
      const maxStakeableAmount = Math.max(selected.tvl || 1, 1);
      const totalVolume = Math.max((selected.yesVolume || 0) + (selected.noVolume || 0), 0);

      const confidence = computeConfidence(totalVolume, maxStakeableAmount, get().systemHealth.walrusConnected, get().systemHealth.deepbookConnected);
      const nextOdds = {
        'Outcome A': oddsYes,
        'Outcome B': oddsNo,
      };
      const now = Date.now();
      const previousBaseline = get().lastBaseline;
      const canCompare = Boolean(previousBaseline) && now - (previousBaseline?.ts || 0) <= DIVERGENCE_WINDOW_MS;
      const divergencePct = canCompare
        ? computeDivergencePct(nextOdds, previousBaseline?.odds || {})
        : 0;
      const hasDiverged = canCompare && divergencePct > DIVERGENCE_THRESHOLD_PCT;

      set({
        marketData: {
          id: selected.id,
          eventName: selected.question,
          stakesCount: Math.round((selected.volume24h || 0) / 100),
          totalVolume,
          maxStakeableAmount,
          liquidityScore: confidence.liquidityScore,
          signalConfidence: confidence.signalConfidence,
          compositeConfidence: confidence.compositeConfidence,
          oddsRange: { min: 1.01, max: 10 },
          outcomes: [
            { name: 'Outcome A', odds: oddsYes, stakeWeight: yesWeight },
            { name: 'Outcome B', odds: oddsNo, stakeWeight: noWeight },
          ],
        },
        divergenceAlert: hasDiverged
          ? {
              active: true,
              deviationPct: divergencePct,
              thresholdPct: DIVERGENCE_THRESHOLD_PCT,
              detectedAt: now,
              message: 'Market Divergence Alert: Live odds suggest a rapid shift away from previous consensus. Review data sources.',
            }
          : get().divergenceAlert,
        lastBaseline: !previousBaseline || now - previousBaseline.ts > DIVERGENCE_WINDOW_MS
          ? { ts: now, odds: nextOdds }
          : previousBaseline,
        isLoading: false,
      });

      if (hasDiverged) {
        get().addToast({ level: 'warn', message: 'Market divergence exceeded baseline threshold within 5 minutes.' });
        get().appendTrail('State Update', `Divergence alert triggered at ${divergencePct.toFixed(1)}% vs baseline.`);
      }

      if (!previousBaseline || now - previousBaseline.ts > DIVERGENCE_WINDOW_MS) {
        get().appendTrail('State Update', 'Baseline odds refreshed for new 5-minute divergence window.');
      }

      void health;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load market data.';
      get().addToast({ level: 'error', message });
      set({ isLoading: false });
    }
  },

  refreshSystemHealth: async () => {
    try {
      const [deepbookStatus, walrusStatus] = await Promise.all([
        deepbookService.getStatus(),
        walrusService.getStatus(),
      ]);

      set((state) => {
        const confidence = computeConfidence(
          state.marketData.totalVolume,
          state.marketData.maxStakeableAmount,
          walrusStatus.aggregatorReachable,
          deepbookStatus.rpcReachable
        );

        return {
          systemHealth: {
            deepbookConnected: deepbookStatus.rpcReachable,
            walrusConnected: walrusStatus.aggregatorReachable,
            walrusMessage: walrusStatus.error || 'Healthy',
          },
          marketData: {
            ...state.marketData,
            liquidityScore: confidence.liquidityScore,
            signalConfidence: confidence.signalConfidence,
            compositeConfidence: confidence.compositeConfidence,
          },
        };
      });
    } catch {
      set({
        systemHealth: {
          deepbookConnected: false,
          walrusConnected: false,
          walrusMessage: 'Status checks failed. Retrying in background.',
        },
      });
    }
  },

  stakeFunds: async (amount, outcomeName) => {
    const state = get();
    const outcome = state.marketData.outcomes.find((entry) => entry.name === outcomeName) || state.marketData.outcomes[0];
    const actionId = `stake:${state.marketData.id}`;
    const check = stateValidatorService.validateStake({
      walletConnected: state.walletConnected,
      odds: outcome.odds,
      minOdds: state.marketData.oddsRange.min,
      maxOdds: state.marketData.oddsRange.max,
      hasUserApproval: Boolean(state.approvals[actionId]),
      actionId,
    });

    if (!check.valid) {
      get().addToast({ level: 'error', message: check.message || 'Validation failed before staking.' });
      return { ok: false, reason: check.message };
    }

    if (amount <= 0) {
      get().addToast({ level: 'warn', message: 'Enter a positive stake amount before submitting.' });
      return { ok: false, reason: 'Invalid stake amount' };
    }

    get().appendTrail('Input', `Stake request received for ${amount.toFixed(2)} SUI on ${outcome.name}.`);
    get().appendTrail('Tool A Execution', 'State validator approved wallet, odds range, and HITL approval.');

    const impactRatio = clamp(amount / Math.max(state.marketData.totalVolume + 1, 1), 0.01, 0.35);
    const shifted = state.marketData.outcomes.map((entry) => {
      const isSelected = entry.name === outcome.name;
      const weightDelta = isSelected ? impactRatio * 30 : -(impactRatio * 30) / Math.max(state.marketData.outcomes.length - 1, 1);
      const nextWeight = clamp(entry.stakeWeight + weightDelta, 2, 98);
      const oddsScale = isSelected ? 1 - (impactRatio * 0.25) : 1 + (impactRatio * 0.18);
      const nextOdds = clamp(entry.odds * oddsScale, state.marketData.oddsRange.min, state.marketData.oddsRange.max);
      return {
        ...entry,
        stakeWeight: nextWeight,
        odds: nextOdds,
      };
    });

    const normalizedOutcomes = normalizeWeights(shifted);

    get().addToast({ level: 'info', message: `Stake submitted: ${amount.toFixed(2)} SUI on ${outcome.name}.` });
    set((prev) => ({
      marketData: {
        ...prev.marketData,
        stakesCount: prev.marketData.stakesCount + 1,
        totalVolume: prev.marketData.totalVolume + amount,
        outcomes: normalizedOutcomes,
      },
      walletBalance: Math.max(0, prev.walletBalance - amount),
    }));

    const nextTrail = [
      ...get().agentTrail,
      toTrailEntry('State Update', `Curve rebalanced with ${(impactRatio * 100).toFixed(1)}% local impact from latest stake.`),
      toTrailEntry('Tool B Execution', 'Risk/odds recalibration pass completed for affected outcomes.'),
      toTrailEntry('Final Recommendation', 'Stake accepted. Monitor divergence and liquidity before next move.'),
    ];

    set((store) => ({
      agentTrail: nextTrail,
      advancedMetrics: computeAdvancedMetrics(store.marketData, nextTrail),
    }));

    return { ok: true };
  },
}));

type MarketContextValue = {
  refreshMarketData: () => Promise<void>;
  requestActionApproval: (actionId: string) => void;
  setDensityMode: (mode: DensityMode) => void;
  runScenarioSimulation: (scenario: string) => void;
  clearDivergenceAlert: () => void;
  stakeFunds: (amount: number, outcomeName: string) => Promise<{ ok: boolean; reason?: string }>;
};

const MarketContext = createContext<MarketContextValue | null>(null);

export function AgentStateProvider({ children }: { children: React.ReactNode }) {
  const refreshMarketData = useAgentStore((state) => state.refreshMarketData);
  const setApproval = useAgentStore((state) => state.setApproval);
  const setDensityMode = useAgentStore((state) => state.setDensityMode);
  const runScenarioSimulation = useAgentStore((state) => state.runScenarioSimulation);
  const clearDivergenceAlert = useAgentStore((state) => state.clearDivergenceAlert);
  const stakeFunds = useAgentStore((state) => state.stakeFunds);
  const setWalletState = useAgentStore((state) => state.setWalletState);

  useEffect(() => {
    void refreshMarketData();
    const intervalId = window.setInterval(() => {
      void refreshMarketData();
    }, 30000);

    const onWalletUpdate = (event: Event) => {
      const custom = event as CustomEvent<{ connected?: boolean; address?: string | null }>;
      setWalletState(Boolean(custom.detail?.connected), custom.detail?.address || null);
    };

    window.addEventListener('sapm:wallet-updated', onWalletUpdate as EventListener);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('sapm:wallet-updated', onWalletUpdate as EventListener);
    };
  }, [refreshMarketData, setWalletState]);

  const value = useMemo<MarketContextValue>(() => ({
    refreshMarketData,
    requestActionApproval: (actionId: string) => {
      setApproval(actionId, true);
      useAgentStore.getState().addToast({ level: 'info', message: `Approval granted for ${actionId}.` });
    },
    setDensityMode,
    runScenarioSimulation,
    clearDivergenceAlert,
    stakeFunds,
  }), [clearDivergenceAlert, refreshMarketData, runScenarioSimulation, setApproval, setDensityMode, stakeFunds]);

  return React.createElement(MarketContext.Provider, { value }, children);
}

export function useMarketActions(): MarketContextValue {
  const context = useContext(MarketContext);
  if (!context) {
    throw new Error('useMarketActions must be used within AgentStateProvider.');
  }
  return context;
}

export function useAgentState(scope: 'currentMarket'): {
  marketData: CurrentMarketState;
  isLoading: boolean;
  toasts: AgentToast[];
  dismissToast: (id: string) => void;
  systemHealth: SystemHealth;
  walletConnected: boolean;
  walletAddress: string | null;
  walletBalance: number;
  densityMode: DensityMode;
  divergenceAlert: DivergenceAlert;
  simulationResult: SimulationResult | null;
  agentTrail: AgentTrailEntry[];
  advancedMetrics: AdvancedMetrics;
};
export function useAgentState(scope?: 'all'): {
  marketData: CurrentMarketState;
  isLoading: boolean;
  toasts: AgentToast[];
  dismissToast: (id: string) => void;
  systemHealth: SystemHealth;
  walletConnected: boolean;
  walletAddress: string | null;
  walletBalance: number;
  densityMode: DensityMode;
  divergenceAlert: DivergenceAlert;
  simulationResult: SimulationResult | null;
  agentTrail: AgentTrailEntry[];
  advancedMetrics: AdvancedMetrics;
};
export function useAgentState(scope: 'systemHealth'): {
  systemHealth: SystemHealth;
  isLoading: boolean;
};
export function useAgentState(scope: 'currentMarket' | 'systemHealth' | 'all' = 'all') {
  const marketData = useAgentStore((state) => state.marketData);
  const isLoading = useAgentStore((state) => state.isLoading);
  const toasts = useAgentStore((state) => state.toasts);
  const dismissToast = useAgentStore((state) => state.dismissToast);
  const systemHealth = useAgentStore((state) => state.systemHealth);
  const walletConnected = useAgentStore((state) => state.walletConnected);
  const walletAddress = useAgentStore((state) => state.walletAddress);
  const walletBalance = useAgentStore((state) => state.walletBalance);
  const densityMode = useAgentStore((state) => state.densityMode);
  const divergenceAlert = useAgentStore((state) => state.divergenceAlert);
  const simulationResult = useAgentStore((state) => state.simulationResult);
  const agentTrail = useAgentStore((state) => state.agentTrail);
  const advancedMetrics = useAgentStore((state) => state.advancedMetrics);

  if (scope === 'systemHealth') {
    return { systemHealth, isLoading };
  }

  return {
    marketData,
    isLoading,
    toasts,
    dismissToast,
    systemHealth,
    walletConnected,
    walletAddress,
    walletBalance,
    densityMode,
    divergenceAlert,
    simulationResult,
    agentTrail,
    advancedMetrics,
  };
}