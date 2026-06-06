'use client';

import React, { useState, useMemo, useEffect } from 'react';

interface MarketData {
  id: string;
  question: string;
  yesPrice: number;
  noPrice: number;
  yesVolume: number;
  noVolume: number;
  category?: string;
  resolutionDate?: Date;
  aiConfidence?: number;
  aiEdge?: number;
  spread?: number;
  liquidityDepth?: number;
  riskLevel?: 'Low' | 'Medium' | 'High';
  resolutionSource?: string;
  recentTrades?: Array<{ side: 'yes' | 'no'; price: number; size: number; timestamp: Date }>;
  priceHistory?: number[];
  tvl?: number;
  volume24h?: number;
}

export default function MarketDiscovery() {
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize with real market data simulation
  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        setLoading(true);
        // Simulated real market data (in production, this would fetch from Sui RPC)
        const realMarkets: MarketData[] = [
          {
            id: 'SUI_PRICE_2025',
            question: 'Will SUI reach $5 by end of 2025?',
            yesPrice: 0.68,
            noPrice: 0.32,
            yesVolume: 2500000,
            noVolume: 1200000,
            category: 'cryptocurrency',
            resolutionDate: new Date('2025-12-31'),
            aiConfidence: 0.85,
            aiEdge: 0.18,
            spread: 0.02,
            liquidityDepth: 500000,
            riskLevel: 'Low',
            resolutionSource: 'CoinGecko API',
            tvl: 3700000,
            volume24h: 450000,
            recentTrades: [
              { side: 'yes', price: 0.68, size: 50000, timestamp: new Date() },
              { side: 'yes', price: 0.67, size: 35000, timestamp: new Date(Date.now() - 5 * 60000) },
              { side: 'no', price: 0.32, size: 20000, timestamp: new Date(Date.now() - 15 * 60000) },
            ],
            priceHistory: [0.62, 0.63, 0.65, 0.66, 0.67, 0.68],
          },
          {
            id: 'SUI_ADOPTION_2025',
            question: 'Will Sui reach 1M daily active users in 2025?',
            yesPrice: 0.55,
            noPrice: 0.45,
            yesVolume: 1800000,
            noVolume: 1650000,
            category: 'technology',
            resolutionDate: new Date('2025-12-31'),
            aiConfidence: 0.72,
            aiEdge: 0.12,
            spread: 0.03,
            liquidityDepth: 350000,
            riskLevel: 'Medium',
            resolutionSource: 'Sui Network Stats',
            tvl: 2100000,
            volume24h: 280000,
            recentTrades: [
              { side: 'yes', price: 0.55, size: 45000, timestamp: new Date() },
            ],
            priceHistory: [0.50, 0.51, 0.52, 0.54, 0.55, 0.55],
          },
          {
            id: 'ETHEREUM_LAYER2',
            question: 'Will Ethereum Layer 2 TVL exceed $50B by Q3 2025?',
            yesPrice: 0.78,
            noPrice: 0.22,
            yesVolume: 3200000,
            noVolume: 900000,
            category: 'cryptocurrency',
            resolutionDate: new Date('2025-09-30'),
            aiConfidence: 0.88,
            aiEdge: 0.22,
            spread: 0.01,
            liquidityDepth: 600000,
            riskLevel: 'Low',
            resolutionSource: 'DeFiLlama API',
            tvl: 4100000,
            volume24h: 520000,
            recentTrades: [
              { side: 'yes', price: 0.78, size: 75000, timestamp: new Date() },
              { side: 'yes', price: 0.77, size: 60000, timestamp: new Date(Date.now() - 10 * 60000) },
            ],
            priceHistory: [0.72, 0.74, 0.75, 0.76, 0.77, 0.78],
          },
          {
            id: 'BITCOIN_ATH',
            question: 'Will Bitcoin reach new all-time high in 2025?',
            yesPrice: 0.82,
            noPrice: 0.18,
            yesVolume: 5100000,
            noVolume: 1100000,
            category: 'cryptocurrency',
            resolutionDate: new Date('2025-12-31'),
            aiConfidence: 0.91,
            aiEdge: 0.28,
            spread: 0.01,
            liquidityDepth: 800000,
            riskLevel: 'Low',
            resolutionSource: 'CoinMarketCap API',
            tvl: 6200000,
            volume24h: 780000,
            recentTrades: [
              { side: 'yes', price: 0.82, size: 100000, timestamp: new Date() },
              { side: 'yes', price: 0.81, size: 85000, timestamp: new Date(Date.now() - 3 * 60000) },
              { side: 'no', price: 0.18, size: 15000, timestamp: new Date(Date.now() - 20 * 60000) },
            ],
            priceHistory: [0.75, 0.77, 0.79, 0.80, 0.81, 0.82],
          },
          {
            id: 'AI_AGENT_ADOPTION',
            question: 'Will on-chain AI agents control >$10B TVL by 2025?',
            yesPrice: 0.42,
            noPrice: 0.58,
            yesVolume: 1400000,
            noVolume: 1900000,
            category: 'technology',
            resolutionDate: new Date('2025-12-31'),
            aiConfidence: 0.65,
            aiEdge: -0.08,
            spread: 0.05,
            liquidityDepth: 280000,
            riskLevel: 'High',
            resolutionSource: 'On-Chain Analytics',
            tvl: 1600000,
            volume24h: 190000,
            recentTrades: [],
            priceHistory: [0.38, 0.39, 0.40, 0.41, 0.42, 0.42],
          },
          {
            id: 'DEFI_SECURITY',
            question: 'Will major DeFi hack occur in Q1 2025?',
            yesPrice: 0.35,
            noPrice: 0.65,
            yesVolume: 950000,
            noVolume: 1750000,
            category: 'technology',
            resolutionDate: new Date('2025-03-31'),
            aiConfidence: 0.58,
            aiEdge: 0.05,
            spread: 0.08,
            liquidityDepth: 200000,
            riskLevel: 'High',
            resolutionSource: 'CertiK Reports',
            tvl: 1200000,
            volume24h: 140000,
            recentTrades: [],
            priceHistory: [0.32, 0.33, 0.34, 0.34, 0.35, 0.35],
          },
        ];
        setMarkets(realMarkets);
        setError(null);
      } catch (err) {
        setError('Failed to load market data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMarkets();
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'volume' | 'probability' | 'confidence' | 'tvl'>('tvl');
  const [selectedMarket, setSelectedMarket] = useState<MarketData | null>(null);
  const [isWalletConnected] = useState(false);

  const categories = useMemo(() => {
    return Array.from(new Set(markets.map(m => m.category).filter(Boolean)));
  }, [markets]);

  const filteredAndSortedMarkets = useMemo(() => {
    return markets
      .filter(m => {
        if (searchTerm) {
          return m.question.toLowerCase().includes(searchTerm.toLowerCase());
        }
        return true;
      })
      .filter(m => {
        if (selectedCategory) {
          return m.category === selectedCategory;
        }
        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'probability':
            return Math.abs(b.yesPrice - 0.5) - Math.abs(a.yesPrice - 0.5);
          case 'confidence':
            return (b.aiConfidence || 0) - (a.aiConfidence || 0);
          case 'tvl':
            return (b.tvl || 0) - (a.tvl || 0);
          default:
            return (b.volume24h || 0) - (a.volume24h || 0);
        }
      });
  }, [markets, searchTerm, selectedCategory, sortBy]);

  const daysUntilResolution = (date?: Date) => {
    if (!date) return null;
    const days = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 1) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days < 30) return `${days}d`;
    return `${Math.ceil(days / 30)}mo`;
  };

  const getPriceChange = (history?: number[]) => {
    if (!history || history.length < 2) return 0;
    return ((history[history.length - 1] - history[0]) / history[0]) * 100;
  };

  const getRiskColor = (risk?: string) => {
    switch (risk) {
      case 'Low': return '#10b981';
      case 'Medium': return '#f59e0b';
      case 'High': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(0)}k`;
    return `$${num.toFixed(0)}`;
  };

  const totalTVL = filteredAndSortedMarkets.reduce((sum, m) => sum + (m.tvl || 0), 0);
  const total24hVolume = filteredAndSortedMarkets.reduce((sum, m) => sum + (m.volume24h || 0), 0);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚡</div>
          <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>Loading Markets...</div>
          <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.5rem' }}>Connecting to Sui blockchain</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#e2e8f0', padding: '2rem 1rem' }}>
      {/* Filter & Search Bar */}
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        backgroundColor: '#1e293b',
        borderRadius: '0.75rem',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
        padding: '1.5rem',
        marginBottom: '2rem',
        border: '1px solid #334155',
      }}>
        <div style={{ marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder="🔍 Search prediction markets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.875rem 1.25rem',
              fontSize: '1rem',
              border: '1px solid #475569',
              borderRadius: '0.5rem',
              fontFamily: 'inherit',
              backgroundColor: '#0f172a',
              color: '#e2e8f0',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#cbd5e1' }}>
              Category:
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              <button
                onClick={() => setSelectedCategory(null)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '9999px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: selectedCategory === null ? '#0ea5e9' : '#334155',
                  color: selectedCategory === null ? 'white' : '#cbd5e1',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                  transition: 'all 0.2s',
                }}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '9999px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: selectedCategory === cat ? '#0ea5e9' : '#334155',
                    color: selectedCategory === cat ? 'white' : '#cbd5e1',
                    fontWeight: '500',
                    fontSize: '0.875rem',
                    textTransform: 'capitalize',
                    transition: 'all 0.2s',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#cbd5e1' }}>
              Sort By:
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.375rem',
                border: '1px solid #475569',
                marginTop: '0.5rem',
                fontFamily: 'inherit',
                fontSize: '0.875rem',
                backgroundColor: '#0f172a',
                color: '#e2e8f0',
              }}
            >
              <option value="tvl">Highest TVL</option>
              <option value="volume">24h Volume</option>
              <option value="probability">Most Certain</option>
              <option value="confidence">Highest AI Confidence</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#94a3b8' }}>
          Showing {filteredAndSortedMarkets.length} of {markets.length} markets
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {/* Markets Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}>
          {filteredAndSortedMarkets.map(market => {
            const priceChange = getPriceChange(market.priceHistory);
            const daysLeft = daysUntilResolution(market.resolutionDate);
            const isExpiring = market.resolutionDate && (market.resolutionDate.getTime() - Date.now()) < 30 * 24 * 60 * 60 * 1000;

            return (
              <div
                key={market.id}
                onClick={() => setSelectedMarket(market)}
                style={{
                  backgroundColor: '#1e293b',
                  borderRadius: '0.75rem',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
                  padding: '1.5rem',
                  border: '1px solid #334155',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  transform: 'translateY(0)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 20px 25px rgba(6, 182, 212, 0.2), 0 4px 6px rgba(0, 0, 0, 0.3)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.borderColor = '#06b6d4';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = '#334155';
                }}
              >
                {/* Header with Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <span style={{
                    display: 'inline-block',
                    backgroundColor: '#0ea5e933',
                    color: '#06b6d4',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    textTransform: 'capitalize',
                    border: '1px solid #06b6d4',
                  }}>
                    {market.category || 'General'}
                  </span>
                  {market.aiEdge && market.aiEdge > 0.1 && (
                    <span style={{
                      backgroundColor: '#10b98133',
                      color: '#34d399',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      border: '1px solid #34d399',
                    }}>
                      🎯 +{(market.aiEdge * 100).toFixed(0)}%
                    </span>
                  )}
                </div>

                {/* Question */}
                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', lineHeight: '1.5', minHeight: '2.5rem', color: '#e2e8f0' }}>
                  {market.question}
                </h3>

                {/* AI Confidence */}
                {market.aiConfidence && (
                  <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#0f172a', borderRadius: '0.375rem', border: '1px solid #334155' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8', marginBottom: '0.25rem' }}>
                      AI Confidence: {(market.aiConfidence * 100).toFixed(0)}%
                    </div>
                    <div style={{
                      width: '100%',
                      height: '6px',
                      backgroundColor: '#334155',
                      borderRadius: '9999px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${market.aiConfidence * 100}%`,
                        height: '100%',
                        backgroundColor: market.aiConfidence > 0.75 ? '#34d399' : market.aiConfidence > 0.5 ? '#fbbf24' : '#f87171',
                      }} />
                    </div>
                  </div>
                )}

                {/* YES/NO Prices with Progress Bars */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  {/* YES */}
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#34d399', marginBottom: '0.5rem' }}>YES</div>
                    <div style={{
                      width: '100%',
                      height: '4px',
                      backgroundColor: '#334155',
                      borderRadius: '9999px',
                      marginBottom: '0.5rem',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${market.yesPrice * 100}%`,
                        height: '100%',
                        backgroundColor: '#34d399',
                      }} />
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#86efac', marginBottom: '0.25rem' }}>
                      {market.yesPrice.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6ee7b7' }}>
                      {(market.yesPrice * 100).toFixed(1)}% Prob.
                    </div>
                  </div>

                  {/* NO */}
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#f87171', marginBottom: '0.5rem' }}>NO</div>
                    <div style={{
                      width: '100%',
                      height: '4px',
                      backgroundColor: '#334155',
                      borderRadius: '9999px',
                      marginBottom: '0.5rem',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${market.noPrice * 100}%`,
                        height: '100%',
                        backgroundColor: '#f87171',
                      }} />
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#fca5a5', marginBottom: '0.25rem' }}>
                      {market.noPrice.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#fb7185' }}>
                      {(market.noPrice * 100).toFixed(1)}% Prob.
                    </div>
                  </div>
                </div>

                {/* Market Metrics */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                  fontSize: '0.75rem',
                  color: '#94a3b8',
                }}>
                  <div>
                    <div style={{ fontWeight: '600', color: '#cbd5e1' }}>TVL: {formatNumber(market.tvl || 0)}</div>
                    <div>Vol: {formatNumber(market.volume24h || 0)}/24h</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '600', color: priceChange > 0 ? '#34d399' : priceChange < 0 ? '#f87171' : '#94a3b8' }}>
                      {priceChange > 0 ? '📈' : priceChange < 0 ? '📉' : '→'} {Math.abs(priceChange).toFixed(1)}%
                    </div>
                    {daysLeft && <div style={{ color: isExpiring ? '#f87171' : '#94a3b8' }}>
                      {isExpiring ? '⏰' : '📅'} {daysLeft}
                    </div>}
                  </div>
                </div>

                {/* Risk & Resolution */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '1rem',
                  borderTop: '1px solid #334155',
                }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {market.riskLevel && (
                      <span style={{
                        display: 'inline-block',
                        backgroundColor: getRiskColor(market.riskLevel) + '22',
                        color: getRiskColor(market.riskLevel),
                        padding: '0.25rem 0.75rem',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        border: `1px solid ${getRiskColor(market.riskLevel)}`,
                      }}>
                        {market.riskLevel}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMarket(market);
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
                      color: 'white',
                      padding: '0.5rem 1rem',
                      borderRadius: '0.375rem',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 12px rgba(6, 182, 212, 0.5)'}
                    onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                  >
                    Trade
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Stats Section */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}>
          <div style={{
            backgroundColor: '#1e293b',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            border: '1px solid #334155',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
          }}>
            <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total TVL</div>
            <div style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#34d399' }}>
              {formatNumber(totalTVL)}
            </div>
          </div>
          <div style={{
            backgroundColor: '#1e293b',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            border: '1px solid #334155',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
          }}>
            <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>24h Volume</div>
            <div style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#0ea5e9' }}>
              {formatNumber(total24hVolume)}
            </div>
          </div>
          <div style={{
            backgroundColor: '#1e293b',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            border: '1px solid #334155',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
          }}>
            <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Active Markets</div>
            <div style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#a78bfa' }}>
              {filteredAndSortedMarkets.length}
            </div>
          </div>
        </div>
      </div>

      {/* Market Detail Modal */}
      {selectedMarket && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            backgroundColor: '#1e293b',
            borderRadius: '1rem',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
            border: '1px solid #334155',
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #334155',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}>
              <div>
                <span style={{
                  display: 'inline-block',
                  backgroundColor: '#0ea5e933',
                  color: '#06b6d4',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '9999px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  textTransform: 'capitalize',
                  marginBottom: '0.75rem',
                  border: '1px solid #06b6d4',
                }}>
                  {selectedMarket.category || 'General'}
                </span>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0', marginTop: '0.5rem', lineHeight: '1.5', color: '#e2e8f0' }}>
                  {selectedMarket.question}
                </h2>
              </div>
              <button
                onClick={() => setSelectedMarket(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#94a3b8',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '1.5rem' }}>
              {/* AI Confidence */}
              {selectedMarket.aiConfidence && (
                <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#0f172a', borderRadius: '0.5rem', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#34d399', marginBottom: '0.5rem' }}>
                    AI Agent Forecast
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        width: '100%',
                        height: '8px',
                        backgroundColor: '#334155',
                        borderRadius: '9999px',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${selectedMarket.aiConfidence * 100}%`,
                          height: '100%',
                          backgroundColor: '#34d399',
                        }} />
                      </div>
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#34d399' }}>
                      {(selectedMarket.aiConfidence * 100).toFixed(0)}%
                    </div>
                  </div>
                  {selectedMarket.aiEdge && (
                    <div style={{ fontSize: '0.875rem', color: '#6ee7b7', marginTop: '0.5rem' }}>
                      {selectedMarket.aiEdge > 0 ? '📈 Edge +' : '📉 Edge '}{(selectedMarket.aiEdge * 100).toFixed(1)}% vs consensus
                    </div>
                  )}
                </div>
              )}

              {/* Price Comparison */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#e2e8f0' }}>Current Odds</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {/* YES */}
                  <div style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #34d399',
                    borderRadius: '0.5rem',
                    padding: '1rem',
                  }}>
                    <div style={{ fontWeight: 'bold', color: '#34d399', marginBottom: '0.5rem' }}>YES</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#86efac', marginBottom: '0.5rem' }}>
                      {selectedMarket.yesPrice.toFixed(4)} SUI
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6ee7b7', marginBottom: '0.5rem' }}>
                      {(selectedMarket.yesPrice * 100).toFixed(2)}% Probability
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      Volume: {selectedMarket.yesVolume.toLocaleString()} SUI
                    </div>
                  </div>

                  {/* NO */}
                  <div style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #f87171',
                    borderRadius: '0.5rem',
                    padding: '1rem',
                  }}>
                    <div style={{ fontWeight: 'bold', color: '#f87171', marginBottom: '0.5rem' }}>NO</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fca5a5', marginBottom: '0.5rem' }}>
                      {selectedMarket.noPrice.toFixed(4)} SUI
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#fb7185', marginBottom: '0.5rem' }}>
                      {(selectedMarket.noPrice * 100).toFixed(2)}% Probability
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      Volume: {selectedMarket.noVolume.toLocaleString()} SUI
                    </div>
                  </div>
                </div>
              </div>

              {/* Market Details */}
              <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#0f172a', borderRadius: '0.5rem', border: '1px solid #334155' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#e2e8f0' }}>Market Details</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                  <div>
                    <div style={{ color: '#94a3b8', marginBottom: '0.25rem' }}>Bid-Ask Spread</div>
                    <div style={{ fontWeight: '600', color: '#cbd5e1' }}>{(selectedMarket.spread! * 100).toFixed(2)}%</div>
                  </div>
                  <div>
                    <div style={{ color: '#94a3b8', marginBottom: '0.25rem' }}>Liquidity Depth</div>
                    <div style={{ fontWeight: '600', color: '#cbd5e1' }}>{formatNumber(selectedMarket.liquidityDepth!)}</div>
                  </div>
                  <div>
                    <div style={{ color: '#94a3b8', marginBottom: '0.25rem' }}>TVL</div>
                    <div style={{ fontWeight: '600', color: '#cbd5e1' }}>{formatNumber(selectedMarket.tvl!)}</div>
                  </div>
                  <div>
                    <div style={{ color: '#94a3b8', marginBottom: '0.25rem' }}>Resolution</div>
                    <div style={{ fontWeight: '600', color: '#cbd5e1' }}>
                      {daysUntilResolution(selectedMarket.resolutionDate)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Resolution Source */}
              {selectedMarket.resolutionSource && (
                <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#0ea5e922', borderRadius: '0.5rem', border: '1px solid #06b6d4' }}>
                  <div style={{ fontSize: '0.875rem', color: '#06b6d4', fontWeight: '600', marginBottom: '0.25rem' }}>ℹ️ Resolution Source</div>
                  <div style={{ fontSize: '0.875rem', color: '#22d3ee' }}>{selectedMarket.resolutionSource}</div>
                </div>
              )}

              {/* Recent Trades */}
              {selectedMarket.recentTrades && selectedMarket.recentTrades.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#e2e8f0' }}>Recent Trades</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {selectedMarket.recentTrades.map((trade, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '0.75rem',
                        backgroundColor: '#0f172a',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        border: '1px solid #334155',
                      }}>
                        <div>
                          <span style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '0.25rem',
                            backgroundColor: trade.side === 'yes' ? '#34d399' : '#f87171',
                            color: '#0f172a',
                            fontWeight: '600',
                            marginRight: '0.5rem',
                          }}>
                            {trade.side.toUpperCase()}
                          </span>
                          {trade.size.toLocaleString()} SUI @ {trade.price.toFixed(4)}
                        </div>
                        <div style={{ color: '#94a3b8' }}>
                          {Math.round((Date.now() - trade.timestamp.getTime()) / 60000)}m ago
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trade Form */}
              {isWalletConnected && (
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#0ea5e922',
                  borderRadius: '0.5rem',
                  border: '1px solid #06b6d4',
                }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', margin: '0 0 1rem 0', color: '#e2e8f0' }}>Place Trade</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <input
                      type="number"
                      placeholder="Amount (SUI)"
                      defaultValue={10}
                      style={{
                        padding: '0.75rem',
                        border: '1px solid #334155',
                        borderRadius: '0.375rem',
                        fontFamily: 'inherit',
                        backgroundColor: '#0f172a',
                        color: '#e2e8f0',
                      }}
                    />
                    <select style={{
                      padding: '0.75rem',
                      border: '1px solid #334155',
                      borderRadius: '0.375rem',
                      fontFamily: 'inherit',
                      backgroundColor: '#0f172a',
                      color: '#e2e8f0',
                    }}>
                      <option>Buy YES</option>
                      <option>Buy NO</option>
                    </select>
                  </div>
                  <button style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}>
                    Execute Trade
                  </button>
                </div>
              )}

              {!isWalletConnected && (
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#fbbf2422',
                  borderRadius: '0.5rem',
                  border: '1px solid #fbbf24',
                  textAlign: 'center',
                  fontSize: '0.875rem',
                  color: '#fcd34d',
                }}>
                  Connect your wallet to trade
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
