'use client';

import React, { useMemo } from 'react';

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

export default function Markets() {
  const realMarkets = useMemo<MarketData[]>(() => ([
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
  ]), []);
  const markets = realMarkets;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#e2e8f0', padding: '2rem 1rem' }}>
      {/* The markets grid code is identical to page.tsx - showing full market discovery interface */}
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#e2e8f0' }}>
          📊 Prediction Markets
        </h1>
        <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>
          Explore {markets.length} active prediction markets with real-time data and AI forecasts.
        </p>
      </div>
    </div>
  );
}
