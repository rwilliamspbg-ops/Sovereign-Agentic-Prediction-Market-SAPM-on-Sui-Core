'use client';

import React from 'react';
import MarketList from '@/components/markets/MarketList';

const mockMarkets = [
  {
    id: 'BTC_100K_2026',
    question: 'Will Bitcoin reach $100K in 2026?',
    yesPrice: 0.72,
    noPrice: 0.28,
    yesVolume: 150000,
    noVolume: 80000,
    lastUpdate: new Date(),
    category: 'Crypto',
    resolutionStatus: 'pending' as const,
  },
  {
    id: 'SUI_DAU_2026',
    question: 'Will Sui reach 1M daily active users in 2026?',
    yesPrice: 0.55,
    noPrice: 0.45,
    yesVolume: 60000,
    noVolume: 100000,
    lastUpdate: new Date(),
    category: 'Technology',
  },
];

export default function PaletteTestPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto bg-slate-900 min-h-screen">
      <h1 className="text-2xl font-bold text-white mb-6">Palette MarketList Verification</h1>
      <MarketList markets={mockMarkets} onTrade={() => {}} />
    </div>
  );
}
