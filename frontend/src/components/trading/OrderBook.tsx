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
  const MAKER_FEE_BPS = 10;
  const TAKER_FEE_BPS = 30;

  const [selectedSize, setSelectedSize] = useState<number>(100);

  // Generate simulated order book depth
  const [orderBook, setOrderBook] = useState<OrderBookData>({
    bidLevels: [],
    askLevels: [],
    midPrice: 0.72,
    spread: 0.04,
    totalBidVolume: 150000,
    totalAskVolume: 80000,
  });
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

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
    const levelsPerSide: { bidLevels: OrderBookLevel[]; askLevels: OrderBookLevel[] } = {
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

  const handlePlaceOrder = async (price: number, side: 'buy' | 'sell') => {
    const slippage = Math.abs(price - orderBook.midPrice) / Math.max(orderBook.midPrice, 0.0001);
    if (slippage > 0.01) {
      setWarningMessage(`Warning: Estimated slippage ${(slippage * 100).toFixed(2)}% exceeds 1.00%.`);
    } else {
      setWarningMessage(null);
    }

    await onPlaceOrder(price, selectedSize, side);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-900">Order Book</h3>
        <span className="text-sm text-gray-500">Real-time updates</span>
      </div>

      {/* Quick Order Size Presets */}
      <div className="mb-4 flex items-center justify-between gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
        <span className="text-xs font-semibold text-gray-600">Order Size:</span>
        <div role="group" aria-label="Order size presets" className="flex gap-1.5 flex-1 justify-end">
          {[100, 500, 1000, 5000].map((preset) => {
            const isSelected = selectedSize === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => setSelectedSize(preset)}
                aria-label={`Set order size to ${preset} SUI`}
                aria-pressed={isSelected}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none ${
                  isSelected
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {preset} SUI
              </button>
            );
          })}
        </div>
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
                await handlePlaceOrder(level.price, 'sell');
              }}
              className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 focus-visible:outline-none"
              aria-label={`Sell at ${formatPrice(level.price)} SUI`}
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
                await handlePlaceOrder(level.price, 'buy');
              }}
              className="px-3 py-1 bg-green-50 hover:bg-green-100 text-green-700 rounded text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1 focus-visible:outline-none"
              aria-label={`Buy at ${formatPrice(level.price)} SUI`}
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

      {/* Fee and slippage information */}
      <div className="relative group mt-3 grid grid-cols-2 gap-3 text-xs">
        <div
          tabIndex={0}
          className="rounded-lg bg-gray-50 px-3 py-2 text-gray-700 cursor-help transition-all hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          aria-label={`Maker Fee: ${(MAKER_FEE_BPS / 100).toFixed(2)} percent. Tooltip available on hover or focus.`}
        >
          Maker Fee: <span className="font-semibold">{(MAKER_FEE_BPS / 100).toFixed(2)}%</span>
        </div>
        <div
          tabIndex={0}
          className="rounded-lg bg-gray-50 px-3 py-2 text-gray-700 cursor-help transition-all hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          aria-label={`Taker Fee: ${(TAKER_FEE_BPS / 100).toFixed(2)} percent. Tooltip available on hover or focus.`}
        >
          Taker Fee: <span className="font-semibold">{(TAKER_FEE_BPS / 100).toFixed(2)}%</span>
        </div>

        {/* Accessible Keyboard-Bound Tooltip overlay */}
        <div
          className="hidden group-hover:block group-focus-within:block absolute bottom-full left-0 right-0 bg-slate-900 text-slate-100 text-[11px] p-2.5 rounded-lg mb-2 shadow-xl border border-slate-700/60 pointer-events-none"
          role="tooltip"
        >
          <div className="font-bold text-sky-400 mb-0.5">Fee Structure Details</div>
          <div>• <span className="font-medium text-slate-200">Maker:</span> Placed limit orders that add liquidity. ({MAKER_FEE_BPS} bps)</div>
          <div>• <span className="font-medium text-slate-200">Taker:</span> Market orders that match existing orders immediately. ({TAKER_FEE_BPS} bps)</div>
        </div>
      </div>

      {warningMessage && (
        <div className="mt-3 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
          {warningMessage}
        </div>
      )}
    </div>
  );
};

export default OrderBook;
