'use client';

import React, { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CopilotKit } from '@copilotkit/react-core';
import { getWallets } from '@wallet-standard/app';
import { SUI_MAINNET_CHAIN, SUI_TESTNET_CHAIN } from '@mysten/wallet-standard';
import "./globals.css";
import { CommandPalette } from '@/components/ui/CommandPalette';
import { SUI_PACKAGE_ID, SUISCAN_PACKAGE_URL } from '@/lib/sui-config';

type ActiveMarketInsight = {
  id: string;
  question: string;
  yesPrice: number;
  noPrice: number;
  aiConfidence: number;
  spread: number;
  liquidityDepth: number;
  volume24h: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  updatedAt: number;
};

const ACTIVE_MARKET_INSIGHT_KEY = 'sapm.activeMarketInsight';
const LAST_WALLET_ID_KEY = 'walletId';
const LAST_WALLET_ADDRESS_KEY = 'walletAddress';

function isValidSuiHexAddress(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }
  return /^0x[0-9a-fA-F]{1,64}$/.test(value);
}

function hasSuiChain(wallet: { chains?: readonly string[] | undefined }): boolean {
  if (!Array.isArray(wallet.chains)) {
    return false;
  }

  return wallet.chains.includes(SUI_TESTNET_CHAIN) || wallet.chains.includes(SUI_MAINNET_CHAIN);
}

function hasConnectFeature(wallet: { features?: Record<string, unknown> | undefined }): boolean {
  return typeof (wallet.features?.['standard:connect'] as { connect?: unknown } | undefined)?.connect === 'function';
}

function getFirstSuiHexAddress(accounts?: readonly { address: string }[]): string | null {
  if (!accounts || accounts.length === 0) {
    return null;
  }

  const match = accounts.find((account) => isValidSuiHexAddress(account?.address));
  return match?.address || null;
}

