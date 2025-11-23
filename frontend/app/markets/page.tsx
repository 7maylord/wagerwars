"use client"

// Markets listing page using functional programming
import { useMemo } from 'react'
import Link from 'next/link'
import { TrendingUp, Clock, Users, Filter } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useWallet } from '@/hooks/use-wallet'
import { useMarkets, useMarketFilters } from '@/hooks/use-markets'
import { formatSBTC, formatPercentage, MARKET_STATUS } from '@/lib/contracts/types'
import type { Market } from '@/lib/contracts/types'

// Pure component for market card
const MarketCard = ({ market }: { market: Market }) => {
  const timeRemaining = useMemo(() => {
    const now = Date.now()
    const remaining = market.resolutionTime - now
    const days = Math.floor(remaining / 86400000)
    const hours = Math.floor((remaining % 86400000) / 3600000)
    return { days, hours }
  }, [market.resolutionTime])

  const statusColor = {
    [MARKET_STATUS.OPEN]: 'text-cyan-400',
    [MARKET_STATUS.LOCKED]: 'text-yellow-400',
    [MARKET_STATUS.RESOLVED]: 'text-green-400',
    [MARKET_STATUS.CANCELLED]: 'text-red-400',
  }[market.status]

  return (
    <Link href={`/markets/${market.marketId}`}>
      <Card className="group relative bg-card hover:bg-card/80 border-border hover:border-cyan-500/50 transition-all duration-300 overflow-hidden">
        {/* Glow effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="relative p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                  {market.marketType}
                </span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">
                  {market.category}
                </span>
              </div>
              <h3 className="text-lg font-bold text-foreground group-hover:text-cyan-400 transition-colors line-clamp-2">
                {market.question}
              </h3>
            </div>
            <span className={`text-xs font-semibold ${statusColor} uppercase`}>
              {market.status}
            </span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <div>
                <div className="text-xs text-muted-foreground">Liquidity</div>
                <div className="text-sm font-semibold text-foreground">
                  {formatSBTC(market.liquidityParam)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <div>
                <div className="text-xs text-muted-foreground">Ends in</div>
                <div className="text-sm font-semibold text-foreground">
                  {timeRemaining.days}d {timeRemaining.hours}h
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <div>
                <div className="text-xs text-muted-foreground">Traders</div>
                <div className="text-sm font-semibold text-foreground">
                  {/* Will be populated from contract */}
                  --
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {market.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {market.description}
            </p>
          )}
        </div>
      </Card>
    </Link>
  )
}

// Pure component for filters
const MarketFilters = ({ filters, setFilters, categories }: any) => {
  return (
    <div className="flex flex-wrap gap-4 items-center">
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-cyan-400" />
        <span className="text-sm font-semibold text-foreground">Filters:</span>
      </div>

      <select
        value={filters.type || ''}
        onChange={(e) => setFilters({ ...filters, type: e.target.value || null })}
        className="px-4 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-400"
      >
        <option value="">All Types</option>
        <option value="binary">Binary</option>
        <option value="categorical">Categorical</option>
        <option value="scalar">Scalar</option>
      </select>

      <select
        value={filters.category || ''}
        onChange={(e) => setFilters({ ...filters, category: e.target.value || null })}
        className="px-4 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-400"
      >
        <option value="">All Categories</option>
        {categories.map((cat: string) => (
          <option key={cat} value={cat}>{cat}</option>
        ))}
      </select>

      <select
        value={filters.sortBy}
        onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as any })}
        className="px-4 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-400"
      >
        <option value="newest">Newest First</option>
        <option value="oldest">Oldest First</option>
        <option value="volume">Highest Volume</option>
        <option value="ending-soon">Ending Soon</option>
      </select>
    </div>
  )
}

export default function MarketsPage() {
  const { isConnected, address, contractConfig, connect } = useWallet()

  // For now, using mock market IDs - in production, fetch from indexer
  const mockMarketIds = [1, 2, 3, 4, 5]
  const { markets, loading, error } = useMarkets(contractConfig, mockMarketIds)
  const { filteredMarkets, filters, setFilters } = useMarketFilters(markets)

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set(markets.map(m => m.category))
    return Array.from(cats).sort()
  }, [markets])

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-black/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1
                className="text-3xl font-bold text-white mb-2"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Prediction Markets
              </h1>
              <p className="text-muted-foreground">
                Bet on the future. Settle on Bitcoin.
              </p>
            </div>

            {!isConnected ? (
              <Button
                onClick={connect}
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
              >
                Connect Wallet
              </Button>
            ) : (
              <div className="flex items-center gap-4">
                <div className="text-sm">
                  <div className="text-muted-foreground">Connected</div>
                  <div className="text-cyan-400 font-mono">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </div>
                </div>
                <Link href="/markets/create">
                  <Button className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold">
                    Create Market
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Filters */}
        <div className="mb-8">
          <MarketFilters
            filters={filters}
            setFilters={setFilters}
            categories={categories}
          />
        </div>

        {/* Markets grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading markets...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-400 mb-4">Error loading markets</p>
            <p className="text-sm text-muted-foreground">{error.message}</p>
          </div>
        ) : filteredMarkets.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground mb-4">No markets found</p>
            <p className="text-sm text-muted-foreground">
              Try adjusting your filters or create the first market!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMarkets.map((market) => (
              <MarketCard key={market.marketId} market={market} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
