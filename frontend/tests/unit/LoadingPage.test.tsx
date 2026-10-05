import React from 'react';
import { render, screen } from '@testing-library/react';
import Loading from '../../src/app/loading';

describe('Loading Page Micro-UX & Accessibility', () => {
  it('renders landmark region, status role with polite live region, and decorative icons hidden', () => {
    render(<Loading />);

    // 1. Semantic landmark region check
    const section = screen.getByRole('region', { name: 'Loading page state' });
    expect(section).toBeTruthy();

    // 2. Status role with polite live region for screen readers
    const status = screen.getByRole('status');
    expect(status).toBeTruthy();
    expect(status.getAttribute('aria-live')).toBe('polite');

    // 3. Lightning emoji is wrapped with aria-hidden="true"
    const lightningEmoji = screen.getByText('⚡');
    expect(lightningEmoji.getAttribute('aria-hidden')).toBe('true');

    // 4. Loading heading text displays correctly
    expect(screen.getByText('Loading Markets...')).toBeTruthy();
  });
});
