import React, { useState } from 'react';
import { useAgentHealth } from '@/providers/agent-health-provider';
import { AgentHealthCard } from '@/components/ui/agent-health-card';
import { HealthBadge } from '@/components/ui/health-badge';

export const CopilotHealthPanel: React.FC = () => {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const { healthData, loading, error } = useAgentHealth(selectedAgentId);

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-950/50 p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-6 w-48 rounded bg-gray-800"></div>
          <div className="space-y-2">
            <div className="h-24 rounded-lg bg-gray-900/50"></div>
            <div className="h-24 rounded-lg bg-gray-900/50"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-400">
        ⚠️ Failed to load agent health data: {error}
      </div>
    );
  }

  if (!healthData) return null;

  const systemHealth = healthData.systemHealth;
  const agents = Object.values(healthData.agents);

  return (
    <div className="space-y-4">
      {/* System Health Header */}
      <div className="rounded-xl border border-gray-800 bg-gradient-to-r from-teal-950/50 to-emerald-950/50 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-200">
            System Health Overview
          </h3>
          <HealthBadge 
            score={systemHealth.overallScore} 
            size="sm"
          />
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-emerald-400">
              {systemHealth.healthyAgents}
            </div>
            <div className="text-xs text-gray-400">Healthy Agents</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-400">
              {Math.round((systemHealth.healthyAgents / systemHealth.totalAgents) * 100)}%
            </div>
            <div className="text-xs text-gray-400">Uptime</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-400">
              {agents.length}
            </div>
            <div className="text-xs text-gray-400">Total Agents</div>
          </div>
        </div>

        {/* Active Issues */}
        {systemHealth.activeIssues.length > 0 && (
          <div className="mt-3 space-y-1">
            <div className="text-xs font-medium text-gray-400 mb-1">
              Active Issues:
            </div>
            {systemHealth.activeIssues.map((issue) => (
              <div 
                key={issue.id}
                className={cn(
                  'flex items-center gap-2 rounded px-2 py-1 text-xs',
                  issue.severity === 'critical' && 'bg-red-500/10 text-red-400',
                  issue.severity === 'warning' && 'bg-yellow-500/10 text-yellow-400',
                  issue.severity === 'info' && 'bg-blue-500/10 text-blue-400'
                )}
              >
                <span className="text-lg">⚠️</span>
                {issue.message}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Agent Health Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <AgentHealthCard
            key={agent.agentId}
            agent={agent}
            onClick={() => setSelectedAgentId(agent.agentId)}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
          <span className="text-gray-400">Healthy (90+)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
          <span className="text-gray-400">Degraded (70-89)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500"></span>
          <span className="text-gray-400">Unhealthy (&lt;70)</span>
        </div>
      </div>
    </div>
  );
};
