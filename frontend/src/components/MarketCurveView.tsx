'use client';

import React, { useMemo, useState } from 'react';
import { useAgentState, useMarketActions } from '@/hooks/useAgentState';
import { useTradeExecution, type TradeLifecycleStage } from '@/components/TradeExecution';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function CardOutcome({
  name,
  odds,
  stakeWeight,
  projectedOdds,
  isHovered,
  onHover,
  onLeave,
}: {
  name: string;
  odds: number;
  stakeWeight: number;
  projectedOdds: number;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
}) {
  return (
    <article className="odds-card micro-feedback-card" onMouseEnter={onHover} onMouseLeave={onLeave}>
      <h4>{name}</h4>
      <p className="odds-value">{odds.toFixed(2)}x</p>
      <p className="stake-weight">Stake Weight: {Math.round(stakeWeight)}%</p>
      {isHovered && (
        <div className="mini-projection-chart" aria-live="polite">
          <div className="mini-projection-row">
            <span>Current</span>
            <div className="mini-projection-track">
              <div className="mini-projection-fill current" style={{ width: `${clamp((odds / 10) * 100, 8, 100)}%` }} />
            </div>
            <strong>{odds.toFixed(2)}x</strong>
          </div>
          <div className="mini-projection-row">
            <span>Projected</span>
            <div className="mini-projection-track">
              <div className="mini-projection-fill projected" style={{ width: `${clamp((projectedOdds / 10) * 100, 8, 100)}%` }} />
            </div>
            <strong>{projectedOdds.toFixed(2)}x</strong>
          </div>
        </div>
      )}
    </article>
  );
}

function MarketSkeleton() {
  return (
    <section className="market-view">
      <div className="skeleton-bar" />
      <div className="skeleton-chip-row">
        <div className="skeleton-chip" />
        <div className="skeleton-chip" />
        <div className="skeleton-chip" />
      </div>
      <div className="skeleton-chart" />
      <div className="skeleton-grid">
        <div className="skeleton-card" />
        <div className="skeleton-card" />
      </div>
      <div className="skeleton-form" />
    </section>
  );
}

