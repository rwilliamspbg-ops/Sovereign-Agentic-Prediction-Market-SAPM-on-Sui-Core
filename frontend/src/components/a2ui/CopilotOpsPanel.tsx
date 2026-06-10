'use client';

import React from 'react';
import {
  copilotBridge,
  type CopilotActionCard,
  type CopilotInsight,
  type CopilotContext,
  type CopilotExecutionTranscript,
  type CopilotRunState,
} from '@/services/copilot-bridge';
import { registerCopilotActionHandler } from '@/services/copilot-action-handler';
import { deepbookService } from '@/services/sui/deepbook-service';
import { marketDataService } from '@/services/sui/market-data-service';
import { walrusService } from '@/services/sui/walrus-service';

type CopilotOpsPanelProps = {
  open: boolean;
  onClose: () => void;
};

type ActiveMarketInsight = {
  id: string;
  question: string;
  yesPrice: number;
  noPrice: number;
  riskLevel: 'Low' | 'Medium' | 'High';
};

type IntegrationStatus = {
  deepbookReady: boolean;
  walrusReady: boolean;
  checkedAt: string;
};

const ACTIVE_MARKET_INSIGHT_KEY = 'sapm.activeMarketInsight';
const INTEGRATION_STATUS_KEY = 'sapm.integrationStatus';

const quickPrompts = [
  'Prepare judge mode run with proof artifacts',
  'Load on-chain markets and focus current market',
  'Refresh integrations and archive a snapshot',
  'Explain current market and propose safe next actions',
];

function statusColor(status: CopilotActionCard['status']): string {
  switch (status) {
    case 'completed':
      return '#22c55e';
    case 'failed':
      return '#ef4444';
    case 'blocked':
      return '#f59e0b';
    case 'running':
      return '#38bdf8';
    default:
      return '#94a3b8';
  }
}

function syncBridgeContextFromClient(): void {
  let activeMarket: ActiveMarketInsight | null = null;
  try {
    const raw = localStorage.getItem(ACTIVE_MARKET_INSIGHT_KEY);
    if (raw) {
      activeMarket = JSON.parse(raw) as ActiveMarketInsight;
    }
  } catch {
    activeMarket = null;
  }

  const walletAddress = localStorage.getItem('walletAddress');
  const walletConnected = Boolean(walletAddress);
  let integrationStatus: { deepbookReady?: boolean; walrusReady?: boolean } | null = null;

  try {
    const raw = localStorage.getItem(INTEGRATION_STATUS_KEY);
    if (raw) {
      integrationStatus = JSON.parse(raw) as { deepbookReady?: boolean; walrusReady?: boolean };
    }
  } catch {
    integrationStatus = null;
  }

  copilotBridge.setContext({
    walletConnected,
    walletAddress,
    activeMarketId: activeMarket?.id || null,
    activeMarketQuestion: activeMarket?.question || null,
    activeMarketYesPrice: activeMarket?.yesPrice ?? null,
    activeMarketNoPrice: activeMarket?.noPrice ?? null,
    activeMarketRisk: activeMarket?.riskLevel || null,
    deepbookReady: integrationStatus?.deepbookReady ?? null,
    walrusReady: integrationStatus?.walrusReady ?? null,
  });
}

function isValidSuiHexAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{1,64}$/.test(value);
}

function readOnchainObjectIdsFromStorage(): string[] {
  const raw = localStorage.getItem('sapm.onchainObjectIds') || '';
  const ids = raw
    .split(/[\s,]+/g)
    .map((id) => id.trim())
    .filter(Boolean)
    .filter((id) => isValidSuiHexAddress(id));
  return Array.from(new Set(ids));
}

