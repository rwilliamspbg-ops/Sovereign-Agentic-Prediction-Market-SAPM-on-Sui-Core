import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import {
  DEEPBOOK_PREDICT_PACKAGE_ID,
  DEEPBOOK_PREDICT_OBJECT_ID,
  DEEPBOOK_PREDICT_REGISTRY,
  DEEPBOOK_PREDICT_SERVER,
  SUISCAN_TX_URL,
} from '@/lib/sui-config';
import { emitObservabilityEvent } from '@/lib/observability';

export type DeepBookStatus = {
  rpcReachable: boolean;
  packageConfigured: boolean;
  packageReachable: boolean;
  packageId: string;
  predictServerReachable?: boolean;
  predictObjectId?: string;
  predictServerLatencyMs?: number;
  error?: string;
};

export type DeepBookOrderIntent = {
  poolObjectId: string;
  balanceManagerObjectId: string;
  clockObjectId?: string;
  clientOrderId: number;
  priceMist: number;
  quantityMist: number;
  isBid: boolean;
};

export type DeepBookCancelIntent = {
  poolObjectId: string;
  balanceManagerObjectId: string;
  clockObjectId?: string;
  clientOrderId: number;
};

export type DeepBookOpenOrderSummary = {
  owner: string;
  objectId: string;
  type: string;
};

export type DeepBookReconciliation = {
  digest: string;
  success: boolean;
  status: string;
  gasUsed: string;
  timestampMs?: number;
};

export type DeepBookPreflightResult = {
  valid: boolean;
  reason?: string;
  impactPct?: number;
  clockSkewMs?: number;
};

export class DeepBookService {
  private readonly client: SuiClient;
  private readonly network: 'testnet' | 'mainnet';

  constructor(network: 'testnet' | 'mainnet' = 'testnet') {
    this.network = network;
    this.client = new SuiClient({ url: getFullnodeUrl(network) });
  }

  private get deepBookPackageId(): string {
    return DEEPBOOK_PREDICT_PACKAGE_ID;
  }

  buildPlaceLimitOrderTransaction(intent: DeepBookOrderIntent): Transaction {
    if (!this.deepBookPackageId) {
      throw new Error('NEXT_PUBLIC_DEEPBOOK_PREDICT_PACKAGE_ID is required to build DeepBook transactions.');
    }

    const tx = new Transaction();
    tx.setGasBudget(5_000_000);
    tx.moveCall({
      target: `${this.deepBookPackageId}::pool::place_limit_order`,
      arguments: [
        tx.object(intent.poolObjectId),
        tx.object(intent.balanceManagerObjectId),
        tx.pure.u64(intent.clientOrderId),
        tx.pure.u64(intent.priceMist),
        tx.pure.u64(intent.quantityMist),
        tx.pure.bool(intent.isBid),
        tx.object(intent.clockObjectId || '0x6'),
      ],
    });

    emitObservabilityEvent('deepbook', 'build_place_limit_order', 'info', {
      network: this.network,
      target: `${this.deepBookPackageId}::pool::place_limit_order`,
      clientOrderId: intent.clientOrderId,
    });

    return tx;
  }

  buildCancelOrderTransaction(intent: DeepBookCancelIntent): Transaction {
    if (!this.deepBookPackageId) {
      throw new Error('NEXT_PUBLIC_DEEPBOOK_PREDICT_PACKAGE_ID is required to build DeepBook transactions.');
    }

    const tx = new Transaction();
    tx.setGasBudget(5_000_000);
    tx.moveCall({
      target: `${this.deepBookPackageId}::pool::cancel_order`,
      arguments: [
        tx.object(intent.poolObjectId),
        tx.object(intent.balanceManagerObjectId),
        tx.pure.u64(intent.clientOrderId),
        tx.object(intent.clockObjectId || '0x6'),
      ],
    });

    emitObservabilityEvent('deepbook', 'build_cancel_order', 'info', {
      network: this.network,
      target: `${this.deepBookPackageId}::pool::cancel_order`,
      clientOrderId: intent.clientOrderId,
    });

    return tx;
  }

