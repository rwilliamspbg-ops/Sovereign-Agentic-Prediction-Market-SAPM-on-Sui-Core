import { WALRUS_AGGREGATOR_URL, WALRUS_PUBLISHER_URL } from '@/lib/sui-config';

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

async function probeEndpoint(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'GET' });
    return response.ok || response.status === 404 || response.status === 405;
  } catch {
    return false;
  }
}

export class WalrusService {
  async getStatus(): Promise<WalrusStatus> {
    const [aggregatorReachable, publisherReachable] = await Promise.all([
      probeEndpoint(WALRUS_AGGREGATOR_URL),
      probeEndpoint(WALRUS_PUBLISHER_URL),
    ]);

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
    const response = await fetch(`${WALRUS_PUBLISHER_URL}/v1/blobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(snapshot),
    });

    const text = await response.text();
    let parsed: unknown = text;

    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }

    if (!response.ok) {
      throw new Error(`Walrus publish failed (${response.status}): ${text.slice(0, 240)}`);
    }

    const blobId = this.extractBlobId(parsed);
    if (!blobId) {
      throw new Error('Walrus publish succeeded but no blobId was found in response payload.');
    }

    return { blobId, raw: parsed };
  }

  async getBlob(blobId: string): Promise<unknown> {
    if (!blobId) {
      throw new Error('Blob ID is required.');
    }

    const response = await fetch(`${WALRUS_AGGREGATOR_URL}/v1/blobs/${blobId}`, { method: 'GET' });
    const text = await response.text();

    if (!response.ok) {
      throw new Error(`Walrus read failed (${response.status}): ${text.slice(0, 240)}`);
    }

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
}

export const walrusService = new WalrusService();
