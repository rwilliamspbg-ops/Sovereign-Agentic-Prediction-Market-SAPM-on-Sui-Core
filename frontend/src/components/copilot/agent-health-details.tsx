import React from 'react';
import { AgentHealthMetrics } from '@/types/agent-health';
import { HealthBadge } from '@/components/ui/health-badge';

interface AgentHealthDetailsProps {
  agent: AgentHealthMetrics;
  onClose: () => void;
}

export const AgentHealthDetails: React.FC<AgentHealthDetailsProps> = ({ 
  agent,
  onClose
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative max-w-2xl w-full mx-4 rounded-2xl border border-gray-800 bg-gray-950 p-6 shadow-2xl">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-200"
        >
          ✕
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">@</span>
            <h2 className="text-xl font-bold text-gray-100">{agent.agentId}</h2>
          </div>
          
          <div className="flex items-center gap-4">
            <HealthBadge 
              score={agent.reputationScore} 
              size="lg"
              showTrend={true}
              trend={agent.consecutiveSuccesses > 3 ? 'up' : 'stable'}
            />
            <span className={cn(
              'px-3 py-1 rounded-full text-xs font-medium',
              agent.status === 'healthy' && 'bg-emerald-500/10 text-emerald-400',
              agent.status === 'degraded' && 'bg-yellow-500/10 text-yellow-400',
              agent.status === 'unhealthy' && 'bg-red-500/10 text-red-400'
            )}>
              {agent.status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard 
            label="Success Rate" 
            value={`${agent.successRate}%`} 
            color="emerald"
          />
          <StatCard 
            label="Total Executions" 
            value={agent.totalExecutions.toString()} 
            color="blue"
          />
          <StatCard 
            label="Avg Latency" 
            value={`${Math.round(agent.averageLatencyMs)}ms`} 
            color="purple"
          />
          <StatCard 
            label="Consecutive Wins" 
            value={agent.consecutiveSuccesses.toString()} 
            color="teal"
          />
        </div>

        {/* Trust Level */}
        <div className="mb-6 p-4 rounded-lg bg-gray-900/50">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Trust Analysis</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="text-xs text-gray-400 mb-1">Trust Score</div>
              <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
                <div 
                  className={cn(
                    'h-full transition-all',
                    agent.reputationScore >= 90 && 'bg-emerald-500',
                    agent.reputationScore >= 70 && 'bg-yellow-500',
                    'bg-red-500'
                  )}
                  style={{ width: `${agent.reputationScore}%` }}
                />
              </div>
            </div>
            <span className="text-sm font-medium text-gray-300 w-16 text-right">
              {agent.trustLevel.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Failure History */}
        {agent.failureReasons.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">
              Recent Issues ({agent.failureReasons.length})
            </h3>
            <div className="space-y-2">
              {agent.failureReasons.slice(-5).map((failure, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    'flex items-start gap-2 p-3 rounded-lg',
                    failure.resolved ? 'bg-gray-900/30' : 'bg-red-500/10 border border-red-500/20'
                  )}
                >
                  <span className="text-lg">⚠️</span>
                  <div className="flex-1">
                    <div className="text-sm text-gray-300">{failure.message}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(failure.timestamp).toLocaleString()} • {failure.category}
                    </div>
                  </div>
                  {failure.resolved && (
                    <span className="text-xs text-emerald-400">✓ Resolved</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-800">
          <div className="text-xs text-gray-500">
            Last health check: {new Date(agent.lastHealthCheck).toLocaleString()}
          </div>
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string; color: 'emerald' | 'blue' | 'purple' | 'teal' }> = ({ 
  label, 
  value, 
  color 
}) => {
  const colorClasses = {
    emerald: 'text-emerald-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    teal: 'text-teal-400',
  };

  return (
    <div className="rounded-lg bg-gray-900/50 p-3">
      <div className="text-xs text-gray-400">{label}</div>
      <div className={`text-lg font-bold ${colorClasses[color]}`}>{value}</div>
    </div>
  );
};
