'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useAgentState, useMarketActions } from '@/hooks/useAgentState';

const CopilotChat = dynamic(async () => {
  try {
    const mod = await import('@copilotkit/react-ui');
    const Component = (mod as { CopilotChat?: React.ComponentType<Record<string, unknown>> }).CopilotChat;
    return Component || (() => <div className="copilot-fallback">Copilot chat is unavailable in this build.</div>);
  } catch {
    return () => <div className="copilot-fallback">Copilot chat failed to load.</div>;
  }
}, { ssr: false });

export default function AIAssistantPanel() {
  const { systemHealth, simulationResult, densityMode, advancedMetrics } = useAgentState('all');
  const { runScenarioSimulation } = useMarketActions();
  const [scenarioText, setScenarioText] = React.useState('If Team A gets 20% more funding and Team B loses its main sponsor, what happens?');

  return (
    <section className="assistant-panel">
      <h3>AI Co-Pilot Assistant</h3>
      <div className="chat-shell">
        <CopilotChat />
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