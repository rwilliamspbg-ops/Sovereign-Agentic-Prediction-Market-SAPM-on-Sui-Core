import React, { useState, useMemo } from 'react';
import { MarketCard } from './MarketCard';
import { MagnifyingGlassIcon } from '@heroicons/react/24/solid';

interface MarketData {
  id: string;
  question: string;
  yesPrice: number;
  noPrice: number;
  yesVolume: number;
  noVolume: number;
  lastUpdate: Date;
  category?: string;
  resolutionStatus?: 'pending' | 'resolved';
}

interface MarketListProps {
  markets: MarketData[];
  onTrade: (marketId: string, outcome: 'yes' | 'no') => void;
  agentEdge?: Record<string, number>; // Map of marketId to edge score
}

/**
 * Market List Component
 * Grid layout for market cards with filter/sort controls
 */
export const MarketList: React.FC<MarketListProps> = ({
  markets,
  onTrade,
  agentEdge = {}
}) => {
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'volume' | 'edge'>('newest');

  // Extract unique categories
  const categories = useMemo(() => {
    return Array.from(new Set(markets.map(m => m.category).filter((value): value is string => Boolean(value))));
  }, [markets]);

  // Filter and sort markets
  const filteredAndSortedMarkets = useMemo(() => {
    return markets
      .filter(market => {
        // Search filter
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          return (
            market.question.toLowerCase().includes(searchLower) ||
            market.id.toLowerCase().includes(searchLower)
          );
        }
        return true;
      })
      .filter(market => {
        // Category filter
        if (selectedCategory) {
          return market.category === selectedCategory;
        }
        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'newest':
            return new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime();
          case 'volume':
            const aVol = a.yesVolume + a.noVolume;
            const bVol = b.yesVolume + b.noVolume;
            return bVol - aVol;
          case 'edge':
            const aEdge = agentEdge[a.id] || 0;
            const bEdge = agentEdge[b.id] || 0;
            return bEdge - aEdge;
          default:
            return 0;
        }
      });
  }, [markets, searchTerm, selectedCategory, sortBy, agentEdge]);

  // Get agent edge for a market
  const getAgentEdge = (marketId: string): number => {
    return agentEdge[marketId] || 0;
  };

  return (
    <div className="space-y-4">
      {/* Filter and Sort Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search markets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === null
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Sort Controls */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="newest">Newest First</option>
            <option value="volume">Highest Volume</option>
            {Object.values(agentEdge).some((edge) => edge > 0.3) && (
              <option value="edge">AI Edge</option>
            )}
          </select>

          {/* Results Count */}
          <span className="text-sm text-gray-500">
            {filteredAndSortedMarkets.length} markets
          </span>
        </div>
      </div>

      {/* Market Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredAndSortedMarkets.map(market => (
          <MarketCard
            key={market.id}
            market={market}
            onTrade={onTrade}
            agentEdge={getAgentEdge(market.id)}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredAndSortedMarkets.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.53 16.122a8 8 0 00-1.53-.279m4.53 0V10m-1.53 0a8 8 0 10-1.47 9.44" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No markets found</h3>
          <p className="mt-2 text-sm text-gray-500">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}

      {/* Loading State */}
      {markets.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-block animate-pulse text-gray-400">
            <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">Loading markets...</h3>
          <p className="mt-2 text-sm text-gray-500">
            Connecting to DeepBook data feed
          </p>
        </div>
      )}
    </div>
  );
};

export default MarketList;
