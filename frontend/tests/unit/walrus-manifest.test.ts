import { describe, expect, test } from '@jest/globals';
import { WalrusService } from '@/services/sui/walrus-service';

describe('walrus snapshot manifest', () => {
  const service = new WalrusService();

  test('buildSnapshotManifest includes schema, checksum, lineage and payload', async () => {
    const manifest = await service.buildSnapshotManifest({
      marketId: '0x' + 'a'.repeat(64),
      txDigest: '0x' + 'b'.repeat(64),
      walletAddress: '0x' + 'c'.repeat(64),
      previousBlobId: 'blob-prev-123',
      payload: { foo: 'bar', score: 42 },
    });

    expect(manifest.schema).toBe('sapm.walrus.snapshot.manifest.v1');
    expect(manifest.version).toBe(1);
    expect(manifest.marketId).toBe('0x' + 'a'.repeat(64));
    expect(manifest.lineage.previousBlobId).toBe('blob-prev-123');
    expect(typeof manifest.payloadChecksumSha256).toBe('string');
    expect(manifest.payloadChecksumSha256.length).toBeGreaterThan(0);
  });

  test('validateSnapshotManifest catches malformed manifest', () => {
    const validation = service.validateSnapshotManifest({
      schema: 'wrong.schema',
      version: 2,
      createdAt: '',
      marketId: '',
      payloadChecksumSha256: '',
      lineage: null,
    });

    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  test('checksums differ when payload changes', async () => {
    const manifestA = await service.buildSnapshotManifest({
      marketId: 'market-a',
      payload: { value: 1 },
    });
    const manifestB = await service.buildSnapshotManifest({
      marketId: 'market-a',
      payload: { value: 2 },
    });

    expect(manifestA.payloadChecksumSha256).not.toBe(manifestB.payloadChecksumSha256);
  });
});
