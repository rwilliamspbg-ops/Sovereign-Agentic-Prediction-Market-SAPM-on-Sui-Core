'use client';

import { emitObservabilityEvent } from '@/lib/observability';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { deepbookService } from '@/services/sui/deepbook-service';
import { marketDataService } from '@/services/sui/market-data-service';
import { suiIntegration } from '@/services/sui/sui-integration';
import { walrusService } from '@/services/sui/walrus-service';
import { getConnectedWalletContext } from '@/services/sui/wallet-standard';
import type { CopilotActionType, CopilotContext, CopilotExecutionTranscript } from '@/services/copilot-bridge';

export const ACTION_REQUEST_EVENT = 'sapm:copilot-action-request';
export const ACTION_RESULT_EVENT = 'sapm:copilot-action-result';
export const ACTIVE_MARKET_INSIGHT_KEY = 'sapm.activeMarketInsight';
export const INTEGRATION_STATUS_KEY = 'sapm.integrationStatus';

const BRIDGE_STATE_KEY = 'sapm.copilot.bridge.state.v1';
const JUDGE_RESULT_KEY = 'sapm.judgeMode.lastResult';
const WALRUS_BLOB_ID_KEY = 'sapm.walrus.latestBlobId';
const LOCAL_ONCHAIN_OBJECT_IDS_KEY = 'sapm.onchainObjectIds';

type ActiveMarketInsight = {
  id: string;
  question: string;
  yesPrice: number;
  noPrice: number;
  riskLevel: 'Low' | 'Medium' | 'High';
};

type IntegrationStatus = {
  deepbookReady: boolean;
  walrusReady: boolean;
  checkedAt: string;
};

type JudgeModeResult = {
  marketId: string;
  amount: number;
  side: 'yes' | 'no';
  txDigest: string;
  walletAddress: string;
  executedAt: string;
};

type CopilotActionRequest = {
  id: string;
  type: CopilotActionType;
  payload: Record<string, unknown>;
};

type ActionResultPayload = {
  id: string;
  ok: boolean;
  message?: string;
  data?: Record<string, unknown>;
};

type ActionHandlerOptions = {
  getContext: () => CopilotContext;
  getTranscript: () => CopilotExecutionTranscript | null;
  getWalletContext?: typeof getConnectedWalletContext;
};

function isValidSuiHexAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{1,64}$/.test(value);
}

