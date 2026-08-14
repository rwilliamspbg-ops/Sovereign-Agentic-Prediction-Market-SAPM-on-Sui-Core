import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import { MarketCard } from '@/components/markets/MarketCard';
import { MarketList } from '@/components/markets/MarketList';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

type MockMarketData = {
  id: string;
  question: string;
  yesPrice: number;
  noPrice: number;
  yesVolume: number;
  noVolume: number;
  lastUpdate: Date;
  category?: string;
  resolutionStatus?: 'pending' | 'resolved';
};

const markets: MockMarketData[] = [
  {
    id: 'BTC_100K_2026',
    question: 'Will Bitcoin reach $100K in 2026?',
    yesPrice: 0.72,
    noPrice: 0.28,
    yesVolume: 150000,
    noVolume: 80000,
    lastUpdate: new Date(Date.now() - 5 * 60 * 1000),
    category: 'Crypto',
    resolutionStatus: 'pending',
  },
  {
    id: 'SUI_DAU_2026',
    question: 'Will Sui reach 1M daily active users in 2026?',
    yesPrice: 0.55,
    noPrice: 0.45,
    yesVolume: 60000,
    noVolume: 100000,
    lastUpdate: new Date(Date.now() - 20 * 60 * 1000),
    category: 'Technology',
  },
  {
    id: 'AI_TVL_2026',
    question: 'Will on-chain AI agents control $10B TVL in 2026?',
    yesPrice: 0.42,
    noPrice: 0.58,
    yesVolume: 90000,
    noVolume: 50000,
    lastUpdate: new Date(Date.now() - 60 * 60 * 1000),
    category: 'AI',
  },
];

describe('MarketCard Component', () => {
  const baseMarket = {
    id: 'TEST_MARKET_001',
    question: 'Will Bitcoin reach $100K in 2026?',
    yesPrice: 0.72,
    noPrice: 0.28,
    yesVolume: 150000,
    noVolume: 80000,
    lastUpdate: new Date(Date.now() - 2 * 60 * 60 * 1000),
    category: 'crypto',
  };

  it('renders question, category, and formatted prices', () => {
    render(<MarketCard market={baseMarket} onTrade={() => undefined} />);

    expect(screen.getByText('Will Bitcoin reach $100K in 2026?')).toBeTruthy();
    expect(screen.getByText('crypto')).toBeTruthy();
    expect(screen.getByText('0.7200 SUI')).toBeTruthy();
    expect(screen.getByText('0.2800 SUI')).toBeTruthy();
    expect(screen.getByText('72.00% Prob.')).toBeTruthy();
    expect(screen.getByText('28.00% Prob.')).toBeTruthy();
  });

  it('calls onTrade with yes when YES card is clicked', () => {
    const onTrade = jest.fn();
    render(<MarketCard market={baseMarket} onTrade={onTrade} />);

    fireEvent.click(screen.getByText('YES'));
    expect(onTrade).toHaveBeenCalledWith('TEST_MARKET_001', 'yes');
  });

  it('calls onTrade with no when NO card is clicked', () => {
    const onTrade = jest.fn();
    render(<MarketCard market={baseMarket} onTrade={onTrade} />);

    fireEvent.click(screen.getByText('NO'));
    expect(onTrade).toHaveBeenCalledWith('TEST_MARKET_001', 'no');
  });

  it('shows agent edge badge when edge is above threshold', () => {
    render(<MarketCard market={baseMarket} onTrade={() => undefined} agentEdge={0.85} />);

    expect(screen.getByText('85% Edge')).toBeTruthy();
  });

  it('hides agent edge badge when edge is at or below threshold', () => {
    render(<MarketCard market={baseMarket} onTrade={() => undefined} agentEdge={0.3} />);

    expect(screen.queryByText(/Edge/)).toBeNull();
  });

  it('shows calculated risk level from liquidity imbalance', () => {
    render(<MarketCard market={baseMarket} onTrade={() => undefined} />);

    expect(screen.getByText('Risk: High')).toBeTruthy();
  });

  it('shows updated time and market details tooltip text', () => {
    render(<MarketCard market={baseMarket} onTrade={() => undefined} />);

    expect(screen.getByText(/Updated/)).toBeTruthy();
    expect(screen.getByText('Market Details')).toBeTruthy();
    expect(screen.getByText('ID: TEST_MARKET_001')).toBeTruthy();
  });
});

