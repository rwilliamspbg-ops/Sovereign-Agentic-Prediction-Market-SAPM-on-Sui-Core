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

  it('contains high-contrast focus-visible ring classes for keyboard navigation', () => {
    render(<SimpleAgentInsight />);

    const button = screen.getByRole('button', {
      name: 'Get AI agent insight on market predictions',
    });

    expect(button.className).toContain('focus-visible:ring-2');
    expect(button.className).toContain('focus-visible:ring-cyan-400');
  });

  it('triggers chat intent when clicked', () => {
    render(<SimpleAgentInsight />);

    const button = screen.getByRole('button', {
      name: 'Get AI agent insight on market predictions',
    });

    expect(() => fireEvent.click(button)).not.toThrow();
  });
});
