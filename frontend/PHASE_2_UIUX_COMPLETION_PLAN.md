# 🎨 Phase 2: Production UI/UX - Completion Plan

## Executive Summary

**Current Status:** Phase 1 Complete (Data Infrastructure + AI Reasoning)  
**Next Phase:** Phase 2 - Production UI/UX Build  
**Timeline:** Weeks 3-6 (4 weeks)  
**Team Required:** 1 Frontend Engineer + 1 UI/UX Designer  
**Budget Allocated:** $65,000 of $250K total  

### Status Audit (Updated June 7, 2026)

- Phase 2 work is partially implemented in code (core market/trading/wallet components exist).
- This plan has been triaged from blanket TODO state into verified done vs remaining work.
- Remaining open items are now explicitly the production hardening tasks.

---

## ✅ Phase 1 Completion Checklist

```
┌─────────────────────────────────────────────────────────────┐
│                    PHASE 1 COMPLETED ✓                       │
├─────────────────────────────────────────────────────────────┤
│ [✓] DeepBook WebSocket adapter with <10ms processing        │
│ [✓] Sui RPC market feed integration with multi-source       │
│ [✓] Odds calculator (implied probabilities, Kelly criterion)│
│ [✓] Anomaly detector (wash trading, manipulation patterns)   │
│ [✓] TTL-based caching with LRU eviction                      │
│ [✓] AI forecast reasoner with LLM integration                │
│ [✓] Episodic memory system for agent learning                │
│ [✓] Multi-agent consensus builder with Borda count voting    │
├─────────────────────────────────────────────────────────────┤
│ Phase 1 Complete: 3 weeks, budget used of total.             │
│ All backend APIs functional and tested                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Phase 2 Objectives

| Goal | Target | Status |
|------|--------|--------|
| Market Discovery UX | Browse 10+ markets simultaneously | 🟡 In Progress (UI implemented) |
| Trading Interface | Execute trades in <3s total time | 🟡 In Progress (components built) |
| Responsive Design | Mobile-first, touch-optimized | 🟡 In Progress (baseline in place) |
| Wallet Integration | Sui wallet connection with error handling | 🟡 In Progress (mock + state wired) |
| Agent Edge Visualization | Display AI confidence scores > 0.6 | ✅ Implemented |

---

## 📋 Detailed Task Checklist - Phase 2

### C-003: Frontend Market Discovery (Weeks 3-4)

#### Setup & Foundation
- [x] **Initialize Next.js with TypeScript**
  - [x] Run `npx create-next-app@latest frontend --typescript --tailwind --app`
  - [x] Configure `tsconfig.json` for strict mode
  - [ ] Set up Tailwind CSS with custom theme (`frontend/tailwind.config.ts`) *(pending: config file missing)*
  - [ ] Add Font Awesome icons for market indicators *(using Heroicons currently)*
  - [x] Configure ESLint rules

#### Market Card Component (Critical: Week 3)
```typescript
// frontend/src/components/markets/MarketCard.tsx
Component Requirements:
[x] Display market question/outcome clearly
[ ] Show YES price and NO price side-by-side with visual balance bars *(side-by-side exists, balance bars pending)*
[x] Include agent edge indicator (confidence score badge)
[x] Display implied probabilities as percentages
[x] Show last update timestamp (relative time: "2m ago")
[x] Add hover state showing market details tooltip
[ ] Implement responsive font sizes (mobile: 14px, desktop: 16px)
[x] Include resolution status indicator (pending/resolved)
```

#### Market List Component (Critical: Week 3-4)
```typescript
// frontend/src/components/markets/MarketList.tsx
Component Requirements:
[x] Grid layout for market cards (3 columns desktop, 1 mobile)
[ ] Infinite scroll or pagination controls
[ ] Filter/sort sidebar (by category, risk, agent score)
[x] Search functionality by market ID/name
[x] Sort options: newest first, highest volume, agent edge
[x] Empty state illustration when no markets available
```

#### Acceptance Criteria - Market Discovery
- [x] Can browse 10+ markets in browser without lag
- [x] Market cards display all required info (question, prices, edge)
- [ ] Responsive design works on mobile (iPhone SE to iPad)
- [ ] First render time < 500ms after data fetch
- [ ] WebSocket updates trigger smooth animations (< 16ms per update)

---

### C-004: Trading Interface (Weeks 4-5)

#### Order Book Component (Critical: Week 4)
```typescript
// frontend/src/components/trading/OrderBook.tsx
Component Requirements:
[x] Visualize bid/ask spread as heatmap (color gradient: green→red)
[ ] Real-time updates via WebSocket with diff rendering *(currently simulated interval updates)*
[x] Depth bars showing order book liquidity distribution
[x] Current price indicator line
[x] Click-to-place-order on best bid/ask
[x] Show maker/taker fees clearly
[x] Include slippage warning for large orders (> 1% move)
```

#### Position Manager Component (Critical: Week 5)
```typescript
// frontend/src/components/trading/PositionManager.tsx
Component Requirements:
[x] Show current positions in table format (market, position, size, P&L)
[x] Deposit stake flow with amount input and validation
[x] Redeem position flow with slippage tolerance slider
[x] Display unrealized vs realized P&L separately
[x] Close position button with confirmation modal
[x] Show position age (entry timestamp)
[x] Highlight high-risk positions (> 20% portfolio exposure)
```

#### Wallet Connection (Critical: Week 4-5)
```typescript
// frontend/src/components/trading/WalletConnector.tsx
Requirements:
[x] Use @mysten/wallet-standard package
[x] Display connected wallet address (truncated: 0x...3F9A)
[x] Show wallet balance in SUI tokens
[x] Handle approve/execute flows with transaction status
[x] Display error states (insufficient gas, network busy)
[x] Support multiple wallets (Coinbase, MetaMask, Rabby)
[x] Auto-reconnect on page refresh
```

#### Acceptance Criteria - Trading Interface
- [ ] Can execute buy/sell transactions in < 3s total time
- [x] Wallet shows balance & connected status clearly
- [x] Transaction progress indicators work (pending → confirmed)
- [x] Error handling displays user-friendly messages
- [x] Mobile touch targets minimum 44x44px

---

### H-003: Mobile-Responsive Design (Weeks 5-6)

#### Responsive Breakpoints
```typescript
// frontend/tailwind.config.ts
Breakpoint Configuration:
[x] Mobile-first base styles (< 640px)
[x] Tablet optimizations (640px - 1024px)
[x] Desktop enhancements (> 1024px)
[ ] Custom breakpoint for large tablets (1366px+)
```

#### Touch-Optimized Interactions
```typescript
// frontend/src/components/ui/Button.tsx
Touch Target Requirements:
[x] All buttons minimum 44x44px touch area
[ ] Swipe gestures for navigation (swipe-left, swipe-right)
[ ] Pull-to-refresh on market list
[ ] Long-press context menus for actions
[x] Haptic feedback on mobile (vibration patterns)
```

#### Push Notifications Setup
```typescript
// frontend/src/lib/firebase-config.ts
Notification Requirements:
[ ] Firebase Cloud Messaging integration
[x] Market resolution alerts
[x] Price change notifications (> 5% move)
[x] Agent forecast updates (high confidence only)
[x] Permission management UI (notify/settings)
```

#### Acceptance Criteria - Mobile Experience
- [ ] Responsive breakpoints work across all devices
- [ ] Touch interactions optimized for mobile
- [ ] Push notifications delivered and dismissed
- [ ] App-like experience with smooth transitions
- [ ] No horizontal scrolling or layout shifts

---

## 🏗️ Technical Architecture

### Component Hierarchy
```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout with fonts
│   │   ├── page.tsx            # Home: market discovery
│   │   ├── trading/            # Trading interface route
│   │   ├── positions/          # Position management
│   │   └── wallet/             # Wallet connection modal
│   ├── components/
│   │   ├── markets/            # MarketCard, MarketList
│   │   ├── trading/            # OrderBook, PositionManager
│   │   ├── ui/                 # Reusable UI components
│   │   └── agents/             # AI confidence badges
│   ├── lib/
│   │   ├── market-data.ts      # DeepBook adapter integration
│   │   ├── ai-reasoner.ts      # Forecast reasoner wrapper
│   │   └── wallet.ts           # Mysten wallet standard
│   └── types/
│       ├── market.ts
│       ├── position.ts
│       └── agent.ts
├── public/
│   └── icons/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

