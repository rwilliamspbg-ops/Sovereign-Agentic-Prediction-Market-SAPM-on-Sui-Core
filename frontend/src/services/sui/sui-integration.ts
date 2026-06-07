/**
 * Sui Blockchain Integration Service
 * Handles Move contract interactions and transaction execution
 */

import { SuiClient, Provider, Ed25519WalletAdapter } from '@mysten/sui';
import { getFullnodeUrl, SUI_CHAIN_ID } from '@mysten/wallet-standard';

export class SuiIntegrationService {
  private suiClient: SuiClient | null = null;
  private provider: Provider | null = null;
  private network: 'testnet' | 'mainnet' = 'testnet';
  
  constructor(network: 'testnet' | 'mainnet' = 'testnet') {
    this.network = network;
  }
  
  async initialize(): Promise<void> {
    console.log('🔗 Initializing Sui Integration Service...');
    
    // Initialize Sui client with RPC endpoint
    const rpcUrl = this.getRpcUrl();
    this.suiClient = new SuiClient({ url: rpcUrl });
    
    // Initialize wallet provider
    const walletAdapter = await Ed25519WalletAdapter.init();
    this.provider = await Provider.create(rpcUrl, walletAdapter);
    
    console.log('✅ Sui Integration Service initialized');
    console.log(`📍 Connected to: ${this.network === 'testnet' ? 'Sui Testnet' : 'Sui Mainnet'}`);
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
      const balance = await this.suiClient.object.getBalance({
        owner: walletAddress,
        coinType: '0x0000000000000000000000000000000000000000000000000000000000000001'
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
    
    try {
      // Generate market object ID (simplified - real implementation uses Move contract)
      const objectId = `market_${Date.now()}`;
      
      return {
        success: true,
        marketId: objectId,
        question,
        yesPrice,
        noPrice,
        category,
        resolutionDate: resolutionDate.toISOString(),
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error creating market:', error);
      throw error;
    }
  }
  
  async predictOutcome(marketId: string): Promise<any> {
    if (!this.suiClient) {
      throw new Error('Sui client not initialized.');
    }
    
    try {
      // Call prediction function on Move contract (placeholder)
      const prediction = await this.suiClient.callContract({
        target: 'your_move_contract_object_id', // Replace with actual contract
        function: 'predict_outcome',
        arguments: [marketId],
        typeArguments: [],
        value: '0x0' // SUI payment for gas
      });
      
      return prediction;
    } catch (error) {
      console.error('❌ Error predicting outcome:', error);
      throw error;
    }
  }
  
  async executeTrade(
    marketId: string,
    outcome: 'yes' | 'no',
    amount: number
  ): Promise<any> {
    if (!this.provider || !this.suiClient) {
      throw new Error('Sui client/provider not initialized. Connect wallet first.');
    }
    
    try {
      // Build and execute trade transaction (simplified)
      const tx = await this.provider.signAndExecuteTransaction({
        transaction: {
          moveToCall: {
            module: 'market_module',
            function: 'buy_outcome',
            typeArguments: [outcome],
            arguments: [
              marketId,
              amount.toString()
            ]
          }
        },
        sender: this.provider.getSigner()
      });
      
      return {
        success: true,
        transactionHash: tx.digest,
        marketId,
        outcome,
        amount
      };
    } catch (error) {
      console.error('❌ Error executing trade:', error);
      throw error;
    }
  }
  
  async getMarketData(marketId: string): Promise<any> {
    if (!this.suiClient) {
      throw new Error('Sui client not initialized.');
    }
    
    try {
      // Fetch market object from Sui
      const marketObject = await this.suiClient.object.get({
        id: `0x${marketId.replace(/\./g, '')}` // Normalize ID if needed
      });
      
      return {
        success: true,
        market: marketObject.data.fields,
        owner: marketObject.data.owner,
        createdAt: marketObject.data.timestamp?.toISOString() || ''
      };
    } catch (error) {
      console.error('❌ Error getting market data:', error);
      return null;
    }
  }
  
  async subscribeToMarket(marketId: string, callback: Function): Promise<void> {
    // In real implementation, this would set up Sui event subscription
    console.log(`🔔 Subscribing to market updates: ${marketId}`);
    
    return;
  }
}

export const suiIntegration = new SuiIntegrationService('testnet');
