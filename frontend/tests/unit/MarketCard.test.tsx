import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import { MarketCard } from '@/components/markets/MarketCard';
import { MarketList } from '@/components/markets/MarketList';

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

  it('filters by category and clears back to all markets', () => {
    render(<MarketList markets={markets} onTrade={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Technology' }));

    expect(screen.getByText('Will Sui reach 1M daily active users in 2026?')).toBeTruthy();
    expect(screen.queryByText('Will Bitcoin reach $100K in 2026?')).not.toBeTruthy();
    expect(screen.getByText('1 markets')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'All' }));

    expect(screen.getByText('Will Bitcoin reach $100K in 2026?')).toBeTruthy();
    expect(screen.getByText('3 markets')).toBeTruthy();
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
