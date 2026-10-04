import React from 'react';
import { render, screen } from '@testing-library/react';
import ResourceHubPage from '@/app/resource-hub/page';

describe('ResourceHubPage Micro-UX & Accessibility', () => {
  it('renders landmark regions, category card group, and focus-visible external links', () => {
    render(<ResourceHubPage />);

    // 1. Check semantic landmark regions
    const headerRegion = screen.getByRole('region', { name: 'Builder Command Center Header' });
    expect(headerRegion).toBeTruthy();

    const categoriesRegion = screen.getByRole('region', { name: 'Sui Resource Hub Categories' });
    expect(categoriesRegion).toBeTruthy();

    // 2. Check category card group
    const categoryGroup = screen.getByRole('group', { name: 'Resource Hub Category Cards' });
    expect(categoryGroup).toBeTruthy();

    // 3. Verify main heading and package link
    const heading = screen.getByRole('heading', { level: 1, name: 'Sui Resource Hub' });
    expect(heading).toBeTruthy();

    const suiscanLink = screen.getByRole('link', { name: 'View Package On SuiScan' });
    expect(suiscanLink).toBeTruthy();
    expect(suiscanLink.getAttribute('target')).toBe('_blank');
    expect(suiscanLink.getAttribute('rel')).toBe('noopener noreferrer');
    expect(suiscanLink.className).toContain('focus-visible:ring-2');

    // 4. Verify external category links
    const allLinks = screen.getAllByRole('link');
    expect(allLinks.length).toBeGreaterThan(1);
    allLinks.forEach((link) => {
      expect(link.className).toContain('focus-visible:ring-2');
      expect(link.className).toContain('focus-visible:ring-cyan-500');
    });
  });
});
