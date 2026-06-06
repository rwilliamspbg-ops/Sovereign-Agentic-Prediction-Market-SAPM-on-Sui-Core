'use client';

import React, { useState, useEffect } from 'react';

interface WalletState {
  connected: boolean;
  address?: string;
  balance?: number;
}

/**
 * Wallet Connector Component
 * Integrates with Mysten wallet-standard for Sui blockchain
 */
export const WalletConnector: React.FC<{ onConnect?: () => void }> = ({ onConnect }) => {
  const [walletState, setWalletState] = useState<WalletState>({
    connected: false,
    address: undefined,
    balance: undefined,
  });

  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simulate wallet connection (replace with actual wallet-standard integration)
  const handleConnect = async () => {
    try {
      setConnecting(true);
      setError(null);

      // In production: use @mysten/wallet-standard
      /*
      import { createWalletAdapter } from '@mysten/wallet-standard';
      const adapter = createWalletAdapter();
      
      await adapter.request('connect');
      const response = await adapter.request('getAccountBalance', { chainId: 100 });
      */

      // Simulate connection for demo
      setTimeout(() => {
        setWalletState({
          connected: true,
          address: '0x3f9A...7b2C',
          balance: 15.4231,
        });
        setConnecting(false);
        onConnect?.();
      }, 1500);

    } catch (err) {
      setError('Failed to connect wallet. Please try again.');
      console.error('Wallet connection error:', err);
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setWalletState({
      connected: false,
      address: undefined,
      balance: undefined,
    });
  };

  // Format address for display
  const formatAddress = (address?: string): string => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Format balance with SUI symbol
  const formatBalance = (balance?: number): string => {
    if (balance === undefined || balance === null) return '---';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(balance);
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Error Banner */}
      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg shadow-lg animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-sm text-red-800">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Connect/Disconnect Button */}
      <div className={`relative group`}>
        {/* Main button */}
        <button
          onClick={walletState.connected ? handleDisconnect : handleConnect}
          disabled={connecting}
          className={`
            flex items-center gap-3 px-4 py-3 rounded-full shadow-lg transition-all transform hover:scale-105
            ${walletState.connected 
              ? 'bg-gray-800 text-white hover:bg-gray-900' 
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700'
            }
          `}
        >
          {/* Wallet Icon */}
          {walletState.connected ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          )}

          {/* Connection Status */}
          <span className="font-semibold">
            {connecting ? 'Connecting...' : walletState.connected ? 'Disconnect' : 'Connect Wallet'}
          </span>

          {/* Address/Balance Display */}
          {walletState.connected && (
            <div className="hidden md:flex flex-col items-end text-xs">
              <span className="text-gray-300">{formatAddress(walletState.address)}</span>
              <span className="text-green-400 font-medium">{formatBalance(walletState.balance)} SUI</span>
            </div>
          )}
        </button>

        {/* Mobile Balance Display (always visible when connected) */}
        {walletState.connected && (
          <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg hidden md:block">
            <span className="text-sm">Balance:</span>
            <span className="font-bold text-green-400">{formatBalance(walletState.balance)} SUI</span>
          </div>
        )}

        {/* Tooltip */}
        {!walletState.connected && (
          <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Connect to trade markets
          </div>
        )}
      </div>

      {/* Connection Status Indicator */}
      {walletState.connected && (
        <div className="absolute top-full right-0 mt-2 flex items-center gap-1.5 bg-green-500 text-white px-3 py-1.5 rounded-full shadow-lg text-sm font-medium animate-fade-in">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Connected
        </div>
      )}
    </div>
  );
};

export default WalletConnector;
