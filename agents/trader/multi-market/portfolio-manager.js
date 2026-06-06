/**
 * Multi-Market Portfolio Manager - Phase 4 Week 1
 * Handles portfolio-level risk aggregation, correlation-aware position sizing,
 * and market selection for multi-market trading on Sui
 */

const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();

// Configuration
const PORTFOLIO_CONFIG_FILE = process.env.PORTFOLIO_CONFIG_FILE || 
  path.resolve('/data', 'portfolio.config.json');

// Portfolio state
let portfolioState = {
  totalValue: 0,
  positions: new Map(),
  cashBalance: 0,
  lastRebalance: null,
  riskBudget: 1.0,
  activeMarkets: []
};

/**
 * Initialize portfolio with initial capital and risk parameters
 */
router.post('/initialize', async (req, res) => {
 try {
 const config = req.body;
 
 if (!config.initialCapital || !config.riskBudget) {
 return res.status(400).json({ 
   error: 'missing initialCapital or riskBudget',
   requiredFields: ['initialCapital', 'riskBudget'] 
 });
 }

 // Initialize portfolio state
 portfolioState = {
   totalValue: config.initialCapital,
   cashBalance: config.initialCapital,
   positions: new Map(),
   lastRebalance: null,
   riskBudget: config.riskBudget,
   activeMarkets: [],
   createdAt: Date.now()
 };

 console.log(`[Portfolio] Initialized with $${config.initialCapital} and risk budget ${config.riskBudget}`);

 // Save configuration
 await saveConfig(config);

 res.json({
   ok: true,
   initialCapital: config.initialCapital,
   riskBudget: config.riskBudget,
   timestamp: new Date().toISOString()
 });

 } catch (error) {
 console.error('[Portfolio] Initialization failed:', error.message);
 res.status(500).json({ 
   error: 'initialization failed',
   detail: error.message 
 });
 }
});

/**
 * Compute multi-market position sizing with correlation-aware allocation
 */
router.post('/compute-allocation', async (req, res) => {
 try {
 const signals = req.body.signals; // Array of market signals with volatility estimates
 const riskBudget = req.body.riskBudget || portfolioState.riskBudget;
 
 if (!signals || !Array.isArray(signals)) {
 return res.status(400).json({ error: 'missing signals array' });
 }

 console.log(`[Portfolio] Computing allocation for ${signals.length} markets`);

 // Build correlation matrix from signals (simplified - use actual covariance in production)
 const correlationMatrix = buildCorrelationMatrix(signals);
 
 // Compute risk-adjusted weights using multi-market optimization
 const allocations = await computeRiskAdjustedAllocations({
   signals,
   correlationMatrix,
   riskBudget
 });

 // Update active markets
 portfolioState.activeMarkets = signals.map(s => s.marketId);

 res.json({
   ok: true,
   allocations,
   totalExposure: allocations.reduce((sum, a) => sum + a.weight, 0),
   timestamp: new Date().toISOString()
 });

 } catch (error) {
 console.error('[Portfolio] Allocation computation failed:', error.message);
 res.status(500).json({ 
   error: 'allocation computation failed',
   detail: error.message 
 });
 }
});

/**
 * Execute portfolio rebalance across all active markets
 */
router.post('/rebalance', async (req, res) => {
 try {
 const dryRun = req.body.dryRun || false;

 console.log(`[Portfolio] Rebalancing portfolio (dryRun: ${dryRun})`);

 // Get current allocations
 let currentAllocations = await getCurrentAllocations();
 
 if (!currentAllocations) {
 return res.status(500).json({ error: 'no active markets for rebalancing' });
 }

 // Compute target allocation
 const targetAllocation = await computeRiskAdjustedAllocations({
   signals: getActiveSignals(),
   correlationMatrix: buildCorrelationMatrix(getActiveSignals()),
   riskBudget: portfolioState.riskBudget
 });

 // Determine trades needed
 const trades = computeRebalanceTrades(currentAllocations, targetAllocation);

 if (dryRun) {
 res.json({
   ok: true,
   mode: 'DRY_RUN',
   currentAllocations,
   targetAllocation,
   trades,
   estimatedImpact: estimateTradeImpact(trades)
 });
 } else {
   // Execute rebalance trades
   const executionResults = [];
   
   for (const trade of trades) {
     try {
       const txHash = await executeRebalanceTrade(trade);
       
       executionResults.push({
         marketId: trade.marketId,
         side: trade.side,
         size: trade.size,
         txHash,
         status: 'EXECUTED',
         timestamp: new Date().toISOString()
       });

       console.log(`[Portfolio] Rebalanced ${trade.marketId}: ${txHash}`);
   
     } catch (error) {
       console.error(`[Portfolio] Failed to rebalance ${trade.marketId}:`, error.message);
       executionResults.push({
         marketId: trade.marketId,
         side: trade.side,
         size: trade.size,
         txHash: null,
         status: 'FAILED',
         error: error.message
       });
     }
   }

   // Update portfolio state after rebalance
   await updatePortfolioState(executionResults);

 res.json({
   ok: true,
   mode: 'LIVE',
   executedCount: executionResults.filter(r => r.status === 'EXECUTED').length,
   failedCount: executionResults.filter(r => r.status === 'FAILED').length,
   trades,
   executionResults
 });
 }

 } catch (error) {
 console.error('[Portfolio] Rebalance failed:', error.message);
 res.status(500).json({ 
   error: 'rebalance failed',
   detail: error.message 
 });
 }
});

