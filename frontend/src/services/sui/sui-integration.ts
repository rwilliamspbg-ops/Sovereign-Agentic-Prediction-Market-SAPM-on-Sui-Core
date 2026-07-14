/**
 * Sui Blockchain Integration Service
 * Handles Move contract interactions and transaction execution
 */

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { SUI_PACKAGE_ID } from '@/lib/sui-config';
import { CircuitBreaker } from '@/lib/circuit-breaker';
import { emitObservabilityEvent } from '@/lib/observability';
import { signAndExecuteWalletTransaction, type WalletExecutionContext } from '@/services/sui/wallet-standard';

type Chain = 'testnet' | 'mainnet';

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_GAS_BUDGET_MIST = 5_000_000;

export class SuiIntegrationService {
  private suiClient: SuiClient | null = null;
  private network: 'testnet' | 'mainnet' = 'testnet';
  private packageId: string = SUI_PACKAGE_ID;
  private modelCircuitBreaker = new CircuitBreaker({
    failureThreshold: 4,
    resetTimeoutMs: 30_000,
    halfOpenMaxCalls: 1,
  });
  private txCircuitBreaker = new CircuitBreaker({
    failureThreshold: 3,
    resetTimeoutMs: 20_000,
    halfOpenMaxCalls: 1,
  });
  
  constructor(network: 'testnet' | 'mainnet' = 'testnet') {
    this.network = network;
  }
  
  async initialize(): Promise<void> {
    // Initialize Sui client with RPC endpoint
    const rpcUrl = this.getRpcUrl();
    this.suiClient = new SuiClient({ url: rpcUrl });

    emitObservabilityEvent('sui', 'integration_initialized', 'info', {
      network: this.network,
      packageId: this.packageId,
    });
  }
  
  private getRpcUrl(): string {
    if (process.env.NEXT_PUBLIC_SUI_RPC) {
      return process.env.NEXT_PUBLIC_SUI_RPC;
    }
    const networks = {
      testnet: getFullnodeUrl('testnet'),
      mainnet: getFullnodeUrl('mainnet')
    };
    
    return networks[this.network];
  }
  
  async getCurrentBalance(walletAddress: string): Promise<number> {
    if (!this.suiClient) {
      throw new Error('Sui client not initialized. Call initialize() first.');
    }
    
    try {
      const balance = await this.suiClient.getBalance({
        owner: walletAddress,
        coinType: '0x2::sui::SUI'
      });
      
      return Number(balance.totalBalance);
    } catch (error) {
      console.error('❌ Error getting balance:', error);
      throw error;
    }
  }
  
  async createMarket(
    question: string,
    resolutionDate: Date,
    walletContext?: WalletExecutionContext
  ): Promise<any> {
    this.requireClient();
    if (!walletContext) {
      throw new Error('Wallet context is required for createMarket. Connect wallet first.');
    }

    const tx = new Transaction();
    tx.setGasBudget(DEFAULT_GAS_BUDGET_MIST);

    const target = process.env.NEXT_PUBLIC_SUI_CREATE_MARKET_TARGET || `${this.packageId}::prediction_market::create_market`;

    // prediction_market::create_market(question: vector<u8>, resolution_epoch: u64)
    // Encode question as UTF-8 bytes; resolution_epoch as Unix seconds (u64).
    const questionBytes = Array.from(new TextEncoder().encode(question));
    const resolutionEpoch = BigInt(Math.floor(resolutionDate.getTime() / 1000));

    tx.moveCall({
      target,
      arguments: [
        tx.pure.vector('u8', questionBytes),
        tx.pure.u64(resolutionEpoch),
      ],
    });

    const startedAt = performance.now();
    const execution = await this.txCircuitBreaker.execute(() =>
      signAndExecuteWalletTransaction(walletContext, tx, this.network),
    );

    emitObservabilityEvent('trade', 'create_market', 'info', {
      marketQuestion: question.slice(0, 120),
      target,
      digest: execution.digest,
      latencyMs: Math.round(performance.now() - startedAt),
    });

    return { digest: execution.digest, target };
  }
  
