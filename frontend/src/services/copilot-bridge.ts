/**
 * CopilotKit Bridge - Agent-to-Frontend Communication Layer
 * Provides a typed action queue and execution lifecycle for frontend workflows.
 */

'use client';

import { emitObservabilityEvent } from '@/lib/observability';

const ACTION_REQUEST_EVENT = 'sapm:copilot-action-request';
const ACTION_RESULT_EVENT = 'sapm:copilot-action-result';

export type CopilotPriority = 'low' | 'medium' | 'high' | 'urgent';

export type CopilotActionType =
  | 'open-market'
  | 'load-onchain-markets'
  | 'run-judge-mode'
  | 'archive-snapshot'
  | 'refresh-integrations';

export type CopilotActionStatus = 'queued' | 'running' | 'completed' | 'failed';

export type CopilotContext = {
  walletConnected: boolean;
  walletAddress: string | null;
  activeMarketId: string | null;
  activeMarketQuestion: string | null;
  activeMarketYesPrice: number | null;
  activeMarketNoPrice: number | null;
  activeMarketRisk: 'Low' | 'Medium' | 'High' | null;
  deepbookReady?: boolean | null;
  walrusReady?: boolean | null;
  lastUpdatedAt: number;
};

export type CopilotActionCard = {
  id: string;
  title: string;
  description: string;
  type: CopilotActionType;
  payload: Record<string, unknown>;
  priority: CopilotPriority;
  status: CopilotActionStatus;
  createdAt: number;
  updatedAt: number;
  resultMessage?: string;
};

export type CopilotExecutionTranscriptEntry = {
  actionId: string;
  title: string;
  type: CopilotActionType;
  priority: CopilotPriority;
  startedAt: number;
  finishedAt: number;
  status: CopilotActionStatus;
  ok: boolean;
  message: string;
};

export type CopilotExecutionTranscript = {
  id: string;
  createdAt: number;
  stopOnFailure: boolean;
  startedAt: number;
  finishedAt: number;
  total: number;
  completed: number;
  failed: number;
  aborted: boolean;
  entries: CopilotExecutionTranscriptEntry[];
};

export type CopilotRunState = {
  isRunning: boolean;
  isPaused: boolean;
  cancelRequested: boolean;
  currentActionId: string | null;
  currentActionTitle: string | null;
};

export type CopilotInsight = {
  id: string;
  title: string;
  message: string;
  confidence: number;
  rationale: string[];
  createdAt: number;
};

export interface AgentIntent {
  type: 'plan-request';
  prompt: string;
  priority?: CopilotPriority;
  payload?: Record<string, unknown>;
}

export interface CopilotBridgeConfig {
  chatId?: string;
  enableStreaming?: boolean;
  actionTimeoutMs?: number;
  maxRetries?: number;
  retryBaseDelayMs?: number;
  retryMaxDelayMs?: number;
  transcriptPostUrl?: string;
  persistLocalState?: boolean;
  maxTranscriptHistory?: number;
}

type ActionResultPayload = {
  id: string;
  ok: boolean;
  message?: string;
  data?: Record<string, unknown>;
};

type BridgeStateSnapshot = {
  queue: CopilotActionCard[];
  insights: CopilotInsight[];
  lastTranscript: CopilotExecutionTranscript | null;
  transcriptHistory: CopilotExecutionTranscript[];
};

const STORAGE_KEY = 'sapm.copilot.bridge.state.v1';

async function initCopilotConnection(config?: CopilotBridgeConfig): Promise<{ connected: boolean; config?: CopilotBridgeConfig }> {
  return {
    connected: true,
    config,
  };
}

