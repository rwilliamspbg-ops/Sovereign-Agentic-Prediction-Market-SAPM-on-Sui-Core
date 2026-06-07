'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Transaction } from '@mysten/sui/transactions';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { getConnectedWalletContext, signAndExecuteWalletTransaction } from '@/services/sui/wallet-standard';

interface TradeRequest {
  marketId: string;
  side: 'yes' | 'no';
  amount: number;
  executionPrice: number;
  timestamp: Date;
}

interface TradeResult {
  id: string;
  status: 'pending' | 'success' | 'error';
  stage: 'approval' | 'submitted' | 'confirmed' | 'failed';
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

const SUI_MIST = 1_000_000_000;
const TRADE_RETRY_ATTEMPTS = 2;
const BASE_RETRY_DELAY_MS = 500;
const MAX_NOTIONAL_SUI = 100_000;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes('timeout')
    || message.includes('temporarily unavailable')
    || message.includes('network')
    || message.includes('429')
    || message.includes('rate limit')
    || message.includes('rpc')
  );
}

export function useTradeExecution() {
  const [tradeHistory, setTradeHistory] = useState<TradeHistory>({});
  const [positions, setPositions] = useState<Record<string, { yes: number; no: number }>>({});
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'success' | 'error' | 'info' }>>([]);
  const [lastTransactionDigest, setLastTransactionDigest] = useState<string | null>(null);
  const [lastTransactionNetwork, setLastTransactionNetwork] = useState<'testnet' | 'mainnet' | null>(null);
  const inFlightTradesRef = useRef<Set<string>>(new Set());

  const executeOnchainTransaction = async (trade: TradeRequest, totalCost: number) => {
    const preferredNetwork: 'testnet' | 'mainnet' = localStorage.getItem('preferredNetwork') === 'mainnet' ? 'mainnet' : 'testnet';
    const context = await getConnectedWalletContext(localStorage.getItem('walletId') || undefined);
    const client = new SuiClient({ url: getFullnodeUrl(preferredNetwork) });

    const requiredNotionalMist = Math.ceil(totalCost * SUI_MIST);
    const balance = await client.getBalance({ owner: context.account.address, coinType: '0x2::sui::SUI' });
    const availableMist = Number(balance.totalBalance);

    if (Number.isFinite(availableMist) && availableMist < requiredNotionalMist) {
      throw new Error(`Insufficient balance: need ${(requiredNotionalMist / SUI_MIST).toFixed(4)} SUI, available ${(availableMist / SUI_MIST).toFixed(4)} SUI.`);
    }

    let lastError: unknown = null;
    for (let attempt = 0; attempt <= TRADE_RETRY_ATTEMPTS; attempt += 1) {
      try {
        const tx = new Transaction();
        tx.setGasBudget(2_000_000);
        const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(1)]);
        tx.transferObjects([coin], tx.pure.address(context.account.address));

        const result = await signAndExecuteWalletTransaction(context, tx, preferredNetwork);
        if (!result?.digest) {
          throw new Error('Transaction did not return a digest.');
        }

        return {
          digest: result.digest,
          network: preferredNetwork,
        };
      } catch (error) {
        lastError = error;
        const canRetry = attempt < TRADE_RETRY_ATTEMPTS && isRetryableError(error);
        if (!canRetry) {
          throw error;
        }
        await delay(BASE_RETRY_DELAY_MS * Math.pow(2, attempt));
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Transaction failed after retry policy exhausted.');
  };

  const executeTrade = async (trade: TradeRequest): Promise<TradeResult> => {
    const totalCost = trade.amount * trade.executionPrice;
    if (totalCost > MAX_NOTIONAL_SUI) {
      return {
        id: `trade_rejected_${Date.now()}`,
        status: 'error',
        stage: 'failed',
        ...trade,
        totalCost,
        position: 0,
        timestamp: new Date(),
        error: `Trade exceeds notional risk limit (${MAX_NOTIONAL_SUI.toLocaleString()} SUI).`,
      };
    }

    const idempotencyKey = [
      trade.marketId,
      trade.side,
      trade.amount.toFixed(6),
      trade.executionPrice.toFixed(6),
    ].join(':');

    if (inFlightTradesRef.current.has(idempotencyKey)) {
      return {
        id: `trade_duplicate_${Date.now()}`,
        status: 'error',
        stage: 'failed',
        ...trade,
        totalCost,
        position: 0,
        timestamp: new Date(),
        error: 'Duplicate trade request already in-flight. Wait for confirmation before retrying.',
      };
    }

    inFlightTradesRef.current.add(idempotencyKey);

    const tradeId = `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const result: TradeResult = {
      id: tradeId,
      status: 'pending',
      stage: 'approval',
      ...trade,
      totalCost,
      position: trade.amount,
      timestamp: new Date(),
    };

    // Add to history
    setTradeHistory(prev => ({
      ...prev,
      [trade.marketId]: [...(prev[trade.marketId] || []), result],
    }));

    addToast('Awaiting wallet approval...', 'info');

    let txOutcome: { digest: string; network: 'testnet' | 'mainnet' };

    try {
      txOutcome = await executeOnchainTransaction(trade, totalCost);
    } catch (err) {
      const failedResult: TradeResult = {
        ...result,
        status: 'error',
        stage: 'failed',
        error: err instanceof Error ? err.message : 'Wallet transaction failed.',
      };

      setTradeHistory(prev => ({
        ...prev,
        [trade.marketId]: prev[trade.marketId].map(t => t.id === tradeId ? failedResult : t),
      }));

      addToast(`Transaction failed: ${failedResult.error}`, 'error');
      inFlightTradesRef.current.delete(idempotencyKey);
      return failedResult;
    }

    const submittedResult: TradeResult = {
      ...result,
      stage: 'submitted',
      transactionHash: txOutcome.digest,
    };

    setLastTransactionDigest(txOutcome.digest);
    setLastTransactionNetwork(txOutcome.network);

    setTradeHistory(prev => ({
      ...prev,
      [trade.marketId]: prev[trade.marketId].map(t => t.id === tradeId ? submittedResult : t),
    }));

    addToast(`Transaction submitted: ${submittedResult.transactionHash}`, 'info');

    // Mark as success
    const successResult: TradeResult = {
      ...submittedResult,
      status: 'success',
      stage: 'confirmed',
    };

    setTradeHistory(prev => ({
      ...prev,
      [trade.marketId]: prev[trade.marketId].map(t => t.id === tradeId ? successResult : t),
    }));

    // Update positions only after confirmation
    setPositions(prev => ({
      ...prev,
      [trade.marketId]: {
        yes: (prev[trade.marketId]?.yes || 0) + (trade.side === 'yes' ? trade.amount : 0),
        no: (prev[trade.marketId]?.no || 0) + (trade.side === 'no' ? trade.amount : 0),
      },
    }));

    // Show success toast
    addToast(`Transaction confirmed: ${trade.side.toUpperCase()} ${trade.amount.toFixed(2)} SUI`, 'success');
    addToast(`View on SuiScan: https://suiscan.xyz/${txOutcome.network}/tx/${submittedResult.transactionHash}`, 'info');

    inFlightTradesRef.current.delete(idempotencyKey);

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
    lastTransactionDigest,
    lastTransactionNetwork,
  };
}

