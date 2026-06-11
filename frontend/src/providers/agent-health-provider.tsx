import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { ChatCommand, CommandProvider } from '@copilotkit/react-core';

export interface AgentHealthData {
  agents: Record<string, AgentHealthMetrics>;
  systemHealth: SystemHealthStatus;
}

export interface SystemHealthStatus {
  overallScore: number;
  healthyAgents: number;
  totalAgents: number;
  activeIssues: Issue[];
}

export interface Issue {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  affectedAgent?: string;
  timestamp: Date;
}

export const useAgentHealth = (agentId?: string) => {
  const [healthData, setHealthData] = useState<AgentHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAgentHealth = async () => {
      try {
        // Fetch from your SAPM backend or on-chain oracle
        const response = await fetch('/api/agent-health', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId }),
        });

        if (!response.ok) throw new Error('Failed to fetch agent health');
        
        const data = await response.json();
        setHealthData(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (agentId) {
      fetchAgentHealth();
    } else {
      // Fetch all agents health when no specific agent is selected
      const fetchAllHealth = async () => {
        try {
          const response = await fetch('/api/agent-health/all');
          const data = await response.json();
          setHealthData(data);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
          setLoading(false);
        }
      };

      fetchAllHealth();
    }

    // Refresh every 30 seconds
    const interval = setInterval(fetchAgentHealth, 30000);

    return () => clearInterval(interval);
  }, [agentId]);

  return { healthData, loading, error };
};

export const AgentHealthProvider: CommandProvider = ({ children }) => {
  const { healthData, loading } = useAgentHealth();

  // Register custom chat commands for agent health queries
  const commands: ChatCommand[] = [
    {
      id: 'agent-health-show',
      description: 'Show current health status of all agents',
      execute: async () => {
        if (!healthData) return 'Loading agent health data...';
        
        const systemHealth = healthData.systemHealth;
        const agentList = Object.entries(healthData.agents)
          .map(([id, metrics]) => ({
            id,
            score: metrics.reputationScore,
            status: metrics.status,
            successRate: `${metrics.successRate}%`,
          }))
          .sort((a, b) => b.score - a.score);

        return `📊 **Agent Health Dashboard**\n\n` +
               `🎯 System Score: ${systemHealth.overallScore}/100\n` +
               `✅ Healthy Agents: ${systemHealth.healthyAgents}/${systemHealth.totalAgents}\n\n` +
               `🤖 Agent Rankings:\n` +
               agentList.map((agent, i) => 
                 `${i + 1}. @${agent.id} - Score: ${agent.score}/100 - ${agent.status.toUpperCase()}`
               ).join('\n') +
               `\n\nClick on any agent for detailed metrics.`;
      },
    },
    {
      id: 'agent-health-compare',
      description: 'Compare health metrics between agents',
      execute: async () => {
        if (!healthData || healthData.agents.length < 2) {
          return 'Need at least 2 agents to compare';
        }

        const sorted = Object.values(healthData.agents).sort(
          (a, b) => b.reputationScore - a.reputationScore
        );

        return `🔍 **Agent Comparison**\n\n` +
               `Top Performing Agents:\n` +
               sorted.slice(0, 3).map((agent, i) => 
                 `${i + 1}. @${agent.agentId}\n` +
                 `   Score: ${agent.reputationScore}/100\n` +
                 `   Success Rate: ${agent.successRate}%\n` +
                 `   Avg Latency: ${Math.round(agent.averageLatencyMs)}ms`
               ).join('\n') +
               `\n\nNeed detailed comparison? Ask "compare @agent1 and @agent2"`;
      },
    },
    {
      id: 'agent-health-explain',
      description: 'Explain why an agent has certain health score',
      execute: async ({ context }) => {
        const agentId = context.get('agentId') as string | undefined;
        
        if (!healthData || !agentId) return 'Agent not found';
        
        const metrics = healthData.agents[agentId];
        
        return `📋 **@${agentId} Health Analysis**\n\n` +
               `⭐ Reputation Score: ${metrics.reputationScore}/100\n` +
               `🎯 Success Rate: ${metrics.successRate}%\n` +
               `📊 Total Executions: ${metrics.totalExecutions}\n` +
               `✅ Consecutive Successes: ${metrics.consecutiveSuccesses}\n` +
               `⏱️ Avg Latency: ${Math.round(metrics.averageLatencyMs)}ms\n\n` +
               `**Trust Level:** ${metrics.trustLevel.toUpperCase()}\n` +
               `**Status:** ${metrics.status.toUpperCase()}\n\n`;

        // Add failure reasons if any
        if (metrics.failureReasons.length > 0) {
          const recentFailures = metrics.failureReasons.filter(
            f => !f.resolved
          );
          
          if (recentFailures.length > 0) {
            return (
              `**Recent Issues:**\n` +
              recentFailures.map(f => 
                `- ${f.category.toUpperCase()}: ${f.message}`
              ).join('\n') + '\n\n'
            );
          }
        }

        return '';
      },
    },
  ];

  return (
    <CommandProvider commands={commands}>
      {children}
    </CommandProvider>
  );
};
