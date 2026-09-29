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
  });
});