async function hydrateLiveContextIfMissing(): Promise<void> {
  let activeMarket: ActiveMarketInsight | null = null;
  let integrationStatus: IntegrationStatus | null = null;

  try {
    const rawMarket = localStorage.getItem(ACTIVE_MARKET_INSIGHT_KEY);
    if (rawMarket) {
      activeMarket = JSON.parse(rawMarket) as ActiveMarketInsight;
    }
  } catch {
    activeMarket = null;
  }

  try {
    const rawIntegration = localStorage.getItem(INTEGRATION_STATUS_KEY);
    if (rawIntegration) {
      integrationStatus = JSON.parse(rawIntegration) as IntegrationStatus;
    }
  } catch {
    integrationStatus = null;
  }

  if (!integrationStatus) {
    try {
      const [deepbookStatus, walrusStatus] = await Promise.all([
        deepbookService.getStatus(),
        walrusService.getStatus(),
      ]);

      const nextStatus: IntegrationStatus = {
        deepbookReady: Boolean(deepbookStatus.rpcReachable && deepbookStatus.packageReachable),
        walrusReady: Boolean(walrusStatus.aggregatorReachable && walrusStatus.publisherReachable),
        checkedAt: new Date().toISOString(),
      };

      localStorage.setItem(INTEGRATION_STATUS_KEY, JSON.stringify(nextStatus));
      window.dispatchEvent(new CustomEvent('sapm:integration-status', { detail: nextStatus }));
    } catch {
      // Keep unknown state if probing fails; UI still reflects cached values.
    }
  }

  if (!activeMarket) {
    try {
      const configuredObjectIds = marketDataService.getConfiguredObjectIds();
      const storedObjectIds = readOnchainObjectIdsFromStorage();
      const objectIds = Array.from(new Set([...configuredObjectIds, ...storedObjectIds]));

      if (objectIds.length > 0) {
        const markets = await marketDataService.getOnchainMarketsFromObjectIds(objectIds);
        if (markets.length > 0) {
          const first = markets[0];
          const nextMarket: ActiveMarketInsight = {
            id: first.id,
            question: first.question,
            yesPrice: first.yesPrice,
            noPrice: first.noPrice,
            riskLevel: first.riskLevel,
          };

          localStorage.setItem(ACTIVE_MARKET_INSIGHT_KEY, JSON.stringify(nextMarket));
          window.dispatchEvent(new CustomEvent('sapm:active-market-insight', { detail: nextMarket }));
        }
      }
    } catch {
      // Keep empty market context when no market can be loaded.
    }
  }
}

