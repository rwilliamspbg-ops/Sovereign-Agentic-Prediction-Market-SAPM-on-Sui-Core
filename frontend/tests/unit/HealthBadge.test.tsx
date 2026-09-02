import React from 'react';
import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { HealthBadge } from '@/components/ui/health-badge';

describe('HealthBadge Component Micro-UX & Accessibility', () => {
  it('renders with status role, explicit aria-label, tabIndex, focus ring, and tooltip', () => {
    render(<HealthBadge score={85} showTrend={true} trend="up" />);

    const badge = screen.getByRole('status', {
      name: 'Health score 85 of 100, trust level medium, trend up',
    });

    expect(badge).toBeTruthy();
    expect(badge.getAttribute('tabindex')).toBe('0');
    expect(badge.className).toContain('focus-visible:ring-2');
    expect(badge.className).toContain('focus-visible:ring-sky-500');

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toBeTruthy();
    expect(tooltip.textContent).toContain('Medium Trust');
    expect(tooltip.textContent).toContain('85/100');
    expect(tooltip.textContent).toContain('Trend: up');
  });

  it('correctly calculates high trust level and renders without trend when showTrend is false', () => {
    render(<HealthBadge score={95} />);

    const badge = screen.getByRole('status', {
      name: 'Health score 95 of 100, trust level high',
    });

    expect(badge).toBeTruthy();
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip.textContent).toContain('High Trust');
    expect(tooltip.textContent).not.toContain('Trend:');
  });
});
