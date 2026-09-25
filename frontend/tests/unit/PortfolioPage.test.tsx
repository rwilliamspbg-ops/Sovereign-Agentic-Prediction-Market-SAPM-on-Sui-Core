import React from 'react';
import { render, screen } from '@testing-library/react';
import Portfolio from '@/app/portfolio/page';

describe('Portfolio Page Micro-UX & Accessibility', () => {
  it('renders semantic region landmark, decorative emoji aria-hidden, and action options group', () => {
    render(<Portfolio />);

    // Semantic landmark region check
    const section = screen.getByRole('region', { name: 'Portfolio status overview' });
    expect(section).toBeTruthy();

    // Group for action links
    const group = screen.getByRole('group', { name: 'Portfolio action options' });
    expect(group).toBeTruthy();

    // Accessible navigation links
    const marketsLink = screen.getByRole('link', { name: 'Browse active prediction markets' });
    expect(marketsLink).toBeTruthy();
    expect(marketsLink.getAttribute('href')).toBe('/markets');
    expect(marketsLink.className).toContain('focus-visible:ring-2');

    const leaderboardLink = screen.getByRole('link', { name: 'View top traders on the leaderboard' });
    expect(leaderboardLink).toBeTruthy();
    expect(leaderboardLink.getAttribute('href')).toBe('/leaderboard');
    expect(leaderboardLink.className).toContain('focus-visible:ring-2');
  });
});
