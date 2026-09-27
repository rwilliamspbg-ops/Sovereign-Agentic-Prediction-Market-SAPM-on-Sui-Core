import React from 'react';
import { render, screen } from '@testing-library/react';
import Help from '@/app/help/page';

describe('Help Page Micro-UX & Accessibility', () => {
  it('renders landmark region, accessible FAQ group, and aria-hidden decorative emojis', () => {
    render(<Help />);

    // 1. Check semantic landmark region
    const section = screen.getByRole('region', { name: 'Help and Documentation' });
    expect(section).toBeTruthy();

    // 2. Check FAQ group container
    const faqGroup = screen.getByRole('group', { name: 'Frequently asked questions' });
    expect(faqGroup).toBeTruthy();

    // 3. Verify FAQs content
    const question = screen.getByText('How do I connect my wallet?');
    expect(question).toBeTruthy();

    // 4. Verify decorative emojis are hidden from screen readers
    const emojiSpan = screen.getByText('❓');
    expect(emojiSpan.getAttribute('aria-hidden')).toBe('true');
  });
});
