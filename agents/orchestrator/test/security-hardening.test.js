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

  test('accepts valid signed peer key from live local registry-style endpoint', async () => {
    const keyPair = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const payload = {
      publicKey: Buffer.from('peer-public-key-live-endpoint').toString('base64'),
      algorithm: 'x25519',
      keyId: 'peer-key-live-1',
    };

    const signer = crypto.createSign('sha256');
    signer.update(JSON.stringify(payload));
    signer.end();
    const signature = signer.sign(keyPair.privateKey).toString('base64');

    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ...payload, signature }));
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const peerKeyUrl = `http://127.0.0.1:${address.port}/peer-key`;

    try {
      const orchestrator = new Orchestrator({
        peerKeyUrl,
        requireSignedPeerKey: true,
        registryVerificationKey: keyPair.publicKey.export({ type: 'spki', format: 'pem' }).toString(),
      });

      await expect(orchestrator.cryptoProvider.fetchPeerPublicKey())
        .resolves
        .toBe(payload.publicKey);
    } finally {
      await new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
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

  test('fails key derivation proof verification when attestation digest is missing', async () => {
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

    orchestrator.cryptoProvider.config.attestationDigestB64 = '';

    const valid = await orchestrator.cryptoProvider.verifyKeyDerivationProof(session);
    expect(valid).toBe(false);
  });

  test('uses injected hybrid KEX provider for deterministic session derivation', async () => {
    const attestationDigest = crypto.randomBytes(32);
    const providerSessionKey = crypto.randomBytes(32);
    const providerNonce = crypto.randomBytes(32);
    const peerKeyDigest = crypto.createHash('sha256').update(Buffer.from('peer-public-key')).digest('hex');
    const providerProofMac = crypto.createHmac('sha256', providerSessionKey)
      .update(Buffer.concat([attestationDigest, providerNonce, Buffer.from(peerKeyDigest, 'utf8')]))
      .digest();

    const deriveSession = jest.fn().mockResolvedValue({
      algorithm: 'x25519-mlkem768-audited-fixture',
      sessionKey: providerSessionKey,
      nonce: providerNonce,
      peerKeyDigest,
      proofMac: providerProofMac,
    });

    const orchestrator = new Orchestrator({
      hybridKexProvider: { deriveSession },
    });

    const attestation = {
      measurements: {
        sha256: attestationDigest.toString('base64'),
      },
    };
    const peerPublicKey = Buffer.from('peer-public-key').toString('base64');

    const session = await orchestrator.cryptoProvider.hybridKeyExchange(attestation, peerPublicKey);
    orchestrator.cryptoProvider.config.attestationDigestB64 = attestation.measurements.sha256;
    const proofValid = await orchestrator.cryptoProvider.verifyKeyDerivationProof(session);

    expect(deriveSession).toHaveBeenCalledTimes(1);
    expect(deriveSession.mock.calls[0][0].algorithm).toBe('x25519-mlkem768');
    expect(session.algorithm).toBe('x25519-mlkem768-audited-fixture');
    expect(session.sessionKey).toBe(providerSessionKey.toString('base64'));
    expect(proofValid).toBe(true);
  });

  test('fails closed when injected hybrid KEX provider returns invalid session key length', async () => {
    const orchestrator = new Orchestrator({
      hybridKexProvider: {
        deriveSession: jest.fn().mockResolvedValue({
          algorithm: 'x25519-mlkem768-audited-fixture',
          sessionKey: crypto.randomBytes(16),
          nonce: crypto.randomBytes(16),
        }),
      },
    });

    const attestation = {
      measurements: {
        sha256: crypto.randomBytes(32).toString('base64'),
      },
    };

    await expect(
      orchestrator.cryptoProvider.hybridKeyExchange(
        attestation,
        Buffer.from('peer-public-key').toString('base64'),
      ),
    ).rejects.toThrow('Hybrid KEX provider must return a 32-byte sessionKey');
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

  test('accepts attestation certificate when root fingerprint is explicitly trusted', async () => {
    const certPath = path.join(__dirname, '../../aggregator/certs/server.crt.pem');
    const certPem = fs.readFileSync(certPath, 'utf8');
    const cert = new crypto.X509Certificate(certPem);

    const orchestrator = new Orchestrator({
      attestationTrustedRoots: cert.fingerprint256,
    });

    await expect(orchestrator.attestationClient.verifyCertChain(certPem))
      .resolves
      .toBe(true);
  });

  test('rejects attestation certificate when trusted root fingerprint does not match chain root', async () => {
    const certPath = path.join(__dirname, '../../aggregator/certs/server.crt.pem');
    const certPem = fs.readFileSync(certPath, 'utf8');

    const orchestrator = new Orchestrator({
      attestationTrustedRoots: '00:11:22:33:44:55:66:77:88:99:aa:bb:cc:dd:ee:ff',
    });

    await expect(orchestrator.attestationClient.verifyCertChain(certPem))
      .rejects
      .toThrow('Attestation root certificate is not trusted');
  });

  test('loads staging attestation fixture and preserves audited digest', async () => {
    const fixturePath = path.join(__dirname, 'fixtures/attestation-staging-valid.json');
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

    const orchestrator = new Orchestrator({
      teeRuntime: 'tpm2',
      attestationFixturePath: fixturePath,
    });

    const attestation = await orchestrator.attestationClient.readTPM();
    expect(attestation.measurements.sha256).toBe(fixture.measurements.sha256);
    expect(attestation.measurements.source).toBe(fixturePath);
    expect(attestation.evidence.mode).toBe('staging-fixture');
    expect(attestation.evidence.platform).toBe('staging-tpm-node-a');
  });

  test('fails closed when staging attestation fixture digest does not match raw measurement', async () => {
    const fixturePath = path.join(__dirname, 'fixtures/attestation-staging-invalid.json');
    const orchestrator = new Orchestrator({
      teeRuntime: 'tpm2',
      attestationFixturePath: fixturePath,
    });

    await expect(orchestrator.attestationClient.readTPM())
      .rejects
      .toThrow(`Attestation fixture digest mismatch at ${fixturePath}`);
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

  test('treats HTTP 200 and 404 as reachable but 503 as unreachable', async () => {
    const orchestrator = new Orchestrator({ connectivityTimeoutMs: 1000 });

    const server = http.createServer((req, res) => {
      if (req.url === '/ok') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
      }
      if (req.url === '/missing') {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false }));
        return;
      }
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false }));
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;

    try {
      await expect(orchestrator.networkHandler.isReachable(`${baseUrl}/ok`)).resolves.toBe(true);
      await expect(orchestrator.networkHandler.isReachable(`${baseUrl}/missing`)).resolves.toBe(true);
      await expect(orchestrator.networkHandler.isReachable(`${baseUrl}/degraded`)).resolves.toBe(false);
    } finally {
      await new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
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
