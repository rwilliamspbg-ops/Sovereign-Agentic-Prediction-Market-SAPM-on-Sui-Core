import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, screen, act } from '@testing-library/react';
import { CopilotChatHealthIndicator } from '@/components/copilot/chat-integration';
import { _mockUseAgentHealth } from '@/providers/agent-health-provider';

describe('CopilotChatHealthIndicator Component accessibility and UX', () => {
  beforeEach(() => {
    (_mockUseAgentHealth as jest.Mock).mockReset();
  });

  it('renders correctly with loading state and then loaded state', async () => {
    const mockHealthResponse = {
      agents: {
        'agent-1': {
          agentId: 'agent-1-id-long-hash',
          reputationScore: 95,
        },
      },
      systemHealth: {
        overallScore: 90,
        healthyAgents: 1,
        totalAgents: 1,
        activeIssues: [],
      },
    };

    (_mockUseAgentHealth as jest.Mock).mockReturnValue({
      loading: false,
      error: null,
      healthData: mockHealthResponse,
    });

    await act(async () => {
      render(<CopilotChatHealthIndicator />);
    });

    // Assert the button has correct aria-label and styling attributes
    const button = screen.getByRole('button', { name: 'View agent health details' });
    expect(button).toBeTruthy();
    expect(button.getAttribute('aria-label')).toBe('View agent health details');
    expect(button.className).toContain('focus-visible:ring-2');
    expect(button.className).toContain('focus-visible:ring-teal-500');

    // Assert that the emoji is hidden from screen readers
    const emojiSpan = screen.getByText('🤖');
    expect(emojiSpan.getAttribute('aria-hidden')).toBe('true');

    // Assert that Agent Health tooltip includes group-focus-within and role="tooltip"
    const tooltip = screen.getByText('Agent Health');
    expect(tooltip).toBeTruthy();
    expect(tooltip.getAttribute('role')).toBe('tooltip');
    expect(tooltip.className).toContain('group-focus-within:opacity-100');

    // Assert top active agents group container and agent card accessibility
    const agentsGroup = screen.getByRole('group', { name: 'Top active agents' });
    expect(agentsGroup).toBeTruthy();

    const agentButton = screen.getByRole('button', { name: 'View details for agent @agent- with score 95' });
    expect(agentButton).toBeTruthy();
    expect(agentButton.getAttribute('tabindex')).toBe('0');
    expect(agentButton.className).toContain('focus-visible:ring-2');
    expect(agentButton.className).toContain('focus-visible:ring-teal-500');
  });
});
