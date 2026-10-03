import React from 'react';
import { render, screen } from '@testing-library/react';
import Governance from '@/app/governance/page';

describe('Governance Page Micro-UX & Accessibility', () => {
  it('renders landmark region and aria-hidden decorative emojis', () => {
    render(<Governance />);

    // 1. Check semantic landmark region
    const section = screen.getByRole('region', { name: 'Governance overview' });
    expect(section).toBeTruthy();

    // 2. Verify header emoji is hidden from screen readers
    const headerEmoji = screen.getByText('⚖️');
    expect(headerEmoji.getAttribute('aria-hidden')).toBe('true');

    // 3. Verify content emoji is hidden from screen readers
    const contentEmoji = screen.getByText('🗳️');
    expect(contentEmoji.getAttribute('aria-hidden')).toBe('true');

    // 4. Verify main heading and text presence
    expect(screen.getByText('Governance System')).toBeTruthy();
    expect(screen.getByText('DAO governance and voting mechanisms coming soon.')).toBeTruthy();
  });
});
