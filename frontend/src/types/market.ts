// TypeScript type definitions for SAPM Market Data & Trading

/**
 * Market Outcome (YES/NO)
 */
export type Outcome = 'yes' | 'no';

/**
 * Market Resolution Status
 */
export type ResolutionStatus = 'pending' | 'resolved';

/**
 * Market Category (for filtering)
 */
export type MarketCategory = 
  | 'politics'
  | 'sports'
  | 'entertainment'
  | 'technology'
  | 'economics'
  | 'general';

/**
 * Market Data Interface
 * Represents a single prediction market
 */
export interface Market {
  id: string;
  question: string;
  yesPrice: number;       // Price in SUI (0-1, represents probability)
  noPrice: number;        // Price in SUI (0-1, represents probability)
  yesVolume: number;      // Total liquidity on YES outcome
  noVolume: number;       // Total liquidity on NO outcome
  lastUpdate: Date;       // Last price update timestamp
  category?: MarketCategory;
  resolutionStatus?: ResolutionStatus;
  oddsMovement?: {        // Historical odds tracking
    yes: number[];
    no: number[];
    timestamps: Date[];
  };
}

/**
 * Market Data Store State
 */
export interface MarketStore {
  markets: Market[];
  addMarkets: (newMarkets: Market[]) => void;
  removeMarket: (marketId: string) => void;
  updateMarket: (marketId: string, updates: Partial<Market>) => void;
  subscribeToMarket: (marketId: string, callback: (market: Market) => void) => () => void;
}

/**
 * User Position on a Market
 */
export interface Position {
  marketId: string;
  outcome: Outcome;
  size: number;           // Position size in SUI
  entryPrice: number;     // Price at which position was opened
  currentPrice: number;   // Current market price
  unrealizedPnL: number;  // Current P&L (unrealized)
  realizedPnL: number;    // Cumulative P&L from closed positions
  entryTime: Date;        // When position was opened
}

/**
 * Trading State
 */
export interface TradingState {
  walletConnected: boolean;
  walletAddress?: string;
  walletBalance?: number; // Balance in SUI
  selectedMarket?: Market;
  currentPosition?: Position | null;
  tradeInProgress: boolean;
  lastTradeTimestamp?: Date;
}

/**
 * Agent Forecast Analysis Result
 * From AI reasoning layer integration
 */
export interface AgentForecast {
  marketId: string;
  timestamp: string;
  confidence: number;     // 0-1 confidence score
  prediction: Outcome;    // YES or NO prediction
  edge: number | null;    // Expected value edge (if profitable)
  riskMetrics: {
    volatility: number;
    maxDrawdown?: number;
    sharpeRatio?: number;
  };
  explanation: string;     // Natural language explanation
  supportingFactors: string[];
  disclaimer: string;
}

/**
 * Order Book Data
 */
export interface OrderBookLevel {
  price: number;
  size: number;           // Liquidity at this price level
  cumulativeSize: number;
}

export interface OrderBook {
  bidLevels: OrderBookLevel[];  // Buy orders (descending)
  askLevels: OrderBookLevel[];  // Sell orders (ascending)
  midPrice: number;            // Current price
  spread: number;              // Bid-ask spread
  totalBidVolume: number;      // Total buy liquidity
  totalAskVolume: number;      // Total sell liquidity
}

/**
 * Trade Execution Request
 */
export interface TradeRequest {
  marketId: string;
  outcome: Outcome;
  size: number;           // Position size in SUI
  slippageTolerance?: number; // Max acceptable slippage (e.g., 0.01 = 1%)
}

/**
 * Trade Execution Response
 */
export interface TradeResponse {
  transactionHash: string;
  executedPrice: number;
  actualSize: number;
  feesPaid: number;
  success: boolean;
  error?: string;
}

/**
 * Wallet Connection State
 */
export interface WalletState {
  connected: boolean;
  address?: string;
  balance: number;
  provider?: any;         // Mysten wallet standard provider
  connect: () => Promise<void>;
  disconnect: () => void;
}

/**
 * Filter/Sort Options for Market List
 */
export interface MarketListFilters {
  searchTerm: string;
  selectedCategory: string | null;
  sortBy: 'newest' | 'volume' | 'edge';
}

/**
 * Risk Level Classification
 */
export type RiskLevel = 'Low' | 'Medium' | 'High';

/**
 * Market Risk Assessment
 */
export interface MarketRisk {
  level: RiskLevel;
  reason: string;
  lastUpdated: Date;
}
