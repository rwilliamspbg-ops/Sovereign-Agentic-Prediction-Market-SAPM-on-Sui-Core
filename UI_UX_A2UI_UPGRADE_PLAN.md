# 🤖 A2UI (Agent-to-User Interface) Upgrade Plan
## Integrating DeepMind's Open Agent UI Protocol with SAPM

**Status:** 🚧 Planning | **Priority:** High | **Target:** Phase 3 Integration

---

## 📋 Executive Summary

This plan upgrades SAPM's current static market discovery UI into an **agentic interaction layer** where AI agents can directly initiate, control, and respond to user interactions through three complementary protocols:

| Protocol | Purpose | Key Feature |
|----------|---------|-------------|
| **A2UI (DeepMind)** | Open agent-to-frontend protocol | Agents request UI elements, modals, actions |
| **CopilotKit** | React transport layer | Real-time agent↔frontend bi-directional comms |
| **MCP Apps** | Model Context Protocol | Live agent outputs as interactive UI components |

---

## 🎯 Current State Analysis

### ✅ What Works Now

```
Market Discovery UI (Next.js 14 + TypeScript)
├── Real-time market filtering & sorting
├── AI confidence indicators
├── Modal trading interface
└── Professional dark theme with Sui branding

Agents (Go/Rust/JS)
├── Orchestrator → Task sequencing
├── Aggregator → Byzantine consensus
├── Trader → Trade decisions
└── Onchain-registry → Move contracts
```

### ⚠️ Limitations

1. **Passive UI**: Users must discover markets first
2. **No Agent Initiation**: Agents cannot "pop up" with insights
3. **Static Modals**: Trading requires manual navigation
4. **Limited Context**: No persistent agent memory in UI

---

## 🏗️ Architecture Overview

### Current Flow (Static)

```
User → Browse Markets → Click Modal → Manually Trade
     ↓
No Agent Intervention
```

### Target Flow (Agentic A2UI)

```
┌─────────────────────────────────────────────────────────┐
│  A2UI Layer (Agent-to-UI Protocol)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Agent Intent │→ │ UI Request   │→ │ Render       │  │
│  │ "User wants  │  │ "Show modal" │  │ Component    │  │
│  │   insights"  │  │ "at /modal"  │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                            ↓                             │
│  CopilotKit Transport Layer (Real-time Comms)           │
│  ┌─────────────────────────────────────────────────┐   │
│  │ • useChat() - Agent conversation UI             │   │
│  │ • useCopilotAction() - Trigger agent actions    │   │
│  │ • useUIActions() - Request UI elements          │   │
│  └─────────────────────────────────────────────────┘   │
│                            ↓                             │
│  MCP Applications (Model Context Protocol)              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Live Agent   │→ │ Market Data  │→ │ Trading      │  │
│  │ Forecasts    │  │ Stream       │  │ Execution    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Implementation Plan (Phased)

### Phase 1: Foundation (Week 1-2)

#### A. Install CopilotKit Dependencies

```bash
cd frontend
npm install copilotkit copilotkit-react framer-motion
# or yarn equivalent
```

**Expected Dependencies:**
- `copilotkit`: Core transport layer
- `@copilotkit/react-core`: React hooks
- `framer-motion`: Enhanced animations (already installed)

#### B. Create CopilotKit Bridge Service

File: `frontend/src/services/copilot-bridge.ts`

```typescript
/**
 * CopilotKit Bridge - Agent-to-Frontend Communication Layer
 * Implements DeepMind A2UI protocol via CopilotKit transport
 */