function resolvePreferredNetwork(): 'testnet' | 'mainnet' {
  const saved = window.localStorage.getItem('preferredNetwork');
  return saved === 'mainnet' ? 'mainnet' : 'testnet';
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function findCreatedPredictionMarketIdFromDigest(
  digest: string,
  preferredNetwork: 'testnet' | 'mainnet',
): Promise<string | null> {
  if (!digest) {
    return null;
  }

  // Transaction indexing can lag briefly, and users may have a stale preferred
  // network in localStorage. Probe both networks with bounded retries.
  const networks: Array<'testnet' | 'mainnet'> = preferredNetwork === 'testnet'
    ? ['testnet', 'mainnet']
    : ['mainnet', 'testnet'];

  for (let attempt = 0; attempt < 6; attempt += 1) {
    for (const network of networks) {
      try {
        const client = new SuiClient({ url: getFullnodeUrl(network) });
        const tx = await client.getTransactionBlock({
          digest,
          options: {
            showObjectChanges: true,
          },
        });

        const created = tx.objectChanges?.find((change) => {
          if (change.type !== 'created') {
            return false;
          }
          const objectType = (change as { objectType?: string }).objectType || '';
          return objectType.includes('::prediction_market::PredictionMarket');
        }) as { objectId?: string } | undefined;

        if (created?.objectId) {
          return created.objectId;
        }
      } catch {
        // Ignore transient "digest not found"/RPC errors and retry.
      }
    }

    await delay(900 * (attempt + 1));
  }

  return null;
}

function persistOnchainObjectId(id: string): void {
  if (!isValidSuiHexAddress(id)) {
    return;
  }

  const existing = getLocalOnchainObjectIds();
  const merged = Array.from(new Set([...existing.validIds, id]));
  window.localStorage.setItem(LOCAL_ONCHAIN_OBJECT_IDS_KEY, merged.join(','));
}

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function publishStorageEvent(eventName: string, detail: unknown): void {
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
}

function getConfiguredMarketObjectIds(): { validIds: string[]; invalidIds: string[] } {
  const rawIds = (process.env.NEXT_PUBLIC_SUI_MARKET_OBJECT_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  const validIds = Array.from(new Set(rawIds.filter((id) => isValidSuiHexAddress(id))));
  const invalidIds = Array.from(new Set(rawIds.filter((id) => !isValidSuiHexAddress(id))));

  return { validIds, invalidIds };
}

function getLocalOnchainObjectIds(): { validIds: string[]; invalidIds: string[] } {
  const raw = window.localStorage.getItem(LOCAL_ONCHAIN_OBJECT_IDS_KEY) || '';
  const rawIds = raw
    .split(/[\s,]+/g)
    .map((id) => id.trim())
    .filter(Boolean);

  const validIds = Array.from(new Set(rawIds.filter((id) => isValidSuiHexAddress(id))));
  const invalidIds = Array.from(new Set(rawIds.filter((id) => !isValidSuiHexAddress(id))));

  return { validIds, invalidIds };
}

function persistActiveMarketInsight(market: ActiveMarketInsight): void {
  writeJson(ACTIVE_MARKET_INSIGHT_KEY, market);
  publishStorageEvent('sapm:active-market-insight', market);
}

function persistIntegrationStatus(status: IntegrationStatus): void {
  writeJson(INTEGRATION_STATUS_KEY, status);
  publishStorageEvent('sapm:integration-status', status);
}

function resolveMarketId(payload: Record<string, unknown>, context: CopilotContext): string | null {
  const rawMarketId = typeof payload.marketId === 'string' ? payload.marketId.trim() : '';
  if (rawMarketId && isValidSuiHexAddress(rawMarketId)) {
    return rawMarketId;
  }

  if (context.activeMarketId && isValidSuiHexAddress(context.activeMarketId)) {
    return context.activeMarketId;
  }

  const activeMarket = readJson<ActiveMarketInsight>(ACTIVE_MARKET_INSIGHT_KEY);
  if (activeMarket?.id && isValidSuiHexAddress(activeMarket.id)) {
    return activeMarket.id;
  }

  return null;
}

function readLastJudgeResult(): JudgeModeResult | null {
  return readJson<JudgeModeResult>(JUDGE_RESULT_KEY);
}

function readLastTranscript(fallback: CopilotExecutionTranscript | null): CopilotExecutionTranscript | null {
  const bridgeState = readJson<{ lastTranscript?: CopilotExecutionTranscript }>(BRIDGE_STATE_KEY);
  return bridgeState?.lastTranscript || fallback;
}

function resolveOnchainMarketObjectIds(context: CopilotContext): {
  validIds: string[];
  invalidIds: string[];
  sourceLabels: string[];
} {
  const configured = getConfiguredMarketObjectIds();
  const local = getLocalOnchainObjectIds();
  const contextActiveId = context.activeMarketId?.trim() || '';

  const contextualIds = [contextActiveId].filter(Boolean);
  const contextualValidIds = Array.from(new Set(contextualIds.filter((id) => isValidSuiHexAddress(id))));
  const contextualInvalidIds = Array.from(new Set(contextualIds.filter((id) => !isValidSuiHexAddress(id))));

  const validIds = Array.from(new Set([...configured.validIds, ...local.validIds, ...contextualValidIds]));
  const invalidIds = Array.from(new Set([...configured.invalidIds, ...local.invalidIds, ...contextualInvalidIds]));

  const sourceLabels: string[] = [];
  if (configured.validIds.length > 0) {
    sourceLabels.push('env:NEXT_PUBLIC_SUI_MARKET_OBJECT_IDS');
  }
  if (local.validIds.length > 0) {
    sourceLabels.push('local:sapm.onchainObjectIds');
  }
  if (contextActiveId && isValidSuiHexAddress(contextActiveId)) {
    sourceLabels.push('context:activeMarketId');
  }

  return { validIds, invalidIds, sourceLabels };
}

async function loadOnchainMarkets(context: CopilotContext): Promise<ActionResultPayload> {
  const { validIds, invalidIds, sourceLabels } = resolveOnchainMarketObjectIds(context);

  if (invalidIds.length > 0) {
    return {
      id: '',
      ok: false,
      message: `Invalid on-chain market object ID(s): ${invalidIds.join(', ')}.`,
    };
  }

  if (validIds.length === 0) {
    return {
      id: '',
      ok: false,
      message: 'No on-chain market object IDs are configured. Set NEXT_PUBLIC_SUI_MARKET_OBJECT_IDS, or persist IDs via Trade Execution (sapm.onchainObjectIds) before loading markets.',
    };
  }

  const markets = await marketDataService.getOnchainMarketsFromObjectIds(validIds);
  if (markets.length === 0) {
    return {
      id: '',
      ok: false,
      message: 'No on-chain markets could be loaded from the configured object IDs.',
    };
  }

  const selected = markets[0];
  persistActiveMarketInsight({
    id: selected.id,
    question: selected.question,
    yesPrice: selected.yesPrice,
    noPrice: selected.noPrice,
    riskLevel: selected.riskLevel,
  });

  emitObservabilityEvent('frontend', 'copilot_markets_loaded', 'info', {
    marketCount: markets.length,
    selectedMarketId: selected.id,
    sourceLabels,
  });

  return {
    id: '',
    ok: true,
    message: `Loaded ${markets.length} on-chain market(s).`,
    data: {
      marketCount: markets.length,
      selectedMarketId: selected.id,
      validatedIds: validIds,
      sourceLabels,
    },
  };
}

async function openMarket(payload: Record<string, unknown>, context: CopilotContext): Promise<ActionResultPayload> {
  const marketId = resolveMarketId(payload, context);
  if (!marketId) {
    return {
      id: '',
      ok: false,
      message: 'No valid market ID was provided or cached for focus.',
    };
  }

  const markets = await marketDataService.getOnchainMarketsFromObjectIds([marketId]);
  const market = markets[0];
  if (!market) {
    return {
      id: '',
      ok: false,
      message: `Unable to load market ${marketId}.`,
    };
  }

  persistActiveMarketInsight({
    id: market.id,
    question: market.question,
    yesPrice: market.yesPrice,
    noPrice: market.noPrice,
    riskLevel: market.riskLevel,
  });

  return {
    id: '',
    ok: true,
    message: `Focused market ${market.id}.`,
    data: { marketId: market.id },
  };
}

async function refreshIntegrations(): Promise<ActionResultPayload> {
  const [deepbookStatus, walrusStatus] = await Promise.all([
    deepbookService.getStatus(),
    walrusService.getStatus(),
  ]);

  const status: IntegrationStatus = {
    deepbookReady: Boolean(deepbookStatus.rpcReachable && deepbookStatus.packageReachable),
    walrusReady: Boolean(walrusStatus.aggregatorReachable && walrusStatus.publisherReachable),
    checkedAt: new Date().toISOString(),
  };

  persistIntegrationStatus(status);

  return {
    id: '',
    ok: true,
    message: 'Integration status refreshed.',
    data: status,
  };
}

async function runJudgeMode(
  payload: Record<string, unknown>,
  context: CopilotContext,
  getWalletContext: typeof getConnectedWalletContext,
): Promise<ActionResultPayload> {
  let marketId = resolveMarketId(payload, context);

  const amount = Number(payload.amount ?? 0.01);
  const side = payload.side === 'no' ? 'no' : 'yes';
  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      id: '',
      ok: false,
      message: 'Judge Mode amount must be a positive number.',
    };
  }

  await suiIntegration.initialize();
  const walletContext = await getWalletContext(typeof payload.walletId === 'string' ? payload.walletId : undefined);
  const preferredNetwork = resolvePreferredNetwork();

  if (marketId) {
    try {
      await marketDataService.getOnchainMarketsFromObjectIds([marketId]);
    } catch {
      // Preserve explicit/cached market IDs and let executeTrade surface validity errors.
      // Auto-market creation should only run when no market ID is available.
    }
  }

  if (!marketId) {
    const autoQuestion = `SAPM Judge Mode Market ${new Date().toISOString()}`;
    const resolutionDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const creation = await suiIntegration.createMarket(autoQuestion, resolutionDate, walletContext);
    const createdMarketId = await findCreatedPredictionMarketIdFromDigest(
      String(creation?.digest || ''),
      preferredNetwork,
    );

    if (!createdMarketId) {
      return {
        id: '',
        ok: false,
        message: 'Judge Mode created a market transaction but could not resolve the new PredictionMarket object ID from transaction effects. Retry once, then set NEXT_PUBLIC_SUI_MARKET_OBJECT_IDS with a valid PredictionMarket object ID.',
      };
    }

    marketId = createdMarketId;
    persistOnchainObjectId(createdMarketId);
  }

  const execution = await suiIntegration.executeTrade(marketId, side, amount, walletContext);

  const judgeResult: JudgeModeResult = {
    marketId,
    amount,
    side,
    txDigest: execution.digest || '',
    walletAddress: walletContext.account.address,
    executedAt: new Date().toISOString(),
  };

  writeJson(JUDGE_RESULT_KEY, judgeResult);

  emitObservabilityEvent('frontend', 'copilot_judge_mode_executed', 'info', {
    marketId,
    digest: judgeResult.txDigest,
    amount,
    side,
  });

  return {
    id: '',
    ok: true,
    message: `Executed micro trade on ${marketId}.`,
    data: {
      marketId,
      amount,
      side,
      txDigest: judgeResult.txDigest,
      walletAddress: judgeResult.walletAddress,
    },
  };
}

