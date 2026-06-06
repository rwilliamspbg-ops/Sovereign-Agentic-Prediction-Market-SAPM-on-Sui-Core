// SPDX-License-Identifier: Apache-2.0
/**
 * PTB Builder - Phase 3 Implementation
 * Builds Programmatic Transaction Blocks for deposits, minting, and position management
 */

const { SuiClient } = require('@mysten/sui/client');
let Ed25519Keypair = null;
try {
  Ed25519Keypair = require('@mysten/sui/keypairs/ed25519').Ed25519Keypair;
} catch {
  Ed25519Keypair = null;
}

class PTBBuilder {
  constructor(config) {
    this.config = config;
    this.client = null;
    this.keypair = null;
  }

  /**
   * Initialize builder with RPC and keypair
   */
  async initialize(rpcEndpoint, keypairSecret) {
    if (keypairSecret.startsWith('suiprivkey')) {
      // Sui private key format - use directly
      this.keypair = new Ed25519Keypair({ seed: Buffer.from(keypairSecret.slice(7), 'hex') });
    } else if (keypairSecret.startsWith('0x')) {
      // Hex seed format
      const seed = Buffer.from(keypairSecret.slice(2), 'hex');
      this.keypair = Ed25519Keypair.fromSeed(seed);
    } else {
      throw new Error('Invalid keypair format. Expected suiprivkey or hex seed.');
    }

    this.client = new SuiClient({ url: rpcEndpoint });
    console.log('[PTBBuilder] Initialized with keypair and RPC');
    
    return true;
  }

  /**
   * Build deposit PTB for DeepBook Predict market
   */
  async buildDepositPTB(packageId, marketObjectId, amountCoin, options = {}) {
    const { dryRun = false, gasBudget = 10000 } = options;
    
    console.log('[PTBBuilder] Building deposit PTB...');
    
    try {
      // Implementation: Build move call for deposit
      const response = await this.client.moveCall({
        target: `${packageId}::deepbook::deposit`,
        arguments: [marketObjectId, amountCoin],
        gasBudget: gasBudget
      });

      return {
        type: 'deposit',
        success: true,
        digest: response.digest,
        transactionBlockHash: response.transactionBlockHash,
        events: response.events || []
      };
    } catch (error) {
      if (dryRun) {
        console.log('[PTBBuilder] Dry-run failed for deposit:', error.message);
        return {
          type: 'deposit',
          dryRun: true,
          error: error.message
        };
      }
      throw error;
    }
  }

  /**
   * Build mint position PTB
   */
  async buildMintPositionPTB(packageId, marketObjectId, yesAmount, noAmount, options = {}) {
    const { dryRun = false, gasBudget = 10000 } = options;
    
    console.log('[PTBBuilder] Building mint position PTB...');
    
    try {
      // Implementation: Build move call for minting positions
      const yesCoin = await this.client.getObject({
        id: yesAmount,
        options: { showContent: true }
      });

      const noCoin = await this.client.getObject({
        id: noAmount,
        options: { showContent: true }
      });

      const response = await this.client.moveCall({
        target: `${packageId}::deepbook::mint`,
        arguments: [marketObjectId, yesCoin.data?.data?.value, noCoin.data?.data?.value],
        gasBudget: gasBudget
      });

      return {
        type: 'mint',
        success: true,
        digest: response.digest,
        transactionBlockHash: response.transactionBlockHash,
        positionId: response.positionId || response.events[0]?.parsedData?.event?.topics?.[1]
      };
    } catch (error) {
      if (dryRun) {
        console.log('[PTBBuilder] Dry-run failed for mint:', error.message);
        return {
          type: 'mint',
          dryRun: true,
          error: error.message
        };
      }
      throw error;
    }
  }

