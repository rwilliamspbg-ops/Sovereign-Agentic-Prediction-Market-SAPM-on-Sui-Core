import { describe, expect, it } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import CopilotSidebarPanel from '@/components/CopilotSidebarPanel';

describe('CopilotSidebarPanel Accessibility & Micro-UX', () => {
  it('renders with landmark region role and accessible name', () => {
    render(<CopilotSidebarPanel />);

    const region = screen.getByRole('region', { name: 'Market Context Overview' });
    expect(region).toBeTruthy();
  });

  it('renders filter buttons with aria-pressed and role="group"', () => {
    render(<CopilotSidebarPanel />);

    const filterGroup = screen.getByRole('group', { name: 'Filter context items' });
    expect(filterGroup).toBeTruthy();

    const allBtn = screen.getByRole('button', { name: 'Show all context items' });
    const readyBtn = screen.getByRole('button', { name: 'Filter ready context items' });

    expect(allBtn.getAttribute('aria-pressed')).toBe('true');
    expect(readyBtn.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(readyBtn);

    expect(allBtn.getAttribute('aria-pressed')).toBe('false');
    expect(readyBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('renders focusable context items with tabIndex, aria-label, and tooltips', () => {
    render(<CopilotSidebarPanel />);

    const item = screen.getByLabelText(/Sui testnet connected workspace/);
    expect(item).toBeTruthy();
    expect(item.getAttribute('tabIndex')).toBe('0');
    expect(item.className).toContain('focus-visible:ring-2');

    const tooltips = screen.getAllByRole('tooltip');
    expect(tooltips.length).toBeGreaterThan(0);
    expect(tooltips[0].textContent).toBe('Network connected and synced');
  });
});