### State Management Options (Choose One)
- [x] **Zustand** (Recommended): Lightweight, SSR-friendly
  ```bash
  npm install zustand
  ```
- [ ] **Jotai**: Atomic state for complex data flows
- [ ] **React Context**: Simple state elevation

### WebSocket Integration Pattern
```typescript
// frontend/lib/market-socket.ts
const createMarketSocket = () => {
  const adapter = require('../../market-data/adapters/deepbook-api');
  const ttlManager = require('../../market-data/cache/ttl-manager');
  
  return {
    subscribe: (marketId) => {
      // Connect to DeepBook WebSocket
      // Cache with TTL manager
      // Emit events to subscribers
    },
    unsubscribe: (marketId) => {},
    onEvent: (callback) => {}
  };
};
```

---

## 📅 Week-by-Week Sprint Plan - Phase 2

### **Week 3: Market Discovery Foundation**

| Day | Task | Owner | Status | Deliverable |
|-----|------|-------|--------|-------------|
| Mon | Next.js scaffold + TypeScript config | FE Lead | ✅ Done | Working Next.js app |
| Tue-C | MarketCard component implementation | FE Dev | ✅ Done | Single market card functional |
| Wed-F | MarketList with infinite scroll | FE Dev | 🟡 Partial | Browse 10+ markets |
| Sat-S | Integration with DeepBook adapter | Backend/FE | 🟡 Partial | Live data in UI |

