import { describe, expect, it, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { SimpleAgentInsight } from '@/components/a2ui/AgentInsightButton';

describe('SimpleAgentInsight Component Micro-UX & Accessibility', () => {
  it('renders with explicit aria-label and accessible title', () => {
    render(<SimpleAgentInsight />);

    const button = screen.getByRole('button', {
      name: 'Get AI agent insight on market predictions',
    });

    expect(button).toBeTruthy();
    expect(button.getAttribute('aria-label')).toBe('Get AI agent insight on market predictions');
    expect(button.getAttribute('title')).toBe('Get AI agent insight on market predictions');
  });

  it('contains high-contrast focus-visible ring classes and minimum touch target size', () => {
    render(<SimpleAgentInsight />);

    const button = screen.getByRole('button', {
      name: 'Get AI agent insight on market predictions',
    });

    expect(button.className).toContain('focus-visible:ring-2');
    expect(button.className).toContain('focus-visible:ring-cyan-400');
    expect(button.className).toContain('min-h-[44px]');
    expect(button.className).toContain('min-w-[44px]');
  });

  it('hides decorative robot emoji from screen readers', () => {
    render(<SimpleAgentInsight />);

    const emojiSpan = screen.getByText('🤖');
    expect(emojiSpan.getAttribute('aria-hidden')).toBe('true');
  });

  it('triggers chat intent and updates loading state and live status on click', () => {
    render(<SimpleAgentInsight />);

    const button = screen.getByRole('button', {
      name: 'Get AI agent insight on market predictions',
    });

    expect(button.getAttribute('aria-busy')).toBe('false');

    fireEvent.click(button);

    const requestingButton = screen.getByRole('button', {
      name: 'Requesting AI agent insight on market predictions...',
    });
    expect(requestingButton.getAttribute('aria-busy')).toBe('true');

    const statusRegion = screen.getByRole('status');
    expect(statusRegion.textContent).toBe('Requesting AI agent insight...');
  });
});
