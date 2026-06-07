import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { DEEPBOOK_PREDICT_PACKAGE_ID } from '@/lib/sui-config';
import { emitObservabilityEvent } from '@/lib/observability';

export type DeepBookStatus = {
  rpcReachable: boolean;
  packageConfigured: boolean;
  packageReachable: boolean;
  packageId: string;
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

      return {
        rpcReachable: true,
        packageConfigured: true,
        packageReachable: Boolean(pkg.data),
        packageId: DEEPBOOK_PREDICT_PACKAGE_ID,
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
}

export const deepbookService = new DeepBookService('testnet');
