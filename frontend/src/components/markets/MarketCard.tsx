import React from 'react';
import { motion } from 'framer-motion';

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

interface MarketCardProps {
  market: MarketData;
  onTrade: (marketId: string, outcome: 'yes' | 'no') => void;
  agentEdge?: number;
}

/**
 * Market Card Component
 * Displays a single market with YES/NO prices and agent edge indicator
 */
export const MarketCard: React.FC<MarketCardProps> = ({
  market,
  onTrade,
  agentEdge = 0
}) => {
  // Format time ago
  const timeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  // Calculate displayed price with 4 decimals for market making
  const formatPrice = (price: number): string => {
    return price.toFixed(4);
  };

  // Format volume
  const formatVolume = (volume: number): string => {
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}k`;
    }
    return volume.toFixed(0);
  };

  // Get risk level based on price imbalance
  const getRiskLevel = (): string => {
    const totalLiquidity = market.yesVolume + market.noVolume;
    if (totalLiquidity === 0) return 'Low';
    
    const yesRatio = market.yesVolume / totalLiquidity;
    const noRatio = market.noVolume / totalLiquidity;
    
    const maxDiff = Math.max(yesRatio, noRatio);
    
    if (maxDiff < 0.4) return 'Low';
    if (maxDiff < 0.6) return 'Medium';
    return 'High';
  };

  // Determine badge color for agent edge
  const getEdgeColor = (): string => {
    if (agentEdge > 0.8) return 'bg-red-500';
    if (agentEdge > 0.6) return 'bg-yellow-500';
    if (agentEdge > 0.4) return 'bg-green-500';
    return 'bg-gray-300';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 hover:shadow-xl transition-shadow cursor-pointer"
      onClick={() => onTrade(market.id, 'yes')}
    >
      {/* Market Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
            {market.category || 'General'}
          </span>
          {market.resolutionStatus && (
            <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${
              market.resolutionStatus === 'resolved' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {market.resolutionStatus === 'resolved' ? 'Resolved' : 'Pending'}
            </span>
          )}
        </div>
        
        {/* Agent Edge Badge */}
        {agentEdge > 0.3 && (
          <div className={`flex items-center gap-1 ${getEdgeColor()} text-white px-2 py-1 rounded-full text-xs font-semibold`}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {(agentEdge * 100).toFixed(0)}% Edge
          </div>
        )}
      </div>

      {/* Market Question */}
      <h3 className="font-semibold text-gray-900 mb-4 leading-tight">
        {market.question}
      </h3>

      {/* YES / NO Prices Side by Side */}
      <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center mb-4">
        {/* YES Outcome */}
        <div 
          className="bg-green-50 border border-green-200 rounded-lg p-3 cursor-pointer hover:bg-green-100 transition-colors group"
          onClick={(e) => {
            e.stopPropagation();
            onTrade(market.id, 'yes');
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-green-700 text-lg">YES</span>
            <span className="text-xs text-green-600">{formatVolume(market.yesVolume)}</span>
          </div>
          <div className="text-2xl font-bold text-green-600">
            {formatPrice(market.yesPrice)} SUI
          </div>
          {/* Implied probability */}
          <div className="text-xs text-green-500 mt-1">
            {(market.yesPrice * 100).toFixed(2)}% Prob.
          </div>
        </div>

        {/* VS Indicator */}
        <div className="flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>

        {/* NO Outcome */}
        <div 
          className="bg-red-50 border border-red-200 rounded-lg p-3 cursor-pointer hover:bg-red-100 transition-colors group"
          onClick={(e) => {
            e.stopPropagation();
            onTrade(market.id, 'no');
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-red-700 text-lg">NO</span>
            <span className="text-xs text-red-600">{formatVolume(market.noVolume)}</span>
          </div>
          <div className="text-2xl font-bold text-red-600">
            {formatPrice(market.noPrice)} SUI
          </div>
          {/* Implied probability */}
          <div className="text-xs text-red-500 mt-1">
            {(market.noPrice * 100).toFixed(2)}% Prob.
          </div>
        </div>
      </div>

      {/* Footer: Risk & Time */}
      <div className="flex justify-between items-center pt-3 border-t border-gray-100">
        <span className={`text-xs font-medium px-2 py-1 rounded ${
          getRiskLevel() === 'High' ? 'bg-orange-100 text-orange-700' :
          getRiskLevel() === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
          'bg-green-100 text-green-700'
        }`}>
          Risk: {getRiskLevel()}
        </span>
        <span className="text-xs text-gray-500">
          Updated {timeAgo(market.lastUpdate)}
        </span>
      </div>

      {/* Hover tooltip for market details */}
      <div className="hidden group-hover:block absolute top-full left-0 right-0 bg-gray-800 text-white text-xs p-2 rounded mt-1 z-10">
        <div className="font-semibold mb-1">Market Details</div>
        <div>ID: {market.id}</div>
        <div>Liquidity: {(market.yesVolume + market.noVolume).toLocaleString()} SUI</div>
        <div>Odds Movement: {(Math.abs(market.yesPrice - market.noPrice)).toFixed(4)} spread</div>
      </div>
    </motion.div>
  );
};

export default MarketCard;
