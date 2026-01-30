"use client";

import Link from "next/link";
import { Clock, TrendingUp, Lock, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Market, formatUSDCx, formatTimeRemaining, priceToPercent } from "@/lib/contracts";
import { cn } from "@/lib/utils";

interface MarketCardProps {
  market: Market;
}

const categoryColors: Record<string, string> = {
  crypto: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  sports: "bg-green-500/20 text-green-400 border-green-500/30",
  politics: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  entertainment: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  other: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const typeLabels: Record<string, string> = {
  binary: "Binary",
  categorical: "Multi",
  scalar: "Range",
};

const statusConfig: Record<string, { icon: typeof Clock; label: string; className: string }> = {
  open: { icon: Clock, label: "Open", className: "bg-green-500/20 text-green-400" },
  locked: { icon: Lock, label: "Locked", className: "bg-yellow-500/20 text-yellow-400" },
  resolved: { icon: CheckCircle, label: "Resolved", className: "bg-blue-500/20 text-blue-400" },
  cancelled: { icon: Clock, label: "Cancelled", className: "bg-red-500/20 text-red-400" },
};

export default function MarketCard({ market }: MarketCardProps) {
  const status = statusConfig[market.status];
  const StatusIcon = status.icon;

  // For binary markets, show Yes/No prices
  const yesPrice = market.outcomes[0]?.price || 500000;
  const noPrice = market.outcomes[1]?.price || 500000;
  const yesPercent = priceToPercent(yesPrice);
  const noPercent = priceToPercent(noPrice);

  return (
    <Link href={`/market/${market.id}`}>
      <Card className="h-full bg-card border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-glow cursor-pointer group">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn("text-xs font-medium", categoryColors[market.category])}
              >
                {market.category}
              </Badge>
              <Badge variant="outline" className="text-xs bg-muted/50 border-muted">
                {typeLabels[market.type]}
              </Badge>
            </div>
            <Badge variant="outline" className={cn("text-xs", status.className)}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
          </div>
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
            {market.question}
          </h3>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Price Bars */}
          {market.type === "binary" && (
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-success font-medium">Yes</span>
                <span className="text-success font-mono">{yesPercent.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-success/80 to-success transition-all duration-500"
                  style={{ width: `${yesPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-destructive font-medium">No</span>
                <span className="text-destructive font-mono">{noPercent.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-destructive/80 to-destructive transition-all duration-500"
                  style={{ width: `${noPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Categorical outcomes */}
          {market.type === "categorical" && (
            <div className="space-y-1.5 mb-4">
              {market.outcomes.slice(0, 3).map((outcome) => (
                <div key={outcome.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground truncate mr-2">{outcome.label}</span>
                  <span className="font-mono text-foreground">
                    {priceToPercent(outcome.price).toFixed(1)}%
                  </span>
                </div>
              ))}
              {market.outcomes.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{market.outcomes.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/50">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>{formatUSDCx(market.volume)} USDCx</span>
            </div>
            {market.status === "open" && (
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>{formatTimeRemaining(market.lockTime)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
