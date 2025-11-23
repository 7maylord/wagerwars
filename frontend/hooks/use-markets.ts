// Functional hooks for market data
// Using React hooks with functional programming patterns

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Market, UserPosition } from '@/lib/contracts/types'
import type { ContractConfig } from '@/lib/contracts/contract-calls'
import {
  readMarket,
  readUserPosition,
  readCurrentPrice,
  withRetry,
  withCache,
} from '@/lib/contracts/contract-calls'

// Hook for fetching a single market
export const useMarket = (config: ContractConfig | null, marketId: number) => {
  const [market, setMarket] = useState<Market | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchMarket = useCallback(async () => {
    if (!config) return

    setLoading(true)
    setError(null)

    try {
      const readMarketFn = withRetry(
        withCache(readMarket(config), 30000) // 30s cache
      )
      const result = await readMarketFn(marketId)
      setMarket(result as Market)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [config, marketId])

  useEffect(() => {
    fetchMarket()
  }, [fetchMarket])

  return { market, loading, error, refetch: fetchMarket }
}

// Hook for fetching multiple markets
export const useMarkets = (config: ContractConfig | null, marketIds: number[]) => {
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchMarkets = useCallback(async () => {
    if (!config || marketIds.length === 0) return

    setLoading(true)
    setError(null)

    try {
      const readMarketFn = readMarket(config)
      const results = await Promise.all(
        marketIds.map(id => withRetry(withCache(readMarketFn, 30000))(id))
      )
      setMarkets(results as Market[])
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [config, marketIds])

  useEffect(() => {
    fetchMarkets()
  }, [fetchMarkets])

  return { markets, loading, error, refetch: fetchMarkets }
}

// Hook for user position
export const useUserPosition = (
  config: ContractConfig | null,
  user: string | null,
  marketId: number,
  outcomeId: number
) => {
  const [position, setPosition] = useState<UserPosition | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchPosition = useCallback(async () => {
    if (!config || !user) return

    setLoading(true)
    setError(null)

    try {
      const readPositionFn = readUserPosition(config)
      const result = await withRetry(readPositionFn)(user, marketId, outcomeId)
      setPosition(result as UserPosition)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [config, user, marketId, outcomeId])

  useEffect(() => {
    fetchPosition()
  }, [fetchPosition])

  return { position, loading, error, refetch: fetchPosition }
}

// Hook for current price
export const useCurrentPrice = (
  config: ContractConfig | null,
  marketId: number,
  outcomeId: number
) => {
  const [price, setPrice] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchPrice = useCallback(async () => {
    if (!config) return

    setLoading(true)
    setError(null)

    try {
      const readPriceFn = readCurrentPrice(config)
      const result = await withRetry(
        withCache(readPriceFn, 5000) // 5s cache for prices
      )(marketId, outcomeId)
      setPrice(result as number)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [config, marketId, outcomeId])

  useEffect(() => {
    fetchPrice()
    // Refresh price every 10 seconds
    const interval = setInterval(fetchPrice, 10000)
    return () => clearInterval(interval)
  }, [fetchPrice])

  return { price, loading, error, refetch: fetchPrice }
}

// Hook for filtering and sorting markets (pure functional transformations)
export const useMarketFilters = (markets: Market[]) => {
  const [filters, setFilters] = useState({
    type: null as string | null,
    category: null as string | null,
    status: null as string | null,
    sortBy: 'newest' as 'newest' | 'oldest' | 'volume' | 'ending-soon',
  })

  // Pure filter functions
  const filterByType = (market: Market) =>
    !filters.type || market.marketType === filters.type

  const filterByCategory = (market: Market) =>
    !filters.category || market.category === filters.category

  const filterByStatus = (market: Market) =>
    !filters.status || market.status === filters.status

  // Pure sort functions
  const sortFunctions = {
    newest: (a: Market, b: Market) => b.marketId - a.marketId,
    oldest: (a: Market, b: Market) => a.marketId - b.marketId,
    volume: (a: Market, b: Market) => (b.liquidityParam || 0) - (a.liquidityParam || 0),
    'ending-soon': (a: Market, b: Market) => a.resolutionTime - b.resolutionTime,
  }

  // Compose filters and sort
  const filteredMarkets = useMemo(() => {
    return markets
      .filter(filterByType)
      .filter(filterByCategory)
      .filter(filterByStatus)
      .sort(sortFunctions[filters.sortBy])
  }, [markets, filters])

  return {
    filteredMarkets,
    filters,
    setFilters,
  }
}

// Hook for market categories (pure extraction)
export const useMarketCategories = (markets: Market[]) => {
  return useMemo(() => {
    const categories = new Set(markets.map(m => m.category))
    return Array.from(categories).sort()
  }, [markets])
}

// Hook for market statistics (pure calculations)
export const useMarketStats = (market: Market | null) => {
  return useMemo(() => {
    if (!market) return null

    const now = Date.now()
    const createdAt = 0 // Would come from blockchain
    const timeElapsed = now - createdAt
    const timeRemaining = market.resolutionTime - now

    return {
      timeElapsed,
      timeRemaining,
      isExpiringSoon: timeRemaining < 86400000, // 24 hours
      daysRemaining: Math.floor(timeRemaining / 86400000),
      hoursRemaining: Math.floor((timeRemaining % 86400000) / 3600000),
    }
  }, [market])
}
