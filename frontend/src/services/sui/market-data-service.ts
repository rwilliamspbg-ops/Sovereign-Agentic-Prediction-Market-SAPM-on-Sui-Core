import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

function isValidSuiHexAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{1,64}$/.test(value);
}

export interface OnchainMarketRecord {
  id: string;
  question: string;
  yesPrice: number;
  noPrice: number;
  yesVolume: number;
  noVolume: number;
  category: string;
  tvl: number;
  volume24h: number;
  riskLevel: 'Low' | 'Medium' | 'High';
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0.5;
  return Math.max(0.01, Math.min(0.99, value));
}

function toNumber(input: unknown, fallback = 0): number {
  if (typeof input === 'number' && Number.isFinite(input)) return input;
  if (typeof input === 'string') {
    const parsed = Number(input);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function parsePrice(input: unknown): number {
  const numeric = toNumber(input, 0.5);
  return numeric > 1 ? clamp01(numeric / 100) : clamp01(numeric);
}

function parseRisk(confidence: number): 'Low' | 'Medium' | 'High' {
  if (confidence >= 0.78) return 'Low';
  if (confidence >= 0.58) return 'Medium';
  return 'High';
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

export class MarketDataService {
  private readonly client: SuiClient;
  private readonly rpcTimeoutMs: number;

  constructor(network: 'testnet' | 'mainnet' = 'testnet') {
    this.client = new SuiClient({ url: getFullnodeUrl(network) });
    this.rpcTimeoutMs = 12000;
  }

  getConfiguredObjectIds(): string[] {
    return (process.env.NEXT_PUBLIC_SUI_MARKET_OBJECT_IDS || '')
      .split(',')
      .map((id) => id.trim())
      .filter((id) => isValidSuiHexAddress(id));
  }

  normalizeObjectIds(rawIds: string[]): string[] {
    return Array.from(new Set(rawIds.map((id) => id.trim()).filter((id) => isValidSuiHexAddress(id))));
  }

  async getOnchainMarketsFromObjectIds(rawObjectIds: string[]): Promise<OnchainMarketRecord[]> {
    const objectIds = this.normalizeObjectIds(rawObjectIds);
    if (objectIds.length === 0) {
      return [];
    }

    const results = await Promise.allSettled(
      objectIds.map((id) =>
        withTimeout(
          this.client.getObject({
            id,
            options: {
              showContent: true,
              showType: true,
            },
          }),
          this.rpcTimeoutMs,
          `Sui getObject(${id.slice(0, 10)}...)`
        )
      )
    );

    const markets: OnchainMarketRecord[] = [];

    for (const result of results) {
      if (result.status !== 'fulfilled') {
        continue;
      }

      const object = result.value;
      const objectId = object.data?.objectId;
      const fields = (object.data?.content as { fields?: Record<string, unknown> } | null)?.fields || {};

      if (!objectId) {
        continue;
      }

      const question = String(fields.question || fields.title || `On-chain Market ${objectId.slice(0, 8)}`);
      const yesPrice = parsePrice(fields.yes_price ?? fields.yesPrice ?? fields.prob_yes ?? fields.price_yes ?? 0.5);
      const noPrice = parsePrice(fields.no_price ?? fields.noPrice ?? fields.prob_no ?? fields.price_no ?? (1 - yesPrice));

      const yesVolume = toNumber(fields.yes_volume ?? fields.yesVolume ?? fields.volume_yes, 0);
      const noVolume = toNumber(fields.no_volume ?? fields.noVolume ?? fields.volume_no, 0);
      const tvl = toNumber(fields.tvl ?? fields.total_value_locked, yesVolume + noVolume);
      const volume24h = toNumber(fields.volume_24h ?? fields.volume24h ?? fields.daily_volume, 0);
      const category = String(fields.category || fields.market_type || 'onchain');

      const confidence = Math.abs(yesPrice - 0.5) * 2;

      markets.push({
        id: objectId,
        question,
        yesPrice,
        noPrice,
        yesVolume,
        noVolume,
        category,
        tvl,
        volume24h,
        riskLevel: parseRisk(confidence),
      });
    }

    return markets;
  }

  async getOnchainMarkets(): Promise<OnchainMarketRecord[]> {
    return this.getOnchainMarketsFromObjectIds(this.getConfiguredObjectIds());
  }
}

export const marketDataService = new MarketDataService('testnet');
