/**
 * Market Data Integration Layer
 * Wraps Phase 1 backend adapters for frontend consumption
 */

export interface MarketDataEvent {
  marketId: string;
  type: 'price_update' | 'trade' | 'order_book';
  data: any;
  timestamp: Date;
}

/**
 * Market Data Client
 * Manages WebSocket connection and market data subscriptions
 */
export class MarketDataClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000; // ms
  private subscribers: Map<string, Set<Function>> = new Map();
  
  constructor(
    private wsUrl: string = process.env.NEXT_PUBLIC_DEEPBOOK_WS || 'wss://deepbook.testnet.sui.io/ws',
    private heartbeatInterval = 30000, // ms
  ) {
    this.connect();
  }

  /**
   * Establish WebSocket connection
   */
  private connect(): void {
    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        console.log('✓ Connected to DeepBook WebSocket');
        this.reconnectAttempts = 0;
        this.subscribeToAllMarkets();
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMarketUpdate(data);
          
          // Heartbeat handling
          if (data.type === 'ping') {
            this.sendHeartbeat();
          }
        } catch (error) {
          console.error('Failed to parse market update:', error);
        }
      };

      this.ws.onerror = (error: Event) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }

  /**
   * Subscribe to all markets
   */
  private subscribeToAllMarkets(): void {
    // In production, send subscription message to WebSocket
    // this.ws?.send(JSON.stringify({ action: 'subscribe', type: 'all_markets' }));
  }

  /**
   * Handle incoming market update
   */
  private handleMarketUpdate(data: any): void {
    const marketId = data.market_id || data.marketId;
    
    if (marketId) {
      // Notify subscribers
      this.notifySubscribers(marketId, data);
      
      // Update cached market data
      // This would integrate with your state management
    }
  }

  /**
   * Notify all subscribers for a market
   */
  private notifySubscribers(marketId: string, data: any): void {
    const callbacks = this.subscribers.get(marketId);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Subscriber callback error:', error);
        }
      });
    }
  }

  /**
   * Subscribe to a specific market
   */
  subscribe(marketId: string, callback: Function): () => void {
    if (!this.subscribers.has(marketId)) {
      this.subscribers.set(marketId, new Set());
    }
    const callbacks = this.subscribers.get(marketId)!;
    callbacks.add(callback);
    
    return () => this.unsubscribe(marketId, callback);
  }

  /**
   * Unsubscribe from a market
   */
  unsubscribe(marketId: string, callback: Function): void {
    const callbacks = this.subscribers.get(marketId);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.subscribers.delete(marketId);
      }
    }
  }

  /**
   * Send heartbeat to keep connection alive
   */
  private sendHeartbeat(): void {
    // this.ws?.send(JSON.stringify({ type: 'pong' }));
  }

  /**
   * Attempt reconnection with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    console.log(`Attempting reconnection in ${delay/1000}s...`);
    
    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get latency to server (for monitoring)
   */
  getLatency(): number | null {
    // Implementation depends on your ping/pong mechanism
    return null;
  }
}

/**
 * Create singleton market data client
 */
export const marketDataClient = new MarketDataClient();

export default marketDataClient;