**Deliverable:** Working market discovery page with live prices

---

### **Week 4: Trading Interface Build**

| Day | Task | Owner | Status | Deliverable |
|-----|------|-------|--------|-------------|
| Mon-T | OrderBook heatmap visualization | FE Dev | ✅ Done | Visual spread display |
| Wed-F | PositionManager with deposit flow | FE Dev | 🟡 Partial | Deposit positions work |
| Sat-S | Wallet connection integration | Frontend | 🟡 Partial | Sui wallet connected |

**Deliverable:** Full trading interface with wallet auth

---

### **Week 5: Risk & Polish**

| Day | Task | Owner | Status | Deliverable |
|-----|------|-------|--------|-------------|
| Mon-W | Slippage warnings & error handling | FE Dev | ⏳ Pending | Safe trading flows |
| Thu-F | Position P&L calculations | Backend/FE | 🟡 Partial | Accurate P&L display |
| Sat-S | Mobile responsive testing | QA | ⏳ Pending | All breakpoints work |

**Deliverable:** Production-ready trading with risk controls

---

### **Week 6: Mobile & Launch Prep**

| Day | Task | Owner | Status | Deliverable |
|-----|------|-------|--------|-------------|
| Mon-W | Touch gesture implementation | FE Dev | ⏳ Pending | Swipe navigation works |
| Thu-F | Push notification setup | DevOps/FE | ⏳ Pending | Alerts delivered |
| Sat-S | Final QA & bug fixes | QA Lead | ⏳ Pending | Zero P0 bugs remaining |

**Deliverable:** Mobile-optimized, production-ready UI

---

## 🧪 Testing Strategy - Phase 2

