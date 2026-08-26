import React from 'react';
import { render, screen } from '@testing-library/react';
import ConfidenceGauge from '@/components/ConfidenceGauge';

describe('ConfidenceGauge Component Accessibility', () => {
  it('renders with role meter, accurate aria values, and focusability', () => {
    render(<ConfidenceGauge value={0.75} label="AI Model Score" />);

    const meter = screen.getByRole('meter', { name: 'AI Model Score confidence gauge' });
    expect(meter).toBeTruthy();
    expect(meter.getAttribute('aria-valuenow')).toBe('75');
    expect(meter.getAttribute('aria-valuemin')).toBe('0');
    expect(meter.getAttribute('aria-valuemax')).toBe('100');
    expect(meter.getAttribute('aria-valuetext')).toBe('AI Model Score: 75%');
    expect(meter.getAttribute('tabIndex')).toBe('0');

    expect(screen.getByText('AI Model Score')).toBeTruthy();
    expect(screen.getByText('75%')).toBeTruthy();
  });
});