export interface AgentIntent {
  type: 'insight' | 'action-request' | 'context-update' | 'alert';
  payload: Record<string, unknown>;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export class CopilotBridge {
  private connection: any = null; // CopilotKit connection instance
  private queue: AgentIntent[] = [];
  
  async initialize(): Promise<void> {
    // Initialize CopilotKit connection
    this.connection = await initCopilotConnection();
    console.log('✅ A2UI Bridge initialized');
  }
  
  async handleAgentIntent(intent: AgentIntent): Promise<void> {
    // Queue intents for UI rendering
    this.queue.push(intent);
    
    // Process based on priority
    const sorted = [...this.queue].sort((a, b) => {
      const order = { urgent: 0, high: 1, medium: 2, low: 3 };
      return order[b.priority] - order[a.priority];
    });
    
    for (const intent of sorted) {
      await this.renderIntent(intent);
    }
  }
  
  async renderIntent(intent: AgentIntent): Promise<void> {
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
  }
  
  private async renderInsightModal(payload: any): Promise<void> {
    // Render agent insight as floating modal
    console.log('📊 Rendering insight:', payload);
  }
  
  private async requestAction(payload: any): Promise<void> {
    // Request user action via CopilotKit hooks
    console.log('⚡ Action requested:', payload);
  }
}

export const copilotBridge = new CopilotBridge();
```

#### C. Update Layout.tsx for A2UI Hooks

File: `frontend/src/app/layout.tsx` (updated)

```typescript
import { useChat } from 'copilotkit-react';
import { CopilotProvider } from 'copilotkit/react-core';

export default function RootLayout({ children }: any) {
  const chat = useChat(); // Agent conversation hook
  
  return (
    <html lang="en">
      <body>
        <CopilotProvider>
          {/* Agent communication channel */}
          <AgentCommunicationLayer chat={chat} />
          
          {/* Existing SAPM UI */}
          {children}
        </CopilotProvider>
      </body>
    </html>
  );
}

function AgentCommunicationLayer({ chat }: any) {
  // Listen for agent messages
  useEffect(() => {
    const unsubscribe = chat.subscribe('agent-message', (msg) => {
      console.log('🤖 Agent message:', msg);
      // Handle based on intent type
    });
    
    return () => unsubscribe();
  }, [chat]);
  
  return null; // Hook-based, no DOM needed
}
```

---

### Phase 2: A2UI Protocol Integration (Week 3-4)

#### A. Implement DeepMind A2UI Specification

File: `frontend/src/a2ui/agent-intent-handler.ts`

```typescript
/**
 * A2UI Agent Intent Handler - DeepMind Open Protocol
 */

export class A2UIHandler {
  /**
   * Handle incoming agent intent from A2UI protocol
   * @param intent A2UI-formatted agent intent
   */
  async handle(intent: A2UIIntent): Promise<A2UIResponse> {
    const { type, data } = intent;
    
    switch (type) {
      case 'show-modal':
        return this.renderModal(data);
      
      case 'update-context':
        await this.updateAgentContext(data);
        return { success: true };
      
      case 'request-action':
        return await this.requestUserAction(data);
      
      case 'stream-update':
        // Live data streaming to UI
        await this.streamToUI(data);
        break;
    }
  }
  
  private async renderModal({ component, props }: any): Promise<A2UIResponse> {
    // Render agent-requested modal (e.g., trading insights)
    const ModalComponent = getComponent(component);
    
    return {
      success: true,
      response: <ModalComponent {...props} />
    };
  }
  
  private async updateAgentContext(context: any): Promise<void> {
    // Update agent memory/context visible in UI
    localStorage.setItem('agent-context', JSON.stringify(context));
  }
  
