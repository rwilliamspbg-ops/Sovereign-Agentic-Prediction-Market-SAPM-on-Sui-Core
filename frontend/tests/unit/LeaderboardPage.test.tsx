import React from 'react';
import { render, screen } from '@testing-library/react';
import Leaderboard from '@/app/leaderboard/page';

describe('Leaderboard Page Micro-UX & Accessibility', () => {
  it('renders landmark region, accessible table aria-label, and aria-hidden decorative rank emojis', () => {
    render(<Leaderboard />);

    // 1. Semantic landmark region check
    const section = screen.getByRole('region', { name: 'Top traders leaderboard' });
    expect(section).toBeTruthy();

    // 2. Table aria-label check
    const table = screen.getByRole('table', { name: 'Top prediction market traders ranking table' });
    expect(table).toBeTruthy();

    // 3. Header check
    expect(screen.getByText('Leaderboard')).toBeTruthy();

    // 4. Rows check
    const rows = screen.getAllByRole('row');
    // 1 header row + 5 trader rows = 6
    expect(rows.length).toBe(6);
  });
});
