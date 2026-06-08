'use client';

import React from 'react';
import { useAgentState, useMarketActions } from '@/hooks/useAgentState';

export default function AIAssistantPanel() {
  const { systemHealth, simulationResult, densityMode, advancedMetrics } = useAgentState('all');
  const { runScenarioSimulation } = useMarketActions();
  const [scenarioText, setScenarioText] = React.useState('If Team A gets 20% more funding and Team B loses its main sponsor, what happens?');

  return (
    <section className="assistant-panel">
      <h3>AI Co-Pilot Assistant</h3>
      <div className="chat-shell">
        <div className="copilot-fallback">
          <strong>Copilot assistant shell</strong>
          <p>Local dashboard mode is active. The live Copilot UI package is temporarily disabled in this stack because its transitive ESM dependency path fails Next.js compilation here.</p>
          <p>System health, simulation, and rationale surfaces remain available for dashboard validation.</p>
        </div>
      </div>

      <hr className="assistant-divider" />

      <h3>Simulate Outcomes</h3>
      <div className="simulation-widget">
        <textarea
          value={scenarioText}
          onChange={(event) => setScenarioText(event.target.value)}
          rows={3}
          placeholder="Describe a what-if scenario"
        />
        <button type="button" className="action-button" onClick={() => runScenarioSimulation(scenarioText)}>
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