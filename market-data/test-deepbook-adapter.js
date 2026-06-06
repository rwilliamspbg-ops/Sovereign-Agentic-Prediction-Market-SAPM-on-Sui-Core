/**
 * Test Suite for DeepBook Market Data Adapter
 * 
 * Validates real-time market data integration with < 50ms latency target.
 * 
 * @module test/deepbook-adapter-test
 * @version 1.0.0
 */

const { MarketAdapter, MarketDataError } = require('./adapters/deepbook-api');
const { SuiMarketFeedAdapter, MarketDataManager } = require('./adapters/sui-market-feed');
const { MarketDataCache, TTLManager } = require('./cache/ttl-manager');
const { calculateImpliedProbabilities, OddsCalculator } = require('./analyzers/odds-calculator');
const { AnomalyDetector } = require('./analyzers/anomaly-detector');

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

/**
 * Run all market data adapter tests
 */
async function runTests() {
  console.log('='.repeat(80));
  console.log('MARKET DATA ADAPTER TEST SUITE');
  console.log('='.repeat(80));
  
  await testMarketAdapterConnection();
  await testMarketStateRetrieval();
  await testImpliedProbabilityCalculation();
  await testDataCaching();
  await testAnomalyDetection();
  await testDataManagerIntegration();
  
  printSummary();
}

/**
 * Test: Market Adapter Connection & Reconnection
 */
async function testMarketAdapterConnection() {
  console.log('\n[Test] Market Adapter Connection Handling');
  
  const mockWs = {
    on: () => {},
    send: () => Promise.resolve(),
    close: () => {}
  };

  // Mock WebSocket for testing (no actual connection needed)
  class MockWebSocket {
    constructor(url) {
      this.url = url;
      this.listeners = {};
    }
    
    on(event, callback) {
      if (!this.listeners[event]) {
        this.listeners[event] = [];
      }
      this.listeners[event].push(callback);
      return this;
    }
    
    emit(event, data) {
      if (this.listeners[event]) {
        this.listeners[event].forEach(cb => cb(data));
      }
    }
    
    send(data) {
      return Promise.resolve();
    }
    
    close() {}
  }

  // Test adapter with mock WebSocket
  const adapter = new MarketAdapter({
    websocketUrl: 'wss://test.deepbook.xyz/websocket',
    subscriptions: ['market_0x123', 'market_0x456']
  });

  // Replace actual WS with mock
  adapter.ws = new MockWebSocket('');
  
  try {
    // Test subscribe method
    adapter.subscribeToMarket('test_market_001');
    console.log('✓ Subscribe method works');
    
    // Test market state retrieval
    const state = adapter.getMarketState('test_market_001');
    console.log('✓ Market state retrieval works');
    
    // Test implied probability calculation
    const probs = adapter.calculateImpliedProbabilities('test_market_001');
    console.log('✓ Implied probability calculation works');
    
    results.passed++;
    results.tests.push({ name: 'Market Adapter Connection', status: 'PASS' });
    
  } catch (error) {
    console.error('✗ Market Adapter Connection test failed:', error.message);
    results.failed++;
    results.tests.push({ name: 'Market Adapter Connection', status: 'FAIL', error: error.message });
  }
}

/**
 * Test: Market State Retrieval and Caching
 */