export class CopilotBridge {
  private connection: { connected: boolean; config?: CopilotBridgeConfig } | null = null;
  private config: Required<Pick<CopilotBridgeConfig, 'actionTimeoutMs' | 'maxRetries' | 'retryBaseDelayMs' | 'retryMaxDelayMs' | 'transcriptPostUrl' | 'persistLocalState' | 'maxTranscriptHistory'>> = {
    actionTimeoutMs: 20_000,
    maxRetries: 2,
    retryBaseDelayMs: 500,
    retryMaxDelayMs: 3_500,
    transcriptPostUrl: '/api/copilot/transcripts',
    persistLocalState: true,
    maxTranscriptHistory: 20,
  };
  private queue: CopilotActionCard[] = [];
  private insights: CopilotInsight[] = [];
  private listeners: Map<string, Array<(data: unknown) => void>> = new Map();
  private lastTranscript: CopilotExecutionTranscript | null = null;
  private transcriptHistory: CopilotExecutionTranscript[] = [];
  private runState: CopilotRunState = {
    isRunning: false,
    isPaused: false,
    cancelRequested: false,
    currentActionId: null,
    currentActionTitle: null,
  };
  private activeAbort: (() => void) | null = null;
  private context: CopilotContext = {
    walletConnected: false,
    walletAddress: null,
    activeMarketId: null,
    activeMarketQuestion: null,
    activeMarketYesPrice: null,
    activeMarketNoPrice: null,
    activeMarketRisk: null,
    deepbookReady: null,
    walrusReady: null,
    lastUpdatedAt: Date.now(),
  };

  async initialize(config?: CopilotBridgeConfig): Promise<void> {
    this.connection = await initCopilotConnection(config);
    this.config = {
      actionTimeoutMs: config?.actionTimeoutMs || 20_000,
      maxRetries: config?.maxRetries ?? 2,
      retryBaseDelayMs: config?.retryBaseDelayMs ?? 500,
      retryMaxDelayMs: config?.retryMaxDelayMs ?? 3_500,
      transcriptPostUrl: config?.transcriptPostUrl ?? '/api/copilot/transcripts',
      persistLocalState: config?.persistLocalState ?? true,
      maxTranscriptHistory: config?.maxTranscriptHistory ?? 20,
    };
    this.loadPersistedState();
    emitObservabilityEvent('frontend', 'copilot_bridge_initialized', 'info', {
      connected: this.connection.connected,
    });
    this.publish('status', { connected: this.connection.connected });
    this.publish('run_state', this.getRunState());
  }

  setContext(partial: Partial<CopilotContext>): void {
    this.context = {
      ...this.context,
      ...partial,
      lastUpdatedAt: Date.now(),
    };
    this.publish('context', this.context);
    this.persistState();
  }

  getContext(): CopilotContext {
    return this.context;
  }

  getQueue(): CopilotActionCard[] {
    return [...this.queue];
  }

  getInsights(): CopilotInsight[] {
    return [...this.insights];
  }

  getLastTranscript(): CopilotExecutionTranscript | null {
    return this.lastTranscript ? { ...this.lastTranscript, entries: [...this.lastTranscript.entries] } : null;
  }

  getTranscriptHistory(): CopilotExecutionTranscript[] {
    return [...this.transcriptHistory];
  }

  getRunState(): CopilotRunState {
    return { ...this.runState };
  }

  async handleAgentIntent(intent: AgentIntent): Promise<{ insight: CopilotInsight; actions: CopilotActionCard[] }> {
    const plan = this.buildPlan(intent.prompt, intent.priority || 'medium', intent.payload || {});
    this.insights = [plan.insight, ...this.insights].slice(0, 20);
    const nextQueue = [...this.queue, ...plan.actions];
    this.queue = this.sortQueue(nextQueue).slice(0, 50);

    emitObservabilityEvent('frontend', 'copilot_plan_generated', 'info', {
      actionCount: plan.actions.length,
      prompt: intent.prompt.slice(0, 180),
    });

    this.publish('insight', plan.insight);
    this.publish('queue', this.getQueue());
    this.persistState();
    return plan;
  }

