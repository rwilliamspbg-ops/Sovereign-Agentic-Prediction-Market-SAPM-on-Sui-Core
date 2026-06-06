/**
 * Orchestrator Trading Coordinator - Phase 4 Week 1
 * Multi-market order execution and coordination on Sui
 */

const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const { ethers } = require('ethers'); // For SUI SDK integration

const router = express.Router();

// Configuration
const SUI_RPC_URL = process.env.SUI_RPC_URL || 'http://localhost:9000';
const TRADER_WALLET_PRIVATE_KEY = process.env.TRADER_WALLET_PRIVATE_KEY || null;
const ORDER_BOOK_CONTRACT_ID = process.env.ORDER_BOOK_CONTRACT_ID || null;
const PORTFOLIO_MANAGER_CONTRACT_ID = process.env.PORTFOLIO_MANAGER_CONTRACT_ID || null;

let portfolioState = {
  totalAssets: 0,
  positions: new Map(),
  riskMetrics: {
    exposure: 0,
    volatility: 0.02,
    sharpeRatio: 0
  }
};

/**
 * Execute multi-market order across Sui markets
 */
router.post('/execute-order', async (req, res) => {
 try {
 console.log('[Orchestrator] Processing multi-market order');

 const order = req.body;
 
 if (!order.markets || !Array.isArray(order.markets)) {
 return res.status(400).json({ error: 'missing markets array' });
 }

 if (!order.action || !['BUY', 'SELL', 'HEDGE'].includes(order.action)) {
 return res.status(400).json({ error: 'invalid action' });
 }

 // Parse and validate order details
 const parsedOrders = order.markets.map(m => ({
   marketId: m.marketId,
   side: m.side || order.action,
   size: m.size,
   price: m.price,
   metadata: m.metadata || {}
 }));

 console.log(`[Orchestrator] Executing ${parsedOrders.length} orders across markets`);

 // Simulate batch execution (replace with actual Sui SDK calls)
 const executionResults = [];
 
 for (const marketOrder of parsedOrders) {
   try {
     const txHash = await executeMarketOrder(marketOrder);
     
     executionResults.push({
       marketId: marketOrder.marketId,
       side: marketOrder.side,
       size: marketOrder.size,
       txHash,
       status: 'EXECUTED',
       timestamp: new Date().toISOString()
     });

     console.log(`[Orchestrator] Order executed on ${marketOrder.marketId}: ${txHash}`);
   
   } catch (error) {
     console.error(`[Orchestrator] Failed to execute order on ${marketOrder.marketId}:`, error.message);
     executionResults.push({
       marketId: marketOrder.marketId,
       side: marketOrder.side,
       size: marketOrder.size,
       txHash: null,
       status: 'FAILED',
       error: error.message
     });
   }
 }

 // Update portfolio state
 await updatePortfolioState(executionResults);

 res.json({
   ok: true,
   action: order.action,
   executedCount: executionResults.filter(r => r.status === 'EXECUTED').length,
   failedCount: executionResults.filter(r => r.status === 'FAILED').length,
   executionResults
 });

 } catch (error) {
 console.error('[Orchestrator] Order execution failed:', error.message);
 res.status(500).json({ 
   error: 'order execution failed',
   detail: error.message 
 });
 }
});

/**
 * Execute single market order on Sui
 */
async function executeMarketOrder(marketOrder) {
 try {
 console.log(`[Orchestrator] Executing order for ${marketOrder.marketId}`);
  
 // Build SUI transaction
 const tx = await buildSuiTransaction({
   contractId: ORDER_BOOK_CONTRACT_ID,
   marketId: marketOrder.marketId,
   side: marketOrder.side,
   size: marketOrder.size,
   price: marketOrder.price,
   metadata: marketOrder.metadata || {}
 });

 // Sign and execute transaction
 const signedTx = await signTransaction(TRADER_WALLET_PRIVATE_KEY, tx);
 
 // Execute on Sui (simplified - use actual SDK in production)
 const txHash = await submitToSui(signedTx, SUI_RPC_URL);

 return txHash;
  
 } catch (error) {
 console.error(`[Orchestrator] Failed to build transaction:`, error.message);
 throw new Error(`Transaction construction failed: ${error.message}`);
 }
}

/**
 * Build SUI transaction for market order
 */
async function buildSuiTransaction(params) {
 // Simplified transaction builder - replace with actual SUI SDK
 const txPayload = {
   contractId: params.contractId,
   method: 'executeOrder',
   parameters: {
     marketId: params.marketId,
     side: params.side,
     size: params.size.toString(),
     price: params.price || 0,
     metadata: params.metadata
   }
 };

 console.log(`[Orchestrator] Built transaction payload for ${params.marketId}`);
 
 return txPayload; // In production, this would be encoded as Move bytecode
}