export default function MarketCurveView() {
  const {
    marketData,
    isLoading,
    toasts,
    dismissToast,
    walletBalance,
    divergenceAlert,
    densityMode,
    agentTrail,
    advancedMetrics,
  } = useAgentState('currentMarket');
  const {
    stakeFunds,
    requestActionApproval,
    refreshMarketData,
    clearDivergenceAlert,
  } = useMarketActions();
  const { executeTrade, lastTransactionDigest, lastTransactionNetwork } = useTradeExecution();
  const [stakeAmount, setStakeAmount] = useState<number>(10);
  const [selectedOutcome, setSelectedOutcome] = useState<string>('Outcome A');
  const [hoveredOutcome, setHoveredOutcome] = useState<string | null>(null);
  const [isStakeFlowActive, setIsStakeFlowActive] = useState<boolean>(false);
  const [showRationale, setShowRationale] = useState<boolean>(false);
  const [txPhase, setTxPhase] = useState<'idle' | TradeLifecycleStage>('idle');
  const [txTimeline, setTxTimeline] = useState<Array<{ phase: TradeLifecycleStage; ts: number }>>([]);

  const confidenceClass = useMemo(() => {
    if (marketData.compositeConfidence >= 0.75) return 'status-ok';
    if (marketData.compositeConfidence >= 0.45) return 'status-warn';
    return 'status-error';
  }, [marketData.compositeConfidence]);

  const projectedOddsByOutcome = useMemo(() => {
    const impact = clamp(stakeAmount / Math.max(walletBalance, 1), 0, 0.4);
    return marketData.outcomes.reduce<Record<string, number>>((acc, outcome) => {
      const selected = outcome.name === selectedOutcome;
      const scale = selected ? 1 - (impact * 0.22) : 1 + (impact * 0.16);
      acc[outcome.name] = clamp(outcome.odds * scale, marketData.oddsRange.min, marketData.oddsRange.max);
      return acc;
    }, {});
  }, [marketData.oddsRange.max, marketData.oddsRange.min, marketData.outcomes, selectedOutcome, stakeAmount, walletBalance]);

  if (isLoading) {
    return <MarketSkeleton />;
  }

  const timelineStart = txTimeline[0]?.ts || 0;
  const timelineEnd = txTimeline[txTimeline.length - 1]?.ts || timelineStart;
  const timelineTotalMs = Math.max(1, timelineEnd - timelineStart);

  const actionId = `stake:${marketData.id}`;

  return (
    <section className="market-view">
      <div className="market-view-topbar">
        <h2>Live Prediction Exchange: {marketData.eventName}</h2>
        <button type="button" className="action-button ghost" onClick={() => void refreshMarketData()}>
          Refresh Market
        </button>
      </div>

      {divergenceAlert.active && (
        <div className="divergence-alert-banner" role="status">
          <div>
            <strong>Market Divergence Alert:</strong> Live odds moved {divergenceAlert.deviationPct.toFixed(1)}% from baseline in 5 minutes.
          </div>
          <button type="button" className="action-button ghost" onClick={clearDivergenceAlert}>
            Acknowledge
          </button>
        </div>
      )}

      <div className="confidence-strip">
        <span className={confidenceClass}>Composite Confidence: {Math.round(marketData.compositeConfidence * 100)}%</span>
        <span>Liquidity: {Math.round(marketData.liquidityScore * 100)}%</span>
        <span>Signal Reliability: {Math.round(marketData.signalConfidence * 100)}%</span>
        <span>Wallet Balance: {walletBalance.toFixed(2)} SUI</span>
      </div>

      <div className={`curve-chart-container ${isStakeFlowActive ? 'staking-flow-active' : ''}`}>
        <div className="staking-flow-overlay" aria-hidden />
        <div className="curve-balance-bars">
          {marketData.outcomes.map((outcome) => (
            <div key={outcome.name} className="curve-balance-row">
              <span>{outcome.name}</span>
              <div className="curve-balance-track">
                <div className="curve-balance-fill" style={{ width: `${clamp(outcome.stakeWeight, 2, 98)}%` }} />
              </div>
              <strong>{Math.round(outcome.stakeWeight)}%</strong>
            </div>
          ))}
        </div>
        <p>Stake pressure rebalance visualization (based on {marketData.stakesCount} stakes).</p>
      </div>

      {txTimeline.length > 0 && (
        <section className="tx-timeline-strip" aria-label="Transaction lifecycle timeline">
          <div className="tx-timeline-head">
            <strong>Transaction Timeline</strong>
            <span>Total: {(timelineTotalMs / 1000).toFixed(2)}s</span>
          </div>
          <div className="tx-timeline-line" />
          <div className="tx-timeline-points">
            {txTimeline.map((event, index) => {
              const fromStart = event.ts - timelineStart;
              const left = (fromStart / timelineTotalMs) * 100;
              const prevTs = txTimeline[index - 1]?.ts || event.ts;
              const segmentMs = event.ts - prevTs;

              return (
                <div key={`${event.phase}-${event.ts}`} className="tx-timeline-point" style={{ left: `${left}%` }}>
                  <span className={`tx-point-dot ${event.phase}`} />
                  <span className="tx-point-label">{event.phase}</span>
                  <span className="tx-point-latency">+{(segmentMs / 1000).toFixed(2)}s</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {txPhase !== 'idle' && (
        <div className={`tx-phase-banner ${txPhase}`}>
          {txPhase === 'approval' && 'Awaiting wallet approval...'}
          {txPhase === 'submitted' && 'Transaction submitted. Waiting for chain confirmation...'}
          {txPhase === 'confirmed' && 'Transaction confirmed. Finalization in progress...'}
          {txPhase === 'finalized' && 'Transaction finalized and included in checkpoint.'}
          {txPhase === 'failed' && 'Transaction failed. Review wallet/network configuration and retry.'}
          {lastTransactionDigest && (
            <span>
              Digest: {lastTransactionDigest.slice(0, 14)}...{lastTransactionDigest.slice(-8)}
              {lastTransactionNetwork ? ` (${lastTransactionNetwork})` : ''}
            </span>
          )}
        </div>
      )}

      <div className="odds-board">
        <h3>Current Odds and Metrics</h3>
        <div className="odds-card-grid">
          {marketData.outcomes.map((outcome) => (
            <CardOutcome
              key={outcome.name}
              name={outcome.name}
              odds={outcome.odds}
              stakeWeight={outcome.stakeWeight}
              projectedOdds={projectedOddsByOutcome[outcome.name] || outcome.odds}
              isHovered={hoveredOutcome === outcome.name}
              onHover={() => setHoveredOutcome(outcome.name)}
              onLeave={() => setHoveredOutcome(null)}
            />
          ))}
        </div>
      </div>

      <div className="stake-widget">
        <h3>Stake Interface</h3>
        <div className="stake-controls">
          <label htmlFor="stake-outcome">Outcome</label>
          <select id="stake-outcome" value={selectedOutcome} onChange={(event) => setSelectedOutcome(event.target.value)}>
            {marketData.outcomes.map((outcome) => (
              <option key={outcome.name} value={outcome.name}>
                {outcome.name}
              </option>
            ))}
          </select>

          <label htmlFor="stake-amount">Stake Amount (SUI)</label>
          <input
            id="stake-amount"
            type="number"
            min={0}
            value={stakeAmount}
            onChange={(event) => setStakeAmount(Number(event.target.value))}
          />

          <div className="stake-actions">
            <button
              type="button"
              className="action-button ghost"
              onClick={() => requestActionApproval(actionId)}
            >
              Approve Action
            </button>
            <button
              type="button"
              className="action-button"
              onClick={async () => {
                const selected = marketData.outcomes.find((outcome) => outcome.name === selectedOutcome) || marketData.outcomes[0];
                const impliedPrice = clamp(1 / Math.max(selected.odds, 1.01), 0.01, 0.99);
                const tradeSide = selectedOutcome === marketData.outcomes[0]?.name ? 'yes' : 'no';

                setTxPhase('approval');
                setTxTimeline([{ phase: 'approval', ts: Date.now() }]);
                const result = await executeTrade(
                  {
                    marketId: marketData.id,
                    side: tradeSide,
                    amount: stakeAmount,
                    executionPrice: impliedPrice,
                    timestamp: new Date(),
                  },
                  {
                    onStageChange: (stage) => {
                      setTxPhase(stage);
                      setTxTimeline((prev) => {
                        const now = Date.now();
                        if (prev[prev.length - 1]?.phase === stage) {
                          return prev;
                        }
                        return [...prev, { phase: stage, ts: now }];
                      });
                      if (stage === 'submitted') {
                        setIsStakeFlowActive(true);
                      }
                      if (stage === 'failed' || stage === 'finalized') {
                        setIsStakeFlowActive(false);
                        if (stage === 'finalized') {
                          window.setTimeout(() => {
                            setTxPhase('idle');
                          }, 1600);
                        }
                      }
                    },
                  }
                );

                if (result.status !== 'success') {
                  setTxPhase('failed');
                  setIsStakeFlowActive(false);
                  window.setTimeout(() => {
                    setTxPhase('idle');
                  }, 1800);
                  return;
                }

                await stakeFunds(stakeAmount, selectedOutcome);
              }}
            >
              Stake Funds
            </button>
            <button type="button" className="action-button ghost" onClick={() => setShowRationale((prev) => !prev)}>
              {showRationale ? 'Hide Agent Rationale' : 'View Agent Rationale'}
            </button>
          </div>
        </div>
      </div>

      {densityMode === 'advanced' && (
        <section className="advanced-metrics-panel">
          <h3>Deep Dive Metrics</h3>
          <p>Historical Volatility Index (HVI): <strong>{advancedMetrics.hvi.toFixed(1)}</strong></p>
          <div className="cluster-grid">
            {advancedMetrics.addressClusters.map((cluster) => (
              <div key={cluster.cluster} className="cluster-card">
                <span>{cluster.cluster}</span>
                <strong>{cluster.volumePct.toFixed(1)}%</strong>
              </div>
            ))}
          </div>
        </section>
      )}

      {showRationale && (
        <section className="agent-rationale-panel">
          <h3>Immutable Agent Trail</h3>
          <div className="agent-trail-list">
            {agentTrail.map((entry) => (
              <article key={entry.id} className="trail-entry">
                <span className="trail-stage">{entry.stage}</span>
                <p>{entry.detail}</p>
                <time dateTime={entry.ts}>{new Date(entry.ts).toLocaleTimeString()}</time>
              </article>
            ))}
          </div>
        </section>
      )}

      {toasts.length > 0 && (
        <div className="toast-stack" aria-live="polite">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast-item ${toast.level}`}>
              <span>{toast.message}</span>
              <button type="button" onClick={() => dismissToast(toast.id)}>
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}