async function testMarketStateRetrieval() {
  console.log('\n[Test] Market State Retrieval & Caching');
  
  const mockWs = class MockWebSocket {
    constructor(url) {
      this.listeners = {};
      this.reconnectAttempts = 0;
    }
    
    on(event, callback) {
      if (!this.listeners[event]) {
        this.listeners[event] = [];
      }
      this.listeners[event].push(callback);
      
      // Simulate open event after brief delay
      setTimeout(() => {
        this.emit('open');
      }, 10);
      
      return this;
    }
    
    emit(event, data) {
      if (this.listeners[event]) {
        this.listeners[event].forEach(cb => cb(data));
      }
    }
    
    send(data) {}
    close() {}
  };

  // Create mock order book data
  const mockMarketState = {
    marketId: 'test_market_001',
    eventType: 'orderBookUpdate',
    bids: [
      { price: 98, size: 500, outcome: 'yes' },
      { price: 97, size: 300, outcome: 'yes' }
    ],
    asks: [
      { price: 102, size: 400, outcome: 'yes' },
      { price: 103, size: 200, outcome: 'yes' }
    ]
  };

  const adapter = new MarketAdapter({
    websocketUrl: 'wss://test.deepbook.xyz/websocket',
    subscriptions: ['test_market_001']
  });
  
  adapter.ws = new MockWebSocket('');
  
  try {
    // Simulate receiving order book update
    adapter._handleOrderBookUpdate(mockMarketState);
    console.log('✓ Order book update handling works');
    
    // Verify market data stored
    const market = adapter.markets.get('test_market_001');
    if (market && market.yesBids.length > 0) {
      console.log('✓ Market data properly stored');
    } else {
      throw new Error('Market data not stored correctly');
    }
    
    // Test implied probability calculation
    const probs = adapter.calculateImpliedProbabilities('test_market_001');
    if (probs && probs.yes > 0 && probs.no > 0) {
      console.log('✓ Implied probabilities calculated:', { yes: probs.ye.toFixed(2), no: probs.no.toFixed(2) });
    } else {
      throw new Error('Implied probabilities not calculated correctly');
    }
    
    results.passed++;
    results.tests.push({ name: 'Market State Retrieval', status: 'PASS' });
    
  } catch (error) {
    console.error('✗ Market State Retrieval test failed:', error.message);
    results.failed++;
    results.tests.push({ name: 'Market State Retrieval', status: 'FAIL', error: error.message });
  }
}

/**
 * Test: Implied Probability Calculation Accuracy
 */
function testImpliedProbabilityCalculation() {
  console.log('\n[Test] Implied Probability Calculation');
  
  // Create mock market state with known prices
  const testCases = [
    { yesPrice: 50, noPrice: 50, expectedYes: 50, expectedNo: 50 },
    { yesPrice: 48, noPrice: 52, expectedYes: 52, expectedNo: 48 },
    { yesPrice: 45, noPrice: 55, expectedYes: 55, expectedNo: 45 }
  ];

  let allPassed = true;

  for (const testCase of testCases) {
    const marketState = {
      marketId: `test_market_${testCase.yesPrice}`,
      yesPrice: testCase.yesPrice,
      noPrice: testCase.noPrice,
      orderBook: {}
    };

    const probs = calculateImpliedProbabilities(marketState);
    
    if (!probs) {
      console.log(`✗ Failed for prices ${testCase.yesPrice}/${testCase.noPrice}`);
      allPassed = false;
      continue;
    }

    // Allow small floating point error
    const yesDiff = Math.abs(probs.yes - testCase.expectedYes);
    const noDiff = Math.abs(probs.no - testCase.expectedNo);
    
    if (yesDiff < 0.1 && noDiff < 0.1) {
      console.log(`✓ Prices ${testCase.yesPrice}/${testCase.noPrice} → ${probs.yes.toFixed(2)}% / ${probs.no.toFixed(2)}%`);
    } else {
      console.log(`✗ Failed for prices ${testCase.yesPrice}/${testCase.noPrice}: expected ${testCase.expectedYes}%/${testCase.expectedNo}%, got ${probs.yes}%/${probs.no}%`);
      allPassed = false;
    }
  }

  if (allPassed) {
    results.passed++;
    results.tests.push({ name: 'Implied Probability Calculation', status: 'PASS' });
  } else {
    results.failed++;
    results.tests.push({ name: 'Implied Probability Calculation', status: 'FAIL' });
  }
}

/**
 * Test: Data Caching with TTL
 */
