/**
 * Sui Blockchain Integration Service
 * Handles Move contract interactions and transaction execution
 */

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { SUI_PACKAGE_ID } from '@/lib/sui-config';

export class SuiIntegrationService {
  private suiClient: SuiClient | null = null;
  private network: 'testnet' | 'mainnet' = 'testnet';
  private packageId: string = SUI_PACKAGE_ID;
  
  constructor(network: 'testnet' | 'mainnet' = 'testnet') {
    this.network = network;
  }
  
  async initialize(): Promise<void> {
    console.log('🔗 Initializing Sui Integration Service...');
    
    // Initialize Sui client with RPC endpoint
    const rpcUrl = this.getRpcUrl();
    this.suiClient = new SuiClient({ url: rpcUrl });
    
    console.log('✅ Sui Integration Service initialized');
    console.log(`📍 Connected to: ${this.network === 'testnet' ? 'Sui Testnet' : 'Sui Mainnet'}`);
    console.log(`📦 Package ID: ${this.packageId}`);
  }
  
  private getRpcUrl(): string {
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
    yesPrice: number,
    noPrice: number,
    category: string,
    resolutionDate: Date
  ): Promise<any> {
    if (!this.suiClient) {
      throw new Error('Sui client not initialized.');
    }

    // Contract write support requires deployed package/object IDs and wallet signer integration.
    throw new Error('createMarket is not configured: provide deployed Move package IDs and signer integration.');
  }
  
  async predictOutcome(marketId: string): Promise<any> {
    if (!this.suiClient) {
      throw new Error('Sui client not initialized.');
    }

    // AI forecast computation must be sourced from a real model service, not a local stub.
    throw new Error(`predictOutcome is not configured for market ${marketId}: connect model inference service.`);
  }
  
  async executeTrade(
    marketId: string,
    outcome: 'yes' | 'no',
    amount: number
  ): Promise<any> {
    if (!this.suiClient) {
      throw new Error('Sui client not initialized. Connect wallet first.');
    }

    // Frontend now executes wallet-signed testnet transactions via TradeExecution hook.
    throw new Error(`executeTrade service stub removed. Use wallet-signed flow in TradeExecution for market ${marketId}.`);
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
}

export const suiIntegration = new SuiIntegrationService('testnet');
