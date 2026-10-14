import React from 'react';
import { render, screen } from '@testing-library/react';
import Terms from '@/app/terms/page';

describe('Terms of Service Page Micro-UX & Accessibility', () => {
  it('renders landmark region, accessible user responsibilities list label, aria-hidden emoji, and navigation controls', () => {
    render(<Terms />);

    // 1. Check semantic landmark region
    const section = screen.getByRole('region', { name: 'Terms of Service Overview' });
    expect(section).toBeTruthy();

    // 2. Check user responsibilities list
    const responsibilitiesList = screen.getByRole('list', { name: 'User responsibilities list' });
    expect(responsibilitiesList).toBeTruthy();

    // 3. Verify terms content
    const walletText = screen.getByText(/You are responsible for securing your wallet/);
    expect(walletText).toBeTruthy();

    // 4. Verify decorative document emoji is hidden from screen readers
    const emojiSpan = screen.getByText('📄');
    expect(emojiSpan.getAttribute('aria-hidden')).toBe('true');

    // 5. Verify navigation action link group & focus-visible class
    const navGroup = screen.getByRole('group', { name: 'Terms page navigation actions' });
    expect(navGroup).toBeTruthy();

    const marketsLink = screen.getByRole('link', { name: 'Explore active prediction markets' });
    expect(marketsLink).toBeTruthy();
    expect(marketsLink.getAttribute('href')).toBe('/markets');
    expect(marketsLink.className).toContain('focus-visible:ring-2');

    const resourceLink = screen.getByRole('link', { name: 'View developer resource hub' });
    expect(resourceLink).toBeTruthy();
    expect(resourceLink.getAttribute('href')).toBe('/resource-hub');
    expect(resourceLink.className).toContain('focus-visible:ring-2');
  });
});
