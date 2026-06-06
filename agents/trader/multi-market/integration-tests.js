/**
 * Integration Tests - Phase 4 Week 1
 * Multi-market portfolio management and orchestrator coordination on Sui
 */

const assert = require('assert');

describe('Multi-Market Portfolio Manager', () => {
 let app;
 let server;
 let baseUrl;
 
 beforeAll(async () => {
   const PORT = process.env.PORT || 3001;
   
   // Import portfolio manager module
   const portManagerApp = require('../portfolio-manager.js');
   app = portManagerApp;
   
   baseUrl = `http://localhost:${PORT}`;
 });

 afterAll((done) => {
   if (server) server.close(done);
 });

 beforeEach((done) => {
   server = app.listen(PORT, () => {
     console.log('[Test] Portfolio manager listening on port', PORT);
     done();
   });
 });

 afterEach((done) => {
   if (server) server.close(done);
 });

 describe('Portfolio Initialization', () => {
   it('should initialize portfolio with initial capital', async () => {
     const response = await fetch(`${baseUrl}/api/v1/portfolio/initialize`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         initialCapital: 100000,
         riskBudget: 1.0
       })
     });

     const data = await response.json();
     
     assert.strictEqual(response.status, 200);
     assert.strictEqual(data.ok, true);
     assert.strictEqual(data.initialCapital, 100000);
   });

   it('should reject invalid initialization', async () => {
     const response = await fetch(`${baseUrl}/api/v1/portfolio/initialize`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         initialCapital: 0, // Invalid
         riskBudget: 1.0
       })
     });

     const data = await response.json();
     
     assert.strictEqual(response.status, 400);
     assert.ok(data.error);
   });
 });

 describe('Market Allocation', () => {
   beforeEach(async () => {
     // Initialize portfolio first
     await fetch(`${baseUrl}/api/v1/portfolio/initialize`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ initialCapital: 100000, riskBudget: 1.0 })
     });
   });

   it('should compute allocations for multi-market signals', async () => {
     const response = await fetch(`${baseUrl}/api/v1/portfolio/compute-allocation`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         signals: [
           { marketId: 'market-1', signal: 0.2, volatility: 0.15, correlations: [] },
           { marketId: 'market-2', signal: 0.3, volatility: 0.2, correlations: [] },
           { marketId: 'market-3', signal: 0.1, volatility: 0.25, correlations: [] }
         ],
         riskBudget: 1.0
       })
     });

     const data = await response.json();
     
     assert.strictEqual(response.status, 200);
     assert.strictEqual(data.ok, true);
     assert.ok(Array.isArray(data.allocations));
     assert.strictEqual(data.allocations.length, 3);
     
     // Check total exposure is within risk budget
     const totalExposure = data.allocations.reduce((sum, a) => sum + a.weight, 0);
     assert.ok(totalExposure <= 1.0);
   });

   it('should handle empty signals gracefully', async () => {
     const response = await fetch(`${baseUrl}/api/v1/portfolio/compute-allocation`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         signals: [],
         riskBudget: 1.0
       })
     });

     const data = await response.json();
     
     assert.strictEqual(response.status, 400);
     assert.ok(data.error);
   });
 });

 describe('Portfolio Rebalance', () => {
   beforeEach(async () => {
     // Initialize and compute allocations first
     await fetch(`${baseUrl}/api/v1/portfolio/initialize`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ initialCapital: 100000, riskBudget: 1.0 })
     });

     await fetch(`${baseUrl}/api/v1/portfolio/compute-allocation`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         signals: [
           { marketId: 'market-1', signal: 0.2, volatility: 0.15, correlations: [] },
           { marketId: 'market-2', signal: 0.3, volatility: 0.2, correlations: [] }
         ],
         riskBudget: 1.0
       })
     });
   });

   it('should execute rebalance in live mode', async () => {
     const response = await fetch(`${baseUrl}/api/v1/portfolio/rebalance`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ dryRun: false })
     });

     const data = await response.json();
     
     assert.strictEqual(response.status, 200);
     assert.ok(data.ok);
     assert.ok(data.executedCount >= 0);
   });

   it('should execute rebalance in dry-run mode', async () => {
     const response = await fetch(`${baseUrl}/api/v1/portfolio/rebalance`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ dryRun: true })
     });

     const data = await response.json();
     
     assert.strictEqual(response.status, 200);
     assert.strictEqual(data.ok, true);
     assert.strictEqual(data.mode, 'DRY_RUN');
   });
 });

 describe('Portfolio State Retrieval', () => {
   beforeEach(async () => {
     // Initialize portfolio
     await fetch(`${baseUrl}/api/v1/portfolio/initialize`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ initialCapital: 100000, riskBudget: 1.0 })
     });
   });

   it('should return current allocations', async () => {
     const response = await fetch(`${baseUrl}/api/v1/portfolio/allocations`);
     
     const data = await response.json();
     assert.strictEqual(response.status, 200);
     assert.ok(data.ok);
   });

   it('should return active markets list', async () => {
     const response = await fetch(`${baseUrl}/api/v1/portfolio/active-markets`);
     
     const data = await response.json();
     assert.strictEqual(response.status, 200);
     assert.ok(data.ok);
     assert.ok(Array.isArray(data.markets));
   });

   it('should return risk metrics', async () => {
     const response = await fetch(`${baseUrl}/api/v1/portfolio/risk-metrics`);
     
     const data = await response.json();
     assert.strictEqual(response.status, 200);
     assert.ok(data.ok);
     assert.ok(data.metrics);
   });
 });

 describe('Health Check', () => {
   it('should return healthy status', async () => {
     const response = await fetch(`${baseUrl}/portfolio/health`);
     
     const data = await response.json();
     assert.strictEqual(response.status, 200);
     assert.strictEqual(data.ok, true);
     assert.strictEqual(data.service, 'multi-market-portfolio-manager');
   });
 });
});

