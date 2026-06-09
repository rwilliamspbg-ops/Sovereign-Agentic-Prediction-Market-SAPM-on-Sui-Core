'use client';

import React, { useState, useEffect } from 'react';
import { getWallets } from '@wallet-standard/app';
import { SUI_MAINNET_CHAIN, SUI_TESTNET_CHAIN, isWalletWithRequiredFeatureSet } from '@mysten/wallet-standard';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

interface WalletState {
  connected: boolean;
  address?: string;
  balance?: number;
  walletId?: string;
  walletName?: string;
}

type WalletLike = ReturnType<ReturnType<typeof getWallets>['get']>[number];

const CONNECT_FEATURE = 'standard:connect';
const DISCONNECT_FEATURE = 'standard:disconnect';
const CONNECT_TIMEOUT_MS = 15000;

const LAST_WALLET_ID_KEY = 'sapm:last-wallet-id';
const LAST_WALLET_ADDRESS_KEY = 'sapm:last-wallet-address';
const ROOT_WALLET_ID_KEY = 'walletId';
const ROOT_WALLET_ADDRESS_KEY = 'walletAddress';

function isValidSuiHexAddress(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }
  return /^0x[0-9a-fA-F]{1,64}$/.test(value);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

const suiClient = new SuiClient({
  url: process.env.NEXT_PUBLIC_SUI_RPC || getFullnodeUrl('testnet'),
});

function hasSuiChain(wallet: WalletLike): boolean {
  if (!Array.isArray(wallet.chains)) {
    return false;
  }

  return wallet.chains.includes(SUI_TESTNET_CHAIN)
    || wallet.chains.includes(SUI_MAINNET_CHAIN)
    || wallet.chains.some((chain) => typeof chain === 'string' && chain.startsWith('sui:'));
}

function hasSuiAccountChain(wallet: WalletLike): boolean {
  if (!Array.isArray(wallet.accounts)) {
    return false;
  }

  return wallet.accounts.some((account) => Array.isArray(account.chains)
    && account.chains.some((chain: string) => chain === SUI_TESTNET_CHAIN || chain === SUI_MAINNET_CHAIN || chain.startsWith('sui:')));
}

function hasSuiFeature(wallet: WalletLike): boolean {
  return Object.keys(wallet.features || {}).some((feature) => feature.startsWith('sui:'));
}

function isWalletExtensionConnectTimeoutMessage(input: unknown): boolean {
  const message = typeof input === 'string'
    ? input
    : input instanceof Error
      ? input.message
      : String(input || '');
  const lower = message.toLowerCase();
  return lower.includes('json-rpc: method call timeout')
    || lower.includes('method call timeout calling connect')
    || (lower.includes('timeout') && lower.includes('connect'));
}

