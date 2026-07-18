'use client';

import React, { ReactNode } from "react";
import Link from "next/link";
import Image from 'next/image';
import { getWallets } from '@wallet-standard/app';
import { SUI_MAINNET_CHAIN, SUI_TESTNET_CHAIN } from '@mysten/wallet-standard';
import { CopilotKit } from '@copilotkit/react-core';
import "./globals.css";
import { CommandPalette } from '@/components/ui/CommandPalette';
import { CopilotOpsPanel } from '@/components/a2ui/CopilotOpsPanel';
import { CopilotChatHealthIndicator } from '@/components/copilot/chat-integration';
import { SUI_PACKAGE_ID, SUISCAN_PACKAGE_URL } from '@/lib/sui-config';
const LAST_WALLET_ID_KEY = 'walletId';
const LAST_WALLET_ADDRESS_KEY = 'walletAddress';
const CONNECT_TIMEOUT_MS = 30000;
const SILENT_CONNECT_TIMEOUT_MS = 5000;

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

  return wallet.chains.some((chain) => chain === SUI_TESTNET_CHAIN || chain === SUI_MAINNET_CHAIN || chain.startsWith('sui:'));
}

function hasSuiAccountChain(wallet: { accounts?: readonly { chains?: readonly string[] }[] | undefined }): boolean {
  if (!Array.isArray(wallet.accounts)) {
    return false;
  }

  return wallet.accounts.some((account) => Array.isArray(account.chains)
    && account.chains.some((chain: string) => chain === SUI_TESTNET_CHAIN || chain === SUI_MAINNET_CHAIN || chain.startsWith('sui:')));
}

function hasSuiFeature(wallet: { features?: Record<string, unknown> | undefined }): boolean {
  return Object.keys(wallet.features || {}).some((feature) => feature.startsWith('sui:'));
}

function hasConnectFeature(wallet: { features?: Record<string, unknown> | undefined }): boolean {
  return typeof (wallet.features?.['standard:connect'] as { connect?: unknown } | undefined)?.connect === 'function';
}

function isNightlyWallet(wallet: { id?: string; name?: string }): boolean {
  const id = String(wallet.id || '').toLowerCase();
  const name = String(wallet.name || '').toLowerCase();
  return id.includes('nightly') || name.includes('nightly');
}

function isLikelySuiWallet(wallet: {
  id?: string;
  name?: string;
  chains?: readonly string[];
  accounts?: readonly { chains?: readonly string[] }[];
  features?: Record<string, unknown>;
}): boolean {
  return hasSuiChain(wallet) || hasSuiAccountChain(wallet) || hasSuiFeature(wallet);
}

function pickPreferredWallet<T extends { id?: string; name?: string }>(
  wallets: T[],
  explicitWalletId?: string | null,
  savedWalletId?: string | null,
): T {
  const explicit = (explicitWalletId || '').trim();
  if (explicit) {
    const byExplicit = wallets.find((item) => (item.id || item.name) === explicit);
    if (byExplicit) {
      return byExplicit;
    }
  }

  const nightly = wallets.find((item) => isNightlyWallet(item));
  if (nightly) {
    return nightly;
  }

  const saved = (savedWalletId || '').trim();
  if (saved) {
    const bySaved = wallets.find((item) => (item.id || item.name) === saved);
    if (bySaved) {
      return bySaved;
    }
  }

  return wallets[0];
}

