import { describe, it, expect, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import { MarketCard } from '@/components/markets/MarketCard';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

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
