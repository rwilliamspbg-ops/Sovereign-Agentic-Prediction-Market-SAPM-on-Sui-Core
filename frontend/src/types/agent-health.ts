export interface AgentHealthMetrics {
  agentId: string;
  reputationScore: number; // 0-100
  successRate: number;     // percentage of successful executions
  lastExecutionTime: Date;
  consecutiveSuccesses: number;
  totalExecutions: number;
  averageLatencyMs: number;
  failureReasons: FailureReason[];
  trustLevel: 'high' | 'medium' | 'low';
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastHealthCheck: Date;
}

export interface FailureReason {
  timestamp: Date;
  category: 'timeout' | 'execution_error' | 'validation_failed' | 'rate_limit';
  message: string;
  resolved: boolean;
}

export interface AgentComparison {
  agentId: string;
  reputationScore: number;
  winRate: number;
  avgProfitLoss: number;
  executionCount: number;
  lastActiveDate: Date;
}
