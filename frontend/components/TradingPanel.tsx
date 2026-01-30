"use client";

import { useState, useEffect } from "react";
import { ArrowRightLeft, Info, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Market, UserPosition, Quote, formatUSDCx, priceToPercent, USDCX_PRECISION } from "@/lib/contracts";
import { calculateBuyQuote, calculateSellQuote, executeBuy, executeSell } from "@/lib/stacks";
import { useWalletStore, formatBalance } from "@/stores/useWalletStore";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface TradingPanelProps {
  market: Market;
  userPosition: UserPosition | null;
  onTradeComplete?: () => void;
}

export default function TradingPanel({ market, userPosition, onTradeComplete }: TradingPanelProps) {
  const { isConnected, usdcxBalance, connect } = useWalletStore();
  const { toast } = useToast();

  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [selectedOutcome, setSelectedOutcome] = useState(0);
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const canTrade = market.status === "open";
  const maxBuy = usdcxBalance / USDCX_PRECISION;
  const maxSell = userPosition?.shares || 0;

  // Calculate quote when amount changes
  useEffect(() => {
    const getQuote = async () => {
      const numAmount = parseFloat(amount);
      if (!numAmount || numAmount <= 0) {
        setQuote(null);
        return;
      }

      setIsLoadingQuote(true);
      try {
        if (tradeType === "buy") {
          const q = await calculateBuyQuote(market.id, selectedOutcome, numAmount * USDCX_PRECISION);
          setQuote(q);
        } else {
          const q = await calculateSellQuote(market.id, selectedOutcome, numAmount);
          setQuote(q);
        }
      } catch (error) {
        console.error("Failed to get quote:", error);
        setQuote(null);
      }
      setIsLoadingQuote(false);
    };

    const timer = setTimeout(getQuote, 300);
    return () => clearTimeout(timer);
  }, [amount, tradeType, selectedOutcome, market.id]);

  const handleMaxClick = () => {
    if (tradeType === "buy") {
      setAmount(maxBuy.toFixed(2));
    } else {
      setAmount(maxSell.toString());
    }
  };

  const handleExecute = async () => {
    if (!isConnected) {
      connect();
      return;
    }

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;

    setIsExecuting(true);
    try {
      if (tradeType === "buy") {
        await executeBuy(market.id, selectedOutcome, numAmount * USDCX_PRECISION);
        toast({
          title: "Trade Executed!",
          description: `Bought ${quote?.shares || 0} shares of ${market.outcomes[selectedOutcome].label}`,
        });
      } else {
        await executeSell(market.id, selectedOutcome, numAmount);
        toast({
          title: "Trade Executed!",
          description: `Sold ${numAmount} shares of ${market.outcomes[selectedOutcome].label}`,
        });
      }
      setAmount("");
      setQuote(null);
      onTradeComplete?.();
    } catch (error) {
      toast({
        title: "Trade Failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    }
    setIsExecuting(false);
  };

  return (
    <TooltipProvider>
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Trade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Buy/Sell Tabs */}
          <Tabs value={tradeType} onValueChange={(v) => setTradeType(v as "buy" | "sell")}>
            <TabsList className="w-full bg-muted">
              <TabsTrigger value="buy" className="flex-1 data-[state=active]:bg-success data-[state=active]:text-success-foreground">
                Buy
              </TabsTrigger>
              <TabsTrigger value="sell" className="flex-1 data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground">
                Sell
              </TabsTrigger>
            </TabsList>

            <TabsContent value="buy" className="mt-4 space-y-4">
              {/* Outcome Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Outcome</label>
                <div className="grid grid-cols-2 gap-2">
                  {market.outcomes.map((outcome) => (
                    <Button
                      key={outcome.id}
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedOutcome(outcome.id)}
                      className={cn(
                        "flex flex-col h-auto py-3 transition-all",
                        selectedOutcome === outcome.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <span className="font-medium">{outcome.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {priceToPercent(outcome.price).toFixed(1)}%
                      </span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-muted-foreground">Amount (USDCx)</label>
                  <span className="text-xs text-muted-foreground">
                    Balance: {formatBalance(usdcxBalance)}
                  </span>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={!canTrade}
                    className="pr-16 bg-input border-border"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMaxClick}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-xs text-primary hover:text-primary hover:bg-primary/10"
                  >
                    Max
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="sell" className="mt-4 space-y-4">
              {/* Outcome Selection for Sell */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Outcome</label>
                <div className="grid grid-cols-2 gap-2">
                  {market.outcomes.map((outcome) => (
                    <Button
                      key={outcome.id}
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedOutcome(outcome.id)}
                      className={cn(
                        "flex flex-col h-auto py-3 transition-all",
                        selectedOutcome === outcome.id
                          ? "border-destructive bg-destructive/10 text-destructive"
                          : "border-border hover:border-destructive/50"
                      )}
                    >
                      <span className="font-medium">{outcome.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {priceToPercent(outcome.price).toFixed(1)}%
                      </span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Shares Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-muted-foreground">Shares</label>
                  <span className="text-xs text-muted-foreground">
                    Available: {maxSell} shares
                  </span>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={!canTrade || maxSell === 0}
                    className="pr-16 bg-input border-border"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMaxClick}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    Max
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Quote Preview */}
          {quote && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border/50 space-y-2 animate-fade-in">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Est. Shares</span>
                <span className="font-mono">{quote.shares.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Avg. Price</span>
                <span className="font-mono">{priceToPercent(quote.averagePrice).toFixed(2)}%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <span>Price Impact</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3.5 w-3.5" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>How much your trade moves the market price</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <span className={cn(
                  "font-mono",
                  quote.priceImpact > 5 ? "text-warning" : "text-muted-foreground"
                )}>
                  {quote.priceImpact.toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Fee (2%)</span>
                <span className="font-mono">{formatUSDCx(quote.fee)} USDCx</span>
              </div>
              <div className="flex items-center justify-between text-sm pt-2 border-t border-border/50 font-medium">
                <span>{tradeType === "buy" ? "Total Cost" : "You Receive"}</span>
                <span className="text-primary font-mono">{formatUSDCx(quote.total)} USDCx</span>
              </div>
            </div>
          )}

          {isLoadingQuote && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Action Button */}
          <Button
            className={cn(
              "w-full font-semibold gap-2",
              tradeType === "buy"
                ? "bg-success hover:bg-success/90 text-success-foreground"
                : "bg-destructive hover:bg-destructive/90"
            )}
            size="lg"
            disabled={!canTrade || isExecuting || (!quote && !!amount)}
            onClick={handleExecute}
          >
            {isExecuting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Executing...
              </>
            ) : !isConnected ? (
              "Connect Wallet"
            ) : !canTrade ? (
              "Market Closed"
            ) : (
              <>
                <ArrowRightLeft className="h-4 w-4" />
                Place {tradeType === "buy" ? "Buy" : "Sell"} Order
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
