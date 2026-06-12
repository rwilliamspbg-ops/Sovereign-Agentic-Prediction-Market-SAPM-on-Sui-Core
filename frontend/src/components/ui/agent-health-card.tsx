import React from 'react';
import { AgentHealthMetrics } from '@/types/agent-health';
import { HealthBadge } from './health-badge';
import { Button } from './Button';
import { cn } from '@/lib/utils';

interface AgentHealthCardProps {
  agent: AgentHealthMetrics;
  onClick?: () => void;
}

export const AgentHealthCard: React.FC<AgentHealthCardProps> = ({ 
  agent, 
  onClick 
}) => {
  return (
    <div 
      className="group relative overflow-hidden rounded-xl border border-gray-800 bg-gray-950/50 p-4 transition-all hover:border-teal-500/50 hover:bg-gray-900/50"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">@</span>
          <span className="font-semibold text-gray-100">{agent.agentId}</span>
        </div>
        
        <HealthBadge 
          score={agent.reputationScore} 
          size="sm"
          trend={agent.consecutiveSuccesses > 5 ? 'up' : 'stable'}
        />
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="rounded-lg bg-gray-900/50 p-2">
          <div className="text-xs text-gray-400">Success Rate</div>
          <div className="text-sm font-semibold text-emerald-400">
            {agent.successRate}%
          </div>
        </div>

        <div className="rounded-lg bg-gray-900/50 p-2">
          <div className="text-xs text-gray-400">Executions</div>
          <div className="text-sm font-semibold text-gray-300">
            {agent.totalExecutions}
          </div>
        </div>

        <div className="rounded-lg bg-gray-900/50 p-2">
          <div className="text-xs text-gray-400">Avg Latency</div>
          <div className="text-sm font-semibold text-blue-400">
            {Math.round(agent.averageLatencyMs)}ms
          </div>
        </div>

        <div className="rounded-lg bg-gray-900/50 p-2">
          <div className="text-xs text-gray-400">Consecutive Wins</div>
          <div className="text-sm font-semibold text-purple-400">
            {agent.consecutiveSuccesses}
          </div>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="flex items-center justify-between rounded-lg bg-gray-900/30 p-2">
        <div className="flex items-center gap-2">
          <div className={cn(
            'h-2 w-2 rounded-full',
            agent.status === 'healthy' && 'bg-emerald-500',
            agent.status === 'degraded' && 'bg-yellow-500',
            agent.status === 'unhealthy' && 'bg-red-500'
          )} />
          <span className="text-xs text-gray-400 capitalize">
            {agent.status}
          </span>
        </div>

        <span className="text-xs text-gray-500">
          Last: {new Date(agent.lastExecutionTime).toLocaleTimeString()}
        </span>
      </div>

      {/* Hover Actions */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
        <Button size="sm" variant="outline">
          View Details
        </Button>
      </div>
    </div>
  );
};