  async executeAction(actionId: string): Promise<CopilotActionCard> {
    const index = this.queue.findIndex((item) => item.id === actionId);
    if (index < 0) {
      throw new Error(`Action not found: ${actionId}`);
    }

    const action = this.queue[index];
    if (action.status === 'completed') {
      return action;
    }

    const preflightBlock = this.getPreflightFailure(action);
    if (preflightBlock) {
      const blocked: CopilotActionCard = {
        ...action,
        status: 'failed',
        updatedAt: Date.now(),
        resultMessage: `Preflight blocked: ${preflightBlock}`,
      };
      this.queue[index] = blocked;
      this.publish('queue', this.getQueue());
      this.persistState();
      emitObservabilityEvent('frontend', 'copilot_action_preflight_blocked', 'warn', {
        actionType: blocked.type,
        actionId: blocked.id,
        reason: preflightBlock,
      });
      return blocked;
    }

    const running = {
      ...action,
      status: 'running' as CopilotActionStatus,
      updatedAt: Date.now(),
    };

    this.queue[index] = running;
    this.publish('queue', this.getQueue());
    emitObservabilityEvent('frontend', 'copilot_action_running', 'info', {
      actionType: running.type,
      actionId: running.id,
    });

    let result: ActionResultPayload = {
      id: running.id,
      ok: false,
      message: 'Action failed before execution.',
    };

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt += 1) {
      result = await this.dispatchAction(running);
      if (result.ok) {
        break;
      }

      const canRetry = attempt < this.config.maxRetries && this.isRetryableError(result.message || '');
      if (!canRetry) {
        break;
      }

      const delayMs = this.computeBackoffDelay(attempt);
      this.queue[index] = {
        ...running,
        updatedAt: Date.now(),
        resultMessage: `Retrying after failure (${attempt + 1}/${this.config.maxRetries})...`,
      };
      this.publish('queue', this.getQueue());
      await this.wait(delayMs);
    }

    const finalized: CopilotActionCard = {
      ...running,
      status: result.ok ? 'completed' : 'failed',
      updatedAt: Date.now(),
      resultMessage: result.message || (result.ok ? 'Action completed.' : 'Action failed.'),
    };

    this.queue[index] = finalized;
    this.publish('queue', this.getQueue());
    this.persistState();

    emitObservabilityEvent('frontend', 'copilot_action_finished', result.ok ? 'info' : 'warn', {
      actionType: finalized.type,
      actionId: finalized.id,
      ok: result.ok,
      message: finalized.resultMessage,
    });

