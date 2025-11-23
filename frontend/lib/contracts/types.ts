// Contract types and constants for WagerWars prediction markets
// Using functional programming approach

export const CONTRACTS = {
  MARKET_MANAGER: 'market-manager',
  ORDER_BOOK: 'order-book',
  VAULT: 'vault',
  ORACLE_BRIDGE: 'oracle-bridge',
  SBTC_TOKEN: 'sbtc-token',
  WAGERWARS: 'wagerwars',
} as const

export const MARKET_TYPES = {
  BINARY: 'binary',
  CATEGORICAL: 'categorical',
  SCALAR: 'scalar',
} as const

export const MARKET_STATUS = {
  OPEN: 'open',
  LOCKED: 'locked',
  RESOLVED: 'resolved',
  CANCELLED: 'cancelled',
} as const

export const PRECISION = 1_000_000 // 6 decimal places

// Market type definitions
export type MarketType = typeof MARKET_TYPES[keyof typeof MARKET_TYPES]
export type MarketStatus = typeof MARKET_STATUS[keyof typeof MARKET_STATUS]

export interface Market {
  marketId: number
  creator: string
  marketType: MarketType
  question: string
  description?: string
  resolutionTime: number
  lockTime: number
  oracle: string
  liquidityParam: number
  category: string
  status: MarketStatus
  resolvedOutcome?: number
  resolvedAt?: number
  metadata?: string
}

export interface BinaryMarket extends Market {
  marketType: typeof MARKET_TYPES.BINARY
  outcomes: ['Yes', 'No']
}

export interface CategoricalMarket extends Market {
  marketType: typeof MARKET_TYPES.CATEGORICAL
  outcomes: string[]
  outcomeCount: number
}

export interface ScalarMarket extends Market {
  marketType: typeof MARKET_TYPES.SCALAR
  minValue: number
  maxValue: number
  buckets: number
}

export interface UserPosition {
  marketId: number
  outcomeId: number
  shares: number
  avgPrice: number
  totalInvested: number
}

export interface TradeQuote {
  shares: number
  protocolFee: number
  effectivePrice: number
}

export interface OracleInfo {
  oracle: string
  tier: 'bronze' | 'silver' | 'gold'
  bondAmount: number
  active: boolean
  reputationScore: number
}

// Functional type guards
export const isBinaryMarket = (market: Market): market is BinaryMarket =>
  market.marketType === MARKET_TYPES.BINARY

export const isCategoricalMarket = (market: Market): market is CategoricalMarket =>
  market.marketType === MARKET_TYPES.CATEGORICAL

export const isScalarMarket = (market: Market): market is ScalarMarket =>
  market.marketType === MARKET_TYPES.SCALAR

// Pure utility functions
export const formatSBTC = (amount: number): string =>
  `${(amount / PRECISION).toFixed(6)} sBTC`

export const formatPercentage = (value: number): string =>
  `${((value / PRECISION) * 100).toFixed(2)}%`

export const isMarketOpen = (market: Market): boolean =>
  market.status === MARKET_STATUS.OPEN

export const isMarketResolved = (market: Market): boolean =>
  market.status === MARKET_STATUS.RESOLVED

export const canTrade = (market: Market, currentBlock: number): boolean =>
  market.status === MARKET_STATUS.OPEN && currentBlock < market.lockTime