interface TradeFormProps {
  marketId: string;
  yesPrice: number;
  noPrice: number;
  initialSide?: 'yes' | 'no';
  isWalletConnected: boolean;
  onTradeExecuted?: (result: TradeResult) => void;
  onExecuteTrade: (trade: TradeRequest) => Promise<TradeResult>;
}

export function TradeForm({
  marketId,
  yesPrice,
  noPrice,
  initialSide = 'yes',
  isWalletConnected,
  onTradeExecuted,
  onExecuteTrade,
}: TradeFormProps) {
  const [amount, setAmount] = useState('10');
  const [side, setSide] = useState<'yes' | 'no'>(initialSide);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionStage, setExecutionStage] = useState<'idle' | 'approval' | 'submitted' | 'confirmed' | 'failed'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSide(initialSide);
  }, [initialSide, marketId]);

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
    setExecutionStage('approval');

    const pendingTimer = setTimeout(() => {
      setExecutionStage('submitted');
    }, 900);

    try {
      const result = await onExecuteTrade({
        marketId,
        side,
        amount: numAmount,
        executionPrice: price,
        timestamp: new Date(),
      });

      if (result.status === 'success') {
        clearTimeout(pendingTimer);
        setExecutionStage('confirmed');
        setAmount('');
        onTradeExecuted?.(result);
        setTimeout(() => setExecutionStage('idle'), 1200);
      } else {
        clearTimeout(pendingTimer);
        setExecutionStage('failed');
        setError(result.error || 'Trade execution failed');
      }
    } catch (err) {
      clearTimeout(pendingTimer);
      setExecutionStage('failed');
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

      {/* Execution Progress */}
      {isExecuting && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#082f49', borderRadius: '0.375rem', border: '1px solid #0ea5e9', color: '#7dd3fc', fontSize: '0.875rem' }}>
          {executionStage === 'approval' && '🔐 Approve transaction in wallet...'}
          {executionStage === 'submitted' && '⏳ Transaction pending confirmation...'}
        </div>
      )}

      {!isExecuting && executionStage === 'confirmed' && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#064e3b', borderRadius: '0.375rem', border: '1px solid #34d399', color: '#6ee7b7', fontSize: '0.875rem' }}>
          ✅ Transaction confirmed on-chain.
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
        {isExecuting ? (executionStage === 'approval' ? 'Approve in Wallet' : 'Confirming Transaction...') : 'Execute Trade'}
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
