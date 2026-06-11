import { WALRUS_AGGREGATOR_URL, WALRUS_PUBLISHER_URL } from '@/lib/sui-config';
import { emitObservabilityEvent } from '@/lib/observability';

export type WalrusStatus = {
  aggregatorUrl: string;
  publisherUrl: string;
  aggregatorReachable: boolean;
  publisherReachable: boolean;
  error?: string;
};

export type WalrusPublishResult = {
  blobId: string;
  raw: unknown;
};

export type WalrusSnapshotManifestV1 = {
  schema: 'sapm.walrus.snapshot.manifest.v1';
  version: 1;
  createdAt: string;
  marketId: string;
  txDigest?: string;
  walletAddress?: string;
  lineage: {
    previousBlobId?: string;
  };
  payloadChecksumSha256: string;
  payload: unknown;
};

export type WalrusManifestValidationResult = {
  valid: boolean;
  errors: string[];
};

async function probeEndpoint(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'GET' });
    // Walrus testnet returns 403 on bare GET / (auth required for root) — treat it as
    // "server reachable" since the endpoint-specific paths (/v1/blobs/…) work fine.
    // A network-level failure throws and we return false; HTTP error codes mean the
    // server is up.
    return response.ok || response.status === 403 || response.status === 404 || response.status === 405;
  } catch {
    return false;
  }
}

export class WalrusService {
  private async digestSha256Hex(input: string): Promise<string> {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoded = new TextEncoder().encode(input);
      const hash = await crypto.subtle.digest('SHA-256', encoded);
      const bytes = Array.from(new Uint8Array(hash));
      return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
    }

    // Node/Jest fallback: use native crypto SHA-256 to keep checksum semantics consistent.
    try {
      const nodeCrypto = await import('crypto');
      return nodeCrypto.createHash('sha256').update(input).digest('hex');
    } catch {
      throw new Error('Unable to compute SHA-256 checksum: SubtleCrypto and Node crypto are unavailable in this runtime.');
    }
  }

  async buildSnapshotManifest(input: {
    marketId: string;
    payload: unknown;
    txDigest?: string;
    walletAddress?: string;
    previousBlobId?: string;
  }): Promise<WalrusSnapshotManifestV1> {
    const payloadJson = JSON.stringify(input.payload);
    const payloadChecksumSha256 = await this.digestSha256Hex(payloadJson);

    return {
      schema: 'sapm.walrus.snapshot.manifest.v1',
      version: 1,
      createdAt: new Date().toISOString(),
      marketId: input.marketId,
      txDigest: input.txDigest,
      walletAddress: input.walletAddress,
      lineage: {
        previousBlobId: input.previousBlobId,
      },
      payloadChecksumSha256,
      payload: input.payload,
    };
  }

  validateSnapshotManifest(manifest: unknown): WalrusManifestValidationResult {
    const errors: string[] = [];

    if (typeof manifest !== 'object' || manifest === null) {
      return { valid: false, errors: ['Manifest must be an object.'] };
    }

    const candidate = manifest as Partial<WalrusSnapshotManifestV1>;

    if (candidate.schema !== 'sapm.walrus.snapshot.manifest.v1') {
      errors.push('schema must be sapm.walrus.snapshot.manifest.v1');
    }
    if (candidate.version !== 1) {
      errors.push('version must be 1');
    }
    if (typeof candidate.createdAt !== 'string' || candidate.createdAt.length === 0) {
      errors.push('createdAt is required');
    }
    if (typeof candidate.marketId !== 'string' || candidate.marketId.length === 0) {
      errors.push('marketId is required');
    }
    if (typeof candidate.payloadChecksumSha256 !== 'string' || candidate.payloadChecksumSha256.length === 0) {
      errors.push('payloadChecksumSha256 is required');
    }
    if (!candidate.lineage || typeof candidate.lineage !== 'object') {
      errors.push('lineage object is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async getStatus(): Promise<WalrusStatus> {
    const startedAt = performance.now();
    const [aggregatorReachable, publisherReachable] = await Promise.all([
      probeEndpoint(WALRUS_AGGREGATOR_URL),
      probeEndpoint(WALRUS_PUBLISHER_URL),
    ]);

    emitObservabilityEvent('walrus', 'status_check', 'info', {
      latencyMs: Math.round(performance.now() - startedAt),
      aggregatorReachable,
      publisherReachable,
      aggregatorUrl: WALRUS_AGGREGATOR_URL,
      publisherUrl: WALRUS_PUBLISHER_URL,
    });

    return {
      aggregatorUrl: WALRUS_AGGREGATOR_URL,
      publisherUrl: WALRUS_PUBLISHER_URL,
      aggregatorReachable,
      publisherReachable,
      error: aggregatorReachable && publisherReachable
        ? undefined
        : 'One or more Walrus endpoints are unreachable. Verify endpoint allowlist/network access.',
    };
  }

  private extractBlobId(payload: unknown): string | null {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const direct = payload as Record<string, unknown>;
    if (typeof direct.blobId === 'string' && direct.blobId.length > 0) {
      return direct.blobId;
    }

    for (const value of Object.values(direct)) {
      if (typeof value === 'object' && value !== null) {
        const nested = this.extractBlobId(value);
        if (nested) {
          return nested;
        }
      }
    }

    return null;
  }

  async publishMarketSnapshot(snapshot: unknown): Promise<WalrusPublishResult> {
    const startedAt = performance.now();
    // PUT through the Next.js rewrite proxy (/api/walrus/blobs) instead of
    // directly to the publisher origin, which blocks cross-origin requests from
    // the browser with CORS 403/CORS-preflight failures.
    const publishPath =
      typeof window !== 'undefined'
        ? '/api/walrus/blobs'
        : `${WALRUS_PUBLISHER_URL}/v1/blobs`;

    const snapshotBytes = new TextEncoder().encode(JSON.stringify(snapshot));

    const response = await fetch(publishPath, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      body: snapshotBytes,
    });

    const text = await response.text();
    let parsed: unknown = text;

    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }

    if (!response.ok) {
      emitObservabilityEvent('walrus', 'publish_failed', 'error', {
        status: response.status,
        latencyMs: Math.round(performance.now() - startedAt),
      });
      throw new Error(`Walrus publish failed (${response.status}): ${text.slice(0, 240)}`);
    }

    const blobId = this.extractBlobId(parsed);
    if (!blobId) {
      emitObservabilityEvent('walrus', 'publish_missing_blob_id', 'error', {
        latencyMs: Math.round(performance.now() - startedAt),
      });
      throw new Error('Walrus publish succeeded but no blobId was found in response payload.');
    }

    emitObservabilityEvent('walrus', 'publish_success', 'info', {
      blobId,
      latencyMs: Math.round(performance.now() - startedAt),
    });

    return { blobId, raw: parsed };
  }

  async getBlob(blobId: string): Promise<unknown> {
    if (!blobId) {
      throw new Error('Blob ID is required.');
    }

    const startedAt = performance.now();
    const response = await fetch(`${WALRUS_AGGREGATOR_URL}/v1/blobs/${blobId}`, { method: 'GET' });
    const text = await response.text();

    if (!response.ok) {
      emitObservabilityEvent('walrus', 'read_failed', 'error', {
        blobId,
        status: response.status,
        latencyMs: Math.round(performance.now() - startedAt),
      });
      throw new Error(`Walrus read failed (${response.status}): ${text.slice(0, 240)}`);
    }

    emitObservabilityEvent('walrus', 'read_success', 'info', {
      blobId,
      latencyMs: Math.round(performance.now() - startedAt),
    });

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
}

export const walrusService = new WalrusService();