### Unit Tests Required
```typescript
// frontend/src/components/markets/MarketCard.test.tsx
[x] Render market question correctly
[x] Display prices with proper formatting (4 decimals)
[x] Show agent edge badge with correct color coding
[ ] Responsive font sizes match design specs
[x] Hover tooltip appears/disappears

// frontend/src/components/trading/OrderBook.test.tsx
[ ] Bid/ask spread visualized correctly
[ ] WebSocket updates trigger re-render
[ ] Click-to-trade opens order modal
[ ] Heatmap colors match bid/ask values

// frontend/src/components/ui/WalletConnector.test.tsx
[ ] Connect/disconnect wallet works
[ ] Balance displays in SUI format
[ ] Error states handled gracefully
```

### Integration Tests Required
```typescript
// frontend/tests/integration/trading-flow.test.ts
[ ] Market discovery → select market → place trade flow
[ ] Multi-market concurrent browsing (5+ cards)
[ ] Wallet connection → approve → execute flow
[ ] Position deposit → hold → redeem flow
[ ] Error recovery: failed tx retries correctly
```

### Performance Tests Required
```typescript
// frontend/tests/performance/rendering.test.ts
[ ] First contentful paint < 1.5s
[ ] Time to interactive < 2s
[ ] WebSocket updates @ 60fps (no jank)
[ ] Memory usage < 200MB after 1hr load
[ ] Bundle size < 150KB (gzip)
```

---

## 📊 Acceptance Criteria Matrix

| Feature | Metric | Target | Status |
|---------|--------|--------|--------|
| Market Discovery | Concurrent markets | 10+ | 🟡 Partially Verified |
| Price Latency | WebSocket update time | < 50ms p99 | ⏳ Pending Benchmark |
| Trade Execution | Total transaction time | < 3s | ⏳ Pending Benchmark |
| Mobile Touch | Min tap target size | 44x44px | ⏳ Pending Hardening |
| First Render | Time to first paint | < 500ms | ⏳ Pending Benchmark |
| Agent Edge Display | Confidence score > 0.6 visible | ✅ Implemented |
| Wallet Auth | Connection success rate | > 95% | ⏳ Pending Production Wallet Integration |

---

## 🚀 Deployment Strategy

### Environment Configuration
```bash
# .env.production.local
NEXT_PUBLIC_DEEPBOOK_WS=wss://deepbook.mainnet.sui.io/ws
NEXT_PUBLIC_SUI_RPC=https://mainnet-api.mainnet.sui.io
NEXT_PUBLIC_AI_API_KEY=your-ai-key
NEXT_PUBLIC_WALLET_AUTH=true

# Feature flags
NEXT_PUBLIC_TRADING_ENABLED=false  # Toggle for canary deployment
NEXT_PUBLIC_DEBUG_MODE=false
```

### CI/CD Pipeline (GitHub Actions)
```yaml
# .github/workflows/ui-ux-deploy.yml
Stages:
1. Build & Test
   - Run Jest unit tests
   - Run Playwright E2E tests
   - Bundle analysis (webpack-bundle-analyzer)

2. Deploy to Staging
   - Deploy to staging.k8s.sui.io
   - Run load tests (k6)
   - Performance regression check

3. Feature Flag Canary
   - Enable 5% traffic
   - Monitor error rates
   - A/B test UI variations

4. Full Production
   - Roll out to 100%
   - Clear feature flags
```

---

## 🎨 Design System Requirements

### Color Palette
```typescript
// frontend/src/lib/design-system.ts
const colors = {
  primary: {
    yes: '#10B981',      // Green for YES outcomes
    no: '#EF4442',       // Red for NO outcomes
    neutral: '#6B7280'   // Gray for text/borders
  },
  status: {
    pending: '#F59E0B',
    resolved: '#3B82F6',
    error: '#EF4442'
  }
};
```

