// WagerWars Stacks Contract Integration Stubs
// TODO: Replace mock implementations with actual Stacks.js calls

import {
  Market,
  MarketCategory,
  MarketStatus,
  Trade,
  Quote,
  UserPosition,
  OracleInfo,
  PlatformStats,
  PricePoint,
  PRICE_PRECISION,
  USDCX_PRECISION,
} from "./contracts";

// ============================================
// Mock Data Generators
// ============================================

const mockAddresses = [
  "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7",
  "SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE",
  "SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR",
  "SP1Y5YSTAHZ88XYK1VPDH24GY0HPX5J4JECTMY4A1",
];

function randomAddress(): string {
  return mockAddresses[Math.floor(Math.random() * mockAddresses.length)];
}

function generatePriceHistory(marketId: string, days: number = 7): PricePoint[] {
  const points: PricePoint[] = [];
  const now = Date.now();
  const interval = (days * 24 * 60 * 60 * 1000) / 100; // 100 data points

  let price = 500000; // Start at 50%

  for (let i = 100; i >= 0; i--) {
    const change = (Math.random() - 0.5) * 50000; // +/-5% change
    price = Math.max(50000, Math.min(950000, price + change));

    points.push({
      timestamp: now - i * interval,
      price: Math.floor(price),
      outcome: 0,
    });
  }

  return points;
}

function generateRecentTrades(marketId: string, count: number = 10): Trade[] {
  const trades: Trade[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const isBuy = Math.random() > 0.5;
    const outcome = Math.random() > 0.5 ? 0 : 1;
    const shares = Math.floor(Math.random() * 500 + 10);
    const price = Math.floor(Math.random() * 400000 + 300000);

    trades.push({
      id: `trade-${marketId}-${i}`,
      marketId,
      user: randomAddress(),
      type: isBuy ? "buy" : "sell",
      outcome,
      outcomeLabel: outcome === 0 ? "Yes" : "No",
      shares,
      price,
      total: shares * (price / PRICE_PRECISION) * USDCX_PRECISION,
      timestamp: now - i * 300000, // 5 minute intervals
    });
  }

  return trades;
}

// ============================================
// Mock Markets Data
// ============================================

