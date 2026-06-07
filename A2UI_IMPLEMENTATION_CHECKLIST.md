# 🔨 Immediate Action Items - A2UI Integration

**Repository:** SAPM-on-Sui-Core  
**Priority:** High | **Timeline:** Start Week 1 Today

---

## 📋 Phase 1 Checklist (Weeks 1-2)

### Day 1: Dependencies & Setup ✅ Ready Today

```bash
# Terminal session 1 - Install CopilotKit
cd C:\Users\rwill\OneDrive\Desktop\Sovereign-Agentic-Prediction-Market-SAPM-on-Sui-Core\frontend
npm install copilotkit copilotkit-react framer-motion

# Expected output:
# added 150 packages in 42s
```

**Status:** ⏳ Pending execution  
**Estimated Time:** 5 minutes  

---

### Day 1-2: Core Bridge Service

Create file: `frontend/src/services/copilot-bridge.ts`

```typescript
/**
 * CopilotKit Bridge - Agent-to-Frontend Communication Layer
 */

export interface AgentIntent {
  type: 'insight' | 'action-request' | 'context-update' | 'alert';
  payload: Record<string, unknown>;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export class CopilotBridge {
  private connection: any = null;
  private queue: AgentIntent[] = [];
  
  async initialize(): Promise<void> {
    this.connection = await initCopilotConnection();
    console.log('✅ A2UI Bridge initialized');
  }
  
  async handleAgentIntent(intent: AgentIntent): Promise<void> {
    this.queue.push(intent);
    
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
    console.log('📊 Rendering insight:', payload);
  }
  
  private async requestAction(payload: any): Promise<void> {
    console.log('⚡ Action requested:', payload);
  }
}

export const copilotBridge = new CopilotBridge();
```

**Status:** ⏳ Pending creation  
**Estimated Time:** 30 minutes  

---

### Day 2-3: Update Layout with CopilotProvider

Edit: `frontend/src/app/layout.tsx`

Add at top of file:
```typescript
import { useChat } from 'copilotkit-react';
import { CopilotProvider } from 'copilotkit/react-core';
```

Find the `<html>` tag in your layout and wrap content:

```typescript
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
  useEffect(() => {
    const unsubscribe = chat.subscribe('agent-message', (msg) => {
      console.log('🤖 Agent message:', msg);
    });
    
    return () => unsubscribe();
  }, [chat]);
  
  return null; // Hook-based, no DOM needed
}
```

**Status:** ⏳ Pending edit  
**Estimated Time:** 15 minutes  

---

### Day 3-4: Create Simple Agent Insight Component

Create file: `frontend/src/components/a2ui/SimpleAgentInsight.tsx`

```typescript
'use client';

import { useChat } from 'copilotkit-react';

export function SimpleAgentInsight() {
  const chat = useChat();
  
  return (
    <button 
      onClick={() => chat.post({ type: 'insight-request' })}
      className="fixed bottom-4 right-4 bg-cyan-600 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-cyan-500 transition-colors"
    >
      🤖 Get Agent Insight
    </button>
  );
}
```

**Status:** ⏳ Pending creation  
**Estimated Time:** 20 minutes  

---

### Day 4-5: Test Integration

```bash
# Start dev server
cd frontend
npm run dev

# Open http://localhost:3000
# Click "🤖 Get Agent Insight" button
# Check console for agent message logs
```

**Status:** ⏳ Pending testing  
**Estimated Time:** 20 minutes  

---

## 📊 Progress Tracker

| Task | Status | Due Date | Est. Time |
|------|--------|----------|-----------|
| Install CopilotKit deps | ⏳ Pending | Day 1 | 5 min |
| Create copilot-bridge service | ⏳ Pending | Day 2 | 30 min |
| Update layout.tsx | ⏳ Pending | Day 2 | 15 min |
| Create SimpleAgentInsight component | ⏳ Pending | Day 4 | 20 min |
| Test integration | ⏳ Pending | Day 5 | 20 min |
| **Phase 1 Complete** | ⏳ Pending | Week 2 | ~2 hours |

---

## 🎯 Success Criteria (Week 2)

- [ ] CopilotKit dependencies installed
- [ ] Layout wrapped with `CopilotProvider`
- [ ] AgentInsight button visible on page
- [ ] Click shows console log: "🤖 Agent message received"
- [ ] No errors in browser console
- [ ] Build passes: `npm run build`

---

## 🚨 Common Pitfalls to Avoid

1. **Forgetting Client Component Markers**  
   → Always add `'use client';` at top of component files
   
2. **Missing CopilotProvider**  
   → Must wrap app with `<CopilotProvider>` in layout.tsx
   
3. **Not Using Hooks in Client Components**  
   → `useChat()`, `useUIActions()` only work in client components

4. **Forgetting useEffect Cleanup**  
   → Always return cleanup function from useEffect

---

## 🔗 Next Phases (Week 3+)

After Phase 1 complete, proceed with:

- **Phase 2:** Full A2UI protocol handler (`frontend/src/a2ui/`)
- **Phase 3:** MCP server for agents (`agents/mcp-server/`)
- **Phase 4:** Real-time trading dashboard with agent streaming

---

**Last Updated:** 2026-06-06  
**Contact:** See `UI_UX_A2UI_UPGRADE_PLAN.md` for full details
