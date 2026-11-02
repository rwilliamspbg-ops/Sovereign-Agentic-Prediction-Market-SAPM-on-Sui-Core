import React from 'react';
import { render, screen } from '@testing-library/react';
import Risk from '@/app/risk/page';

describe('Risk Disclosure Page Micro-UX & Accessibility', () => {
  it('renders landmark region, accessible key risks list label, and aria-hidden decorative emoji', () => {
    render(<Risk />);

    // 1. Check semantic landmark region
    const section = screen.getByRole('region', { name: 'Risk Disclosure Overview' });
    expect(section).toBeTruthy();

    // 2. Check key trading risks list
    const risksList = screen.getByRole('list', { name: 'Key trading risks' });
    expect(risksList).toBeTruthy();

    // 3. Verify risk content
    const marketRisk = screen.getByText('Market Risk:');
    expect(marketRisk).toBeTruthy();

    // 4. Verify decorative warning emoji is hidden from screen readers
    const emojiSpan = screen.getByText('⚠️');
    expect(emojiSpan.getAttribute('aria-hidden')).toBe('true');

    // 5. Verify navigation action link group & focus-visible class
    const navGroup = screen.getByRole('group', { name: 'Risk page navigation actions' });
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