export function CopilotOpsPanel({ open, onClose }: CopilotOpsPanelProps) {
  const [initialized, setInitialized] = React.useState(false);
  const [prompt, setPrompt] = React.useState('');
  const [queue, setQueue] = React.useState<CopilotActionCard[]>([]);
  const [insights, setInsights] = React.useState<CopilotInsight[]>([]);
  const [context, setContext] = React.useState<CopilotContext>(copilotBridge.getContext());
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [executingActionId, setExecutingActionId] = React.useState<string | null>(null);
  const [isExecutingAll, setIsExecutingAll] = React.useState(false);
  const [stopOnFailure, setStopOnFailure] = React.useState(true);
  const [lastTranscript, setLastTranscript] = React.useState<CopilotExecutionTranscript | null>(null);
  const [transcriptHistory, setTranscriptHistory] = React.useState<CopilotExecutionTranscript[]>([]);
  const [runState, setRunState] = React.useState<CopilotRunState>(copilotBridge.getRunState());

  React.useEffect(() => {
    let active = true;

    const boot = async () => {
      await copilotBridge.initialize({
        actionTimeoutMs: 90_000,
      });
      if (!active) {
        return;
      }
      syncBridgeContextFromClient();
      await hydrateLiveContextIfMissing();
      syncBridgeContextFromClient();
      setQueue(copilotBridge.getQueue());
      setInsights(copilotBridge.getInsights());
      setContext(copilotBridge.getContext());
      setLastTranscript(copilotBridge.getLastTranscript());
      setTranscriptHistory(copilotBridge.getTranscriptHistory());
      setRunState(copilotBridge.getRunState());
      setInitialized(true);
    };

    boot().catch((error) => {
      console.error('Unable to initialize Copilot ops panel', error);
      if (active) {
        setInitialized(true);
      }
    });

    const offQueue = copilotBridge.subscribe('queue', (data) => {
      setQueue(data as CopilotActionCard[]);
    });
    const offInsight = copilotBridge.subscribe('insight', () => {
      setInsights(copilotBridge.getInsights());
    });
    const offContext = copilotBridge.subscribe('context', (data) => {
      setContext(data as CopilotContext);
    });
    const offTranscript = copilotBridge.subscribe('transcript', (data) => {
      setLastTranscript(data as CopilotExecutionTranscript);
    });
    const offHistory = copilotBridge.subscribe('transcript_history', (data) => {
      setTranscriptHistory(data as CopilotExecutionTranscript[]);
    });
    const offRunState = copilotBridge.subscribe('run_state', (data) => {
      setRunState(data as CopilotRunState);
    });
    const offActionRequests = registerCopilotActionHandler({
      getContext: () => copilotBridge.getContext(),
      getTranscript: () => copilotBridge.getLastTranscript(),
    });

    const onWalletUpdate = () => syncBridgeContextFromClient();
    const onMarketUpdate = () => syncBridgeContextFromClient();
    const onIntegrationUpdate = () => syncBridgeContextFromClient();

    window.addEventListener('sapm:wallet-updated', onWalletUpdate as EventListener);
    window.addEventListener('sapm:active-market-insight', onMarketUpdate as EventListener);
    window.addEventListener('sapm:integration-status', onIntegrationUpdate as EventListener);

    return () => {
      active = false;
      offQueue();
      offInsight();
      offContext();
      offTranscript();
      offHistory();
      offRunState();
      offActionRequests();
      window.removeEventListener('sapm:wallet-updated', onWalletUpdate as EventListener);
      window.removeEventListener('sapm:active-market-insight', onMarketUpdate as EventListener);
      window.removeEventListener('sapm:integration-status', onIntegrationUpdate as EventListener);
    };
  }, []);

  const handleGenerate = async (value: string) => {
    const nextPrompt = value.trim();
    if (!nextPrompt) {
      return;
    }

    setIsGenerating(true);
    try {
      syncBridgeContextFromClient();
      await copilotBridge.handleAgentIntent({
        type: 'plan-request',
        prompt: nextPrompt,
        priority: 'high',
      });
      setPrompt('');
      setInsights(copilotBridge.getInsights());
      setQueue(copilotBridge.getQueue());
    } finally {
      setIsGenerating(false);
    }
  };

  const runAction = async (action: CopilotActionCard) => {
    setExecutingActionId(action.id);
    try {
      await copilotBridge.executeAction(action.id);
      setQueue(copilotBridge.getQueue());
    } finally {
      setExecutingActionId(null);
    }
  };

  const runAllQueued = async () => {
    setIsExecutingAll(true);
    try {
      const transcript = await copilotBridge.executeQueuedActions({ stopOnFailure });
      setLastTranscript(transcript);
      setQueue(copilotBridge.getQueue());
    } finally {
      setIsExecutingAll(false);
      setExecutingActionId(null);
    }
  };

  const pauseRunAll = () => {
    copilotBridge.pauseQueueExecution();
  };

  const resumeRunAll = () => {
    copilotBridge.resumeQueueExecution();
  };

  const cancelRunAll = () => {
    copilotBridge.cancelQueueExecution();
  };

  const downloadTranscript = () => {
    const transcript = lastTranscript || copilotBridge.getLastTranscript();
    if (!transcript) {
      return;
    }

    const payload = {
      generatedAt: new Date().toISOString(),
      context,
      transcript,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const ts = new Date(transcript.createdAt).toISOString().replace(/[:.]/g, '-');
    anchor.href = url;
    anchor.download = `sapm-copilot-transcript-${ts}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  if (!open) {
    return null;
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3100, pointerEvents: 'none' }}>
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(2, 6, 23, 0.58)',
          pointerEvents: 'auto',
        }}
      />
      <aside
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 'min(540px, 100%)',
          height: '100%',
          background: 'linear-gradient(180deg, #0b1220 0%, #070d18 100%)',
          borderLeft: '1px solid #1e293b',
          boxShadow: '-24px 0 50px rgba(2, 6, 23, 0.7)',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.9rem',
          pointerEvents: 'auto',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: '#67e8f9', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Copilot Ops
            </div>
            <h3 style={{ color: '#f8fafc', margin: '0.35rem 0 0 0', fontSize: '1.15rem' }}>Agentic Action Control</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: '1px solid #334155',
              backgroundColor: '#0f172a',
              color: '#cbd5e1',
              borderRadius: '0.5rem',
              padding: '0.45rem 0.65rem',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>

        <div style={{ border: '1px solid #23344b', borderRadius: '0.75rem', backgroundColor: '#0b1325', padding: '0.75rem' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.35rem' }}>Live Context</div>
          <div style={{ fontSize: '0.82rem', color: '#e2e8f0', lineHeight: 1.45 }}>
            <div>Wallet: {context.walletConnected ? `Connected (${context.walletAddress?.slice(0, 8)}...)` : 'Disconnected'}</div>
            <div>Market: {context.activeMarketQuestion || 'No market context loaded'}</div>
            <div>Risk: {context.activeMarketRisk || 'Unknown'}</div>
            <div>DeepBook: {context.deepbookReady === null || context.deepbookReady === undefined ? 'Unknown' : context.deepbookReady ? 'Ready' : 'Not Ready'}</div>
            <div>Walrus: {context.walrusReady === null || context.walrusReady === undefined ? 'Unknown' : context.walrusReady ? 'Ready' : 'Not Ready'}</div>
          </div>
          {/* Warn when NEXT_PUBLIC_SUI_MARKET_OBJECT_IDS is not configured — load-onchain-markets
              will immediately fail and abort the whole queue if this is unset. */}
          {!process.env.NEXT_PUBLIC_SUI_MARKET_OBJECT_IDS && !context.activeMarketId && (
            <div style={{
              marginTop: '0.65rem',
              padding: '0.5rem 0.65rem',
              backgroundColor: 'rgba(120, 53, 15, 0.35)',
              border: '1px solid #92400e',
              borderRadius: '0.5rem',
              color: '#fcd34d',
              fontSize: '0.76rem',
              lineHeight: 1.5,
            }}>
              <strong>No market IDs configured.</strong> Set{' '}
              <code style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '0 3px', borderRadius: 3 }}>
                NEXT_PUBLIC_SUI_MARKET_OBJECT_IDS
              </code>{' '}
              in <code style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '0 3px', borderRadius: 3 }}>
                frontend/.env.local
              </code>{' '}
              or the <em>load-onchain-markets</em> action will fail and abort any Run All queue.
            </div>
          )}
        </div>

        <div style={{ border: '1px solid #23344b', borderRadius: '0.75rem', backgroundColor: '#0b1325', padding: '0.75rem' }}>
          <div style={{ color: '#cbd5e1', fontSize: '0.82rem', marginBottom: '0.45rem' }}>Run State</div>
          <div style={{ color: '#94a3b8', fontSize: '0.79rem', marginBottom: '0.55rem' }}>
            {runState.isRunning
              ? runState.isPaused
                ? 'Paused'
                : runState.cancelRequested
                  ? 'Cancelling...'
                  : 'Running'
              : 'Idle'}
            {runState.currentActionTitle ? ` • ${runState.currentActionTitle}` : ''}
          </div>
          <div style={{ display: 'flex', gap: '0.45rem' }}>
            <button
              type="button"
              onClick={pauseRunAll}
              disabled={!runState.isRunning || runState.isPaused}
              style={{
                border: '1px solid #334155',
                borderRadius: '0.45rem',
                backgroundColor: '#0f172a',
                color: '#cbd5e1',
                padding: '0.42rem 0.62rem',
                cursor: !runState.isRunning || runState.isPaused ? 'not-allowed' : 'pointer',
              }}
            >
              Pause
            </button>
            <button
              type="button"
              onClick={resumeRunAll}
              disabled={!runState.isRunning || !runState.isPaused}
              style={{
                border: '1px solid #334155',
                borderRadius: '0.45rem',
                backgroundColor: '#0f172a',
                color: '#cbd5e1',
                padding: '0.42rem 0.62rem',
                cursor: !runState.isRunning || !runState.isPaused ? 'not-allowed' : 'pointer',
              }}
            >
              Resume
            </button>
            <button
              type="button"
              onClick={cancelRunAll}
              disabled={!runState.isRunning}
              style={{
                border: 'none',
                borderRadius: '0.45rem',
                backgroundColor: '#7f1d1d',
                color: '#fee2e2',
                padding: '0.42rem 0.62rem',
                cursor: !runState.isRunning ? 'not-allowed' : 'pointer',
                opacity: !runState.isRunning ? 0.7 : 1,
              }}
            >
              Cancel
            </button>
          </div>
        </div>

        <div style={{ border: '1px solid #23344b', borderRadius: '0.75rem', backgroundColor: '#0b1325', padding: '0.75rem' }}>
          <div style={{ color: '#cbd5e1', fontSize: '0.82rem', marginBottom: '0.55rem' }}>Quick Prompts</div>
          <div style={{ display: 'grid', gap: '0.45rem' }}>
            {quickPrompts.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => handleGenerate(item)}
                disabled={isGenerating || !initialized}
                style={{
                  textAlign: 'left',
                  border: '1px solid #334155',
                  backgroundColor: '#0f172a',
                  color: '#e2e8f0',
                  borderRadius: '0.55rem',
                  padding: '0.52rem 0.65rem',
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  opacity: isGenerating ? 0.7 : 1,
                }}
              >
                {item}
              </button>
            ))}
          </div>

          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Describe what Copilot should execute..."
            style={{
              width: '100%',
              marginTop: '0.65rem',
              minHeight: '96px',
              border: '1px solid #334155',
              borderRadius: '0.55rem',
              backgroundColor: '#020617',
              color: '#e2e8f0',
              padding: '0.65rem',
              resize: 'vertical',
            }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
            <button
              type="button"
              onClick={() => handleGenerate(prompt)}
              disabled={isGenerating || !prompt.trim() || !initialized}
              style={{
                border: 'none',
                borderRadius: '0.55rem',
                backgroundColor: '#0891b2',
                color: '#f8fafc',
                padding: '0.56rem 0.72rem',
                fontWeight: 700,
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                opacity: isGenerating ? 0.7 : 1,
              }}
            >
              {isGenerating ? 'Generating...' : 'Generate Plan'}
            </button>
            <button
              type="button"
              onClick={() => copilotBridge.clearQueue()}
              style={{
                border: '1px solid #334155',
                borderRadius: '0.55rem',
                backgroundColor: '#0f172a',
                color: '#cbd5e1',
                padding: '0.56rem 0.72rem',
                cursor: 'pointer',
              }}
            >
              Clear Queue
            </button>
            <button
              type="button"
              onClick={runAllQueued}
              disabled={isExecutingAll || queue.length === 0 || !initialized}
              style={{
                border: 'none',
                borderRadius: '0.55rem',
                backgroundColor: '#0f766e',
                color: '#ecfeff',
                padding: '0.56rem 0.72rem',
                fontWeight: 700,
                cursor: isExecutingAll ? 'not-allowed' : 'pointer',
                opacity: isExecutingAll || queue.length === 0 ? 0.7 : 1,
              }}
              title={stopOnFailure
                ? 'Execute queued actions in order and stop on first failure'
                : 'Execute queued actions in order and continue even if some fail'}
            >
              {isExecutingAll ? 'Running All...' : 'Run All'}
            </button>
            <button
              type="button"
              onClick={downloadTranscript}
              disabled={!lastTranscript}
              style={{
                border: '1px solid #334155',
                borderRadius: '0.55rem',
                backgroundColor: '#0f172a',
                color: '#cbd5e1',
                padding: '0.56rem 0.72rem',
                cursor: lastTranscript ? 'pointer' : 'not-allowed',
                opacity: lastTranscript ? 1 : 0.7,
              }}
              title="Download latest run transcript as JSON"
            >
              Download Transcript
            </button>
          </div>
          <label
            style={{
              marginTop: '0.55rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              color: '#cbd5e1',
              fontSize: '0.78rem',
            }}
          >
            <input
              type="checkbox"
              checked={stopOnFailure}
              onChange={(event) => setStopOnFailure(event.target.checked)}
              disabled={isExecutingAll}
            />
            Stop Run All on first failure
          </label>
        </div>

        {insights.length > 0 && (
          <div style={{ border: '1px solid #23344b', borderRadius: '0.75rem', backgroundColor: '#0b1325', padding: '0.75rem' }}>
            <div style={{ color: '#cbd5e1', fontSize: '0.82rem', marginBottom: '0.45rem' }}>Latest Insight</div>
            <div style={{ color: '#e2e8f0', fontWeight: 700 }}>{insights[0].title}</div>
            <div style={{ color: '#94a3b8', fontSize: '0.84rem', lineHeight: 1.5, marginTop: '0.25rem' }}>{insights[0].message}</div>
            <div style={{ marginTop: '0.45rem', color: '#67e8f9', fontSize: '0.78rem' }}>
              Confidence {Math.round(insights[0].confidence * 100)}%
            </div>
          </div>
        )}

        <div style={{ border: '1px solid #23344b', borderRadius: '0.75rem', backgroundColor: '#0b1325', padding: '0.75rem' }}>
          <div style={{ color: '#cbd5e1', fontSize: '0.82rem', marginBottom: '0.45rem' }}>Action Queue</div>
          {lastTranscript && (
            <div style={{ color: '#94a3b8', fontSize: '0.76rem', marginBottom: '0.45rem' }}>
              Last run: {lastTranscript.completed}/{lastTranscript.total} completed
              {lastTranscript.failed > 0 ? `, ${lastTranscript.failed} failed` : ''}
              {(() => {
                const blockedCount = lastTranscript.entries?.filter((e) => e.status === 'blocked').length ?? 0;
                return blockedCount > 0 ? `, ${blockedCount} blocked (wallet/prereq)` : '';
              })()}
              {lastTranscript.aborted ? ' (stopped on failure)' : ''}
              {!lastTranscript.stopOnFailure ? ' (continue-on-failure mode)' : ''}
              {runState.cancelRequested ? ' (cancel requested)' : ''}
            </div>
          )}
          {transcriptHistory.length > 0 && (
            <div style={{ color: '#64748b', fontSize: '0.74rem', marginBottom: '0.45rem' }}>
              Saved runs: {transcriptHistory.length}
            </div>
          )}
          {queue.length === 0 && (
            <div style={{ color: '#64748b', fontSize: '0.82rem' }}>No queued actions yet.</div>
          )}
          {queue.some((a) => a.status === 'completed' || a.status === 'failed') && (
            <button
              type="button"
              onClick={() => void copilotBridge.clearQueue()}
              style={{
                border: '1px solid #334155',
                borderRadius: '0.45rem',
                backgroundColor: '#0f172a',
                color: '#94a3b8',
                padding: '0.38rem 0.58rem',
                cursor: 'pointer',
                fontSize: '0.76rem',
                marginBottom: '0.5rem',
              }}
            >
              Clear all
            </button>
          )}
          <div style={{ display: 'grid', gap: '0.55rem' }}>
            {queue.map((action) => (
              <div
                key={action.id}
                style={{
                  border: `1px solid ${action.status === 'failed' ? '#7f1d1d' : action.status === 'blocked' ? '#78350f' : '#334155'}`,
                  borderRadius: '0.65rem',
                  padding: '0.58rem',
                  backgroundColor: action.status === 'failed' ? '#1a0808' : action.status === 'blocked' ? '#140d00' : '#020617',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.7rem' }}>
                  <div>
                    <div style={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.86rem' }}>{action.title}</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '0.2rem' }}>{action.description}</div>
                  </div>
                  <div style={{ color: statusColor(action.status), fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, flexShrink: 0 }}>
                    {action.status}
                  </div>
                </div>
                {action.resultMessage && (
                  <div style={{
                    marginTop: '0.35rem',
                    color: action.status === 'failed' ? '#fca5a5' : action.status === 'blocked' ? '#fcd34d' : '#cbd5e1',
                    fontSize: '0.76rem',
                    backgroundColor: action.status === 'failed' ? 'rgba(127,29,29,0.3)' : action.status === 'blocked' ? 'rgba(120,53,15,0.3)' : 'transparent',
                    borderRadius: '0.35rem',
                    padding: (action.status === 'failed' || action.status === 'blocked') ? '0.3rem 0.45rem' : '0',
                  }}>
                    {action.resultMessage}
                  </div>
                )}
                <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => runAction(action)}
                    disabled={isExecutingAll || action.status === 'running' || executingActionId === action.id}
                    style={{
                      border: 'none',
                      borderRadius: '0.5rem',
                      padding: '0.45rem 0.62rem',
                      backgroundColor: action.status === 'completed' ? '#14532d' : '#155e75',
                      color: '#f8fafc',
                      cursor: action.status === 'running' || isExecutingAll ? 'not-allowed' : 'pointer',
                      opacity: action.status === 'running' || isExecutingAll ? 0.7 : 1,
                    }}
                  >
                    {action.status === 'completed'
                      ? 'Re-run'
                      : action.status === 'running'
                        ? 'Running...'
                        : 'Execute'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
