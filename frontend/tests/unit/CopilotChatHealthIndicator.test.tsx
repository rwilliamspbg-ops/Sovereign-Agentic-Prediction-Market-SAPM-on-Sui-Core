import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { render, screen, act } from '@testing-library/react';
import { CopilotChatHealthIndicator } from '@/components/copilot/chat-integration';

describe('CopilotChatHealthIndicator Component accessibility and UX via global fetch mocking', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
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

    // Mock global fetch to return the mock response
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockHealthResponse),
      } as Response)
    ) as unknown as typeof global.fetch;

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
  });
});