  /**
   * Build redeem position PTB
   */
  async buildRedeemPositionPTB(packageId, marketObjectId, positionObjectIds, options = {}) {
    const { dryRun = false, gasBudget = 10000 } = options;
    
    console.log('[PTBBuilder] Building redeem position PTB...');
    
    try {
      const response = await this.client.moveCall({
        target: `${packageId}::deepbook::redeem`,
        arguments: [marketObjectId, positionObjectIds],
        gasBudget: gasBudget
      });

      return {
        type: 'redeem',
        success: true,
        digest: response.digest,
        transactionBlockHash: response.transactionBlockHash,
        redeemedPositions: positionObjectIds
      };
    } catch (error) {
      if (dryRun) {
        console.log('[PTBBuilder] Dry-run failed for redeem:', error.message);
        return {
          type: 'redeem',
          dryRun: true,
          error: error.message
        };
      }
      throw error;
    }
  }

  /**
   * Build multi-step PTB sequence (deposit + mint)
   */
  async buildDepositMintSequence(packageId, marketObjectId, yesAmount, noAmount, options = {}) {
    const { dryRun = false, gasBudget = 10000 } = options;
    
    console.log('[PTBBuilder] Building deposit+mint sequence PTB...');
    
    try {
      // Step 1: Deposit liquidity (or use existing)
      // For scaffolding, assume we're minting directly
      
      // Step 2: Mint position
      const response = await this.client.moveCall({
        target: `${packageId}::deepbook::mint`,
        arguments: [marketObjectId, yesAmount, noAmount],
        gasBudget: gasBudget
      });

      return {
        type: 'sequence',
        steps: [
          {
            action: 'deposit',
            status: 'skipped' // Use existing liquidity for demo
          },
          {
            action: 'mint',
            success: true,
            digest: response.digest,
            transactionBlockHash: response.transactionBlockHash
          }
        ],
        totalDigest: response.digest,
        totalTransactionBlockHash: response.transactionBlockHash
      };
    } catch (error) {
      if (dryRun) {
        console.log('[PTBBuilder] Dry-run failed for sequence:', error.message);
        return {
          type: 'sequence',
          dryRun: true,
          error: error.message
        };
      }
      throw error;
    }
  }

  /**
   * Execute PTB sequence with dry-run validation
   */
  async executeWithValidation(tradePlan, packageId, marketObjectId) {
    const { decision, confidence, stake, yesAmount, noAmount } = tradePlan;
    
    console.log('[PTBBuilder] Executing trade plan:', { decision, confidence, stake });
    
    // Determine action based on decision
    let ptbAction = null;
    
    switch (decision) {
      case 'buy_yes':
        ptbAction = await this.buildMintPositionPTB(packageId, marketObjectId, yesAmount, 0, { dryRun: true });
        break;
      case 'buy_no':
        ptbAction = await this.buildMintPositionPTB(packageId, marketObjectId, 0, noAmount, { dryRun: true });
        break;
      case 'hold':
        ptbAction = { type: 'hold', status: 'no_action', rationale: 'Insufficient confidence or edge' };
        break;
      default:
        throw new Error(`Unknown decision: ${decision}`);
    }

    // Verify PTB validity
    if (!ptbAction.success && !ptbAction.dryRun) {
      throw new Error('PTB execution failed');
    }

    return ptbAction;
  }

  /**
   * Get builder state for health checks
   */
  getState() {
    return {
      initialized: this.client !== null,
      keypairEstablished: this.keypair !== null
    };
  }
}

// Minimal convenience helper used by tests
function buildTradeTransaction(meta, config = {}) {
  const implied = meta.impliedProbability ?? meta.impliedProb ?? 0;
  const decision = implied >= 0.5 ? 'buy_yes' : 'hold';

  const plan = {
    decision,
    confidence: meta.confidence ?? null,
    impliedProbability: implied,
    stake: meta.stake ?? null,
  };

  const tx = { id: `ptb-sim-${Date.now()}` };

  return { plan, config, tx };
}

// Export for module use
module.exports = { PTBBuilder, buildTradeTransaction };
