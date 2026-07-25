import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { AgentInsightModal } from '@/components/a2ui/AgentInsightModal';
import { useCopilotChat } from '@copilotkit/react-core';

const mockPost = jest.fn();

// Configure the mock from jest.setup.js
(useCopilotChat as unknown as any).mockReturnValue({
  post: mockPost,
});

describe('AgentInsightModal Component', () => {
  const mockInsightNoAction = {
    message: 'We predict SUI will reach $5 next week.',
    confidence: 0.85,
  };

  const mockInsightWithAction = {
    message: 'SUI looks extremely bullish.',
    confidence: 0.92,
    action: {
      type: 'trade',
      marketId: 'market-1',
      side: 'yes',
    },
  };

  beforeEach(() => {
    mockPost.mockClear();
  });

  it('renders correctly with basic insight details and proper ARIA accessibility attributes', () => {
    render(<AgentInsightModal insight={mockInsightNoAction} />);

    // Check heading and ID
    const title = screen.getByRole('heading', { level: 3 });
    expect(title.textContent).toContain('Agent Insight');
    expect(title.getAttribute('id')).toBe('agent-insight-title');

    // Check dialog role and attributes
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('agent-insight-title');

    // Check message and confidence percentage
    expect(screen.getByText('We predict SUI will reach $5 next week.')).toBeTruthy();
    expect(screen.getByText('Confidence: 85%')).toBeTruthy();
  });

  it('has a top-right close icon button with high accessibility standards', () => {
    render(<AgentInsightModal insight={mockInsightNoAction} />);

    const closeIconButton = screen.getByRole('button', { name: 'Dismiss insight' });
    expect(closeIconButton).toBeTruthy();
    expect(closeIconButton.getAttribute('aria-label')).toBe('Dismiss insight');
    expect(closeIconButton.className).toContain('min-h-[44px]');
    expect(closeIconButton.className).toContain('min-w-[44px]');
    expect(closeIconButton.className).toContain('focus-visible:ring-2');
    expect(closeIconButton.className).toContain('focus-visible:ring-cyan-500');

    // Click close icon triggers dismiss-insight intent
    fireEvent.click(closeIconButton);
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith({ type: 'dismiss-insight' });
  });

  it('triggers dismiss-insight intent when the main Dismiss button is clicked', () => {
    render(<AgentInsightModal insight={mockInsightNoAction} />);

    const dismissButton = screen.getByRole('button', { name: 'Dismiss' });
    expect(dismissButton).toBeTruthy();
    expect(dismissButton.className).toContain('focus-visible:ring-2');

    fireEvent.click(dismissButton);
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith({ type: 'dismiss-insight' });
  });

  it('renders Accept Insight button only when action is present, and triggers accept-insight when clicked', () => {
    const { rerender } = render(<AgentInsightModal insight={mockInsightNoAction} />);

    // Should not render Accept Insight button initially
    expect(screen.queryByRole('button', { name: /Accept Insight/ })).toBeNull();

    // Re-render with action
    rerender(<AgentInsightModal insight={mockInsightWithAction} />);

    const acceptButton = screen.getByRole('button', { name: 'Accept Insight → Trade Now' });
    expect(acceptButton).toBeTruthy();
    expect(acceptButton.className).toContain('focus-visible:ring-2');

    fireEvent.click(acceptButton);
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith({
      type: 'accept-insight',
      data: mockInsightWithAction,
    });
  });

  it('triggers dismiss-insight intent on backdrop click, but stopPropagation prevents content clicks from closing', () => {
    render(<AgentInsightModal insight={mockInsightNoAction} />);

    const dialogContent = screen.getByRole('dialog');

    // Click inside the dialog box (content) should NOT trigger dismiss
    fireEvent.click(dialogContent);
    expect(mockPost).not.toHaveBeenCalled();

    // Click on the backdrop (outermost div)
    const backdrop = dialogContent.parentElement;
    expect(backdrop).toBeTruthy();
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(mockPost).toHaveBeenCalledTimes(1);
      expect(mockPost).toHaveBeenCalledWith({ type: 'dismiss-insight' });
    }
  });

  it('dismisses modal when Escape key is pressed', () => {
    render(<AgentInsightModal insight={mockInsightNoAction} />);

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith({ type: 'dismiss-insight' });
  });
});
