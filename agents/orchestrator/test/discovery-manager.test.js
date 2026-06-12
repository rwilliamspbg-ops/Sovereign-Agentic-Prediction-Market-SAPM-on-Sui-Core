// SPDX-License-Identifier: Apache-2.0

const fs = require('fs');
const path = require('path');
const { DiscoveryManager } = require('../discovery/manager');

describe('Discovery Manager Session Hardening', () => {
  const envSnapshot = { ...process.env };

  afterEach(() => {
    process.env = { ...envSnapshot };
  });

  test('establishSession succeeds through Go-backed provider when key confirmation digest matches peer key', async () => {
    const fixturePath = path.join(__dirname, 'fixtures/hybrid-provider-peer-public.txt');
    const peerPubkey = fs.readFileSync(fixturePath, 'utf8').trim();
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
      .toThrow('Hybrid KEX provider readiness check failed');

    expect(manager.sessions.has(peer.id)).toBe(false);
  });
});