/**
 * Sign transaction with wallet private key
 */
async function signTransaction(privateKey, tx) {
 try {
 console.log('[Orchestrator] Signing transaction');
 
 // Simplified signing - replace with actual SUI SDK signer
 const message = JSON.stringify(tx);
 const hash = crypto.createHash('sha256').update(message).digest('hex');
 
 // In production, use proper Move signature scheme
 return {
   tx: tx,
   signature: `sig:${hash}:${Date.now()}`
 };
  
 } catch (error) {
 console.error('[Orchestrator] Signing failed:', error.message);
 throw new Error(`Signing failed: ${error.message}`);
 }
}

/**
 * Submit transaction to Sui RPC
 */
async function submitToSui(signedTx, rpcUrl) {
 try {
 console.log('[Orchestrator] Submitting to Sui RPC');
 
 // Simplified submission - replace with actual SUI SDK call
 const txHash = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
 
 console.log(`[Orchestrator] Transaction submitted: ${txHash}`);
 return txHash;
  
 } catch (error) {
 console.error('[Orchestrator] Submission failed:', error.message);
 throw new Error(`Submission failed: ${error.message}`);
 }
}

/**
 * Update portfolio state after order execution
 */
async function updatePortfolioState(executionResults) {
 try {
 const MODEL_DIR = process.env.MODEL_DIR || '/data';
 
 // Load current model state
 const modelFile = path.resolve(MODEL_DIR, 'model.json');
 const metaFile = path.resolve(MODEL_DIR, 'model.meta.json');
 
 const txt = await fs.readFile(modelFile, 'utf8');
 const model = JSON.parse(txt);
 
 const metaTxt = await fs.readFile(metaFile, 'utf8');
 const meta = JSON.parse(metaTxt);

 // Update portfolio with execution results
 const executedTxHashes = executionResults
   .filter(r => r.status === 'EXECUTED')
   .map(r => r.txHash);

 console.log(`[Orchestrator] Updated portfolio state with ${executedTxHashes.length} executions`);

 // Persist updated portfolio state
 const portfolioStateFile = path.resolve(MODEL_DIR, 'portfolio.state.json');
 await fs.writeFile(
   portfolioStateFile,
   JSON.stringify({
     lastUpdate: Date.now(),
     executedTxHashes,
     modelHash: meta.hash,
     round: meta.round
   }, null, 2),
   'utf8'
 );

 } catch (error) {
 console.error('[Orchestrator] Failed to update portfolio state:', error.message);
 // Don't throw - continue with execution results
 }
}

/**
 * Get current portfolio state
 */
router.get('/portfolio-state', async (req, res) => {
 try {
 const MODEL_DIR = process.env.MODEL_DIR || '/data';
 
 const stateFile = path.resolve(MODEL_DIR, 'portfolio.state.json');
 fs.access(stateFile).catch(() => {
   // No state file yet, return empty
 });
 
 const txt = await fs.readFile(stateFile, 'utf8');
 const state = JSON.parse(txt);

 res.json({
   ok: true,
   lastUpdate: state.lastUpdate,
   executedTxHashes: state.executedTxHashes || [],
   modelHash: state.modelHash,
   round: state.round
 });
 
 } catch (error) {
 console.error('[Orchestrator] Failed to get portfolio state:', error.message);
 res.status(500).json({ error: 'failed to get portfolio state', detail: error.message });
 }
});

/**
 * Get execution results for recent orders
 */
router.get('/execution-results', async (req, res) => {
 try {
 const MODEL_DIR = process.env.MODEL_DIR || '/data';
 
 const resultsFile = path.resolve(MODEL_DIR, 'execution.results.json');
 fs.access(resultsFile).catch(() => {
   // No results file yet, return empty array
   return res.json({ ok: true, results: [] });
 });
 
 const txt = await fs.readFile(resultsFile, 'utf8');
 const results = JSON.parse(txt);

 res.json({
   ok: true,
   results: results || [],
   count: results?.length || 0
 });
 
 } catch (error) {
 console.error('[Orchestrator] Failed to get execution results:', error.message);
 res.status(500).json({ error: 'failed to get execution results', detail: error.message });
 }
});

// Health check
router.get('/health', (req, res) => {
 res.json({ 
   ok: true, 
   service: 'orchestrator-trading-coordinator',
   timestamp: new Date().toISOString() 
 });
});

const app = express();
app.use(bodyParser.json());
app.use('/api/v1', router);

// Error handling middleware
app.use((err, req, res, next) => {
 console.error('[Orchestrator] Unhandled error:', err.stack);
 res.status(500).json({ 
   error: 'internal server error',
   service: 'orchestrator-trading-coordinator'
 });
});

module.exports = app;