// Contract interaction utilities using functional programming
// Pure functions for building contract calls

import {
  callReadOnlyFunction,
  makeContractCall,
  AnchorMode,
  PostConditionMode,
  FungibleConditionCode,
  makeStandardSTXPostCondition,
  createAssetInfo,
} from '@stacks/transactions'
import { StacksNetwork } from '@stacks/network'
import { CONTRACTS, type Market, type TradeQuote, type UserPosition } from './types'

// Configuration types
export interface ContractConfig {
  network: StacksNetwork
  contractAddress: string
}

// Compose network configuration
export const createNetworkConfig = (
  network: StacksNetwork,
  contractAddress: string
): ContractConfig => ({
  network,
  contractAddress,
})

// ===================================
// Pure Read-Only Call Builders
// ===================================

// Build parameters for reading market data
const buildReadMarketParams = (config: ContractConfig, marketId: number) => ({
  network: config.network,
  contractAddress: config.contractAddress,
  contractName: CONTRACTS.MARKET_MANAGER,
  functionName: 'get-market',
  functionArgs: [{ type: 'uint', value: marketId }],
  senderAddress: config.contractAddress,
})

// Build parameters for reading user position
const buildReadPositionParams = (
  config: ContractConfig,
  user: string,
  marketId: number,
  outcomeId: number
) => ({
  network: config.network,
  contractAddress: config.contractAddress,
  contractName: CONTRACTS.ORDER_BOOK,
  functionName: 'get-user-position',
  functionArgs: [
    { type: 'principal', value: user },
    { type: 'uint', value: marketId },
    { type: 'uint', value: outcomeId },
  ],
  senderAddress: user,
})

// Build parameters for getting current price
const buildGetPriceParams = (config: ContractConfig, marketId: number, outcomeId: number) => ({
  network: config.network,
  contractAddress: config.contractAddress,
  contractName: CONTRACTS.ORDER_BOOK,
  functionName: 'get-current-price',
  functionArgs: [
    { type: 'uint', value: marketId },
    { type: 'uint', value: outcomeId },
  ],
  senderAddress: config.contractAddress,
})

// Build parameters for buy quote
const buildBuyQuoteParams = (
  config: ContractConfig,
  marketId: number,
  outcomeId: number,
  sbtcAmount: number
) => ({
  network: config.network,
  contractAddress: config.contractAddress,
  contractName: CONTRACTS.ORDER_BOOK,
  functionName: 'calculate-buy-quote',
  functionArgs: [
    { type: 'uint', value: marketId },
    { type: 'uint', value: outcomeId },
    { type: 'uint', value: sbtcAmount },
  ],
  senderAddress: config.contractAddress,
})

// ===================================
// Read-Only Functions (Pure)
// ===================================

export const readMarket = (config: ContractConfig) => (marketId: number) =>
  callReadOnlyFunction(buildReadMarketParams(config, marketId))

export const readUserPosition = (config: ContractConfig) =>
  (user: string, marketId: number, outcomeId: number) =>
    callReadOnlyFunction(buildReadPositionParams(config, user, marketId, outcomeId))

export const readCurrentPrice = (config: ContractConfig) =>
  (marketId: number, outcomeId: number) =>
    callReadOnlyFunction(buildGetPriceParams(config, marketId, outcomeId))

export const readBuyQuote = (config: ContractConfig) =>
  (marketId: number, outcomeId: number, sbtcAmount: number) =>
    callReadOnlyFunction(buildBuyQuoteParams(config, marketId, outcomeId, sbtcAmount))

// ===================================
// Transaction Call Builders (Pure)
// ===================================

// Build create market transaction
export const buildCreateBinaryMarketTx = (
  config: ContractConfig,
  params: {
    question: string
    description?: string
    resolutionTime: number
    lockTime: number
    oracle: string
    liquidityParam: number
    category: string
    metadataUri?: string
  }
) => ({
  network: config.network,
  contractAddress: config.contractAddress,
  contractName: CONTRACTS.WAGERWARS,
  functionName: 'create-binary-prediction',
  functionArgs: [
    { type: 'string-ascii', value: params.question },
    params.description
      ? { type: 'some', value: { type: 'string-utf8', value: params.description }}
      : { type: 'none' },
    { type: 'uint', value: params.resolutionTime },
    { type: 'uint', value: params.lockTime },
    { type: 'principal', value: params.oracle },
    { type: 'uint', value: params.liquidityParam },
    { type: 'string-ascii', value: params.category },
    params.metadataUri
      ? { type: 'some', value: { type: 'string-ascii', value: params.metadataUri }}
      : { type: 'none' },
  ],
  anchorMode: AnchorMode.Any,
  postConditionMode: PostConditionMode.Allow,
})

