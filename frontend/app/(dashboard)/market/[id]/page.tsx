"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Users, Droplets, Shield, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import PriceChart from "@/components/PriceChart";
import RecentTrades from "@/components/RecentTrades";
import TradingPanel from "@/components/TradingPanel";
import PositionCard from "@/components/PositionCard";
import { useMarketStore } from "@/stores/useMarketStore";
import { useWalletStore } from "@/stores/useWalletStore";
import { formatUSDCx, formatTimeRemaining, truncateAddress, priceToPercent } from "@/lib/contracts";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  open: "bg-success/20 text-success border-success/30",
  locked: "bg-warning/20 text-warning border-warning/30",
  resolved: "bg-primary/20 text-primary border-primary/30",
  cancelled: "bg-destructive/20 text-destructive border-destructive/30",
};

export default function MarketDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { address } = useWalletStore();
  const {
    currentMarket,
    priceHistory,
    recentTrades,
    userPosition,
    isLoadingMarket,
    loadMarket,
    refreshMarket,
  } = useMarketStore();

  useEffect(() => {
    if (id) {
      loadMarket(id, address || undefined);
    }
  }, [id, address]);

  const handleTradeComplete = () => {
    if (id) {
      refreshMarket(id);
    }
  };

  if (isLoadingMarket || !currentMarket) {
    return (
      <div className="container px-4 py-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <Skeleton className="h-[300px]" />
            <Skeleton className="h-[400px]" />
          </div>
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-[400px]" />
            <Skeleton className="h-[200px]" />
          </div>
        </div>
      </div>
    );
  }

  const market = currentMarket;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/30">
        <div className="container px-4 py-6">
          <Link
            href="/markets"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Markets
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="capitalize">
                  {market.category}
                </Badge>
                <Badge variant="outline" className={statusColors[market.status]}>
                  {market.status}
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">{market.question}</h1>
              <p className="text-muted-foreground max-w-2xl">{market.description}</p>
            </div>

            {/* Quick Stats */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Droplets className="h-4 w-4" />
                <span>{formatUSDCx(market.volume)} Volume</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{formatUSDCx(market.liquidity)} Liquidity</span>
              </div>
              {market.status === "open" && (
                <div className="flex items-center gap-2 text-warning">
                  <Clock className="h-4 w-4" />
                  <span>{formatTimeRemaining(market.lockTime)} left</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column - Charts & Trades */}
          <div className="lg:col-span-3 space-y-6">
            <PriceChart data={priceHistory} outcomeLabel={market.outcomes[0]?.label} />
            <RecentTrades trades={recentTrades} />

            {/* Market Info */}
            <Card className="bg-card border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">Market Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Oracle</p>
                      <p className="font-mono text-sm">{truncateAddress(market.oracle)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Lock Time</p>
                      <p className="text-sm">
                        {new Date(market.lockTime).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Resolution Time</p>
                      <p className="text-sm">
                        {new Date(market.resolutionTime).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Droplets className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Trading Fee</p>
                      <p className="text-sm">{(market.fees * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                </div>

                <Separator className="bg-border/50" />

                {/* Outcomes Summary */}
                <div>
                  <p className="text-sm text-muted-foreground mb-3">Current Prices</p>
                  <div className="space-y-2">
                    {market.outcomes.map((outcome) => (
                      <div
                        key={outcome.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg",
                          market.resolvedOutcome === outcome.id
                            ? "bg-success/10 border border-success/30"
                            : "bg-muted/30"
                        )}
                      >
                        <span className="font-medium">{outcome.label}</span>
                        <div className="text-right">
                          <span className="font-mono text-lg">
                            {priceToPercent(outcome.price).toFixed(1)}%
                          </span>
                          {market.resolvedOutcome === outcome.id && (
                            <span className="ml-2 text-success text-sm">Winner</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Trading */}
          <div className="lg:col-span-2 space-y-6">
            <TradingPanel
              market={market}
              userPosition={userPosition}
              onTradeComplete={handleTradeComplete}
            />
            <PositionCard
              position={userPosition}
              market={market}
              onClaim={handleTradeComplete}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
