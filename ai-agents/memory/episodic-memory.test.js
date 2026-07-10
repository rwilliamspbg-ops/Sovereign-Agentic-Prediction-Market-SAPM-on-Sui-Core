const { test, describe } = require('node:test');
const assert = require('node:assert');
const { EpisodicMemory, MemoryEntry } = require('./episodic-memory');

describe('EpisodicMemory', () => {
  test('should initialize with default config', () => {
    const memory = new EpisodicMemory();
    assert.strictEqual(memory.maxEntriesPerMarket, 100);
    assert.strictEqual(memory.retentionDays, 365);
  });

  test('should store and retrieve memories', () => {
    const memory = new EpisodicMemory({ maxEntriesPerMarket: 5 });

    const entry1 = memory.store('agent-1', 'market-1', 'forecast', { prediction: 'yes', confidence: 80 });
    const entry2 = memory.store('agent-1', 'market-1', 'trade', { stake: 10 });

    assert.ok(entry1 instanceof MemoryEntry);
    assert.strictEqual(entry1.agentId, 'agent-1');
    assert.strictEqual(entry1.marketId, 'market-1');
    assert.strictEqual(entry1.action, 'forecast');

    const retrieved = memory.retrieve('agent-1', 'market-1');
    assert.strictEqual(retrieved.length, 2);
    assert.strictEqual(retrieved[0].id, entry1.id);
    assert.strictEqual(retrieved[1].id, entry2.id);
  });

  test('should enforce max entries limit', () => {
    const memory = new EpisodicMemory({ maxEntriesPerMarket: 2 });

    memory.store('agent-1', 'market-1', 'forecast', { prediction: 'yes' });
    const entry2 = memory.store('agent-1', 'market-1', 'trade', { stake: 10 });
    const entry3 = memory.store('agent-1', 'market-1', 'analyze', {});

    const retrieved = memory.retrieve('agent-1', 'market-1');
    assert.strictEqual(retrieved.length, 2);
    assert.strictEqual(retrieved[0].id, entry2.id);
    assert.strictEqual(retrieved[1].id, entry3.id);
  });

  test('should filter out expired memories in retrieve and retrieveAll', () => {
    const memory = new EpisodicMemory({ retentionDays: 1 });

    // store a current memory
    const entryCurrent = memory.store('agent-1', 'market-1', 'forecast', { prediction: 'yes' });

    // manually inject an expired entry (older than 1 day)
    const expiredTimestamp = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const entryExpired = new MemoryEntry(
      'mem_expired_123',
      'agent-1',
      'market-1',
      'trade',
      null,
      expiredTimestamp,
      {}
    );
    memory.memoryStores.get('agent-1').get('market-1').push(entryExpired);

    // retrieve should only return the current memory
    const retrieved = memory.retrieve('agent-1', 'market-1');
    assert.strictEqual(retrieved.length, 1);
    assert.strictEqual(retrieved[0].id, entryCurrent.id);

    // retrieveAll should also only return current
    const retrievedAll = memory.retrieveAll('agent-1');
    assert.strictEqual(retrievedAll.length, 1);
    assert.strictEqual(retrievedAll[0].id, entryCurrent.id);
  });

  test('should sort retrieveAll memories by timestamp', () => {
    const memory = new EpisodicMemory();

    // store two memories
    const entry1 = memory.store('agent-1', 'market-1', 'forecast', { prediction: 'yes' });
    const entry2 = memory.store('agent-1', 'market-2', 'trade', { stake: 20 });

    // manually reverse their timestamps to test sorting
    entry1.timestamp = new Date(Date.now() + 10000).toISOString();
    entry1._timestampNum = Date.parse(entry1.timestamp);

    const retrievedAll = memory.retrieveAll('agent-1');
    assert.strictEqual(retrievedAll.length, 2);
    // entry2 should come first since we made entry1 later
    assert.strictEqual(retrievedAll[0].id, entry2.id);
    assert.strictEqual(retrievedAll[1].id, entry1.id);
  });

  test('should update memory with outcome and calculate accuracy', () => {
    const memory = new EpisodicMemory();

    // need at least 5 forecasts for accuracy calculation
    for (let i = 0; i < 5; i++) {
      memory.store('agent-1', `market-${i}`, 'forecast', { prediction: 'yes', confidence: 80 });
      memory.updateWithOutcome('agent-1', `market-${i}`, { outcome: 'yes', confidence: 80 });
    }

    const accuracy = memory.calculateAccuracy('agent-1');
    assert.ok(accuracy);
    assert.strictEqual(accuracy.accuracy, 100);
    assert.strictEqual(accuracy.totalForecasts, 5);
  });

  test('should return health check details', () => {
    const memory = new EpisodicMemory();
    memory.store('agent-1', 'market-1', 'forecast', { prediction: 'yes' });

    const health = memory.checkHealth();
    assert.strictEqual(health.status, 'healthy');
    assert.strictEqual(health.agents, 1);
    assert.strictEqual(health.totalEntries, 1);
  });
});
