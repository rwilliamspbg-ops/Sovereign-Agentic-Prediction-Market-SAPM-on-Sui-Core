import { NextRequest } from 'next/server';
import { existsSync } from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

type MarketSnapshot = {
  id: string;
  title: string;
  yesPrice: number;
  noPrice: number;
  change24h: number;
  liquidityScore: number;
};

type TraderDecision = {
  id: string;
  ts: number;
  agentId: string;
  marketId: string;
  marketTitle: string;
  decision: 'buy_yes' | 'buy_no' | 'hold';
  confidence: number;
  stakeUsd: number;
  rationale: string;
  source: 'server-trader-runtime' | 'server-trader-adapter';
};

const AGENTS = ['alpha', 'beta', 'gamma'];

type TraderAdapterLike = {
  _determineDecision: (edge: number, confidence: number) => 'buy_yes' | 'buy_no' | 'hold';
  _generateRationale: (confidence: number, edge: number, decision: 'buy_yes' | 'buy_no' | 'hold') => string;
  _calculateStake?: (confidence: number, edge: number, marketObjectId: string, packageId: string, dryRun: boolean) => Promise<string | number>;
};

let cachedAdapter: TraderAdapterLike | null = null;
let adapterLoadError: string | null = null;
let adapterLoadPromise: Promise<TraderAdapterLike | null> | null = null;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parseCadence(raw: string | null): number {
  const value = Number(raw || 3500);
  if (!Number.isFinite(value)) {
    return 3500;
  }
  return clamp(Math.floor(value), 1500, 15000);
}