  private async requestUserAction({ action, callback }: any): Promise<A2UIResponse> {
    // Use CopilotKit useCopilotAction hook
    return { success: true, actionRequested: action };
  }
}
```

#### B. Create Agent Insight Modals

File: `frontend/src/components/a2ui/AgentInsightModal.tsx`

```typescript
'use client';

import { useChat } from 'copilotkit-react';
import { useState } from 'react';

export function AgentInsightModal({ insight }: { insight: any }) {
  const chat = useChat();
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-lg p-6 max-w-lg shadow-xl border border-cyan-500/30">
        <h3 className="text-xl font-bold text-cyan-400 mb-4">
          🤖 Agent Insight
        </h3>
        
        <div className="mb-4">
          <p className="text-slate-300">{insight.message}</p>
          <p className="text-sm text-slate-500 mt-2">
            Confidence: {(insight.confidence * 100).toFixed(0)}%
          </p>
        </div>
        
        {insight.action && (
          <button
            onClick={() => chat.post({ type: 'accept-insight', data: insight })}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-3 rounded"
          >
            Accept Insight → Trade Now
          </button>
        )}
        
        <button
          onClick={() => chat.post({ type: 'dismiss-insight' })}
          className="mt-4 w-full bg-slate-700 hover:bg-slate-600 py-3 rounded"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
```

#### C. A2UI Intent Queue Service

File: `frontend/src/services/a2ui-intent-queue.ts`

```typescript
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
    }
  }
}

export const intentQueue = new A2UIIntentQueue();
```

---

### Phase 3: MCP Applications (Week 5-6)

#### A. MCP Server for Agent Context

File: `agents/mcp-server/main.py`

```python
"""
MCP Server for SAPM Agents - Model Context Protocol
Provides live agent data as interactive UI components
"""

from mcp.server import Server
from mcp.types import TextContent, ImageContent, Resource
import json
from typing import List, Dict, Any
from agents.aggregator.aggregation import Aggregator
from agents.trader.index import Trader

# Create MCP server
server = Server("sapm-agents")

@server.tool()
def get_agent_forecast(
    market_id: str,
    agent_name: str = "consensus"
) -> TextContent:
    """Get forecast from specific agent"""
    aggregator = Aggregator()
    forecast = aggregator.get_forecast(market_id)
    
    return TextContent(
        type="text",
        text=json.dumps({
            "agent": agent_name,
            "forecast": forecast["probability"],
            "confidence": forecast["confidence"],
            "market": market_id
        })
    )

@server.resource("agents/market-data/{market_id}")
async def get_market_data(market_id: str) -> TextContent:
    """Stream live market data to UI"""
    trader = Trader()
    data = trader.get_market_data(market_id)
    
    return TextContent(
        type="text",
        text=json.dumps(data),
        mimeType="application/json"
    )

@server.prompt()
def agent_insight(prompt_name: str, market_id: str) -> List[TextContent]:
    """Request agent to provide insight"""
    # Generate or fetch agent insight
    insight = "Based on current market conditions..."
    
    return [TextContent(type="text", text=insight)]

# Initialize server
if __name__ == "__main__":
    import asyncio
    asyncio.run(server.run(transport="stdio"))
```

#### B. MCP Client Integration in Frontend

File: `frontend/src/components/mcp/AgentMCPClient.tsx`

```typescript
'use client';

import { useMcp } from '@modelcontextprotocol/react-client';

export function AgentMCPClient({ marketId }: { marketId: string }) {
  const mcp = useMcp();
  
  // Connect to MCP server
  useEffect(() => {
    connectToMCPServer('sapm-agents');
  }, []);
  
  // Handle agent insights stream
  useEffect(() => {
    const subscription = mcp.subscribe('agent-insights', (insight) => {
      console.log('🤖 Agent insight:', insight);
      // Trigger A2UI intent queue
      intentQueue.enqueue({
        type: 'show-modal',
        data: { insight }
      });
    });
    
    return () => subscription.unsubscribe();
  }, [mcp]);
  
  return null; // Hook-based
}
```

#### C. Live Trading Dashboard with MCP Stream

File: `frontend/src/components/mcp/LiveTradingDashboard.tsx`

```typescript
'use client';

import { useChat } from 'copilotkit-react';

export function LiveTradingDashboard({ marketId }: { marketId: string }) {
  const chat = useChat();
  
  // Subscribe to agent streaming data
  useEffect(() => {
    const subscription = chat.subscribe('agent-stream', (data) => {
      console.log('📊 Agent stream:', data);
      // Update trading UI in real-time
      updateTradingUI(data);
    });
    
    return () => subscription.unsubscribe();
  }, [chat]);
  
  return (
    <div className="space-y-4">
      {/* Agent Forecast Display */}
      <AgentForecastDisplay marketId={marketId} />
      
      {/* Real-time Trade Execution */}
      <RealTimeTrader chat={chat} marketId={marketId} />
    </div>
  );
}