describe('Orchestrator Trading Coordinator', () => {
 let app;
 let server;
 let baseUrl;
 
 beforeAll(async () => {
   const PORT = process.env.PORT || 3002;
   
   // Import orchestrator module
   const orchestratorApp = require('../orchestrator.js');
   app = orchestratorApp;
   
   baseUrl = `http://localhost:${PORT}`;
 });

 afterAll((done) => {
   if (server) server.close(done);
 });

 beforeEach((done) => {
   server = app.listen(PORT, () => {
     console.log('[Test] Orchestrator listening on port', PORT);
     done();
   });
 });

 afterEach((done) => {
   if (server) server.close(done);
 });

 describe('Multi-Market Order Execution', () => {
   beforeEach(async () => {
     // Initialize portfolio first
     await fetch(`${baseUrl}/api/v1/portfolio/initialize`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ initialCapital: 100000, riskBudget: 1.0 })
     });

     // Compute allocation
     await fetch(`${baseUrl}/api/v1/portfolio/compute-allocation`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         signals: [
           { marketId: 'market-1', signal: 0.2, volatility: 0.15, correlations: [] },
           { marketId: 'market-2', signal: 0.3, volatility: 0.2, correlations: [] }
         ],
         riskBudget: 1.0
       })
     });
   });

   it('should execute multi-market order successfully', async () => {
     const response = await fetch(`${baseUrl}/api/v1/trading/execute-order`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         action: 'BUY',
         markets: [
           { marketId: 'market-1', side: 'BUY', size: 100, price: 5.0, metadata: {} },
           { marketId: 'market-2', side: 'SELL', size: 50, price: 3.0, metadata: {} }
         ]
       })
     });

     const data = await response.json();
     
     assert.strictEqual(response.status, 200);
     assert.ok(data.ok);
     assert.strictEqual(data.executedCount, 2);
   });

   it('should handle invalid action', async () => {
     const response = await fetch(`${baseUrl}/api/v1/trading/execute-order`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         action: 'INVALID_ACTION', // Invalid
         markets: []
       })
     });

     const data = await response.json();
     
     assert.strictEqual(response.status, 400);
     assert.ok(data.error);
   });
 });

 describe('Portfolio State Retrieval', () => {
   beforeEach(async () => {
     // Initialize portfolio with some executions
     await fetch(`${baseUrl}/api/v1/portfolio/initialize`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ initialCapital: 100000, riskBudget: 1.0 })
     });

     // Execute some orders to populate state
     await fetch(`${baseUrl}/api/v1/trading/execute-order`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         action: 'BUY',
         markets: [
           { marketId: 'market-1', side: 'BUY', size: 100, price: 5.0 }
         ]
       })
     });
   });

   it('should return portfolio state', async () => {
     const response = await fetch(`${baseUrl}/api/v1/portfolio-state`);
     
     const data = await response.json();
     assert.strictEqual(response.status, 200);
     assert.ok(data.ok);
   });

   it('should return execution results', async () => {
     const response = await fetch(`${baseUrl}/api/v1/execution-results`);
     
     const data = await response.json();
     assert.strictEqual(response.status, 200);
     assert.ok(data.ok);
     assert.ok(Array.isArray(data.results));
   });
 });

 describe('Health Check', () => {
   it('should return healthy status', async () => {
     const response = await fetch(`${baseUrl}/health`);
     
     const data = await response.json();
     assert.strictEqual(response.status, 200);
     assert.strictEqual(data.ok, true);
     assert.strictEqual(data.service, 'orchestrator-trading-coordinator');
   });
 });
});