export const mockMarkets: Market[] = [
  {
    id: "market-1",
    question: "Will Bitcoin reach $150,000 by March 2025?",
    description: "This market resolves to YES if the price of Bitcoin (BTC) reaches or exceeds $150,000 USD on any major exchange (Coinbase, Binance, Kraken) before March 31, 2025 23:59 UTC.",
    type: "binary",
    category: "crypto",
    outcomes: [
      { id: 0, label: "Yes", price: 650000, shares: 12500 },
      { id: 1, label: "No", price: 350000, shares: 8200 },
    ],
    status: "open",
    createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    lockTime: Date.now() + 45 * 24 * 60 * 60 * 1000,
    resolutionTime: Date.now() + 60 * 24 * 60 * 60 * 1000,
    oracle: "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7",
    creator: "SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE",
    volume: 45000 * USDCX_PRECISION,
    liquidity: 10000 * USDCX_PRECISION,
    fees: 0.02,
  },
  {
    id: "market-2",
    question: "Will the Kansas City Chiefs win Super Bowl LIX?",
    description: "This market resolves to YES if the Kansas City Chiefs win Super Bowl LIX (59) scheduled for February 9, 2025.",
    type: "binary",
    category: "sports",
    outcomes: [
      { id: 0, label: "Yes", price: 280000, shares: 5600 },
      { id: 1, label: "No", price: 720000, shares: 14400 },
    ],
    status: "open",
    createdAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
    lockTime: Date.now() + 30 * 24 * 60 * 60 * 1000,
    resolutionTime: Date.now() + 32 * 24 * 60 * 60 * 1000,
    oracle: "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7",
    creator: "SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR",
    volume: 128500 * USDCX_PRECISION,
    liquidity: 25000 * USDCX_PRECISION,
    fees: 0.02,
  },
  {
    id: "market-3",
    question: "Will Ethereum flip Bitcoin by market cap in 2025?",
    description: "This market resolves to YES if Ethereum's market capitalization exceeds Bitcoin's market capitalization at any point during 2025.",
    type: "binary",
    category: "crypto",
    outcomes: [
      { id: 0, label: "Yes", price: 120000, shares: 2400 },
      { id: 1, label: "No", price: 880000, shares: 17600 },
    ],
    status: "open",
    createdAt: Date.now() - 21 * 24 * 60 * 60 * 1000,
    lockTime: Date.now() + 335 * 24 * 60 * 60 * 1000,
    resolutionTime: Date.now() + 365 * 24 * 60 * 60 * 1000,
    oracle: "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7",
    creator: "SP1Y5YSTAHZ88XYK1VPDH24GY0HPX5J4JECTMY4A1",
    volume: 67800 * USDCX_PRECISION,
    liquidity: 15000 * USDCX_PRECISION,
    fees: 0.02,
  },
  {
    id: "market-4",
    question: "Who will win the 2024 US Presidential Election?",
    description: "This market resolves based on the certified winner of the 2024 US Presidential Election.",
    type: "categorical",
    category: "politics",
    outcomes: [
      { id: 0, label: "Trump", price: 520000, shares: 26000 },
      { id: 1, label: "Biden", price: 380000, shares: 19000 },
      { id: 2, label: "Other", price: 100000, shares: 5000 },
    ],
    status: "resolved",
    resolvedOutcome: 0,
    createdAt: Date.now() - 180 * 24 * 60 * 60 * 1000,
    lockTime: Date.now() - 60 * 24 * 60 * 60 * 1000,
    resolutionTime: Date.now() - 30 * 24 * 60 * 60 * 1000,
    oracle: "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7",
    creator: "SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE",
    volume: 2450000 * USDCX_PRECISION,
    liquidity: 500000 * USDCX_PRECISION,
    fees: 0.02,
  },
  {
    id: "market-5",
    question: "Will Taylor Swift announce a new album at the Grammys 2025?",
    description: "This market resolves to YES if Taylor Swift officially announces a new studio album during the Grammy Awards ceremony on February 2, 2025.",
    type: "binary",
    category: "entertainment",
    outcomes: [
      { id: 0, label: "Yes", price: 350000, shares: 7000 },
      { id: 1, label: "No", price: 650000, shares: 13000 },
    ],
    status: "open",
    createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    lockTime: Date.now() + 20 * 24 * 60 * 60 * 1000,
    resolutionTime: Date.now() + 21 * 24 * 60 * 60 * 1000,
    oracle: "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7",
    creator: "SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR",
    volume: 34200 * USDCX_PRECISION,
    liquidity: 8000 * USDCX_PRECISION,
    fees: 0.02,
  },
  {
    id: "market-6",
    question: "Will Solana reach $500 before Q2 2025?",
    description: "This market resolves to YES if the price of Solana (SOL) reaches or exceeds $500 USD on any major exchange before April 1, 2025.",
    type: "binary",
    category: "crypto",
    outcomes: [
      { id: 0, label: "Yes", price: 420000, shares: 8400 },
      { id: 1, label: "No", price: 580000, shares: 11600 },
    ],
    status: "open",
    createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    lockTime: Date.now() + 75 * 24 * 60 * 60 * 1000,
    resolutionTime: Date.now() + 80 * 24 * 60 * 60 * 1000,
    oracle: "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7",
    creator: "SP1Y5YSTAHZ88XYK1VPDH24GY0HPX5J4JECTMY4A1",
    volume: 89500 * USDCX_PRECISION,
    liquidity: 20000 * USDCX_PRECISION,
    fees: 0.02,
  },
  {
    id: "market-7",
    question: "Will SpaceX successfully land Starship on Mars in 2025?",
    description: "This market resolves to YES if SpaceX successfully lands a Starship vehicle on Mars at any point during 2025.",
    type: "binary",
    category: "other",
    outcomes: [
      { id: 0, label: "Yes", price: 50000, shares: 1000 },
      { id: 1, label: "No", price: 950000, shares: 19000 },
    ],
    status: "open",
    createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
    lockTime: Date.now() + 300 * 24 * 60 * 60 * 1000,
    resolutionTime: Date.now() + 365 * 24 * 60 * 60 * 1000,
    oracle: "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7",
    creator: "SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE",
    volume: 156000 * USDCX_PRECISION,
    liquidity: 30000 * USDCX_PRECISION,
    fees: 0.02,
  },
  {
    id: "market-8",
    question: "Will the Fed cut rates in January 2025?",
    description: "This market resolves to YES if the Federal Reserve announces a reduction in the federal funds rate at their January 2025 FOMC meeting.",
    type: "binary",
    category: "politics",
    outcomes: [
      { id: 0, label: "Yes", price: 180000, shares: 3600 },
      { id: 1, label: "No", price: 820000, shares: 16400 },
    ],
    status: "locked",
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    lockTime: Date.now() - 2 * 24 * 60 * 60 * 1000,
    resolutionTime: Date.now() + 5 * 24 * 60 * 60 * 1000,
    oracle: "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7",
    creator: "SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR",
    volume: 78300 * USDCX_PRECISION,
    liquidity: 18000 * USDCX_PRECISION,
    fees: 0.02,
  },
];