  async predictOutcome(marketId: string, modelServiceUrl?: string): Promise<any> {
    this.requireClient();
    const baseUrl = (modelServiceUrl || process.env.NEXT_PUBLIC_MODEL_SERVICE_URL || '').trim();
    if (!baseUrl) {
      throw new Error(`predictOutcome requires model service URL for market ${marketId}`);
    }

    const startedAt = performance.now();
    return this.modelCircuitBreaker.execute(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), Number(process.env.NEXT_PUBLIC_MODEL_TIMEOUT_MS || DEFAULT_TIMEOUT_MS));
      try {
        const response = await fetch(`${baseUrl.replace(/\/$/, '')}/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ marketId }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Model service returned HTTP ${response.status}`);
        }

        const payload = await response.json();
        emitObservabilityEvent('trade', 'predict_outcome', 'info', {
          marketId,
          modelServiceUrl: baseUrl,
          latencyMs: Math.round(performance.now() - startedAt),
        });
        return payload;
      } finally {
        clearTimeout(timeoutId);
      }
    });
  }
  
  async executeTrade(
    marketId: string,
    outcome: 'yes' | 'no',
    amount: number,
    walletContext?: WalletExecutionContext
  ): Promise<any> {
    this.requireClient();
    if (!walletContext) {
      throw new Error('Wallet context is required for executeTrade. Connect wallet first.');
    }

    if (!/^0x[0-9a-fA-F]{1,64}$/.test(marketId)) {
      throw new Error(`Invalid market object id: ${marketId}`);
    }

    const tx = new Transaction();
    tx.setGasBudget(DEFAULT_GAS_BUDGET_MIST);
    // Correct target: prediction_market::open_position is the entry for YES/NO stake
    const target = process.env.NEXT_PUBLIC_SUI_TRADE_TARGET || `${this.packageId}::prediction_market::open_position`;

    // open_position(market: &mut PredictionMarket, side: u8, stake: Coin<SUI>, ctx)
    // side: 1 = YES, 2 = NO (matches OUTCOME_YES / OUTCOME_NO constants in Move)
    const side = outcome === 'yes' ? 1 : 2;
    const amountMist = this.toMist(amount);

    // Split a coin of exactly `amountMist` from the gas coin to use as stake
    const [stakeCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(amountMist)]);

    tx.moveCall({
      target,
      arguments: [
        tx.object(marketId),
        tx.pure.u8(side),
        stakeCoin,
      ],
    });

    const startedAt = performance.now();
    const execution = await this.txCircuitBreaker.execute(() =>
      signAndExecuteWalletTransaction(walletContext, tx, this.network as Chain),
    );

    emitObservabilityEvent('trade', 'execute_trade', 'info', {
      marketId,
      outcome,
      amount,
      digest: execution.digest,
      latencyMs: Math.round(performance.now() - startedAt),
    });

    return {
      digest: execution.digest,
      marketId,
      outcome,
      amount,
      target,
    };
  }
  
  async getMarketData(marketId: string): Promise<any> {
    if (!this.suiClient) {
      throw new Error('Sui client not initialized.');
    }
    
    try {
      // Fetch market object from Sui
      const marketObject = await this.suiClient.getObject({
        id: `0x${marketId.replace(/\./g, '')}` // Normalize ID if needed
      });
      
      return {
        success: true,
        market: (marketObject.data as any)?.content || null,
        owner: (marketObject.data as any)?.owner || null,
        createdAt: ''
      };
    } catch (error) {
      console.error('❌ Error getting market data:', error);
      return null;
    }
  }

  async getPackageMetadata(): Promise<any> {
    if (!this.suiClient) {
      throw new Error('Sui client not initialized.');
    }

    try {
      const pkg = await this.suiClient.getObject({
        id: this.packageId,
        options: {
          showType: true,
          showOwner: true,
          showContent: true,
        },
      });

      return {
        packageId: this.packageId,
        exists: Boolean(pkg.data),
        type: pkg.data?.type || null,
      };
    } catch (error) {
      console.error('❌ Error loading package metadata:', error);
      throw error;
    }
  }
  
  async subscribeToMarket(marketId: string, callback: Function): Promise<void> {
    // In real implementation, this would set up Sui event subscription
    console.log(`🔔 Subscribing to market updates: ${marketId}`);
    
    return;
  }

  private requireClient(): SuiClient {
    if (!this.suiClient) {
      throw new Error('Sui client not initialized. Call initialize() first.');
    }
    return this.suiClient;
  }

  private toMist(amount: number): bigint {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Trade amount must be a positive number.');
    }
    return BigInt(Math.floor(amount * 1_000_000_000));
  }
}

export const suiIntegration = new SuiIntegrationService('testnet');
