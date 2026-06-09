import { beforeEach, afterEach, describe, expect, jest, test } from '@jest/globals';
import { registerCopilotActionHandler, ACTION_REQUEST_EVENT, ACTION_RESULT_EVENT, ACTIVE_MARKET_INSIGHT_KEY, INTEGRATION_STATUS_KEY } from '@/services/copilot-action-handler';
import { marketDataService } from '@/services/sui/market-data-service';
import { deepbookService } from '@/services/sui/deepbook-service';
import { suiIntegration } from '@/services/sui/sui-integration';
import { walrusService } from '@/services/sui/walrus-service';

describe('copilot action handler', () => {
  const cleanupHandles: Array<() => void> = [];

  beforeEach(() => {
    window.localStorage.clear();
    cleanupHandles.splice(0, cleanupHandles.length).forEach((cleanup) => cleanup());
    jest.restoreAllMocks();
  });

  afterEach(() => {
    cleanupHandles.splice(0, cleanupHandles.length).forEach((cleanup) => cleanup());
    jest.restoreAllMocks();
  });

  function registerHandler() {
    const cleanup = registerCopilotActionHandler({
      getContext: () => ({
        walletConnected: true,
        walletAddress: '0xabc',
        activeMarketId: '0x1234',
        activeMarketQuestion: 'Will SUI hold above $1?',
        activeMarketYesPrice: 0.61,
        activeMarketNoPrice: 0.39,
        activeMarketRisk: 'Medium',
        deepbookReady: null,
        walrusReady: null,
        lastUpdatedAt: Date.now(),
      }),
      getTranscript: () => ({
        id: 'copilot_run_test',
        createdAt: Date.now(),
        stopOnFailure: true,
        startedAt: Date.now() - 1000,
        finishedAt: Date.now(),
        total: 1,
        completed: 1,
        failed: 0,
        aborted: false,
        entries: [],
      }),
      getWalletContext: async () => ({
        wallet: {
          id: 'wallet-1',
          name: 'Test Wallet',
          accounts: [],
          features: {},
        } as never,
        account: {
          address: '0xabc',
          publicKey: '0x01',
          chains: ['sui:testnet'],
          features: {},
        } as never,
      }),
    });
    cleanupHandles.push(cleanup);
    return cleanup;
  }

  function waitForActionResult(actionId: string): Promise<{ id: string; ok: boolean; message?: string; data?: Record<string, unknown> }> {
    return new Promise((resolve) => {
      const listener = (event: Event) => {
        const detail = (event as CustomEvent<{ id: string; ok: boolean; message?: string; data?: Record<string, unknown> }>).detail;
        if (!detail || detail.id !== actionId) {
          return;
        }

        window.removeEventListener(ACTION_RESULT_EVENT, listener as EventListener);
        resolve(detail);
      };

      window.addEventListener(ACTION_RESULT_EVENT, listener as EventListener);
    });
  }

  test('loads on-chain markets and persists the active market insight', async () => {
    process.env.NEXT_PUBLIC_SUI_MARKET_OBJECT_IDS = '0x1234,0x5678';
    jest.spyOn(marketDataService, 'getOnchainMarketsFromObjectIds').mockResolvedValue([
      {
        id: '0x1234',
        question: 'Will SUI hold above $1?',
        yesPrice: 0.62,
        noPrice: 0.38,
        yesVolume: 12,
        noVolume: 8,
        category: 'onchain',
        tvl: 20,
        volume24h: 4,
        riskLevel: 'Medium',
      },
      {
        id: '0x5678',
        question: 'Will SUI trade above $2?',
        yesPrice: 0.31,
        noPrice: 0.69,
        yesVolume: 5,
        noVolume: 11,
        category: 'onchain',
        tvl: 16,
        volume24h: 2,
        riskLevel: 'High',
      },
    ]);

    registerHandler();
    const actionId = 'action-load';
    const resultPromise = waitForActionResult(actionId);

    window.dispatchEvent(new CustomEvent(ACTION_REQUEST_EVENT, {
      detail: {
        id: actionId,
        type: 'load-onchain-markets',
        payload: {},
      },
    }));

    const result = await resultPromise;
    const activeMarket = JSON.parse(window.localStorage.getItem(ACTIVE_MARKET_INSIGHT_KEY) || 'null') as { id: string; question: string } | null;

    expect(result.ok).toBe(true);
    expect(result.message).toContain('Loaded 2 on-chain market(s).');
    expect(result.data?.selectedMarketId).toBe('0x1234');
    expect(activeMarket?.id).toBe('0x1234');
    expect(activeMarket?.question).toBe('Will SUI hold above $1?');
  });

  test('loads on-chain markets from persisted local object IDs when env IDs are not configured', async () => {
    delete process.env.NEXT_PUBLIC_SUI_MARKET_OBJECT_IDS;
    window.localStorage.setItem('sapm.onchainObjectIds', '0xbeef,0xface');

    jest.spyOn(marketDataService, 'getOnchainMarketsFromObjectIds').mockResolvedValue([
      {
        id: '0xbeef',
        question: 'Will validator uptime exceed 99.9%?',
        yesPrice: 0.55,
        noPrice: 0.45,
        yesVolume: 30,
        noVolume: 12,
        category: 'onchain',
        tvl: 42,
        volume24h: 10,
        riskLevel: 'Low',
      },
    ]);

    registerHandler();
    const actionId = 'action-load-local';
    const resultPromise = waitForActionResult(actionId);

    window.dispatchEvent(new CustomEvent(ACTION_REQUEST_EVENT, {
      detail: {
        id: actionId,
        type: 'load-onchain-markets',
        payload: {},
      },
    }));

    const result = await resultPromise;
    expect(result.ok).toBe(true);
    expect(result.data?.selectedMarketId).toBe('0xbeef');
    expect(Array.isArray(result.data?.sourceLabels)).toBe(true);
    expect(result.data?.sourceLabels).toContain('local:sapm.onchainObjectIds');
  });

  test('runs judge mode and archives a Walrus snapshot', async () => {
    jest.spyOn(suiIntegration, 'initialize').mockResolvedValue(undefined);
    jest.spyOn(suiIntegration, 'executeTrade').mockResolvedValue({ digest: '0xfeedbeef' });
    jest.spyOn(walrusService, 'buildSnapshotManifest').mockResolvedValue({
      schema: 'sapm.walrus.snapshot.manifest.v1',
      version: 1,
      createdAt: new Date().toISOString(),
      marketId: '0x1234',
      txDigest: '0xfeedbeef',
      walletAddress: '0xabc',
      lineage: {},
      payloadChecksumSha256: 'sha256-test',
      payload: {},
    });
    jest.spyOn(walrusService, 'publishMarketSnapshot').mockResolvedValue({
      blobId: 'walrus-blob-123',
      raw: { blobId: 'walrus-blob-123' },
    });

    registerHandler();

    const judgeActionId = 'action-judge';
    const judgeResultPromise = waitForActionResult(judgeActionId);
    window.dispatchEvent(new CustomEvent(ACTION_REQUEST_EVENT, {
      detail: {
        id: judgeActionId,
        type: 'run-judge-mode',
        payload: {},
      },
    }));

    const judgeResult = await judgeResultPromise;
    expect(judgeResult.ok).toBe(true);
    expect(judgeResult.data?.txDigest).toBe('0xfeedbeef');

    const archiveActionId = 'action-archive';
    const archiveResultPromise = waitForActionResult(archiveActionId);
    window.dispatchEvent(new CustomEvent(ACTION_REQUEST_EVENT, {
      detail: {
        id: archiveActionId,
        type: 'archive-snapshot',
        payload: {},
      },
    }));

    const archiveResult = await archiveResultPromise;
    expect(archiveResult.ok).toBe(true);
    expect(archiveResult.message).toContain('walrus-blob-123');
  });

  test('refreshes integration readiness state', async () => {
    jest.spyOn(deepbookService, 'getStatus').mockResolvedValue({
      rpcReachable: true,
      packageConfigured: true,
      packageReachable: true,
      packageId: '0xfeedface',
    });
    jest.spyOn(walrusService, 'getStatus').mockResolvedValue({
      aggregatorUrl: 'https://aggregator.example',
      publisherUrl: 'https://publisher.example',
      aggregatorReachable: true,
      publisherReachable: true,
    });

    registerHandler();
    const actionId = 'action-refresh';
    const resultPromise = waitForActionResult(actionId);

    window.dispatchEvent(new CustomEvent(ACTION_REQUEST_EVENT, {
      detail: {
        id: actionId,
        type: 'refresh-integrations',
        payload: {},
      },
    }));

    const result = await resultPromise;
    const integrationStatus = JSON.parse(window.localStorage.getItem(INTEGRATION_STATUS_KEY) || 'null') as { deepbookReady: boolean; walrusReady: boolean } | null;

    expect(result.ok).toBe(true);
    expect(integrationStatus?.walrusReady).toBe(true);
    expect(integrationStatus?.deepbookReady).toBe(true);
  });
});
