"use client";

import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPosition, Market, formatUSDCx, priceToPercent } from "@/lib/contracts";
import { claimWinnings } from "@/lib/stacks";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface PositionCardProps {
  position: UserPosition | null;
  market: Market;
  onClaim?: () => void;
}

export default function PositionCard({ position, market, onClaim }: PositionCardProps) {
  const { toast } = useToast();
  const [isClaiming, setIsClaiming] = useState(false);

  const isResolved = market.status === "resolved";
  const isWinner = isResolved && market.resolvedOutcome === position?.outcome;

  const handleClaim = async () => {
    setIsClaiming(true);
    try {
      const amount = await claimWinnings(market.id);
      toast({
        title: "Winnings Claimed!",
        description: `You received ${formatUSDCx(amount)} USDCx`,
      });
      onClaim?.();
    } catch (error) {
      toast({
        title: "Claim Failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    }
    setIsClaiming(false);
  };

  if (!position) {
    return (
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">My Position</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No position in this market
          </p>
        </CardContent>
      </Card>
    );
  }

  const isProfitable = position.pnl >= 0;

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          <span>My Position</span>
          {isWinner && (
            <span className="text-xs font-normal text-success bg-success/10 px-2 py-1 rounded">
              Winner
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Outcome</p>
            <p className="font-medium text-primary">{position.outcomeLabel}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Shares</p>
            <p className="font-medium font-mono">{position.shares.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Entry Price</p>
            <p className="font-medium font-mono">{priceToPercent(position.entryPrice).toFixed(2)}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Current Price</p>
            <p className="font-medium font-mono">{priceToPercent(position.currentPrice).toFixed(2)}%</p>
          </div>
        </div>

        <div className="pt-3 border-t border-border/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Value</span>
            <span className="font-medium font-mono">{formatUSDCx(position.value)} USDCx</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">P&L</span>
            <div className={cn(
              "flex items-center gap-1 font-medium font-mono",
              isProfitable ? "text-success" : "text-destructive"
            )}>
              {isProfitable ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>
                {isProfitable ? "+" : ""}{formatUSDCx(position.pnl)} USDCx
              </span>
              <span className="text-xs">
                ({isProfitable ? "+" : ""}{position.pnlPercent.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>

        {isResolved && isWinner && (
          <Button
            className="w-full bg-success hover:bg-success/90 text-success-foreground gap-2"
            onClick={handleClaim}
            disabled={isClaiming}
          >
            <DollarSign className="h-4 w-4" />
            {isClaiming ? "Claiming..." : "Claim Winnings"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