/**
 * Get current portfolio allocations and positions
 */
router.get('/allocations', async (req, res) => {
 try {
 const allocations = await getCurrentAllocations();
 
 if (!allocations) {
 return res.json({ 
   ok: true,
   allocations: [],
   message: 'No active markets. Call /initialize first.'
 });
 }

 res.json({
   ok: true,
   totalValue: portfolioState.totalValue,
   cashBalance: portfolioState.cashBalance,
   allocations,
   totalExposure: allocations.reduce((sum, a) => sum + a.weight, 0),
   lastRebalance: portfolioState.lastRebalance
 });
 
 } catch (error) {
 console.error('[Portfolio] Failed to get allocations:', error.message);
 res.status(500).json({ 
   error: 'failed to get allocations',
   detail: error.message 
 });
 }
});

/**
 * Get active markets list
 */
router.get('/active-markets', async (req, res) => {
 try {
 const markets = portfolioState.activeMarkets;

 res.json({
   ok: true,
   markets: markets || [],
   count: markets?.length || 0
 });
 
 } catch (error) {
 console.error('[Portfolio] Failed to get active markets:', error.message);
 res.status(500).json({ 
   error: 'failed to get active markets',
   detail: error.message 
 });
 }
});

/**
 * Get portfolio risk metrics
 */
router.get('/risk-metrics', async (req, res) => {
 try {
 const MODEL_DIR = process.env.MODEL_DIR || '/data';
 
 const metricsFile = path.resolve(MODEL_DIR, 'portfolio.risk.json');
 fs.access(metricsFile).catch(() => {
   // No metrics file yet, return defaults
 });

 const txt = await fs.readFile(metricsFile, 'utf8');
 const metrics = JSON.parse(txt);

 res.json({
   ok: true,
   metrics: metrics || {
     volatility: 0.02,
     sharpeRatio: 0,
     maxDrawdown: 0,
     beta: 1.0
   }
 });
 
 } catch (error) {
 console.error('[Portfolio] Failed to get risk metrics:', error.message);
 res.status(500).json({ 
   error: 'failed to get risk metrics',
   detail: error.message 
 });
 }
});

// Utility functions

/**
 * Build correlation matrix from market signals
 */
function buildCorrelationMatrix(signals) {
 const n = signals.length;
 const matrix = new Array(n).fill(null).map(() => new Array(n).fill(0));

 // Simplified correlation calculation (replace with actual covariance in production)
 for (let i = 0; i < n; i++) {
   for (let j = 0; j < n; j++) {
     if (i === j) {
       matrix[i][j] = 1.0; // Perfect correlation with self
     } else {
       // Estimate correlation from signal metadata
       const corr = signals[i].correlation || signals[j].correlation || 0.5;
       matrix[i][j] = corr;
     }
   }
 }

 return matrix;
}

/**
 * Compute risk-adjusted allocations using multi-market optimization
 */
async function computeRiskAdjustedAllocations(params) {
 const { signals, correlationMatrix, riskBudget } = params;
 
 // Simplified mean-variance optimization (replace with full optimizer in production)
 const n = signals.length;
 const weights = new Array(n).fill(0);
 const riskFreeRate = 0.03;

 for (let i = 0; i < n; i++) {
   // Simplified weight calculation based on signal strength and correlation
   const signalStrength = signals[i].signal || 0;
   const avgCorrelation = signals[i].correlations?.reduce((sum, c) => sum + c, 0) / 
     (signals[i].correlations?.length || 1);
   
   weights[i] = signalStrength * (1 - avgCorrelation) / riskFreeRate;
 }

 // Normalize to risk budget
 const totalWeight = weights.reduce((sum, w) => sum + w, 0);
 if (totalWeight === 0) {
 return [];
 }

 const normalizedWeights = weights.map(w => w / totalWeight * riskBudget);

 // Create allocation objects
 return signals.map((signal, i) => ({
   marketId: signal.marketId,
   weight: normalizedWeights[i],
   volatility: signal.volatility || 0.2,
   expectedReturn: signal.signal || 0,
   correlationWithPortfolio: calculateCorrelationWithPortfolio(signal, normalizedWeights, correlationMatrix)
 }));
}

/**
 * Calculate correlation of a single market with the portfolio
 */
