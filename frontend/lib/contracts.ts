// WagerWars Contract Types and Interfaces
// All prices are 0-1,000,000 (representing 0%-100%)
// USDCx uses 6 decimals (1 USDCx = 1,000,000 microUSDCx)

export const PRICE_PRECISION = 1_000_000; // 100% = 1,000,000
export const USDCX_DECIMALS = 6;
export const USDCX_PRECISION = 1_000_000;

// Market Types
export type MarketType = "binary" | "categorical" | "scalar";
export type MarketStatus = "open" | "locked" | "resolved" | "cancelled";
export type MarketCategory = "crypto" | "sports" | "politics" | "entertainment" | "other";

export interface Outcome {
  id: number;
  label: string;
  price: number; // 0-1,000,000
  shares: number;
}

export interface Market {
  id: string;
  question: string;
  description: string;
  type: MarketType;
  category: MarketCategory;
  outcomes: Outcome[];
  status: MarketStatus;
  createdAt: number;
  lockTime: number;
  resolutionTime: number;
  resolvedOutcome?: number;
  oracle: string;
  creator: string;
  volume: number; // in microUSDCx
  liquidity: number; // in microUSDCx
  fees: number;
}

export interface MarketInfo {
  market: Market;
  userPosition?: UserPosition;
  priceHistory: PricePoint[];
  recentTrades: Trade[];
}

// Trading Types
export interface Trade {
  id: string;
  marketId: string;
  user: string;
  type: "buy" | "sell";
  outcome: number;
  outcomeLabel: string;
  shares: number;
  price: number;
  total: number; // in microUSDCx
  timestamp: number;
  txId?: string;
}

export interface Quote {
  shares: number;
  averagePrice: number;
  priceImpact: number; // percentage
  fee: number; // in microUSDCx
  total: number; // in microUSDCx
}

export interface UserPosition {
  marketId: string;
  outcome: number;
  outcomeLabel: string;
  shares: number;
  entryPrice: number;
  currentPrice: number;
  value: number; // in microUSDCx
  pnl: number; // in microUSDCx
  pnlPercent: number;
}

export interface PortfolioStats {
  totalValue: number;
  totalPnl: number;
  totalPnlPercent: number;
  activePositions: number;
  marketsWon: number;
  marketsLost: number;
}

// Price History
export interface PricePoint {
  timestamp: number;
  price: number;
  outcome: number;
}

// Oracle Types
export type OracleTier = "bronze" | "silver" | "gold";

export interface OracleInfo {
  address: string;
  tier: OracleTier;
  bondAmount: number;
  resolutionsCount: number;
  disputesCount: number;
  successRate: number;
  registeredAt: number;
}

export interface PendingResolution {
  marketId: string;
  market: Market;
  deadline: number;
}

export interface ResolutionHistory {
  marketId: string;
  question: string;
  resolvedOutcome: number;
  outcomeLabel: string;
  resolvedAt: number;
  disputed: boolean;
}

// Wallet Types
export interface WalletState {
  isConnected: boolean;
  address: string | null;
  stxBalance: number;
  usdcxBalance: number;
}

// Platform Stats
export interface PlatformStats {
  totalMarkets: number;
  totalVolume: number;
  totalUsers: number;
  activeMarkets: number;
}

// Contract Function Signatures (for reference)
export interface WagerWarsContract {
  // Main contract
  createBinaryPrediction: (question: string, lockTime: number, resolutionTime: number, oracle: string, liquidity: number) => Promise<string>;
  buyOutcome: (marketId: string, outcome: number, amount: number) => Promise<Trade>;
  sellOutcome: (marketId: string, outcome: number, shares: number) => Promise<Trade>;
  claim: (marketId: string) => Promise<number>;
  getPrice: (marketId: string, outcome: number) => Promise<number>;
  getMarketInfo: (marketId: string) => Promise<Market>;
  getPlatformStats: () => Promise<PlatformStats>;
}

export interface MarketManagerContract {
  createBinaryMarket: (question: string, category: MarketCategory, lockTime: number, resolutionTime: number, oracle: string, liquidity: number) => Promise<string>;
  createCategoricalMarket: (question: string, category: MarketCategory, outcomes: string[], lockTime: number, resolutionTime: number, oracle: string, liquidity: number) => Promise<string>;
  createScalarMarket: (question: string, category: MarketCategory, minValue: number, maxValue: number, lockTime: number, resolutionTime: number, oracle: string, liquidity: number) => Promise<string>;
  resolveMarket: (marketId: string, outcome: number) => Promise<void>;
  canTrade: (marketId: string) => Promise<boolean>;
}

export interface OrderBookContract {
  executeBuy: (marketId: string, outcome: number, amount: number) => Promise<Trade>;
  executeSell: (marketId: string, outcome: number, shares: number) => Promise<Trade>;
  getCurrentPrice: (marketId: string, outcome: number) => Promise<number>;
  calculateBuyQuote: (marketId: string, outcome: number, amount: number) => Promise<Quote>;
  calculateSellQuote: (marketId: string, outcome: number, shares: number) => Promise<Quote>;
  getUserPosition: (marketId: string, user: string) => Promise<UserPosition | null>;
}

export interface VaultContract {
  deposit: (amount: number) => Promise<void>;
  withdraw: (amount: number) => Promise<void>;
  getBalance: (user: string) => Promise<number>;
}

export interface OracleBridgeContract {
  registerOracle: (bondAmount: number) => Promise<void>;
  getOracle: (address: string) => Promise<OracleInfo | null>;
}

export interface USDCxTokenContract {
  transfer: (to: string, amount: number) => Promise<void>;
  getBalance: (user: string) => Promise<number>;
}

// Utility functions
export function formatUSDCx(microAmount: number): string {
  const amount = microAmount / USDCX_PRECISION;
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function parseUSDCx(amount: number): number {
  return Math.floor(amount * USDCX_PRECISION);
}

export function formatPrice(price: number): string {
  const percent = (price / PRICE_PRECISION) * 100;
  return `${percent.toFixed(1)}%`;
}

export function priceToPercent(price: number): number {
  return (price / PRICE_PRECISION) * 100;
}

export function percentToPrice(percent: number): number {
  return Math.floor((percent / 100) * PRICE_PRECISION);
}

export function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatTimeRemaining(timestamp: number): string {
  const now = Date.now();
  const diff = timestamp - now;

  if (diff <= 0) return "Ended";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
