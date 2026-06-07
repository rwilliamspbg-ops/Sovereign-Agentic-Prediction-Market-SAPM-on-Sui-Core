/**
 * A2UI Intent Queue - Manages agent-initiated UI requests
 */

export interface A2UIIntent {
  intentId: string;
  type: 'show-modal' | 'update-context' | 'stream-data' | 'request-action';
  priority: number;
  timestamp: number;
  data: any;
}

export class A2UIIntentQueue {
  private queue: A2UIIntent[] = [];
  private processing: boolean = false;
  
  async enqueue(intent: A2UIIntent): Promise<void> {
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
  
  private async renderModal(data: any): Promise<void> {
    console.log('📊 Rendering agent modal:', data);
    // In real app: trigger UI rendering hook
  }
  
  private async streamToUI(data: any): Promise<void> {
    console.log('📈 Streaming data to UI:', data);
    // In real app: update streaming components
  }
  
  private async updateContext(data: any): Promise<void> {
    console.log('💾 Updating agent context:', data);
  }
  
  private async requestAction(data: any): Promise<void> {
    console.log('⚡ Requesting user action:', data);
  }
}

export const intentQueue = new A2UIIntentQueue();
