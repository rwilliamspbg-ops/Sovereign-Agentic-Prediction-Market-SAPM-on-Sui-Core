import React from 'react';
import { useAgentHealth } from '@/providers/agent-health-provider';
import { HealthBadge } from '@/components/ui/health-badge';

export const CopilotChatHealthIndicator: React.FC = () => {
  const { healthData, loading, error } = useAgentHealth();

  if (loading || !healthData) return null;

  const topAgents = Object.values(healthData.agents)
    .sort((a, b) => (b.reputationScore ?? 0) - (a.reputationScore ?? 0))
    .slice(0, 3);

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {/* Health Indicator Button */}
      <button 
        className="group relative flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-teal-600 to-emerald-600 shadow-lg hover:shadow-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-teal-500 focus-visible:ring-offset-slate-900"
        onClick={() => console.log('Show agent health panel')}
        aria-label="View agent health details"
      >
        <span className="text-white text-xl" aria-hidden="true">🤖</span>
        
        {/* Pulse animation for active agents */}
        {topAgents.length > 0 && (
          <span className="absolute inset-0 rounded-full bg-teal-500/30 animate-ping opacity-75"></span>
        )}

        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg bg-gray-900 text-xs text-gray-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
          Agent Health
          <div className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-gray-900"></div>
        </div>
      </button>

      {/* Quick Health Stats */}
      <div className="ml-14 mb-4 flex items-center gap-2 text-xs text-gray-400">
        <HealthBadge score={healthData.systemHealth.overallScore} size="sm" />
        <span>System Score</span>
      </div>

      {/* Top Agents Mini List */}
      <div className="flex items-center gap-2 ml-14 mb-4">
        {topAgents.map((agent, idx) => (
          <div 
            key={agent.agentId}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-900/80 border border-gray-800 cursor-pointer hover:border-teal-500/50 transition-colors"
          >
            <span className="text-xs text-gray-400">{idx + 1}.</span>
            <HealthBadge score={agent.reputationScore ?? 50} size="sm" />
            <span className="text-xs text-gray-300 truncate max-w-[80px]">
              @{agent.agentId.slice(0, 6)}...
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