function formatWalletDiagnostics(wallet: {
  name?: string;
  accounts?: readonly { address: string }[];
  features?: Record<string, unknown>;
}): string {
  const walletName = wallet.name || 'Unknown wallet';
  const accounts = (wallet.accounts || []).map((account) => account.address).join(', ') || 'none';
  const features = Object.keys(wallet.features || {}).join(', ') || 'none';
  return `Selected wallet: ${walletName}. Accounts: ${accounts}. Features: ${features}.`;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const copilotRuntimeUrl = process.env.NEXT_PUBLIC_COPILOTKIT_RUNTIME_URL || '/api/copilotkit';
  const pathname = usePathname();
  const [walletConnected, setWalletConnected] = React.useState(false);
  const [walletAddress, setWalletAddress] = React.useState<string | null>(null);
  const [showWalletMenu, setShowWalletMenu] = React.useState(false);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [network, setNetwork] = React.useState<'testnet' | 'mainnet'>('testnet');
  const [showNetworkMenu, setShowNetworkMenu] = React.useState(false);
  const [showInsightModal, setShowInsightModal] = React.useState(false);
  const [activeMarketInsight, setActiveMarketInsight] = React.useState<ActiveMarketInsight | null>(null);
  const [availableWallets, setAvailableWallets] = React.useState<ReturnType<ReturnType<typeof getWallets>['get']>>([]);
  const [selectedWalletId, setSelectedWalletId] = React.useState<string>('');
  const [walletError, setWalletError] = React.useState<string | null>(null);

  const NETWORKS = {
    testnet: { label: 'Sui Testnet', color: '#fbbf24', bg: '#78350f', badge: 'TESTNET' },
    mainnet: { label: 'Sui Mainnet', color: '#34d399', bg: '#064e3b', badge: 'MAINNET' },
  };

  // Handle wallet connection
  const handleConnectWallet = async () => {
    setIsConnecting(true);
    setWalletError(null);
    try {
      const liveWallets = getWallets().get();
      const compatibleWallets = liveWallets.filter((wallet) => hasConnectFeature(wallet) && hasSuiChain(wallet));

      if (compatibleWallets.length === 0) {
        throw new Error('No compatible Sui wallet found. Choose a Sui wallet account on testnet/mainnet.');
      }

      const savedWalletId = localStorage.getItem(LAST_WALLET_ID_KEY);
      const wallet = compatibleWallets.find((item) => (item.id || item.name) === selectedWalletId)
        || compatibleWallets.find((item) => (item.id || item.name) === savedWalletId)
        || compatibleWallets[0];

      const connectFeature = wallet.features['standard:connect'] as
        | { connect: (input?: { silent?: boolean }) => Promise<{ accounts: readonly { address: string }[] }> }
        | undefined;

      if (!connectFeature) {
        throw new Error(`Wallet ${wallet.name} does not support connect`);
      }

      let output: { accounts: readonly { address: string }[] };
      try {
        output = await connectFeature.connect();
      } catch {
        output = await connectFeature.connect({ silent: false });
      }
      const accountAddress = getFirstSuiHexAddress(output.accounts)
        || getFirstSuiHexAddress(wallet.accounts as readonly { address: string }[] | undefined);

      if (!accountAddress) {
        localStorage.removeItem(LAST_WALLET_ID_KEY);
        localStorage.removeItem(LAST_WALLET_ADDRESS_KEY);
        throw new Error(`Connected wallet does not expose a valid Sui account. ${formatWalletDiagnostics(wallet)} Choose a Sui wallet account on testnet/mainnet.`);
      }

      setWalletAddress(accountAddress);
      setWalletConnected(true);
      localStorage.setItem(LAST_WALLET_ID_KEY, wallet.id || wallet.name);
      localStorage.setItem(LAST_WALLET_ADDRESS_KEY, accountAddress);
      window.dispatchEvent(new CustomEvent('sapm:wallet-updated', { detail: { connected: true, address: accountAddress } }));
    } catch (error) {
      console.error('Error connecting wallet:', error);
      const message = error instanceof Error ? error.message : 'Unknown wallet connection error';
      setWalletError(message);
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect wallet
  const handleDisconnectWallet = () => {
    const connectedWallet = availableWallets.find((wallet) => (wallet.id || wallet.name) === localStorage.getItem(LAST_WALLET_ID_KEY));
    const disconnectFeature = connectedWallet?.features?.['standard:disconnect'] as
      | { disconnect: () => Promise<void> }
      | undefined;

    if (disconnectFeature) {
      disconnectFeature.disconnect().catch((err) => {
        console.warn('Wallet disconnect failed, clearing local session only', err);
      });
    }

    setWalletConnected(false);
    setWalletAddress(null);
    setShowWalletMenu(false);
    localStorage.removeItem(LAST_WALLET_ID_KEY);
    localStorage.removeItem(LAST_WALLET_ADDRESS_KEY);
    window.dispatchEvent(new CustomEvent('sapm:wallet-updated', { detail: { connected: false, address: null } }));
  };

  // Handle network change
  const handleNetworkChange = (newNetwork: 'testnet' | 'mainnet') => {
    setNetwork(newNetwork);
    localStorage.setItem('preferredNetwork', newNetwork);
    setShowNetworkMenu(false);
  };

  // Format address for display (show first 6 and last 4 chars)
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Check if link is active
  const isActive = (path: string) => {
    return pathname === path ? '#0ea5e9' : '#cbd5e1';
  };

  // Load wallet and network on mount if previously connected
  React.useEffect(() => {
    const registry = getWallets();
    const refreshWallets = () => setAvailableWallets(registry.get());
    refreshWallets();

    const offRegister = registry.on('register', refreshWallets);
    const offUnregister = registry.on('unregister', refreshWallets);

    const savedNetwork = localStorage.getItem('preferredNetwork');
    if (savedNetwork) {
      setNetwork(savedNetwork as 'testnet' | 'mainnet');
    }

    const rawInsight = localStorage.getItem(ACTIVE_MARKET_INSIGHT_KEY);
    if (rawInsight) {
      try {
        setActiveMarketInsight(JSON.parse(rawInsight) as ActiveMarketInsight);
      } catch {
        setActiveMarketInsight(null);
      }
    }

    const onInsightUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<ActiveMarketInsight>;
      if (customEvent.detail?.id) {
        setActiveMarketInsight(customEvent.detail);
      }
    };

    window.addEventListener('sapm:active-market-insight', onInsightUpdate as EventListener);

    const reconnect = async () => {
      const savedWalletId = localStorage.getItem(LAST_WALLET_ID_KEY);
      const savedAddress = localStorage.getItem(LAST_WALLET_ADDRESS_KEY);
      if (!savedWalletId || !savedAddress) {
        return;
      }

      const wallet = registry.get().find((item) => (item.id || item.name) === savedWalletId);
      if (!wallet || !hasSuiChain(wallet) || !hasConnectFeature(wallet)) {
        localStorage.removeItem(LAST_WALLET_ID_KEY);
        localStorage.removeItem(LAST_WALLET_ADDRESS_KEY);
        return;
      }

      const connectFeature = wallet.features['standard:connect'] as
        | { connect: (input?: { silent?: boolean }) => Promise<{ accounts: readonly { address: string }[] }> }
        | undefined;

      if (!connectFeature) {
        return;
      }

      try {
        setIsConnecting(true);
        let output: { accounts: readonly { address: string }[] };
        try {
          output = await connectFeature.connect({ silent: true });
        } catch {
          output = await connectFeature.connect();
        }
        const accountAddress = getFirstSuiHexAddress(output.accounts)
          || getFirstSuiHexAddress(wallet.accounts as readonly { address: string }[] | undefined)
          || (isValidSuiHexAddress(savedAddress) ? savedAddress : null);
        if (accountAddress && isValidSuiHexAddress(accountAddress)) {
          setWalletAddress(accountAddress);
          setWalletConnected(true);
          localStorage.setItem(LAST_WALLET_ID_KEY, wallet.id || wallet.name);
          localStorage.setItem(LAST_WALLET_ADDRESS_KEY, accountAddress);
          window.dispatchEvent(new CustomEvent('sapm:wallet-updated', { detail: { connected: true, address: accountAddress } }));
        } else {
          setWalletConnected(false);
          setWalletAddress(null);
          localStorage.removeItem(LAST_WALLET_ID_KEY);
          localStorage.removeItem(LAST_WALLET_ADDRESS_KEY);
          window.dispatchEvent(new CustomEvent('sapm:wallet-updated', { detail: { connected: false, address: null } }));
        }
      } catch {
        setWalletConnected(false);
        setWalletAddress(null);
        window.dispatchEvent(new CustomEvent('sapm:wallet-updated', { detail: { connected: false, address: null } }));
      } finally {
        setIsConnecting(false);
      }
    };

    reconnect();

    return () => {
      offRegister();
      offUnregister();
      window.removeEventListener('sapm:active-market-insight', onInsightUpdate as EventListener);
    };
  }, []);

  React.useEffect(() => {
    const compatibleWallets = availableWallets.filter((wallet) => hasConnectFeature(wallet) && hasSuiChain(wallet));

    if (compatibleWallets.length === 0) {
      setSelectedWalletId('');
      return;
    }

    const savedWalletId = localStorage.getItem(LAST_WALLET_ID_KEY) || '';
    const nextSelected = compatibleWallets.find((item) => (item.id || item.name) === savedWalletId)
      || compatibleWallets.find((item) => (item.id || item.name) === selectedWalletId)
      || compatibleWallets[0];

    setSelectedWalletId(nextSelected.id || nextSelected.name);
  }, [availableWallets, selectedWalletId]);

  const currentNetworkConfig = NETWORKS[network];
  const suiConnectWallets = React.useMemo(() => {
    return availableWallets.filter((wallet) => hasConnectFeature(wallet) && hasSuiChain(wallet));
  }, [availableWallets]);
  const explorerBase = network === 'mainnet'
    ? 'https://suiscan.xyz/mainnet/account/'
    : 'https://suiscan.xyz/testnet/account/';
  const currentInsight = React.useMemo(() => {
    if (pathname.startsWith('/markets') && activeMarketInsight) {
      const confidence = Math.max(0.5, Math.min(0.98, activeMarketInsight.aiConfidence || 0.5));
      const impliedYes = Math.round(activeMarketInsight.yesPrice * 100);
      const impliedNo = Math.round(activeMarketInsight.noPrice * 100);
      const spreadBps = Math.round((activeMarketInsight.spread || 0) * 10000);

      return {
        title: 'Live Market Insight',
        message: `${activeMarketInsight.question} | YES ${impliedYes}% / NO ${impliedNo}% | Spread ${spreadBps} bps | Risk ${activeMarketInsight.riskLevel}.`,
        confidence,
        ctaLabel: 'Open Selected Market',
        ctaPath: '/markets',
      };
    }

    if (pathname.startsWith('/markets')) {
      return {
        title: 'Market Insight',
        message: 'Liquidity is concentrated in the top 3 markets. Use the Board view to compare spread and depth before entering.',
        confidence: 0.86,
        ctaLabel: 'Open Markets Board',
        ctaPath: '/markets',
      };
    }

    if (pathname.startsWith('/portfolio')) {
      return {
        title: 'Portfolio Insight',
        message: 'Risk exposure is best managed by pairing high-conviction positions with lower-spread markets for faster exit optionality.',
        confidence: 0.79,
        ctaLabel: 'Review Markets',
        ctaPath: '/markets',
      };
    }

    return {
      title: 'Platform Insight',
      message: 'Momentum is strongest in crypto category markets today. Start in Board mode for faster scan and one-click ticket routing.',
      confidence: 0.82,
      ctaLabel: 'Start Trading',
      ctaPath: '/markets',
    };
  }, [pathname]);

  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, backgroundColor: '#0f172a', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
        <CopilotKit runtimeUrl={copilotRuntimeUrl}>
          {/* Main Application Content */}
          <div style={{ position: 'relative' }}>
            
            {/* Header Navigation */}
            <header style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 100,
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              borderBottom: '1px solid #334155',
              backdropFilter: 'blur(10px)',
            }}>
              <nav style={{
                maxWidth: '1280px',
                margin: '0 auto',
                padding: '0 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                height: '4rem',
              }}>
                {/* Logo with SUI Brand */}
                <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 2L2 9.33L2 22.67L16 30L30 22.67L30 9.33L16 2Z" fill="url(#gradient)" stroke="#06b6d4" strokeWidth="1"/>
                    <path d="M16 2L16 30M2 9.33L30 22.67M30 9.33L2 22.67" stroke="#06b6d4" strokeWidth="0.5" opacity="0.3"/>
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{ stopColor: '#0ea5e9', stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: '#06b6d4', stopOpacity: 1 }} />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ 
                      fontSize: '1.25rem', 
                      fontWeight: '700',
                      background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      color: 'transparent',
                      lineHeight: '1',
                    }}>
                      SAPM
                    </span>
                    <span style={{
                      fontSize: '0.625rem',
                      color: '#64748b',
                      fontWeight: '500',
                      letterSpacing: '0.5px',
                    }}>
                      on Sui
                    </span>
                  </div>
                </Link>

                {/* Navigation Links */}
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                  <CommandPalette />

                  <AgentInsightButton onClick={() => setShowInsightModal(true)} />

                  <Link href="/markets" style={{
                    color: isActive('/markets'),
                    textDecoration: 'none',
                    fontWeight: '500',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    transition: 'color 0.2s',
                  }}>
                    Markets
                  </Link>
                  <Link href="/portfolio" style={{
                    color: isActive('/portfolio'),
                    textDecoration: 'none',
                    fontWeight: '500',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    transition: 'color 0.2s',
                  }}>
                    Portfolio
                  </Link>
                  <Link href="/leaderboard" style={{
                    color: isActive('/leaderboard'),
                    textDecoration: 'none',
                    fontWeight: '500',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    transition: 'color 0.2s',
                  }}>
                    Leaderboard
                  </Link>
                  <Link href="/help" style={{
                    color: isActive('/help'),
                    textDecoration: 'none',
                    fontWeight: '500',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    transition: 'color 0.2s',
                  }}>
                    Help
                  </Link>
                  <Link href="/resource-hub" style={{
                    color: isActive('/resource-hub'),
                    textDecoration: 'none',
                    fontWeight: '500',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    transition: 'color 0.2s',
                  }}>
                    Resource Hub
                  </Link>

                  {/* Network Switcher */}
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setShowNetworkMenu(!showNetworkMenu)}
                      style={{
                        padding: '0.4rem 0.75rem',
                        backgroundColor: currentNetworkConfig.bg,
                        color: currentNetworkConfig.color,
                        border: `1px solid ${currentNetworkConfig.color}`,
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        transition: 'all 0.2s',
                      }}
                    >
                      🌐 {currentNetworkConfig.badge}
                      <span style={{ fontSize: '0.9rem' }}>▼</span>
                    </button>

                    {showNetworkMenu && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '0.5rem',
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '0.5rem',
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
                        minWidth: '180px',
                        zIndex: 1000,
                      }}>
                        {Object.entries(NETWORKS).map(([key, config]) => (
                          <button
                            key={key}
                            onClick={() => handleNetworkChange(key as 'testnet' | 'mainnet')}
                            style={{
                              width: '100%',
                              padding: '0.75rem 1rem',
                              backgroundColor: network === key ? config.bg : 'transparent',
                              color: network === key ? config.color : '#cbd5e1',
                              border: 'none',
                              borderBottom: key !== 'mainnet' ? '1px solid #334155' : 'none',
                              cursor: 'pointer',
                              fontSize: '0.875rem',
                              textAlign: 'left',
                              transition: 'all 0.2s',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#334155';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = network === key ? config.bg : 'transparent';
                            }}
                          >
                            {network === key ? '✓' : '○'} {config.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Notifications */}
                  <button style={{
                    position: 'relative',
                    background: 'none',
                    border: 'none',
                    fontSize: '1.25rem',
                    cursor: 'pointer',
                    padding: '0.5rem',
                  }}>
                    🔔
                    <span style={{
                      position: 'absolute',
                      top: '0px',
                      right: '0px',
                      width: '16px',
                      height: '16px',
                      backgroundColor: '#ef4444',
                      borderRadius: '9999px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '0.65rem',
                      fontWeight: 'bold',
                    }}>
                      2
                    </span>
                  </button>

                  {/* Wallet Button or Connected State */}
                  {!walletConnected ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: '240px' }}>
                      {suiConnectWallets.length > 1 && (
                        <select
                          value={selectedWalletId}
                          onChange={(event) => setSelectedWalletId(event.target.value)}
                          style={{
                            minHeight: '36px',
                            borderRadius: '0.375rem',
                            border: '1px solid #334155',
                            backgroundColor: '#0f172a',
                            color: '#e2e8f0',
                            fontSize: '0.8rem',
                            padding: '0.25rem 0.5rem',
                          }}
                        >
                          {suiConnectWallets.map((wallet) => {
                              const walletId = wallet.id || wallet.name;
                              return (
                                <option key={walletId} value={walletId}>
                                  {wallet.name}
                                </option>
                              );
                            })}
                        </select>
                      )}

                      <button
                        onClick={handleConnectWallet}
                        disabled={isConnecting || suiConnectWallets.length === 0}
                        style={{
                          padding: '0.6rem 1.5rem',
                          background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
                          color: 'white',
                          borderRadius: '0.375rem',
                          border: 'none',
                          fontWeight: '600',
                          cursor: isConnecting || suiConnectWallets.length === 0 ? 'not-allowed' : 'pointer',
                          fontSize: '0.9rem',
                          transition: 'all 0.2s',
                          boxShadow: '0 4px 15px rgba(6, 182, 212, 0.2)',
                          opacity: isConnecting || suiConnectWallets.length === 0 ? 0.7 : 1,
                        }}
                      >
                        {isConnecting ? '🔗 Connecting...' : suiConnectWallets.length === 0 ? 'Install Sui Wallet' : '💼 Connect Wallet'}
                      </button>

                      {walletError && (
                        <div style={{ fontSize: '0.75rem', color: '#fca5a5', backgroundColor: '#7f1d1d33', border: '1px solid #7f1d1d', borderRadius: '0.375rem', padding: '0.4rem 0.55rem' }}>
                          Wallet error: {walletError}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={() => setShowWalletMenu(!showWalletMenu)}
                        style={{
                          padding: '0.6rem 1.5rem',
                          background: 'linear-gradient(135deg, #34d399, #10b981)',
                          color: 'white',
                          borderRadius: '0.375rem',
                          border: 'none',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          transition: 'all 0.2s',
                          boxShadow: '0 4px 15px rgba(52, 211, 153, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        ✓ {formatAddress(walletAddress!)}
                        <span style={{ fontSize: '1.1rem' }}>▼</span>
                      </button>

                      {/* Wallet Menu */}
                      {showWalletMenu && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          right: 0,
                          marginTop: '0.5rem',
                          backgroundColor: '#1e293b',
                          border: '1px solid #334155',
                          borderRadius: '0.5rem',
                          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
                          minWidth: '200px',
                          zIndex: 1000,
                        }}>
                          <div style={{
                            padding: '1rem',
                            borderBottom: '1px solid #334155',
                          }}>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                              Connected Wallet
                            </div>
                            <div style={{ 
                              fontSize: '0.75rem', 
                              color: '#e2e8f0',
                              fontFamily: 'monospace',
                              wordBreak: 'break-all',
                            }}>
                              {walletAddress}
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(walletAddress!);
                              alert('Address copied to clipboard!');
                            }}
                            style={{
                              width: '100%',
                              padding: '0.75rem 1rem',
                              backgroundColor: 'transparent',
                              color: '#cbd5e1',
                              border: 'none',
                              borderBottom: '1px solid #334155',
                              cursor: 'pointer',
                              fontSize: '0.875rem',
                              textAlign: 'left',
                              transition: 'background-color 0.2s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#334155'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            📋 Copy Address
                          </button>

                          <button
                            onClick={() => {
                              window.open(`${explorerBase}${walletAddress}`, '_blank');
                              setShowWalletMenu(false);
                            }}
                            style={{
                              width: '100%',
                              padding: '0.75rem 1rem',
                              backgroundColor: 'transparent',
                              color: '#cbd5e1',
                              border: 'none',
                              borderBottom: '1px solid #334155',
                              cursor: 'pointer',
                              fontSize: '0.875rem',
                              textAlign: 'left',
                              transition: 'background-color 0.2s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#334155'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            🔗 View on SuiScan
                          </button>

                          <button
                            onClick={handleDisconnectWallet}
                            style={{
                              width: '100%',
                              padding: '0.75rem 1rem',
                              backgroundColor: 'transparent',
                              color: '#f87171',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '0.875rem',
                              textAlign: 'left',
                              transition: 'background-color 0.2s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7f1d1d'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            🚪 Disconnect
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </nav>
            </header>

            {/* Main Content */}
            <main style={{ paddingTop: '4rem', minHeight: '100vh' }}>
              {children}
            </main>

            {showInsightModal && (
              <AgentInsightModal
                title={currentInsight.title}
                message={currentInsight.message}
                confidence={currentInsight.confidence}
                ctaLabel={currentInsight.ctaLabel}
                ctaPath={currentInsight.ctaPath}
                onClose={() => setShowInsightModal(false)}
              />
            )}

            {/* Footer */}
            <footer style={{
              backgroundColor: '#0f172a',
              color: '#94a3b8',
              padding: '3rem 1rem 2rem 1rem',
              marginTop: '6rem',
              borderTop: '1px solid #334155',
            }}>
              <div style={{
                maxWidth: '1280px',
                margin: '0 auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '2rem',
                marginBottom: '2rem',
              }}>
                {/* About */}
                <div>
                  <h3 style={{ color: '#e2e8f0', fontWeight: '700', marginBottom: '1rem', fontSize: '0.95rem' }}>About SAPM</h3>
                  <p style={{ fontSize: '0.875rem', margin: 0, lineHeight: '1.6' }}>AI-powered prediction markets built on Sui blockchain with sovereign infrastructure and zero-copy performance.</p>
                </div>

                {/* Resources */}
                <div>
                  <h3 style={{ color: '#e2e8f0', fontWeight: '700', marginBottom: '1rem', fontSize: '0.95rem' }}>Resources</h3>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    <li style={{ marginBottom: '0.5rem' }}><Link href="/docs" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem' }}>📚 Documentation</Link></li>
                    <li style={{ marginBottom: '0.5rem' }}><Link href="/api" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem' }}>🔌 API Reference</Link></li>
                    <li><Link href="/governance" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem' }}>⚖️ Governance</Link></li>
                  </ul>
                </div>

                {/* Community */}
                <div>
                  <h3 style={{ color: '#e2e8f0', fontWeight: '700', marginBottom: '1rem', fontSize: '0.95rem' }}>Community</h3>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    <li style={{ marginBottom: '0.5rem' }}><a href="https://github.com/rwilliamspbg-ops/Sovereign-Agentic-Prediction-Market-SAPM-on-Sui-Core" target="_blank" rel="noopener noreferrer" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem' }}>🐙 GitHub Repository</a></li>
                    <li style={{ marginBottom: '0.5rem' }}><a href="https://github.com/rwilliamspbg-ops/Sovereign-Agentic-Prediction-Market-SAPM-on-Sui-Core/issues" target="_blank" rel="noopener noreferrer" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem' }}>🐞 Issue Tracker</a></li>
                    <li><a href="https://github.com/rwilliamspbg-ops/Sovereign-Agentic-Prediction-Market-SAPM-on-Sui-Core/pulls" target="_blank" rel="noopener noreferrer" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem' }}>🔀 Pull Requests</a></li>
                  </ul>
                </div>

                {/* On-chain */}
                <div>
                  <h3 style={{ color: '#e2e8f0', fontWeight: '700', marginBottom: '1rem', fontSize: '0.95rem' }}>On-chain</h3>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    <li style={{ marginBottom: '0.5rem' }}>
                      <a href={SUISCAN_PACKAGE_URL} target="_blank" rel="noopener noreferrer" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem' }}>
                        📦 Package On SuiScan
                      </a>
                    </li>
                    <li style={{ color: '#64748b', fontSize: '0.75rem', lineHeight: 1.5 }}>
                      {SUI_PACKAGE_ID}
                    </li>
                  </ul>
                </div>

                {/* Legal */}
                <div>
                  <h3 style={{ color: '#e2e8f0', fontWeight: '700', marginBottom: '1rem', fontSize: '0.95rem' }}>Legal</h3>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    <li style={{ marginBottom: '0.5rem' }}><Link href="/privacy" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem' }}>🔒 Privacy Policy</Link></li>
                    <li style={{ marginBottom: '0.5rem' }}><Link href="/terms" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem' }}>📄 Terms of Service</Link></li>
                    <li><Link href="/risk" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem' }}>⚠️ Risk Disclosure</Link></li>
                  </ul>
                </div>
              </div>

              <div style={{
                borderTop: '1px solid #334155',
                paddingTop: '1.5rem',
                textAlign: 'center',
                fontSize: '0.875rem',
              }}>
                <p style={{ margin: 0, color: '#64748b' }}>© 2025 SAPM on Sui. All rights reserved. | Built with ⚡ on Sui Blockchain</p>
              </div>
            </footer>
          </div>
        </CopilotKit>
      </body>
    </html>
  );
}

// AgentInsightButton Component - A2UI Integration
function AgentInsightButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minHeight: '44px',
        borderRadius: '0.5rem',
        border: '1px solid #155e75',
        backgroundColor: '#083344',
        color: '#67e8f9',
        padding: '0.45rem 0.8rem',
        cursor: 'pointer',
        fontWeight: 700,
        fontSize: '0.8rem',
        letterSpacing: '0.02em',
      }}
      title="Get AI Agent Insight on market conditions"
    >
      Agent Insight
    </button>
  );
}

function AgentInsightModal({
  title,
  message,
  confidence,
  ctaLabel,
  ctaPath,
  onClose,
}: {
  title: string;
  message: string;
  confidence: number;
  ctaLabel: string;
  ctaPath: string;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(2, 6, 23, 0.68)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3000,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 'min(560px, 100%)',
          borderRadius: '0.9rem',
          border: '1px solid #334155',
          background: 'linear-gradient(180deg, #111827 0%, #0b1220 100%)',
          boxShadow: '0 24px 50px rgba(2, 6, 23, 0.6)',
          padding: '1.15rem',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={{ color: '#67e8f9', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
          AI Agent
        </div>
        <h3 style={{ margin: '0.45rem 0 0.6rem 0', color: '#f8fafc', fontSize: '1.15rem' }}>{title}</h3>
        <p style={{ margin: 0, color: '#94a3b8', lineHeight: 1.6 }}>{message}</p>

        <div style={{ marginTop: '0.9rem', color: '#cbd5e1', fontSize: '0.85rem' }}>
          Confidence: <span style={{ color: '#67e8f9', fontWeight: 700 }}>{Math.round(confidence * 100)}%</span>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem' }}>
          <Link
            href={ctaPath}
            onClick={onClose}
            style={{
              flex: 1,
              textAlign: 'center',
              minHeight: '44px',
              borderRadius: '0.55rem',
              border: '1px solid #155e75',
              backgroundColor: '#083344',
              color: '#67e8f9',
              textDecoration: 'none',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {ctaLabel}
          </Link>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              minHeight: '44px',
              borderRadius: '0.55rem',
              border: '1px solid #334155',
              backgroundColor: '#111827',
              color: '#cbd5e1',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