function isExtensionOriginStack(input: unknown): boolean {
  const stack = input instanceof Error ? input.stack || '' : String(input || '');
  return stack.toLowerCase().includes('chrome-extension://');
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
    walletId: undefined,
    walletName: undefined,
  });
  const [availableWallets, setAvailableWallets] = useState<WalletLike[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);

  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const discoverWallets = React.useCallback(() => {
    const registry = getWallets();
    const discovered = registry
      .get()
      .filter((wallet) => {
        if (!isWalletWithRequiredFeatureSet(wallet)) {
          return false;
        }

        const hasConnect = typeof (wallet.features?.['standard:connect'] as { connect?: unknown } | undefined)?.connect === 'function';
        return hasConnect && (hasSuiChain(wallet) || hasSuiAccountChain(wallet) || hasSuiFeature(wallet));
      });

    setAvailableWallets(discovered);

    const rememberedWallet = localStorage.getItem(LAST_WALLET_ID_KEY);
    if (rememberedWallet && discovered.some((wallet) => (wallet.id || wallet.name) === rememberedWallet)) {
      setSelectedWalletId(rememberedWallet);
    } else if (!selectedWalletId && discovered.length > 0) {
      setSelectedWalletId(discovered[0].id || discovered[0].name);
    }
  }, [selectedWalletId]);

  const getFriendlyError = (err: unknown): string => {
    const message = err instanceof Error ? err.message.toLowerCase() : '';
    if (
      message.includes('json-rpc: method call timeout')
      || message.includes('method call timeout calling connect')
      || (message.includes('timeout') && message.includes('connect'))
    ) {
      return 'Wallet connection timed out. Unlock/approve the request in your extension, then retry.';
    }
    if (message.includes('insufficient') || message.includes('gas')) {
      return 'Insufficient gas balance. Add SUI to your wallet and retry.';
    }
    if (message.includes('network') || message.includes('timeout') || message.includes('rpc')) {
      return 'Network is busy right now. Please retry in a few seconds.';
    }
    if (message.includes('reject') || message.includes('denied') || message.includes('cancel')) {
      return 'Wallet request was canceled.';
    }
    return 'Failed to connect wallet. Please try again.';
  };

  const fetchBalance = async (address: string): Promise<number> => {
    const result = await suiClient.getBalance({ owner: address });
    return Number(result.totalBalance) / 1_000_000_000;
  };

  const connectToWallet = async (wallet: WalletLike, silent: boolean): Promise<void> => {
    const connectFeature = wallet.features[CONNECT_FEATURE] as
      | {
          connect: (input?: { silent?: boolean }) => Promise<{ accounts: readonly { address: string }[] }>;
        }
      | undefined;

    if (!connectFeature) {
      throw new Error('Selected wallet does not support standard:connect');
    }

    const output = await withTimeout(connectFeature.connect({ silent }), CONNECT_TIMEOUT_MS, 'Wallet connect');
    const accountAddress = output.accounts?.[0]?.address || wallet.accounts?.[0]?.address;

    if (!accountAddress) {
      throw new Error('No wallet account returned from provider');
    }

    if (!isValidSuiHexAddress(accountAddress)) {
      localStorage.removeItem(LAST_WALLET_ID_KEY);
      localStorage.removeItem(LAST_WALLET_ADDRESS_KEY);
      throw new Error(`Selected wallet returned a non-Sui account address: ${accountAddress}`);
    }

    const balance = await fetchBalance(accountAddress);
    const walletIdentifier = wallet.id || wallet.name;

    setWalletState({
      connected: true,
      address: accountAddress,
      balance,
      walletId: walletIdentifier,
      walletName: wallet.name,
    });

    localStorage.setItem(LAST_WALLET_ID_KEY, walletIdentifier);
    localStorage.setItem(LAST_WALLET_ADDRESS_KEY, accountAddress);
    localStorage.setItem(ROOT_WALLET_ID_KEY, walletIdentifier);
    localStorage.setItem(ROOT_WALLET_ADDRESS_KEY, accountAddress);
    window.dispatchEvent(new CustomEvent('sapm:wallet-updated', { detail: { connected: true, address: accountAddress } }));
    onConnect?.();
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);
      setError(null);

      if (availableWallets.length === 0) {
        throw new Error('No Sui wallet found');
      }

      const wallet = availableWallets.find((item) => (item.id || item.name) === selectedWalletId) || availableWallets[0];
      await connectToWallet(wallet, false);
    } catch (err) {
      setError(getFriendlyError(err));
      console.error('Wallet connection error:', err);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    const connectedWallet = availableWallets.find((wallet) => (wallet.id || wallet.name) === walletState.walletId);
    const disconnectFeature = connectedWallet?.features?.[DISCONNECT_FEATURE] as
      | {
          disconnect: () => Promise<void>;
        }
      | undefined;

    if (disconnectFeature) {
      try {
        await disconnectFeature.disconnect();
      } catch (err) {
        console.warn('Wallet disconnect call failed, clearing local state only.', err);
      }
    }

    setWalletState({
      connected: false,
      address: undefined,
      balance: undefined,
      walletId: undefined,
      walletName: undefined,
    });

    localStorage.removeItem(LAST_WALLET_ADDRESS_KEY);
    localStorage.removeItem(LAST_WALLET_ID_KEY);
    localStorage.removeItem(ROOT_WALLET_ID_KEY);
    localStorage.removeItem(ROOT_WALLET_ADDRESS_KEY);
    window.dispatchEvent(new CustomEvent('sapm:wallet-updated', { detail: { connected: false, address: null } }));
  };

  useEffect(() => {
    discoverWallets();

    const registry = getWallets();
    const offRegister = registry.on('register', () => discoverWallets());
    const offUnregister = registry.on('unregister', () => discoverWallets());

    return () => {
      offRegister();
      offUnregister();
    };
  }, [discoverWallets]);

  useEffect(() => {
    const reconnect = async () => {
      const savedWalletId = localStorage.getItem(LAST_WALLET_ID_KEY);
      const savedAddress = localStorage.getItem(LAST_WALLET_ADDRESS_KEY);

      if (!savedWalletId || !savedAddress || availableWallets.length === 0 || walletState.connected) {
        return;
      }

      const wallet = availableWallets.find((item) => (item.id || item.name) === savedWalletId);
      if (!wallet) {
        return;
      }

      try {
        setConnecting(true);
        setSelectedWalletId(savedWalletId);
        await connectToWallet(wallet, true);
      } catch (err) {
        localStorage.removeItem(LAST_WALLET_ID_KEY);
        localStorage.removeItem(LAST_WALLET_ADDRESS_KEY);
        localStorage.removeItem(ROOT_WALLET_ID_KEY);
        localStorage.removeItem(ROOT_WALLET_ADDRESS_KEY);
      } finally {
        setConnecting(false);
      }
    };

    reconnect();
  }, [availableWallets, walletState.connected]);

  useEffect(() => {
    // Keep extension-origin connect timeout noise out of the Next runtime overlay.
    // This error path is handled as a wallet UI error already.
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      if (isWalletExtensionConnectTimeoutMessage(reason) && isExtensionOriginStack(reason)) {
        event.preventDefault();
      }
    };

    const onWindowError = (event: ErrorEvent) => {
      const message = event.message || event.error;
      const source = event.filename || '';
      const extensionSource = source.toLowerCase().includes('chrome-extension://') || isExtensionOriginStack(event.error);
      if (extensionSource && isWalletExtensionConnectTimeoutMessage(message)) {
        event.preventDefault();
      }
    };

    window.addEventListener('unhandledrejection', onUnhandledRejection);
    window.addEventListener('error', onWindowError);

    return () => {
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
      window.removeEventListener('error', onWindowError);
    };
  }, []);

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
        {!walletState.connected && availableWallets.length > 1 && (
          <select
            value={selectedWalletId || ''}
            onChange={(event) => setSelectedWalletId(event.target.value)}
            className="mb-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow"
            aria-label="Select wallet"
          >
            {availableWallets.map((wallet) => {
              const walletId = wallet.id || wallet.name;
              return (
                <option key={walletId} value={walletId}>
                  {wallet.name}
                </option>
              );
            })}
          </select>
        )}

        {/* Main button */}
        <button
          onClick={walletState.connected ? handleDisconnect : handleConnect}
          disabled={connecting}
          className={`
            flex min-h-[44px] items-center gap-3 px-4 py-3 rounded-full shadow-lg transition-all transform hover:scale-105
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
              <span className="text-gray-300">{walletState.walletName}</span>
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
            {availableWallets.length > 0 ? 'Connect to trade markets' : 'Install a Sui wallet extension'}
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
