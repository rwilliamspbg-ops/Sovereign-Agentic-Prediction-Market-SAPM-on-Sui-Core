// SPDX-License-Identifier: Apache-2.0
/**
 * DeepBook Predict Server client
 *
 * Wraps the public indexed server at https://predict-server.testnet.mystenlabs.com
 * Provides render-ready market, oracle, vault, and portfolio data without requiring
 * a wallet or on-chain reads.
 *
 * All IDs are pinned to the predict-testnet-4-16 branch deployment.
 * Source: https://docs.sui.io/onchain-finance/deepbook-predict/contract-information
 */

import {
  DEEPBOOK_PREDICT_SERVER,
  DEEPBOOK_PREDICT_OBJECT_ID,
} from '@/lib/sui-config';

export interface PredictServerStatus {
  ok: boolean;
  latencyMs: number;
  url: string;
}

export interface PredictMarketState {
  predictId: string;
  status: string;
  oracles: string[];
  quoteAssets: string[];
  raw: unknown;
}

export interface PredictOracleState {
  oracleId: string;
  spot: number | null;
  forward: number | null;
  status: string;
  expiry: string | null;
  raw: unknown;
}

export interface PredictVaultSummary {
  totalValue: number | null;
  plpSupply: number | null;
  raw: unknown;
}

export interface LiveMarketData {
  serverStatus: PredictServerStatus;
  marketState: PredictMarketState | null;
  oracles: PredictOracleState[];
  vaultSummary: PredictVaultSummary | null;
  fetchedAt: string;
}

const DEFAULT_TIMEOUT_MS = 8000;

async function fetchPredict<T>(path: string): Promise<T> {
  const url = `${DEEPBOOK_PREDICT_SERVER}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Predict server ${res.status}: ${url}`);
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timeout);
  }
}

/** Check liveness of the DeepBook Predict public server */
export async function checkPredictServerStatus(): Promise<PredictServerStatus> {
  const t0 = Date.now();
  try {
    await fetchPredict<unknown>('/status');
    return { ok: true, latencyMs: Date.now() - t0, url: DEEPBOOK_PREDICT_SERVER };
  } catch {
    return { ok: false, latencyMs: Date.now() - t0, url: DEEPBOOK_PREDICT_SERVER };
  }
}

/** Fetch current state for the SAPM Predict integration object */
export async function fetchPredictMarketState(
  predictId = DEEPBOOK_PREDICT_OBJECT_ID
): Promise<PredictMarketState> {
  const raw = await fetchPredict<Record<string, unknown>>(`/predicts/${predictId}/state`);
  const oraclesRaw = await fetchPredict<{ data?: string[] }>(`/predicts/${predictId}/oracles`).catch(() => ({ data: [] }));
  const quoteRaw = await fetchPredict<{ data?: string[] }>(`/predicts/${predictId}/quote-assets`).catch(() => ({ data: [] }));

  return {
    predictId,
    status: String(raw.status ?? raw.lifecycle_status ?? 'active'),
    oracles: oraclesRaw.data ?? [],
    quoteAssets: quoteRaw.data ?? [],
    raw,
  };
}

/** Fetch oracle state for a given oracle ID */
export async function fetchOracleState(oracleId: string): Promise<PredictOracleState> {
  const raw = await fetchPredict<Record<string, unknown>>(`/oracles/${oracleId}/state`);
  const prices = await fetchPredict<{ spot?: number; forward?: number }>(
    `/oracles/${oracleId}/prices/latest`
  ).catch(() => ({ spot: undefined, forward: undefined }));

  return {
    oracleId,
    spot: 'spot' in prices && typeof prices.spot === 'number' ? prices.spot : null,
    forward: 'forward' in prices && typeof prices.forward === 'number' ? prices.forward : null,
    status: String(raw.status ?? raw.lifecycle_status ?? 'unknown'),
    expiry: raw.expiry ? String(raw.expiry) : null,
    raw,
  };
}

/** Fetch vault summary */
export async function fetchVaultSummary(
  predictId = DEEPBOOK_PREDICT_OBJECT_ID
): Promise<PredictVaultSummary> {
  const raw = await fetchPredict<Record<string, unknown>>(
    `/predicts/${predictId}/vault/summary`
  );
  return {
    totalValue: typeof raw.total_value === 'number' ? raw.total_value : null,
    plpSupply: typeof raw.plp_supply === 'number' ? raw.plp_supply : null,
    raw,
  };
}

/**
 * Fetch all live market data from DeepBook Predict server in parallel.
 * Returns a unified snapshot suitable for the SAPM dashboard.
 */
export async function fetchLiveMarketData(): Promise<LiveMarketData> {
  const fetchedAt = new Date().toISOString();

  const serverStatus = await checkPredictServerStatus();
  if (!serverStatus.ok) {
    return { serverStatus, marketState: null, oracles: [], vaultSummary: null, fetchedAt };
  }

  const [marketState, vaultSummary] = await Promise.allSettled([
    fetchPredictMarketState(),
    fetchVaultSummary(),
  ]);

  const resolvedMarket = marketState.status === 'fulfilled' ? marketState.value : null;
  const resolvedVault = vaultSummary.status === 'fulfilled' ? vaultSummary.value : null;

  // Fetch oracle states for first 3 oracles (non-blocking)
  const oracleIds = resolvedMarket?.oracles?.slice(0, 3) ?? [];
  const oracleResults = await Promise.allSettled(oracleIds.map(fetchOracleState));
  const oracles = oracleResults
    .filter((r): r is PromiseFulfilledResult<PredictOracleState> => r.status === 'fulfilled')
    .map(r => r.value);

  return { serverStatus, marketState: resolvedMarket, oracles, vaultSummary: resolvedVault, fetchedAt };
}