// Build buy shares transaction
export const buildBuySharesTx = (
  config: ContractConfig,
  params: {
    marketId: number
    outcomeId: number
    sbtcAmount: number
    minShares: number
  }
) => ({
  network: config.network,
  contractAddress: config.contractAddress,
  contractName: CONTRACTS.ORDER_BOOK,
  functionName: 'buy-shares',
  functionArgs: [
    { type: 'uint', value: params.marketId },
    { type: 'uint', value: params.outcomeId },
    { type: 'uint', value: params.sbtcAmount },
    { type: 'uint', value: params.minShares },
  ],
  anchorMode: AnchorMode.Any,
  postConditionMode: PostConditionMode.Allow,
})

// Build sell shares transaction
export const buildSellSharesTx = (
  config: ContractConfig,
  params: {
    marketId: number
    outcomeId: number
    shares: number
    minSbtc: number
  }
) => ({
  network: config.network,
  contractAddress: config.contractAddress,
  contractName: CONTRACTS.ORDER_BOOK,
  functionName: 'sell-shares',
  functionArgs: [
    { type: 'uint', value: params.marketId },
    { type: 'uint', value: params.outcomeId },
    { type: 'uint', value: params.shares },
    { type: 'uint', value: params.minSbtc },
  ],
  anchorMode: AnchorMode.Any,
  postConditionMode: PostConditionMode.Allow,
})

// Build claim winnings transaction
export const buildClaimWinningsTx = (
  config: ContractConfig,
  params: {
    marketId: number
    outcomeId: number
  }
) => ({
  network: config.network,
  contractAddress: config.contractAddress,
  contractName: CONTRACTS.ORDER_BOOK,
  functionName: 'claim-winnings',
  functionArgs: [
    { type: 'uint', value: params.marketId },
    { type: 'uint', value: params.outcomeId },
  ],
  anchorMode: AnchorMode.Any,
  postConditionMode: PostConditionMode.Allow,
})

// Build register oracle transaction
export const buildRegisterOracleTx = (
  config: ContractConfig,
  bondAmount: number
) => ({
  network: config.network,
  contractAddress: config.contractAddress,
  contractName: CONTRACTS.ORACLE_BRIDGE,
  functionName: 'register-oracle',
  functionArgs: [
    { type: 'uint', value: bondAmount },
  ],
  anchorMode: AnchorMode.Any,
  postConditionMode: PostConditionMode.Allow,
})

// ===================================
// Higher-order functions for composition
// ===================================

// Compose multiple read operations
export const composeReads = <T>(
  ...fns: Array<() => Promise<T>>
) => async (): Promise<T[]> => Promise.all(fns.map(fn => fn()))

// Retry logic (functional wrapper)
export const withRetry = <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): (() => Promise<T>) => {
  const attempt = async (retriesLeft: number): Promise<T> => {
    try {
      return await fn()
    } catch (error) {
      if (retriesLeft === 0) throw error
      await new Promise(resolve => setTimeout(resolve, delay))
      return attempt(retriesLeft - 1)
    }
  }
  return () => attempt(maxRetries)
}

// Cache wrapper (functional memoization)
export const withCache = <T>(
  fn: (...args: any[]) => Promise<T>,
  ttl = 60000 // 1 minute default
) => {
  const cache = new Map<string, { value: T; expires: number }>()

  return async (...args: any[]): Promise<T> => {
    const key = JSON.stringify(args)
    const cached = cache.get(key)

    if (cached && cached.expires > Date.now()) {
      return cached.value
    }

    const value = await fn(...args)
    cache.set(key, { value, expires: Date.now() + ttl })
    return value
  }
}
