'use client';

import React, { useEffect, useMemo, useState } from 'react';

type MarketStatus = 'live' | 'new' | 'closing-soon';
type MarketCategory = 'Politics' | 'Crypto' | 'Macro' | 'Sports' | 'Tech';

interface MarketItem {
  id: string;
  title: string;
  subtitle: string;
  category: MarketCategory;
  yesPrice: number;
  noPrice: number;
  volume24h: number;
  openInterest: number;
  change24h: number;
  closeAt: string;
  status: MarketStatus;
  liquidityScore: number;
}

const FALLBACK_MARKETS: MarketItem[] = [
  {
    id: 'MKT-001',
    title: 'Will SUI close above $4.50 by Dec 31, 2026?',
    subtitle: 'Resolution source: CoinGecko daily close.',
    category: 'Crypto',
    yesPrice: 0.61,
    noPrice: 0.39,
    volume24h: 1240000,
    openInterest: 5100000,
    change24h: 0.043,
    closeAt: '2026-12-31',
    status: 'live',
    liquidityScore: 92,
  },
  {
    id: 'MKT-002',
    title: 'Will a US spot ETH ETF exceed $20B AUM by Q4 2026?',
    subtitle: 'Resolution source: issuer and SEC filings.',
    category: 'Macro',
    yesPrice: 0.54,
    noPrice: 0.46,
    volume24h: 980000,
    openInterest: 3200000,
    change24h: -0.027,
    closeAt: '2026-10-01',
    status: 'live',
    liquidityScore: 86,
  },
  {
    id: 'MKT-003',
    title: 'Will US CPI print below 2.5% in December 2026?',
    subtitle: 'Resolution source: BLS CPI release.',
    category: 'Macro',
    yesPrice: 0.48,
    noPrice: 0.52,
    volume24h: 760000,
    openInterest: 2500000,
    change24h: 0.018,
    closeAt: '2026-12-15',
    status: 'new',
    liquidityScore: 80,
  },
  {
    id: 'MKT-004',
    title: 'Will any autonomous agent execute >$1B on-chain volume this year?',
    subtitle: 'Resolution source: on-chain analytics aggregate.',
    category: 'Tech',
    yesPrice: 0.33,
    noPrice: 0.67,
    volume24h: 460000,
    openInterest: 1800000,
    change24h: 0.065,
    closeAt: '2026-11-30',
    status: 'new',
    liquidityScore: 74,
  },
  {
    id: 'MKT-005',
    title: 'Will Team USA top total gold medals in the next Olympics?',
    subtitle: 'Resolution source: IOC official final table.',
    category: 'Sports',
    yesPrice: 0.71,
    noPrice: 0.29,
    volume24h: 390000,
    openInterest: 1200000,
    change24h: -0.012,
    closeAt: '2026-08-20',
    status: 'closing-soon',
    liquidityScore: 70,
  },
  {
    id: 'MKT-006',
    title: 'Will a major US federal AI bill pass before Jan 2027?',
    subtitle: 'Resolution source: Congress.gov final status.',
    category: 'Politics',
    yesPrice: 0.42,
    noPrice: 0.58,
    volume24h: 630000,
    openInterest: 2700000,
    change24h: 0.031,
    closeAt: '2026-12-20',
    status: 'live',
    liquidityScore: 88,
  },
];

const formatUsd = (value: number): string => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
};

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;

const formatCloseIn = (isoDate: string): string => {
  const now = Date.now();
  const end = new Date(isoDate).getTime();
  const diff = Math.max(end - now, 0);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Closes <24h';
  if (days < 30) return `Closes in ${days}d`;
  const months = Math.floor(days / 30);
  return `Closes in ${months}mo`;
};

