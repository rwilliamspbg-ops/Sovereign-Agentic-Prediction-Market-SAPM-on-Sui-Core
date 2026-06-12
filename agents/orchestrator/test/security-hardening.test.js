// SPDX-License-Identifier: Apache-2.0

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const http = require('http');
const { Orchestrator } = require('../core/orchestrator');

describe('Orchestrator Security Hardening', () => {
  const envSnapshot = { ...process.env };

  afterEach(() => {
    process.env = { ...envSnapshot };
  });

  test('rejects invalid peer key signature when signed mode is enabled', async () => {
    const { publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const orchestrator = new Orchestrator({
      peerKeyUrl: 'https://example.invalid/peer-key',
      requireSignedPeerKey: true,
      registryVerificationKey: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    });

    orchestrator.cryptoProvider._getJson = jest.fn().mockResolvedValue({
      publicKey: Buffer.from('peer-public-key').toString('base64'),
      algorithm: 'x25519',
      keyId: 'peer-key-1',
      signature: Buffer.from('invalid-signature').toString('base64'),
    });

    await expect(orchestrator.cryptoProvider.fetchPeerPublicKey())
      .rejects
      .toThrow('Peer key signature verification failed');
  });

  test('accepts valid signed peer key payload', async () => {
    const keyPair = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const orchestrator = new Orchestrator({
      peerKeyUrl: 'https://example.invalid/peer-key',
      requireSignedPeerKey: true,
      registryVerificationKey: keyPair.publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    });

    const payload = {
      publicKey: Buffer.from('peer-public-key').toString('base64'),
      algorithm: 'x25519',
      keyId: 'peer-key-1',
    };

    const signer = crypto.createSign('sha256');
    signer.update(JSON.stringify(payload));
    signer.end();

    const signature = signer.sign(keyPair.privateKey).toString('base64');

    orchestrator.cryptoProvider._getJson = jest.fn().mockResolvedValue({
      ...payload,
      signature,
    });

    await expect(orchestrator.cryptoProvider.fetchPeerPublicKey())
      .resolves
      .toBe(payload.publicKey);
  });

  test('fails key derivation proof verification when MAC is tampered', async () => {
    const orchestrator = new Orchestrator();
    const attestation = {
      measurements: {
        sha256: Buffer.from('attestation-digest').toString('base64'),
      },
    };

    const session = await orchestrator.cryptoProvider.hybridKeyExchange(
      attestation,
      Buffer.from('peer-pub-key-material').toString('base64'),
    );

    orchestrator.cryptoProvider.config.attestationDigestB64 = attestation.measurements.sha256;

    const valid = await orchestrator.cryptoProvider.verifyKeyDerivationProof(session);
    expect(valid).toBe(true);

    const tampered = {
      ...session,
      proof: {
        ...session.proof,
        mac: Buffer.from('tampered-mac').toString('base64'),
      },
    };

    const invalid = await orchestrator.cryptoProvider.verifyKeyDerivationProof(tampered);
    expect(invalid).toBe(false);
  });

  test('rejects revoked attestation certificate fingerprint', async () => {
    const certPath = path.join(__dirname, '../../aggregator/certs/server.crt.pem');
    const certPem = fs.readFileSync(certPath, 'utf8');
    const cert = new crypto.X509Certificate(certPem);

    process.env.REVOKED_CERT_FINGERPRINTS = cert.fingerprint256;

    const orchestrator = new Orchestrator();

    await expect(orchestrator.attestationClient.verifyCertChain(certPem))
      .rejects
      .toThrow('Attestation certificate is revoked');
  });

  test('fails peer key retrieval on endpoint timeout', async () => {
    const orchestrator = new Orchestrator({
      peerKeyUrl: 'http://127.0.0.1:1/peer-key',
      peerKeyTimeoutMs: 10,
      requireSignedPeerKey: false,
    });

    orchestrator.cryptoProvider._getJson = jest.fn().mockRejectedValue(
      new Error('Peer key endpoint timed out after 10ms'),
    );

    await expect(orchestrator.cryptoProvider.fetchPeerPublicKey())
      .rejects
      .toThrow('Peer key endpoint timed out after 10ms');
  });

  test('fails peer key retrieval when endpoint payload omits public key', async () => {
    const orchestrator = new Orchestrator({
      peerKeyUrl: 'https://example.invalid/peer-key',
      requireSignedPeerKey: false,
    });

    orchestrator.cryptoProvider._getJson = jest.fn().mockResolvedValue({
      algorithm: 'x25519',
      keyId: 'peer-key-1',
    });

    await expect(orchestrator.cryptoProvider.fetchPeerPublicKey())
      .rejects
      .toThrow('Peer key payload missing publicKey');
  });

  test('rejects malformed JSON from peer key endpoint', async () => {
    const orchestrator = new Orchestrator({ peerKeyTimeoutMs: 1000 });

    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"publicKey"');
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const url = `http://127.0.0.1:${address.port}/peer-key`;

    try {
      await expect(orchestrator.cryptoProvider._getJson(url))
        .rejects
        .toThrow('Peer key endpoint returned invalid JSON');
    } finally {
      await new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });

  test('returns false for unreachable URL probe', async () => {
    const orchestrator = new Orchestrator({ connectivityTimeoutMs: 15 });
    const reachable = await orchestrator.networkHandler.isReachable('http://127.0.0.1:1/unreachable');
    expect(reachable).toBe(false);
  });

  test('returns false when hugepages are below configured threshold', () => {
    const orchestrator = new Orchestrator({ minHugepages: 8 });
    const spy = jest.spyOn(fs, 'readFileSync').mockReturnValue(
      'HugePages_Total: 2\nHugePages_Free: 1\n',
    );

    try {
      expect(orchestrator.networkHandler._checkHugepages()).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });

  test('returns false when cpu set is effectively unpinned', () => {
    const orchestrator = new Orchestrator({ requireCpuPinning: true });
    const spy = jest.spyOn(fs, 'readFileSync').mockImplementation((targetPath) => {
      if (targetPath === '/proc/self/status') {
        return 'Name:\ttest\nCpus_allowed_list:\t0-7\n';
      }
      if (targetPath === '/sys/devices/system/cpu/online') {
        return '0-7\n';
      }
      throw new Error(`Unexpected read path: ${targetPath}`);
    });

    try {
      expect(orchestrator.networkHandler._checkCPUPinning()).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });
});