describe('MarketCard human interactions', () => {
  it('renders market details and invokes YES trading when the card is selected', () => {
    const onTrade = jest.fn();
    render(<MarketCard market={markets[0]} onTrade={onTrade} agentEdge={0.85} />);

    expect(screen.getByText('Will Bitcoin reach $100K in 2026?')).toBeTruthy();
    expect(screen.getByText('0.7200 SUI')).toBeTruthy();
    expect(screen.getByText('0.2800 SUI')).toBeTruthy();
    expect(screen.getByText('85% Edge')).toBeTruthy();
    expect(screen.getByText('Risk: High')).toBeTruthy();

    fireEvent.click(screen.getByText('Will Bitcoin reach $100K in 2026?'));

    expect(onTrade).toHaveBeenCalledWith('BTC_100K_2026', 'yes');
  });

  it('allows users to select the NO side without triggering the card default YES action', () => {
    const onTrade = jest.fn();
    render(<MarketCard market={markets[0]} onTrade={onTrade} />);

    fireEvent.click(screen.getByText('NO'));

    expect(onTrade).toHaveBeenCalledTimes(1);
    expect(onTrade).toHaveBeenCalledWith('BTC_100K_2026', 'no');
  });
});

describe('MarketList human interactions', () => {
  it('filters visible markets by search text and shows an empty state when no market matches', () => {
    render(<MarketList markets={markets} onTrade={jest.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Search markets...'), { target: { value: 'Sui' } });

    expect(screen.getByText('Will Sui reach 1M daily active users in 2026?')).toBeTruthy();
    expect(screen.queryByText('Will Bitcoin reach $100K in 2026?')).not.toBeTruthy();
    expect(screen.getByText('1 markets')).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('Search markets...'), { target: { value: '' } });
    fireEvent.change(screen.getByPlaceholderText('Search markets...'), { target: { value: 'nonexistent market' } });

    expect(screen.getByText('No markets found')).toBeTruthy();
    expect(screen.getByText('0 markets')).toBeTruthy();
  });

  it('shows, operates, and clears search with search clear button', () => {
    render(<MarketList markets={markets} onTrade={jest.fn()} />);

    // Initially, clear search button should not exist
    expect(screen.queryByRole('button', { name: 'Clear search query' })).toBeNull();

    // Type something to make it appear
    const searchInput = screen.getByPlaceholderText('Search markets...') as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'Sui' } });

    // Now, clear search button should exist
    const clearButton = screen.getByRole('button', { name: 'Clear search query' });
    expect(clearButton).toBeTruthy();

    // Click clear search button
    fireEvent.click(clearButton);

    // Search input should be empty and clear button should be gone
    expect(searchInput.value).toBe('');
    expect(screen.queryByRole('button', { name: 'Clear search query' })).toBeNull();
  });

  it('filters by category and clears back to all markets with correct aria-pressed states', () => {
    render(<MarketList markets={markets} onTrade={jest.fn()} />);

    const allBtn = screen.getByRole('button', { name: 'All' });
    const techBtn = screen.getByRole('button', { name: 'Technology' });

    // Initial aria-pressed states
    expect(allBtn.getAttribute('aria-pressed')).toBe('true');
    expect(techBtn.getAttribute('aria-pressed')).toBe('false');

    // Click category
    fireEvent.click(techBtn);

    expect(screen.getByText('Will Sui reach 1M daily active users in 2026?')).toBeTruthy();
    expect(screen.queryByText('Will Bitcoin reach $100K in 2026?')).not.toBeTruthy();
    expect(screen.getByText('1 markets')).toBeTruthy();

    // Checked aria-pressed states after click
    expect(allBtn.getAttribute('aria-pressed')).toBe('false');
    expect(techBtn.getAttribute('aria-pressed')).toBe('true');

    // Click All back
    fireEvent.click(allBtn);

    expect(screen.getByText('Will Bitcoin reach $100K in 2026?')).toBeTruthy();
    expect(screen.getByText('3 markets')).toBeTruthy();

    expect(allBtn.getAttribute('aria-pressed')).toBe('true');
    expect(techBtn.getAttribute('aria-pressed')).toBe('false');
  });

  it('routes YES and NO selections from listed cards to the trade callback', () => {
    const onTrade = jest.fn();
    render(<MarketList markets={markets} onTrade={onTrade} />);

    fireEvent.click(screen.getAllByText('YES')[0]);
    fireEvent.click(screen.getAllByText('NO')[1]);

    expect(onTrade).toHaveBeenNthCalledWith(1, 'BTC_100K_2026', 'yes');
    expect(onTrade).toHaveBeenNthCalledWith(2, 'SUI_DAU_2026', 'no');
  });

  it('exposes AI Edge sorting when edge scores are available', () => {
    render(
      <MarketList
        markets={markets}
        onTrade={jest.fn()}
        agentEdge={{ BTC_100K_2026: 0.35, SUI_DAU_2026: 0.92, AI_TVL_2026: 0.55 }}
      />,
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'edge' } });

    const marketHeadings = screen.getAllByRole('heading', { level: 3 });
    expect(marketHeadings[0].textContent).toContain('Will Sui reach 1M daily active users in 2026?');
  });
});

