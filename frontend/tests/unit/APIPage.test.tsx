import React from 'react';
import { render, screen } from '@testing-library/react';
import API from '@/app/api/page';

describe('API Page Micro-UX & Accessibility', () => {
  it('renders landmark region, aria-hidden decorative emojis, and action options group', () => {
    render(<API />);

    // 1. Semantic landmark region check
    const section = screen.getByRole('region', { name: 'API Reference Overview' });
    expect(section).toBeTruthy();

    // 2. Check header emoji aria-hidden
    const headerEmoji = screen.getByText('🔌');
    expect(headerEmoji.getAttribute('aria-hidden')).toBe('true');

    // 3. Check section emoji aria-hidden
    const sectionEmoji = screen.getByText('🔗');
    expect(sectionEmoji.getAttribute('aria-hidden')).toBe('true');

    // 4. Verify text headings
    expect(screen.getByText('API Documentation')).toBeTruthy();
    expect(screen.getByText('REST API endpoints and integration guides coming soon.')).toBeTruthy();

    // 5. Group for action links
    const group = screen.getByRole('group', { name: 'API reference navigation options' });
    expect(group).toBeTruthy();

    // 6. Accessible navigation links
    const resourceHubLink = screen.getByRole('link', { name: 'Explore developer resource hub' });
    expect(resourceHubLink).toBeTruthy();
    expect(resourceHubLink.getAttribute('href')).toBe('/resource-hub');
    expect(resourceHubLink.className).toContain('focus-visible:ring-2');

    const marketsLink = screen.getByRole('link', { name: 'Explore active prediction markets' });
    expect(marketsLink).toBeTruthy();
    expect(marketsLink.getAttribute('href')).toBe('/markets');
    expect(marketsLink.className).toContain('focus-visible:ring-2');
  });
});
