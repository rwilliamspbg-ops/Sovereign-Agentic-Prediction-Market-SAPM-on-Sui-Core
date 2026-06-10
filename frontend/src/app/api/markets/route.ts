import { NextRequest, NextResponse } from 'next/server';
import { MarketDataService, type OnchainMarketRecord } from '@/services/sui/market-data-service';

type MarketStatus = 'live' | 'new' | 'closing-soon';
type MarketCategory = 'Politics' | 'Crypto' | 'Macro' | 'Sports' | 'Tech';

interface UIMarketRecord {
  id: string;
  title: string;
  subtitle: string;
  category: MarketCategory;
  yesPrice: number;
  noPrice: number;
  volume24h: number;
  openInterest: number;
  change24h: number;
  closeAt: string;
  status: MarketStatus;
  liquidityScore: number;
}

const DEMO_MARKETS: UIMarketRecord[] = [
  {
    id: 'MKT-001',
    title: 'Will SUI close above $4.50 by Dec 31, 2026?',
    subtitle: 'Resolution source: CoinGecko daily close.',
    category: 'Crypto',
    yesPrice: 0.61,
    noPrice: 0.39,
    volume24h: 1240000,
    openInterest: 5100000,
    change24h: 0.043,
    closeAt: '2026-12-31',
    status: 'live',
    liquidityScore: 92,
  },
  {
    id: 'MKT-002',
    title: 'Will a US spot ETH ETF exceed $20B AUM by Q4 2026?',
    subtitle: 'Resolution source: issuer and SEC filings.',
    category: 'Macro',
    yesPrice: 0.54,
    noPrice: 0.46,
    volume24h: 980000,
    openInterest: 3200000,
    change24h: -0.027,
    closeAt: '2026-10-01',
    status: 'live',
    liquidityScore: 86,
  },
  {
    id: 'MKT-003',
    title: 'Will US CPI print below 2.5% in December 2026?',
    subtitle: 'Resolution source: BLS CPI release.',
    category: 'Macro',
    yesPrice: 0.48,
    noPrice: 0.52,
    volume24h: 760000,
    openInterest: 2500000,
    change24h: 0.018,
    closeAt: '2026-12-15',
    status: 'new',
    liquidityScore: 80,
  },
  {
    id: 'MKT-004',
    title: 'Will any autonomous agent execute >$1B on-chain volume this year?',
    subtitle: 'Resolution source: on-chain analytics aggregate.',
    category: 'Tech',
    yesPrice: 0.33,
    noPrice: 0.67,
    volume24h: 460000,
    openInterest: 1800000,
    change24h: 0.065,
    closeAt: '2026-11-30',
    status: 'new',
    liquidityScore: 74,
  },
  {
    id: 'MKT-005',
    title: 'Will Team USA top total gold medals in the next Olympics?',
    subtitle: 'Resolution source: IOC official final table.',
    category: 'Sports',
    yesPrice: 0.71,
    noPrice: 0.29,
    volume24h: 390000,
    openInterest: 1200000,
    change24h: -0.012,
    closeAt: '2026-08-20',
    status: 'closing-soon',
    liquidityScore: 70,
  },
  {
    id: 'MKT-006',
    title: 'Will a major US federal AI bill pass before Jan 2027?',
    subtitle: 'Resolution source: Congress.gov final status.',
    category: 'Politics',
    yesPrice: 0.42,
    noPrice: 0.58,
    volume24h: 630000,
    openInterest: 2700000,
    change24h: 0.031,
    closeAt: '2026-12-20',
    status: 'live',
    liquidityScore: 88,
  },
];

function clamp01(value: number): number {
  return Math.max(0.01, Math.min(0.99, value));
}

function parseCount(rawCount: string | null): number {
  const value = Number(rawCount || 24);
  if (!Number.isFinite(value) || value <= 0) return 24;
  return Math.min(Math.floor(value), 80);
}

function parseStatusFromClose(closeAt: string): MarketStatus {
  const now = Date.now();
  const close = new Date(closeAt).getTime();
  const days = (close - now) / (1000 * 60 * 60 * 24);
  if (days <= 15) return 'closing-soon';
  if (days <= 45) return 'new';
  return 'live';
}

function categoryFromText(input: string): MarketCategory {
  const value = input.toLowerCase();
  if (value.includes('crypto') || value.includes('sui') || value.includes('bitcoin') || value.includes('eth')) return 'Crypto';
  if (value.includes('policy') || value.includes('election') || value.includes('congress') || value.includes('federal')) return 'Politics';
  if (value.includes('sport') || value.includes('olympic')) return 'Sports';
  if (value.includes('inflation') || value.includes('rate') || value.includes('macro') || value.includes('cpi')) return 'Macro';
  return 'Tech';
}

function mapOnchainToUi(record: OnchainMarketRecord, index: number): UIMarketRecord {
  const yesPrice = clamp01(record.yesPrice);
  const noPrice = clamp01(record.noPrice || (1 - yesPrice));

  const futureDays = 20 + (index * 17);
  const closeAt = new Date(Date.now() + futureDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return {
    id: record.id,
    title: record.question,
    subtitle: `On-chain source: ${record.category} (${record.id.slice(0, 12)}...)`,
    category: categoryFromText(`${record.category} ${record.question}`),
    yesPrice,
    noPrice,
    volume24h: Math.max(record.volume24h || 0, 250000),
    openInterest: Math.max(record.tvl || record.yesVolume + record.noVolume || 0, 700000),
    change24h: ((yesPrice - 0.5) * 0.22),
    closeAt,
    status: parseStatusFromClose(closeAt),
    liquidityScore: Math.max(35, Math.min(99, Math.round(((record.yesVolume + record.noVolume) / 100000) + 60))),
  };
}

function uniqueById(markets: UIMarketRecord[]): UIMarketRecord[] {
  const seen = new Set<string>();
  return markets.filter((market) => {
    if (seen.has(market.id)) return false;
    seen.add(market.id);
    return true;
  });
}

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get('source') || 'all';
  const count = parseCount(request.nextUrl.searchParams.get('count'));
  const network = process.env.NEXT_PUBLIC_SUI_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';

  const includeDemo = source === 'all' || source === 'mock';
  const includeOnchain = source === 'all' || source === 'onchain';

  const response: {
    generatedAt: string;
    source: string;
    marketCount: number;
    markets: UIMarketRecord[];
    warnings: string[];
  } = {
    generatedAt: new Date().toISOString(),
    source,
    marketCount: 0,
    markets: [],
    warnings: [],
  };

  if (includeOnchain) {
    const service = new MarketDataService(network);
    const configuredIds = service.getConfiguredObjectIds();

    if (configuredIds.length === 0) {
      response.warnings.push('No configured on-chain market object IDs found.');
    } else {
      try {
        const onchain = await service.getOnchainMarketsFromObjectIds(configuredIds);
        response.markets.push(...onchain.map(mapOnchainToUi));
      } catch (error) {
        response.warnings.push(error instanceof Error ? error.message : 'On-chain market load failed.');
      }
    }
  }

  if (includeDemo) {
    response.markets.push(...DEMO_MARKETS);
  }

  response.markets = uniqueById(response.markets).slice(0, count);

  if (response.markets.length === 0) {
    response.markets = DEMO_MARKETS.slice(0, Math.min(count, DEMO_MARKETS.length));
    response.warnings.push('Returning fallback demo markets only.');
  }

  response.marketCount = response.markets.length;
  return NextResponse.json(response, { status: 200 });
}
