/**
 * A2UI Intent Queue - Manages agent-initiated UI requests
 */

export interface A2UIIntent {
  intentId: string;
  type: 'show-modal' | 'update-context' | 'stream-data' | 'request-action';
  priority: number;
  timestamp: number;
  data: unknown;
  userId?: string;
  source?: string;
  signature?: string;
}

type ValidationResult = {
  valid: boolean;
  reason?: string;
};

export class A2UIIntentQueue {
  private queue: A2UIIntent[] = [];
  private processing: boolean = false;
  private rateState: Map<string, number[]> = new Map();
  private readonly allowedSources = new Set(
    (process.env.NEXT_PUBLIC_A2UI_ALLOWED_SOURCES || 'copilot-bridge,system')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  );
  private readonly rateLimitWindowMs = 60_000;
  private readonly rateLimitMaxPerWindow = Number(process.env.NEXT_PUBLIC_A2UI_RATE_LIMIT || 30);
  
  async enqueue(intent: A2UIIntent): Promise<void> {
    const validation = await this.validateIntent(intent);
    if (!validation.valid) {
      console.warn(`Invalid intent rejected: ${validation.reason || 'validation failed'}`, {
        intentId: intent.intentId,
        type: intent.type,
      });
      return;
    }

    const userKey = intent.userId || 'anonymous';
    if (!this.checkRateLimit(userKey)) {
      throw new Error(`Rate limit exceeded for intent user ${userKey}`);
    }

    const newQueue = [...this.queue, intent];
    this.queue = newQueue.sort((a, b) => a.priority - b.priority);
    
    await this.processNext();
  }
  
  private async processNext(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    const intent = this.queue.shift();
    this.processing = false;
    
    if (intent) {
      await this.handleIntent(intent);
    }
    
    // Recursively process next
    await this.processNext();
  }
  
  private async handleIntent(intent: A2UIIntent): Promise<void> {
    switch (intent.type) {
      case 'show-modal':
        await this.renderModal(intent.data);
        break;
      
      case 'stream-data':
        await this.streamToUI(intent.data);
        break;
        
      case 'update-context':
        await this.updateContext(intent.data);
        break;
        
      case 'request-action':
        await this.requestAction(intent.data);
        break;
    }
  }
  
  private async renderModal(data: unknown): Promise<void> {
    console.log('📊 Rendering agent modal:', data);
    // In real app: trigger UI rendering hook
  }
  
  private async streamToUI(data: unknown): Promise<void> {
    console.log('📈 Streaming data to UI:', data);
    // In real app: update streaming components
  }
  
  private async updateContext(data: unknown): Promise<void> {
    console.log('💾 Updating agent context:', data);
  }
  
  private async requestAction(data: unknown): Promise<void> {
    console.log('⚡ Requesting user action:', data);
  }

  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const windowStart = now - this.rateLimitWindowMs;
    const history = this.rateState.get(userId) || [];
    const fresh = history.filter((entry) => entry >= windowStart);
    if (fresh.length >= this.rateLimitMaxPerWindow) {
      this.rateState.set(userId, fresh);
      return false;
    }
    fresh.push(now);
    this.rateState.set(userId, fresh);
    return true;
  }

  private async validateIntent(intent: A2UIIntent): Promise<ValidationResult> {
    if (!this.isWhitelistedIntentType(intent.type)) {
      return { valid: false, reason: `Intent type ${intent.type} is not allowed` };
    }

    if (!this.hasValidTimestamp(intent.timestamp)) {
      return { valid: false, reason: 'Intent timestamp is invalid or too old' };
    }

    if (!this.hasAllowedSource(intent.source)) {
      return { valid: false, reason: `Intent source ${intent.source || 'unknown'} is not allowed` };
    }

    if (!this.validatePayloadSchema(intent.data)) {
      return { valid: false, reason: 'Intent payload does not match expected schema' };
    }

    const signatureOk = await this.verifyIntentSignature(intent);
    if (!signatureOk) {
      return { valid: false, reason: 'Intent signature verification failed' };
    }

    return { valid: true };
  }

  private isWhitelistedIntentType(type: A2UIIntent['type']): boolean {
    return ['show-modal', 'update-context', 'stream-data', 'request-action'].includes(type);
  }

  private hasValidTimestamp(timestamp: number): boolean {
    if (!Number.isFinite(timestamp)) {
      return false;
    }
    const driftMs = Math.abs(Date.now() - timestamp);
    return driftMs <= 5 * 60_000;
  }

  private hasAllowedSource(source?: string): boolean {
    if (!source) {
      return false;
    }
    return this.allowedSources.has(source);
  }

  private validatePayloadSchema(payload: unknown): boolean {
    if (!payload || typeof payload !== 'object') {
      return false;
    }

    const data = payload as Record<string, unknown>;
    const keys = Object.keys(data);
    return keys.length > 0 && keys.length <= 64;
  }

  private async verifyIntentSignature(intent: A2UIIntent): Promise<boolean> {
    const sharedKey = process.env.NEXT_PUBLIC_A2UI_INTENT_HMAC_KEY || '';
    if (!sharedKey) {
      // Signature verification is optional in local/dev unless a key is configured.
      return true;
    }

    if (!intent.signature) {
      return false;
    }

    const encoder = new TextEncoder();
    const payload = JSON.stringify({
      intentId: intent.intentId,
      type: intent.type,
      priority: intent.priority,
      timestamp: intent.timestamp,
      source: intent.source || '',
      userId: intent.userId || '',
      data: intent.data,
    });

    const cryptoApi = globalThis.crypto?.subtle;
    if (!cryptoApi) {
      return false;
    }

    const key = await cryptoApi.importKey(
      'raw',
      encoder.encode(sharedKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );

    const signatureBuffer = await cryptoApi.sign('HMAC', key, encoder.encode(payload));
    const expectedSignature = this.toBase64(signatureBuffer);
    return expectedSignature === intent.signature;
  }

  private toBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }
}

export const intentQueue = new A2UIIntentQueue();