describe('MarketCard keyboard interactions and accessibility attributes', () => {
  const baseMarket = {
    id: 'TEST_MARKET_001',
    question: 'Will Bitcoin reach $100K in 2026?',
    yesPrice: 0.72,
    noPrice: 0.28,
    yesVolume: 150000,
    noVolume: 80000,
    lastUpdate: new Date(Date.now() - 2 * 60 * 60 * 1000),
    category: 'crypto',
  };

  it('renders with appropriate aria attributes and roles', () => {
    render(<MarketCard market={baseMarket} onTrade={() => undefined} />);

    // Get the card by its role and name
    const card = screen.getByRole('button', {
      name: /Market: Will Bitcoin reach \$100K in 2026\?/,
    });
    expect(card).toBeTruthy();
    expect(card.getAttribute('tabIndex')).toBe('0');

    // Get the YES block by its role and name
    const yesButton = screen.getByRole('button', {
      name: /Trade YES for market: Will Bitcoin reach \$100K in 2026\?/,
    });
    expect(yesButton).toBeTruthy();
    expect(yesButton.getAttribute('tabIndex')).toBe('0');

    // Get the NO block by its role and name
    const noButton = screen.getByRole('button', {
      name: /Trade NO for market: Will Bitcoin reach \$100K in 2026\?/,
    });
    expect(noButton).toBeTruthy();
    expect(noButton.getAttribute('tabIndex')).toBe('0');
  });

  it('handles Enter and Space keyboard events correctly on YES/NO blocks', () => {
    const onTrade = jest.fn();
    render(<MarketCard market={baseMarket} onTrade={onTrade} />);

    const yesButton = screen.getByRole('button', {
      name: /Trade YES for market: Will Bitcoin reach \$100K in 2026\?/,
    });
    const noButton = screen.getByRole('button', {
      name: /Trade NO for market: Will Bitcoin reach \$100K in 2026\?/,
    });

    // Enter key on YES
    fireEvent.keyDown(yesButton, { key: 'Enter', code: 'Enter' });
    expect(onTrade).toHaveBeenCalledWith('TEST_MARKET_001', 'yes');

    // Space key on NO
    fireEvent.keyDown(noButton, { key: ' ', code: 'Space' });
    expect(onTrade).toHaveBeenCalledWith('TEST_MARKET_001', 'no');
  });
});
