import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { AgentHealthDetails } from '@/components/copilot/agent-health-details';
import { AgentHealthMetrics } from '@/types/agent-health';

describe('AgentHealthDetails Component', () => {
  const mockAgent: AgentHealthMetrics = {
    agentId: 'agent-1-id',
    reputationScore: 95,
    consecutiveSuccesses: 6,
    successRate: 98,
    totalExecutions: 150,
    averageLatencyMs: 120,
    status: 'healthy',
    lastExecutionTime: '2026-07-22T00:00:00.000Z',
    lastHealthCheck: '2026-07-22T00:00:00.000Z',
    trustLevel: 'high',
    failureReasons: [],
  };

  it('renders close buttons with correct accessibility attributes', () => {
    const handleClose = jest.fn();
    render(<AgentHealthDetails agent={mockAgent} onClose={handleClose} />);

    // Top-right close icon button
    const closeIconButton = screen.getByRole('button', { name: 'Close agent details' });
    expect(closeIconButton).toBeTruthy();
    expect(closeIconButton.getAttribute('aria-label')).toBe('Close agent details');
    expect(closeIconButton.className).toContain('focus-visible:ring-2');
    expect(closeIconButton.className).toContain('focus-visible:ring-teal-500');
    expect(closeIconButton.className).toContain('min-h-[44px]');
    expect(closeIconButton.className).toContain('min-w-[44px]');

    // Bottom Close button
    const bottomCloseButton = screen.getByRole('button', { name: 'Close' });
    expect(bottomCloseButton).toBeTruthy();
    expect(bottomCloseButton.className).toContain('focus-visible:ring-2');
    expect(bottomCloseButton.className).toContain('focus-visible:ring-teal-500');
  });
});
