// SPDX-License-Identifier: Apache-2.0

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DiscoveryManager } = require('../discovery/manager');
const goHybridProvider = require('../core/go-hybrid-provider');

describe('Discovery Manager Session Hardening', () => {
  const envSnapshot = { ...process.env };

  afterEach(() => {
    process.env = { ...envSnapshot };
    goHybridProvider.resetProviderReadinessCache();
    goHybridProvider.resetProviderLifecycleState();
    jest.restoreAllMocks();
  });

  test('establishSession succeeds through Go-backed provider when key confirmation digest matches peer key', async () => {
    const fixturePath = path.join(__dirname, 'fixtures/hybrid-provider-peer-public.txt');
    const peerPubkey = fs.readFileSync(fixturePath, 'utf8').trim();
    const peerDigest = crypto.createHash('sha256').update(peerPubkey).digest('hex');
    const healthSpy = jest.spyOn(goHybridProvider, 'healthCheckProviderLifecycle')
      .mockResolvedValue({ ok: true, checkedAt: new Date().toISOString() });
    const deriveSpy = jest.spyOn(goHybridProvider, 'deriveSession')
      .mockResolvedValue({
        algorithm: 'x25519-mlkem768-go-bridge',
        sessionKey: 'mock-session-key',
        nonce: 'mock-nonce',
        peerKeyDigest: peerDigest,
      });

    const manager = new DiscoveryManager({ useGoHybridProvider: true });
    const attestationData = {
      measurements: {
        sha256: Buffer.from('attestation-digest').toString('base64'),
      },
    };

    const peer = manager.discoverPeer(peerPubkey, 'https://peer.example');
    const result = await manager.establishSession(peer.id, attestationData, peerPubkey);

    expect(result.success).toBe(true);
    expect(result.session.status).toBe('encrypted');
    expect(result.session.keyMaterial.algorithm).toBe('x25519-mlkem768-go-bridge');
    expect(healthSpy).toHaveBeenCalledTimes(1);
    expect(deriveSpy).toHaveBeenCalledTimes(1);
  });

  test('establishSession succeeds with fallback derivation when Go-backed provider is disabled', async () => {
    const manager = new DiscoveryManager({ useGoHybridProvider: false });
    const peerPubkey = 'peer-public-key-fallback';
    const attestationData = {
      measurements: {
        sha256: Buffer.from('attestation-digest').toString('base64'),
      },
    };

    const peer = manager.discoverPeer(peerPubkey, 'https://peer.example');
    const result = await manager.establishSession(peer.id, attestationData, peerPubkey);

    expect(result.success).toBe(true);
    expect(result.session.status).toBe('encrypted');
    expect(result.session.keyMaterial.algorithm).toBe('x25519-mlkem768');
  });

  test('establishSession fails closed when key confirmation digest mismatches', async () => {
    const fixturePath = path.join(__dirname, 'fixtures/hybrid-provider-peer-public.txt');
    const peerPubkey = fs.readFileSync(fixturePath, 'utf8').trim();
    const peerDigest = crypto.createHash('sha256').update(peerPubkey).digest('hex');
    jest.spyOn(goHybridProvider, 'healthCheckProviderLifecycle')
      .mockResolvedValue({ ok: true, checkedAt: new Date().toISOString() });
    jest.spyOn(goHybridProvider, 'deriveSession')
      .mockResolvedValue({
        algorithm: 'x25519-mlkem768-go-bridge',
        sessionKey: 'mock-session-key',
        nonce: 'mock-nonce',
        peerKeyDigest: peerDigest,
      });

    const manager = new DiscoveryManager({ useGoHybridProvider: true });
    const attestationData = {
      measurements: {
        sha256: Buffer.from('attestation-digest').toString('base64'),
      },
    };

    const peer = manager.discoverPeer(peerPubkey, 'https://peer.example');
    const originalPerform = manager._performHybridKeyExchange.bind(manager);
    manager._performHybridKeyExchange = async (...args) => {
      const keys = await originalPerform(...args);
      return {
        ...keys,
        peerDigest: 'mismatched-digest',
      };
    };

    await expect(manager.establishSession(peer.id, attestationData, peerPubkey))
      .rejects
      .toThrow('Discovery key confirmation failed: peer digest mismatch');

    expect(manager.sessions.has(peer.id)).toBe(false);
  });

  test('establishSession fails with readiness diagnostics when Go provider binary is unavailable', async () => {
    process.env.SAPM_HYBRID_KEX_BINARY = '/tmp/not-a-real-provider-binary';

    const manager = new DiscoveryManager({ useGoHybridProvider: true });
    const peerPubkey = 'peer-public-key-readiness-failure';
    const attestationData = {
      measurements: {
        sha256: Buffer.from('attestation-digest').toString('base64'),
      },
    };

    const peer = manager.discoverPeer(peerPubkey, 'https://peer.example');

    await expect(manager.establishSession(peer.id, attestationData, peerPubkey))
      .rejects
      .toThrow('Discovery provider lifecycle health check failed: Hybrid KEX provider readiness check failed');

    expect(manager.sessions.has(peer.id)).toBe(false);

    const runtimeState = goHybridProvider.getProviderRuntimeState();
    expect(runtimeState.lastErrorCategory).toBe(null);

    const readiness = goHybridProvider.getProviderReadinessStatus();
    expect(readiness).toEqual(expect.objectContaining({
      ok: false,
      error: expect.stringContaining('ENOENT'),
    }));
  });

  test('establishSession fails closed when provider lifecycle preflight health check is degraded', async () => {
    const healthSpy = jest.spyOn(goHybridProvider, 'healthCheckProviderLifecycle')
      .mockResolvedValue({ ok: false, error: 'forced-unhealthy-preflight' });
    const deriveSpy = jest.spyOn(goHybridProvider, 'deriveSession');

    const manager = new DiscoveryManager({ useGoHybridProvider: true });
    const peerPubkey = 'peer-public-key-lifecycle-preflight';
    const attestationData = {
      measurements: {
        sha256: Buffer.from('attestation-digest').toString('base64'),
      },
    };

    const peer = manager.discoverPeer(peerPubkey, 'https://peer.example');

    await expect(manager.establishSession(peer.id, attestationData, peerPubkey))
      .rejects
      .toThrow('Discovery provider lifecycle health check failed: forced-unhealthy-preflight');

    expect(deriveSpy).not.toHaveBeenCalled();
    expect(healthSpy).toHaveBeenCalled();
    expect(manager.sessions.has(peer.id)).toBe(false);
  });
});