function AgentForecastDisplay({ marketId }: { marketId: string }) {
  const [forecast, setForecast] = useState(null);
  
  useEffect(() => {
    // Fetch from MCP server
    fetchMCPResource(`/agents/market-data/${marketId}`).then(setForecast);
  }, [marketId]);
  
  return (
    <div className="bg-slate-800 p-4 rounded-lg border border-cyan-500/30">
      <h4 className="text-cyan-400 font-bold mb-2">🤖 Agent Forecast</h4>
      <p>YES: {forecast?.probability?.toFixed(2)}</p>
      <p className="text-sm text-slate-500">Confidence: {forecast?.confidence?.toFixed(0)}%</p>
    </div>
  );
}

function RealTimeTrader({ chat }: any) {
  const [order, setOrder] = useState({ amount: '', outcome: 'yes' });
  
  const handleTrade = async () => {
    // Use CopilotKit action to request agent approval
    await chat.post({ 
      type: 'trade-request', 
      data: order 
    });
  };
  
  return (
    <div className="bg-slate-800 p-4 rounded-lg border border-emerald-500/30">
      <h4 className="text-emerald-400 font-bold mb-2">⚡ Real-Time Trading</h4>
      
      <input
        type="number"
        value={order.amount}
        onChange={(e) => setOrder({ ...order, amount: e.target.value })}
        className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white mb-2"
        placeholder="Amount to trade"
      />
      
      <div className="flex gap-2">
        <button
          onClick={() => setOrder({ ...order, outcome: 'yes' })}
          className="flex-1 bg-green-600 hover:bg-green-500 py-2 rounded"
        >
          YES
        </button>
        <button
          onClick={() => setOrder({ ...order, outcome: 'no' })}
          className="flex-1 bg-red-600 hover:bg-red-500 py-2 rounded"
        >
          NO
        </button>
      </div>
      
      <button
        onClick={handleTrade}
        className="w-full mt-3 bg-cyan-600 hover:bg-cyan-500 py-3 rounded font-bold"
      >
        Execute Trade (Agent Approved)
      </button>
    </div>
  );
}
```

---

## 📊 Performance Considerations

### A2UI Protocol Overhead

| Metric | Static UI | +A2UI Layer | Notes |
|--------|-----------|-------------|-------|
| Initial Load | ~5.7s | ~6.1s (+CopilotKit bundle) | Acceptable |
| Agent Insight Render | N/A | <200ms (virtual DOM) | Framer-motion powered |
| Streaming Updates | N/A | Real-time (WebSocket) | CopilotKit transport |
| Memory Usage | 469KB bundle | +150KB CopilotKit | Well within limits |

### Optimization Strategies

1. **Lazy Load CopilotKit Components** - Only load when agent interaction needed
2. **Virtual DOM for Agent UI** - Framer-motion already handles efficiently
3. **Intent Queue Batching** - Batch multiple agent requests before rendering
4. **WebSocket Connection Pooling** - Single persistent connection to MCP server

---

## 🔐 Security Considerations

### A2UI Intent Validation

```typescript
// Validate all incoming agent intents
const validateA2UIIntent = (intent: A2UIIntent): boolean => {
  // Check signature if using secure channel
  const signatureValid = verifySignature(intent.signature);
  
  // Whitelist allowed intent types
  const allowedTypes = ['show-modal', 'update-context', 'stream-data'];
  if (!allowedTypes.includes(intent.type)) return false;
  
  // Validate payload structure
  const schema = JSON.parse(intent.schema);
  return validateAgainstSchema(intent.data, schema);
};

// Only render validated intents
if (validateA2UIIntent(intent)) {
  await intentQueue.enqueue(intent);
}
```

---

## 📝 Testing Strategy

### Unit Tests

```typescript
// test/a2ui/intent-handler.test.ts
import { A2UIHandler } from '../../src/a2ui/agent-intent-handler';

