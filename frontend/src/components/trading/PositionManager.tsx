import React, { useState } from 'react';

interface Position {
  marketId: string;
  outcome: 'yes' | 'no';
  size: number;
  entryPrice: number;
  currentPrice: number;
}

interface PositionManagerProps {
  marketId: string;
  yesPrice: number;
  noPrice: number;
  onDeposit: (amount: number) => Promise<void>;
  onRedeem: (marketId: string, outcome: 'yes' | 'no', amount: number) => Promise<void>;
}

/**
 * Position Manager Component
 * Shows current positions with P&L and deposit/redeem flows
 */
export const PositionManager: React.FC<PositionManagerProps> = ({
  marketId,
  yesPrice,
  noPrice,
  onDeposit,
  onRedeem,
}) => {
  // Current position state
  const [position, setPosition] = useState<{
    outcome: 'yes' | 'no';
    size: number;
    entryPrice: number;
  } | null>(null);

  // Deposit amount
  const [depositAmount, setDepositAmount] = useState('');
  
  // Redeem amount
  const [redeemAmount, setRedeemAmount] = useState('');

  // Calculate unrealized P&L
  const calculatePnL = (entryPrice: number, currentPrice: number, size: number): number => {
    const priceDiff = currentPrice - entryPrice;
    return size * priceDiff * 1000; // Convert to SUI units
  };

  const pnl = position ? calculatePnL(position.entryPrice, position ? position.entryPrice : yesPrice, position?.size || 0) : 0;

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Handle deposit
  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) return;
    
    try {
      await onDeposit(amount);
      setDepositAmount('');
      // Update position size
      setPosition(prev => prev ? { ...prev, size: prev.size + amount } : null);
    } catch (error) {
      console.error('Deposit failed:', error);
      alert('Deposit failed. Please try again.');
    }
  };

  // Handle redeem
  const handleRedeem = async () => {
    const amount = parseFloat(redeemAmount);
    if (isNaN(amount) || amount <= 0) return;
    
    try {
      await onRedeem(marketId, position?.outcome || 'yes', amount);
      setRedeemAmount('');
      // Update position size
      setPosition(prev => prev ? { ...prev, size: prev.size - amount } : null);
    } catch (error) {
      console.error('Redeem failed:', error);
      alert('Redeem failed. Please try again.');
    }
  };

  // P&L color and formatting
  const pnlColor = pnl >= 0 ? 'text-green-600' : 'text-red-600';
  const pnlSign = pnl >= 0 ? '+' : '';

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-900">Your Position</h3>
        {position && (
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${pnl >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            P&L: {pnlSign}{formatCurrency(pnl)} SUI
          </span>
        )}
      </div>

      {/* Current Position Display */}
      <div className="mb-6">
        {!position ? (
          // No Position State
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <p className="text-gray-500 mb-4">No active position</p>
            <div className="grid grid-cols-2 gap-4 text-center">
              <button
                onClick={() => setPosition({ outcome: 'yes', size: 100, entryPrice: yesPrice })}
                className="px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
              >
                Open YES Position
              </button>
              <button
                onClick={() => setPosition({ outcome: 'no', size: 100, entryPrice: noPrice })}
                className="px-4 py-3 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
              >
                Open NO Position
              </button>
            </div>
          </div>
        ) : (
          // Active Position State
          <div className="space-y-4">
            {/* Position Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Position Type:</span>
                <span className={`font-bold ${position.outcome === 'yes' ? 'text-green-600' : 'text-red-600'}`}>
                  {position.outcome.toUpperCase()} Position
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Entry Price:</span>
                <span className="font-medium">{formatCurrency(position.entryPrice)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Current Position Size:</span>
                <span className="font-bold text-lg">
                  {formatCurrency(position.size)} SUI
                </span>
              </div>
            </div>

            {/* P&L Display */}
            {pnl !== 0 && (
              <div className={`text-center py-3 rounded-lg ${pnl >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                <span className="font-bold text-lg">
                  {pnlSign}{formatCurrency(pnl)} SUI
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Deposit Flow */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="font-semibold text-gray-900 mb-3">Deposit Stake</h4>
        <div className="flex gap-3">
          <input
            type="number"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            placeholder="Amount (SUI)"
            min="0.1"
            step="0.1"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleDeposit}
            disabled={!depositAmount || parseFloat(depositAmount) <= 0}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
          >
            Deposit
          </button>
        </div>
      </div>

      {/* Redeem Flow */}
      {position && (
        <div className="border-t border-gray-200 pt-4">
          <h4 className="font-semibold text-gray-900 mb-3">Redeem Position</h4>
          <div className="flex gap-3">
            <input
              type="number"
              value={redeemAmount}
              onChange={(e) => setRedeemAmount(e.target.value)}
              placeholder={`Max: ${formatCurrency(position.size)} SUI`}
              min="0.1"
              step="0.1"
              max={position.size}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleRedeem}
              disabled={!redeemAmount || parseFloat(redeemAmount) <= 0}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
            >
              Redeem
            </button>
          </div>

          {/* Quick redeem buttons */}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setRedeemAmount(position.size.toString())}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
            >
              Redeem All
            </button>
            <button
              onClick={() => setRedeemAmount((position.size * 0.5).toString())}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
            >
              Redeem 50%
            </button>
          </div>
        </div>
      )}

      {/* Position Limits Warning */}
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
        <strong>Position Limit:</strong> Maximum $50,000 per market (configurable in admin settings)
      </div>
    </div>
  );
};

export default PositionManager;
