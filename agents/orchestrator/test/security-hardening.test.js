// SPDX-License-Identifier: Apache-2.0

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
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
});
