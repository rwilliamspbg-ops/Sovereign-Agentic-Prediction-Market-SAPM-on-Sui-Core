import React from 'react';
import { render, screen } from '@testing-library/react';
import Docs from '@/app/docs/page';

describe('Docs Page Micro-UX & Accessibility', () => {
  it('renders landmark region, aria-hidden decorative emojis, and actionable navigation options group', () => {
    render(<Docs />);

    // 1. Check semantic landmark region
    const section = screen.getByRole('region', { name: 'Documentation Overview' });
    expect(section).toBeTruthy();

    // 2. Verify header emoji is hidden from screen readers
    const headerEmoji = screen.getByText('📚');
    expect(headerEmoji.getAttribute('aria-hidden')).toBe('true');

    // 3. Verify content emoji is hidden from screen readers
    const contentEmoji = screen.getByText('🚀');
    expect(contentEmoji.getAttribute('aria-hidden')).toBe('true');

    // 4. Verify main heading and text presence
    expect(screen.getByText('Coming Soon')).toBeTruthy();
    expect(screen.getByText('Full API and integration documentation coming soon.')).toBeTruthy();

    // 5. Verify action options group and quick links
    const optionsGroup = screen.getByRole('group', { name: 'Documentation action options' });
    expect(optionsGroup).toBeTruthy();

    const resourceHubLink = screen.getByRole('link', { name: 'Explore developer resource hub' });
    expect(resourceHubLink).toBeTruthy();
    expect(resourceHubLink.getAttribute('href')).toBe('/resource-hub');
    expect(resourceHubLink.className).toContain('focus-visible:ring-2');

    const marketsLink = screen.getByRole('link', { name: 'Browse active prediction markets' });
    expect(marketsLink).toBeTruthy();
    expect(marketsLink.getAttribute('href')).toBe('/markets');
    expect(marketsLink.className).toContain('focus-visible:ring-2');
  });
});
