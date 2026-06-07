'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useTradeExecution, TradeForm, ToastContainer } from '@/components/TradeExecution';
import { deepbookService } from '@/services/sui/deepbook-service';
import { walrusService } from '@/services/sui/walrus-service';
import { DEEPBOOK_SANDBOX_URL, SUI_PACKAGE_ID, SUISCAN_PACKAGE_URL, WALRUS_AGGREGATOR_URL } from '@/lib/sui-config';
import { marketDataService } from '@/services/sui/market-data-service';
import { getCompatibleWallets } from '@/services/sui/wallet-standard';

interface MarketData {
  id: string;
  question: string;
  yesPrice: number;
  noPrice: number;
  yesVolume: number;
  noVolume: number;
  category?: string;
  resolutionDate?: Date;
  aiConfidence?: number;
  aiEdge?: number;
  spread?: number;
  liquidityDepth?: number;
  riskLevel?: 'Low' | 'Medium' | 'High';
  resolutionSource?: string;
  recentTrades?: Array<{ side: 'yes' | 'no'; price: number; size: number; timestamp: Date }>;
  priceHistory?: number[];
  tvl?: number;
  volume24h?: number;
}

type IntegrationStatus = {
  deepbook: {
    ready: boolean;
    message: string;
  };
  walrus: {
    ready: boolean;
    message: string;
  };
};

type WalletCapabilities = {
  walletName: string;
  chainCount: number;
  featureCount: number;
  features: string[];
};

type JudgeStep = {
  label: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  detail?: string;
};

type ObservabilityEntry = {
  ts: string;
  category: string;
  action: string;
  severity: 'info' | 'warn' | 'error';
  details?: Record<string, unknown>;
};

const ACTIVE_MARKET_INSIGHT_KEY = 'sapm.activeMarketInsight';
const LOCAL_ONCHAIN_OBJECT_IDS_KEY = 'sapm.onchainObjectIds';
const PAGE_BOOT_TIMEOUT_MS = 15000;
const DEEPBOOK_DOCS_URL = 'https://docs.sui.io/standards/deepbookv3';
const WALRUS_DOCS_URL = 'https://github.com/MystenLabs/walrus';

function ProtocolBadge({
  accent,
  symbol,
  label,
  logoSrc,
}: {
  accent: string;
  symbol: string;
  label: string;
  logoSrc?: string;
}) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
      <div
        style={{
          width: '1.3rem',
          height: '1.3rem',
          borderRadius: '999px',
          border: `1px solid ${accent}`,
          color: accent,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.68rem',
          fontWeight: 800,
          letterSpacing: '0.02em',
          backgroundColor: '#020617',
          overflow: 'hidden',
        }}
      >
        {logoSrc ? (
          <img
            src={logoSrc}
            alt={`${label} logo`}
            width={18}
            height={18}
            style={{ display: 'block' }}
          />
        ) : symbol}
      </div>
      <span style={{ color: '#67e8f9', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </span>
    </div>
  );
}

function isValidSuiHexAddress(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }
  return /^0x[0-9a-fA-F]{1,64}$/.test(value);
}

function createFixtureMarkets(): MarketData[] {
  return [
    {
      id: 'SUI_PRICE_2025',
      question: 'Will SUI reach $5 by end of 2025?',
      yesPrice: 0.68,
      noPrice: 0.32,
      yesVolume: 2500000,
      noVolume: 1200000,
      category: 'cryptocurrency',
      resolutionDate: new Date('2025-12-31'),
      aiConfidence: 0.85,
      aiEdge: 0.18,
      spread: 0.02,
      liquidityDepth: 500000,
      riskLevel: 'Low',
      resolutionSource: 'CoinGecko API',
      tvl: 3700000,
      volume24h: 450000,
      recentTrades: [
        { side: 'yes', price: 0.68, size: 50000, timestamp: new Date() },
        { side: 'yes', price: 0.67, size: 35000, timestamp: new Date(Date.now() - 5 * 60000) },
        { side: 'no', price: 0.32, size: 20000, timestamp: new Date(Date.now() - 15 * 60000) },
      ],
      priceHistory: [0.62, 0.63, 0.65, 0.66, 0.67, 0.68],
    },
    {
      id: 'SUI_ADOPTION_2025',
      question: 'Will Sui reach 1M daily active users in 2025?',
      yesPrice: 0.55,
      noPrice: 0.45,
      yesVolume: 1800000,
      noVolume: 1650000,
      category: 'technology',
      resolutionDate: new Date('2025-12-31'),
      aiConfidence: 0.72,
      aiEdge: 0.12,
      spread: 0.03,
      liquidityDepth: 350000,
      riskLevel: 'Medium',
      resolutionSource: 'Sui Network Stats',
      tvl: 2100000,
      volume24h: 280000,
      recentTrades: [
        { side: 'yes', price: 0.55, size: 45000, timestamp: new Date() },
      ],
      priceHistory: [0.50, 0.51, 0.52, 0.54, 0.55, 0.55],
    },
    {
      id: 'ETHEREUM_LAYER2',
      question: 'Will Ethereum Layer 2 TVL exceed $50B by Q3 2025?',
      yesPrice: 0.78,
      noPrice: 0.22,
      yesVolume: 3200000,
      noVolume: 900000,
      category: 'cryptocurrency',
      resolutionDate: new Date('2025-09-30'),
      aiConfidence: 0.88,
      aiEdge: 0.22,
      spread: 0.01,
      liquidityDepth: 600000,
      riskLevel: 'Low',
      resolutionSource: 'DeFiLlama API',
      tvl: 4100000,
      volume24h: 520000,
      recentTrades: [
        { side: 'yes', price: 0.78, size: 75000, timestamp: new Date() },
        { side: 'yes', price: 0.77, size: 60000, timestamp: new Date(Date.now() - 10 * 60000) },
      ],
      priceHistory: [0.72, 0.74, 0.75, 0.76, 0.77, 0.78],
    },
    {
      id: 'BITCOIN_ATH',
      question: 'Will Bitcoin reach new all-time high in 2025?',
      yesPrice: 0.82,
      noPrice: 0.18,
      yesVolume: 5100000,
      noVolume: 1100000,
      category: 'cryptocurrency',
      resolutionDate: new Date('2025-12-31'),
      aiConfidence: 0.91,
      aiEdge: 0.28,
      spread: 0.01,
      liquidityDepth: 800000,
      riskLevel: 'Low',
      resolutionSource: 'CoinMarketCap API',
      tvl: 6200000,
      volume24h: 780000,
      recentTrades: [
        { side: 'yes', price: 0.82, size: 100000, timestamp: new Date() },
        { side: 'yes', price: 0.81, size: 85000, timestamp: new Date(Date.now() - 3 * 60000) },
        { side: 'no', price: 0.18, size: 15000, timestamp: new Date(Date.now() - 20 * 60000) },
      ],
      priceHistory: [0.75, 0.77, 0.79, 0.80, 0.81, 0.82],
    },
    {
      id: 'AI_AGENT_ADOPTION',
      question: 'Will on-chain AI agents control >$10B TVL by 2025?',
      yesPrice: 0.42,
      noPrice: 0.58,
      yesVolume: 1400000,
      noVolume: 1900000,
      category: 'technology',
      resolutionDate: new Date('2025-12-31'),
      aiConfidence: 0.65,
      aiEdge: -0.08,
      spread: 0.05,
      liquidityDepth: 280000,
      riskLevel: 'High',
      resolutionSource: 'On-Chain Analytics',
      tvl: 1600000,
      volume24h: 190000,
      recentTrades: [],
      priceHistory: [0.38, 0.39, 0.40, 0.41, 0.42, 0.42],
    },
    {
      id: 'DEFI_SECURITY',
      question: 'Will major DeFi hack occur in Q1 2025?',
      yesPrice: 0.35,
      noPrice: 0.65,
      yesVolume: 950000,
      noVolume: 1750000,
      category: 'technology',
      resolutionDate: new Date('2025-03-31'),
      aiConfidence: 0.58,
      aiEdge: 0.05,
      spread: 0.08,
      liquidityDepth: 200000,
      riskLevel: 'High',
      resolutionSource: 'CertiK Reports',
      tvl: 1200000,
      volume24h: 140000,
      recentTrades: [],
      priceHistory: [0.32, 0.33, 0.34, 0.34, 0.35, 0.35],
    },
  ];
}