    return finalized;
  }

  async executeQueuedActions(options?: { stopOnFailure?: boolean }): Promise<CopilotExecutionTranscript> {
    const stopOnFailure = options?.stopOnFailure ?? true;
    const startedAt = Date.now();
    const queued = this.queue.filter((item) => item.status !== 'running');
    const entries: CopilotExecutionTranscriptEntry[] = [];

    this.runState = {
      isRunning: true,
      isPaused: false,
      cancelRequested: false,
      currentActionId: null,
      currentActionTitle: null,
    };
    this.publish('run_state', this.getRunState());

    let aborted = false;
    try {
      for (const action of queued) {
        await this.waitForResumeOrCancel();
        if (this.runState.cancelRequested) {
          aborted = true;
          break;
        }

        this.runState = {
          ...this.runState,
          currentActionId: action.id,
          currentActionTitle: action.title,
        };
        this.publish('run_state', this.getRunState());

        const actionStartedAt = Date.now();
        let finalized: CopilotActionCard;
        try {
          finalized = await this.executeAction(action.id);
        } catch (error) {
          finalized = {
            ...action,
            status: 'failed',
            updatedAt: Date.now(),
            resultMessage: error instanceof Error ? error.message : 'Action execution failed.',
          };
        }
        const actionFinishedAt = Date.now();
        const ok = finalized.status === 'completed';

        entries.push({
          actionId: finalized.id,
          title: finalized.title,
          type: finalized.type,
          priority: finalized.priority,
          startedAt: actionStartedAt,
          finishedAt: actionFinishedAt,
          status: finalized.status,
          ok,
          message: finalized.resultMessage || (ok ? 'Action completed.' : 'Action failed.'),
        });

        if (!ok && stopOnFailure) {
          aborted = true;
          break;
        }
      }
    } finally {
      this.runState = {
        isRunning: false,
        isPaused: false,
        cancelRequested: false,
        currentActionId: null,
        currentActionTitle: null,
      };
      this.publish('run_state', this.getRunState());
      this.activeAbort = null;
    }

    const finishedAt = Date.now();
    const completed = entries.filter((entry) => entry.ok).length;
    const failed = entries.length - completed;
    const transcript: CopilotExecutionTranscript = {
      id: `copilot_run_${finishedAt}`,
      createdAt: finishedAt,
      stopOnFailure,
      startedAt,
      finishedAt,
      total: queued.length,
      completed,
      failed,
      aborted,
      entries,
    };

    this.lastTranscript = transcript;
  this.transcriptHistory = [transcript, ...this.transcriptHistory].slice(0, this.config.maxTranscriptHistory);
    this.publish('transcript', transcript);
  this.publish('transcript_history', this.getTranscriptHistory());
  this.persistState();

    emitObservabilityEvent('frontend', 'copilot_queue_executed', failed > 0 ? 'warn' : 'info', {
      total: transcript.total,
      completed: transcript.completed,
      failed: transcript.failed,
      aborted: transcript.aborted,
      stopOnFailure: transcript.stopOnFailure,
    });

    await this.postTranscript(transcript);

    return transcript;
  }

  pauseQueueExecution(): void {
    if (!this.runState.isRunning) {
      return;
    }
    this.runState = {
      ...this.runState,
      isPaused: true,
    };
    this.publish('run_state', this.getRunState());
    emitObservabilityEvent('frontend', 'copilot_queue_paused', 'info');
  }

  resumeQueueExecution(): void {
    if (!this.runState.isRunning) {
      return;
    }
    this.runState = {
      ...this.runState,
      isPaused: false,
    };
    this.publish('run_state', this.getRunState());
    emitObservabilityEvent('frontend', 'copilot_queue_resumed', 'info');
  }

  cancelQueueExecution(): void {
    if (!this.runState.isRunning) {
      return;
    }
    this.runState = {
      ...this.runState,
      cancelRequested: true,
      isPaused: false,
    };
    this.publish('run_state', this.getRunState());
    if (this.activeAbort) {
      this.activeAbort();
      this.activeAbort = null;
    }
    emitObservabilityEvent('frontend', 'copilot_queue_cancel_requested', 'warn');
  }

  subscribe(event: 'queue' | 'insight' | 'context' | 'status' | 'transcript' | 'run_state' | 'transcript_history', handler: (data: unknown) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);

    return () => {
      const handlers = this.listeners.get(event) || [];
      const next = handlers.filter((entry) => entry !== handler);
      this.listeners.set(event, next);
    };
  }

  async clearQueue(): Promise<void> {
    this.queue = [];
    this.publish('queue', []);
    this.persistState();
    emitObservabilityEvent('frontend', 'copilot_queue_cleared', 'info');
  }

  private publish(event: string, data: unknown): void {
    const handlers = this.listeners.get(event) || [];
    handlers.forEach((handler) => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Copilot listener error (${event})`, error);
      }
    });
  }

  private sortQueue(queue: CopilotActionCard[]): CopilotActionCard[] {
    const rank: Record<CopilotPriority, number> = {
      urgent: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    return [...queue].sort((a, b) => {
      const byPriority = rank[a.priority] - rank[b.priority];
      if (byPriority !== 0) {
        return byPriority;
      }
      return a.createdAt - b.createdAt;
    });
  }

  private buildPlan(prompt: string, priority: CopilotPriority, payload: Record<string, unknown>): { insight: CopilotInsight; actions: CopilotActionCard[] } {
    const lowerPrompt = prompt.toLowerCase();
    const actions: CopilotActionCard[] = [];
    const now = Date.now();
    const activeMarketText = this.context.activeMarketQuestion || 'current market selection';

    const addAction = (
      type: CopilotActionType,
      title: string,
      description: string,
      extraPayload: Record<string, unknown> = {},
      actionPriority: CopilotPriority = priority,
    ) => {
      actions.push({
        id: `copilot_action_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type,
        title,
        description,
        payload: { ...extraPayload, ...payload },
        priority: actionPriority,
        status: 'queued',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    };

    if (lowerPrompt.includes('judge') || lowerPrompt.includes('demo')) {
      addAction('load-onchain-markets', 'Load On-chain Markets', 'Load and validate on-chain market IDs before execution.', {}, 'high');
      addAction('run-judge-mode', 'Run Judge Mode', 'Execute micro trade and capture proof artifacts.', {}, 'urgent');
      addAction('archive-snapshot', 'Archive Walrus Snapshot', 'Publish judge output snapshot to Walrus storage.', {}, 'high');
    }

    if (lowerPrompt.includes('on-chain') || lowerPrompt.includes('onchain') || lowerPrompt.includes('sync')) {
      addAction('load-onchain-markets', 'Sync On-chain Markets', 'Refresh market board from on-chain object IDs.');
    }

    if (lowerPrompt.includes('refresh') || lowerPrompt.includes('health') || lowerPrompt.includes('status')) {
      addAction('refresh-integrations', 'Refresh Integrations', 'Re-check DeepBook and Walrus integration health.');
    }

    if (lowerPrompt.includes('open') || lowerPrompt.includes('focus') || lowerPrompt.includes('market')) {
      addAction(
        'open-market',
        'Focus Active Market',
        'Select active market in board ticket and keep context in sync.',
        {
          marketId: this.context.activeMarketId,
        },
      );
    }

    if (actions.length === 0) {
      addAction('open-market', 'Focus Active Market', 'Bring the currently selected market into focus.');
      addAction('refresh-integrations', 'Refresh Integrations', 'Update integration readiness before taking action.');
    }

    const insight: CopilotInsight = {
      id: `copilot_insight_${now}`,
      title: 'SAPM Copilot Plan',
      message: `Built ${actions.length} executable action(s) for ${activeMarketText}.`,
      confidence: this.context.walletConnected ? 0.86 : 0.72,
      rationale: [
        this.context.walletConnected
          ? 'Wallet is connected so write actions can be executed immediately.'
          : 'Wallet is disconnected; execution actions may pause on preflight.',
        this.context.activeMarketId
          ? `Active market context is available (${this.context.activeMarketId.slice(0, 10)}...).`
          : 'No active market context was found; plan starts with synchronization actions.',
      ],
      createdAt: now,
    };

    return { insight, actions };
  }

  private async dispatchAction(action: CopilotActionCard): Promise<ActionResultPayload> {
    return new Promise((resolve) => {
      let resolved = false;

      const cleanup = () => {
        window.clearTimeout(timeoutId);
        window.removeEventListener(ACTION_RESULT_EVENT, onResult as EventListener);
        this.activeAbort = null;
      };

      const finalize = (payload: ActionResultPayload) => {
        if (resolved) {
          return;
        }
        resolved = true;
        cleanup();
        resolve(payload);
      };

      const timeoutId = window.setTimeout(() => {
        finalize({
          id: action.id,
          ok: false,
          message: `Timed out after ${this.config.actionTimeoutMs}ms waiting for ${action.type}`,
        });
      }, this.config.actionTimeoutMs);

      const onResult = (event: Event) => {
        const detail = (event as CustomEvent<ActionResultPayload>).detail;
        if (!detail || detail.id !== action.id) {
          return;
        }

        finalize(detail);
      };

      this.activeAbort = () => {
        finalize({
          id: action.id,
          ok: false,
          message: 'Cancelled by operator.',
        });
      };

      window.addEventListener(ACTION_RESULT_EVENT, onResult as EventListener);
      window.dispatchEvent(new CustomEvent(ACTION_REQUEST_EVENT, {
        detail: {
          id: action.id,
          type: action.type,
          payload: action.payload,
        },
      }));
    });
  }

  private getPreflightFailure(action: CopilotActionCard): string | null {
    if ((action.type === 'run-judge-mode' || action.type === 'archive-snapshot') && !this.context.walletConnected) {
      return 'Connect wallet before running trade or archive operations.';
    }

    if ((action.type === 'run-judge-mode' || action.type === 'archive-snapshot') && !this.context.activeMarketId) {
      return 'No active market selected for execution.';
    }

    if (action.type === 'archive-snapshot' && this.context.walrusReady === false) {
      return 'Walrus integration is not ready. Run Refresh Integrations first.';
    }

    return null;
  }

  private isRetryableError(message: string): boolean {
    const lower = message.toLowerCase();
    return (
      lower.includes('timed out') ||
      lower.includes('timeout') ||
      lower.includes('network') ||
      lower.includes('temporar') ||
      lower.includes('rate limit') ||
      lower.includes('429') ||
      lower.includes('rpc') ||
      lower.includes('unavailable') ||
      lower.includes('econn')
    );
  }

  private computeBackoffDelay(attempt: number): number {
    const jitter = Math.floor(Math.random() * 120);
    const candidate = this.config.retryBaseDelayMs * (2 ** attempt) + jitter;
    return Math.min(candidate, this.config.retryMaxDelayMs);
  }

  private async wait(ms: number): Promise<void> {
    await new Promise<void>((resolve) => {
      window.setTimeout(() => resolve(), ms);
    });
  }

  private async waitForResumeOrCancel(): Promise<void> {
    while (this.runState.isPaused && !this.runState.cancelRequested) {
      await this.wait(140);
    }
  }

  private loadPersistedState(): void {
    if (!this.config.persistLocalState) {
      return;
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as Partial<BridgeStateSnapshot>;
      if (Array.isArray(parsed.queue)) {
        this.queue = parsed.queue.slice(0, 50);
      }
      if (Array.isArray(parsed.insights)) {
        this.insights = parsed.insights.slice(0, 20);
      }
      if (parsed.lastTranscript) {
        this.lastTranscript = parsed.lastTranscript;
      }
      if (Array.isArray(parsed.transcriptHistory)) {
        this.transcriptHistory = parsed.transcriptHistory.slice(0, this.config.maxTranscriptHistory);
      }
      this.publish('queue', this.getQueue());
      this.publish('insight', this.insights[0] || null);
      this.publish('transcript', this.lastTranscript);
      this.publish('transcript_history', this.getTranscriptHistory());
    } catch (error) {
      emitObservabilityEvent('frontend', 'copilot_state_restore_failed', 'warn', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private persistState(): void {
    if (!this.config.persistLocalState) {
      return;
    }
    try {
      const snapshot: BridgeStateSnapshot = {
        queue: this.queue,
        insights: this.insights,
        lastTranscript: this.lastTranscript,
        transcriptHistory: this.transcriptHistory,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // Ignore local persistence failures for private browsing/storage limits.
    }
  }

  private async postTranscript(transcript: CopilotExecutionTranscript): Promise<void> {
    const endpoint = this.config.transcriptPostUrl;
    if (!endpoint) {
      return;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: 'copilot-bridge',
          context: this.context,
          transcript,
        }),
      });

      if (!response.ok) {
        throw new Error(`Transcript ingestion returned ${response.status}`);
      }

      emitObservabilityEvent('frontend', 'copilot_transcript_posted', 'info', {
        transcriptId: transcript.id,
      });
    } catch (error) {
      emitObservabilityEvent('frontend', 'copilot_transcript_post_failed', 'warn', {
        transcriptId: transcript.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export const copilotBridge = new CopilotBridge();