  buildReplaceOrderTransaction(cancelIntent: DeepBookCancelIntent, placeIntent: DeepBookOrderIntent): Transaction {
    if (!this.deepBookPackageId) {
      throw new Error('NEXT_PUBLIC_DEEPBOOK_PREDICT_PACKAGE_ID is required to build DeepBook transactions.');
    }

    const tx = new Transaction();
    tx.setGasBudget(8_000_000);
    tx.moveCall({
      target: `${this.deepBookPackageId}::pool::cancel_order`,
      arguments: [
        tx.object(cancelIntent.poolObjectId),
        tx.object(cancelIntent.balanceManagerObjectId),
        tx.pure.u64(cancelIntent.clientOrderId),
        tx.object(cancelIntent.clockObjectId || '0x6'),
      ],
    });
    tx.moveCall({
      target: `${this.deepBookPackageId}::pool::place_limit_order`,
      arguments: [
        tx.object(placeIntent.poolObjectId),
        tx.object(placeIntent.balanceManagerObjectId),
        tx.pure.u64(placeIntent.clientOrderId),
        tx.pure.u64(placeIntent.priceMist),
        tx.pure.u64(placeIntent.quantityMist),
        tx.pure.bool(placeIntent.isBid),
        tx.object(placeIntent.clockObjectId || '0x6'),
      ],
    });

    emitObservabilityEvent('deepbook', 'build_replace_order', 'info', {
      network: this.network,
      cancelClientOrderId: cancelIntent.clientOrderId,
      placeClientOrderId: placeIntent.clientOrderId,
    });

    return tx;
  }

  async getOpenOrders(owner: string): Promise<DeepBookOpenOrderSummary[]> {
    const startedAt = performance.now();
    const response = await this.client.getOwnedObjects({
      owner,
      options: { showType: true },
      filter: {
        MatchAny: [
          { StructType: `${this.deepBookPackageId}::pool::Order` },
          { StructType: `${this.deepBookPackageId}::pool::OpenOrder` },
        ],
      },
    });

    const orders = response.data
      .map((entry) => ({
        owner,
        objectId: entry.data?.objectId || '',
        type: entry.data?.type || '',
      }))
      .filter((entry) => entry.objectId.length > 0);

    emitObservabilityEvent('deepbook', 'get_open_orders', 'info', {
      owner,
      count: orders.length,
      latencyMs: Math.round(performance.now() - startedAt),
    });

    return orders;
  }

  async reconcileTransactionDigest(digest: string): Promise<DeepBookReconciliation> {
    const startedAt = performance.now();
    const tx = await this.client.getTransactionBlock({
      digest,
      options: { showEffects: true, showEvents: true },
    });

    const status = tx.effects?.status?.status || 'unknown';
    const gasUsed = tx.effects?.gasUsed?.computationCost || '0';
    const reconciliation: DeepBookReconciliation = {
      digest,
      success: status === 'success',
      status,
      gasUsed,
      timestampMs: tx.timestampMs ? Number(tx.timestampMs) : undefined,
    };

    emitObservabilityEvent('deepbook', 'reconcile_transaction', reconciliation.success ? 'info' : 'warn', {
      digest,
      status,
      gasUsed,
      latencyMs: Math.round(performance.now() - startedAt),
    });

    return reconciliation;
  }

