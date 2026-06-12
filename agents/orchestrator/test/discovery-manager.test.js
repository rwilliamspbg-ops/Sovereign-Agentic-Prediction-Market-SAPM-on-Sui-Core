// SPDX-License-Identifier: Apache-2.0

const { DiscoveryManager } = require('../discovery/manager');

describe('Discovery Manager Session Hardening', () => {
  test('establishSession succeeds when key confirmation digest matches peer key', async () => {
    const manager = new DiscoveryManager({});
    const peerPubkey = 'peer-public-key-1';
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
    const manager = new DiscoveryManager({});
    const peerPubkey = 'peer-public-key-2';
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
});
