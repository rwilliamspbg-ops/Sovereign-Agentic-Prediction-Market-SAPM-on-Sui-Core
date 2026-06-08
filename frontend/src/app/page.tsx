'use client';

import DashboardHeader from '@/components/DashboardHeader';
import MarketCurveView from '@/components/MarketCurveView';
import AIAssistantPanel from '@/components/AIAssistantPanel';
import CopilotSidebarPanel from '@/components/CopilotSidebarPanel';
import { AgentStateProvider } from '@/hooks/useAgentState';

export default function MarketDashboardPage() {
  return (
    <AgentStateProvider>
      <div className="dashboard-container">
        <header className="app-header">
          <DashboardHeader />
        </header>

        <div className="main-dashboard-grid">
          <aside className="sidebar-panel" aria-label="Market context and Copilot sidebar">
            <CopilotSidebarPanel />
          </aside>

          <main className="center-stage">
            <MarketCurveView />
          </main>

          <aside className="utility-panel" aria-label="AI assistant and status panel">
            <AIAssistantPanel />
          </aside>
        </div>
      </div>
    </AgentStateProvider>
  );
}