// ============================================
// WagerWars Contract Stubs
// ============================================

/**
 * TODO: Connect to actual Stacks wallet (Hiro Wallet, Xverse, etc.)
 */
export async function connectWallet(): Promise<{ address: string; stxBalance: number; usdcxBalance: number }> {
  // TODO: Implement actual wallet connection using @stacks/connect
  console.log("TODO: Implement wallet connection");

  // Mock response
  return {
    address: "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7",
    stxBalance: 2500.5 * 1_000_000, // STX uses 6 decimals
    usdcxBalance: 10250.75 * USDCX_PRECISION,
  };
}

/**
 * TODO: Disconnect wallet
 */
export async function disconnectWallet(): Promise<void> {
  // TODO: Implement actual wallet disconnection
  console.log("TODO: Implement wallet disconnection");
}

/**
 * TODO: Fetch all markets from the contract
 */
export async function fetchMarkets(filters?: {
  category?: MarketCategory;
  status?: MarketStatus;
  search?: string;
}): Promise<Market[]> {
  // TODO: Implement actual contract call to fetch markets
  console.log("TODO: Fetch markets from contract", filters);

  let filtered = [...mockMarkets];

  if (filters?.category && filters.category !== ("all" as MarketCategory)) {
    filtered = filtered.filter((m) => m.category === filters.category);
  }

  if (filters?.status) {
    filtered = filtered.filter((m) => m.status === filters.status);
  }

  if (filters?.search) {
    const search = filters.search.toLowerCase();
    filtered = filtered.filter(
      (m) =>
        m.question.toLowerCase().includes(search) ||
        m.description.toLowerCase().includes(search)
    );
  }

  return filtered;
}

/**
 * TODO: Fetch single market details
 */
export async function fetchMarket(marketId: string): Promise<Market | null> {
  // TODO: Implement actual contract call
  console.log("TODO: Fetch market from contract", marketId);

  return mockMarkets.find((m) => m.id === marketId) || null;
}

/**
 * TODO: Fetch market price history
 */
export async function fetchPriceHistory(marketId: string): Promise<PricePoint[]> {
  // TODO: Implement actual indexer call
  console.log("TODO: Fetch price history", marketId);

  return generatePriceHistory(marketId);
}

/**
 * TODO: Fetch recent trades for a market
 */
export async function fetchRecentTrades(marketId: string): Promise<Trade[]> {
  // TODO: Implement actual indexer call
  console.log("TODO: Fetch recent trades", marketId);

  return generateRecentTrades(marketId);
}

/**
 * TODO: Get current price for an outcome
 */
export async function getPrice(marketId: string, outcome: number): Promise<number> {
  // TODO: Implement actual contract read call
  console.log("TODO: Get price from contract", marketId, outcome);

  const market = mockMarkets.find((m) => m.id === marketId);
  if (!market) return 500000;

  return market.outcomes[outcome]?.price || 500000;
}

/**
 * TODO: Calculate buy quote
 */
export async function calculateBuyQuote(
  marketId: string,
  outcome: number,
  amount: number
): Promise<Quote> {
  // TODO: Implement actual contract read call
  console.log("TODO: Calculate buy quote", marketId, outcome, amount);

  const market = mockMarkets.find((m) => m.id === marketId);
  const price = market?.outcomes[outcome]?.price || 500000;

  const shares = amount / (price / PRICE_PRECISION);
  const priceImpact = (amount / USDCX_PRECISION) * 0.001; // 0.1% per 1 USDCx
  const fee = amount * 0.02;

  return {
    shares: Math.floor(shares),
    averagePrice: price,
    priceImpact: priceImpact * 100,
    fee,
    total: amount + fee,
  };
}