export default function MarketDiscovery() {
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletCapabilities, setWalletCapabilities] = useState<WalletCapabilities | null>(null);
  const [marketSource, setMarketSource] = useState<'onchain' | 'fixture' | 'none'>('fixture');
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus>({
    deepbook: { ready: false, message: 'Checking DeepBook integration...' },
    walrus: { ready: false, message: 'Checking Walrus integration...' },
  });
  const [walrusBlobId, setWalrusBlobId] = useState<string | null>(null);
  const [walrusBlobPreview, setWalrusBlobPreview] = useState<string>('');
  const [walrusActionMessage, setWalrusActionMessage] = useState<string>('');
  const [isArchivingToWalrus, setIsArchivingToWalrus] = useState(false);
  const [isJudgeModeRunning, setIsJudgeModeRunning] = useState(false);
  const [showJudgeScriptModal, setShowJudgeScriptModal] = useState(false);
  const [manualOnchainObjectIds, setManualOnchainObjectIds] = useState('');
  const [onchainLoadMessage, setOnchainLoadMessage] = useState('');
  const [isLoadingOnchainMarkets, setIsLoadingOnchainMarkets] = useState(false);
  const [openOrders, setOpenOrders] = useState<Array<{ owner: string; objectId: string; type: string }>>([]);
  const [openOrdersMessage, setOpenOrdersMessage] = useState('Connect wallet to load DeepBook open orders.');
  const [observabilityEvents, setObservabilityEvents] = useState<ObservabilityEntry[]>([]);
  const [judgeSteps, setJudgeSteps] = useState<JudgeStep[]>([
    { label: 'Connect wallet', status: 'pending' },
    { label: 'Load on-chain market', status: 'pending' },
    { label: 'Execute micro trade', status: 'pending' },
    { label: 'Archive snapshot to Walrus', status: 'pending' },
    { label: 'Load Walrus preview', status: 'pending' },
  ]);
  const [judgeModeMessage, setJudgeModeMessage] = useState<string>('Ready');

  const realOnlyMode = (process.env.NEXT_PUBLIC_DEMO_REAL_ONLY || '').toLowerCase() === 'true';
  const judgeScript = [
    { time: '0:00 - 0:15', cue: 'Problem', line: 'Prediction markets still require too much trust and too much manual operation.' },
    { time: '0:15 - 0:40', cue: 'What SAPM Does', line: 'SAPM combines AI agents, on-chain execution, and Walrus storage into one verifiable trading loop.' },
    { time: '0:40 - 1:05', cue: 'Proof 1: On-chain State', line: 'I load live markets directly from Sui objects and show package context in-app.' },
    { time: '1:05 - 1:35', cue: 'Proof 2: Wallet + Trade', line: 'I run Judge Mode, execute a micro trade, and show the real transaction digest.' },
    { time: '1:35 - 1:55', cue: 'Proof 3: Walrus Archive', line: 'The market snapshot is published to Walrus and read back immediately via aggregator endpoint.' },
    { time: '1:55 - 2:20', cue: 'Safety Controls', line: 'Trade execution enforces preflight balance checks, idempotency, bounded retries, and risk caps.' },
    { time: '2:20 - 2:45', cue: 'Why This Matters', line: 'This is not a mock. Judges can independently verify every artifact from this UI.' },
    { time: '2:45 - 3:00', cue: 'Close', line: 'SAPM is a sovereign, agentic prediction market stack ready to scale from testnet to production.' },
  ];

  // Trade execution
  const { executeTrade, positions, toasts, removeToast, lastTransactionDigest, lastTransactionNetwork } = useTradeExecution();

  const mapOnchainMarketsToView = (onchainMarkets: Awaited<ReturnType<typeof marketDataService.getOnchainMarkets>>) => {
    return onchainMarkets.map((item) => ({
      ...item,
      resolutionDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      aiConfidence: Math.max(0.5, Math.min(0.95, Math.abs(item.yesPrice - 0.5) * 2 + 0.5)),
      aiEdge: (item.yesPrice - 0.5) * 0.2,
      spread: Math.max(0.005, Math.abs(1 - (item.yesPrice + item.noPrice))),
      liquidityDepth: Math.max(100000, item.tvl * 0.2),
      resolutionSource: 'On-chain object state',
      recentTrades: [],
      priceHistory: [item.yesPrice * 0.96, item.yesPrice * 0.98, item.yesPrice],
    }));
  };

  const loadOnchainMarketsFromInput = async (rawInput: string, silent = false): Promise<MarketData[]> => {
    const ids = marketDataService.normalizeObjectIds(rawInput.split(/[\s,]+/g));
    if (ids.length === 0) {
      if (!silent) {
        setOnchainLoadMessage('Paste one or more valid Sui object IDs (0x...) to load on-chain markets.');
      }
      return [];
    }

    setIsLoadingOnchainMarkets(true);
    try {
      const onchainMarkets = await marketDataService.getOnchainMarketsFromObjectIds(ids);
      const mapped = mapOnchainMarketsToView(onchainMarkets);

      if (mapped.length === 0) {
        if (!silent) {
          setOnchainLoadMessage('No on-chain markets resolved from provided IDs. Confirm object types/IDs and network.');
        }
        return [];
      }

      setMarkets(mapped);
      setMarketSource('onchain');
      setError(null);
      const normalized = ids.join(',');
      setManualOnchainObjectIds(normalized);
      localStorage.setItem(LOCAL_ONCHAIN_OBJECT_IDS_KEY, normalized);
      if (!silent) {
        setOnchainLoadMessage(`Loaded ${mapped.length} on-chain market(s). Judge Mode is ready.`);
      }
      return mapped;
    } catch (loadError) {
      if (!silent) {
        setOnchainLoadMessage(loadError instanceof Error ? loadError.message : 'Failed to load on-chain markets.');
      }
      return [];
    } finally {
      setIsLoadingOnchainMarkets(false);
    }
  };

  // Initialize with real market data simulation
  useEffect(() => {
    const bootTimeoutId = window.setTimeout(() => {
      setLoading((current) => {
        if (!current) {
          return current;
        }

        if (!realOnlyMode && markets.length === 0) {
          setMarkets(createFixtureMarkets());
          setMarketSource('fixture');
        }

        setError('Startup timed out while contacting Sui RPC. Showing fallback data.');
        setOnchainLoadMessage('RPC request timed out. Verify network access and testnet endpoint health.');
        return false;
      });
    }, PAGE_BOOT_TIMEOUT_MS);

    const fetchMarkets = async () => {
      try {
        setLoading(true);
        const realMarkets = createFixtureMarkets();
        const savedOnchainIds = localStorage.getItem(LOCAL_ONCHAIN_OBJECT_IDS_KEY) || '';
        if (savedOnchainIds) {
          setManualOnchainObjectIds(savedOnchainIds);
        }

        let onchainMarkets = savedOnchainIds
          ? await marketDataService.getOnchainMarketsFromObjectIds(savedOnchainIds.split(/[\s,]+/g))
          : [];

        if (onchainMarkets.length === 0) {
          onchainMarkets = await marketDataService.getOnchainMarkets();
        }

        if (onchainMarkets.length > 0) {
          setMarkets(mapOnchainMarketsToView(onchainMarkets));
          setMarketSource('onchain');
          setOnchainLoadMessage('On-chain markets loaded.');
        } else if (realOnlyMode) {
          setMarkets([]);
          setMarketSource('none');
          setError('Real-only mode is active. Configure NEXT_PUBLIC_SUI_MARKET_OBJECT_IDS or paste live object IDs in the Judge Mode panel.');
        } else {
          setMarkets(realMarkets);
          setMarketSource('fixture');
          setError(null);
        }

        // Load wallet from localStorage
        const savedAddress = localStorage.getItem('walletAddress');
        if (isValidSuiHexAddress(savedAddress)) {
          setWalletAddress(savedAddress);
          setWalletConnected(true);
        } else {
          localStorage.removeItem('walletAddress');
          localStorage.removeItem('walletId');
          setWalletAddress(null);
          setWalletConnected(false);
        }
      } catch (err) {
        setError('Failed to load market data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMarkets();

    return () => {
      clearTimeout(bootTimeoutId);
    };
  }, []);

  useEffect(() => {
    const onWalletUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ connected: boolean; address: string | null }>;
      const nextAddress = customEvent.detail?.address || null;
      const nextConnected = Boolean(customEvent.detail?.connected) && isValidSuiHexAddress(nextAddress);

      setWalletConnected(nextConnected);
      setWalletAddress(nextConnected ? nextAddress : null);
      if (!nextConnected) {
        localStorage.removeItem('walletAddress');
        localStorage.removeItem('walletId');
      }
    };

    const onStorage = () => {
      const savedAddress = localStorage.getItem('walletAddress');
      const validAddress = isValidSuiHexAddress(savedAddress) ? savedAddress : null;
      setWalletConnected(Boolean(validAddress));
      setWalletAddress(validAddress);
      if (!validAddress) {
        localStorage.removeItem('walletAddress');
        localStorage.removeItem('walletId');
      }
    };

    window.addEventListener('sapm:wallet-updated', onWalletUpdate as EventListener);
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('sapm:wallet-updated', onWalletUpdate as EventListener);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  useEffect(() => {
    const wallets = getCompatibleWallets();
    const selectedId = localStorage.getItem('walletId');
    const active = wallets.find((wallet) => (wallet.id || wallet.name) === selectedId) || wallets[0];

    if (!active) {
      setWalletCapabilities(null);
      return;
    }

    const featureNames = Object.keys(active.features || {}).sort();
    setWalletCapabilities({
      walletName: active.name,
      chainCount: active.chains.length,
      featureCount: featureNames.length,
      features: featureNames.slice(0, 6),
    });
  }, [walletConnected]);

  useEffect(() => {
    const loadIntegrations = async () => {
      const [deepbook, walrus] = await Promise.all([
        deepbookService.getStatus(),
        walrusService.getStatus(),
      ]);

      setIntegrationStatus({
        deepbook: {
          ready: deepbook.rpcReachable && (deepbook.packageConfigured ? deepbook.packageReachable : true),
          message: deepbook.packageConfigured
            ? deepbook.packageReachable
              ? `Connected to DeepBook package ${deepbook.packageId.slice(0, 8)}...${deepbook.packageId.slice(-6)}`
              : deepbook.error || 'DeepBook package configured but not reachable'
            : `RPC connected. Package checks default to ${SUI_PACKAGE_ID.slice(0, 8)}...${SUI_PACKAGE_ID.slice(-6)}.`,
        },
        walrus: {
          ready: walrus.aggregatorReachable && walrus.publisherReachable,
          message: walrus.error || 'Aggregator and publisher endpoints reachable',
        },
      });
    };

    loadIntegrations().catch((err) => {
      setIntegrationStatus({
        deepbook: { ready: false, message: err instanceof Error ? err.message : 'DeepBook status failed' },
        walrus: { ready: false, message: 'Walrus status failed' },
      });
    });
  }, []);

  useEffect(() => {
    let active = true;

    const loadOpenOrders = async () => {
      if (!walletConnected || !walletAddress) {
        setOpenOrders([]);
        setOpenOrdersMessage('Connect wallet to load DeepBook open orders.');
        return;
      }

      setOpenOrdersMessage('Loading open orders...');
      try {
        const orders = await deepbookService.getOpenOrders(walletAddress);
        if (!active) {
          return;
        }

        setOpenOrders(orders);
        setOpenOrdersMessage(orders.length > 0 ? `${orders.length} open order object(s) found.` : 'No open orders found.');
      } catch (error) {
        if (!active) {
          return;
        }

        setOpenOrders([]);
        setOpenOrdersMessage(error instanceof Error ? error.message : 'Failed to load open orders.');
      }
    };

    loadOpenOrders();

    return () => {
      active = false;
    };
  }, [walletConnected, walletAddress]);

  useEffect(() => {
    const handle = window.setInterval(() => {
      const state = window as typeof window & { __SAPM_OBSERVABILITY__?: ObservabilityEntry[] };
      const entries = state.__SAPM_OBSERVABILITY__ || [];
      setObservabilityEvents(entries.slice(-8).reverse());
    }, 1200);

    return () => {
      window.clearInterval(handle);
    };
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'volume' | 'probability' | 'confidence' | 'tvl'>('tvl');
  const [viewMode, setViewMode] = useState<'board' | 'cards'>('board');
  const [selectedMarket, setSelectedMarket] = useState<MarketData | null>(null);
  const [boardTicketMarketId, setBoardTicketMarketId] = useState<string | null>(null);
  const [boardTicketSide, setBoardTicketSide] = useState<'yes' | 'no'>('yes');

  const categories = useMemo(() => {
    return Array.from(new Set(markets.map(m => m.category).filter((value): value is string => Boolean(value))));
  }, [markets]);

  const filteredAndSortedMarkets = useMemo(() => {
    return markets
      .filter(m => {
        if (searchTerm) {
          return m.question.toLowerCase().includes(searchTerm.toLowerCase());
        }
        return true;
      })
      .filter(m => {
        if (selectedCategory) {
          return m.category === selectedCategory;
        }
        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'probability':
            return Math.abs(b.yesPrice - 0.5) - Math.abs(a.yesPrice - 0.5);
          case 'confidence':
            return (b.aiConfidence || 0) - (a.aiConfidence || 0);
          case 'tvl':
            return (b.tvl || 0) - (a.tvl || 0);
          default:
            return (b.volume24h || 0) - (a.volume24h || 0);
        }
      });
  }, [markets, searchTerm, selectedCategory, sortBy]);

  const daysUntilResolution = (date?: Date) => {
    if (!date) return null;
    const days = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 1) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days < 30) return `${days}d`;
    return `${Math.ceil(days / 30)}mo`;
  };

  const getPriceChange = (history?: number[]) => {
    if (!history || history.length < 2) return 0;
    return ((history[history.length - 1] - history[0]) / history[0]) * 100;
  };

  const getRiskColor = (risk?: string) => {
    switch (risk) {
      case 'Low': return '#10b981';
      case 'Medium': return '#f59e0b';
      case 'High': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(0)}k`;
    return `$${num.toFixed(0)}`;
  };

  const totalTVL = filteredAndSortedMarkets.reduce((sum, m) => sum + (m.tvl || 0), 0);
  const total24hVolume = filteredAndSortedMarkets.reduce((sum, m) => sum + (m.volume24h || 0), 0);

  const topMovers = useMemo(() => {
    return filteredAndSortedMarkets
      .map((market) => ({
        market,
        change: getPriceChange(market.priceHistory),
      }))
      .filter((entry) => Number.isFinite(entry.change))
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      .slice(0, 4);
  }, [filteredAndSortedMarkets]);

  const boardTicketMarket = useMemo(() => {
    if (filteredAndSortedMarkets.length === 0) {
      return null;
    }
    const selected = filteredAndSortedMarkets.find((market) => market.id === boardTicketMarketId);
    return selected || filteredAndSortedMarkets[0];
  }, [boardTicketMarketId, filteredAndSortedMarkets]);

  const archiveSelectedMarketToWalrus = async () => {
    if (!boardTicketMarket) {
      setWalrusActionMessage('Select a market before archiving to Walrus.');
      return;
    }

    setIsArchivingToWalrus(true);
    setWalrusActionMessage('Publishing market snapshot to Walrus...');

    try {
      const payload = {
        source: 'sapm-market-snapshot',
        createdAt: new Date().toISOString(),
        walletAddress,
        market: boardTicketMarket,
      };

      const manifest = await walrusService.buildSnapshotManifest({
        marketId: boardTicketMarket.id,
        walletAddress: walletAddress || undefined,
        payload,
        previousBlobId: walrusBlobId || undefined,
      });

      const result = await walrusService.publishMarketSnapshot(manifest);
      setWalrusBlobId(result.blobId);
      setWalrusBlobPreview('');
      setWalrusActionMessage(`Published to Walrus blob ${result.blobId.slice(0, 8)}...${result.blobId.slice(-6)}.`);
    } catch (error) {
      setWalrusActionMessage(error instanceof Error ? error.message : 'Walrus publish failed.');
    } finally {
      setIsArchivingToWalrus(false);
    }
  };

  const loadWalrusBlobPreview = async () => {
    if (!walrusBlobId) {
      setWalrusActionMessage('No Walrus blob ID available yet.');
      return;
    }

    try {
      const blob = await walrusService.getBlob(walrusBlobId);
      const serialized = typeof blob === 'string' ? blob : JSON.stringify(blob, null, 2);
      setWalrusBlobPreview(serialized.slice(0, 700));
      setWalrusActionMessage('Loaded Walrus snapshot preview.');
    } catch (error) {
      setWalrusActionMessage(error instanceof Error ? error.message : 'Failed to load Walrus blob.');
    }
  };

  const runJudgeMode = async () => {
    const updateStep = (index: number, status: JudgeStep['status'], detail?: string) => {
      setJudgeSteps((prev) => prev.map((step, idx) => (idx === index ? { ...step, status, detail } : step)));
    };

    setIsJudgeModeRunning(true);
    setJudgeModeMessage('Running Judge Mode...');
    setJudgeSteps((prev) => prev.map((step) => ({ ...step, status: 'pending', detail: undefined })));

    try {
      updateStep(0, walletConnected ? 'done' : 'failed', walletConnected ? 'Wallet connected' : 'Connect wallet from top bar first');
      if (!walletConnected) {
        throw new Error('Wallet is not connected.');
      }

      let judgeMarkets = markets;
      if (!(marketSource === 'onchain' && judgeMarkets.length > 0)) {
        updateStep(1, 'running', 'Attempting to load on-chain market IDs...');
        const loaded = await loadOnchainMarketsFromInput(manualOnchainObjectIds, true);
        if (loaded.length > 0) {
          judgeMarkets = loaded;
        }
      }

      updateStep(1, marketSource === 'onchain' || judgeMarkets.length > 0 ? 'done' : 'failed', judgeMarkets.length > 0 ? 'Using on-chain data' : 'Paste valid on-chain object IDs first');
      if (judgeMarkets.length === 0) {
        throw new Error('On-chain market is required for Judge Mode. Paste market object IDs and click Load On-chain Markets.');
      }

      const activeMarket = boardTicketMarket || judgeMarkets[0];
      if (!activeMarket) {
        throw new Error('No active market available.');
      }

      updateStep(2, 'running', `Submitting micro trade on ${activeMarket.id.slice(0, 8)}...`);
      const tradeResult = await executeTrade({
        marketId: activeMarket.id,
        side: 'yes',
        amount: 0.01,
        executionPrice: activeMarket.yesPrice,
        timestamp: new Date(),
      });

      if (tradeResult.status !== 'success' || !tradeResult.transactionHash) {
        updateStep(2, 'failed', tradeResult.error || 'Trade failed');
        throw new Error(tradeResult.error || 'Judge Mode trade failed');
      }

      updateStep(2, 'done', `Digest ${tradeResult.transactionHash.slice(0, 10)}...`);
      updateStep(3, 'running', 'Publishing snapshot...');

      const manifest = await walrusService.buildSnapshotManifest({
        marketId: activeMarket.id,
        txDigest: tradeResult.transactionHash,
        walletAddress: walletAddress || undefined,
        previousBlobId: walrusBlobId || undefined,
        payload: {
        source: 'judge-mode-snapshot',
        createdAt: new Date().toISOString(),
        walletAddress,
        txDigest: tradeResult.transactionHash,
        market: activeMarket,
        },
      });

      const publishResult = await walrusService.publishMarketSnapshot(manifest);
      setWalrusBlobId(publishResult.blobId);
      updateStep(3, 'done', `Blob ${publishResult.blobId.slice(0, 10)}...`);

      updateStep(4, 'running', 'Loading blob preview...');
      const blob = await walrusService.getBlob(publishResult.blobId);
      const serialized = typeof blob === 'string' ? blob : JSON.stringify(blob, null, 2);
      setWalrusBlobPreview(serialized.slice(0, 700));
      updateStep(4, 'done', 'Preview loaded');
      setJudgeModeMessage('Judge Mode complete: on-chain trade + Walrus proof captured.');
    } catch (error) {
      setJudgeModeMessage(error instanceof Error ? error.message : 'Judge Mode failed.');
    } finally {
      setIsJudgeModeRunning(false);
    }
  };

  useEffect(() => {
    if (filteredAndSortedMarkets.length === 0) {
      setBoardTicketMarketId(null);
      return;
    }

    const stillExists = filteredAndSortedMarkets.some((market) => market.id === boardTicketMarketId);
    if (!boardTicketMarketId || !stillExists) {
      setBoardTicketMarketId(filteredAndSortedMarkets[0].id);
    }
  }, [boardTicketMarketId, filteredAndSortedMarkets]);

  const maxLiquidityDepth = useMemo(() => {
    const max = filteredAndSortedMarkets.reduce((best, market) => {
      return Math.max(best, market.liquidityDepth || 0);
    }, 0);
    return max > 0 ? max : 1;
  }, [filteredAndSortedMarkets]);

  useEffect(() => {
    if (!boardTicketMarket) {
      return;
    }

    const payload = {
      id: boardTicketMarket.id,
      question: boardTicketMarket.question,
      yesPrice: boardTicketMarket.yesPrice,
      noPrice: boardTicketMarket.noPrice,
      aiConfidence: boardTicketMarket.aiConfidence || 0,
      spread: boardTicketMarket.spread || 0,
      liquidityDepth: boardTicketMarket.liquidityDepth || 0,
      volume24h: boardTicketMarket.volume24h || 0,
      riskLevel: boardTicketMarket.riskLevel || 'Medium',
      updatedAt: Date.now(),
    };

    try {
      localStorage.setItem(ACTIVE_MARKET_INSIGHT_KEY, JSON.stringify(payload));
      window.dispatchEvent(new CustomEvent('sapm:active-market-insight', { detail: payload }));
    } catch (err) {
      console.warn('Unable to persist active market insight context', err);
    }
  }, [boardTicketMarket]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚡</div>
          <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>Loading Markets...</div>
          <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.5rem' }}>Connecting to Sui blockchain</div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        color: '#e2e8f0',
        padding: '5.5rem 1rem 2rem 1rem',
        backgroundColor: '#060b17',
        backgroundImage:
          'radial-gradient(1200px 380px at 20% -10%, rgba(34,211,238,0.2), transparent 55%), radial-gradient(900px 320px at 90% 0%, rgba(56,189,248,0.12), transparent 60%), linear-gradient(180deg, #0b1220 0%, #060b17 40%, #050914 100%)',
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto 1.25rem auto' }}>
        <div
          style={{
            border: '1px solid rgba(148, 163, 184, 0.25)',
            borderRadius: '1rem',
            background: 'linear-gradient(135deg, rgba(15,23,42,0.92), rgba(2,8,23,0.84))',
            boxShadow: '0 18px 45px rgba(3, 7, 18, 0.55)',
            padding: '1.35rem 1.4rem',
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ maxWidth: '760px' }}>
              <div style={{ color: '#67e8f9', fontSize: '0.76rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Live Prediction Exchange
              </div>
              <h1 style={{ margin: '0.45rem 0 0.4rem 0', fontSize: '1.8rem', lineHeight: 1.15, color: '#f8fafc' }}>
                Trade Real-Time Probability Curves On Sui
              </h1>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.5 }}>
                Market-first layout, clear YES/NO pricing, and faster decision context. Optimized for scanning, confidence, and execution.
              </p>
              <div style={{ marginTop: '0.55rem', color: marketSource === 'onchain' ? '#86efac' : marketSource === 'none' ? '#fca5a5' : '#fbbf24', fontSize: '0.82rem', fontWeight: 700 }}>
                Data Source: {marketSource === 'onchain' ? 'On-chain market objects' : marketSource === 'none' ? 'Real-only mode waiting for live object IDs' : 'Fixture fallback (set NEXT_PUBLIC_SUI_MARKET_OBJECT_IDS)'}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(120px, 1fr))', gap: '0.6rem', minWidth: '260px' }}>
              <div style={{ borderRadius: '0.75rem', border: '1px solid #1e293b', backgroundColor: '#0b1325', padding: '0.7rem 0.8rem' }}>
                <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Total TVL</div>
                <div style={{ color: '#86efac', fontWeight: 700, marginTop: '0.2rem' }}>{formatNumber(totalTVL)}</div>
              </div>
              <div style={{ borderRadius: '0.75rem', border: '1px solid #1e293b', backgroundColor: '#0b1325', padding: '0.7rem 0.8rem' }}>
                <div style={{ color: '#64748b', fontSize: '0.72rem' }}>24h Volume</div>
                <div style={{ color: '#7dd3fc', fontWeight: 700, marginTop: '0.2rem' }}>{formatNumber(total24hVolume)}</div>
              </div>
              <div style={{ borderRadius: '0.75rem', border: '1px solid #1e293b', backgroundColor: '#0b1325', padding: '0.7rem 0.8rem' }}>
                <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Markets</div>
                <div style={{ color: '#c4b5fd', fontWeight: 700, marginTop: '0.2rem' }}>{filteredAndSortedMarkets.length}</div>
              </div>
              <div style={{ borderRadius: '0.75rem', border: '1px solid #1e293b', backgroundColor: '#0b1325', padding: '0.7rem 0.8rem' }}>
                <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Connected</div>
                <div style={{ color: walletConnected ? '#34d399' : '#fbbf24', fontWeight: 700, marginTop: '0.2rem' }}>
                  {walletConnected ? 'Wallet Ready' : 'Read-Only'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            border: '1px solid #23344b',
            borderRadius: '0.85rem',
            background: 'linear-gradient(180deg, rgba(15,23,42,0.95), rgba(5,10,22,0.92))',
            boxShadow: '0 10px 28px rgba(2, 6, 23, 0.42)',
            padding: '0.95rem 1rem',
            marginBottom: '1.2rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '0.8rem',
          }}
        >
          <div style={{ border: '1px solid #334155', borderRadius: '0.6rem', padding: '0.7rem 0.8rem', backgroundColor: '#0b1324' }}>
            <ProtocolBadge accent="#7dd3fc" symbol="DB" label="DeepBook" logoSrc="/brand/deepbook.svg" />
            <div style={{ color: integrationStatus.deepbook.ready ? '#86efac' : '#fca5a5', fontWeight: 700, marginTop: '0.35rem', fontSize: '0.86rem' }}>
              {integrationStatus.deepbook.ready ? 'Ready' : 'Needs Config'}
            </div>
            <div style={{ color: '#94a3b8', fontSize: '0.78rem', lineHeight: 1.5, marginTop: '0.35rem' }}>{integrationStatus.deepbook.message}</div>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.45rem' }}>
              <a href={DEEPBOOK_SANDBOX_URL} target="_blank" rel="noopener noreferrer" style={{ color: '#67e8f9', fontSize: '0.78rem', textDecoration: 'none', fontWeight: 700 }}>
                Open DeepBook Sandbox
              </a>
              <a href={DEEPBOOK_DOCS_URL} target="_blank" rel="noopener noreferrer" style={{ color: '#93c5fd', fontSize: '0.78rem', textDecoration: 'none', fontWeight: 700 }}>
                DeepBook Docs
              </a>
            </div>
            <div style={{ marginTop: '0.55rem', color: '#94a3b8', fontSize: '0.75rem', lineHeight: 1.45 }}>
              {openOrdersMessage}
            </div>
            {openOrders.length > 0 && (
              <div style={{ marginTop: '0.4rem', display: 'grid', gap: '0.22rem' }}>
                {openOrders.slice(0, 4).map((order) => (
                  <div key={order.objectId} style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
                    {order.objectId.slice(0, 10)}... ({order.type.split('::').slice(-1)[0]})
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ border: '1px solid #334155', borderRadius: '0.6rem', padding: '0.7rem 0.8rem', backgroundColor: '#0b1324' }}>
            <ProtocolBadge accent="#a5b4fc" symbol="W" label="Walrus" logoSrc="/brand/walrus.svg" />
            <div style={{ color: integrationStatus.walrus.ready ? '#86efac' : '#fca5a5', fontWeight: 700, marginTop: '0.35rem', fontSize: '0.86rem' }}>
              {integrationStatus.walrus.ready ? 'Endpoints Reachable' : 'Endpoint Check Failed'}
            </div>
            <div style={{ color: '#94a3b8', fontSize: '0.78rem', lineHeight: 1.5, marginTop: '0.35rem' }}>{integrationStatus.walrus.message}</div>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.45rem' }}>
              <a href={WALRUS_AGGREGATOR_URL} target="_blank" rel="noopener noreferrer" style={{ color: '#67e8f9', fontSize: '0.78rem', textDecoration: 'none', fontWeight: 700 }}>
                Open Walrus Aggregator
              </a>
              <a href={WALRUS_DOCS_URL} target="_blank" rel="noopener noreferrer" style={{ color: '#93c5fd', fontSize: '0.78rem', textDecoration: 'none', fontWeight: 700 }}>
                Walrus Repo
              </a>
            </div>
          </div>

          <div style={{ border: '1px solid #334155', borderRadius: '0.6rem', padding: '0.7rem 0.8rem', backgroundColor: '#0b1324' }}>
            <ProtocolBadge accent="#5eead4" symbol="S" label="Sui Wallet + Package" logoSrc="/brand/sui.svg" />
            <div style={{ color: walletConnected ? '#86efac' : '#fbbf24', fontWeight: 700, marginTop: '0.35rem', fontSize: '0.86rem' }}>
              {walletConnected ? `Connected ${walletAddress?.slice(0, 6)}...${walletAddress?.slice(-4)}` : 'Connect wallet to execute'}
            </div>
            <a href={SUISCAN_PACKAGE_URL} target="_blank" rel="noopener noreferrer" style={{ color: '#67e8f9', fontSize: '0.78rem', textDecoration: 'none', fontWeight: 700 }}>
              Package {SUI_PACKAGE_ID.slice(0, 8)}...{SUI_PACKAGE_ID.slice(-6)}
            </a>
            {walletCapabilities && (
              <div style={{ marginTop: '0.45rem', color: '#cbd5e1', fontSize: '0.76rem', lineHeight: 1.5 }}>
                {walletCapabilities.walletName} | Chains {walletCapabilities.chainCount} | Features {walletCapabilities.featureCount}
                <br />
                {walletCapabilities.features.join(', ')}
              </div>
            )}
          </div>

          <div style={{ border: '1px solid #334155', borderRadius: '0.6rem', padding: '0.7rem 0.8rem', backgroundColor: '#0b1324' }}>
            <div style={{ color: '#67e8f9', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Walrus Snapshot
            </div>
            <div style={{ color: '#94a3b8', fontSize: '0.78rem', lineHeight: 1.5, marginTop: '0.35rem' }}>
              Archive selected market metadata to Walrus and fetch preview back via aggregator.
            </div>
            <div style={{ display: 'flex', gap: '0.45rem', marginTop: '0.55rem', flexWrap: 'wrap' }}>
              <button
                onClick={archiveSelectedMarketToWalrus}
                disabled={isArchivingToWalrus}
                style={{
                  minHeight: '38px',
                  borderRadius: '0.45rem',
                  border: '1px solid #155e75',
                  backgroundColor: '#083344',
                  color: '#67e8f9',
                  fontWeight: 700,
                  cursor: isArchivingToWalrus ? 'not-allowed' : 'pointer',
                  padding: '0.35rem 0.6rem',
                  fontSize: '0.78rem',
                }}
              >
                {isArchivingToWalrus ? 'Publishing...' : 'Archive Selected Market'}
              </button>
              <button
                onClick={loadWalrusBlobPreview}
                disabled={!walrusBlobId}
                style={{
                  minHeight: '38px',
                  borderRadius: '0.45rem',
                  border: '1px solid #334155',
                  backgroundColor: '#111827',
                  color: '#cbd5e1',
                  fontWeight: 600,
                  cursor: walrusBlobId ? 'pointer' : 'not-allowed',
                  padding: '0.35rem 0.6rem',
                  fontSize: '0.78rem',
                }}
              >
                Load Blob Preview
              </button>
            </div>
            {walrusBlobId && (
              <a
                href={`${WALRUS_AGGREGATOR_URL}/v1/blobs/${walrusBlobId}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#67e8f9', fontSize: '0.76rem', textDecoration: 'none', fontWeight: 700, display: 'inline-block', marginTop: '0.45rem' }}
              >
                Blob {walrusBlobId.slice(0, 8)}...{walrusBlobId.slice(-6)}
              </a>
            )}
            {walrusActionMessage && (
              <div style={{ marginTop: '0.45rem', color: '#94a3b8', fontSize: '0.75rem', lineHeight: 1.45 }}>
                {walrusActionMessage}
              </div>
            )}
            {walrusBlobPreview && (
              <pre
                style={{
                  marginTop: '0.5rem',
                  maxHeight: '120px',
                  overflow: 'auto',
                  backgroundColor: '#020617',
                  border: '1px solid #1e293b',
                  borderRadius: '0.45rem',
                  padding: '0.45rem',
                  color: '#93c5fd',
                  fontSize: '0.7rem',
                }}
              >
                {walrusBlobPreview}
              </pre>
            )}
          </div>

          <div style={{ border: '1px solid #334155', borderRadius: '0.6rem', padding: '0.7rem 0.8rem', backgroundColor: '#0b1324' }}>
            <div style={{ color: '#67e8f9', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Safety Active
            </div>
            <div style={{ marginTop: '0.35rem', color: '#86efac', fontSize: '0.78rem', lineHeight: 1.55 }}>
              Balance preflight, idempotency guard, bounded retry policy, and notional risk cap are enabled in trade execution.
            </div>
            <div style={{ marginTop: '0.4rem', color: '#cbd5e1', fontSize: '0.76rem', lineHeight: 1.45 }}>
              Last digest: {lastTransactionDigest ? `${lastTransactionDigest.slice(0, 12)}...` : 'none yet'}
            </div>
            {lastTransactionDigest && lastTransactionNetwork && (
              <a
                href={`https://suiscan.xyz/${lastTransactionNetwork}/tx/${lastTransactionDigest}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#67e8f9', fontSize: '0.76rem', textDecoration: 'none', fontWeight: 700 }}
              >
                Open latest transaction proof
              </a>
            )}
          </div>

          <div style={{ border: '1px solid #334155', borderRadius: '0.6rem', padding: '0.7rem 0.8rem', backgroundColor: '#0b1324' }}>
            <div style={{ color: '#67e8f9', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Observability
            </div>
            <div style={{ marginTop: '0.35rem', color: '#94a3b8', fontSize: '0.76rem', lineHeight: 1.45 }}>
              Recent runtime events for deepbook/walrus/trade actions.
            </div>
            {observabilityEvents.length === 0 && (
              <div style={{ marginTop: '0.45rem', color: '#94a3b8', fontSize: '0.74rem' }}>No events captured yet.</div>
            )}
            {observabilityEvents.length > 0 && (
              <div style={{ marginTop: '0.45rem', display: 'grid', gap: '0.25rem' }}>
                {observabilityEvents.map((event, index) => (
                  <div key={`${event.ts}-${event.action}-${index}`} style={{ fontSize: '0.72rem', color: event.severity === 'error' ? '#fca5a5' : event.severity === 'warn' ? '#fcd34d' : '#cbd5e1' }}>
                    [{event.category}] {event.action} ({event.severity})
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ border: '1px solid #334155', borderRadius: '0.6rem', padding: '0.7rem 0.8rem', backgroundColor: '#0b1324' }}>
            <div style={{ color: '#67e8f9', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Judge Mode
            </div>
            <div style={{ color: '#94a3b8', fontSize: '0.78rem', lineHeight: 1.5, marginTop: '0.35rem' }}>
              One-click guided proof: connect, on-chain read, micro trade, Walrus archive, preview.
            </div>
            <textarea
              value={manualOnchainObjectIds}
              onChange={(event) => setManualOnchainObjectIds(event.target.value)}
              placeholder="Paste on-chain market object IDs (comma or newline separated)"
              style={{
                width: '100%',
                minHeight: '76px',
                marginTop: '0.5rem',
                borderRadius: '0.45rem',
                border: '1px solid #334155',
                backgroundColor: '#020617',
                color: '#e2e8f0',
                padding: '0.5rem 0.55rem',
                fontSize: '0.74rem',
                fontFamily: 'inherit',
              }}
            />
            <button
              onClick={async () => {
                await loadOnchainMarketsFromInput(manualOnchainObjectIds);
              }}
              disabled={isLoadingOnchainMarkets}
              style={{
                marginTop: '0.4rem',
                minHeight: '38px',
                borderRadius: '0.45rem',
                border: '1px solid #334155',
                backgroundColor: '#111827',
                color: '#cbd5e1',
                fontWeight: 600,
                cursor: isLoadingOnchainMarkets ? 'not-allowed' : 'pointer',
                padding: '0.35rem 0.7rem',
                fontSize: '0.76rem',
              }}
            >
              {isLoadingOnchainMarkets ? 'Loading On-chain Markets...' : 'Load On-chain Markets'}
            </button>
            {onchainLoadMessage && (
              <div style={{ marginTop: '0.35rem', color: '#94a3b8', fontSize: '0.74rem', lineHeight: 1.45 }}>{onchainLoadMessage}</div>
            )}
            <button
              onClick={runJudgeMode}
              disabled={isJudgeModeRunning}
              style={{
                marginTop: '0.55rem',
                minHeight: '40px',
                borderRadius: '0.45rem',
                border: '1px solid #155e75',
                backgroundColor: '#083344',
                color: '#67e8f9',
                fontWeight: 700,
                cursor: isJudgeModeRunning ? 'not-allowed' : 'pointer',
                padding: '0.35rem 0.7rem',
                fontSize: '0.78rem',
              }}
            >
              {isJudgeModeRunning ? 'Running...' : 'Run Judge Mode'}
            </button>
            <button
              onClick={() => setShowJudgeScriptModal(true)}
              style={{
                marginTop: '0.45rem',
                minHeight: '38px',
                borderRadius: '0.45rem',
                border: '1px solid #334155',
                backgroundColor: '#111827',
                color: '#cbd5e1',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '0.35rem 0.7rem',
                fontSize: '0.76rem',
              }}
            >
              Open Judge Script
            </button>
            <div style={{ marginTop: '0.45rem', color: '#cbd5e1', fontSize: '0.76rem' }}>{judgeModeMessage}</div>
            <div style={{ marginTop: '0.45rem', display: 'grid', gap: '0.32rem' }}>
              {judgeSteps.map((step) => (
                <div key={step.label} style={{ fontSize: '0.74rem', color: step.status === 'done' ? '#86efac' : step.status === 'failed' ? '#fca5a5' : step.status === 'running' ? '#fcd34d' : '#94a3b8' }}>
                  {step.status === 'done' ? '✓' : step.status === 'failed' ? '✗' : step.status === 'running' ? '…' : '○'} {step.label}{step.detail ? `: ${step.detail}` : ''}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.94), rgba(15, 23, 42, 0.88))',
        borderRadius: '0.9rem',
        boxShadow: '0 10px 24px rgba(2, 6, 23, 0.45)',
        padding: '1.5rem',
        marginBottom: '2rem',
        border: '1px solid rgba(100, 116, 139, 0.4)',
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{ marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder="🔍 Search prediction markets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.875rem 1.25rem',
              fontSize: '1rem',
              border: '1px solid #334155',
              borderRadius: '0.6rem',
              fontFamily: 'inherit',
              backgroundColor: '#020617',
              color: '#f1f5f9',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#cbd5e1' }}>
              Category:
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              <button
                onClick={() => setSelectedCategory(null)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '9999px',
                  border: selectedCategory === null ? '1px solid #38bdf8' : '1px solid #334155',
                  cursor: 'pointer',
                  backgroundColor: selectedCategory === null ? '#082f49' : '#0f172a',
                  color: selectedCategory === null ? 'white' : '#cbd5e1',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                  transition: 'all 0.2s',
                }}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '9999px',
                    border: selectedCategory === cat ? '1px solid #38bdf8' : '1px solid #334155',
                    cursor: 'pointer',
                    backgroundColor: selectedCategory === cat ? '#082f49' : '#0f172a',
                    color: selectedCategory === cat ? 'white' : '#cbd5e1',
                    fontWeight: '500',
                    fontSize: '0.875rem',
                    textTransform: 'capitalize',
                    transition: 'all 0.2s',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#cbd5e1' }}>
              Sort By:
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid #334155',
                marginTop: '0.5rem',
                fontFamily: 'inherit',
                fontSize: '0.875rem',
                backgroundColor: '#020617',
                color: '#e2e8f0',
              }}
            >
              <option value="tvl">Highest TVL</option>
              <option value="volume">24h Volume</option>
              <option value="probability">Most Certain</option>
              <option value="confidence">Highest AI Confidence</option>
            </select>
          </div>

          <div style={{ minWidth: '180px' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#cbd5e1' }}>
              Layout:
            </label>
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.45rem' }}>
              <button
                onClick={() => setViewMode('board')}
                style={{
                  flex: 1,
                  minHeight: '44px',
                  borderRadius: '0.5rem',
                  border: viewMode === 'board' ? '1px solid #22d3ee' : '1px solid #334155',
                  backgroundColor: viewMode === 'board' ? '#082f49' : '#020617',
                  color: viewMode === 'board' ? '#67e8f9' : '#94a3b8',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Board
              </button>
              <button
                onClick={() => setViewMode('cards')}
                style={{
                  flex: 1,
                  minHeight: '44px',
                  borderRadius: '0.5rem',
                  border: viewMode === 'cards' ? '1px solid #22d3ee' : '1px solid #334155',
                  backgroundColor: viewMode === 'cards' ? '#082f49' : '#020617',
                  color: viewMode === 'cards' ? '#67e8f9' : '#94a3b8',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cards
              </button>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#94a3b8' }}>
          Showing {filteredAndSortedMarkets.length} of {markets.length} markets
          {walletConnected && walletAddress && (
            <span style={{ marginLeft: '1rem', color: '#34d399' }}>
              ✓ Wallet Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto 1rem auto',
          position: 'sticky',
          top: '4.8rem',
          zIndex: 30,
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '0.6rem',
            overflowX: 'auto',
            padding: '0.2rem 0.1rem',
          }}
        >
          {topMovers.map(({ market, change }) => {
            const isUp = change >= 0;
            return (
              <button
                key={`mover-${market.id}`}
                onClick={() => setSelectedMarket(market)}
                style={{
                  border: isUp ? '1px solid #065f46' : '1px solid #7f1d1d',
                  backgroundColor: isUp ? 'rgba(6, 78, 59, 0.72)' : 'rgba(69, 10, 10, 0.7)',
                  color: isUp ? '#a7f3d0' : '#fecaca',
                  borderRadius: '999px',
                  padding: '0.45rem 0.75rem',
                  cursor: 'pointer',
                  minHeight: '40px',
                  fontSize: '0.78rem',
                  fontWeight: 650,
                  whiteSpace: 'nowrap',
                }}
                title={market.question}
              >
                {market.question.slice(0, 34)}{market.question.length > 34 ? '...' : ''} {isUp ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <div
          style={{
            display: viewMode === 'board' ? 'grid' : 'none',
            gridTemplateColumns: 'minmax(0, 1fr) 320px',
            gap: '1rem',
            alignItems: 'start',
            marginBottom: '2rem',
          }}
        >
          {/* Markets Board */}
          <div
            style={{
              border: '1px solid #23344b',
              borderRadius: '1rem',
              overflow: 'hidden',
              background: 'linear-gradient(180deg, #0f172a 0%, #0a1222 100%)',
              boxShadow: '0 14px 32px rgba(2, 6, 23, 0.4)',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
            <div
              style={{
                minWidth: '1240px',
                display: 'grid',
                gridTemplateColumns: '3fr 1fr 1fr 1fr 1fr 0.9fr 1.2fr 0.9fr 0.9fr 1.8fr',
                alignItems: 'center',
                padding: '0.8rem 1rem',
                backgroundColor: '#0b1220',
                borderBottom: '1px solid #23344b',
                color: '#64748b',
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              <span>Market</span>
              <span>Yes</span>
              <span>No</span>
              <span>24h</span>
              <span>TVL</span>
              <span>Spread</span>
              <span>Depth</span>
              <span>AI</span>
              <span>Ends</span>
              <span>Trade</span>
            </div>

            {filteredAndSortedMarkets.map((market, index) => {
              const daysLeft = daysUntilResolution(market.resolutionDate);
              const isExpiring = market.resolutionDate && (market.resolutionDate.getTime() - Date.now()) < 30 * 24 * 60 * 60 * 1000;
              return (
                <div
                  key={`board-${market.id}`}
                  onClick={() => setBoardTicketMarketId(market.id)}
                  style={{
                    minWidth: '1240px',
                    display: 'grid',
                    gridTemplateColumns: '3fr 1fr 1fr 1fr 1fr 0.9fr 1.2fr 0.9fr 0.9fr 1.8fr',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.85rem 1rem',
                    backgroundColor: index % 2 === 0 ? '#0c1527' : '#0a1222',
                    borderBottom: '1px solid #1e293b',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: 0 }}>
                    <div style={{ fontWeight: 650, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {market.question}
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', fontSize: '0.74rem' }}>
                      <span style={{ color: '#67e8f9', backgroundColor: '#083344', border: '1px solid #155e75', borderRadius: '999px', padding: '0.14rem 0.5rem', textTransform: 'capitalize' }}>
                        {market.category || 'general'}
                      </span>
                      {market.riskLevel && (
                        <span style={{ color: getRiskColor(market.riskLevel), border: `1px solid ${getRiskColor(market.riskLevel)}`, borderRadius: '999px', padding: '0.14rem 0.5rem' }}>
                          {market.riskLevel}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ color: '#86efac', fontWeight: 700 }}>${(market.yesPrice * 100).toFixed(1)}¢</div>
                  <div style={{ color: '#fca5a5', fontWeight: 700 }}>${(market.noPrice * 100).toFixed(1)}¢</div>
                  <div style={{ color: '#93c5fd', fontWeight: 600 }}>{formatNumber(market.volume24h || 0)}</div>
                  <div style={{ color: '#a7f3d0', fontWeight: 600 }}>{formatNumber(market.tvl || 0)}</div>
                  <div style={{ color: '#e2e8f0', fontWeight: 600 }}>{((market.spread || 0) * 100).toFixed(1)}%</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.14rem' }}>
                    {[1, 0.72, 0.44].map((multiplier, depthIdx) => {
                      const ratio = Math.max(0.08, ((market.liquidityDepth || 0) / maxLiquidityDepth) * multiplier);
                      return (
                        <span
                          key={`${market.id}-depth-${depthIdx}`}
                          style={{
                            height: '4px',
                            width: `${Math.min(100, ratio * 100)}%`,
                            borderRadius: '999px',
                            background: 'linear-gradient(90deg, #0ea5e9, #22d3ee)',
                            opacity: 0.95,
                          }}
                        />
                      );
                    })}
                  </div>
                  <div style={{ color: '#c4b5fd', fontWeight: 600 }}>{Math.round((market.aiConfidence || 0) * 100)}%</div>
                  <div style={{ color: isExpiring ? '#fca5a5' : '#94a3b8', fontWeight: 600 }}>{daysLeft || '-'}</div>

                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        setBoardTicketMarketId(market.id);
                        setBoardTicketSide('yes');
                      }}
                      style={{
                        minHeight: '38px',
                        borderRadius: '0.45rem',
                        border: '1px solid #065f46',
                        backgroundColor: '#052e2b',
                        color: '#34d399',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: '0.35rem 0.7rem',
                      }}
                    >
                      Buy Yes
                    </button>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        setBoardTicketMarketId(market.id);
                        setBoardTicketSide('no');
                      }}
                      style={{
                        minHeight: '38px',
                        borderRadius: '0.45rem',
                        border: '1px solid #7f1d1d',
                        backgroundColor: '#2a0f14',
                        color: '#f87171',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: '0.35rem 0.7rem',
                      }}
                    >
                      Buy No
                    </button>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedMarket(market);
                      }}
                      style={{
                        minHeight: '38px',
                        borderRadius: '0.45rem',
                        border: '1px solid #334155',
                        backgroundColor: '#0b1324',
                        color: '#94a3b8',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: '0.35rem 0.6rem',
                      }}
                    >
                      More
                    </button>
                  </div>

                </div>
              );
            })}
            </div>
          </div>

          <aside
            style={{
              position: 'sticky',
              top: '6.2rem',
              border: '1px solid #23344b',
              borderRadius: '1rem',
              background: 'linear-gradient(180deg, #0d1627 0%, #0a1222 100%)',
              boxShadow: '0 14px 32px rgba(2, 6, 23, 0.4)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '0.9rem 1rem', borderBottom: '1px solid #1e293b' }}>
              <div style={{ color: '#67e8f9', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Quick Ticket
              </div>
              <div style={{ color: '#e2e8f0', marginTop: '0.35rem', fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.35 }}>
                {boardTicketMarket?.question || 'Select a market'}
              </div>
              {boardTicketMarket && (
                <div style={{ display: 'flex', gap: '0.45rem', marginTop: '0.55rem' }}>
                  <button
                    onClick={() => setBoardTicketSide('yes')}
                    style={{
                      flex: 1,
                      minHeight: '40px',
                      borderRadius: '0.45rem',
                      border: boardTicketSide === 'yes' ? '1px solid #34d399' : '1px solid #1f2937',
                      backgroundColor: boardTicketSide === 'yes' ? '#052e2b' : '#0b1324',
                      color: boardTicketSide === 'yes' ? '#34d399' : '#9ca3af',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    YES {(boardTicketMarket.yesPrice * 100).toFixed(1)}c
                  </button>
                  <button
                    onClick={() => setBoardTicketSide('no')}
                    style={{
                      flex: 1,
                      minHeight: '40px',
                      borderRadius: '0.45rem',
                      border: boardTicketSide === 'no' ? '1px solid #f87171' : '1px solid #1f2937',
                      backgroundColor: boardTicketSide === 'no' ? '#2a0f14' : '#0b1324',
                      color: boardTicketSide === 'no' ? '#f87171' : '#9ca3af',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    NO {(boardTicketMarket.noPrice * 100).toFixed(1)}c
                  </button>
                </div>
              )}
            </div>

            <div style={{ padding: '0.95rem' }}>
              {boardTicketMarket ? (
                <TradeForm
                  marketId={boardTicketMarket.id}
                  yesPrice={boardTicketMarket.yesPrice}
                  noPrice={boardTicketMarket.noPrice}
                  initialSide={boardTicketSide}
                  isWalletConnected={walletConnected}
                  onExecuteTrade={executeTrade}
                />
              ) : (
                <div style={{ color: '#94a3b8', fontSize: '0.85rem', padding: '0.8rem', border: '1px dashed #334155', borderRadius: '0.6rem' }}>
                  No market available for ticket.
                </div>
              )}
            </div>
          </aside>
        </div>

        {/* Markets Grid */}
        <div style={{
          display: viewMode === 'cards' ? 'grid' : 'none',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}>
          {filteredAndSortedMarkets.map(market => {
            const priceChange = getPriceChange(market.priceHistory);
            const daysLeft = daysUntilResolution(market.resolutionDate);
            const isExpiring = market.resolutionDate && (market.resolutionDate.getTime() - Date.now()) < 30 * 24 * 60 * 60 * 1000;
            const position = positions[market.id];

            return (
              <div
                key={market.id}
                onClick={() => setSelectedMarket(market)}
                style={{
                  background: 'linear-gradient(180deg, #111b2f 0%, #0b1424 100%)',
                  borderRadius: '1rem',
                  boxShadow: '0 10px 25px rgba(2, 6, 23, 0.45)',
                  padding: '1.5rem',
                  border: '1px solid rgba(71, 85, 105, 0.62)',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  transform: 'translateY(0)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 22px 34px rgba(2, 132, 199, 0.18), 0 8px 12px rgba(2, 6, 23, 0.4)';
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.borderColor = '#0891b2';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 10px 25px rgba(2, 6, 23, 0.45)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(71, 85, 105, 0.62)';
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: 'linear-gradient(90deg, #06b6d4 0%, #38bdf8 48%, #67e8f9 100%)',
                    opacity: 0.95,
                  }}
                />
                {/* Header with Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <span style={{
                    display: 'inline-block',
                    backgroundColor: '#083344',
                    color: '#67e8f9',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    textTransform: 'capitalize',
                    border: '1px solid #155e75',
                  }}>
                    {market.category || 'General'}
                  </span>
                  {market.aiEdge && market.aiEdge > 0.1 && (
                    <span style={{
                      backgroundColor: '#052e2b',
                      color: '#34d399',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      border: '1px solid #065f46',
                    }}>
                      🎯 +{(market.aiEdge * 100).toFixed(0)}%
                    </span>
                  )}
                </div>

                {/* Question */}
                <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '0.75rem', lineHeight: '1.45', minHeight: '2.5rem', color: '#f8fafc' }}>
                  {market.question}
                </h3>

                {/* Position Badge */}
                {position && (position.yes > 0 || position.no > 0) && (
                  <div style={{
                    marginBottom: '0.75rem',
                    padding: '0.5rem 0.75rem',
                    backgroundColor: '#0ea5e922',
                    borderRadius: '0.375rem',
                    border: '1px solid #06b6d4',
                    fontSize: '0.75rem',
                    color: '#22d3ee',
                  }}>
                    📊 Position: {position.yes > 0 ? `${position.yes.toFixed(0)} YES` : ''} {position.no > 0 ? `${position.no.toFixed(0)} NO` : ''}
                  </div>
                )}

                {/* AI Confidence */}
                {market.aiConfidence && (
                  <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#070f1d', borderRadius: '0.5rem', border: '1px solid #243143' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8', marginBottom: '0.25rem' }}>
                      AI Confidence: {(market.aiConfidence * 100).toFixed(0)}%
                    </div>
                    <div style={{
                      width: '100%',
                      height: '6px',
                      backgroundColor: '#334155',
                      borderRadius: '9999px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${market.aiConfidence * 100}%`,
                        height: '100%',
                        background: market.aiConfidence > 0.75
                          ? 'linear-gradient(90deg, #10b981, #34d399)'
                          : market.aiConfidence > 0.5
                            ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                            : 'linear-gradient(90deg, #ef4444, #f87171)',
                      }} />
                    </div>
                  </div>
                )}

                {/* YES/NO Prices with Progress Bars */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  {/* YES */}
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#34d399', marginBottom: '0.5rem' }}>YES</div>
                    <div style={{
                      width: '100%',
                      height: '4px',
                      backgroundColor: '#334155',
                      borderRadius: '9999px',
                      marginBottom: '0.5rem',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${market.yesPrice * 100}%`,
                        height: '100%',
                        backgroundColor: '#34d399',
                      }} />
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#86efac', marginBottom: '0.25rem' }}>
                      {market.yesPrice.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6ee7b7' }}>
                      {(market.yesPrice * 100).toFixed(1)}% Prob.
                    </div>
                  </div>

                  {/* NO */}
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#f87171', marginBottom: '0.5rem' }}>NO</div>
                    <div style={{
                      width: '100%',
                      height: '4px',
                      backgroundColor: '#334155',
                      borderRadius: '9999px',
                      marginBottom: '0.5rem',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${market.noPrice * 100}%`,
                        height: '100%',
                        backgroundColor: '#f87171',
                      }} />
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#fca5a5', marginBottom: '0.25rem' }}>
                      {market.noPrice.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#fb7185' }}>
                      {(market.noPrice * 100).toFixed(1)}% Prob.
                    </div>
                  </div>
                </div>

                {/* Market Metrics */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                  fontSize: '0.75rem',
                  color: '#94a3b8',
                }}>
                  <div>
                    <div style={{ fontWeight: '600', color: '#cbd5e1' }}>TVL: {formatNumber(market.tvl || 0)}</div>
                    <div>Vol: {formatNumber(market.volume24h || 0)}/24h</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '600', color: priceChange > 0 ? '#34d399' : priceChange < 0 ? '#f87171' : '#94a3b8' }}>
                      {priceChange > 0 ? '📈' : priceChange < 0 ? '📉' : '→'} {Math.abs(priceChange).toFixed(1)}%
                    </div>
                    {daysLeft && <div style={{ color: isExpiring ? '#f87171' : '#94a3b8' }}>
                      {isExpiring ? '⏰' : '📅'} {daysLeft}
                    </div>}
                  </div>
                </div>

                {/* Risk & Trade Button */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '1rem',
                  borderTop: '1px solid #334155',
                }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {market.riskLevel && (
                      <span style={{
                        display: 'inline-block',
                        backgroundColor: getRiskColor(market.riskLevel) + '22',
                        color: getRiskColor(market.riskLevel),
                        padding: '0.25rem 0.75rem',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        border: `1px solid ${getRiskColor(market.riskLevel)}`,
                      }}>
                        {market.riskLevel}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMarket(market);
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #0284c7, #06b6d4)',
                      color: 'white',
                      padding: '0.56rem 1.05rem',
                      borderRadius: '0.5rem',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 12px rgba(6, 182, 212, 0.5)'}
                    onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                  >
                    Trade
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Stats Section */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}>
          <div style={{
            background: 'linear-gradient(180deg, #101a30 0%, #0b1425 100%)',
            padding: '1.5rem',
            borderRadius: '0.75rem',
            border: '1px solid #2c3c55',
            boxShadow: '0 8px 16px rgba(2, 6, 23, 0.35)',
          }}>
            <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total TVL</div>
            <div style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#34d399' }}>
              {formatNumber(totalTVL)}
            </div>
          </div>
          <div style={{
            background: 'linear-gradient(180deg, #101a30 0%, #0b1425 100%)',
            padding: '1.5rem',
            borderRadius: '0.75rem',
            border: '1px solid #2c3c55',
            boxShadow: '0 8px 16px rgba(2, 6, 23, 0.35)',
          }}>
            <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>24h Volume</div>
            <div style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#0ea5e9' }}>
              {formatNumber(total24hVolume)}
            </div>
          </div>
          <div style={{
            background: 'linear-gradient(180deg, #101a30 0%, #0b1425 100%)',
            padding: '1.5rem',
            borderRadius: '0.75rem',
            border: '1px solid #2c3c55',
            boxShadow: '0 8px 16px rgba(2, 6, 23, 0.35)',
          }}>
            <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Active Markets</div>
            <div style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#a78bfa' }}>
              {filteredAndSortedMarkets.length}
            </div>
          </div>
        </div>
      </div>

      {/* Market Detail Modal */}
      {selectedMarket && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            backgroundColor: '#1e293b',
            borderRadius: '1rem',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
            border: '1px solid #334155',
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #334155',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}>
              <div>
                <span style={{
                  display: 'inline-block',
                  backgroundColor: '#0ea5e933',
                  color: '#06b6d4',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '9999px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  textTransform: 'capitalize',
                  marginBottom: '0.75rem',
                  border: '1px solid #06b6d4',
                }}>
                  {selectedMarket.category || 'General'}
                </span>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0', marginTop: '0.5rem', lineHeight: '1.5', color: '#e2e8f0' }}>
                  {selectedMarket.question}
                </h2>
              </div>
              <button
                onClick={() => setSelectedMarket(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#94a3b8',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '1.5rem' }}>
              {/* AI Confidence */}
              {selectedMarket.aiConfidence && (
                <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#0f172a', borderRadius: '0.5rem', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#34d399', marginBottom: '0.5rem' }}>
                    AI Agent Forecast
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        width: '100%',
                        height: '8px',
                        backgroundColor: '#334155',
                        borderRadius: '9999px',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${selectedMarket.aiConfidence * 100}%`,
                          height: '100%',
                          backgroundColor: '#34d399',
                        }} />
                      </div>
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#34d399' }}>
                      {(selectedMarket.aiConfidence * 100).toFixed(0)}%
                    </div>
                  </div>
                  {selectedMarket.aiEdge && (
                    <div style={{ fontSize: '0.875rem', color: '#6ee7b7', marginTop: '0.5rem' }}>
                      {selectedMarket.aiEdge > 0 ? '📈 Edge +' : '📉 Edge '}{(selectedMarket.aiEdge * 100).toFixed(1)}% vs consensus
                    </div>
                  )}
                </div>
              )}

              {/* Price Comparison */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#e2e8f0' }}>Current Odds</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {/* YES */}
                  <div style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #34d399',
                    borderRadius: '0.5rem',
                    padding: '1rem',
                  }}>
                    <div style={{ fontWeight: 'bold', color: '#34d399', marginBottom: '0.5rem' }}>YES</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#86efac', marginBottom: '0.5rem' }}>
                      {selectedMarket.yesPrice.toFixed(4)} SUI
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6ee7b7', marginBottom: '0.5rem' }}>
                      {(selectedMarket.yesPrice * 100).toFixed(2)}% Probability
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      Volume: {selectedMarket.yesVolume.toLocaleString()} SUI
                    </div>
                  </div>

                  {/* NO */}
                  <div style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #f87171',
                    borderRadius: '0.5rem',
                    padding: '1rem',
                  }}>
                    <div style={{ fontWeight: 'bold', color: '#f87171', marginBottom: '0.5rem' }}>NO</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fca5a5', marginBottom: '0.5rem' }}>
                      {selectedMarket.noPrice.toFixed(4)} SUI
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#fb7185', marginBottom: '0.5rem' }}>
                      {(selectedMarket.noPrice * 100).toFixed(2)}% Probability
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      Volume: {selectedMarket.noVolume.toLocaleString()} SUI
                    </div>
                  </div>
                </div>
              </div>

              {/* Market Details */}
              <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#0f172a', borderRadius: '0.5rem', border: '1px solid #334155' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#e2e8f0' }}>Market Details</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                  <div>
                    <div style={{ color: '#94a3b8', marginBottom: '0.25rem' }}>Bid-Ask Spread</div>
                    <div style={{ fontWeight: '600', color: '#cbd5e1' }}>{(selectedMarket.spread! * 100).toFixed(2)}%</div>
                  </div>
                  <div>
                    <div style={{ color: '#94a3b8', marginBottom: '0.25rem' }}>Liquidity Depth</div>
                    <div style={{ fontWeight: '600', color: '#cbd5e1' }}>{formatNumber(selectedMarket.liquidityDepth!)}</div>
                  </div>
                  <div>
                    <div style={{ color: '#94a3b8', marginBottom: '0.25rem' }}>TVL</div>
                    <div style={{ fontWeight: '600', color: '#cbd5e1' }}>{formatNumber(selectedMarket.tvl!)}</div>
                  </div>
                  <div>
                    <div style={{ color: '#94a3b8', marginBottom: '0.25rem' }}>Resolution</div>
                    <div style={{ fontWeight: '600', color: '#cbd5e1' }}>
                      {daysUntilResolution(selectedMarket.resolutionDate)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Resolution Source */}
              {selectedMarket.resolutionSource && (
                <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#0ea5e922', borderRadius: '0.5rem', border: '1px solid #06b6d4' }}>
                  <div style={{ fontSize: '0.875rem', color: '#06b6d4', fontWeight: '600', marginBottom: '0.25rem' }}>ℹ️ Resolution Source</div>
                  <div style={{ fontSize: '0.875rem', color: '#22d3ee' }}>{selectedMarket.resolutionSource}</div>
                </div>
              )}

              {/* Recent Trades */}
              {selectedMarket.recentTrades && selectedMarket.recentTrades.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#e2e8f0' }}>Recent Trades</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {selectedMarket.recentTrades.map((trade, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '0.75rem',
                        backgroundColor: '#0f172a',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        border: '1px solid #334155',
                      }}>
                        <div>
                          <span style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '0.25rem',
                            backgroundColor: trade.side === 'yes' ? '#34d399' : '#f87171',
                            color: '#0f172a',
                            fontWeight: '600',
                            marginRight: '0.5rem',
                          }}>
                            {trade.side.toUpperCase()}
                          </span>
                          {trade.size.toLocaleString()} SUI @ {trade.price.toFixed(4)}
                        </div>
                        <div style={{ color: '#94a3b8' }}>
                          {Math.round((Date.now() - trade.timestamp.getTime()) / 60000)}m ago
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trade Form */}
              {walletConnected && (
                <TradeForm
                  marketId={selectedMarket.id}
                  yesPrice={selectedMarket.yesPrice}
                  noPrice={selectedMarket.noPrice}
                  isWalletConnected={walletConnected}
                  onExecuteTrade={executeTrade}
                />
              )}

              {!walletConnected && (
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#fbbf2422',
                  borderRadius: '0.5rem',
                  border: '1px solid #fbbf24',
                  textAlign: 'center',
                  fontSize: '0.875rem',
                  color: '#fcd34d',
                }}>
                  💼 Connect your wallet to trade
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showJudgeScriptModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(2, 6, 23, 0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '1rem',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              backgroundColor: '#0b1324',
              borderRadius: '1rem',
              maxWidth: '760px',
              width: '100%',
              maxHeight: '92vh',
              overflow: 'auto',
              boxShadow: '0 24px 60px rgba(2, 6, 23, 0.55)',
              border: '1px solid #334155',
              padding: '1rem 1.1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.8rem' }}>
              <div>
                <div style={{ color: '#67e8f9', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Judge Script</div>
                <h3 style={{ margin: '0.35rem 0 0.35rem 0', color: '#f8fafc', fontSize: '1.2rem' }}>3-Minute Demo Cues</h3>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.55 }}>
                  Read this verbatim or use it as a speaking scaffold while running Judge Mode.
                </p>
              </div>
              <button
                onClick={() => setShowJudgeScriptModal(false)}
                style={{
                  minHeight: '38px',
                  borderRadius: '0.45rem',
                  border: '1px solid #334155',
                  backgroundColor: '#111827',
                  color: '#cbd5e1',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '0.3rem 0.65rem',
                }}
              >
                Close
              </button>
            </div>

            <div style={{ marginTop: '0.85rem', display: 'grid', gap: '0.55rem' }}>
              {judgeScript.map((segment) => (
                <div key={`${segment.time}-${segment.cue}`} style={{ border: '1px solid #1e293b', backgroundColor: '#020617', borderRadius: '0.55rem', padding: '0.62rem 0.7rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem' }}>
                    <div style={{ color: '#67e8f9', fontSize: '0.74rem', fontWeight: 700 }}>{segment.cue}</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 700 }}>{segment.time}</div>
                  </div>
                  <div style={{ color: '#e2e8f0', fontSize: '0.84rem', lineHeight: 1.5, marginTop: '0.3rem' }}>{segment.line}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
