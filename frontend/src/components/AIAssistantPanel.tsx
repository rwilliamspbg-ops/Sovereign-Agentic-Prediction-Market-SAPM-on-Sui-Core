'use client';

import React from 'react';
import * as CopilotUI from '@copilotkit/react-ui';
import { useAgentState, useMarketActions } from '@/hooks/useAgentState';

export default function AIAssistantPanel() {
  const { systemHealth, simulationResult, densityMode, advancedMetrics } = useAgentState('all');
  const { runScenarioSimulation } = useMarketActions();
  const SCENARIO_PRESETS = [
    { label: 'Funding Shift', text: 'If Team A gets 20% more funding and Team B loses its main sponsor, what happens?' },
    { label: 'Volume Spike', text: 'If market trading volume spikes by 50% in the next hour, how will odds react?' },
    { label: 'Liquidity Shock', text: 'If 30% of market liquidity is withdrawn unexpectedly, what is the risk impact?' },
  ];

  const [scenarioText, setScenarioText] = React.useState(SCENARIO_PRESETS[0].text);
  const [isSimulating, setIsSimulating] = React.useState(false);
  const CopilotChat = CopilotUI.CopilotChat;
  const hasCopilotChat = typeof CopilotChat === 'function';

  const handleRunSimulation = () => {
    if (!scenarioText.trim() || isSimulating) return;
    setIsSimulating(true);
    runScenarioSimulation(scenarioText);
    setTimeout(() => {
      setIsSimulating(false);
    }, 600);
  };

  return (
    <section className="assistant-panel">
      <h3>AI Co-Pilot Assistant</h3>
      <div className="chat-shell">
        {hasCopilotChat ? (
          <CopilotChat
            className="copilot-live-chat"
            instructions="You are SAPM Copilot. Keep answers concise, operational, and safety-first for Sui prediction market workflows."
            labels={{
              title: 'SAPM Copilot',
              initial: 'Ask for market analysis, action planning, or safe trade execution checks.',
            }}
          />
        ) : (
          <div className="copilot-fallback">
            <p>Copilot chat is unavailable in this runtime.</p>
            <p>Use the market panel actions and simulation tools below instead.</p>
          </div>
        )}
      </div>

      <hr className="assistant-divider" />

      <h3>Simulate Outcomes</h3>
      <div className="simulation-widget">
        <label htmlFor="simulation-scenario-input" className="sr-only">
          What-if Scenario Description
        </label>
        <textarea
          id="simulation-scenario-input"
          value={scenarioText}
          onChange={(event) => setScenarioText(event.target.value)}
          rows={3}
          maxLength={300}
          aria-describedby="scenario-char-count"
          placeholder="Describe a what-if scenario"
          className="focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900 rounded-md"
        />
        <div
          id="scenario-char-count"
          aria-live="polite"
          className="text-xs text-right text-slate-400 mt-1 mb-2"
        >
          {scenarioText.length}/300 characters
        </div>
        <div role="group" aria-label="Scenario presets" className="flex flex-wrap gap-2 mb-3">
          {SCENARIO_PRESETS.map((preset) => {
            const isSelected = scenarioText === preset.text;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => setScenarioText(preset.text)}
                aria-pressed={isSelected}
                title={`Load scenario: "${preset.text}"`}
                className={`text-xs px-2.5 py-1 rounded-md border font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
                  isSelected
                    ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
                aria-label={`Select ${preset.label} scenario preset`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          disabled={isSimulating || !scenarioText.trim()}
          aria-busy={isSimulating}
          aria-label={isSimulating ? 'Simulating scenario outcomes...' : undefined}
          title={
            isSimulating
              ? 'Simulating scenario outcomes...'
              : !scenarioText.trim()
              ? 'Enter a scenario description to run simulation'
              : 'Run what-if scenario simulation'
          }
          className="action-button flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleRunSimulation}
        >
          {isSimulating ? (
            <>
              <svg
                className="animate-spin h-4 w-4 text-cyan-400"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Simulating...</span>
            </>
          ) : (
            'Run Simulation'
          )}
        </button>
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'absolute',
            width: '1px',
            height: '1px',
            padding: 0,
            margin: '-1px',
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            border: 0,
          }}
        >
          {isSimulating ? 'Running what-if scenario simulation...' : ''}
        </div>
        {simulationResult && (
          <div className="simulation-result" role="status" aria-live="polite" aria-label="Simulation result overview">
            <p>
              <strong>Projected Shift:</strong> {simulationResult.projectedShiftPct > 0 ? '+' : ''}{simulationResult.projectedShiftPct.toFixed(1)}%
            </p>
            <p>{simulationResult.summary}</p>
          </div>
        )}
      </div>

      <hr className="assistant-divider" />

      <section aria-label="System health status overview">
        <h3>System Health Check</h3>
        <div role="group" aria-label="System status indicators" className="space-y-2">
          <div role="status" className="status-block">
            DeepBook: <span className={systemHealth.deepbookConnected ? 'ok' : 'warning'}>{systemHealth.deepbookConnected ? 'Connected' : 'Unavailable'}</span>
          </div>
          <div role="status" className="status-block">
            Walrus Data Feed: <span className={systemHealth.walrusConnected ? 'ok' : 'warning'}>{systemHealth.walrusConnected ? 'Connected' : systemHealth.walrusMessage}</span>
          </div>
        </div>
      </section>

      {densityMode === 'advanced' && (
        <div className="status-block">
          Agent Decision Path Trace:
          <ul className="trace-list">
            {advancedMetrics.toolCallTrace.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}