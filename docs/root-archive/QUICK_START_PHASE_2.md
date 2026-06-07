# 🚀 Quick Start Guide - Phase 2 UI/UX

## Getting Started with Phase 2 Development

This guide will help you quickly get started with Phase 2 (UI/UX) development for SAPM.

---

## 📁 Project Structure Overview

```
Sovereign-Agentic-Prediction-Market-SAPM-on-Sui-Core/
├── frontend/                           ← Phase 2 Development Root
│   ├── src/
│   │   ├── app/                       ← Next.js App Router (create)
│   │   ├── components/
│   │   │   ├── markets/               ← ✓ Phase 2 Week 3 Complete
│   │   │   │   ├── MarketCard.tsx     ← MARKET DISPLAY COMPONENT
│   │   │   │   └── MarketList.tsx     ← MARKET GRID + FILTERS
│   │   │   ├── trading/               ← ⬜ Week 4-5 (to be created)
│   │   │   └── ui/                    ← ⬜ Reusable components
│   │   ├── types/
│   │   │   └── market.ts              ← ✓ Type definitions created
│   │   └── lib/                       ← ⬜ Integration layer (create)
│   ├── PHASE_2_UIUX_COMPLETION_PLAN.md  ← Detailed completion plan
│   └── package.json                   ← Dependencies (create)
├── market-data/                       ← ✓ Phase 1 Complete
│   ├── adapters/deepbook-api.js      ← Live data feed adapter
│   └── cache/ttl-manager.js          ← High-performance caching
├── ai-agents/                         ← ✓ Phase 1 Complete
│   ├── reasoning/forecast-reasoner.js← AI prediction engine
│   └── memory/episodic-memory.js     ← Agent learning system
├── MAINNET_TASK_TRACKER.md            ← ✓ Updated with Phase 1 complete
└── PHASE_2_SUMMARY.md                 ← Overview & recommendations
```

---

## ⚡ Immediate Next Steps (Today: Saturday, June 6)

### Step 1: Create Next.js App Router Structure (15 min)

```bash
cd frontend

# Initialize Next.js with TypeScript and Tailwind (if not already done)
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Install additional dependencies for Phase 2
npm install framer-motion zustand @heroicons/react
npm install -D @types/node @types/react @types/react-dom
```

### Step 2: Create App Router Layout (10 min)

Create `frontend/src/app/layout.tsx`:

```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SAPM - Agentic Prediction Markets on Sui",
  description: "AI-powered prediction markets with sovereign infrastructure",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
```

### Step 3: Create Main Page with Market Discovery (20 min)

Create `frontend/src/app/page.tsx`:

```typescript
import { MarketList } from '@/components/markets/MarketList';
import { useState, useEffect } from 'react';
import { Market } from '@/types/market';

export default function Home() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);

  // Example: Fetch markets from DeepBook adapter
  const fetchMarkets = async () => {
    try {
      // Import your market data adapter
      // const { subscribe } = require('../../../market-data/adapters/deepbook-api');
      
      // Mock data for development (replace with real API calls)
      const mockMarkets: Market[] = [
        {
          id: 'MARKET_001',
          question: 'Will Ethereum surpass $5000 before Q4 2026?',
          yesPrice: 0.72,
          noPrice: 0.28,
          yesVolume: 150000,
          noVolume: 80000,
          lastUpdate: new Date(),
          category: 'cryptocurrency',
        },
        {
          id: 'MARKET_002',
          question: 'Will the 2026 NFL playoffs be watched by 25M+ viewers?',
          yesPrice: 0.85,
          noPrice: 0.15,
          yesVolume: 200000,
          noVolume: 50000,
          lastUpdate: new Date(),
          category: 'sports',
        },
      ];

      setMarkets(mockMarkets);
    } catch (error) {
      console.error('Failed to fetch markets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarkets();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-8">
          🎯 SAPM - Market Discovery
        </h1>

        {loading ? (
          <div className="text-center py-12">
            <p>Loading markets...</p>
          </div>
        ) : (
          <MarketList
            markets={markets}
            onTrade={() => console.log('Trade executed')}
            agentEdge={{}} // Will be populated from AI layer
          />
        )}
      </div>
    </main>
  );
}
```

### Step 4: Update TypeScript Config (5 min)

Update `frontend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "ES2017"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

## 🔌 Integrating with Phase 1 Backend

### Option A: Direct Node.js Integration (Recommended for MVP)

Create `frontend/src/lib/market-data.ts`:

```typescript
/**
 * Market Data Integration Layer
 * Wraps Phase 1 backend adapters for frontend consumption
 */

// Example: WebSocket connection to DeepBook adapter
class MarketDataClient {
  private ws: WebSocket | null = null;
  private subscribers: Map<string, Set<Function>> = new Map();

  constructor(websocketUrl: string) {
    this.connect(websocketUrl);
  }