/**
 * TODO: Calculate sell quote
 */
export async function calculateSellQuote(
  marketId: string,
  outcome: number,
  shares: number
): Promise<Quote> {
  // TODO: Implement actual contract read call
  console.log("TODO: Calculate sell quote", marketId, outcome, shares);

  const market = mockMarkets.find((m) => m.id === marketId);
  const price = market?.outcomes[outcome]?.price || 500000;

  const amount = shares * (price / PRICE_PRECISION) * USDCX_PRECISION;
  const priceImpact = (shares / 1000) * 0.5; // 0.5% per 1000 shares
  const fee = amount * 0.02;

  return {
    shares,
    averagePrice: price,
    priceImpact,
    fee,
    total: amount - fee,
  };
}

/**
 * TODO: Execute buy order
 */
export async function executeBuy(
  marketId: string,
  outcome: number,
  amount: number
): Promise<Trade> {
  // TODO: Implement actual contract call
  console.log("TODO: Execute buy order", marketId, outcome, amount);

  const market = mockMarkets.find((m) => m.id === marketId);
  const price = market?.outcomes[outcome]?.price || 500000;
  const shares = Math.floor(amount / (price / PRICE_PRECISION));

  return {
    id: `trade-${Date.now()}`,
    marketId,
    user: "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7",
    type: "buy",
    outcome,
    outcomeLabel: market?.outcomes[outcome]?.label || "Unknown",
    shares,
    price,
    total: amount,
    timestamp: Date.now(),
  };
}

/**
 * TODO: Execute sell order
 */
export async function executeSell(
  marketId: string,
  outcome: number,
  shares: number
): Promise<Trade> {
  // TODO: Implement actual contract call
  console.log("TODO: Execute sell order", marketId, outcome, shares);

  const market = mockMarkets.find((m) => m.id === marketId);
  const price = market?.outcomes[outcome]?.price || 500000;
  const total = shares * (price / PRICE_PRECISION) * USDCX_PRECISION;

  return {
    id: `trade-${Date.now()}`,
    marketId,
    user: "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7",
    type: "sell",
    outcome,
    outcomeLabel: market?.outcomes[outcome]?.label || "Unknown",
    shares,
    price,
    total,
    timestamp: Date.now(),
  };
}

/**
 * TODO: Get user position in a market
 */
export async function getUserPosition(
  marketId: string,
  user: string
): Promise<UserPosition | null> {
  // TODO: Implement actual contract read call
  console.log("TODO: Get user position", marketId, user);

  // Mock: return a position for demo
  const market = mockMarkets.find((m) => m.id === marketId);
  if (!market || market.status === "resolved") return null;

  // Randomly decide if user has position
  if (Math.random() > 0.5) return null;

  const outcome = Math.random() > 0.5 ? 0 : 1;
  const shares = Math.floor(Math.random() * 500 + 50);
  const entryPrice = market.outcomes[outcome].price - 50000;
  const currentPrice = market.outcomes[outcome].price;
  const value = shares * (currentPrice / PRICE_PRECISION) * USDCX_PRECISION;
  const pnl = shares * ((currentPrice - entryPrice) / PRICE_PRECISION) * USDCX_PRECISION;

  return {
    marketId,
    outcome,
    outcomeLabel: market.outcomes[outcome].label,
    shares,
    entryPrice,
    currentPrice,
    value,
    pnl,
    pnlPercent: (pnl / (value - pnl)) * 100,
  };
}

/**
 * TODO: Get all user positions
 */
export async function getUserPositions(user: string): Promise<UserPosition[]> {
  // TODO: Implement actual indexer call
  console.log("TODO: Get all user positions", user);

  const positions: UserPosition[] = [];

  for (const market of mockMarkets.filter((m) => m.status === "open")) {
    if (Math.random() > 0.6) {
      const outcome = Math.random() > 0.5 ? 0 : 1;
      const shares = Math.floor(Math.random() * 500 + 50);
      const entryPrice = market.outcomes[outcome].price - 50000 + Math.random() * 100000;
      const currentPrice = market.outcomes[outcome].price;
      const value = shares * (currentPrice / PRICE_PRECISION) * USDCX_PRECISION;
      const pnl = shares * ((currentPrice - entryPrice) / PRICE_PRECISION) * USDCX_PRECISION;

      positions.push({
        marketId: market.id,
        outcome,
        outcomeLabel: market.outcomes[outcome].label,
        shares,
        entryPrice: Math.floor(entryPrice),
        currentPrice,
        value: Math.floor(value),
        pnl: Math.floor(pnl),
        pnlPercent: (pnl / (value - pnl)) * 100,
      });
    }
  }

  return positions;
}