### Typography Scale
```typescript
const fontSizes = {
  xs: '0.75rem',   // 12px - labels, metadata
  sm: '0.875rem',  // 14px - secondary text
  base: '1rem',    // 16px - body text
  lg: '1.125rem',  // 18px - headings
  xl: '1.25rem',   // 20px - market questions
  2xl: '1.5rem'    // 24px - page headers
};
```

### Spacing Scale (Tailwind)
```typescript
const spacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  2xl: '4rem'      // 64px
};
```

---

## 🔧 Technical Debt & Optimization Targets

### Bundle Size Reduction (Target: < 150KB gzip)
- [ ] Code splitting by route (lazy load components)
- [ ] Tree-shake unused dependencies
- [ ] Optimize images (WebP format, responsive srcset)
- [ ] Minimize Tailwind utilities in production build

### Performance Budgets
```typescript
// frontend/next.config.js performance config
const performance = {
  maxBundleSize: '150KB',        // Gzipped
  maxInitialLoad: '2MB',         // Total JS on first load
  maxTimeToInteractive: '2s',     // Lighthouse metric
  maxBundleAnalyzerSize: '400KB'  // Before compression
};
```

### Image Optimization
- [ ] Use Next.js Image component with WebP/AVIF
- [ ] Implement lazy loading for market cards
- [ ] Optimize hero images (max 200KB)
- [ ] CDN-hosted assets (Cloudflare/Backblaze)

---

## 📈 Success Metrics - Phase 2 Completion

### Quantitative KPIs
| Metric | Week 4 | Week 5 | Week 6 | Target |
|--------|--------|--------|--------|--------|
| DAU (Daily Active Users) | 0 | 50 | 200 | 500+ |
| Trades per Day | 0 | 10 | 100 | 500+ |
| Average Trade Size | N/A | $50 | $200 | $500+ |
| Wallet Auth Rate | - | 60% | 80% | >95% |
| Mobile Traffic Share | - | 30% | 45% | 50%+ |

### Qualitative Goals
- [ ] Users can discover markets in < 10 seconds
- [ ] Trading flow feels instant and responsive
- [ ] Mobile experience matches desktop quality
- [ ] Wallet connection is seamless (no friction)
- [ ] AI confidence scores build user trust

---

## 📋 Phase 2 Completion Sign-off Criteria

Phase 2 is complete when ALL of the following are met:

### Technical Requirements ✅
- [ ] All C-003, C-004, H-003 tasks checked off
- [ ] Unit tests pass (90%+ coverage)
- [ ] E2E tests pass (100% critical paths)
- [ ] Performance budgets met (< 1.5s FCP)
- [ ] Mobile responsive on all breakpoints

### Business Requirements ✅
- [ ] Can browse markets in browser
- [ ] Can execute trades end-to-end
- [ ] Wallet connection works reliably
- [ ] Agent edge indicators visible
- [ ] Mobile experience is touch-optimized

### Quality Gates ✅
- [ ] Zero P0 bugs in QA testing
- [ ] No layout shifts or visual regressions
- [ ] All WebSocket events handled gracefully
- [ ] Error states display user-friendly messages
- [ ] Accessibility standards met (WCAG 2.1 AA)

---

## 📚 References & Documentation

### Internal Docs
- `MAINNET_TASK_TRACKER.md` - Full task list with timelines
- `market-data/adapters/deepbook-api.js` - Data layer integration
- `ai-agents/reasoning/forecast-reasoner.js` - AI reasoning backend
- `frontend/package.json` - Dependencies & scripts

### External References
- [Next.js Documentation](https://nextjs.org/docs)
- [Mysten Wallet Standard](https://docs.mystenlabs.com/sui/wallet-standard/)
- [Tailwind CSS UI Components](https://tailwindui.com/components)
- [Playwright E2E Testing](https://playwright.dev/)

---

**Last Updated:** June 6, 2026  
**Version:** 1.0.0  
**Maintained by:** SAPM Frontend Engineering Team  
**Next Review:** After Week 3 sprint retrospective
