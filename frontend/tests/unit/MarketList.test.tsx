import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MarketList } from '@/components/markets/MarketList';

const mockMarkets = [
  {
    id: '0x111',
    question: 'Will Sui reach $10 in 2026?',
    yesPrice: 0.65,
    noPrice: 0.35,
    yesVolume: 50000,
    noVolume: 20000,
    lastUpdate: new Date('2026-08-01T10:00:00Z'),
    category: 'Crypto',
  },
  {
    id: '0x222',
    question: 'Will Federal Reserve cut rates in Q3?',
    yesPrice: 0.40,
    noPrice: 0.60,
    yesVolume: 30000,
    noVolume: 40000,
    lastUpdate: new Date('2026-08-02T10:00:00Z'),
    category: 'Macro',
  },
];

describe('MarketList Micro-UX & Accessibility', () => {
  const mockOnTrade = jest.fn();

  beforeEach(() => {
    mockOnTrade.mockClear();
  });

  it('renders search input and category filter buttons with correct ARIA attributes', () => {
    render(<MarketList markets={mockMarkets} onTrade={mockOnTrade} />);

    // Search input
    const searchInput = screen.getByRole('textbox', { name: 'Search prediction markets' });
    expect(searchInput).toBeTruthy();

    // Category filter group
    const categoryGroup = screen.getByRole('group', { name: 'Filter markets by category' });
    expect(categoryGroup).toBeTruthy();

    // "All" category button active initially
    const allBtn = screen.getByRole('button', { name: 'All' });
    expect(allBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('filters markets by search query and shows clear button', () => {
    render(<MarketList markets={mockMarkets} onTrade={mockOnTrade} />);

    const searchInput = screen.getByRole('textbox', { name: 'Search prediction markets' });
    fireEvent.change(searchInput, { target: { value: 'Sui' } });

    // Clear search query button should appear
    const clearBtn = screen.getByRole('button', { name: 'Clear search query' });
    expect(clearBtn).toBeTruthy();

    // Clicking clear search resets search input
    fireEvent.click(clearBtn);
    expect((searchInput as HTMLInputElement).value).toBe('');
  });

  it('renders clear filters button in empty state when query returns no results, resetting filters on click', () => {
    render(<MarketList markets={mockMarkets} onTrade={mockOnTrade} />);

    const searchInput = screen.getByRole('textbox', { name: 'Search prediction markets' });
    fireEvent.change(searchInput, { target: { value: 'NonExistentQuery123' } });

    expect(screen.getByText('No markets found')).toBeTruthy();

    // Clear filters & search button in empty state
    const resetFiltersBtn = screen.getByRole('button', { name: 'Reset active search and category filters' });
    expect(resetFiltersBtn).toBeTruthy();

    // Click reset button
    fireEvent.click(resetFiltersBtn);

    // Filter reset and markets restored
    expect(screen.getByText('Will Sui reach $10 in 2026?')).toBeTruthy();
    expect(screen.getByText('Will Federal Reserve cut rates in Q3?')).toBeTruthy();
  });
});