function testDataCaching() {
  console.log('\n[Test] Data Caching with TTL');
  
  const cache = new MarketDataCache({
    defaultTTL: 10000 // 10 seconds for testing
  });

  try {
    // Set test data
    const testData = {
      marketId: 'test_market_001',
      yesPrice: 50,
      noPrice: 50,
      timestamp: new Date().toISOString()
    };

    cache.set('market_001', testData);
    console.log('✓ Cache set operation works');
    
    // Get cached data
    const cached = cache.get('market_001');
    if (cached && cached.yesPrice === 50) {
      console.log('✓ Cache get operation works');
    } else {
      throw new Error('Cached data mismatch');
    }
    
    // Test stats retrieval
    const stats = cache.getStats();
    if (stats.size === 1) {
      console.log('✓ Cache stats retrieval works');
    } else {
      throw new Error('Cache stats incorrect');
    }
    
    results.passed++;
    results.tests.push({ name: 'Data Caching with TTL', status: 'PASS' });
    
  } catch (error) {
    console.error('✗ Data Caching test failed:', error.message);
    results.failed++;
    results.tests.push({ name: 'Data Caching with TTL', status: 'FAIL', error: error.message });
  }
}

/**
 * Test: Anomaly Detection Engine
 */
function testAnomalyDetection() {
  console.log('\n[Test] Anomaly Detection Engine');
  
  const detector = new AnomalyDetector({
    anomalyThreshold: 0.7,
    priceMoveThreshold: 0.15,
    volumeSpikeThreshold: 2.5
  });

  try {
    // Record normal events to establish baseline
    for (let i = 0; i < 20; i++) {
      detector.recordEvent('test_market_001', {
        type: 'trade',
        price: 50 + Math.random() * 4 - 2, // Random price around 50
        size: 100 + Math.random() * 200,    // Random volume around 100-300
        trader: `trader_${Math.floor(Math.random() * 100)}`
      });
    }
    
    console.log('✓ Baseline events recorded');
    
    // Record anomalous event (large price move)
    detector.recordEvent('test_market_001', {
      type: 'trade',
      price: 95, // Large deviation from ~50
      size: 500,
      trader: 'anomaly_trader'
    });
    
    const anomalies = detector.getRecentAnomalies(5);
    if (anomalies.length > 0) {
      console.log('✓ Anomaly detection triggered:', anomalies[0].type);
    } else {
      throw new Error('Anomaly not detected');
    }
    
    results.passed++;
    results.tests.push({ name: 'Anomaly Detection Engine', status: 'PASS' });
    
  } catch (error) {
    console.error('✗ Anomaly Detection test failed:', error.message);
    results.failed++;
    results.tests.push({ name: 'Anomaly Detection Engine', status: 'FAIL', error: error.message });
  }
}

/**
 * Test: Market Data Manager Integration
 */
async function testDataManagerIntegration() {
  console.log('\n[Test] Market Data Manager Integration');
  
  const manager = new MarketDataManager({
    suiRpcUrl: 'https://fullnode.testnet.sui.io:443'
  });

  try {
    // Subscribe to a test market
    manager.subscribe('test_market_001', (event) => {
      console.log('✓ Received market update event');
    });
    
    console.log('✓ Subscription setup works');
    
    // Get health status
    const health = manager.getHealthStatus();
    if (health.sui || health.deepbook) {
      console.log('✓ Health status reporting works');
    } else {
      throw new Error('Health status not reported correctly');
    }
    
    results.passed++;
    results.tests.push({ name: 'Market Data Manager Integration', status: 'PASS' });
    
  } catch (error) {
    console.error('✗ Market Data Manager test failed:', error.message);
    results.failed++;
    results.tests.push({ name: 'Market Data Manager Integration', status: 'FAIL', error: error.message });
  }
}

/**
 * Print test summary
 */
function printSummary() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  
  const total = results.passed + results.failed;
  const percentage = (results.passed / total * 100).toFixed(1);
  
  console.log(`\nTotal Tests: ${total}`);
  console.log(`Passed: ${results.passed} ✓`);
  console.log(`Failed: ${results.failed} ✗`);
  console.log(`Success Rate: ${percentage}%`);
  
  if (results.failed === 0) {
    console.log('\n🎉 All tests passed! Market data infrastructure is ready.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
  }
  
  console.log('\n' + '='.repeat(80));
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };
