"use client";

import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trade, formatUSDCx, priceToPercent, truncateAddress } from "@/lib/contracts";
import { cn } from "@/lib/utils";

interface RecentTradesProps {
  trades: Trade[];
}

export default function RecentTrades({ trades }: RecentTradesProps) {
  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Recent Trades</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="text-muted-foreground">Time</TableHead>
                <TableHead className="text-muted-foreground">Type</TableHead>
                <TableHead className="text-muted-foreground">Outcome</TableHead>
                <TableHead className="text-muted-foreground text-right">Shares</TableHead>
                <TableHead className="text-muted-foreground text-right">Price</TableHead>
                <TableHead className="text-muted-foreground text-right">User</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.slice(0, 10).map((trade) => (
                <TableRow key={trade.id} className="border-border/50">
                  <TableCell className="text-muted-foreground text-sm">
                    {formatTime(trade.timestamp)}
                  </TableCell>
                  <TableCell>
                    <div className={cn(
                      "flex items-center gap-1 font-medium text-sm",
                      trade.type === "buy" ? "text-success" : "text-destructive"
                    )}>
                      {trade.type === "buy" ? (
                        <ArrowUpRight className="h-4 w-4" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4" />
                      )}
                      {trade.type === "buy" ? "Buy" : "Sell"}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{trade.outcomeLabel}</TableCell>
                  <TableCell className="text-right font-mono">
                    {trade.shares.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {priceToPercent(trade.price).toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground text-sm">
                    {truncateAddress(trade.user)}
                  </TableCell>
                </TableRow>
              ))}
              {trades.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No trades yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