  connect(url: string) {
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('Connected to DeepBook WebSocket');
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMarketUpdate(data);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      // Implement reconnection logic with exponential backoff
      setTimeout(() => this.connect(url), 5000);
    };
  }

  private handleMarketUpdate(data: any) {
    const marketId = data.market_id;
    
    if (this.subscribers.has(marketId)) {
      const callbacks = this.subscribers.get(marketId)!;
      callbacks.forEach(callback => callback(data));
    }
  }

  subscribe(marketId: string, callback: Function) {
    if (!this.subscribers.has(marketId)) {
      this.subscribers.set(marketId, new Set());
    }
    this.subscribers.get(marketId)!.add(callback);
  }

  unsubscribe(marketId: string, callback: Function) {
    const callbacks = this.subscribers.get(marketId);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

export const marketDataClient = new MarketDataClient(
  process.env.NEXT_PUBLIC_DEEPBOOK_WS || 'wss://deepbook.testnet.sui.io/ws'
);
```

### Option B: REST API Proxy (For Production)

Deploy backend as separate service and create API proxy in Next.js.

---

## 🧪 Testing Your Components Locally

### 1. Run Development Server

```bash
cd frontend
npm run dev
# Or if using pnpm
pnpm dev
```

Visit `http://localhost:3000` to see your market discovery page.

### 2. Test Market Components

The MarketCard and MarketList components are ready to use! They accept:

- `markets`: Array of Market objects
- `onTrade`: Callback function for trade execution
- `agentEdge`: Map of marketId to confidence score (optional)

### 3. Debug Mode

Add this to your development page to test with real data:

```typescript
// Add to frontend/src/app/page.tsx
console.log('Markets loaded:', markets);
console.log('Market count:', markets.length);
```

---

## 📦 Dependencies to Install

Run this command to install all required packages:

```bash
cd frontend

# Core dependencies
npm install framer-motion zustand @heroicons/react

# Type definitions
npm install -D @types/node @types/react @types/react-dom

# (Optional) For production analytics
npm install analytics-next

# (Optional) For error tracking
npm install sentry-nextjs
```

---

## 🎨 Styling with Tailwind CSS

All components use Tailwind CSS classes. Key utilities used:

- **Responsive Grid**: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- **Animations**: `framer-motion` for smooth transitions
- **Colors**: Custom color palette (see design-system.ts)
- **Spacing**: Tailwind spacing scale (p-4, p-8, etc.)

---

## 🚧 What's Next?

### Week 3 Remaining Tasks (Today-Sunday)

1. ✅ MarketCard component created
2. ✅ MarketList component created  
3. ⬜ **Integrate with DeepBook adapter** (Priority: HIGH)
4. ⬜ Test live data streaming
5. ⬜ Performance optimization (< 500ms first render)

### Week 4 Tasks (Next Week)

- [ ] OrderBook heatmap visualization component
- [ ] PositionManager with deposit/redeem flows
- [ ] Wallet connection (@mysten/wallet-standard)
- [ ] Transaction progress indicators

### Week 5-6 Tasks

- Risk controls & error handling
- Mobile responsive testing
- Push notifications setup
- Final QA and bug fixes

---

## 📚 Key Documentation Files

| File | Purpose | Location |
|------|---------|----------|
| **PHASE_2_UIUX_COMPLETION_PLAN.md** | Detailed completion plan | `frontend/` |
| **MAINNET_TASK_TRACKER.md** | Full task list with timelines | Root |
| **QUICK_START_PHASE_2.md** | This guide - getting started | Root |
| **PHASE_2_SUMMARY.md** | Overview & recommendations | Root |

---

## 🐛 Common Issues & Solutions

### Issue: TypeScript Errors in Components

**Solution:** Ensure all type definitions are imported from `@/types/market`

```typescript
import { Market, Outcome } from '@/types/market'; // ✅ Correct
import type { Market } from '../types/market';     // ❌ Wrong import path
```

### Issue: WebSocket Connection Fails

**Solution:** Use correct WebSocket URL and handle connection state:

```typescript
const wsUrl = process.env.NEXT_PUBLIC_DEEPBOOK_WS || 'wss://deepbook.testnet.sui.io/ws';
if (typeof window !== 'undefined') {
  console.log('WebSocket URL:', wsUrl);
}
```

### Issue: Components Not Rendering

**Solution:** Check that components are properly exported and imported:

```typescript
// ✅ Correct export
export const MarketCard: React.FC<MarketCardProps> = ...;

// ✅ Correct import
import { MarketCard } from '@/components/markets/MarketCard';
```

---

## 💬 Getting Help

- **Slack:** #sapm-daily-sync (Daily standup)
- **Blockers:** #sapm-blockers channel
- **Documentation:** [Notion workspace](https://notion.so/sapm-mainnet)

---

## ✅ Success Checklist for End of Week 3

By Sunday evening, you should have:

- [x] Next.js app scaffold created
- [x] MarketCard component functional
- [x] MarketList component functional
- [ ] **DeepBook adapter integrated** (Remaining priority)
- [ ] Live data streaming working
- [ ] Performance optimized (< 500ms first render)
- [ ] Unit tests written for components

---

## 🎉 You're Ready to Start!

Follow the steps above and you'll have a working market discovery page by Sunday evening. The Phase 2 completion plan provides detailed specifications for all remaining components.

**Estimated Time to Complete Week 3:** 6-8 hours (including testing)

Good luck with Phase 2! 🚀

---

**Last Updated:** June 6, 2026  
**Version:** 1.0.0  
**Maintained by:** SAPM Frontend Engineering Team