export default function MarketExperienceBoard() {
  const [markets, setMarkets] = useState<MarketItem[]>(FALLBACK_MARKETS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'All' | MarketCategory>('All');
  const [status, setStatus] = useState<'all' | MarketStatus>('all');
  const [sortBy, setSortBy] = useState<'volume' | 'change' | 'liquidity'>('volume');
  const [watchlist, setWatchlist] = useState<Record<string, boolean>>({});
  const [selectedMarketId, setSelectedMarketId] = useState<string>(FALLBACK_MARKETS[0]?.id || '');
  const [selectedSide, setSelectedSide] = useState<'yes' | 'no'>('yes');
  const [tradeAmount, setTradeAmount] = useState<number>(250);

  const fetchMarkets = async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await fetch('/api/markets?source=all&count=40', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Failed to load markets: ${response.status}`);
      }

      const payload = (await response.json()) as { markets?: MarketItem[]; generatedAt?: string };
      const nextMarkets = Array.isArray(payload.markets) && payload.markets.length > 0
        ? payload.markets
        : FALLBACK_MARKETS;

      setMarkets(nextMarkets);
      setSelectedMarketId((current) => {
        if (current && nextMarkets.some((market) => market.id === current)) {
          return current;
        }
        return nextMarkets[0]?.id || '';
      });
      setLastSync(payload.generatedAt || new Date().toISOString());
    } catch (error) {
      console.error('Unable to load markets from API, using fallback data.', error);
      setLoadError(error instanceof Error ? error.message : 'Unable to load markets');
      setMarkets(FALLBACK_MARKETS);
      setSelectedMarketId(FALLBACK_MARKETS[0]?.id || '');
      setLastSync(new Date().toISOString());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMarkets();
  }, []);

  const categories = useMemo(() => ['All', ...Array.from(new Set(markets.map((m) => m.category)))], [markets]);

  const visibleMarkets = useMemo(() => {
    const filtered = markets.filter((market) => {
      const q = query.trim().toLowerCase();
      const queryMatch = q.length === 0
        || market.title.toLowerCase().includes(q)
        || market.subtitle.toLowerCase().includes(q);
      const categoryMatch = category === 'All' || market.category === category;
      const statusMatch = status === 'all' || market.status === status;
      return queryMatch && categoryMatch && statusMatch;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'volume') return b.volume24h - a.volume24h;
      if (sortBy === 'change') return Math.abs(b.change24h) - Math.abs(a.change24h);
      return b.liquidityScore - a.liquidityScore;
    });
  }, [markets, query, category, status, sortBy]);

  const selectedMarket = useMemo(() => {
    const byId = visibleMarkets.find((m) => m.id === selectedMarketId);
    return byId || visibleMarkets[0] || markets[0] || FALLBACK_MARKETS[0];
  }, [selectedMarketId, visibleMarkets, markets]);

  const currentPrice = selectedSide === 'yes' ? selectedMarket?.yesPrice ?? 0 : selectedMarket?.noPrice ?? 0;
  const contracts = currentPrice > 0 ? tradeAmount / currentPrice : 0;
  const grossPayout = contracts;
  const estimatedProfit = Math.max(grossPayout - tradeAmount, 0);

  const watchedCount = Object.values(watchlist).filter(Boolean).length;
  const totalVolume = visibleMarkets.reduce((sum, m) => sum + m.volume24h, 0);

  return (
    <div className="liquid-metal-shell" style={{ minHeight: '100vh', color: '#d3fff6', position: 'relative' }}>
      <div className="liquid-metal-bg" aria-hidden="true" />

      <section style={{ position: 'relative', zIndex: 1, maxWidth: 1320, margin: '0 auto', padding: '2rem 1rem 2.5rem' }}>
        <div className="liquid-glass-panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'grid', gap: '0.8rem', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
            <div>
              <p className="liquid-kpi-label">24H MARKET VOLUME</p>
              <p className="liquid-kpi-value">{formatUsd(totalVolume)}</p>
            </div>
            <div>
              <p className="liquid-kpi-label">ACTIVE MARKETS</p>
              <p className="liquid-kpi-value">{markets.length}</p>
            </div>
            <div>
              <p className="liquid-kpi-label">WATCHLIST</p>
              <p className="liquid-kpi-value">{watchedCount}</p>
            </div>
            <div>
              <p className="liquid-kpi-label">AVG LIQUIDITY SCORE</p>
              <p className="liquid-kpi-value">
                {markets.length > 0
                  ? `${Math.round(markets.reduce((sum, m) => sum + m.liquidityScore, 0) / markets.length)}/100`
                  : '0/100'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.7rem', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.76rem', color: '#88c9bc' }}>
              {isLoading ? 'Syncing market feed...' : `Last sync: ${lastSync ? new Date(lastSync).toLocaleTimeString() : 'n/a'}`}
            </span>
            <button type="button" className="liquid-status-pill" onClick={fetchMarkets} disabled={isLoading}>
              {isLoading ? 'Refreshing...' : 'Refresh Markets'}
            </button>
          </div>

          {loadError && (
            <p style={{ margin: '0.55rem 0 0', fontSize: '0.76rem', color: '#ffd2d2' }}>
              Live market fetch warning: {loadError}. Fallback market set is active.
            </p>
          )}
        </div>

        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(300px, 1fr)' }}>
          <section className="liquid-glass-panel" style={{ padding: '1rem' }}>
            <div style={{ display: 'grid', gap: '0.7rem', marginBottom: '0.9rem' }}>
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search events, assets, topics, or resolution sources..."
                className="liquid-input"
              />

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {categories.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item as 'All' | MarketCategory)}
                    className={`liquid-chip ${category === item ? 'active' : ''}`}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.55rem' }}>
                {[
                  { label: 'All', value: 'all' },
                  { label: 'Live', value: 'live' },
                  { label: 'New', value: 'new' },
                  { label: 'Closing Soon', value: 'closing-soon' },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setStatus(item.value as 'all' | MarketStatus)}
                    className={`liquid-status-pill ${status === item.value ? 'active' : ''}`}
                  >
                    {item.label}
                  </button>
                ))}

                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as 'volume' | 'change' | 'liquidity')}
                  className="liquid-select"
                >
                  <option value="volume">Sort: 24h volume</option>
                  <option value="change">Sort: biggest move</option>
                  <option value="liquidity">Sort: liquidity</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {visibleMarkets.map((market) => {
                const selected = selectedMarket?.id === market.id;
                const yesPercent = Math.round(market.yesPrice * 100);
                const noPercent = 100 - yesPercent;

                return (
                  <article
                    key={market.id}
                    className={`liquid-market-card ${selected ? 'selected' : ''}`}
                    onClick={() => setSelectedMarketId(market.id)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.65rem', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1rem', color: '#dcfff9' }}>{market.title}</h3>
                        <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: '#8ed4c7' }}>{market.subtitle}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setWatchlist((previous) => ({ ...previous, [market.id]: !previous[market.id] }));
                        }}
                        className={`liquid-watch ${watchlist[market.id] ? 'active' : ''}`}
                        aria-label={`Toggle ${market.title} in watchlist`}
                      >
                        ★
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.55rem', marginTop: '0.65rem' }}>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedMarketId(market.id);
                          setSelectedSide('yes');
                        }}
                        className="liquid-trade-btn yes"
                      >
                        YES {yesPercent}c
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedMarketId(market.id);
                          setSelectedSide('no');
                        }}
                        className="liquid-trade-btn no"
                      >
                        NO {noPercent}c
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.4rem', marginTop: '0.7rem' }}>
                      <div className="liquid-metric">
                        <span>24H VOL</span>
                        <strong>{formatUsd(market.volume24h)}</strong>
                      </div>
                      <div className="liquid-metric">
                        <span>OI</span>
                        <strong>{formatUsd(market.openInterest)}</strong>
                      </div>
                      <div className="liquid-metric">
                        <span>MOVE</span>
                        <strong style={{ color: market.change24h >= 0 ? '#8afbc4' : '#98c8ff' }}>
                          {market.change24h >= 0 ? '+' : ''}{formatPercent(market.change24h)}
                        </strong>
                      </div>
                      <div className="liquid-metric">
                        <span>TIME</span>
                        <strong>{formatCloseIn(market.closeAt)}</strong>
                      </div>
                    </div>

                    <div style={{ marginTop: '0.6rem' }}>
                      <div className="liquid-liquidity-track">
                        <div className="liquid-liquidity-fill" style={{ width: `${market.liquidityScore}%` }} />
                      </div>
                    </div>
                  </article>
                );
              })}

              {visibleMarkets.length === 0 && (
                <div className="liquid-empty-state">
                  No markets match your current filters.
                </div>
              )}
            </div>
          </section>

          <aside className="liquid-glass-panel" style={{ padding: '1rem', alignSelf: 'start' }}>
            <h2 style={{ margin: 0, fontSize: '1.06rem', color: '#dcfff9' }}>Trade Ticket</h2>
            <p style={{ margin: '0.4rem 0 0.8rem', color: '#8dd4c6', fontSize: '0.83rem' }}>
              Simulated order workflow similar to event contract UX.
            </p>

            <div className="liquid-ticket-block">
              <p style={{ margin: 0, color: '#90cfc3', fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Selected Event
              </p>
              <p style={{ margin: '0.35rem 0 0', color: '#d9fff8', fontWeight: 700 }}>{selectedMarket?.title || 'No market selected'}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.7rem' }}>
              <button
                type="button"
                className={`liquid-side-btn ${selectedSide === 'yes' ? 'active-yes' : ''}`}
                onClick={() => setSelectedSide('yes')}
              >
                Buy YES
              </button>
              <button
                type="button"
                className={`liquid-side-btn ${selectedSide === 'no' ? 'active-no' : ''}`}
                onClick={() => setSelectedSide('no')}
              >
                Buy NO
              </button>
            </div>

            <label style={{ display: 'grid', gap: '0.4rem', marginTop: '0.8rem', color: '#a9ddd4', fontSize: '0.82rem' }}>
              Order size (USD)
              <input
                type="range"
                min={25}
                max={2500}
                step={25}
                value={tradeAmount}
                onChange={(event) => setTradeAmount(Number(event.target.value))}
                className="liquid-range"
              />
              <input
                type="number"
                min={1}
                value={tradeAmount}
                onChange={(event) => setTradeAmount(Math.max(Number(event.target.value) || 0, 1))}
                className="liquid-input"
              />
            </label>

            <div className="liquid-ticket-block" style={{ marginTop: '0.8rem' }}>
              <div className="liquid-ticket-row"><span>Entry price</span><strong>{(currentPrice * 100).toFixed(1)}c</strong></div>
              <div className="liquid-ticket-row"><span>Contracts</span><strong>{contracts.toFixed(2)}</strong></div>
              <div className="liquid-ticket-row"><span>Max payout</span><strong>{formatUsd(grossPayout)}</strong></div>
              <div className="liquid-ticket-row"><span>Est. profit</span><strong>{formatUsd(estimatedProfit)}</strong></div>
            </div>

            <button type="button" className="liquid-place-order-btn" style={{ marginTop: '0.8rem' }}>
              Place Simulated Order
            </button>

            <div className="liquid-ticket-block" style={{ marginTop: '0.95rem' }}>
              <p style={{ margin: 0, color: '#90cfc3', fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Open Positions
              </p>
              <div className="liquid-ticket-row"><span>Crypto basket PnL</span><strong style={{ color: '#8afbc4' }}>+$2,484</strong></div>
              <div className="liquid-ticket-row"><span>Macro basket PnL</span><strong style={{ color: '#98c8ff' }}>-$610</strong></div>
              <div className="liquid-ticket-row"><span>Win rate (30d)</span><strong>63.4%</strong></div>
            </div>

            <div className="liquid-ticket-block" style={{ marginTop: '0.75rem' }}>
              <p style={{ margin: 0, color: '#90cfc3', fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Activity Feed
              </p>
              <p style={{ margin: '0.48rem 0 0', color: '#d8fff8', fontSize: '0.84rem' }}>Large sweep: YES on SUI {'>'} $4.50 (+$82K)</p>
              <p style={{ margin: '0.42rem 0 0', color: '#d8fff8', fontSize: '0.84rem' }}>Market maker tightened spread to 2c on CPI event</p>
              <p style={{ margin: '0.42rem 0 0', color: '#d8fff8', fontSize: '0.84rem' }}>Alert: Fed event market moved +3.1% in 15m</p>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}