'use client';

import React from 'react';

type TraderDecision = {
  id: string;
  ts: number;
  agentId: string;
  marketId: string;
  marketTitle: string;
  decision: 'buy_yes' | 'buy_no' | 'hold';
  confidence: number;
  stakeUsd: number;
  rationale: string;
  source?: string;
};

type StreamStatus = 'idle' | 'connecting' | 'live' | 'error';

export function TraderAgentLivePanel() {
  const [isRunning, setIsRunning] = React.useState(false);
  const [tickMs, setTickMs] = React.useState(3500);
  const [decisions, setDecisions] = React.useState<TraderDecision[]>([]);
  const [streamStatus, setStreamStatus] = React.useState<StreamStatus>('idle');
  const [streamMessage, setStreamMessage] = React.useState('');
  const streamRef = React.useRef<EventSource | null>(null);

  const closeStream = React.useCallback(() => {
    if (streamRef.current) {
      streamRef.current.close();
      streamRef.current = null;
    }
  }, []);

  const openStream = React.useCallback(() => {
    closeStream();

    setStreamStatus('connecting');
    setStreamMessage('Connecting to server trader runtime...');

    const source = new EventSource(`/api/trader/stream?cadenceMs=${tickMs}`);
    streamRef.current = source;

    source.onopen = () => {
      setStreamStatus('live');
      setStreamMessage('Connected to server trader runtime.');
    };

    source.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as
          | { type: 'decision'; payload: TraderDecision }
          | { type: 'status'; message: string; level: 'info' | 'warn' | 'error' };

        if (parsed.type === 'status') {
          setStreamMessage(parsed.message);
          if (parsed.level === 'error') {
            setStreamStatus('error');
          }
          return;
        }

        const entry = parsed.payload;
        setDecisions((current) => [entry, ...current].slice(0, 36));
        window.dispatchEvent(new CustomEvent('sapm:trader-agent-decision', { detail: entry }));
      } catch {
        setStreamStatus('error');
        setStreamMessage('Malformed trader stream payload.');
      }
    };

    source.onerror = () => {
      setStreamStatus('error');
      setStreamMessage('Trader stream disconnected. Try Start Agents again.');
      closeStream();
      setIsRunning(false);
    };
  }, [closeStream, tickMs]);

  React.useEffect(() => {
    if (!isRunning) {
      closeStream();
      if (streamStatus !== 'error') {
        setStreamStatus('idle');
        setStreamMessage('');
      }
      return;
    }

    openStream();

    return () => {
      closeStream();
    };
  }, [closeStream, isRunning, openStream, streamStatus]);

  React.useEffect(() => {
    if (!isRunning) {
      return;
    }

    openStream();
  }, [isRunning, openStream]);

  React.useEffect(() => {
    return () => closeStream();
  }, [closeStream]);

  const stats = React.useMemo(() => {
    const total = decisions.length;
    const buyYes = decisions.filter((d) => d.decision === 'buy_yes').length;
    const buyNo = decisions.filter((d) => d.decision === 'buy_no').length;
    const hold = decisions.filter((d) => d.decision === 'hold').length;
    return { total, buyYes, buyNo, hold };
  }, [decisions]);

  return (
    <div className="liquid-ticket-block" style={{ marginTop: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center' }}>
        <p style={{ margin: 0, color: '#90cfc3', fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Trader Agent Live Feed
        </p>
        <span style={{ fontSize: '0.72rem', color: isRunning ? '#8afbc4' : '#98c8ff' }}>
          {isRunning ? `Running (${streamStatus})` : 'Stopped'}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '0.45rem', marginTop: '0.6rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setIsRunning((prev) => !prev)}
          className="liquid-status-pill focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1"
          aria-pressed={isRunning}
          aria-label={isRunning ? 'Stop trader agent live feed' : 'Start trader agent live feed'}
          style={{ backgroundColor: isRunning ? 'rgba(127,29,29,0.35)' : 'rgba(6,95,70,0.45)' }}
        >
          {isRunning ? 'Stop Agents' : 'Start Agents'}
        </button>
        <select
          value={tickMs}
          onChange={(event) => setTickMs(Number(event.target.value))}
          className="liquid-select focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          aria-label="Select trader agent update cadence"
          style={{ minWidth: '140px' }}
        >
          <option value={2000}>2.0s cadence</option>
          <option value={3500}>3.5s cadence</option>
          <option value={5000}>5.0s cadence</option>
        </select>
      </div>

      <div
        role="status"
        aria-live="polite"
        style={{ marginTop: '0.55rem', color: '#9bd9cd', fontSize: '0.76rem', display: 'grid', gap: '0.2rem' }}
      >
        {streamMessage && <span>{streamMessage}</span>}
        <span>Decisions: {stats.total}</span>
        <span>YES: {stats.buyYes} | NO: {stats.buyNo} | HOLD: {stats.hold}</span>
      </div>

      <div style={{ marginTop: '0.65rem', display: 'grid', gap: '0.42rem', maxHeight: '280px', overflowY: 'auto', paddingRight: '0.2rem' }}>
        {decisions.length === 0 && (
          <p style={{ margin: 0, color: '#d8fff8', fontSize: '0.84rem' }}>
            Start agents to stream live trading decisions.
          </p>
        )}

        {decisions.map((entry) => (
          <div key={entry.id} style={{ border: '1px solid #26544a', borderRadius: '0.5rem', padding: '0.45rem' }}>
            <p style={{ margin: 0, color: '#d8fff8', fontSize: '0.79rem' }}>
              [{new Date(entry.ts).toLocaleTimeString()}] {entry.agentId.toUpperCase()} {'->'} {entry.decision.toUpperCase()} ({Math.round(entry.confidence * 100)}%)
            </p>
            <p style={{ margin: '0.25rem 0 0', color: '#9ddace', fontSize: '0.74rem' }}>
              {entry.marketId} | stake ${entry.stakeUsd.toLocaleString()} | {entry.marketTitle}
            </p>
            <p style={{ margin: '0.18rem 0 0', color: '#7ac8b6', fontSize: '0.71rem' }}>
              source: {entry.source || 'unknown'}
            </p>
            <p style={{ margin: '0.2rem 0 0', color: '#8fcfbe', fontSize: '0.73rem' }}>
              {entry.rationale}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
