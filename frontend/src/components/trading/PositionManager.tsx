import React, { useState, useEffect } from 'react';

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
  const PORTFOLIO_BASELINE = 100000;

  // Current position state
  const [position, setPosition] = useState<{
    outcome: 'yes' | 'no';
    size: number;
    entryPrice: number;
    openedAt: Date;
  } | null>(null);

  const [realizedPnl, setRealizedPnl] = useState(0);
  const [slippageTolerance, setSlippageTolerance] = useState(1);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  // Deposit amount
  const [depositAmount, setDepositAmount] = useState('');
  
  // Redeem amount
  const [redeemAmount, setRedeemAmount] = useState('');

  // Calculate unrealized P&L
  const calculatePnL = (entryPrice: number, currentPrice: number, size: number): number => {
    const priceDiff = currentPrice - entryPrice;
    return size * priceDiff * 1000; // Convert to SUI units
  };

  const currentMarketPrice = position?.outcome === 'yes' ? yesPrice : noPrice;
  const unrealizedPnl = position ? calculatePnL(position.entryPrice, currentMarketPrice, position.size) : 0;
  const totalPnl = realizedPnl + unrealizedPnl;

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
      const currentPrice = position?.outcome === 'yes' ? yesPrice : noPrice;

      if (position) {
        const realizedChunk = calculatePnL(position.entryPrice, currentPrice, amount);
        setRealizedPnl((previous) => previous + realizedChunk);
      }

      // Update position size
      setPosition(prev => {
        if (!prev) {
          return null;
        }

        const nextSize = prev.size - amount;
        if (nextSize <= 0) {
          return null;
        }

        return { ...prev, size: nextSize };
      });
    } catch (error) {
      console.error('Redeem failed:', error);
      alert('Redeem failed. Please try again.');
    }
  };

  const handleClosePosition = async () => {
    if (!position) {
      return;
    }

    try {
      await onRedeem(marketId, position.outcome, position.size);
      const currentPrice = position.outcome === 'yes' ? yesPrice : noPrice;
      const realizedChunk = calculatePnL(position.entryPrice, currentPrice, position.size);
      setRealizedPnl((previous) => previous + realizedChunk);
      setPosition(null);
      setRedeemAmount('');
      setShowCloseConfirm(false);
    } catch (error) {
      console.error('Close position failed:', error);
      alert('Close position failed. Please try again.');
    }
  };

  const getPositionAge = (): string => {
    if (!position?.openedAt) {
      return 'N/A';
    }

    const ageMs = Date.now() - position.openedAt.getTime();
    const minutes = Math.floor(ageMs / 60000);
    if (minutes < 60) {
      return `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}h`;
    }

    return `${Math.floor(hours / 24)}d`;
  };

  // P&L color and formatting
  const pnlColor = totalPnl >= 0 ? 'text-green-600' : 'text-red-600';
  const pnlSign = totalPnl >= 0 ? '+' : '';
  const exposure = position ? (position.size / PORTFOLIO_BASELINE) * 100 : 0;
  const isHighRisk = exposure > 20;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-900">Your Position</h3>
        {position && (
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${totalPnl >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            Total P&L: {pnlSign}{formatCurrency(totalPnl)} SUI
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
                onClick={() => setPosition({ outcome: 'yes', size: 100, entryPrice: yesPrice, openedAt: new Date() })}
                className="px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-green-500 text-green-700 font-medium"
              >
                Open YES Position
              </button>
              <button
                onClick={() => setPosition({ outcome: 'no', size: 100, entryPrice: noPrice, openedAt: new Date() })}
                className="px-4 py-3 bg-red-50 hover:bg-red-100 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-red-500 text-red-700 font-medium"
              >
                Open NO Position
              </button>
            </div>
          </div>
        ) : (
          // Active Position State
          <div className="space-y-4">
            {/* Position Info */}
            <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="pb-2 pr-3">Market</th>
                    <th className="pb-2 pr-3">Position</th>
                    <th className="pb-2 pr-3">Size</th>
                    <th className="pb-2 pr-3">Entry</th>
                    <th className="pb-2 pr-3">Current</th>
                    <th className="pb-2 pr-3">Age</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="text-gray-800">
                    <td className="py-1 pr-3 font-medium">{marketId}</td>
                    <td className={`py-1 pr-3 font-semibold ${position.outcome === 'yes' ? 'text-green-600' : 'text-red-600'}`}>
                      {position.outcome.toUpperCase()}
                    </td>
                    <td className="py-1 pr-3 font-medium">{formatCurrency(position.size)} SUI</td>
                    <td className="py-1 pr-3">{formatCurrency(position.entryPrice)}</td>
                    <td className="py-1 pr-3">{formatCurrency(currentMarketPrice)}</td>
                    <td className="py-1 pr-3">{getPositionAge()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {isHighRisk && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                High-risk exposure: {exposure.toFixed(1)}% of portfolio threshold.
              </div>
            )}

            {/* P&L Display */}
            {(unrealizedPnl !== 0 || realizedPnl !== 0) && (
              <div className="grid grid-cols-1 gap-2 rounded-lg bg-slate-50 p-3 text-sm md:grid-cols-3">
                <div>
                  <div className="text-gray-500">Unrealized P&L</div>
                  <div className={`font-semibold ${unrealizedPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(unrealizedPnl >= 0 ? '+' : '') + formatCurrency(unrealizedPnl)} SUI
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Realized P&L</div>
                  <div className={`font-semibold ${realizedPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(realizedPnl >= 0 ? '+' : '') + formatCurrency(realizedPnl)} SUI
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Total P&L</div>
                  <div className={`font-semibold ${pnlColor}`}>
                    {pnlSign}{formatCurrency(totalPnl)} SUI
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowCloseConfirm(true)}
              className="w-full rounded-lg bg-gray-900 px-4 py-2 font-semibold text-white transition-colors hover:bg-black focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-gray-950"
            >
              Close Position
            </button>
          </div>
        )}
      </div>

      {/* Deposit Flow */}
      <div className="border-t border-gray-200 pt-4">
        <label htmlFor="deposit-amount-input" className="block font-semibold text-gray-900 mb-3">
          Deposit Stake
        </label>
        <div className="flex gap-3">
          <input
            id="deposit-amount-input"
            type="number"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            placeholder="Amount (SUI)"
            min="0.1"
            step="0.1"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
          />
          <button
            onClick={handleDeposit}
            disabled={!depositAmount || parseFloat(depositAmount) <= 0}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-blue-500"
          >
            Deposit
          </button>
        </div>
        {/* Quick deposit preset buttons */}
        <div className="mt-2 flex gap-2" role="group" aria-label="Quick deposit amount presets">
          {[10, 50, 100, 500].map((preset) => {
            const isSelected = depositAmount === preset.toString();
            return (
              <button
                key={preset}
                type="button"
                onClick={() => setDepositAmount(preset.toString())}
                aria-pressed={isSelected}
                className={`px-3 py-1 text-sm font-medium rounded-md border transition-all focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                  isSelected
                    ? 'bg-blue-50 border-blue-600 text-blue-700'
                    : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
                aria-label={`Set deposit amount to ${preset} SUI`}
              >
                {preset} SUI
              </button>
            );
          })}
        </div>
      </div>

      {/* Redeem Flow */}
      {position && (
        <div className="border-t border-gray-200 pt-4">
          <label htmlFor="redeem-amount-input" className="block font-semibold text-gray-900 mb-3">
            Redeem Position
          </label>
          <div className="mb-3 rounded-lg bg-gray-50 p-3">
            <div className="mb-1 flex justify-between text-sm text-gray-600">
              <label htmlFor="slippage-tolerance-input" className="font-medium text-gray-600">
                Slippage Tolerance
              </label>
              <span className="font-medium text-gray-800">{slippageTolerance.toFixed(1)}%</span>
            </div>
            <input
              id="slippage-tolerance-input"
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={slippageTolerance}
              onChange={(event) => setSlippageTolerance(parseFloat(event.target.value))}
              className="w-full focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            />
          </div>

          <div className="flex gap-3">
            <input
              id="redeem-amount-input"
              type="number"
              value={redeemAmount}
              onChange={(e) => setRedeemAmount(e.target.value)}
              placeholder={`Max: ${formatCurrency(position.size)} SUI`}
              min="0.1"
              step="0.1"
              max={position.size}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
              aria-label="Redeem amount in SUI"
            />
            <button
              onClick={handleRedeem}
              disabled={!redeemAmount || parseFloat(redeemAmount) <= 0}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-red-500"
            >
              Redeem
            </button>
          </div>

          {/* Quick redeem percentage presets */}
          <div className="mt-3 flex gap-2" role="group" aria-label="Quick redeem percentage presets">
            {[25, 50, 75, 100].map((pct) => {
              const targetAmount = (position.size * (pct / 100)).toString();
              const isSelected = redeemAmount === targetAmount;
              return (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setRedeemAmount(targetAmount)}
                  aria-label={`Redeem ${pct}% (${formatCurrency(position.size * (pct / 100))} SUI)`}
                  aria-pressed={isSelected}
                  className={`flex-1 px-2 py-1.5 rounded-md border text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none ${
                    isSelected
                      ? 'bg-red-50 border-red-500 text-red-700'
                      : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {pct === 100 ? '100% (All)' : `${pct}%`}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Position Limits Warning */}
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
        <strong>Position Limit:</strong> Maximum $50,000 per market (configurable in admin settings)
      </div>

      {/* Close Position Confirmation Modal */}
      {showCloseConfirm && position && <PositionModal onClose={() => setShowCloseConfirm(false)} onConfirm={handleClosePosition} positionOutcome={position.outcome} />}
    </div>
  );
};

const PositionModal: React.FC<{ onClose: () => void; onConfirm: () => void; positionOutcome: 'yes' | 'no' }> = ({
  onClose,
  onConfirm,
  positionOutcome,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={(e) => e.stopPropagation()}>
        <h4 id="modal-title" className="mb-2 text-lg font-semibold text-gray-900">Close Position?</h4>
        <p className="mb-4 text-sm text-gray-600">This will redeem your full {positionOutcome.toUpperCase()} position and realize P&L at current price.</p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2">Cancel</button>
          <button onClick={onConfirm} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2">Confirm Close</button>
        </div>
      </div>
    </div>
  );
};

export default PositionManager;