async function archiveSnapshot(getTranscript: () => CopilotExecutionTranscript | null): Promise<ActionResultPayload> {
  const judgeResult = readLastJudgeResult();
  if (!judgeResult) {
    return {
      id: '',
      ok: false,
      message: 'Run Judge Mode before archiving a Walrus snapshot.',
    };
  }

  const activeMarket = readJson<ActiveMarketInsight>(ACTIVE_MARKET_INSIGHT_KEY);
  const integrationStatus = readJson<IntegrationStatus>(INTEGRATION_STATUS_KEY);
  const transcript = readLastTranscript(getTranscript());

  const manifest = await walrusService.buildSnapshotManifest({
    marketId: judgeResult.marketId,
    payload: {
      judgeResult,
      activeMarket,
      integrationStatus,
      transcript,
    },
    txDigest: judgeResult.txDigest || undefined,
    walletAddress: judgeResult.walletAddress || undefined,
    previousBlobId: window.localStorage.getItem(WALRUS_BLOB_ID_KEY) || undefined,
  });

  const validation = walrusService.validateSnapshotManifest(manifest);
  if (!validation.valid) {
    return {
      id: '',
      ok: false,
      message: `Walrus snapshot manifest is invalid: ${validation.errors.join('; ')}`,
    };
  }

  const published = await walrusService.publishMarketSnapshot(manifest);
  window.localStorage.setItem(WALRUS_BLOB_ID_KEY, published.blobId);

  emitObservabilityEvent('frontend', 'copilot_snapshot_archived', 'info', {
    marketId: judgeResult.marketId,
    blobId: published.blobId,
  });

  return {
    id: '',
    ok: true,
    message: `Archived snapshot to Walrus blob ${published.blobId}.`,
    data: {
      blobId: published.blobId,
      marketId: judgeResult.marketId,
    },
  };
}