  async getStatus(): Promise<DeepBookStatus> {
    const startedAt = performance.now();
    try {
      await this.client.getLatestSuiSystemState();
    } catch (error) {
      emitObservabilityEvent('deepbook', 'status_check', 'error', {
        rpcReachable: false,
        latencyMs: Math.round(performance.now() - startedAt),
      });
      return {
        rpcReachable: false,
        packageConfigured: Boolean(DEEPBOOK_PREDICT_PACKAGE_ID),
        packageReachable: false,
        packageId: DEEPBOOK_PREDICT_PACKAGE_ID,
        error: error instanceof Error ? error.message : 'Unable to reach Sui RPC',
      };
    }

    if (!DEEPBOOK_PREDICT_PACKAGE_ID) {
      emitObservabilityEvent('deepbook', 'status_check', 'warn', {
        rpcReachable: true,
        packageConfigured: false,
        latencyMs: Math.round(performance.now() - startedAt),
      });
      return {
        rpcReachable: true,
        packageConfigured: false,
        packageReachable: false,
        packageId: '',
        error: 'Set NEXT_PUBLIC_DEEPBOOK_PREDICT_PACKAGE_ID to enable DeepBook Predict package checks.',
      };
    }

    try {
      const pkg = await this.client.getObject({
        id: DEEPBOOK_PREDICT_PACKAGE_ID,
        options: { showType: true },
      });

      emitObservabilityEvent('deepbook', 'status_check', 'info', {
        rpcReachable: true,
        packageConfigured: true,
        packageReachable: Boolean(pkg.data),
        latencyMs: Math.round(performance.now() - startedAt),
      });

      // Also probe the DeepBook Predict public server
      let predictServerReachable = false;
      let predictServerLatencyMs: number | undefined;
      try {
        const t0 = performance.now();
        const resp = await fetch(`${DEEPBOOK_PREDICT_SERVER}/status`, {
          signal: AbortSignal.timeout(5000),
        });
        predictServerReachable = resp.ok || resp.status === 200;
        predictServerLatencyMs = Math.round(performance.now() - t0);
      } catch {
        predictServerReachable = false;
      }

      return {
        rpcReachable: true,
        packageConfigured: true,
        packageReachable: Boolean(pkg.data),
        packageId: DEEPBOOK_PREDICT_PACKAGE_ID,
        predictServerReachable,
        predictObjectId: DEEPBOOK_PREDICT_OBJECT_ID,
        predictServerLatencyMs,
      };
    } catch (error) {
      emitObservabilityEvent('deepbook', 'status_check', 'error', {
        rpcReachable: true,
        packageConfigured: true,
        packageReachable: false,
        latencyMs: Math.round(performance.now() - startedAt),
      });
      return {
        rpcReachable: true,
        packageConfigured: true,
        packageReachable: false,
        packageId: DEEPBOOK_PREDICT_PACKAGE_ID,
        error: error instanceof Error ? error.message : 'Unable to load DeepBook package',
      };
    }
  }

  async preflightOrder(params: {
    poolId: string;
    ownerAddress: string;
    amountMist: number;
    maxAllowedImpactPercent?: number;
    expectedPriceMist?: number;
  }): Promise<DeepBookPreflightResult> {
    const maxImpact = params.maxAllowedImpactPercent ?? 5;
    const expectedPrice = params.expectedPriceMist ?? 1;

    let poolState: Record<string, unknown> | null = null;
    try {
      const pool = await this.client.getObject({ id: params.poolId, options: { showContent: true } });
      poolState = (pool.data?.content as Record<string, unknown>) || null;
    } catch {
      return { valid: false, reason: 'Pool is not reachable.' };
    }

    const poolStatus = String((poolState?.status as string) || 'active').toLowerCase();
    if (poolStatus !== 'active') {
      return { valid: false, reason: `Pool is not active (${poolStatus}).` };
    }

    const balance = await this.client.getBalance({ owner: params.ownerAddress, coinType: '0x2::sui::SUI' });
    const availableMist = Number(balance.totalBalance || '0');
    if (!Number.isFinite(availableMist) || availableMist < params.amountMist) {
      return { valid: false, reason: 'Insufficient wallet balance for order.' };
    }

    const impactPct = Number(((params.amountMist / Math.max(expectedPrice, 1)) * 100) / Math.max(availableMist, 1));
    if (impactPct > maxImpact) {
      return {
        valid: false,
        reason: `Price impact ${impactPct.toFixed(2)}% exceeds ${maxImpact.toFixed(2)}%`,
        impactPct,
      };
    }

    const systemState = await this.client.getLatestSuiSystemState();
    const epochStartMs = Number(systemState.epochStartTimestampMs || Date.now());
    const clockSkewMs = Math.abs(Date.now() - epochStartMs);
    if (clockSkewMs > 5 * 60_000) {
      return {
        valid: false,
        reason: 'Clock skew detected against chain timestamp.',
        clockSkewMs,
      };
    }

    return {
      valid: true,
      impactPct,
      clockSkewMs,
    };
  }
}

export const deepbookService = new DeepBookService('testnet');
