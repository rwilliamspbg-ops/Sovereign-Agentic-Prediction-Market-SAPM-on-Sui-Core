'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MarketList } from '@/components/markets/MarketList';
import { MarketCard } from '@/components/markets/MarketCard';
import { motion, AnimatePresence } from 'framer-motion';

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
  onTrade: (marketId: string, outcome: 'yes' | 'no') => Promise<void>;
  agentEdge?: Record<string, number>;
}

/**
 * Main Market Discovery Page Component
 * Displays real-time market data with WebSocket updates
 */
export default function MarketDiscovery() {
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<MarketData | null>(null);
  const [agentForecasts, setAgentForecasts] = useState<Map<string, number>>(new Map());
  
  // WebSocket connection state
  const [wsConnected, setWsConnected] = useState(false);
  const [wsLatency, setWsLatency] = useState<number | null>(null);

  /**
   * Fetch initial market data from DeepBook adapter
   */
  const fetchMarkets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Import and use Phase 1 backend adapters
      // In production: import { subscribe } from '@/lib/market-data';
      
      // Mock data for development (replace with real API calls)
      const mockMarkets: MarketData[] = [
        {
          id: 'ETH_PRICE_Q4_2026',
          question: 'Will Ethereum surpass $5000 before Q4 2026?',
          yesPrice: 0.72,
          noPrice: 0.28,
          yesVolume: 150000,
          noVolume: 80000,
          lastUpdate: new Date(),
          category: 'cryptocurrency',
        },
        {
          id: 'NFL_PLAYOFFS_2026',
          question: 'Will the 2026 NFL playoffs be watched by 25M+ viewers?',
          yesPrice: 0.85,
          noPrice: 0.15,
          yesVolume: 200000,
          noVolume: 50000,
          lastUpdate: new Date(),
          category: 'sports',
        },
        {
          id: 'BTC_HALVING_2028',
          question: 'Will Bitcoin reach $100K in the 2028 halving cycle?',
          yesPrice: 0.58,
          noPrice: 0.42,
          yesVolume: 95000,
          noVolume: 72000,
          lastUpdate: new Date(),
          category: 'cryptocurrency',
        },
        {
          id: 'AI_REGULATION_2026',
          question: 'Will major AI legislation pass in 2026?',
          yesPrice: 0.45,
          noPrice: 0.55,
          yesVolume: 85000,
          noVolume: 110000,
          lastUpdate: new Date(),
          category: 'politics',
        },
        {
          id: 'SPACEX_MARS_2030',
          question: 'Will SpaceX land humans on Mars by 2030?',
          yesPrice: 0.38,
          noPrice: 0.62,
          yesVolume: 45000,
          noVolume: 95000,
          lastUpdate: new Date(),
          category: 'technology',
        },
      ];

      setMarkets(mockMarkets);
      
      // Initialize agent forecasts (simulate AI predictions)
      const forecasts = new Map<string, number>();
      mockMarkets.forEach(market => {
        const confidence = Math.random() * 0.4 + 0.6; // 0.6-1.0 confidence
        forecasts.set(market.id, confidence);
      });
      setAgentForecasts(forecasts);

    } catch (err) {
      setError('Failed to load market data. Please check your connection.');
      console.error('Market fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Simulate WebSocket real-time updates
   */
  useEffect(() => {
    // Connect WebSocket in production
    /* 
    const ws = new WebSocket(process.env.NEXT_PUBLIC_DEEPBOOK_WS || '');
    
    ws.onopen = () => {
      setWsConnected(true);
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // Update latency metric
      if (data.type === 'ping') {
        setWsLatency(data.timestamp ? Date.now() - new Date(data.timestamp).getTime() : null);
      }
      
      // Update market prices
      if (data.marketId) {
        const marketIndex = markets.findIndex(m => m.id === data.marketId);
        if (marketIndex !== -1) {
          const updatedMarket = { ...markets[marketIndex] };
          if (data.outcome === 'yes') {
            updatedMarket.yesPrice = Math.min(1, updatedMarket.yesPrice + data.change);
          } else {
            updatedMarket.noPrice = Math.max(0, updatedMarket.noPrice + data.change);
          }
          updatedMarket.lastUpdate = new Date();
          setMarkets(prev => {
            const newMarkets = [...prev];
            newMarkets[marketIndex] = updatedMarket;
            return newMarkets;
          });
        }
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setWsConnected(false);
    };

    ws.onclose = () => {
      setWsConnected(false);
      // Reconnect after 5 seconds
      setTimeout(() => {
        const ws = new WebSocket(process.env.NEXT_PUBLIC_DEEPBOOK_WS || '');
        // Repeat connection logic...
      }, 5000);
    };
    */

    // Simulate occasional updates for demo
    const updateInterval = setInterval(() => {
      if (wsConnected && Math.random() > 0.7) {
        setMarkets(prev => prev.map(market => {
          if (Math.random() > 0.5) {
            return {
              ...market,
              yesPrice: Math.min(1, market.yesPrice + (Math.random() - 0.5) * 0.02),
              noPrice: Math.max(0, 1 - market.yesPrice + (Math.random() - 0.5) * 0.02),
              lastUpdate: new Date(),
            };
          }
          return market;
        }));
      }
    }, 3000);

    return () => {
      clearInterval(updateInterval);
    };
  }, [wsConnected]);

  /**
   * Handle trade execution
   */
  const handleTrade = async (marketId: string, outcome: 'yes' | 'no') => {
    try {
      // In production: call smart contract via Mysten wallet
      // const txHash = await executeTrade(marketId, outcome);
      
      // For demo: simulate trade execution
      console.log(`Trade executed: ${marketId} - ${outcome.toUpperCase()} position`);
      
      // Update UI to show trade was placed
      setMarkets(prev => prev.map(m => {
        if (m.id === marketId) {
          return {
            ...m,
            [`${outcome}Volume`]: m[`${outcome}Volume`] + 0.5,
          };
        }
        return m;
      }));
      
    } catch (err) {
      console.error('Trade execution failed:', err);
      setError('Trade execution failed. Please try again.');
    }
  };

  /**
   * Get agent edge for a market
   */
  const getAgentEdge = useCallback((marketId: string): number => {
    return agentForecasts.get(marketId) || 0;
  }, [agentForecasts]);

  // Format time ago
  const timeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold mb-3"
        >
          🎯 Market Discovery
        </motion.h1>
        <p className="text-gray-600">
          Browse {markets.length} active prediction markets with AI-powered forecasts
        </p>

        {/* WebSocket Status Indicator */}
        <div className="mt-4 flex items-center gap-3">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            wsConnected 
              ? 'bg-green-100 text-green-700' 
              : 'bg-gray-100 text-gray-500'
          }`}>
            <span className={`w-2 h-2 rounded-full mr-2 ${
              wsConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
            }`}></span>
            {wsConnected ? 'Live Data Feed Connected' : 'Data Feed Offline'}
          </span>

          {wsLatency !== null && (
            <span className="text-sm text-gray-500">
              Latency: {wsLatency}ms
            </span>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6"
        >
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        </motion.div>
      )}

      {/* Loading State */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="flex gap-2">
                    <div className="h-8 bg-green-100 rounded w-1/2"></div>
                    <div className="h-8 bg-red-100 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Markets Grid */}
      {!loading && markets.length > 0 && (
        <MarketList
          markets={markets}
          onTrade={handleTrade}
          agentEdge={Object.fromEntries(agentForecasts)}
        />
      )}

      {/* Empty State */}
      {!loading && markets.length === 0 && !error && (
        <div className="text-center py-16">
          <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.53 16.122a8 8 0 00-1.53-.279m4.53 0V10m-1.53 0a8 8 0 10-1.47 9.44" />
          </svg>
          <h3 className="mt-4 text-xl font-medium text-gray-900">No markets available</h3>
          <p className="mt-2 text-gray-500">Check back later for new opportunities</p>
        </div>
      )}

      {/* Market Stats Summary */}
      {!loading && markets.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600">Total Volume</p>
            <p className="text-2xl font-bold text-green-600">
              ${(markets.reduce((sum, m) => 
                sum + m.yesVolume + m.noVolume, 0) / 1000).toFixed(1)}k+
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600">Active Markets</p>
            <p className="text-2xl font-bold text-blue-600">{markets.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600">Avg. Trade Size</p>
            <p className="text-2xl font-bold text-indigo-600">$150</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600">Win Rate (AI)</p>
            <p className="text-2xl font-bold text-purple-600">78%</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
