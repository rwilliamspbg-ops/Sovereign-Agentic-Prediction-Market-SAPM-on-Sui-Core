import React from 'react';
import { render, screen } from '@testing-library/react';
import Terms from '@/app/terms/page';

describe('Terms of Service Page Micro-UX & Accessibility', () => {
  it('renders landmark region, accessible user responsibilities list label, and aria-hidden decorative emoji', () => {
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
  });
});