async function executeCopilotAction(request: CopilotActionRequest, options: ActionHandlerOptions): Promise<ActionResultPayload> {
  const context = options.getContext();

  switch (request.type) {
    case 'load-onchain-markets':
      return loadOnchainMarkets(context);
    case 'run-judge-mode':
      return runJudgeMode(request.payload, context, options.getWalletContext || getConnectedWalletContext);
    case 'archive-snapshot':
      return archiveSnapshot(options.getTranscript);
    case 'refresh-integrations':
      return refreshIntegrations();
    case 'open-market':
      return openMarket(request.payload, context);
    default:
      return {
        id: request.id,
        ok: false,
        message: `Unsupported action type: ${request.type}`,
      };
  }
}

export function registerCopilotActionHandler(options: ActionHandlerOptions): () => void {
  const onRequest = (event: Event) => {
    const detail = (event as CustomEvent<CopilotActionRequest>).detail;
    if (!detail?.id || !detail.type) {
      return;
    }

    void executeCopilotAction(detail, options)
      .then((result) => {
        window.dispatchEvent(new CustomEvent(ACTION_RESULT_EVENT, {
          detail: {
            id: detail.id,
            ok: result.ok,
            message: result.message,
            data: result.data,
          },
        }));
      })
      .catch((error) => {
        window.dispatchEvent(new CustomEvent(ACTION_RESULT_EVENT, {
          detail: {
            id: detail.id,
            ok: false,
            message: error instanceof Error ? error.message : String(error),
          },
        }));
      });
  };

  window.addEventListener(ACTION_REQUEST_EVENT, onRequest as EventListener);
  return () => window.removeEventListener(ACTION_REQUEST_EVENT, onRequest as EventListener);
}
