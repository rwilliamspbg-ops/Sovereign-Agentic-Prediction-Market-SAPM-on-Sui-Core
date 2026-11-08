import React from 'react';
import { render, screen } from '@testing-library/react';
import Privacy from '@/app/privacy/page';

describe('Privacy Policy Page Micro-UX & Accessibility', () => {
  it('renders landmark region, accessible collected data list label, and aria-hidden decorative emoji', () => {
    render(<Privacy />);

    // 1. Check semantic landmark region
    const section = screen.getByRole('region', { name: 'Privacy Policy Overview' });
    expect(section).toBeTruthy();

    // 2. Check collected data list
    const dataList = screen.getByRole('list', { name: 'Categories of collected data' });
    expect(dataList).toBeTruthy();

    // 3. Verify privacy content
    const walletAddressText = screen.getByText(/Wallet addresses/);
    expect(walletAddressText).toBeTruthy();

    // 4. Verify decorative lock emoji is hidden from screen readers
    const emojiSpan = screen.getByText('🔒');
    expect(emojiSpan.getAttribute('aria-hidden')).toBe('true');

    // 5. Verify navigation action link group & focus-visible class
    const navGroup = screen.getByRole('group', { name: 'Privacy page navigation actions' });
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