/**
 * TODO: Claim winnings from resolved market
 */
export async function claimWinnings(marketId: string): Promise<number> {
  // TODO: Implement actual contract call
  console.log("TODO: Claim winnings", marketId);

  // Mock: return random winnings
  return Math.floor(Math.random() * 1000 * USDCX_PRECISION);
}

/**
 * TODO: Create binary market
 */
export async function createBinaryMarket(params: {
  question: string;
  description: string;
  category: MarketCategory;
  lockTime: number;
  resolutionTime: number;
  oracle: string;
  liquidity: number;
}): Promise<string> {
  // TODO: Implement actual contract call
  console.log("TODO: Create binary market", params);

  return `market-${Date.now()}`;
}

/**
 * TODO: Create categorical market
 */
export async function createCategoricalMarket(params: {
  question: string;
  description: string;
  category: MarketCategory;
  outcomes: string[];
  lockTime: number;
  resolutionTime: number;
  oracle: string;
  liquidity: number;
}): Promise<string> {
  // TODO: Implement actual contract call
  console.log("TODO: Create categorical market", params);

  return `market-${Date.now()}`;
}

/**
 * TODO: Create scalar market
 */
export async function createScalarMarket(params: {
  question: string;
  description: string;
  category: MarketCategory;
  minValue: number;
  maxValue: number;
  lockTime: number;
  resolutionTime: number;
  oracle: string;
  liquidity: number;
}): Promise<string> {
  // TODO: Implement actual contract call
  console.log("TODO: Create scalar market", params);

  return `market-${Date.now()}`;
}

/**
 * TODO: Get oracle info
 */
export async function getOracleInfo(address: string): Promise<OracleInfo | null> {
  // TODO: Implement actual contract read call
  console.log("TODO: Get oracle info", address);

  return {
    address,
    tier: "silver",
    bondAmount: 5000 * USDCX_PRECISION,
    resolutionsCount: 47,
    disputesCount: 2,
    successRate: 95.7,
    registeredAt: Date.now() - 90 * 24 * 60 * 60 * 1000,
  };
}

/**
 * TODO: Register as oracle
 */
export async function registerOracle(bondAmount: number): Promise<void> {
  // TODO: Implement actual contract call
  console.log("TODO: Register oracle", bondAmount);
}

/**
 * TODO: Resolve market (oracle only)
 */
export async function resolveMarket(marketId: string, outcome: number): Promise<void> {
  // TODO: Implement actual contract call
  console.log("TODO: Resolve market", marketId, outcome);
}

/**
 * TODO: Get pending resolutions for oracle
 */
export async function getPendingResolutions(oracleAddress: string): Promise<Market[]> {
  // TODO: Implement actual indexer call
  console.log("TODO: Get pending resolutions", oracleAddress);

  return mockMarkets.filter((m) => m.status === "locked" && m.oracle === oracleAddress);
}

/**
 * TODO: Get platform stats
 */
export async function getPlatformStats(): Promise<PlatformStats> {
  // TODO: Implement actual contract read call
  console.log("TODO: Get platform stats");

  return {
    totalMarkets: mockMarkets.length,
    totalVolume: mockMarkets.reduce((sum, m) => sum + m.volume, 0),
    totalUsers: 1247,
    activeMarkets: mockMarkets.filter((m) => m.status === "open").length,
  };
}

/**
 * TODO: Get USDCx balance
 */
export async function getUSDCxBalance(address: string): Promise<number> {
  // TODO: Implement actual token contract read call
  console.log("TODO: Get USDCx balance", address);

  return 10250.75 * USDCX_PRECISION;
}

/**
 * TODO: Deposit to vault
 */
export async function deposit(amount: number): Promise<void> {
  // TODO: Implement actual contract call
  console.log("TODO: Deposit to vault", amount);
}

/**
 * TODO: Withdraw from vault
 */
export async function withdraw(amount: number): Promise<void> {
  // TODO: Implement actual contract call
  console.log("TODO: Withdraw from vault", amount);
}
