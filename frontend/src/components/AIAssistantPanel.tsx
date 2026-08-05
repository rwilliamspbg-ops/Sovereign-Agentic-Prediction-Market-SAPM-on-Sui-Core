'use client';

import React from 'react';
import * as CopilotUI from '@copilotkit/react-ui';
import { useAgentState, useMarketActions } from '@/hooks/useAgentState';

export default function AIAssistantPanel() {
  const { systemHealth, simulationResult, densityMode, advancedMetrics } = useAgentState('all');
  const { runScenarioSimulation } = useMarketActions();
  const [scenarioText, setScenarioText] = React.useState('If Team A gets 20% more funding and Team B loses its main sponsor, what happens?');
  const CopilotChat = CopilotUI.CopilotChat;
  const hasCopilotChat = typeof CopilotChat === 'function';

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
        <button
          type="button"
          className="action-button focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          onClick={() => runScenarioSimulation(scenarioText)}
        >
          Run Simulation
        </button>
        {simulationResult && (
          <div className="simulation-result">
            <p>
              <strong>Projected Shift:</strong> {simulationResult.projectedShiftPct > 0 ? '+' : ''}{simulationResult.projectedShiftPct.toFixed(1)}%
            </p>
            <p>{simulationResult.summary}</p>
          </div>
        )}
      </div>

      <hr className="assistant-divider" />

      <h3>System Health Check</h3>
      <div className="status-block">
        DeepBook: <span className={systemHealth.deepbookConnected ? 'ok' : 'warning'}>{systemHealth.deepbookConnected ? 'Connected' : 'Unavailable'}</span>
      </div>
      <div className="status-block">
        Walrus Data Feed: <span className={systemHealth.walrusConnected ? 'ok' : 'warning'}>{systemHealth.walrusConnected ? 'Connected' : systemHealth.walrusMessage}</span>
      </div>

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