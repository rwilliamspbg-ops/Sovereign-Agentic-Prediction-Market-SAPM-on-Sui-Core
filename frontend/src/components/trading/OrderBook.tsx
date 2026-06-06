import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface OrderBookLevel {
  price: number;
  size: number;
}

interface OrderBookData {
  bidLevels: OrderBookLevel[];
  askLevels: OrderBookLevel[];
  midPrice: number;
  spread: number;
  totalBidVolume: number;
  totalAskVolume: number;
}

interface OrderBookProps {
  marketId: string;
  onPlaceOrder: (price: number, size: number, side: 'buy' | 'sell') => Promise<void>;
}

/**
 * Order Book Heatmap Component
 * Visualizes bid/ask spread with real-time updates
 */
export const OrderBook: React.FC<OrderBookProps> = ({ marketId, onPlaceOrder }) => {
  // Generate simulated order book depth
  const [orderBook, setOrderBook] = useState<OrderBookData>({
    bidLevels: [],
    askLevels: [],
    midPrice: 0.72,
    spread: 0.04,
    totalBidVolume: 150000,
    totalAskVolume: 80000,
  });

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setOrderBook(prev => {
        const midPriceChange = (Math.random() - 0.5) * 0.01;
        const newMidPrice = Math.max(0.01, Math.min(1, prev.midPrice + midPriceChange));
        
        return {
          ...prev,
          midPrice: newMidPrice,
          spread: Math.max(0.01, prev.spread + (Math.random() - 0.5) * 0.02),
          totalBidVolume: prev.totalBidVolume + (Math.random() - 0.5) * 5000,
          totalAskVolume: prev.totalAskVolume + (Math.random() - 0.5) * 5000,
        };
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Generate price levels (8 bid levels, 8 ask levels)
  useEffect(() => {
    const numLevels = 8;
    const levelsPerSide: OrderBookData['bidLevels'] & OrderBookData['askLevels'] = {
      bidLevels: [],
      askLevels: []
    };

    // Generate bid levels (buy orders - descending prices)
    for (let i = numLevels; i > 0; i--) {
      const priceStep = 0.02;
      const bidPrice = orderBook.midPrice - (i * priceStep);
      const size = Math.floor(Math.random() * 50000) + 10000;
      levelsPerSide.bidLevels.push({ price: bidPrice, size });
    }

    // Generate ask levels (sell orders - ascending prices)
    for (let i = 0; i < numLevels; i++) {
      const priceStep = 0.02;
      const askPrice = orderBook.midPrice + (i * priceStep);
      const size = Math.floor(Math.random() * 50000) + 10000;
      levelsPerSide.askLevels.push({ price: askPrice, size });
    }

    setOrderBook(prev => ({ ...prev, bidLevels: levelsPerSide.bidLevels, askLevels: levelsPerSide.askLevels }));
  }, [orderBook.midPrice]);

  // Format price
  const formatPrice = (price: number): string => {
    return price.toFixed(4);
  };

  // Get color for bid/ask based on distance from mid price
  const getBidColor = (price: number): string => {
    const diff = Math.abs(price - orderBook.midPrice);
    if (diff < 0.02) return 'bg-green-500';
    if (diff < 0.04) return 'bg-green-400';
    return 'bg-green-300';
  };

  const getAskColor = (price: number): string => {
    const diff = Math.abs(price - orderBook.midPrice);
    if (diff < 0.02) return 'bg-red-500';
    if (diff < 0.04) return 'bg-red-400';
    return 'bg-red-300';
  };

  // Calculate max volume for scaling
  const maxVolume = Math.max(
    ...orderBook.bidLevels.map(l => l.size),
    ...orderBook.askLevels.map(l => l.size)
  );

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-900">Order Book</h3>
        <span className="text-sm text-gray-500">Real-time updates</span>
      </div>

      {/* Current Price Display */}
      <div className="text-center mb-6">
        <div className="text-4xl font-bold text-gray-900">
          {formatPrice(orderBook.midPrice)} <span className="text-lg text-gray-500">SUI</span>
        </div>
        <div className="mt-2 flex justify-center gap-6">
          <div className="text-sm">
            <span className="text-gray-500">Spread:</span>
            <span className="font-medium text-gray-700 ml-1">{formatPrice(orderBook.spread)}</span>
          </div>
          <div className="text-sm">
            <span className="text-gray-500">24h Volume:</span>
            <span className="font-medium text-green-600 ml-1">
              {(orderBook.totalBidVolume + orderBook.totalAskVolume / 1000).toFixed(0)}k
            </span>
          </div>
        </div>
      </div>

      {/* Bid/Ask Levels Heatmap */}
      <div className="space-y-2">
        {/* Ask Levels (Sell Orders) */}
        {orderBook.askLevels.map((level, index) => (
          <motion.div
            key={`ask-${index}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            {/* Price */}
            <span className="w-24 text-sm text-gray-600 font-medium">
              {formatPrice(level.price)}
            </span>

            {/* Size Bar */}
            <div className="flex-1 flex items-center gap-2">
              <div className={`h-8 rounded ${getAskColor(level.price)} relative overflow-hidden`}>
                {/* Volume indicator within bar */}
                <div 
                  className="absolute inset-0 bg-black/10"
                  style={{ 
                    width: `${(level.size / maxVolume) * 100}%`,
                    left: 'auto',
                    right: 0
                  }}
                />
              </div>
              <span className="text-sm text-gray-600 w-24">
                {Math.floor(level.size / 1000).toFixed(0)}k
              </span>
            </div>

            {/* Action Button */}
            <button
              onClick={async () => {
                await onPlaceOrder(level.price, 100, 'sell');
              }}
              className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded text-sm font-medium transition-colors"
            >
              Sell
            </button>
          </motion.div>
        ))}

        {/* Mid Price Line */}
        <div className="flex items-center gap-3 py-2">
          <span className="w-24 text-sm text-gray-500 font-bold">—</span>
          <div className="flex-1 flex items-center justify-center">
            <div className="h-px bg-gray-300 w-full"></div>
          </div>
        </div>

        {/* Bid Levels (Buy Orders) */}
        {orderBook.bidLevels.map((level, index) => (
          <motion.div
            key={`bid-${index}`}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            {/* Price */}
            <span className="w-24 text-sm text-gray-600 font-medium">
              {formatPrice(level.price)}
            </span>

            {/* Size Bar */}
            <div className="flex-1 flex items-center gap-2">
              <div className={`h-8 rounded ${getBidColor(level.price)} relative overflow-hidden`}>
                {/* Volume indicator within bar */}
                <div 
                  className="absolute inset-0 bg-black/10"
                  style={{ 
                    width: `${(level.size / maxVolume) * 100}%`,
                    left: 0,
                    right: 'auto'
                  }}
                />
              </div>
              <span className="text-sm text-gray-600 w-24">
                {Math.floor(level.size / 1000).toFixed(0)}k
              </span>
            </div>

            {/* Action Button */}
            <button
              onClick={async () => {
                await onPlaceOrder(level.price, 100, 'buy');
              }}
              className="px-3 py-1 bg-green-50 hover:bg-green-100 text-green-700 rounded text-sm font-medium transition-colors"
            >
              Buy
            </button>
          </motion.div>
        ))}
      </div>

      {/* Order Book Summary */}
      <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-3 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Best Bid:</span>
          <span className="ml-1 font-bold text-green-600">{formatPrice(orderBook.bidLevels[0]?.price || 0)}</span>
        </div>
        <div>
          <span className="text-gray-500">Best Ask:</span>
          <span className="ml-1 font-bold text-red-600">{formatPrice(orderBook.askLevels[0]?.price || 0)}</span>
        </div>
        <div>
          <span className="text-gray-500">Spread:</span>
          <span className="ml-1 font-medium text-orange-600">{formatPrice(orderBook.spread)}</span>
        </div>
      </div>
    </div>
  );
};

export default OrderBook;
