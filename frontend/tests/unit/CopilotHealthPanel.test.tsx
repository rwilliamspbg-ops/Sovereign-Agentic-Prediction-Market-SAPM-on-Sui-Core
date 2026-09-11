import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { CopilotHealthPanel } from '@/components/copilot/health-panel';
import { _mockUseAgentHealth } from '@/providers/agent-health-provider';

describe('CopilotHealthPanel Micro-UX and Accessibility', () => {
  beforeEach(() => {
    (_mockUseAgentHealth as jest.Mock).mockReset();
  });

  it('renders system health overview region, group container, status roles, and legend region', () => {
    (_mockUseAgentHealth as jest.Mock).mockReturnValue({
      loading: false,
      error: null,
      healthData: {
        systemHealth: {
          overallScore: 92,
          healthyAgents: 3,
          totalAgents: 3,
          activeIssues: [
            {
              id: 'issue-1',
              severity: 'warning',
              message: 'High latency detected on RPC endpoint',
              timestamp: new Date(),
            },
          ],
        },
        agents: {
          'agent-1': {
            agentId: 'agent-1',
            name: 'Trader Agent',
            status: 'healthy',
            healthScore: 95,
            metrics: { latency: 120, uptime: 99.9, errorRate: 0.1 },
          },
        },
      },
    });

    render(<CopilotHealthPanel />);

    // Check system health overview region
    const overviewRegion = screen.getByRole('region', { name: 'System Health Overview' });
    expect(overviewRegion).toBeTruthy();

    // Check agent cards group container
    const cardsGroup = screen.getByRole('group', { name: 'Agent health status cards' });
    expect(cardsGroup).toBeTruthy();

    // Check active issue status role and aria-label
    const issueStatus = screen.getByRole('status', {
      name: 'Active issue (warning): High latency detected on RPC endpoint',
    });
    expect(issueStatus).toBeTruthy();

    // Check legend region
    const legendRegion = screen.getByRole('region', { name: 'Health score indicator legend' });
    expect(legendRegion).toBeTruthy();
  });

  it('renders error alert when hook encounters an error', () => {
    (_mockUseAgentHealth as jest.Mock).mockReturnValue({
      loading: false,
      error: 'Network timeout',
      healthData: null,
    });

    render(<CopilotHealthPanel />);

    const alert = screen.getByRole('alert');
    expect(alert).toBeTruthy();
    expect(alert.textContent).toContain('Failed to load agent health data: Network timeout');
  });
});
