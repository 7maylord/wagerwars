"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Shield,
  Award,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useWalletStore } from "@/stores/useWalletStore";
import { OracleInfo, Market, formatUSDCx, priceToPercent, USDCX_PRECISION } from "@/lib/contracts";
import { getOracleInfo, getPendingResolutions, resolveMarket, mockMarkets } from "@/lib/stacks";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const tierColors: Record<string, string> = {
  bronze: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  silver: "bg-gray-400/20 text-gray-300 border-gray-400/30",
  gold: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

const tierIcons: Record<string, string> = {
  bronze: "B",
  silver: "S",
  gold: "G",
};

export default function OracleDashboardPage() {
  const { address, isConnected, connect } = useWalletStore();
  const { toast } = useToast();

  const [oracleInfo, setOracleInfo] = useState<OracleInfo | null>(null);
  const [pendingResolutions, setPendingResolutions] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Resolution dialog
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<string>("");
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!address) return;

      setIsLoading(true);
      try {
        const [info, pending] = await Promise.all([
          getOracleInfo(address),
          getPendingResolutions(address),
        ]);
        setOracleInfo(info);
        setPendingResolutions(pending);
      } catch (error) {
        console.error("Failed to load oracle data:", error);
      }
      setIsLoading(false);
    };

    loadData();
  }, [address]);

  const openResolveDialog = (market: Market) => {
    setSelectedMarket(market);
    setSelectedOutcome("");
    setResolveDialogOpen(true);
  };

  const handleResolve = async () => {
    if (!selectedMarket || selectedOutcome === "") return;

    setIsResolving(true);
    try {
      await resolveMarket(selectedMarket.id, parseInt(selectedOutcome));
      toast({
        title: "Market Resolved!",
        description: `${selectedMarket.question} has been resolved.`,
      });
      setPendingResolutions((prev) => prev.filter((m) => m.id !== selectedMarket.id));
      setResolveDialogOpen(false);
    } catch (error) {
      toast({
        title: "Resolution Failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    }
    setIsResolving(false);
  };

  // Mock resolution history
  const resolutionHistory = [
    {
      marketId: "market-4",
      question: "Who will win the 2024 US Presidential Election?",
      resolvedOutcome: 0,
      outcomeLabel: "Trump",
      resolvedAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
      disputed: false,
    },
    {
      marketId: "market-old-1",
      question: "Will ETH 2.0 merge happen by September 2022?",
      resolvedOutcome: 0,
      outcomeLabel: "Yes",
      resolvedAt: Date.now() - 90 * 24 * 60 * 60 * 1000,
      disputed: false,
    },
    {
      marketId: "market-old-2",
      question: "Will Apple release AR glasses in 2023?",
      resolvedOutcome: 1,
      outcomeLabel: "No",
      resolvedAt: Date.now() - 120 * 24 * 60 * 60 * 1000,
      disputed: true,
    },
  ];

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="bg-card border-border/50 max-w-md w-full mx-4">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 mx-auto text-primary mb-4" />
            <CardTitle className="text-2xl">Oracle Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-6">
              Connect your wallet to access the oracle dashboard
            </p>
            <Button onClick={connect} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Connect Wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!oracleInfo) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container px-4 py-12 text-center">
          <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
          <h1 className="text-2xl font-bold mb-2">Not an Oracle</h1>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            You&apos;re not registered as an oracle. Oracles are responsible for resolving prediction markets and must stake a bond.
          </p>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            Register as Oracle
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/30">
        <div className="container px-4 py-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Oracle Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your oracle responsibilities and resolutions
          </p>
        </div>
      </div>

      <div className="container px-4 py-8 space-y-8">
        {/* Oracle Status Card */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Oracle Status</span>
              <Badge variant="outline" className={tierColors[oracleInfo.tier]}>
                {tierIcons[oracleInfo.tier]} {oracleInfo.tier.charAt(0).toUpperCase() + oracleInfo.tier.slice(1)} Tier
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Bond Amount</p>
                <p className="text-xl font-bold font-mono">{formatUSDCx(oracleInfo.bondAmount)}</p>
                <p className="text-xs text-muted-foreground">USDCx</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Resolutions</p>
                <p className="text-xl font-bold font-mono">{oracleInfo.resolutionsCount}</p>
                <p className="text-xs text-muted-foreground">Markets resolved</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Disputes</p>
                <p className="text-xl font-bold font-mono">{oracleInfo.disputesCount}</p>
                <p className="text-xs text-muted-foreground">Times disputed</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Success Rate</p>
                <p className={cn(
                  "text-xl font-bold font-mono",
                  oracleInfo.successRate >= 95 ? "text-success" : oracleInfo.successRate >= 80 ? "text-warning" : "text-destructive"
                )}>
                  {oracleInfo.successRate.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">Without disputes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Resolutions */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              Pending Resolutions
              {pendingResolutions.length > 0 && (
                <Badge variant="outline" className="bg-warning/20 text-warning border-warning/30">
                  {pendingResolutions.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingResolutions.length > 0 ? (
              <div className="space-y-4">
                {pendingResolutions.map((market) => (
                  <div
                    key={market.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{market.question}</p>
                      <p className="text-sm text-muted-foreground">
                        Resolution due: {new Date(market.resolutionTime).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Link href={`/market/${market.id}`}>
                        <Button variant="ghost" size="sm">
                          View
                          <ArrowUpRight className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        onClick={() => openResolveDialog(market)}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        Resolve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto text-success mb-4" />
                <p className="text-muted-foreground">No pending resolutions</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resolution History */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle>Resolution History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead>Market</TableHead>
                  <TableHead>Resolved Outcome</TableHead>
                  <TableHead>Resolved At</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resolutionHistory.map((resolution) => (
                  <TableRow key={resolution.marketId} className="border-border/50">
                    <TableCell className="font-medium max-w-[300px] truncate">
                      {resolution.question}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-primary/20 text-primary">
                        {resolution.outcomeLabel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(resolution.resolvedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {resolution.disputed ? (
                        <Badge variant="outline" className="bg-destructive/20 text-destructive border-destructive/30">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Disputed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-success/20 text-success border-success/30">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Confirmed
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Resolve Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Resolve Market</DialogTitle>
            <DialogDescription>
              Select the winning outcome for this market. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {selectedMarket && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="font-medium">{selectedMarket.question}</p>
              </div>

              <RadioGroup value={selectedOutcome} onValueChange={setSelectedOutcome}>
                {selectedMarket.outcomes.map((outcome) => (
                  <div
                    key={outcome.id}
                    className={cn(
                      "flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer",
                      selectedOutcome === outcome.id.toString()
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    )}
                    onClick={() => setSelectedOutcome(outcome.id.toString())}
                  >
                    <RadioGroupItem value={outcome.id.toString()} id={`outcome-${outcome.id}`} />
                    <Label htmlFor={`outcome-${outcome.id}`} className="flex-1 cursor-pointer">
                      <span className="font-medium">{outcome.label}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        ({priceToPercent(outcome.price).toFixed(1)}%)
                      </span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleResolve}
              disabled={!selectedOutcome || isResolving}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isResolving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Resolving...
                </>
              ) : (
                "Confirm Resolution"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