function resolveAdapterPath(): string | null {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, '../agents/trader/forecast_to_trade.js'),
    path.join(cwd, 'agents/trader/forecast_to_trade.js'),
    path.join(cwd, '../../agents/trader/forecast_to_trade.js'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

async function getTraderAdapter(): Promise<TraderAdapterLike | null> {
  if (cachedAdapter) {
    return cachedAdapter;
  }

  if (adapterLoadPromise) {
    return adapterLoadPromise;
  }

  if (adapterLoadError) {
    return null;
  }

  adapterLoadPromise = (async () => {
    try {
      const adapterPath = resolveAdapterPath();
      if (!adapterPath) {
        adapterLoadError = 'Trader adapter module path not found.';
        return null;
      }

      const fileUrl = pathToFileURL(adapterPath).href;
      const loaded = (await import(
        /* webpackIgnore: true */
        fileUrl
      )) as {
        ForecastToTradeAdapter?: new (config?: Record<string, unknown>) => TraderAdapterLike;
      };

      if (typeof loaded.ForecastToTradeAdapter !== 'function') {
        adapterLoadError = 'ForecastToTradeAdapter export not found.';
        return null;
      }

      cachedAdapter = new loaded.ForecastToTradeAdapter({
        agentId: 'stream-agent',
        gossipTTL: 60_000,
        heartbeatInterval: 10_000,
        rpcEndpoint: process.env.SUI_RPC || '',
      });

      return cachedAdapter;
    } catch (error) {
      adapterLoadError = error instanceof Error ? error.message : 'Unknown adapter load error';
      return null;
    }
  })();

  return adapterLoadPromise;
}

async function fetchMarkets(request: NextRequest): Promise<MarketSnapshot[]> {
  const url = new URL('/api/markets?source=all&count=20', request.url);
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Unable to load markets for trader stream (${response.status}).`);
  }

  const payload = (await response.json()) as {
    markets?: Array<{
      id: string;
      title: string;
      yesPrice: number;
      noPrice: number;
      change24h: number;
      liquidityScore: number;
    }>;
  };

  const markets = Array.isArray(payload.markets) ? payload.markets : [];
  return markets.map((m) => ({
    id: m.id,
    title: m.title,
    yesPrice: clamp(Number(m.yesPrice) || 0.5, 0.01, 0.99),
    noPrice: clamp(Number(m.noPrice) || 0.5, 0.01, 0.99),
    change24h: Number(m.change24h) || 0,
    liquidityScore: clamp(Number(m.liquidityScore) || 50, 0, 100),
  }));
}

function pickDecision(market: MarketSnapshot): { decision: TraderDecision['decision']; confidence: number; rationale: string } {
  const edge = market.yesPrice - market.noPrice;
  const confidence = clamp(60 + (Math.abs(market.change24h) * 260) + (market.liquidityScore * 0.16), 52, 93);

  if (confidence < 60) {
    return {
      decision: 'hold',
      confidence,
      rationale: 'Confidence below minimum execution threshold; waiting for stronger signal.',
    };
  }

  if (edge > 0.02) {
    return {
      decision: 'buy_yes',
      confidence,
      rationale: 'Positive YES edge over market-implied probability exceeds threshold.',
    };
  }

  if (confidence >= 85 && edge > -0.01) {
    return {
      decision: 'buy_no',
      confidence,
      rationale: 'High-confidence setup indicates YES is slightly overpriced; taking NO side.',
    };
  }

  return {
    decision: 'hold',
    confidence,
    rationale: 'Edge is too small after risk and slippage guardrails; holding position.',
  };
}

function deriveForecastMetrics(market: MarketSnapshot): { confidencePct: number; impliedProb: number; actualProb: number; edge: number } {
  const impliedProb = clamp(market.yesPrice, 0.01, 0.99);
  const momentumTilt = market.change24h * 0.85;
  const liquidityTilt = ((market.liquidityScore - 50) / 100) * 0.08;
  const actualProb = clamp(impliedProb + momentumTilt + liquidityTilt, 0.01, 0.99);
  const edge = actualProb - impliedProb;
  const confidencePct = clamp(55 + (Math.abs(market.change24h) * 280) + (market.liquidityScore * 0.18), 52, 95);

  return { confidencePct, impliedProb, actualProb, edge };
}

async function buildDecisionFromAdapter(
  adapter: TraderAdapterLike,
  market: MarketSnapshot,
): Promise<{ decision: TraderDecision['decision']; confidence: number; rationale: string; stakeUsd: number; source: TraderDecision['source'] }> {
  const metrics = deriveForecastMetrics(market);
  const decision = adapter._determineDecision(metrics.edge, metrics.confidencePct);
  const rationale = adapter._generateRationale(metrics.confidencePct, metrics.edge, decision);

  let stakeUsd = estimateStake(metrics.confidencePct, decision);
  const adapterAny = adapter as TraderAdapterLike & { marketDiscovery?: { client?: unknown | null } };
  const canUseAdapterStake = Boolean(adapterAny.marketDiscovery?.client);

  if (decision !== 'hold' && canUseAdapterStake && typeof adapter._calculateStake === 'function') {
    try {
      const rawStake = await adapter._calculateStake(metrics.confidencePct, metrics.edge, market.id, '', true);
      const parsed = Number(rawStake);
      if (Number.isFinite(parsed) && parsed > 0) {
        stakeUsd = Math.round(clamp(parsed, 1, 10_000));
      }
    } catch {
      // Fallback to local estimate if adapter stake sizing fails.
    }
  }

  return {
    decision,
    confidence: clamp(metrics.confidencePct / 100, 0.01, 0.99),
    rationale,
    stakeUsd,
    source: 'server-trader-adapter',
  };
}

function estimateStake(confidence: number, decision: TraderDecision['decision']): number {
  if (decision === 'hold') {
    return 0;
  }

  const fractionalKelly = clamp((confidence - 55) / 220, 0.03, 0.25);
  const bankrollUsd = 6000;
  return Math.round(bankrollUsd * fractionalKelly);
}

function toSseData(payload: unknown): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export async function GET(request: NextRequest) {
  const cadenceMs = parseCadence(request.nextUrl.searchParams.get('cadenceMs'));
  const encoder = new TextEncoder();
  const adapter = await getTraderAdapter();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let tick = 0;
      let intervalId: NodeJS.Timeout | null = null;
      let marketCache: MarketSnapshot[] = [];

      const safeEnqueue = (payload: unknown) => {
        controller.enqueue(encoder.encode(toSseData(payload)));
      };

      const runTick = async () => {
        try {
          if (marketCache.length === 0 || tick % 5 === 0) {
            marketCache = await fetchMarkets(request);
          }

          if (marketCache.length === 0) {
            safeEnqueue({ type: 'status', level: 'warn', message: 'No markets available for trader stream.' });
            tick += 1;
            return;
          }

          const ranked = [...marketCache].sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h));
          const now = Date.now();

          for (let i = 0; i < AGENTS.length; i += 1) {
            const agentId = AGENTS[i];
            const market = ranked[(tick + i) % ranked.length];
            const computed = adapter
              ? await buildDecisionFromAdapter(adapter, market)
              : (() => {
                  const local = pickDecision(market);
                  return {
                    ...local,
                    stakeUsd: estimateStake(local.confidence, local.decision),
                    source: 'server-trader-runtime' as const,
                  };
                })();

            const entry: TraderDecision = {
              id: `${now}-${agentId}-${i}`,
              ts: now,
              agentId,
              marketId: market.id,
              marketTitle: market.title,
              decision: computed.decision,
              confidence: computed.confidence,
              stakeUsd: computed.stakeUsd,
              rationale: computed.rationale,
              source: computed.source,
            };

            safeEnqueue({ type: 'decision', payload: entry });
          }

          tick += 1;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown trader stream error';
          safeEnqueue({ type: 'status', level: 'error', message });
        }
      };

      safeEnqueue({
        type: 'status',
        level: adapter ? 'info' : 'warn',
        message: adapter
          ? 'Trader stream connected (adapter-backed mode).'
          : `Trader stream connected (runtime fallback mode). ${adapterLoadError || ''}`.trim(),
        cadenceMs,
      });
      await runTick();
      intervalId = setInterval(() => {
        void runTick();
      }, cadenceMs);

      request.signal.addEventListener('abort', () => {
        if (intervalId) {
          clearInterval(intervalId);
        }
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