describe('Aggregator Webhook Handler', () => {
 let app;
 let server;
 let baseUrl;
 
 beforeAll(async () => {
   const PORT = process.env.PORT || 3003;
   
   // Import webhook handler module
   const aggregatorApp = require('../webhook-handler.js');
   app = aggregatorApp;
   
   baseUrl = `http://localhost:${PORT}`;
 });

 afterAll((done) => {
   if (server) server.close(done);
 });

 beforeEach((done) => {
   server = app.listen(PORT, () => {
     console.log('[Test] Aggregator webhook handler listening on port', PORT);
     done();
   });
 });

 afterEach((done) => {
   if (server) server.close(done);
 });

 describe('Trading Callback', () => {
   it('should handle trading callback successfully', async () => {
     const response = await fetch(`${baseUrl}/api/v1/trading-callback`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         forecastId: 'forecast-123',
         decision: 'EXECUTE',
         timestamp: new Date().toISOString(),
         round: 1,
         modelHash: 'abc123',
         onchain: { submitted: true, txDigest: 'tx_digest_123' }
       })
     });

     const data = await response.json();
     
     assert.strictEqual(response.status, 200);
     assert.ok(data.ok);
     assert.ok(data.auditEntryId);
   });

   it('should reject missing required fields', async () => {
     const response = await fetch(`${baseUrl}/api/v1/trading-callback`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         // Missing forecastId and decision
         timestamp: new Date().toISOString()
       })
     });

     const data = await response.json();
     
     assert.strictEqual(response.status, 400);
     assert.ok(data.error);
   });
 });

 describe('Portfolio Rebalance', () => {
   beforeEach(async () => {
     // Initialize model state files for testing
     const MODEL_DIR = process.env.MODEL_DIR || '/data';
     
     await fs.promises.mkdir(MODEL_DIR, { recursive: true });
     await fs.promises.writeFile(
       path.join(MODEL_DIR, 'model.json'),
       JSON.stringify({ type: 'aggregated', version: '1.0' })
     );

     await fs.promises.writeFile(
       path.join(MODEL_DIR, 'model.meta.json'),
       JSON.stringify({ 
         round: 1,
         hash: 'test_hash_123',
         ts: new Date().toISOString(),
         aggregator: { pubkey: 'aggregator_pubkey' }
       })
     );

     // Create updates array with mock data
     updates = [
       [0.1, 0.2, 0.3],
       [0.2, 0.3, 0.4],
       [0.15, 0.25, 0.35]
     ];
   });

   it('should handle portfolio rebalance request', async () => {
     const response = await fetch(`${baseUrl}/api/v1/portfolio-rebalance`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' }
     });

     const data = await response.json();
     
     assert.strictEqual(response.status, 200);
     assert.ok(data.ok);
     assert.ok(data.rebalanceSignal);
   });

   it('should reject when insufficient updates', async () => {
     // Reset updates to fewer than 3
     updates = [
       [0.1, 0.2],
       [0.2, 0.3]
     ];

     const response = await fetch(`${baseUrl}/api/v1/portfolio-rebalance`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' }
     });

     const data = await response.json();
     
     assert.strictEqual(response.status, 400);
     assert.ok(data.error);
   });
 });

 describe('Health Check', () => {
   it('should return healthy status', async () => {
     const response = await fetch(`${baseUrl}/health`);
     
     const data = await response.json();
     assert.strictEqual(response.status, 200);
     assert.ok(data.ok);
   });
 });
});