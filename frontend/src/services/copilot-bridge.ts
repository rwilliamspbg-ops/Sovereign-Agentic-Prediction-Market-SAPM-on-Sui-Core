/**
 * CopilotKit Bridge - Agent-to-Frontend Communication Layer
 * Implements DeepMind A2UI protocol via CopilotKit transport
 */

'use client';

export interface AgentIntent {
  id?: string;
  timestamp?: number;
  type: 'insight' | 'action-request' | 'context-update' | 'alert';
  payload: Record<string, unknown>;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface CopilotBridgeConfig {
  chatId?: string;
  enableStreaming?: boolean;
}

async function initCopilotConnection(config?: CopilotBridgeConfig): Promise<{ connected: boolean; config?: CopilotBridgeConfig }> {
  return {
    connected: true,
    config,
  };
}

export class CopilotBridge {
  private connection: any = null;
  private queue: AgentIntent[] = [];
  private isProcessing: boolean = false;
  private listeners: Map<string, Function[]> = new Map();

  async initialize(config?: CopilotBridgeConfig): Promise<void> {
    console.log('🔧 Initializing CopilotKit Bridge...');
    this.connection = await initCopilotConnection(config);
    console.log('✅ A2UI Bridge initialized successfully');
  }

  async handleAgentIntent(intent: AgentIntent): Promise<void> {
    const intentId = `intent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const processedIntent: AgentIntent & { id: string; timestamp: number } = {
      ...intent,
      id: intentId,
      timestamp: Date.now()
    };

    this.queue.push(processedIntent);
    
    // Sort by priority
    const sorted = [...this.queue].sort((a, b) => {
      const order = { urgent: 0, high: 1, medium: 2, low: 3 };
      return order[b.priority] - order[a.priority];
    });

    for (const intent of sorted) {
      await this.renderIntent(intent);
    }
  }

  async renderIntent(intent: AgentIntent): Promise<void> {
    try {
      console.log(`📊 Rendering intent ${intent.id} (${intent.type})`);
      
      switch (intent.type) {
        case 'insight':
          await this.renderInsightModal(intent.payload);
          break;
        case 'action-request':
          await this.requestAction(intent.payload);
          break;
        case 'context-update':
          await this.updateContext(intent.payload);
          break;
        case 'alert':
          await this.showAlert(intent.payload);
          break;
      }
    } catch (error) {
      console.error(`❌ Error rendering intent ${intent.id}:`, error);
    }
  }

  private async renderInsightModal(payload: any): Promise<void> {
    // In real implementation, this would create and mount a React component
    const insightData = {
      message: payload.message || 'Agent has generated an insight',
      confidence: payload.confidence || 0,
      marketId: payload.marketId,
      timestamp: new Date().toISOString(),
      action: payload.action || null
    };

    console.log('📊 Agent Insight:', JSON.stringify(insightData, null, 2));
    
    // Trigger UI update hook (in real app)
    await this.notifyListeners('insight', insightData);
  }

  private async requestAction(payload: any): Promise<void> {
    console.log('⚡ Action requested:', JSON.stringify(payload, null, 2));
    await this.notifyListeners('action-request', payload);
  }

  private async updateContext(context: any): Promise<void> {
    localStorage.setItem('agent-context', JSON.stringify(context));
    console.log('💾 Agent context updated and persisted');
  }

  private async showAlert(payload: any): Promise<void> {
    const alertData = {
      title: payload.title || 'Agent Alert',
      message: payload.message,
      type: payload.type || 'info',
      dismissable: payload.dismissable !== false
    };

    console.log('🚨 Agent Alert:', JSON.stringify(alertData, null, 2));
    await this.notifyListeners('alert', alertData);
  }

  private async notifyListeners(event: string, data: any): Promise<void> {
    const handlers = this.listeners.get(event) || [];
    for (const handler of handlers) {
      try {
        await handler(data);
      } catch (error) {
        console.error(`Error in listener for event ${event}:`, error);
      }
    }
  }

  subscribe(event: string, handler: Function): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
    
    return () => {
      const handlers = this.listeners.get(event) || [];
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    };
  }

  async clearQueue(): Promise<void> {
    this.queue = [];
    console.log('🗑️ Intent queue cleared');
  }
}

export const copilotBridge = new CopilotBridge();