describe('A2UIIntentHandler', () => {
  it('should render modal for show-modal intent', async () => {
    const handler = new A2UIHandler();
    const response = await handler.handle({
      type: 'show-modal',
      data: { component: 'InsightModal', props: { message: 'Hello' } }
    });
    
    expect(response.success).toBe(true);
  });
});
```

### Integration Tests

```typescript
// test/a2ui/copilot-bridge.integration.test.ts
import { copilotBridge } from '../../src/services/copilot-bridge';

describe('Copilot Bridge Integration', () => {
  beforeEach(async () => {
    await copilotBridge.initialize();
  });
  
  it('should handle agent insight flow end-to-end', async () => {
    const intent: AgentIntent = {
      type: 'insight',
      payload: { marketId: 'market_1', confidence: 0.85 },
      priority: 'high'
    };
    
    await copilotBridge.handleAgentIntent(intent);
    
    // Verify modal rendered
    const modalExists = document.querySelector('.agent-insight-modal');
    expect(modalExists).toBeTruthy();
  });
});
```

---

## 📚 Documentation Updates Needed

### A. Update FRONTEND.md

Add section: "A2UI Agent Communication Layer"

```markdown
## Agent Communication (A2UI)

SAPM now supports agent-initiated UI interactions via the DeepMind A2UI protocol, implemented through CopilotKit transport layer.

### Features

- **Agent Insight Modals**: Agents can request to show forecasting insights
- **Real-time Streaming**: Live market data from agent models
- **Context-Aware Actions**: Agent-recommended trades with approval flow
- **Persistent Agent Memory**: Agent state survives page refreshes
```

### B. Add NEW FILES

1. `docs/A2UI_PROTOCOL.md` - DeepMind protocol spec implementation
2. `docs/MCP_INTEGRATION.md` - Model Context Protocol guide
3. `docs/AGENT_UI_COMPONENTS.md` - Available agent-initiated UI elements
4. `test/a2ui/` - Test suite for A2UI integration

---

## 🚦 Implementation Checklist

### Phase 1: Foundation (Week 1-2)
- [ ] Install CopilotKit dependencies
- [ ] Create copilot-bridge service
- [ ] Update layout.tsx with CopilotProvider
- [ ] Implement AgentInsightModal component
- [ ] Add A2UI intent queue

### Phase 2: Protocol Integration (Week 3-4)
- [ ] Implement DeepMind A2UI spec handler
- [ ] Create agent intent validation layer
- [ ] Build MCP client integration
- [ ] Add streaming data updates
- [ ] Implement real-time trading dashboard

### Phase 3: MCP Apps (Week 5-6)
- [ ] Create MCP server for agents
- [ ] Implement MCP resource streams
- [ ] Build prompt-based agent insights
- [ ] Connect to existing agent logic
- [ ] Add error handling and retries

### Phase 4: Polish & Deploy (Week 7)
- [ ] Write comprehensive tests
- [ ] Performance profiling
- [ ] Security audit (intent validation)
- [ ] Documentation updates
- [ ] Staging deployment
- [ ] User acceptance testing

---

## 📈 Success Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Agent-initiated UI | 0% | 40%+ | ⏳ |
| Real-time updates | Manual | Live streaming | ⏳ |
| Context persistence | None | localStorage | ✅ |
| Multi-agent collaboration | N/A | Supported | ⏳ |

---

## 🔗 Relevant Repositories to Study

- **DeepMind A2UI**: https://github.com/google-deepmind/a2ui (if exists)
- **CopilotKit**: https://github.com/CopilotKit/copilotkit
- **MCP Protocol**: https://modelcontextprotocol.io/

---

**Status:** 🚧 Ready to Implement  
**Next Step:** Begin Phase 1 Foundation work  
**Estimated Timeline:** 6 weeks (parallel with Phase 2 Sui integration)
