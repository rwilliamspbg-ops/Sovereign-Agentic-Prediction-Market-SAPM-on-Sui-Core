import { describe, expect, it, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import { AgentHealthCard } from '@/components/ui/agent-health-card';
import { AgentHealthMetrics } from '@/types/agent-health';

describe('AgentHealthCard Component', () => {
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

  it('renders with correct accessibility attributes and keyboard interactivity', () => {
    const handleClick = jest.fn();
    render(<AgentHealthCard agent={mockAgent} onClick={handleClick} />);

    // Get the card by its role and aria-label
    const card = screen.getByRole('button', {
      name: 'View health and performance details for agent @agent-1-id',
    });

    expect(card).toBeTruthy();
    expect(card.getAttribute('tabindex')).toBe('0');
    expect(card.className).toContain('focus-visible:ring-2');
    expect(card.className).toContain('focus-visible:ring-teal-500');

    // Test Keyboard navigation (Enter key)
    fireEvent.keyDown(card, { key: 'Enter', code: 'Enter' });
    expect(handleClick).toHaveBeenCalledTimes(1);

    // Test Keyboard navigation (Space key)
    fireEvent.keyDown(card, { key: ' ', code: 'Space' });
    expect(handleClick).toHaveBeenCalledTimes(2);

    // Test non-activating key does not trigger click
    fireEvent.keyDown(card, { key: 'Escape', code: 'Escape' });
    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  it('sets tabIndex={-1} on the inner View Details button to prevent redundant tab stops and has correct focus-within classes', () => {
    render(<AgentHealthCard agent={mockAgent} onClick={jest.fn()} />);

    // Get the visual View Details button
    const viewDetailsButton = screen.getByRole('button', { name: 'View Details' });
    expect(viewDetailsButton).toBeTruthy();
    expect(viewDetailsButton.getAttribute('tabindex')).toBe('-1');

    // Check that the container overlay has the class for focus-within accessibility
    const overlay = viewDetailsButton.parentElement;
    expect(overlay).toBeTruthy();
    expect(overlay?.className).toContain('group-focus-within:opacity-100');
  });
});
