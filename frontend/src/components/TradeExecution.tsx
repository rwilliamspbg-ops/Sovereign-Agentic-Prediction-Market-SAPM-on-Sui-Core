'use client';

import React, { useState, useEffect } from 'react';

interface TradeRequest {
  marketId: string;
  side: 'yes' | 'no';
  amount: number;
  timestamp: Date;
}

interface TradeResult {
  id: string;
  status: 'pending' | 'success' | 'error';
  marketId: string;
  side: 'yes' | 'no';
  amount: number;
  executionPrice: number;
  totalCost: number;
  position: number;
  transactionHash?: string;
  timestamp: Date;
  error?: string;
}

interface TradeHistory {
  [marketId: string]: TradeResult[];
}

export function useTradeExecution() {
  const [tradeHistory, setTradeHistory] = useState<TradeHistory>({});
  const [positions, setPositions] = useState<Record<string, { yes: number; no: number }>>({});
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'success' | 'error' | 'info' }>>([]);

  const executeTrade = async (trade: TradeRequest): Promise<TradeResult> => {
    const tradeId = `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const result: TradeResult = {
      id: tradeId,
      status: 'pending',
      ...trade,
      executionPrice: trade.side === 'yes' ? 0.68 : 0.32, // Simulated prices
      totalCost: trade.side === 'yes' ? trade.amount * 0.68 : trade.amount * 0.32,
      position: trade.amount,
      timestamp: new Date(),
    };

    // Add to history
    setTradeHistory(prev => ({
      ...prev,
      [trade.marketId]: [...(prev[trade.marketId] || []), result],
    }));

    // Update positions
    setPositions(prev => ({
      ...prev,
      [trade.marketId]: {
        yes: (prev[trade.marketId]?.yes || 0) + (trade.side === 'yes' ? trade.amount : 0),
        no: (prev[trade.marketId]?.no || 0) + (trade.side === 'no' ? trade.amount : 0),
      },
    }));

    // Simulate transaction delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mark as success
    const successResult = { ...result, status: 'success' as const, transactionHash: `0x${Math.random().toString(16).substr(2)}` };

    setTradeHistory(prev => ({
      ...prev,
      [trade.marketId]: prev[trade.marketId].map(t => t.id === tradeId ? successResult : t),
    }));

    // Show success toast
    addToast(`Trade executed: ${trade.side.toUpperCase()} ${trade.amount.toFixed(2)} SUI`, 'success');

    return successResult;
  };

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return {
    executeTrade,
    tradeHistory,
    positions,
    toasts,
    addToast,
    removeToast,
  };
}

interface TradeFormProps {
  marketId: string;
  yesPrice: number;
  noPrice: number;
  isWalletConnected: boolean;
  onTradeExecuted?: (result: TradeResult) => void;
  onExecuteTrade: (trade: TradeRequest) => Promise<TradeResult>;
}

export function TradeForm({
  marketId,
  yesPrice,
  noPrice,
  isWalletConnected,
  onTradeExecuted,
  onExecuteTrade,
}: TradeFormProps) {
  const [amount, setAmount] = useState('10');
  const [side, setSide] = useState<'yes' | 'no'>('yes');
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isWalletConnected) {
      setError('Please connect your wallet');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (numAmount > 1000000) {
      setError('Amount exceeds maximum allowed');
      return;
    }

    setIsExecuting(true);
    try {
      const result = await onExecuteTrade({
        marketId,
        side,
        amount: numAmount,
        timestamp: new Date(),
      });

      if (result.status === 'success') {
        setAmount('');
        onTradeExecuted?.(result);
      } else {
        setError('Trade execution failed');
      }
    } catch (err) {
      setError('Trade failed: ' + (err as any).message);
    } finally {
      setIsExecuting(false);
    }
  };

  const price = side === 'yes' ? yesPrice : noPrice;
  const totalCost = parseFloat(amount) * price || 0;

  return (
    <form onSubmit={handleTrade} style={{ padding: '1.5rem', backgroundColor: '#0ea5e922', borderRadius: '0.75rem', border: '1px solid #06b6d4' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', margin: '0 0 1rem 0', color: '#e2e8f0' }}>
        Place Trade
      </h3>

      {/* Amount Input */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ fontSize: '0.875rem', color: '#cbd5e1', fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>
          Amount (SUI)
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount"
          disabled={isExecuting}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #334155',
            borderRadius: '0.375rem',
            fontFamily: 'inherit',
            backgroundColor: '#0f172a',
            color: '#e2e8f0',
            opacity: isExecuting ? 0.6 : 1,
            cursor: isExecuting ? 'not-allowed' : 'text',
          }}
        />
      </div>

      {/* Side Selection */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ fontSize: '0.875rem', color: '#cbd5e1', fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>
          Position
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => setSide('yes')}
            disabled={isExecuting}
            style={{
              padding: '0.75rem',
              border: `2px solid ${side === 'yes' ? '#34d399' : '#334155'}`,
              borderRadius: '0.375rem',
              backgroundColor: side === 'yes' ? '#034e3b' : '#0f172a',
              color: side === 'yes' ? '#34d399' : '#94a3b8',
              fontWeight: '600',
              cursor: isExecuting ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: isExecuting ? 0.6 : 1,
            }}
          >
            ✓ Buy YES @ {yesPrice.toFixed(4)}
          </button>
          <button
            type="button"
            onClick={() => setSide('no')}
            disabled={isExecuting}
            style={{
              padding: '0.75rem',
              border: `2px solid ${side === 'no' ? '#f87171' : '#334155'}`,
              borderRadius: '0.375rem',
              backgroundColor: side === 'no' ? '#7f1d1d' : '#0f172a',
              color: side === 'no' ? '#f87171' : '#94a3b8',
              fontWeight: '600',
              cursor: isExecuting ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: isExecuting ? 0.6 : 1,
            }}
          >
            ✗ Buy NO @ {noPrice.toFixed(4)}
          </button>
        </div>
      </div>

      {/* Trade Summary */}
      {amount && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#0f172a', borderRadius: '0.375rem', border: '1px solid #334155', fontSize: '0.875rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ color: '#94a3b8' }}>Price per share:</span>
            <span style={{ color: '#cbd5e1', fontWeight: '600' }}>{price.toFixed(4)} SUI</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#94a3b8' }}>Total cost:</span>
            <span style={{ color: '#34d399', fontWeight: '600' }}>{totalCost.toFixed(2)} SUI</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#7f1d1d', borderRadius: '0.375rem', border: '1px solid #f87171', color: '#fca5a5', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* Execute Button */}
      <button
        type="submit"
        disabled={isExecuting || !isWalletConnected || !amount}
        style={{
          width: '100%',
          padding: '0.875rem',
          background: isExecuting ? '#64748b' : 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
          color: 'white',
          border: 'none',
          borderRadius: '0.375rem',
          fontWeight: '600',
          cursor: isExecuting || !isWalletConnected || !amount ? 'not-allowed' : 'pointer',
          fontSize: '0.875rem',
          transition: 'all 0.2s',
          boxShadow: isExecuting ? 'none' : '0 4px 12px rgba(6, 182, 212, 0.2)',
          opacity: isExecuting || !isWalletConnected ? 0.6 : 1,
        }}
      >
        {isExecuting ? '⏳ Executing Trade...' : 'Execute Trade'}
      </button>
    </form>
  );
}

interface ToastContainerProps {
  toasts: Array<{ id: string; message: string; type: 'success' | 'error' | 'info' }>;
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div style={{
      position: 'fixed',
      bottom: '1rem',
      right: '1rem',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      maxWidth: '400px',
    }}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          style={{
            padding: '1rem',
            borderRadius: '0.5rem',
            border: '1px solid',
            backgroundColor: toast.type === 'success' ? '#064e3b' : toast.type === 'error' ? '#7f1d1d' : '#0c4a6e',
            borderColor: toast.type === 'success' ? '#34d399' : toast.type === 'error' ? '#f87171' : '#0ea5e9',
            color: toast.type === 'success' ? '#34d399' : toast.type === 'error' ? '#fca5a5' : '#0ea5e9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            animation: 'slideIn 0.3s ease-out',
          }}
        >
          <span>
            {toast.type === 'success' ? '✓ ' : toast.type === 'error' ? '✗ ' : 'ℹ️ '}
            {toast.message}
          </span>
          <button
            onClick={() => onRemove(toast.id)}
            style={{
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              fontSize: '1.25rem',
              marginLeft: '1rem',
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
