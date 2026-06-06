'use client';

import React, { useState } from 'react';

interface MarketData {
  id: string;
  question: string;
  yesPrice: number;
  noPrice: number;
  yesVolume: number;
  noVolume: number;
  category?: string;
}

export default function MarketDiscovery() {
  const [markets] = useState<MarketData[]>([
    {
      id: 'ETH_PRICE_Q4_2026',
      question: 'Will Ethereum surpass $5000 before Q4 2026?',
      yesPrice: 0.72,
      noPrice: 0.28,
      yesVolume: 150000,
      noVolume: 80000,
      category: 'cryptocurrency',
    },
    {
      id: 'NFL_PLAYOFFS_2026',
      question: 'Will the 2026 NFL playoffs be watched by 25M+ viewers?',
      yesPrice: 0.85,
      noPrice: 0.15,
      yesVolume: 200000,
      noVolume: 50000,
      category: 'sports',
    },
    {
      id: 'BTC_HALVING_2028',
      question: 'Will Bitcoin reach $100K in the 2028 halving cycle?',
      yesPrice: 0.58,
      noPrice: 0.42,
      yesVolume: 95000,
      noVolume: 72000,
      category: 'cryptocurrency',
    },
    {
      id: 'AI_REGULATION_2026',
      question: 'Will major AI legislation pass in 2026?',
      yesPrice: 0.45,
      noPrice: 0.55,
      yesVolume: 85000,
      noVolume: 110000,
      category: 'politics',
    },
    {
      id: 'SPACEX_MARS_2030',
      question: 'Will SpaceX land humans on Mars by 2030?',
      yesPrice: 0.38,
      noPrice: 0.62,
      yesVolume: 45000,
      noVolume: 95000,
      category: 'technology',
    },
  ]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '2rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', marginBottom: '0.75rem' }}>
          🎯 Market Discovery
        </h1>
        <p style={{ color: '#666' }}>
          Browse {markets.length} active prediction markets with AI-powered forecasts
        </p>
      </div>

      {/* Markets Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {markets.map(market => (
          <div
            key={market.id}
            style={{
              backgroundColor: 'white',
              borderRadius: '0.75rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              padding: '1.5rem',
              border: '1px solid #e5e7eb',
            }}
          >
            {/* Badge */}
            <div style={{ marginBottom: '1rem' }}>
              <span style={{
                display: 'inline-block',
                backgroundColor: '#dbeafe',
                color: '#1e40af',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.875rem',
                fontWeight: '500',
              }}>
                {market.category || 'General'}
              </span>
            </div>

            {/* Question */}
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', lineHeight: '1.5' }}>
              {market.question}
            </h3>

            {/* YES/NO Prices */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              {/* YES */}
              <div style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '0.5rem',
                padding: '1rem',
                textAlign: 'center',
              }}>
                <div style={{ fontWeight: 'bold', color: '#166534', fontSize: '1.125rem', marginBottom: '0.5rem' }}>
                  YES
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#16a34a', marginBottom: '0.5rem' }}>
                  {market.yesPrice.toFixed(4)} SUI
                </div>
                <div style={{ fontSize: '0.875rem', color: '#4ade80' }}>
                  {(market.yesPrice * 100).toFixed(2)}% Prob.
                </div>
              </div>

              {/* NO */}
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '0.5rem',
                padding: '1rem',
                textAlign: 'center',
              }}>
                <div style={{ fontWeight: 'bold', color: '#7f1d1d', fontSize: '1.125rem', marginBottom: '0.5rem' }}>
                  NO
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc2626', marginBottom: '0.5rem' }}>
                  {market.noPrice.toFixed(4)} SUI
                </div>
                <div style={{ fontSize: '0.875rem', color: '#f87171' }}>
                  {(market.noPrice * 100).toFixed(2)}% Prob.
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              borderTop: '1px solid #f3f4f6',
              paddingTop: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.875rem',
              color: '#666',
            }}>
              <span>Vol: {(market.yesVolume + market.noVolume).toLocaleString()} SUI</span>
              <button style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '600',
              }}>
                Trade
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '0.5rem',
          border: '1px solid #e5e7eb',
        }}>
          <div style={{ color: '#666', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total Volume</div>
          <div style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#16a34a' }}>
            ${(markets.reduce((sum, m) => sum + m.yesVolume + m.noVolume, 0) / 1000).toFixed(1)}k+
          </div>
        </div>
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '0.5rem',
          border: '1px solid #e5e7eb',
        }}>
          <div style={{ color: '#666', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Active Markets</div>
          <div style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#2563eb' }}>
            {markets.length}
          </div>
        </div>
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '0.5rem',
          border: '1px solid #e5e7eb',
        }}>
          <div style={{ color: '#666', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Avg. Trade Size</div>
          <div style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#7c3aed' }}>
            $150
          </div>
        </div>
      </div>
    </div>
  );
}