function calculateCorrelationWithPortfolio(signal, weights, correlationMatrix) {
 if (!correlationMatrix || !signal.correlations) {
 return 0;
 }

 // Simplified calculation (replace with proper formula in production)
 const weightedAvg = signal.correlations.reduce((sum, corr, i) => 
   sum + weights[i] * corr, 0
 );

 return weightedAvg;
}

/**
 * Get current allocations from portfolio state
 */
async function getCurrentAllocations() {
 try {
 const MODEL_DIR = process.env.MODEL_DIR || '/data';
 
 const allocationsFile = path.resolve(MODEL_DIR, 'portfolio.allocations.json');
 fs.access(allocationsFile).catch(() => {
   // No allocations file yet
   return null;
 });

 const txt = await fs.readFile(allocationsFile, 'utf8');
 const data = JSON.parse(txt);

 return data || [];
 
 } catch (error) {
 console.warn('[Portfolio] Failed to read allocations:', error.message);
 return null;
 }
}

/**
 * Get active market signals from model state
 */
function getActiveSignals() {
 // Simplified - in production, load from actual signal feeds
 return portfolioState.activeMarkets.map(id => ({
   marketId: id,
   signal: 0.1, // Placeholder
   volatility: 0.2,
   correlations: []
 }));
}

/**
 * Compute trades needed to rebalance from current to target allocation
 */
function computeRebalanceTrades(currentAllocations, targetAllocation) {
 const trades = [];

 // Match by market ID
 for (const target of targetAllocation) {
   const existing = currentAllocations.find(c => c.marketId === target.marketId);
   
   if (!existing) {
     // New position - buy full weight
     trades.push({
       marketId: target.marketId,
       side: 'BUY',
       size: portfolioState.cashBalance * target.weight,
       price: 1.0
     });
   } else if (existing.weight !== target.weight) {
     // Rebalance existing position
     const delta = target.weight - existing.weight;
     trades.push({
       marketId: target.marketId,
       side: delta > 0 ? 'BUY' : 'SELL',
       size: Math.abs(portfolioState.cashBalance * delta),
       price: 1.0
     });
   }
 }

 return trades;
}

/**
 * Estimate impact of rebalance trades on portfolio
 */
function estimateTradeImpact(trades) {
 let totalCost = 0;
 
 for (const trade of trades) {
   if (trade.side === 'SELL') {
     totalCost += trade.size * trade.price * 0.001; // Assume 0.1% slippage
   } else {
     totalCost -= trade.size * trade.price * 0.002; // Slightly higher for buys
   }
 }

 return totalCost;
}

/**
 * Execute rebalance trade on Sui (placeholder)
 */
async function executeRebalanceTrade(trade) {
 // Simplified execution - replace with actual SUI SDK call
 console.log(`[Portfolio] Executing trade: ${trade.marketId} ${trade.side} ${trade.size}`);
 
 return `tx_rebalance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Update portfolio state after rebalance execution
 */
async function updatePortfolioState(executionResults) {
 try {
 const MODEL_DIR = process.env.MODEL_DIR || '/data';
 
 // Save updated allocations
 const allocationsFile = path.resolve(MODEL_DIR, 'portfolio.allocations.json');
 
 await fs.writeFile(
   allocationsFile,
   JSON.stringify(executionResults.filter(r => r.status === 'EXECUTED'), null, 2),
   'utf8'
 );

 // Save risk metrics
 const metricsFile = path.resolve(MODEL_DIR, 'portfolio.risk.json');
 const metrics = {
   volatility: 0.15,
   sharpeRatio: 1.2,
   maxDrawdown: -0.08,
   beta: 0.95
 };

 await fs.writeFile(
   metricsFile,
   JSON.stringify(metrics, null, 2),
   'utf8'
 );

 console.log('[Portfolio] Updated portfolio state after rebalance');
 
 } catch (error) {
 console.error('[Portfolio] Failed to update portfolio state:', error.message);
 // Don't throw - continue with execution results
 }
}

/**
 * Save configuration file
 */
async function saveConfig(config) {
 try {
 const dir = path.dirname(PORTFOLIO_CONFIG_FILE);
 await fs.mkdir(dir, { recursive: true });
 
 await fs.writeFile(
   PORTFOLIO_CONFIG_FILE,
   JSON.stringify(config, null, 2),
   'utf8'
 );
 console.log('[Portfolio] Saved configuration');
 } catch (error) {
 console.error('[Portfolio] Failed to save configuration:', error.message);
 }
}

// Health check
router.get('/health', (req, res) => {
 res.json({ 
   ok: true, 
   service: 'multi-market-portfolio-manager',
   timestamp: new Date().toISOString() 
 });
});

const app = express();
app.use(bodyParser.json());
app.use('/api/v1', router);

// Error handling middleware
app.use((err, req, res, next) => {
 console.error('[Portfolio] Unhandled error:', err.stack);
 res.status(500).json({ 
   error: 'internal server error',
   service: 'multi-market-portfolio-manager'
 });
});

module.exports = app;