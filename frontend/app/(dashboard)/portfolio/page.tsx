"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Trophy,
  Target,
  DollarSign,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarketStore } from "@/stores/useMarketStore";
import { useWalletStore, formatBalance } from "@/stores/useWalletStore";
import { formatUSDCx, priceToPercent, truncateAddress, USDCX_PRECISION } from "@/lib/contracts";
import { mockMarkets } from "@/lib/stacks";
import { cn } from "@/lib/utils";

export default function PortfolioPage() {
  const { address, isConnected, connect } = useWalletStore();
  const { positions, portfolioStats, isLoadingPortfolio, loadPortfolio } = useMarketStore();

  useEffect(() => {
    if (address) {
      loadPortfolio(address);
    }
  }, [address]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="bg-card border-border/50 max-w-md w-full mx-4">
          <CardHeader className="text-center">
            <Wallet className="h-12 w-12 mx-auto text-primary mb-4" />
            <CardTitle className="text-2xl">Connect Your Wallet</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-6">
              Connect your wallet to view your portfolio and positions
            </p>
            <Button onClick={connect} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Connect Wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = portfolioStats || {
    totalValue: 0,
    totalPnl: 0,
    totalPnlPercent: 0,
    activePositions: 0,
    marketsWon: 0,
    marketsLost: 0,
  };

  const isProfitable = stats.totalPnl >= 0;

  // Mock created markets
  const createdMarkets = mockMarkets.slice(0, 2);

  // Mock history
  const tradeHistory = [
    { id: 1, market: "BTC to $150K", type: "buy", outcome: "Yes", shares: 100, price: 580000, date: Date.now() - 86400000 },
    { id: 2, market: "Chiefs Super Bowl", type: "sell", outcome: "Yes", shares: 50, price: 310000, date: Date.now() - 172800000 },
    { id: 3, market: "ETH Flip", type: "buy", outcome: "No", shares: 200, price: 850000, date: Date.now() - 259200000 },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/30">
        <div className="container px-4 py-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Portfolio</h1>
          <p className="text-muted-foreground">
            Track your positions and performance
          </p>
        </div>
      </div>

      <div className="container px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-card border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm">Total Value</span>
              </div>
              <p className="text-2xl font-bold font-mono">
                {formatUSDCx(stats.totalValue)}
              </p>
              <p className="text-xs text-muted-foreground">USDCx</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                {isProfitable ? (
                  <TrendingUp className="h-4 w-4 text-success" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )}
                <span className="text-sm">P&L</span>
              </div>
              <p className={cn(
                "text-2xl font-bold font-mono",
                isProfitable ? "text-success" : "text-destructive"
              )}>
                {isProfitable ? "+" : ""}{formatUSDCx(stats.totalPnl)}
              </p>
              <p className={cn(
                "text-xs",
                isProfitable ? "text-success" : "text-destructive"
              )}>
                {isProfitable ? "+" : ""}{stats.totalPnlPercent.toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Target className="h-4 w-4" />
                <span className="text-sm">Active Positions</span>
              </div>
              <p className="text-2xl font-bold font-mono">{stats.activePositions}</p>
              <p className="text-xs text-muted-foreground">Markets</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Trophy className="h-4 w-4 text-warning" />
                <span className="text-sm">Markets Won</span>
              </div>
              <p className="text-2xl font-bold font-mono">{stats.marketsWon}</p>
              <p className="text-xs text-muted-foreground">
                {stats.marketsWon + stats.marketsLost > 0
                  ? `${((stats.marketsWon / (stats.marketsWon + stats.marketsLost)) * 100).toFixed(0)}% win rate`
                  : "No resolved markets"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="positions" className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="positions">Active Positions</TabsTrigger>
            <TabsTrigger value="history">Trade History</TabsTrigger>
            <TabsTrigger value="created">Created Markets</TabsTrigger>
          </TabsList>

          {/* Active Positions */}
          <TabsContent value="positions">
            <Card className="bg-card border-border/50">
              <CardContent className="p-0">
                {isLoadingPortfolio ? (
                  <div className="p-6 space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16" />
                    ))}
                  </div>
                ) : positions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/50">
                        <TableHead>Market</TableHead>
                        <TableHead>Outcome</TableHead>
                        <TableHead className="text-right">Shares</TableHead>
                        <TableHead className="text-right">Entry</TableHead>
                        <TableHead className="text-right">Current</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                        <TableHead className="text-right">P&L</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {positions.map((position) => {
                        const market = mockMarkets.find((m) => m.id === position.marketId);
                        const isPosProfit = position.pnl >= 0;
                        return (
                          <TableRow key={position.marketId} className="border-border/50">
                            <TableCell className="font-medium max-w-[200px] truncate">
                              {market?.question || position.marketId}
                            </TableCell>
                            <TableCell>
                              <span className={cn(
                                "px-2 py-1 rounded text-xs font-medium",
                                position.outcomeLabel === "Yes"
                                  ? "bg-success/20 text-success"
                                  : "bg-destructive/20 text-destructive"
                              )}>
                                {position.outcomeLabel}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {position.shares.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {priceToPercent(position.entryPrice).toFixed(1)}%
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {priceToPercent(position.currentPrice).toFixed(1)}%
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatUSDCx(position.value)}
                            </TableCell>
                            <TableCell className={cn(
                              "text-right font-mono",
                              isPosProfit ? "text-success" : "text-destructive"
                            )}>
                              {isPosProfit ? "+" : ""}{formatUSDCx(position.pnl)}
                            </TableCell>
                            <TableCell>
                              <Link href={`/market/${position.marketId}`}>
                                <Button variant="ghost" size="sm">
                                  Trade
                                  <ArrowUpRight className="h-3 w-3 ml-1" />
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">No active positions</p>
                    <Link href="/markets">
                      <Button variant="outline">Explore Markets</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trade History */}
          <TabsContent value="history">
            <Card className="bg-card border-border/50">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead>Date</TableHead>
                      <TableHead>Market</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Outcome</TableHead>
                      <TableHead className="text-right">Shares</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tradeHistory.map((trade) => (
                      <TableRow key={trade.id} className="border-border/50">
                        <TableCell className="text-muted-foreground">
                          {new Date(trade.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-medium">{trade.market}</TableCell>
                        <TableCell>
                          <span className={cn(
                            "px-2 py-1 rounded text-xs font-medium capitalize",
                            trade.type === "buy"
                              ? "bg-success/20 text-success"
                              : "bg-destructive/20 text-destructive"
                          )}>
                            {trade.type}
                          </span>
                        </TableCell>
                        <TableCell>{trade.outcome}</TableCell>
                        <TableCell className="text-right font-mono">
                          {trade.shares}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {priceToPercent(trade.price).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Created Markets */}
          <TabsContent value="created">
            <Card className="bg-card border-border/50">
              <CardContent className="p-0">
                {createdMarkets.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/50">
                        <TableHead>Market</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Volume</TableHead>
                        <TableHead className="text-right">Created</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {createdMarkets.map((market) => (
                        <TableRow key={market.id} className="border-border/50">
                          <TableCell className="font-medium max-w-[300px] truncate">
                            {market.question}
                          </TableCell>
                          <TableCell>
                            <span className={cn(
                              "px-2 py-1 rounded text-xs font-medium capitalize",
                              market.status === "open"
                                ? "bg-success/20 text-success"
                                : market.status === "locked"
                                ? "bg-warning/20 text-warning"
                                : "bg-primary/20 text-primary"
                            )}>
                              {market.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatUSDCx(market.volume)} USDCx
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {new Date(market.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Link href={`/market/${market.id}`}>
                              <Button variant="ghost" size="sm">
                                View
                                <ArrowUpRight className="h-3 w-3 ml-1" />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">No markets created yet</p>
                    <Link href="/create">
                      <Button variant="outline">Create Your First Market</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
