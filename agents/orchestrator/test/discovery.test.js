// SPDX-License-Identifier: Apache-2.0
/**
 * Discovery Service Tests
 * Tests for agent discovery and matchmaking
 */

const Discovery = require('../discovery/discovery-service');

describe('Discovery Service', () => {
  let discovery;

  beforeEach(() => {
    discovery = new Discovery();
  });

  describe('Service Registration', () => {
    test('should register service', () => {
      const service = discovery.registerService({
        name: 'prediction-service',
        version: '1.0.0',
        port: 3000,
      });
      
      expect(service.id).toBeDefined();
      expect(service.name).toBe('prediction-service');
    });

    test('should maintain service registry', () => {
      discovery.registerService({ name: 'service-1', port: 3001 });
      discovery.registerService({ name: 'service-2', port: 3002 });
      
      const services = discovery.listServices();
      expect(services.length).toBe(2);
    });

    test('should deregister service', () => {
      const service = discovery.registerService({ name: 'test', port: 3000 });
      discovery.deregisterService(service.id);
      
      const services = discovery.listServices();
      expect(services.length).toBe(0);
    });
  });

  describe('Service Discovery', () => {
    test('should discover services by name', () => {
      discovery.registerService({
        name: 'prediction',
        type: 'processor',
      });
      
      const found = discovery.discoverByName('prediction');
      expect(found).toBeDefined();
      expect(found.name).toBe('prediction');
    });

    test('should discover services by type', () => {
      discovery.registerService({
        name: 'prediction-1',
        type: 'processor',
      });
      discovery.registerService({
        name: 'prediction-2',
        type: 'processor',
      });
      discovery.registerService({
        name: 'aggregator',
        type: 'aggregator',
      });
      
      const processors = discovery.discoverByType('processor');
      expect(processors.length).toBe(2);
    });

    test('should discover services by capability', () => {
      discovery.registerService({
        name: 'service-1',
        capabilities: ['ML', 'inference'],
      });
      
      const found = discovery.discoverByCapability('ML');
      expect(found.length).toBeGreaterThan(0);
    });

    test('should discover healthy services', () => {
      const service = discovery.registerService({ name: 'test' });
      discovery.markHealthy(service.id);
      
      const healthy = discovery.discoverHealthy();
      expect(healthy.length).toBe(1);
    });
  });

  describe('Health Checking', () => {
    test('should check service health', async () => {
      const service = discovery.registerService({
        name: 'test',
        healthcheck: { endpoint: '/health' },
      });
      
      const health = await discovery.checkHealth(service.id);
      expect(health).toBeDefined();
    });

    test('should mark service as healthy', () => {
      const service = discovery.registerService({ name: 'test' });
      discovery.markHealthy(service.id);
      
      const status = discovery.getServiceStatus(service.id);
      expect(status.healthy).toBe(true);
    });

    test('should mark service as unhealthy', () => {
      const service = discovery.registerService({ name: 'test' });
      discovery.markUnhealthy(service.id);
      
      const status = discovery.getServiceStatus(service.id);
      expect(status.healthy).toBe(false);
    });

    test('should remove unhealthy services from discovery', () => {
      const service = discovery.registerService({ name: 'test' });
      discovery.markUnhealthy(service.id);
      
      const healthy = discovery.discoverHealthy();
      expect(healthy.find(s => s.id === service.id)).toBeUndefined();
    });
  });

  describe('Load Balancing', () => {
    test('should select least loaded service', () => {
      const s1 = discovery.registerService({ name: 'service-1' });
      const s2 = discovery.registerService({ name: 'service-2' });
      
      discovery.recordLoad(s1.id, 100);
      discovery.recordLoad(s2.id, 50);
      
      const selected = discovery.selectLeastLoaded([s1.id, s2.id]);
      expect(selected).toBe(s2.id);
    });

    test('should balance traffic across services', () => {
      const s1 = discovery.registerService({ name: 'service-1' });
      const s2 = discovery.registerService({ name: 'service-2' });
      
      const balance = discovery.getLoadBalance([s1.id, s2.id]);
      expect(balance[s1.id] + balance[s2.id]).toBeCloseTo(1.0, 1);
    });

    test('should adapt balancing to load changes', () => {
      const s1 = discovery.registerService({ name: 'service-1' });
      discovery.recordLoad(s1.id, 1000);
      
      const balance1 = discovery.getLoadBalance([s1.id]);
      
      discovery.recordLoad(s1.id, 10);
      const balance2 = discovery.getLoadBalance([s1.id]);
      
      expect(balance2[s1.id]).toBeGreaterThan(balance1[s1.id]);
    });
  });

  describe('Service Metadata', () => {
    test('should store service metadata', () => {
      const service = discovery.registerService({
        name: 'test',
        metadata: { version: '1.0', author: 'test' },
      });
      
      const retrieved = discovery.getService(service.id);
      expect(retrieved.metadata.version).toBe('1.0');
    });

    test('should update service metadata', () => {
      const service = discovery.registerService({ name: 'test' });
      discovery.updateMetadata(service.id, { version: '2.0' });
      
      const retrieved = discovery.getService(service.id);
      expect(retrieved.metadata.version).toBe('2.0');
    });

    test('should query services by metadata', () => {
      discovery.registerService({
        name: 'service-1',
        metadata: { region: 'us-east' },
      });
      discovery.registerService({
        name: 'service-2',
        metadata: { region: 'us-west' },
      });
      
      const eastern = discovery.queryByMetadata({ region: 'us-east' });
      expect(eastern.length).toBe(1);
    });
  });

  describe('Error Handling', () => {
    test('should handle duplicate service registration', () => {
      discovery.registerService({ name: 'test' });
      expect(() => {
        discovery.registerService({ name: 'test' });
      }).toThrow();
    });

    test('should handle discovery of non-existent services', () => {
      const found = discovery.discoverByName('non-existent');
      expect(found).toBeNull();
    });

    test('should gracefully handle health check failures', async () => {
      const service = discovery.registerService({
        name: 'test',
        healthcheck: { endpoint: '/health' },
      });
      
      const result = await discovery.checkHealth(service.id);
      expect(result).toBeDefined();
    });
  });
});
