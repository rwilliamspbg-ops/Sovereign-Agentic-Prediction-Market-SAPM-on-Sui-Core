import { useEffect, useState, ReactNode } from 'react';
export type { AgentHealthMetrics, FailureReason } from '@/types/agent-health';

/**
 * System Health Status — aggregate health across all agents
 */
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

export interface AgentHealthData {
  agents: Record<string, any>; // from /api/agent-health response
  systemHealth: SystemHealthStatus;
}

/**
 * Hook to fetch and monitor agent health status.
 * Automatically refreshes every 30 seconds.
 *
 * @param agentId - Optional agent ID to fetch specific agent health
 * @returns { healthData, loading, error }
 *
 * @example
 * const { healthData, loading, error } = useAgentHealth();
 * if (loading) return <div>Loading...</div>;
 * if (error) return <div>Error: {error}</div>;
 * return <div>Health Score: {healthData.systemHealth.overallScore}</div>;
 */
export const useAgentHealth = (agentId?: string | null) => {
  const [healthData, setHealthData] = useState<AgentHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAgentHealth = async () => {
      try {
        // Fetch from SAPM backend or on-chain oracle
        const response = await fetch('/api/agent-health', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId: agentId ?? undefined }),
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

    const fetchAllHealth = async () => {
      try {
        const response = await fetch('/api/agent-health/all');
        const data = await response.json();
        setHealthData(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    // Fetch based on agentId
    if (agentId) {
      fetchAgentHealth();
    } else {
      fetchAllHealth();
    }

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      if (agentId) {
        fetchAgentHealth();
      } else {
        fetchAllHealth();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [agentId]);

  return { healthData, loading, error };
};