function formatDetectedWallets(wallets: readonly {
  name?: string;
  chains?: readonly string[];
  accounts?: readonly { chains?: readonly string[] }[];
}[]): string {
  if (!wallets.length) {
    return 'none';
  }

  return wallets.map((wallet) => {
    const walletName = wallet.name || 'Unknown wallet';
    const topChains = (wallet.chains || []).join('|') || 'none';
    const accountChains = (wallet.accounts || [])
      .flatMap((account) => account.chains || [])
      .join('|') || 'none';
    return `${walletName} [chains=${topChains}; accountChains=${accountChains}]`;
  }).join('; ');
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
  chains?: readonly string[];
  accounts?: readonly { address: string }[];
  features?: Record<string, unknown>;
}): string {
  const walletName = wallet.name || 'Unknown wallet';
  const chains = (wallet.chains || []).join(', ') || 'none';
  const accounts = (wallet.accounts || []).map((account) => account.address).join(', ') || 'none';
  const features = Object.keys(wallet.features || {}).join(', ') || 'none';
  return `Selected wallet: ${walletName}. Chains: ${chains}. Accounts: ${accounts}. Features: ${features}.`;
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

function normalizeWalletConnectError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (
    lower.includes('json-rpc: method call timeout')
    || lower.includes('method call timeout calling connect')
    || (lower.includes('timeout') && lower.includes('connect'))
  ) {
    return new Error('Wallet connect timed out. Open/unlock your wallet extension and approve the request, then retry.');
  }

  if (lower.includes('reject') || lower.includes('denied') || lower.includes('cancel')) {
    return new Error('Wallet connection request was canceled. Approve the extension popup to continue.');
  }

  return error instanceof Error ? error : new Error(message);
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

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const [walletConnected, setWalletConnected] = React.useState(false);
  const [walletAddress, setWalletAddress] = React.useState<string | null>(null);
  const [showWalletMenu, setShowWalletMenu] = React.useState(false);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [network, setNetwork] = React.useState<'testnet' | 'mainnet'>('testnet');
  const [showNetworkMenu, setShowNetworkMenu] = React.useState(false);
  const [showCopilotPanel, setShowCopilotPanel] = React.useState(false);
  const [availableWallets, setAvailableWallets] = React.useState<ReturnType<ReturnType<typeof getWallets>['get']>>([]);
  const [selectedWalletId, setSelectedWalletId] = React.useState<string>('');
  const [walletError, setWalletError] = React.useState<string | null>(null);
  const [isNarrowScreen, setIsNarrowScreen] = React.useState(false);

  const NETWORKS = {
    testnet: { label: 'Sui Testnet', color: '#fbbf24', bg: '#78350f', badge: 'TESTNET' },
    mainnet: { label: 'Sui Mainnet', color: '#34d399', bg: '#064e3b', badge: 'MAINNET' },
  };
  const PROJECT_LINKS = [
    { label: 'Docs', href: '/docs', internal: true },
    { label: 'Resource Hub', href: '/resource-hub', internal: true },
    { label: 'GitHub', href: 'https://github.com/rwilliamspbg-ops/Sovereign-Agentic-Prediction-Market-SAPM-on-Sui-Core', internal: false },
  ];
  const PROTOCOL_LINKS = [
    { label: 'Sui', href: 'https://docs.sui.io/', logo: '/brand/sui.svg' },
    { label: 'DeepBook', href: 'https://docs.sui.io/onchain-finance/deepbookv3/deepbook', logo: '/brand/deepbook.svg' },
    { label: 'Walrus', href: 'https://docs.wal.app/', logo: '/brand/walrus.svg' },
  ];

  // Handle wallet connection
  const handleConnectWallet = async () => {
    setIsConnecting(true);
    setWalletError(null);
    try {
      const liveWallets = getWallets().get();
      const connectableWallets = liveWallets.filter((wallet) => hasConnectFeature(wallet));
      const connectableSuiWallets = connectableWallets.filter((wallet) => isLikelySuiWallet(wallet));

      if (connectableWallets.length === 0) {
        throw new Error('No Wallet Standard wallet detected. Ensure your wallet extension is installed, unlocked, and wallet-standard compatible.');
      }

      if (connectableSuiWallets.length === 0) {
        const detected = formatDetectedWallets(connectableWallets);
        throw new Error(`No Sui-capable wallet detected. Found wallet-standard providers: ${detected}. Select/install a Sui wallet (Nightly/Sui Wallet) and retry.`);
      }

      const candidateWallets = connectableSuiWallets;

      const savedWalletId = localStorage.getItem(LAST_WALLET_ID_KEY);
      const wallet = pickPreferredWallet(candidateWallets, selectedWalletId, savedWalletId);

      const connectFeature = wallet.features['standard:connect'] as
        | { connect: (input?: { silent?: boolean }) => Promise<{ accounts: readonly { address: string }[] }> }
        | undefined;

      if (!connectFeature) {
        throw new Error(`Wallet ${wallet.name} does not support connect`);
      }

      let output: { accounts: readonly { address: string }[] };
      try {
        output = await withTimeout(connectFeature.connect({ silent: false }), CONNECT_TIMEOUT_MS, 'Wallet connect');
      } catch (error) {
        throw normalizeWalletConnectError(error);
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

  // ─── Global wallet-extension error interceptor ───────────────────────────
  // The Sui wallet extension (chrome-extension://…/inapp.js) throws
  // "JSON-RPC: method call timeout calling connect" as an unhandled promise
  // rejection when the background service page is slow to respond. This fires
  // *before* our withTimeout wrapper can catch it, causing Next.js to surface
  // it as a fatal dev overlay even though it is recoverable.
  //
  // We intercept it here at the earliest possible mount point, convert it to a
  // handled error, and surface a friendly message via walletError state instead.
  React.useEffect(() => {
    const isWalletExtensionError = (message: string): boolean => {
      const m = message.toLowerCase();
      return (
        m.includes('json-rpc: method call timeout') ||
        (m.includes('timeout') && m.includes('connect') && m.includes('wallet')) ||
        m.includes('chrome-extension') ||
        (m.includes('method call timeout') && m.includes('connect'))
      );
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const message =
        event.reason instanceof Error
          ? event.reason.message
          : String(event.reason ?? '');
      if (isWalletExtensionError(message)) {
        event.preventDefault(); // suppresses Next.js fatal overlay
        setWalletError(
          'Wallet extension timed out connecting to its background page. ' +
          'Unlock your wallet extension, wait a moment, then click Connect Wallet again.'
        );
        setIsConnecting(false);
      }
    };

    const handleGlobalError = (event: ErrorEvent) => {
      if (isWalletExtensionError(event.message || '')) {
        event.preventDefault();
        setWalletError(
          'Wallet extension error. Unlock/reopen the extension and retry.'
        );
        setIsConnecting(false);
        return true; // suppresses console error
      }
      return false;
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleGlobalError as unknown as EventListener);
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleGlobalError as unknown as EventListener);
    };
  }, []);

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

    const reconnect = async () => {
      const savedWalletId = localStorage.getItem(LAST_WALLET_ID_KEY);
      const savedAddress = localStorage.getItem(LAST_WALLET_ADDRESS_KEY);
      if (!savedWalletId || !savedAddress) {
        return;
      }

      const wallet = registry.get().find((item) => (item.id || item.name) === savedWalletId);
      if (!wallet || !hasConnectFeature(wallet) || !isLikelySuiWallet(wallet)) {
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
        let output: { accounts: readonly { address: string }[] } | null = null;
        try {
          // Reconnect should never force an interactive approval prompt.
          // If silent reconnect fails, keep state disconnected and wait for user click.
          output = await withTimeout(connectFeature.connect({ silent: true }), SILENT_CONNECT_TIMEOUT_MS, 'Wallet reconnect');
        } catch {
          output = null;
        }
        const accountAddress = getFirstSuiHexAddress(output?.accounts)
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
    };
  }, []);

  React.useEffect(() => {
    const updateScreenMode = () => {
      setIsNarrowScreen(window.innerWidth < 980);
    };

    updateScreenMode();
    window.addEventListener('resize', updateScreenMode);

    return () => {
      window.removeEventListener('resize', updateScreenMode);
    };
  }, []);

  React.useEffect(() => {
    // Prevent known wallet extension connect timeouts from tripping the Next dev overlay.
    // These originate from extension-injected scripts and are already surfaced via walletError UI.
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

  React.useEffect(() => {
    const connectableWallets = availableWallets.filter((wallet) => hasConnectFeature(wallet));
    const connectableSuiWallets = connectableWallets.filter((wallet) => isLikelySuiWallet(wallet));

    if (connectableSuiWallets.length === 0) {
      setSelectedWalletId('');
      return;
    }

    const savedWalletId = localStorage.getItem(LAST_WALLET_ID_KEY) || '';
    const candidateWallets = connectableSuiWallets;
    const nextSelected = pickPreferredWallet(candidateWallets, selectedWalletId, savedWalletId);

    setSelectedWalletId(nextSelected.id || nextSelected.name);
  }, [availableWallets, selectedWalletId]);

  const currentNetworkConfig = NETWORKS[network];
  const suiConnectWallets = React.useMemo(() => {
    return availableWallets.filter((wallet) => hasConnectFeature(wallet)
      && (hasSuiChain(wallet) || hasSuiAccountChain(wallet) || hasSuiFeature(wallet)));
  }, [availableWallets]);
  const connectableWallets = React.useMemo(() => {
    return availableWallets.filter((wallet) => hasConnectFeature(wallet));
  }, [availableWallets]);
  const connectableSuiWallets = React.useMemo(() => {
    return connectableWallets.filter((wallet) => isLikelySuiWallet(wallet));
  }, [connectableWallets]);
  const walletOptions = React.useMemo(() => {
    return connectableSuiWallets.length > 0 ? connectableSuiWallets : [];
  }, [connectableSuiWallets]);
  const explorerBase = network === 'mainnet'
    ? 'https://suiscan.xyz/mainnet/account/'
    : 'https://suiscan.xyz/testnet/account/';
  const handleProtocolPillMouseEnter = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.currentTarget.style.backgroundColor = 'rgba(14, 165, 233, 0.18)';
    event.currentTarget.style.borderColor = '#38bdf8';
    event.currentTarget.style.transform = 'translateY(-1px)';
  };
  const handleProtocolPillMouseLeave = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.82)';
    event.currentTarget.style.borderColor = '#334155';
    event.currentTarget.style.transform = 'translateY(0)';
  };
  const handleProjectPillMouseEnter = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.currentTarget.style.backgroundColor = 'rgba(14, 165, 233, 0.22)';
    event.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.8)';
    event.currentTarget.style.color = '#e0f2fe';
    event.currentTarget.style.transform = 'translateY(-1px)';
  };
  const handleProjectPillMouseLeave = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.currentTarget.style.backgroundColor = 'rgba(14, 165, 233, 0.12)';
    event.currentTarget.style.borderColor = 'rgba(14, 165, 233, 0.32)';
    event.currentTarget.style.color = '#bae6fd';
    event.currentTarget.style.transform = 'translateY(0)';
  };

  return (
    <html lang="en">
      <head>
        {showCopilotPanel && (
          <link rel="stylesheet" href="/copilotkit-scoped.css" />
        )}
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: '#0f172a', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
        <CopilotKit runtimeUrl="/api/copilotkit" agent="default">
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
                padding: isNarrowScreen ? '0.5rem 0.75rem' : '0.5rem 1rem',
                display: 'flex',
                flexDirection: isNarrowScreen ? 'column' : 'row',
                alignItems: isNarrowScreen ? 'stretch' : 'center',
                justifyContent: 'space-between',
                minHeight: isNarrowScreen ? 'auto' : '4.6rem',
                gap: isNarrowScreen ? '0.52rem' : '0.85rem',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: isNarrowScreen ? 'flex-start' : 'center',
                  flexDirection: isNarrowScreen ? 'column' : 'row',
                  minWidth: 0,
                  gap: isNarrowScreen ? '0.4rem' : '0.7rem',
                  flex: 1,
                  width: isNarrowScreen ? '100%' : undefined,
                }}>
                  <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', textDecoration: 'none', minWidth: 0, flexShrink: 0, maxWidth: '100%' }}>
                    <Image src="/sapm-logo.svg" alt="SAPM" width={42} height={42} priority />
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span style={{
                        fontSize: isNarrowScreen ? '1.12rem' : '1.35rem',
                        fontWeight: '800',
                        background: 'linear-gradient(135deg, #22d3ee, #0ea5e9)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        color: 'transparent',
                        lineHeight: '1',
                        letterSpacing: '0.02em',
                      }}>
                        SAPM Intelligence
                      </span>
                      <span style={{
                        fontSize: '0.67rem',
                        color: '#94a3b8',
                        fontWeight: '600',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                      }}>
                        Prediction Market on Sui
                      </span>
                    </div>
                  </Link>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.42rem',
                    flexWrap: isNarrowScreen ? 'nowrap' : 'wrap',
                    overflowX: isNarrowScreen ? 'auto' : 'visible',
                    width: isNarrowScreen ? '100%' : undefined,
                    paddingBottom: isNarrowScreen ? '0.15rem' : 0,
                  }}>
                    {PROTOCOL_LINKS.map((item) => (
                      <a
                        key={item.label}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`${item.label} docs`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.28rem',
                          padding: isNarrowScreen ? '0.22rem 0.35rem' : '0.3rem 0.45rem',
                          borderRadius: '999px',
                          border: '1px solid #334155',
                          backgroundColor: 'rgba(15, 23, 42, 0.82)',
                          textDecoration: 'none',
                          color: '#cbd5e1',
                          fontSize: '0.67rem',
                          fontWeight: 700,
                          lineHeight: 1,
                          transition: 'background-color 0.2s ease, border-color 0.2s ease, transform 0.2s ease',
                          whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={handleProtocolPillMouseEnter}
                        onMouseLeave={handleProtocolPillMouseLeave}
                      >
                        <Image src={item.logo} alt={item.label} width={isNarrowScreen ? 18 : 20} height={isNarrowScreen ? 18 : 20} />
                        {!isNarrowScreen && <span>{item.label}</span>}
                      </a>
                    ))}
                  </div>

                  {!isNarrowScreen && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {PROJECT_LINKS.map((item) => (
                        item.internal ? (
                          <Link
                            key={item.label}
                            href={item.href}
                            style={{
                              padding: '0.28rem 0.5rem',
                              borderRadius: '0.45rem',
                              textDecoration: 'none',
                              backgroundColor: 'rgba(14, 165, 233, 0.12)',
                              border: '1px solid rgba(14, 165, 233, 0.32)',
                              color: '#bae6fd',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              transition: 'background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.2s ease',
                            }}
                            onMouseEnter={handleProjectPillMouseEnter}
                            onMouseLeave={handleProjectPillMouseLeave}
                          >
                            {item.label}
                          </Link>
                        ) : (
                          <a
                            key={item.label}
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: '0.28rem 0.5rem',
                              borderRadius: '0.45rem',
                              textDecoration: 'none',
                              backgroundColor: 'rgba(14, 165, 233, 0.12)',
                              border: '1px solid rgba(14, 165, 233, 0.32)',
                              color: '#bae6fd',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              transition: 'background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.2s ease',
                            }}
                            onMouseEnter={handleProjectPillMouseEnter}
                            onMouseLeave={handleProjectPillMouseLeave}
                          >
                            {item.label}
                          </a>
                        )
                      ))}
                    </div>
                  )}
                </div>

                {/* Navigation Links */}
                <div style={{
                  display: 'flex',
                  gap: isNarrowScreen ? '0.5rem' : '0.9rem',
                  alignItems: 'center',
                  justifyContent: isNarrowScreen ? 'space-between' : 'flex-end',
                  flexWrap: isNarrowScreen ? 'wrap' : 'nowrap',
                  width: isNarrowScreen ? '100%' : undefined,
                }}>
                  {!isNarrowScreen && <CommandPalette />}

                  {!isNarrowScreen && <AgentInsightButton onClick={() => setShowCopilotPanel(true)} isOpen={showCopilotPanel} />}

                  {isNarrowScreen && <CommandPalette compact />}

                  {/* Network Switcher */}
                  <div style={{ position: 'relative' }}>
                    <button
                      suppressHydrationWarning
                      type="button"
                      onClick={() => setShowNetworkMenu(!showNetworkMenu)}
                      aria-label="Select network"
                      aria-haspopup="listbox"
                      aria-expanded={showNetworkMenu}
                      style={{
                        padding: isNarrowScreen ? '0.45rem 0.68rem' : '0.4rem 0.75rem',
                        backgroundColor: currentNetworkConfig.bg,
                        color: currentNetworkConfig.color,
                        border: `1px solid ${currentNetworkConfig.color}`,
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.32rem',
                        transition: 'all 0.2s',
                      }}
                    >
                      {!isNarrowScreen && '🌐 '} {currentNetworkConfig.badge}
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
                            suppressHydrationWarning
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
                  {!isNarrowScreen && (
                    <button
                      suppressHydrationWarning
                      type="button"
                      aria-label="Notifications, 2 unread"
                      style={{
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
                  )}

                  {/* Wallet Button or Connected State */}
                  {!walletConnected ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: isNarrowScreen ? '158px' : '240px', flex: isNarrowScreen ? 1 : undefined }}>
                      {walletOptions.length > 0 && (
                        <select
                          value={selectedWalletId}
                          onChange={(event) => setSelectedWalletId(event.target.value)}
                          disabled={isConnecting || walletOptions.length === 1}
                          style={{
                            minHeight: '36px',
                            borderRadius: '0.375rem',
                            border: '1px solid #334155',
                            backgroundColor: '#0f172a',
                            color: '#e2e8f0',
                            fontSize: '0.8rem',
                            padding: '0.25rem 0.5rem',
                            opacity: isConnecting || walletOptions.length === 1 ? 0.85 : 1,
                          }}
                        >
                          {walletOptions.map((wallet) => {
                              const walletId = wallet.id || wallet.name;
                              return (
                                <option key={walletId} value={walletId}>
                                  {wallet.name}
                                </option>
                              );
                            })}
                        </select>
                      )}

                      <div style={{ display: 'flex', gap: '0.42rem', alignItems: 'center' }}>
                        <button
                          suppressHydrationWarning
                          onClick={handleConnectWallet}
                          disabled={isConnecting}
                          title={connectableWallets.length === 0
                            ? 'No wallet-standard wallet detected. Install/unlock wallet extension and click again.'
                            : 'Connect wallet'}
                          style={{
                            padding: isNarrowScreen ? '0.55rem 0.85rem' : '0.6rem 1.5rem',
                            background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
                            color: 'white',
                            borderRadius: '0.375rem',
                            border: 'none',
                            fontWeight: '600',
                            cursor: isConnecting ? 'not-allowed' : 'pointer',
                            fontSize: '0.9rem',
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 15px rgba(6, 182, 212, 0.2)',
                            opacity: isConnecting ? 0.7 : 1,
                            minWidth: isNarrowScreen ? '138px' : undefined,
                          }}
                        >
                          {isConnecting ? '🔗 Connecting...' : connectableWallets.length === 0 ? 'Install Wallet' : '💼 Connect Wallet'}
                        </button>
                      </div>

                      {walletError && (
                        <div style={{ fontSize: '0.75rem', color: '#fca5a5', backgroundColor: '#7f1d1d33', border: '1px solid #7f1d1d', borderRadius: '0.375rem', padding: '0.4rem 0.55rem' }}>
                          Wallet error: {walletError}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.42rem', flex: isNarrowScreen ? 1 : undefined }}>

                      <button
                        suppressHydrationWarning
                        type="button"
                        onClick={() => setShowWalletMenu(!showWalletMenu)}
                        aria-label="Wallet menu"
                        aria-haspopup="menu"
                        aria-expanded={showWalletMenu}
                        style={{
                          padding: isNarrowScreen ? '0.56rem 0.82rem' : '0.6rem 1.5rem',
                          background: 'linear-gradient(135deg, #34d399, #10b981)',
                          color: 'white',
                          borderRadius: '0.375rem',
                          border: 'none',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: isNarrowScreen ? '0.8rem' : '0.85rem',
                          transition: 'all 0.2s',
                          boxShadow: '0 4px 15px rgba(52, 211, 153, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          minWidth: isNarrowScreen ? '138px' : undefined,
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
                            suppressHydrationWarning
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
                            suppressHydrationWarning
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
                            suppressHydrationWarning
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
            <main style={{ paddingTop: isNarrowScreen ? '8.9rem' : '5.25rem', minHeight: '100vh' }}>
              {children}
            </main>

            <CopilotOpsPanel open={showCopilotPanel} onClose={() => setShowCopilotPanel(false)} />
            <CopilotChatHealthIndicator />

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
function AgentInsightButton({ onClick, isOpen }: { onClick: () => void; isOpen: boolean }) {
  return (
    <button
      suppressHydrationWarning
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
      title="Open Copilot operations panel"
      aria-label="Open Copilot operations panel"
      aria-haspopup="dialog"
      aria-expanded={isOpen}
    >
      Copilot Ops
    </button>
  );
}

